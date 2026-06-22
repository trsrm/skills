# trim-instructions

Compress a model-facing instruction file — skills, prompts, system prompts, CLAUDE.md — by stripping verbal ballast while keeping every behavior-shaping rule intact. Rewrites the file in-place.

## Usage

```
/trim-instructions path/to/SKILL.md
```

## When to use

- A skill or prompt file feels verbose or hard to scan.
- A CLAUDE.md has grown organically and you suspect it's full of human scaffolding.
- You want to reduce token cost for a frequently-loaded instruction file.