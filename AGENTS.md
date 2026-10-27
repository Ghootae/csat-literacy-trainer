# Project memory instructions

This repository keeps durable project memory in `memory/`. Chat history and
`.omc/project-memory.json` are not authoritative project memory.

## 사용자 지시의 불명확한 부분 확인

이 프로젝트에서 사용자의 작업 지시를 충분히 이해하지 못한 부분이 있다면,
작업 수행 전에 반드시 다음 절차를 따른다.

1. 이해하지 못한 부분을 목록으로 사용자에게 먼저 제시한다.
2. 목록의 항목을 하나씩 질문하고 사용자 답변을 기다린다.
3. 각 답변을 바탕으로 이해한 내용을 사용자에게 확인하고, 해당 질문이 충분히
   해소됐는지 점검한다. 불충분하면 추가 질문한다.

불명확한 부분을 임의의 가정으로 대체해 작업을 시작하지 않는다. 목록의 질문이
충분히 해소된 뒤 작업을 수행한다. 근거: `memory/decisions/D-0069-clarify-user-instructions-before-work.md`.

## 실행 주체 명칭

근거: `memory/decisions/D-0169-actor-names.md`. 기록과 보고에서 "Claude"만으로 쓰지 않는다.

- **호출 모델**: API로 부르는 모델(luna, sol 등).
- **코드 에이전트**: Claude Code 메인 세션.
- **하위 에이전트**: 코드 에이전트가 띄우는 executor 등.
- **웹 에이전트**: claude.ai 웹·데스크톱 앱의 Claude(기존 문서의 "Desktop Claude").

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

## 모델 배분과 긴 산출물 검토

근거: `memory/decisions/D-0171-session-usage-rules.md`.

- 하위 에이전트 모델은 과제 종류로 고른다: 구현·인계 문서 실행은 sonnet, 단순 조회·파일 수집은
  haiku, 독립 검토·까다로운 디버깅은 opus.
- 메인 세션 모델은 사용자가 `/model`로 바꾼다. 과제 시작 때 한 줄로 권고한다: 커밋·기록 갱신·
  단순 확인 같은 일상 작업은 Sonnet, 설계·실험 해석은 Opus 유지.
- 대량 생성 결과·긴 로그·긴 실험 출력의 검토는 하위 에이전트에 맡기고 요약·판정·문제 사례만
  돌려받는다. 원문을 메인 맥락에 쌓지 않는다. 사용자가 직접 판정할 때(예: 학생용 설명의 이해
  용이성)는 원문을 보여 준다.

## 과제 종료 절차

근거: `memory/decisions/D-0171-session-usage-rules.md`.

과제 한 단위가 끝나면 코드 에이전트가 판단해 다음을 묻는다.

1. 변경이 있으면 커밋 여부(위 커밋 규칙대로 파일 목록·메시지 초안 제시).
2. 세션 재시작 여부. 맥락이 많이 쌓였거나 다음 과제가 지금 맥락과 관련이 적으면 재시작을,
   이어지는 과제면 계속을 권한다. 재시작하기로 하면 체크포인트·`memory/CURRENT_STATE.md`에 다음
   할 일을 적은 뒤 사용자에게 `/clear` 입력을 안내한다.

## 결과 보고 형식

근거: `memory/decisions/D-0163-two-format-task-reports.md`.

아래 경우의 결과 보고는 두 파일로 남기고, 채팅에는 인간 보고서를 출력한다.

- 실험이나 생성을 실행하고 결과를 해석할 때(예: 선지 연결 3회 실행, 분석 골드 생성).
- 결과를 보고 설계 판단(방안 선택 등)이 필요할 때.
- 웹 에이전트(Desktop Claude)와 논의할 거리가 생긴 큰 작업 단위를 마쳤을 때.

문서·규칙 기록, 커밋, 작은 코드 수정, 설명 요청에 대한 답, 진행 알림은 채팅에 짧게만 보고한다.

1. **Desktop 보고서**(`REPORT-<작업>-desktop.md`, 웹 에이전트와 논의 목적, 파일명은 유지): 정확성과 빠짐없음이 우선이다.
   측정과 해석을 나누고, 실행 조건·수치 표·사례·정정·제안·열린 질문·파일 경로를 담는다.
2. **인간 보고서**(`REPORT-<작업>-human.md`, 이해와 판단 목적):
   - **1. 개요**: 1) 작업의 목적, 2) 작업의 결과, 3) 다음 스텝. 분량에 제한이 없고, 사례와
     예시로 직관적으로 설명한다. 앞선 보고를 고치는 내용이 있으면 "정정"으로 밝힌다.
   - **2. 본문**: 문제마다 구체 사례로 "어떤 문제가 → 어떤 과정을 거쳐 → 어떤 결과(해결/미해결)"를
     쓴다. 소제목에 (해결)·(미해결)·(판단 필요)를 표시하고, 다음 스텝을 제안한다. 사람의 판단이
     필요하면 원문과 사례를 질문 바로 앞에 보여 주고, 방안을 표로 비교하고, 추천과 이유를 적는다.
     마지막에 다음 스텝 표(할 일·외부 전송·사용자 판단)를 둔다.
3. 파일은 실험이면 그 실험 폴더에, 아니면 `docs/reports/`에 둔다. 본보기:
   `docs/experiments/choice-link-2026-10-22/REPORT-v2-run-human.md`, `REPORT-v2-run-desktop.md`.

보고 속 약어(변경 단위 P4, 사례 K4, 결정 번호 등)는 한 보고 안에서 처음 쓸 때만 짧은 설명을 괄호로 붙인다(예: "P4(틀린 지점은 선지 문장에 쓰인 주장만)"). 근거: `memory/decisions/D-0179-explain-abbreviations-on-first-use.md`.

## 비교 실험 전 기존 자료 재활용 검토

근거: `memory/decisions/D-0168-reuse-existing-data-in-comparison-experiments.md`.

비교 실험을 설계할 때는 외부 전송 계획을 세우기 전에 재활용할 수 있는 기존 자료(지난 실험의 저장된 요청·응답·출력, 동결 자료)가 있는지 먼저 찾는다. 기존 출력이 같은 지시문·모델·입력으로 만들어졌으면 기준 조건으로 다시 쓰고 새 조건만 생성한다. 같은지 확인한 방법(지시문·모델·입력 비교)과 재활용하지 않는 경우 그 이유를 전송 승인 요청에 적는다.

## At the start of a task

1. Read `memory/WORK_TREE.md` for the branch map, then `memory/CURRENT_STATE.md`.
2. Do not read `memory/INDEX.md` whole. Read its heading list first
   (`grep -n '^#' memory/INDEX.md`), read the sections relevant to the task,
   then supplement with keyword search. Open only the sources relevant to the
   task (D-0171).
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
   next action changed. Keep it to currently true facts only and under 20KB
   (D-0171). Update `memory/WORK_TREE.md` and its date when a
   branch status or next step changed (D-0113).
3. Add a decision record for a newly accepted, rejected, or superseded choice.
   Preserve the old record and link the replacement instead of rewriting history.
4. Update `memory/OPEN_QUESTIONS.md` when a question opens or closes.
5. Run `node scripts/validate-memory.mjs`.

Routine refactors, formatting, and tests that do not change project understanding
do not require a memory update. Never promote an LLM summary to an accepted fact
without a repository source, test result, experiment, or explicit user decision.
