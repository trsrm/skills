import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { CodexClient } from './codex-client.js';

const PORT = parseInt(process.env.CODEX_BRIDGE_PORT ?? '8317', 10);
const HOST = process.env.CODEX_BRIDGE_HOST ?? '127.0.0.1';
const API_KEY = process.env.CODEX_BRIDGE_API_KEY ?? 'local-key';
const DEFAULT_MODEL = process.env.CODEX_BRIDGE_DEFAULT_MODEL ?? 'gpt-5.5';

const client = new CodexClient();

client.on('fatal', err => {
  console.error('Fatal codex client error:', err.message);
  process.exit(1);
});

function randomHex(n = 12) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function jsonError(res, status, message, type = 'invalid_request_error') {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message, type, code: status } }));
}

function checkAuth(req, res) {
  const auth = req.headers['authorization'] ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== API_KEY) {
    console.error('Invalid API key:', token);
    jsonError(res, 401, 'Invalid API key', 'authentication_error');
    return false;
  }
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { reject(new Error('invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function getModels() {
  const cachePath = path.join(os.homedir(), '.codex', 'models_cache.json');
  try {
    const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    const models = Array.isArray(raw.models) ? raw.models : [];
    return models
      .filter(m => m.slug && m.visibility !== 'hidden')
      .map(m => ({
        id: m.slug,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'openai',
      }));
  } catch {
    return [
      { id: 'gpt-5.5', object: 'model', created: 0, owned_by: 'openai' },
      { id: 'gpt-5.5', object: 'model', created: 0, owned_by: 'openai' },
    ];
  }
}

function formatMessages(messages) {
  return messages
    .map(m => {
      const role = m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user';
      const content = typeof m.content === 'string' ? m.content :
        Array.isArray(m.content)
          ? m.content.filter(p => p.type === 'text').map(p => p.text).join('')
          : '';
      return `[${role}]\n${content}`;
    })
    .join('\n\n');
}

async function handleChatCompletions(req, res) {
  let body;
  try { body = await readBody(req); }
  catch { return jsonError(res, 400, 'invalid JSON body'); }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonError(res, 400, 'messages array is required');
  }

  const model = body.model || DEFAULT_MODEL;
  const stream = body.stream === true;
  const completionId = `chatcmpl-${randomHex()}`;
  const created = Math.floor(Date.now() / 1000);
  const text = formatMessages(body.messages);

  if (!client.isReady()) {
    return jsonError(res, 503, 'codex proxy not ready — try again shortly', 'server_error');
  }

  let threadId;
  try {
    threadId = await client.startThread(model);
  } catch (err) {
    console.error('thread/start failed:', err.message);
    return jsonError(res, 502, `codex thread/start failed: ${err.message}`, 'server_error');
  }

  if (stream) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send role chunk first
    const roleChunk = JSON.stringify({
      id: completionId,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
    });
    res.write(`data: ${roleChunk}\n\n`);

    const onDelta = (params) => {
      const chunk = JSON.stringify({
        id: completionId,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [{ index: 0, delta: { content: params.delta }, finish_reason: null }],
      });
      res.write(`data: ${chunk}\n\n`);
    };

    const onCompleted = (params) => {
      client.off(`t:${threadId}:item/agentMessage/delta`, onDelta);
      const status = params.turn?.status;
      if (status === 'failed') {
        const errChunk = JSON.stringify({
          id: completionId,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          error: { message: params.turn?.error?.message ?? 'turn failed' },
        });
        res.write(`data: ${errChunk}\n\n`);
      } else {
        const doneChunk = JSON.stringify({
          id: completionId,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        });
        res.write(`data: ${doneChunk}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    };

    client.on(`t:${threadId}:item/agentMessage/delta`, onDelta);
    client.once(`t:${threadId}:turn/completed`, onCompleted);

    req.on('close', () => {
      client.off(`t:${threadId}:item/agentMessage/delta`, onDelta);
      client.off(`t:${threadId}:turn/completed`, onCompleted);
    });

    try {
      await client.startTurn(threadId, text);
    } catch (err) {
      client.off(`t:${threadId}:item/agentMessage/delta`, onDelta);
      client.off(`t:${threadId}:turn/completed`, onCompleted);
      res.write(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } else {
    // Non-streaming: buffer all deltas
    const deltas = [];

    const result = await new Promise(async (resolve, reject) => {
      const onDelta = (params) => deltas.push(params.delta);
      const onCompleted = (params) => {
        client.off(`t:${threadId}:item/agentMessage/delta`, onDelta);
        resolve(params);
      };

      client.on(`t:${threadId}:item/agentMessage/delta`, onDelta);
      client.once(`t:${threadId}:turn/completed`, onCompleted);

      try {
        await client.startTurn(threadId, text);
      } catch (err) {
        client.off(`t:${threadId}:item/agentMessage/delta`, onDelta);
        client.off(`t:${threadId}:turn/completed`, onCompleted);
        reject(err);
      }
    }).catch(err => ({ error: err }));

    if (result.error) {
      console.error('turn failed:', result.error.message);
      return jsonError(res, 502, `codex turn failed: ${result.error.message}`, 'server_error');
    }

    const turn = result.turn;
    if (turn?.status === 'failed') {
      console.error('turn failed:', turn.error?.message);
      return jsonError(res, 502, turn.error?.message ?? 'turn failed', 'server_error');
    }

    const content = deltas.join('');
    const response = {
      id: completionId,
      object: 'chat.completion',
      created,
      model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: turn?.status === 'interrupted' ? 'stop' : 'stop',
        logprobs: null,
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url} from ${req.socket.remoteAddress}`);

  if (!checkAuth(req, res)) return;

  const url = new URL(req.url, `http://${HOST}`);

  if (req.method === 'GET' && url.pathname === '/v1/models') {
    const models = getModels();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ object: 'list', data: models }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
    console.log(`Handling chat completion request from ${req.socket.remoteAddress}`);
    handleChatCompletions(req, res).catch(err => {
      console.error('unhandled error in chat completions:', err);
      if (!res.headersSent) jsonError(res, 500, err.message, 'server_error');
      else res.end();
    });
    return;
  }

  jsonError(res, 404, `no route for ${req.method} ${url.pathname}`);
});

console.log('Connecting to codex app-server daemon...');
client.connect()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`codex-openai-bridge listening on http://${HOST}:${PORT}`);
      console.log(`API key: ${API_KEY}`);
      console.log(`A Default model: ${DEFAULT_MODEL}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to codex:', err.message);
    process.exit(1);
  });
