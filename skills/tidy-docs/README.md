# tidy-docs

Clean up a human-facing doc so a person can scan and read it: plain language, consistent terms, working links, and a structure that matches the content. Style target is B2 English written as ASD-STE100 Simplified Technical English.

Language, terminology, heading, link, and formatting fixes apply directly. Restructuring and duplicate removal are proposed first, for you to accept or reject.

## Usage

```
/tidy-docs README.md docs/setup.md
/tidy-docs            # falls back to the changed docs in git diff
```

## When to use

- A doc has grown organically and is now hard to scan.
- Terminology drifted away from `CONTEXT.md`.
- Sentences have grown long and you want them cut to size.

## Notes

- Never runs `git add` or any other git write. It warns when a target has unstaged changes.
- Cross-file duplication is reported, never edited — which copy is canonical is your call.
- For model-facing files (skills, prompts, `CLAUDE.md`), use [trim-instructions](../trim-instructions/README.md) instead.
