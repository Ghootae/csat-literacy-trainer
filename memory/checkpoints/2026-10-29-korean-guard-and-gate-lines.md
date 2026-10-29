---
date: 2026-10-29
scope: problem-feedback, paragraph-simple
base_commit: uncommitted (on 8b05f6dc)
---

# 외국어 출력 차단 + 문제 안내 문장 분기

## 새로 확인된 것

- 저장된 모델 출력 6,509개(학생 노출 칸)의 한글 비율: 50% 미만은 중국어 4개(para-33, 10-17 시뮬레이션 RETRY 안내 등)와 오류 문자열 2개뿐이고, 정상 한국어의 최솟값은 0.64("mRNA 보호-> 세포내 진입"). 근거: 메인 세션 측정(일회성 스크립트, 저장 안 함).
- 근거를 생략한(OMITTED) 오답은 SELECTION 판정을 거치지 않으므로 RECONSTRUCTABLE일 수 없다(`feedback.ts` `unknown`).

## 결정된 것

- 사용자 승인(2026-10-29): 학생 노출 모델 문장은 한글 비율 50% 미만이면 검증 실패로 재요청. 안내 문장 가·나·다 문구 채택(인계 문서 참조).

## 변경한 것

- `packages/pipeline/src/korean-text.ts`(신규) 검사 함수, 문단 `validateSimpleOutput`, 문제 `validateFeedbackAssessment`(보이는 질문)·`applyFeedbackEndExplanation`에 연결.
- `packages/app/src/server/problem-feedback.ts` `gateNote`: 오답+재구성 가능 → "어떻게 판단했는지는 알겠어…", 교정 실패가 모두 UNCONFIRMED → "어떻게 생각했는지 확인하지 못했어", 정답+JUDGMENT_METHOD → "선지를 원문과 맞대어 판단하는 과정…".
- 시험: 문단·문제 단위 시험 추가, 가짜 출력의 영어 자리표시자를 한국어로 교체(`dialogue-simple.test.ts`, `paragraph-praise-catch-tags.spec.ts`).

## 미해결

- `scripts/run-v5-live-check.mjs:281`의 CORRECT_UNVERIFIED 점검은 "빠진 연결을 같이 채워 볼게"만 찾는다. 재구성 가능한 경우의 문장(이전부터)과 새 JUDGMENT_METHOD 문장은 이 문구가 없어 실모델 점검에서 오탐이 난다.

## 다음 행동

- 인계 3번(질문 흘림, 문단 v4.9·문제 v5.7) 설계 초안.

## 근거

- `docs/handoffs/2026-10-29-korean-guard-and-gate-lines.md`(결과 보고 포함)
- `npm test` 1486/1488(기존 실패 2건), 문제 e2e 47, 문단 e2e 4 통과
