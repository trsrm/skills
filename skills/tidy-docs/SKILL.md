---
name: tidy-docs
description: Clean up a human-facing doc — plain language, scannable structure, consistent terms, no fluff.
disable-model-invocation: true
---

Make a doc easy for a human to scan and read. Style target: B2 English, written as ASD-STE100 Simplified Technical English.

Targets: the paths given, or the changed docs in `git diff`.

## Steps

1. Read each target in full. Read `CONTEXT.md` if it exists.
2. Warn on unstaged or untracked targets. Staged-only is fine. Use only `git status --porcelain`.
3. Run the Fix passes.
4. Run the Detect passes.
5. Report one line per pass, empty ones included, then the findings as a numbered list.
6. Stop and wait for the answer. Apply only the findings that are accepted.

## Fix passes

1. **Language** — rewrite every sentence to the style target. Cut all fluff, hedging, and mannered prose.
2. **Terms** — one term per concept. Match `CONTEXT.md` when it exists. Fix every instance in the target.
3. **Headings** — a valid heading hierarchy, each heading names what its section holds.
4. **Links** — relative links and file paths resolve.
5. **Format** — follow the convention the targets already use most.
6. **Lead** — the first sentence says what the doc is and who it is for.

## Detect passes

7. **Structure** — sections to reorder, merge, or split. Prose that should be a list or a table.
8. **Duplication** — content that appears twice, in one file or across files.

Keep the meaning.
