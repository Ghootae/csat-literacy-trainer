# Project memory instructions

This repository keeps durable project memory in `memory/`. Chat history and
`.omc/project-memory.json` are not authoritative project memory.

## 클로드·코덱스 업무 분장

근거: `memory/decisions/D-0092-claude-codex-work-division.md`.

- 클로드는 문제 해결의 주된 사고 파트너다. 코덱스는 사용자가 코덱스와의 논의를 명시한
  경우에만 보조 논의 파트너가 되며, 이때 클로드의 결론 없이 문제와 근거 자료만 받는다.
- 설계가 확정된 작업의 실행은 코덱스에 넘긴다. 설계 확정은 `docs/handoffs/`에 인계
  문서(`docs/handoffs/TEMPLATE.md` 형식)가 있다는 뜻이다.
- 코덱스는 실행 중 인계 문서와 충돌하거나 설계 공백을 발견하면 설계를 임의로 바꾸지 않고
  멈춘 뒤 보고한다.
- 코덱스 실행 결과는 클로드가 인계 문서 대비 diff로 검토한다.
- 인계 비용이 더 큰 작은 작업과 `memory/`의 결정 기록·체크포인트는 클로드가 직접 한다.
- 커밋: 검증 통과·diff 검토 통과·결정 기록 직후에 클로드가 파일 목록과 메시지 초안을 보여
  주고 사용자 승인 후에만 커밋한다. 그 작업의 변경분만 담고(`git add -A` 금지), 푸시는 별도 승인.

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
