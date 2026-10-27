---
id: D-0161
status: superseded
date: 2026-10-21
scope: problem-feedback-judgment
supersedes: none
superseded_by: D-0182
---

# 정답 선택의 "근거 충분"은 핵심 관계의 모든 조각을 학생이 말했을 때만 (`keyRelationCoverage`)

## 결정

사용자 결정(2026-10-21, UI 메모장 29번): 다른 Claude 의견(M2·L1 모두 근거 부족, 출력 칸·서버 검증 필요)을 바탕으로 한 Claude 권고에
동의("권고에 동의"), 설계안 "승인", 보강 "승인", "k1은 충분이야. 진행".

- SELECTION 확장 출력에 `keyRelationCoverage`(element, covered, observationId, quote)를 `claimConflicts` 다음, 판정 칸들보다 앞에 둔다.
  판정기는 선지의 참·거짓을 가르는 관계를 원문 근거 사실에서 선지가 맞거나 틀리는 지점까지 조각으로 나누고, 조각마다 그 내용을 말한
  학생 발화를 인용하거나 비운다. 조각은 적어도 두 개(근거 사실과 연결을 한 조각에 넣지 않음)이고, 판정에 꼭 필요한 것만 쓴다.
- 서버 검증(정답 선택, 재구성 가능, SUPPORTED일 때): 모든 조각 covered, 조각 2개 이상, 서로 다른 조각의 인용이 겹치지 않음. 인용은
  학생 발화 안에 있어야 한다. 하나라도 어기면 SUPPORTED를 받지 않는다(모델 재시도).
- 오답 선택의 SUPPORTED는 검사하지 않는다(SUPPORTED·CONSISTENT는 정답 기준 충돌 검토로 가는 안전장치). 칸은 기록한다.
- 부족의 종류(D-0159): 학생이 근거의 출처를 원문 밖으로 밝혔거나 선지의 결론을 바꿔 말했을 뿐이어도 JUDGMENT_METHOD다.
- 교정 뒤 근거 확인(D-0157)은 그대로다.

## 이유

- 원문 밖 지식("…배웠어")과 원문 사실 한 줄("말초 조직에서만 작용함")을 첫 판정이 SUPPORTED로 봤다. 지시문의 "관련 대상이나 조건만
  언급하면 SUPPORTED가 아니다"가 지켜지지 않았다([논의 자료](../../docs/review/backlog-29-supported-scope-2026-10-21.md)).
- "평가자가 보탠 내용" 자기 신고 칸 대신 조각별 학생 인용을 택했다. 학생이 하지 않은 말은 인용할 수 없어 빈 조각으로 드러난다.
- 실모델: 1차 9/12(조각 하나로 뭉치는 빈틈, 지문 밖 지식 종류 오분류) → 2차 5/6(필요 없는 해설 조각으로 K1 오판) → 3차 6/6
  ([1차](../../docs/experiments/v5-supported-coverage-user-2026-10-21/REVIEW.md), [2차](../../docs/experiments/v5-supported-coverage-r2-user-2026-10-21/REVIEW.md),
  [3차](../../docs/experiments/v5-supported-coverage-r3-user-2026-10-21/REVIEW.md)). 사용자 판정: B1("뇌에 못 들어가") 근거 부족, K1 충분.

## 한계·재검토 조건

- 문항 3개에서만 확인했다. 바른 짧은 근거가 "근거 부족"으로 떨어지는 과잉 엄격이나, 판정에 필요 없는 조각을 넣는 일이 다른 문항에서
  보이면 다시 본다.
- 조각을 무엇으로 나눌지는 모델 판단이라 서버가 확인하지 못한다. 조각 수·인용 분리는 최소한의 구조 검사다.

## 후속

- 2026-10-22 [D-0166](./D-0166-absence-rationale-by-refutation.md): 근거 없는 덧붙임 선지의 조각은 "선지가 덧붙인 내용"과 "그 근거가 원문과 <보기>에 없음"으로 나눈다.
