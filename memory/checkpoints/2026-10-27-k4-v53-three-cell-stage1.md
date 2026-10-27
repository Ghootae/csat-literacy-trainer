---
date: 2026-10-27
scope: problem-feedback-judgment
base_commit: f74d0f3
---

# 재구성 세 칸 판정 (v5.3) 설계 확정과 1단계 구현

## 새로 확인된 것

- 1단계 구현 뒤 `npm test` 1417 중 1415 통과, 실패 2건은 기존 것. `feedback.test.ts` 230 통과. 실모델 호출은 없었다.

## 결정된 것

- 설계안 [인계 문서](../../docs/handoffs/2026-10-27-problem-feedback-k4-judgment-redesign.md)의 네 가지 판단을 사용자가 권고대로 승인했다("권고대로 네 가지 모두 진행해줘"): 긍정 발문 정답에서 원인을 보탠 지지(ADDED)는 인정, `keyRelationCoverage`(D-0161)는 세 칸으로 대체, READING이 있으면 선택 충돌 질문 생략, v5.2는 [D-0178](../decisions/D-0178-partial-refutation-v52-parked.md)(rejected·보관)로 기록하고 새 설계는 2단계 뒤 D-0180.

## 변경한 것

- 판정 지시문 `source-direct-problem-feedback-v5.3.md`(새 파일), `promptVersion` `problem-feedback-v5.3`.
- `feedback-claims.ts`(세 칸 스키마·서버 검사·`readingSummary`), `feedback.ts`(errorType READING, 교정 순서 TARGET→READING→CONTENT, E4), `feedback-evaluator.ts`, `feedback-end-explanation.ts`(E1·E5, 경우별 근거 부족 문단, 두 번째 선택 읽기 오류), `PA/server/problem-feedback.ts`(E3), `scripts/run-v5-live-check.mjs`, 시험 두 파일.
- 코드 에이전트 diff 검토에서 분리 검사·근거 주장 검사 빈틈 두 곳과 지시문 두 문장을 고쳤다(인계 문서 "diff 검토" 절).

## 미해결

- 2단계 실측: 실제 문항에서 과잉 인정·긍정 발문·오답 사례 고르기, 18세션 회귀 재활용, 승인 필요(대략 $1~2).
- 마지막 설명 새 문단의 이해 용이성은 사용자 판정.
- 개발자 서버 재빌드 전까지 화면은 이전 지시문을 쓴다(10-26 v5/v5.1 혼선 참고).

## 다음 행동

- 커밋 승인 뒤 2단계 사례 목록과 세션 수를 정해 전송 승인 요청.
