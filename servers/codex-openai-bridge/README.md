# codex-openai-bridge

OpenAI-compatible HTTP proxy that routes LLM calls through your ChatGPT subscription via the official `codex app-server` interface.

Exposes `GET /v1/models` and `POST /v1/chat/completions` so any OpenAI-compatible client (e.g. OpenOats) can use Codex as its LLM provider.

## Requirements

- Node.js v18+
- [Codex CLI](https://github.com/openai/codex) installed and authenticated (`codex` on PATH)

No npm dependencies — uses only Node.js built-ins.

## Usage

```bash
node server.js
```

## Configuration

All config via environment variables:

| Variable | Default | Description |
|---|---|---|
| `CODEX_BRIDGE_PORT` | `8317` | Port to listen on |
| `CODEX_BRIDGE_HOST` | `127.0.0.1` | Host to bind to |
| `CODEX_BRIDGE_API_KEY` | `local-key` | Local bearer token for auth |
| `CODEX_BRIDGE_DEFAULT_MODEL` | `gpt-5.5` | Model used when request omits `model` |

## Endpoints

### `GET /v1/models`

Returns available Codex models from `~/.codex/models_cache.json` in OpenAI list format.

```bash
curl http://127.0.0.1:8317/v1/models \
  -H 'Authorization: Bearer local-key'
```

### `POST /v1/chat/completions`

Supports both streaming (`"stream": true`) and non-streaming requests.

```bash
# Non-streaming
curl http://127.0.0.1:8317/v1/chat/completions \
  -H 'Authorization: Bearer local-key' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5.5","messages":[{"role":"user","content":"Hello"}],"stream":false}'

# Streaming
curl http://127.0.0.1:8317/v1/chat/completions \
  -H 'Authorization: Bearer local-key' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5.5","messages":[{"role":"user","content":"Hello"}],"stream":true}'
```

## OpenOats setup

1. Start the bridge: `node server.js`
2. In OpenOats, set the **LLM provider**:
   - Endpoint URL: `http://127.0.0.1:8317`
   - API key: `local-key`
   - Model: `gpt-5.5` (or `gpt-5.5`)
3. For **embeddings**, use a separate Ollama endpoint — Codex does not expose `/v1/embeddings`.

## How it works

On startup, the bridge spawns `codex app-server --listen stdio://` and performs the JSON-RPC handshake. For each chat completions request it:

1. Creates an ephemeral thread via `thread/start` (`approvalPolicy: "never"`, `sandbox: "read-only"`)
2. Submits the conversation as a single turn via `turn/start`
3. Streams `item/agentMessage/delta` notifications back as SSE chunks (or buffers them for non-streaming)
4. Resolves on `turn/completed`

The connection auto-reconnects up to 5 times on unexpected process exit.

## Known limitations

- **Multi-turn history** is concatenated into a single text block per request (adequate for most clients, including OpenOats)
- **Embeddings** (`/v1/embeddings`) are not implemented
- If the ChatGPT auth token expires mid-session, requests will fail — run `codex login` to re-authenticate, then restart the bridge
- The `codex app-server daemon` subcommand requires the standalone Codex installer and is not used here; the bridge spawns the process directly
