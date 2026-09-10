# skills

A curated collection of reusable Claude Code skills, MCP/HTTP bridge servers, and developer tools.

## Units

### Skills

Claude Code skills — model-facing instruction files invocable via `/skill-name`.

| Skill | Description |
|---|---|
| [tidy-docs](skills/tidy-docs/README.md) | Clean up a human-facing doc — plain language, scannable structure, consistent terms; small changes auto-apply, rewrites ask. |
| [trim-instructions](skills/trim-instructions/README.md) | Compress verbose instruction files (skills, prompts, CLAUDE.md) by stripping ballast while keeping all behavior-shaping signal. |

### Servers

Standalone servers and proxies that bridge external APIs into OpenAI-compatible or MCP interfaces.

| Server | Description |
|---|---|
| [codex-openai-bridge](servers/codex-openai-bridge/README.md) | OpenAI-compatible HTTP proxy that routes LLM calls through a ChatGPT subscription via the `codex app-server` interface. |

### Tools

Utility scripts and helpers.

| Tool | Description |
|---|---|
| _(none yet)_ | — |