---
id: D-0178
status: rejected
date: 2026-10-27
scope: problem-feedback-judgment
supersedes: none
---

# 부분 반박 근거 판정 (v5.2)은 채택하지 않고 보관한다

## 결정

사용자 결정(2026-10-27): v5.2 실험은 "커밋"으로 보관 브랜치에 멈췄고, 이후 K4(회사법 13번 ②, 근거 "주식회사 법인격의 부여 대상은
단체, not 개인") 재검토에서 다른 설계 방향에 합의했다. 설계안의 번호 권고(이 번호는 v5.2 보관 기록, 새 설계는 별도 번호)에
"권고대로 네 가지 모두 진행해줘"로 동의했다.

- v5.2(보관 브랜치 `wip/partial-refutation-v52`, 커밋 `90dacd2`)는 운영 경로에 반영하지 않는다. 지시문 버전 이름 v5.2는 보관분이 쓴 것으로 둔다.
- v5.2의 변경 단위 중 P4(틀린 지점은 선지 문장에 직접 쓰인 주장만, 숨은 전제 세우지 않음)는 버린다. K4처럼 서술어가 요구하는
  빈자리를 선지 안의 말로 채운 읽기는 조건부로 인정하기로 했다([설계안](../../docs/handoffs/2026-10-27-problem-feedback-k4-judgment-redesign.md)).
- 마지막 설명 변경 E1(정답 설명을 원문 흐름으로)·E3(첫 안내 분기)·E4(첫 문장 반복 검사)·E5(같은 연결어 연속 금지)는 새 설계(v5.3)가
  그대로 가져간다. E2(근거 부족 칸 4단계)는 새 설계에서 경우별 문단의 한 경우(읽기 차이)로 남는다.
- `keyRelationCoverage`의 `point` 칸은 가져가지 않는다. 새 설계는 세 칸(선지 이해·근거·판단)으로 같은 검사를 한다.

## 이유

- 보관 브랜치 실측에서 K4는 1차부터 6차, 부작용 수정까지 어느 회차에서도 SUPPORTED가 나오지 않았다(P4 때문). 재구성 가능도 회차마다
  흔들렸다(1차 2/3, 부작용 수정 뒤 1/3). 근거: `wip/partial-refutation-v52`의 `docs/experiments/v5-any-falsity-point-2026-10-26*/cases/K4*.records.jsonl`,
  `docs/experiments/v5-partial-refutation-fix-2026-10-27-a`, `-b`.
- 사용자와 합의한 방향은 "반박 대상이 선지와 일치한다고 볼 수 있는가"(합당 기준)로 K4를 충족으로 본다
  ([논의 메모](../../docs/reports/REPORT-k4-v51-judgment-review-human.md)).

## 재검토 조건

- 새 설계(v5.3)의 빈자리 채움 규칙이 실측에서 과잉 인정을 낳으면, P4처럼 선지 문장에 쓰인 주장으로 좁히는 안을 다시 본다.

## 관련

- [체크포인트: 보관](../checkpoints/2026-10-26-partial-refutation-v52-parked.md), [체크포인트: 재설계 논의](../checkpoints/2026-10-27-k4-judgment-redesign-discussion.md)
- [D-0161](./D-0161-supported-needs-key-relation-coverage.md) 핵심 관계 조각(새 설계가 대체할 예정, 2단계 뒤 새 결정 기록).
