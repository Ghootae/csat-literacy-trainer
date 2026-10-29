---
id: D-0189
status: accepted
date: 2026-10-29
scope: problem-feedback-conclusion
supersedes: none
---

# 서버는 판정기의 INSUFFICIENT를 SUPPORTED로 올리지 않는다. 정의 부정 추론(19번 ⑤)은 연결 부족으로 수용한다

## 결정

사용자 결정(2026-10-29): "(ㄱ)으로 하고 첫 단계까지 수정해서 재확인해", 재확인 뒤 "진행".

1. **서버 결론 규칙(코드, 지시문 버전과 무관).** `settleConclusion`(`packages/pipeline/src/problem-solving/feedback-claims.ts`)은 정답 선택에서 판정기의 SUPPORTED를 세 칸 기준으로 INSUFFICIENT로 내릴 수는 있지만, 판정기의 INSUFFICIENT를 SUPPORTED로 올리지는 않는다. 세 칸이 충족 기준을 만족해도 판정기가 INSUFFICIENT면 INSUFFICIENT를 유지하고, 메모 "contentAssessment kept INSUFFICIENT: the server does not raise the model conclusion"을 남긴다. 판정기의 ERROR(오류 없음)·UNKNOWN 표기를 세 칸으로 바로잡는 동작(D-0182)은 그대로다. [D-0182](./D-0182-problem-feedback-v53-three-cell-adopted.md)의 "서버가 세 칸에서 충족·부족 확정"을 이 방향으로 좁힌다.
2. **19번 ⑤ 정의 부정 추론은 연결 부족.** 학생 근거 "중성됨 → 전하 없어지니까 소수성 강해짐 → 5는 반대"는 정확한 근거로 보지 않는다. 같은 날 앞선 사용자 판단("정확이라고 판단해", [인계](../../docs/handoffs/2026-10-29-next-session.md))은 코드 에이전트가 원문 정의를 "전하 = 친수성"으로 줄여 제시한 상태에서 나왔다. 원문 정의는 "극성 **또는** 전하"라 전하 상실만으로 친수성 상실이 닫히지 않는다. 판정기(luna 5/5, sol 6/10)와 공식 해설("근거 없음")도 같은 쪽이다.
3. **지시문 v5.8**(`source-direct-problem-feedback-v5.8.md`)의 내용: ground는 사실부터 선지와 맞서는 단계까지의 학생 말, holds는 논리만, sourceCheck에 정의·일반 진술 한 번 적용 규칙. ground "첫 단계까지(가장 짧은 구간)" 문안은 역효과라 채택하지 않았다(`-v5.8-draft2.md` 재현용). 제품 기본값 전환은 이 결정에 포함하지 않는다(별도 승인).

## 근거

- [실험 보고](../../docs/experiments/v58-conclusion-2026-10-29/REPORT-human.md)·[Desktop 보고](../../docs/experiments/v58-conclusion-2026-10-29/REPORT-desktop.md) 측정 1~7.
- 서버가 INSUFFICIENT를 SUPPORTED로 올린 저장 기록은 2건(prob-11 `84ba3f65`, v5.8 초안2 P1-r2 `45255cc1`)이고 둘 다 판정기 자신의 결론과 반대인 잘못된 결과였다. 새 규칙으로 재생하면 둘 다 INSUFFICIENT·MISSING_LINK. 저장 기록 86 판정 재생에서 다른 결과 변화 없음.
- 단위 시험: `feedback.test.ts` 3d 추가, 낡은 기대 2개(INSUFFICIENT를 거부해야 한다)를 바꿈. `npm test` 1491 통과, 기존 실패 2건만.
- (ㄹ) 정답 세션 sol 재판정은 sol도 4/10으로 갈려 채택하지 않음.

## 다시 볼 조건

- 판정기가 충분한 근거를 INSUFFICIENT로 내리는 사례(과소 인정)가 실제 학생 기록에서 반복되면, 서버 올리기 금지 대신 다른 방어를 검토한다.
- 정의를 한 갈래만 적용한 추론을 인정할지(방안 (ㄴ))는 새 문항에서 같은 유형이 반복될 때 다시 본다.
