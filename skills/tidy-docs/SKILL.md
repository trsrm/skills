---
name: tidy-docs
description: Clean up a human-facing doc — plain language, scannable structure, consistent terms, no fluff. Use for /tidy-docs.
disable-model-invocation: true
---

# tidy-docs

Make a doc easy for a human to scan and read. Style target: B2 English, written as ASD-STE100 Simplified Technical English.

Targets: the file paths given. If none are given, the changed docs in `git diff`.

## Steps

1. Read each target in full. Read `CONTEXT.md` if it exists.
2. Run every pass. Sort each change by the split rule.
3. Warn about any target with unstaged or uncommitted changes: name it, and say the auto changes will mix into work the human has not reviewed. Staged files are fine to edit. Never run `git add` or any other git write — the human must be able to read the diff.
4. Apply the auto changes.
5. Give the ask changes as one numbered list: file, place, what changes, why. Wait for accept or reject. Apply what is accepted.
6. Report auto changes per pass, accepted and rejected changes, and duplication findings.

## Split rule

**Auto-apply** when every new line traces back to exactly one old line. Whole-block deletions and whole-block insertions also auto-apply.

**Ask** when the diff loses that trace: a block rewritten from scratch, moved, or reordered; paragraphs merged or split across sections; prose turned into a list or table; a heading added, removed, or moved to another level.

The test is diff readability, not risk. The reviewer must be able to pair each new line with the line it came from.

## Passes

1. **Language** — short sentences, active voice, one topic per sentence. Cut fluff, hedging, and mannered prose.
2. **Terms** — one term per concept. Match `CONTEXT.md` when it exists.
3. **Headings** — one H1, no skipped levels, each heading names what its section holds.
4. **Links** — relative links and file paths resolve. Report the ones you cannot fix.
5. **Shape** — prose that enumerates becomes a list or a table.
6. **Format** — consistent heading case, code spans, and list punctuation.
7. **Lead** — the first sentence says what the doc is and who it is for.
8. **Duplication** — the same content in two files. Report only, never edit: which copy is canonical is the human's call.
