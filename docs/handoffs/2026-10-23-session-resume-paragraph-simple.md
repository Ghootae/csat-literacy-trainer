# 세션 이어받기: 단순 형식 문단 대화 · 개발 화면 테스트 (2026-10-23)

- 작성: Claude (계정 전환 전, 이전 세션 20dca876)
- 용도: 다른 계정의 새 세션이 바로 이어서 작업하기 위한 상태 기록. 설계 인계 문서가 아니다.
- 먼저 읽을 것: `AGENTS.md`, `memory/decisions/D-0149-paragraph-simple-v45-central-operational.md`, 이 문서.

## 1. 지금 상태 한눈에

| 항목 | 상태 |
|---|---|
| 커밋 `16a446e` | v4.6 마무리 형식, 개발 화면 파트 이동 막대, 생각중 말풍선, 교정 질문 힌트. 커밋·푸시 완료 |
| v4.7 교정 질문 수정 | 구현·시뮬레이션·보고 완료. **미커밋**. 사용자에게 파일 목록·메시지를 보였고 승인 대기 |
| 개발 서버 | 2026-10-22 22:34에 v4.7 빌드로 띄움(이전 세션의 백그라운드 작업이라 세션 종료와 함께 꺼졌을 수 있음) |
| 검토 요청 진행 중 | mRNA 지문 가장 최근 문제 풀이 피드백 검토(아래 3-1). 시작 직후 중단 |

## 2. 미커밋 v4.7 — 커밋 대기

사용자 지시는 "서버 다시. 이후 커밋"이었다. Claude가 아래 목록·메시지를 보이고 승인을 기다리는 중에 계정 전환. **새 세션은 목록을 다시 보이고 승인받은 뒤 커밋한다.** 푸시는 따로 승인받는다(이번에는 아직 요청 없음).

파일(이것만 담는다. `git add -A` 금지):

- `packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.7.md` (새 파일)
- `packages/pipeline/src/paragraph-simple/schema.ts`, `evaluator.ts`, `evaluator.test.ts`
- `docs/experiments/simple-holistic-path-simulation-2026-10-17/build.mjs`, `run.mjs`, `cases.json`, `SIMULATION.md`
- `docs/experiments/simple-holistic-path-simulation-2026-10-17/runs/2026-10-22-v4.6-correction-base/`
- `docs/experiments/simple-holistic-path-simulation-2026-10-17/runs/2026-10-22-v4.7-correction/` (보고서 `REPORT-v4.7-correction-{human,desktop}.md` 포함)
- `docs/experiments/simple-holistic-path-simulation-2026-10-17/runs/2026-10-22-v4.7-infoasym-recheck/`
- `memory/checkpoints/2026-10-22-paragraph-simple-v47-correction-question.md`
- 이 문서 `docs/handoffs/2026-10-23-session-resume-paragraph-simple.md`

메시지 초안:

```
fix(paragraph-simple): v4.7 open correction questions; bare "다르다" answers are not fixes

- CORRECTION_QUESTION names the student's claim and asks how the paragraph
  describes it (no yes/no "맞을까?" questions)
- AFTER_CORRECTION: content-free "틀렸다/다르다/모르겠다" → targetErrorResolved=false;
  CLOSE_ERRORS intro acknowledges a noticed mismatch without calling it fixed
- simulation: P30 ("맞지 않아.") and P31 ("잘 모르겠어.") paths, yes/no metric
- runs: v4.6 baseline, v4.7 correction paths (yes/no 0/86, bare-answer
  false fix 0/15, acknowledgement 13/15), info-asymmetry recheck; reports

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

주의: 작업 트리에는 다른 세션의 미커밋 변경이 많다. 특히 `packages/app/src/client/ProblemFeedbackV4App.tsx`, `problem-feedback-workbench.css`, `packages/app/e2e/*`(문제 화면 세션의 화면 정리), `memory/CURRENT_STATE.md`·`DECISIONS.md`·`WORK_TREE.md` 등. 건드리거나 담지 않는다. HEAD가 그사이 움직였을 수 있으니 커밋 전에 `git log -3`과 `git status --short`로 확인한다.

## 3. 남은 일

### 3-1. mRNA 문제 풀이 피드백 검토 (사용자 요청, 진행 중)

- 요청: "mRNA 백신과 지질 나노 입자, 가장 최근 문제 풀이 피드백 결과 검토해줘."
- 기록: `.omc/logs/problem-feedback-v4/events.jsonl`(줄마다 `event`, `savedAt`, `session`(phase·observations·assessments·selections·errors…), `transcript`, `call`, `evidenceContext`). 질문 id `mrna-vaccine-lipid-nanoparticle-q19`.
- 마지막 줄은 2026-10-22T14:03:48Z `SUBMITTED`로, 판정 결과(`EVALUATED`)가 아직 없었다. 바로 그 직전 세션 흐름은 13:50~14:03Z. 서버가 꺼졌다면 그 판정은 끝나지 않았을 수 있다. 새 세션은 파일 끝에서 mRNA 세션을 찾아 전체 대화(transcript)와 판정(assessments·errors·call)을 읽고 검토한다.
- 찾는 예: `python3 -c` 로 `json.dumps(r)`에 `mrna`가 들어간 마지막 줄들의 `session.sessionId`를 묶어 가장 최근 세션을 고른다.
- 문제 풀이 쪽은 다른 세션(문제 화면 세션)의 작업 영역이다. 검토만 하고, 수정이 필요하면 사용자에게 먼저 묻는다.

### 3-2. 판단 대기

- 정보 비대칭 첫 요약을 오류 둘(MULTI_ERROR)로 보는 경우가 v4.7에서 4/30(v4.5 0/42). Claude 권고는 "그대로 두고 지켜보기"(오경보 아님). 사용자 답 없음. 근거: 위 v4.7 보고서 2-3.

### 3-3. 사용자 테스트 중 나온 요청

- 정보 비대칭 마지막 문단(문단 5) 결과 검토 요청이 있었으나 세션 id를 몰라 보류했다. 이제는 `.omc/logs/dialogue-experiment/simple-holistic/sessions.jsonl`에서 `passageId=information-asymmetry-free-marketplace`, `paragraphIndex=4`로 찾을 수 있다(서버 재시작과 무관하게 기록이 남는다). 사용자가 다시 요청하면 이 파일로 검토한다.

## 4. 알아 둘 것

- 단순 형식 대화 기록
  - `.omc/logs/dialogue-experiment/simple-holistic/sessions.jsonl`: 판정마다 한 줄. 대화 전체·모델 원출력·행동·검증 실패·프롬프트 버전.
  - `memos.jsonl`: 단계별 판정·메모 노트. 같은 키의 마지막 줄이 현재 값이다.
  - 둘 다 git 미추적 로컬 파일이다. 세션 자체는 서버 메모리에만 있어서, 서버를 다시 띄우면 화면에서는 사라진다.
- 개발 서버 실행: 저장소 루트에서 `PARAGRAPH_SIMPLE_OPENAI_MODEL=gpt-6-luna CSAT_DEVELOPER_MODE=1 npm run dialogue:ui`
  - 포트는 5173(Vite), 5174(API), 5175(문제 v4 API)다.
  - 포트가 이미 쓰이고 있으면 누가 띄웠는지(`lsof`, 프로세스 환경의 `CLAUDE_PID`) 확인한다. 다른 세션 서버는 사용자 승인 없이 끄지 않는다.
- 시뮬레이션 실행: 저장소 루트에서 `CASE_FILTER=<사례 id들> node --env-file=.env docs/experiments/simple-holistic-path-simulation-2026-10-17/run.mjs <회차> gpt-6-luna <USD 상한> <라벨>`
  - 실행 전에 비용을 사용자에게 알린다.
  - 사례는 문단당 31경로(P30·P31은 10-22에 추가)다.
- 테스트: `npx vitest run packages/app/src`에서 `boundary.test.ts` 1건이 실패한다. 미커밋 `server/student-state.ts`의 node:fs 때문인 기존 실패다.
- 사용자 작업 방식
  - 근거 있는 권고를 선호한다.
  - 직관을 먼저, 디테일을 나중에 쓴다.
  - 사용자 예시는 방향 예시이며 문구 틀로 쓰지 않는다.
  - FA(오경보)가 치명적이고 miss는 덜 치명적이다.
  - 실험·판단 결과는 Desktop·인간 두 파일로 보고한다(D-0163).
