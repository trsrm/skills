---
name: tidy-docs
description: Clean up a human-facing doc — plain language, scannable structure, consistent terms, no fluff. Use for /tidy-docs.
disable-model-invocation: true
---

Make a doc easy for a human to scan and read. Style target: B2 English, written as ASD-STE100 Simplified Technical English.

Targets: the paths given, or the changed docs in `git diff`.

## Steps

1. Read each target in full. Read `CONTEXT.md` if it exists.
2. Warn on unstaged or untracked targets (`git status --porcelain`). Staged-only is fine. No history, no writes, no other git calls.
3. Run the automatic passes and apply them.
4. Run the approval passes, but change nothing yet.
5. Report one line per pass, empty ones included, then the approval findings as a numbered list.
6. Stop and wait for the answer. Apply only the findings that are accepted.

## Automatic passes

1. **Language** — rewrite to the style target. Cut all fluff, hedging, and mannered prose. Most of the work is here.
2. **Terms** — one term per concept. Match `CONTEXT.md` when it exists. Fix every instance in the target.
3. **Headings** — one H1, no skipped levels, each heading names what its section holds.
4. **Links** — relative links and file paths resolve.
5. **Format** — follow the convention the targets already use most.
6. **Lead** — the first sentence says what the doc is and who it is for.

## Approval passes

7. **Structure** — reorder, merge, or split sections. Turn prose that enumerates into a list or a table.
8. **Duplication** — the same content twice, in one file or across files.

Keep the meaning.
