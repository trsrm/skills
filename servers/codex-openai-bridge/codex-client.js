import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { EventEmitter } from 'events';

export class CodexClient extends EventEmitter {
  #proc = null;
  #rl = null;
  #nextId = 1;
  #pending = new Map();
  #reconnectAttempts = 0;
  #maxReconnects = 5;
  #initialized = false;

  async connect() {
    await this.#connectDirect();
  }

  async #connectDirect() {
    this.#initialized = false;
    this.#proc = spawn('codex', ['app-server', '--listen', 'stdio://'], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    this.#rl = createInterface({ input: this.#proc.stdout, crlfDelay: Infinity });
    this.#rl.on('line', line => this.#handleLine(line));

    this.#proc.on('close', code => {
      this.#initialized = false;
      this.#rl = null;
      this.#proc = null;
      // Reject all pending requests
      for (const [id, { reject }] of this.#pending) {
        reject(new Error(`proxy connection closed (code ${code})`));
      }
      this.#pending.clear();
      // Auto-reconnect
      if (this.#reconnectAttempts < this.#maxReconnects) {
        this.#reconnectAttempts++;
        const delay = this.#reconnectAttempts * 1000;
        console.error(`[codex-client] process closed, reconnecting in ${delay}ms (attempt ${this.#reconnectAttempts}/${this.#maxReconnects})`);
        setTimeout(() => this.#connectDirect().catch(err => console.error('[codex-client] reconnect failed:', err)), delay);
      } else {
        console.error('[codex-client] max reconnect attempts reached');
        this.emit('fatal', new Error('codex proxy connection permanently lost'));
      }
    });

    this.#proc.on('error', err => {
      console.error('[codex-client] proxy process error:', err);
    });

    await this.#request('initialize', {
      clientInfo: { name: 'codex-openai-bridge', title: null, version: '1.0.0' },
      capabilities: { experimentalApi: false, requestAttestation: false },
    });
    this.#notify('initialized');
    this.#initialized = true;
    this.#reconnectAttempts = 0;
    console.error('[codex-client] connected and initialized');
  }

  async startThread(model) {
    const result = await this.#request('thread/start', {
      model: model || undefined,
      approvalPolicy: 'never',
      sandbox: 'read-only',
      ephemeral: true,
    });
    return result.thread.id;
  }

  async startTurn(threadId, text) {
    const result = await this.#request('turn/start', {
      threadId,
      input: [{ type: 'text', text, text_elements: [] }],
    });
    return result.turn.id;
  }

  isReady() {
    return this.#initialized && this.#proc !== null;
  }

  #request(method, params) {
    return new Promise((resolve, reject) => {
      const id = this.#nextId++;
      this.#pending.set(id, { resolve, reject });
      this.#send({ method, id, params });
    });
  }

  #notify(method, params) {
    const msg = { method };
    if (params !== undefined) msg.params = params;
    this.#send(msg);
  }

  #send(msg) {
    if (!this.#proc || this.#proc.stdin.destroyed) {
      throw new Error('codex proxy not connected');
    }
    this.#proc.stdin.write(JSON.stringify(msg) + '\n');
  }

  #handleLine(line) {
    if (!line.trim()) return;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      console.error('[codex-client] invalid JSON line:', line.slice(0, 200));
      return;
    }

    // Response to a client request
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const pending = this.#pending.get(msg.id);
      if (pending) {
        this.#pending.delete(msg.id);
        if (msg.error) {
          pending.reject(Object.assign(new Error(msg.error.message || 'RPC error'), { code: msg.error.code, data: msg.error.data }));
        } else {
          pending.resolve(msg.result);
        }
      }
      return;
    }

    // Server → client request (needs a response from us)
    if (msg.id !== undefined && msg.method) {
      this.#handleServerRequest(msg);
      return;
    }

    // Server notification (no id)
    if (msg.method && msg.id === undefined) {
      this.emit(`n:${msg.method}`, msg.params);
      if (msg.params?.threadId) {
        this.emit(`t:${msg.params.threadId}:${msg.method}`, msg.params);
      }
    }
  }

  #handleServerRequest(msg) {
    const { method, id } = msg;
    // Auth token refresh — not supported; user must restart daemon
    if (method === 'account/chatgptAuthTokens/refresh') {
      console.error('[codex-client] auth token refresh requested — restart daemon to re-authenticate');
      this.#sendResponse(id, null, { code: -32000, message: 'auth token refresh not supported by bridge; restart codex daemon' });
      return;
    }
    // Approval requests — shouldn't arrive with approvalPolicy: "never"
    console.error(`[codex-client] unexpected server request: ${method}`);
    this.#sendResponse(id, null, { code: -32601, message: `method not supported by bridge: ${method}` });
  }

  #sendResponse(id, result, error) {
    const msg = { id };
    if (error) msg.error = error;
    else msg.result = result;
    this.#send(msg);
  }
}
