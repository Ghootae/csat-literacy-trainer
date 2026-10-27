# 마지막 설명(M4) 칸 유형 레이아웃 v1 — Desktop 보고

날짜: 2026-10-28. 작성: 코드 에이전트.

## 배경

- v5.3 보강판(D-0182) 마지막 설명 첫 칸을 사용자가 판정(2026-10-27~28): 1 KC·6 K4-r3·7 K4-r1이 "무엇이 빠졌는지"를 말하지 못함, 5 XS 억지 읽기 차이, 4 XA 접속어, 6번 학생 발화 그대로 인용("not 개인").
- 원인 분석(KC-r1 저장 요청 추적): M4 입력에 `insufficiencyCase: CONCLUSION_ONLY`와 `insufficiencyKind: JUDGMENT_METHOD`가 함께 들어가 서로 다른 경우 문단을 걸었고, 모델은 둘 다 따르지 않고 일반 규칙("정확히 인용", "원문과 맞는 부분 인정")으로 물러났다. 판정기(M1) `reason`에는 정확한 진단("원문 사실을 제시하지 않고 선지의 결론을 부정하는 말만 했다")이 있었으나 M4에 넘어가지 않았다.
- 사용자 제안: 판정기가 진단 글을 쓰고, M4는 최소 규칙으로 자연스럽게 쓴다. 사용자 보완: 칸 유형별 레이아웃 규칙은 준다. 풀어 쓰기 원칙(분량 증가 허용)을 넣는다. 학생 말은 그대로 옮기지 않고 풀어 말한다(보강안 B, 사용자 동의).

## 변경 (선택 인자 `layout-v1`, 기본 동작 불변)

- 설계: `PROMPT-DRAFT.md`. 인계: `docs/handoffs/2026-10-28-end-explanation-layout-v1.md`.
- M4 입력: `insufficiencyKind`·`insufficiencyCase` 제거, `sections.{firstChoice,reselection}` 추가 = `{type: ERROR|GAP|UNVERIFIABLE, correctChoice, conclusionOnly, repair: REPAIRED|NOT_REPAIRED|NOT_ASKED, diagnosis(M1 reason), judgmentNote(M1 judgment.contradiction)}`. 유형은 서버가 정한다.
- 세션 요약 `readingSummary`에 `conclusionOnly`·`judgmentNote` 추가(optional, 옛 기록 통과).
- 지시문 `END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS`: 정답·오답 공통 한 벌. 여섯 경우 문단 → 유형별 순서(ERROR 5단계, GAP 2단계+결론 반복 예외, UNVERIFIABLE 정답/오답), [풀어 쓰기], [재료](진단 메모 사용, 학생 말 풀어 말하기).
- 코드: `feedback-end-explanation.ts`, `feedback-evaluator.ts`(`endLayout`), `feedback.ts`, `feedback-claims.ts`, 테스트, 실행기 `scripts/run-end-explanation-layout-v1.mjs`.
- 검증: 빌드 통과, `npm test` 1446 통과·2 실패(기존: `boundary.test.ts` `node:fs`, `axis-architecture-experiment.test.ts` `.omc/adhoc`). 실행기 테스트 8/8. `scripts/run-end-explanation-choice-link-compare.test.mjs` 4 실패는 저장된 10-22 지시문과 현재 상수 불일치(v5.3 커밋 `10a0b90e`에서 이미 바뀜, 이번 diff는 기존 상수 무변경).

## 실행 조건

- 저장된 M1·M3 원출력을 현재 상태 기계에 외부 호출 없이 재적용해 세션 재구성, M4만 새 판으로 재생성(D-0168). 재구성 세션의 기본값(v5.3) payload가 저장 요청과 12/12 일치.
- 모델·`reasoning: medium`·`max_output_tokens: 8000`은 저장 요청과 같음. 다른 것은 지시문과 payload뿐.
- 대상 12: -b(`v53-three-cell-check-2026-10-27-b`) 정답 8(KC-r1, QP-r1, QP-r2, XA-r1, XS-r1, K4-r3, K4-r1, KF-r1), 회귀(`v5-diverse-48-regression-2026-10-27-v53-b`) C-CT(정답, 판단 방식), D-A3·S-A1·C-B3(오답). 원 계획의 오답 읽기 오류 사례는 마지막 설명까지 간 저장 세션이 없어 C-CT로 대체(건수 동일).
- 결과: 12/12 성공, 재시도 0. 비용 $0.064(luna $0.0072, sol $0.0568). 원문 나란히: `END-EXPLANATIONS.md`, 산출물 `requests/`, `responses/`, `RESULTS.json`, `ledger.jsonl`.

## 측정: 사용자 판정 (이해 용이성)

| 사례 | 유형 | 판정 |
|---|---|---|
| 1 KC-r1 | GAP, 결론 반복 | 괜찮음, 좋아짐 |
| 2 QP-r1 | GAP | 좋아짐 |
| 3 QP-r2 | GAP | 좋아짐 |
| 4 XA-r1 | GAP | 좋아짐 |
| 5 XS-r1 | GAP | 판정 문제. "도파민이 남는다"는 작용 기간 연장과 사실상 같은 뜻, 해설이 억지 |
| 6 K4-r3 | GAP | 완전 동의는 아니나 이전보다 많이 좋아짐, acceptable |
| 7 K4-r1 | UNVERIFIABLE | 6번보다 나은 해설 |
| 8 KF-r1 | UNVERIFIABLE | acceptable |
| 9 C-CT | GAP, 판단 방식 | 좋은 해설 |
| 10 D-A3 | ERROR 못 고침 | 좋은 해설 |
| 11 S-A1 | ERROR(추정) 못 고침 | 좋은 해설 |
| 12 C-B3 | ERROR 고침 → 재선택 ERROR | 좋은 해설 |

## 측정: 코드 에이전트 점검 (정확성·단정·형식)

- 학생 발화 그대로 인용 0건. "원문과 맞아"로 결론 반복 인정 사라짐(1). "②가 왜 맞는지" 사라짐(6).
- 11·12 원문 사실(오네소르게 수 정의, 범위 초과 시 노즐 밖으로 못 나옴, ⑤ 절차 위반 책임)은 지문 대조 일치.
- 5 XS: "더 강한 뜻이라 차이가 있어" 잔존, "작용 기간을 늘릴 수 있는지 판단할 수는 없어"는 ②가 참일 여지를 남김.
- 9 C-CT: 선지를 "주주들이 A에 법인격을 부여"로 풀이(K4의 사람·판정기 읽기 차이와 같은 지점). 판단 방식("법인격에 관한 내용이라서")을 "짚은 건 맞아"로 인정해 D-0159가 막은 모습과 비슷하나, 사용자는 "좋은 해설"로 판정.

## 해석

- 진단 글 + 칸 유형 레이아웃은 v5.3 경우별 문단보다 첫 칸을 개선했다(12건 중 11건 사용자 긍정, 나머지 1건은 판정 원인).
- 5 XS는 M4가 아니라 M1 선지 읽기 분류(`relation: STRONGER`)가 원인이다. 진단 글(`reason`)에도 "학생의 선지 읽기는 원문보다 강하다"가 있어 M4가 따라 썼다. (정정 2026-10-28: 앞선 대화에서 "같은 분류로 XS-r2·r3가 교정 질문까지 나갔다"고 했으나, r2·r3의 오류는 대상 오류(재흡수된 도파민 대 흑질에서 합성된 도파민)와 내용 오류(원문은 '저장되거나 분해'인데 '분해된다'만 말함)로 STRONGER 분류와 직접 관련이 없다. STRONGER 분류의 직접 영향은 r1 마지막 설명이다.)
- 판단 방식 전용 규칙 제거의 부작용은 이번 사용자 판정으로는 드러나지 않았다(9 "좋은 해설"). 표본 1건이다.

## 제안

1. 레이아웃 v1을 M4 기본값으로 채택(개발자 경로), 기존 두 지시문은 재현용으로 보존. 결정 기록 필요.
2. D1: M1 지시문에서 선지 읽기 관계 정의 보강 — 학생 읽기가 선지 말의 풀어 쓰기나 직접 결과이면 EXACT, STRONGER·ADDED는 진위 판단을 바꾸는 덧붙임일 때만. XS 3회 + G-B3 3회 + 회귀로 확인(외부 전송, 승인 필요).
3. 개발자 서버 재빌드(채택 뒤).

## 열린 질문

- 판단 방식 근거(D-0159)의 예외 한 줄을 되살릴지: 이번 1건은 사용자 긍정. 다음 회귀에서 다시 본다.
- 오답 읽기 오류(ERROR+READING) 레이아웃은 이번에 실측하지 못했다.
- 6·9(K4 지점)의 선지 읽기(법인격을 받는 쪽: 갑 대 A)는 D-0182에서 현재 동작 수용으로 정리돼 있다.
