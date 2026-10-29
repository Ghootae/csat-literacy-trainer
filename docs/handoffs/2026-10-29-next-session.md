# 인계: 다음 세션 시작점 (2026-10-29)

새 세션은 이 문서부터 읽는다. 브랜치 `experiment/problem-solving-mvp`, 마지막 커밋 `fcf2484c`(10-28 작업까지). 그 뒤 작업은 **아직 커밋하지 않았다**(아래 목록).

## 지금까지 (10-28 밤 ~ 10-29)

1. **문단 지시문 v4.8 채택(제품 반영됨, 커밋 안 됨).** 앞 단계에서 담은 부분을 판정기에 넘기고(`coveredBefore`) 뒤집으면 검증에서 막음(B1 해소: 2/10→0/10). 질문 규칙 5번(학생 말에서 출발해 빠진 고리만). [설계 초안](../review/paragraph-gap-question-fix-draft-2026-10-28.md), [구현·검증](./2026-10-28-paragraph-gap-question-v48.md), [채택](./2026-10-28-paragraph-v48-adoption.md), [3문단 10회 재판정](../experiments/paragraph-boundary-stability-2026-10-28/README.md).
2. **학생 역할 시뮬레이션.** 도구 `scripts/student-sim.mjs`([사용법](./2026-10-29-student-sim-harness.md)), [검토 기준 체크리스트](../review/student-sim-review-checklist-2026-10-29.md), [0단계 저장 기록 검토](../review/student-sim-stage0-stored-logs-2026-10-29.md), [1단계 mRNA 계획](./2026-10-29-student-sim-stage1-mrna.md).
3. **1단계 mRNA 결과**: [사람용 보고](../experiments/student-sim-2026-10-29/REPORT-stage1-human.md), [Desktop 논의용](../experiments/student-sim-2026-10-29/REPORT-stage1-desktop.md), [문단 FINDINGS](../experiments/student-sim-2026-10-29/mrna-para/FINDINGS.md), [문제 FINDINGS](../experiments/student-sim-2026-10-29/mrna-prob/FINDINGS.md). 문단 60세션 + 19번 12세션, $0.56.

## 사용자 결정

- (2026-10-29) 원문 정의를 한 단계 적용한 추론(예: 19번 ⑤ "중성이 되면 전하가 없어지니 소수성은 약해지지 않음", 3문단 "전하를 띠는 물질 = 친수성")은 **정확한 근거**로 본다. → 판정기가 이런 추론을 UNDETERMINED로 두는 쪽과, 서버 `settleConclusion`(`packages/pipeline/src/problem-solving/feedback-claims.ts`)이 판정기와 다른 결론을 내는 쪽을 고친다.
- 2단계(나머지 5개 지문)는 아래 3번을 고친 뒤, 검증을 겸해 진행(Claude 권고, 사용자 이견 없음). 상한은 넉넉히 잡아도 된다고 함.

## 다음 할 일 (권고 순서, 아직 아무것도 시작 안 함)

1. **외국어 출력 차단(코드, 작고 확실).** 학생에게 나가는 모델 문장(문단 message·corePartSummaries·closingFeedback·gaps.question 등, 문제 교정 질문·마지막 설명)에 한글 비율 검사 → 실패면 검증 실패로 재요청. 사례 para-33(전부 중국어, 검증 통과).
2. **문제 안내 문장이 판정기 구분을 따르게(코드, 작고 확실).** `packages/app/src/server/problem-feedback.ts` 222~233행 근처 분기. 오답도 판단 경로 파악 여부로 문장 분기(prob-7), 교정 실패 '모름'(UNCONFIRMED)과 '틀림' 구분(prob-9), 부족한 정답의 '판단 방법'·'연결 부족' 구분(prob-2~4).
3. **질문 흘림(주 과제, 지시문).** 문단 v4.9: 질문이 준 내용은 학생 몫으로 세지 않음, 합쳐 읽기는 생략된 주어·대상 이어받기에만, 질문에 학생이 쓰지 않은 관계 요소 금지, "개념어 하나로 답할 수 있는가" 자기 점검. v4.8의 장점(이미 쓴 것 다시 묻지 않기, 뒤집힘 방지)은 유지. 문제 v5.7: 교정 질문 양자택일·정답 표현 금지. 설계 초안(문제·전략·위험, 실제 사례) → 사용자 검토 → 실행. 검증은 `student-sim.mjs`로 같은 유형 재실행(전후 비교).
4. **결론 재계산 + 정의 적용 추론(위 사용자 결정 반영).** prob-1/prob-11: 같은 근거, 판정기 둘 다 INSUFFICIENT, `judgment.holds`만 false/true → 서버가 prob-11만 SUPPORTED("근거도 정확해"). 결정에 따라 판정기 지시문(정의 한 단계 적용 = 원문과 맞음)과 서버 재계산을 맞춘다. 3과 같은 v5.7 묶음으로 할지 설계 초안에서 정한다.
5. 같은 문단 핵심 부분이 세션마다 달라지는 문제(설계 판단 필요, 나중).

## 커밋 안 된 이번 작업 파일 (세션 전부터 있던 미커밋 파일 6개는 제외: AGENTS.md, docs/DIALOGUE-PARAGRAPH-BASELINE-2026-08-26.md, docs/PROBLEM-SOLVING-MVP-DECISIONS-2026-08-26.md, docs/WORKSTREAM-STATE.md, docs/handoffs/TEMPLATE.md, docs/review/v5-repair-test-design-2026-10-10.md)

- 코드: `packages/pipeline/src/paragraph-simple/{schema,rules,evaluator,evaluator.test,covered-before.test}.ts`, `packages/app/src/server/dialogue-simple{,.test}.ts`, 지시문 `packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.8.md`
- 스크립트: `scripts/run-paragraph-boundary-stability.mjs`, `scripts/run-paragraph-gap-question-v48.mjs`, `scripts/student-sim.mjs`
- 문서·실험: `docs/experiments/{paragraph-boundary-stability-2026-10-28,paragraph-gap-question-v48-2026-10-28,student-sim-2026-10-29}/`, `docs/handoffs/2026-10-28-paragraph-{gap-question-v48,v48-adoption}.md`, `docs/handoffs/2026-10-29-{student-sim-harness,student-sim-stage1-mrna,next-session}.md`, `docs/review/{paragraph-gap-question-fix-draft-2026-10-28,student-sim-review-checklist-2026-10-29,student-sim-stage0-stored-logs-2026-10-29}.md`
- 테스트 상태(10-28 채택 시): `npm test` 1474 통과, 기존 실패 2건(`boundary.test.ts`, `axis-architecture-experiment.test.ts`)만. 문단 e2e 4건 통과.

## 환경

- 개발 서버: 5173(vite), 5174(문단 API, v4.8 반영, 개발자 모드), 5175(문제 API, 개발자 모드). 이전 세션의 백그라운드 작업이라 새 세션에서는 떠 있지 않을 수 있음. 띄우는 법: `npm run app:client`(5173), `CSAT_DEVELOPER_MODE=1 PORT=5174 node --env-file-if-exists=.env packages/app/dist/server/index.js`(5175도 같은 식).
- 시험은 격리 포트(문제 e2e 5393/5394, 문단 5395/5396). e2e가 `docs/handoffs/*.png`를 덮어쓰면 HEAD로 되돌린다.
- 하위 에이전트는 보고서 파일(FINDINGS 등) 쓰기가 훅에 막힐 수 있다 → 보고 내용을 받아 Claude가 저장.
- 남은 리마인드: Q-0030(luna 기호 오독), v5.6 지시문 첫 줄 제목이 "v5.3"으로 남음, 39번 말풍선 문장 세트 사용자 검토 대기.
