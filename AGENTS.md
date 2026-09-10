# Project memory instructions

This repository keeps durable project memory in `memory/`. Chat history and
`.omc/project-memory.json` are not authoritative project memory.

## At the start of a task

1. Read `memory/CURRENT_STATE.md`.
2. Read `memory/INDEX.md` and open only the sources relevant to the task.
3. Read the applicable records in `memory/decisions/` before proposing a change
   to an accepted policy.
4. If memory conflicts with code, tests, or a newer primary report, surface the
   conflict and update memory from the stronger evidence. Do not silently pick
   whichever source is convenient.

## While working

- Keep hypotheses, measurements, and accepted decisions distinct.
- Cite repository-relative source paths for factual claims added to memory.
- Treat operational policy documents and experiment reports as evidence;
  summaries must not invent facts that are absent from those sources.
- Do not revive a rejected or superseded approach without reading its decision
  record and satisfying its stated review trigger.

## At the end of a task

Update durable memory only when the task changes project knowledge or direction:

1. Add a checkpoint in `memory/checkpoints/` containing only the task delta.
2. Update `memory/CURRENT_STATE.md` if a currently true fact, status, risk, or
   next action changed.
3. Add a decision record for a newly accepted, rejected, or superseded choice.
   Preserve the old record and link the replacement instead of rewriting history.
4. Update `memory/OPEN_QUESTIONS.md` when a question opens or closes.
5. Run `node scripts/validate-memory.mjs`.

Routine refactors, formatting, and tests that do not change project understanding
do not require a memory update. Never promote an LLM summary to an accepted fact
without a repository source, test result, experiment, or explicit user decision.
