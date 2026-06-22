---
name: trim-instructions
description: Compress a model-facing instruction document (skill, prompt, system prompt, CLAUDE.md) by removing ballast while keeping all signal. Rewrites in-place. Use when a skill or prompt file feels verbose.
---

# trim-instructions

Compress a model-facing instruction file — skills, prompts, system prompts, CLAUDE.md. Strip ballast, keep signal. Rewrite in-place.

## Orientation

Read the full file first. Understand its purpose, who runs it, and what behavior it produces. You need this to judge what each block actually does.

Model-facing instruction files accumulate verbal ballast: text humans write for themselves that dilutes model signal without changing behavior. Your job is to remove it without removing any behavior-shaping content.

## Classification

Classify every block into one of four categories:

| Category | Definition |
|---|---|
| **Signal** | Behavior-changing: rules, conditionals, step sequences, specific values, branch logic |
| **Example** | Behavior-shaping: keep if the wrong behavior is plausible without it; cut if the rule is already unambiguous |
| **Context** | Human-author scaffolding: preambles, motivation sentences, meta-commentary about what a section contains |
| **Ballast** | Removes nothing if cut: hedging phrases, redundant restatements, filler |

Ground check: *if this block were removed, would a capable model produce different output?* If no — context or ballast.

## Compress

Decide what survives: all signal, examples only where the wrong behavior is plausible without them, nothing else.

Reconstruct from what survives. Don't edit in place — rewrite each section from your understanding of what it must say. Be as short as possible while keeping every behavior-shaping rule intact.

If uncertain whether something is signal, keep it.

Write the file in-place. Report before/after line count and what categories were cut.
