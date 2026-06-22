## Unit Types

| Kind | Location | Entry point | Invoked by |
|---|---|---|---|
| **Skill** | `skills/<name>/` | `SKILL.md` | `/skill-name` in Claude Code |
| **Server** | `servers/<name>/` | `server.js` (or equiv) | process / HTTP / stdio |
| **Tool** | `tools/<name>/` | executable script | CLI / direct run |

## Rules

1. **One unit, one directory.** Never scatter a unit's files across multiple top-level dirs.
2. **Skills are prompts, not code.** `SKILL.md` must be readable with no runtime. Keep logic in prose; avoid pseudocode.
3. **Register new units in `README.md`** (add a row to the relevant table).
4. **No cross-unit coupling.** Units must not import or depend on each other. Shared logic → separate tool.
5. **Don't touch unrelated units** unless the task explicitly spans both.
6. **Match scope to the task.** A one-line fix doesn't need a new abstraction.

## Conventions

- Skill files: `SKILL.md` (not `skill.md`, `instructions.md`, etc.)
- Human docs: `README.md`
- Server entry points: `server.js` for Node; adapt for other runtimes.
- No files at the top level of `skills/`, `servers/`, or `tools/` — only subdirectories.
