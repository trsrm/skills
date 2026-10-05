---
name: doc-workflow
description: Run tidy-docs, find and remove safe low-signal content, then run asd-ste100 in order.
---

Use the target paths supplied by the user. Invoke each skill through the Skill tool when available. In Codex, load that skill's full SKILL.md from its catalog path at the corresponding step and execute it with the specified inputs. Stop only if a required skill is unavailable.

Run steps 1 → 2 → 3. Complete and apply each step before starting the next. Wait for each skill to finish. Use the files updated by the previous step. If a step fails or is blocked, stop before the next step.

Pass this rule to both `tidy-docs` and `asd-ste100`: "Preserve the document's language and existing English professional terms. Do not translate the document or those terms unless the user explicitly requests it. Use CONTEXT.md to clarify term meanings, not to change their language. Follow the skill rules subject to this language rule."

1. Run `tidy-docs` with the target paths and the language rule above. After it finishes, apply the proposed changes.
2. Ask: "Is there any low-value or low-signal content we can safely remove?" Apply the safe removals found.
3. Run `asd-ste100` with the target paths and the language rule above.
