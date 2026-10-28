---
id: D-0185
status: accepted
date: 2026-10-28
scope: problem-feedback-judgment
supersedes: none
---

# 판정 지시문 v5.6: 선지 읽기 차이를 "덧붙인 내용 대 세기"로 가르고, 오답 READING 오류의 판정은 서버가 ERROR로 맞춘다

## 결정

사용자 결정(2026-10-28, "제안 대로 일괄 승인"). 경합 판단 방식은 사용자 제안("ADDED와 STRONGER·WEAKER가 경합할 때는 … 추가된 정보에 의한 것인지, 강도가 달라진 것에 의한 것인지 판단")을 충돌 검토 뒤 ADDED 대 STRONGER로 좁힌 것이다.

- 문제 판정 운영 후보의 판정 지시문을 `source-direct-problem-feedback-v5.6.md`(`promptVersion: problem-feedback-v5.6`)로 바꾼다. v5.3 대비 relation 정의 문단만 다르다.
  - ADDED 정의: "선지에 없는 내용(원인·조건·방식 등)을 보탬".
  - 선지 말을 같은 뜻으로 풀어 쓰거나 곧바로 따라 나오는 결과를 말한 읽기는 EXACT.
  - relation은 학생 근거가 선지를 반박·지지하는지와 따로, 읽은 뜻만으로 정한다. 근거가 선지에 닿지 않는 것은 judgment.holds·contradiction에서 다룬다.
  - ADDED와 STRONGER가 함께 후보면 차이가 덧붙인 내용에서 오는지 정도·범위·확실성에서 오는지 판단하고, 둘 다면 ADDED. 같은 사태를 다른 말로 나타낸 것은 세진 것이 아니다. 선지가 가리키는 대상을 바꾼 것은 OTHER_TARGET.
- 서버 정규화(`normalizeCells`): 오답 선택·RECONSTRUCTABLE·READING 오류가 있으면 contentAssessment를 ERROR, insufficiencyKind를 NONE으로 맞춘다(정답 선택 READING 오류 제거 규칙의 대칭).
- v5.4·v5.5는 이번 실험 재현용, v5.3은 D-0182 재현용으로 남긴다.

## 이유

- XS(도파민 ② "분해되지 않고 계속 남는다")가 STRONGER로 분류돼 마지막 설명이 "더 강한 뜻이라 차이가 있어"라는 억지를 썼다(D-0184 재검토 조건). 실제 차이는 선지의 '효소'를 분해 효소로 정한 덧붙임이며, ②의 함정(합성 효소, 말초 작용)과 같은 지점이다.
- 단계 결과(XS 분류): v5.4 STRONGER 3/3, v5.5 ADDED 2·STRONGER 1, v5.6 ADDED 5/5. XA ADDED 유지, WQ WEAKER·WR REVERSED 읽기 오류 유지.
- v5.4부터 sol이 오답 READING 오류에 INSUFFICIENT를 두는 형식 위반이 늘었다(WQ·WR 판정 시도 v5.3 1/8 → v5.6 5/7). 지시문상 이 조합은 항상 ERROR라 서버가 맞춘다. 저장 출력 9건 재검증 모두 통과.
- 회귀 18세션: 역할별 결과 8/8 v5.3과 같음. 경로 변화는 G-B3 1건(교정 답 REPAIRED → 재선택, v5.1 경로 복귀). $0.970.
- 근거: [D1 보고](../../docs/experiments/judge-reading-paraphrase-d1-2026-10-28/REPORT-human.md), [회귀 보고](../../docs/experiments/v5-diverse-48-regression-2026-10-28-v56/REPORT-desktop.md), [인계](../../docs/handoffs/2026-10-28-judge-reading-paraphrase-d1.md). D1 전체 $1.77.

## 재검토 조건

- 형식 재시도가 회귀에서 1→5로 늘었다(대부분 `CONTRADICTED claim has no error`, 모두 1회 재시도 통과). 다음 실행에서도 늘면 원인을 본다.
- XS 마지막 설명은 말꼬리 없음 2/3, r3는 여전히 "'연장'은 '계속 남는다'는 뜻이 아니야". 같은 유형이 실제 학생 자료에서 반복되면 M4 쪽에서 다룬다.
- 근거 엄격도: "분해된다"를 "항상 분해된다"로 읽어 CONTENT 오류(XS v5.6 2/5). 별건.
- ADDED와 WEAKER가 함께 있는 경우는 발문별 인정이 반대라 규칙을 두지 않았다. 실제 사례가 나오면 정한다.
- K4는 OTHER_TARGET으로 모였으나 결과(근거 미확인)는 D-0182와 같다.

## 관련

- [D-0182](./D-0182-problem-feedback-v53-three-cell-adopted.md)(세 칸 판정), [D-0184](./D-0184-end-explanation-layout-v1-adopted.md)(M4 레이아웃), [D-0168](./D-0168-reuse-existing-data-in-comparison-experiments.md)(재활용).
