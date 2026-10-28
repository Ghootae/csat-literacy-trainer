# 회귀 18세션 — v5.6 + 오답 READING 정규화 (2026-10-28)

- 대상: v5.3 회귀(`v5-diverse-48-regression-2026-10-27-v53-b`)와 같은 18세션(`SET.txt`), 후속 답은 그 실행의 답을 같은 단계·같은 화면 단계일 때 재사용(교정 질문 문장은 달라도 묻는 지점 같음, 8건 대조 확인). 사용자 승인 "회귀 승인".
- 런타임: 판정 지시문 v5.6, `normalizeCells` 오답 READING → ERROR 정규화, M4 layout-v1(D-0184).
- 비용 $0.970(sol 25회 $0.923, luna $0.046), 상한 $1.2(sol $1.13·luna $0.07).

## 측정

- 역할별 최종 결과 8유형 모두 v5.3과 같다(`COMPARISON.md`).
- 경로가 바뀐 세션 1: G-B3 `REPAIR_FAILED` → `RESELECTION_WRONG`. 선택 충돌 교정 답 "적절한 설명이에요."를 REPAIRED로 판정해 재선택으로 갔다. v5.1(10-26) 경로와 같고, D1 1차의 G-B3 3/3 REPAIRED와 일치한다. v5.3의 REMAINING은 흔들림으로 정리.
- 형식 검증 재시도 5(v5.3 1): `CONTRADICTED claim has no error` 4(C-B3·G-B3 재선택, G-A2·S-A1 첫 판정), `choiceText not in the chosen choice` 1(I-A2 재선택). 모두 1회 재시도로 통과. relation 문장과 직접 관련 없는 계약이며 표본이 작아 원인 미확정.
- READING 정규화 작동 0건(이 18세션에 오답 READING+INSUFFICIENT 조합 없음).
- 정답 선택 SUPPORTED 아님 5(CT·CP 모두 UNKNOWN), v5.3과 같다.

## 해석

- v5.6과 정규화는 회귀 18세션의 역할별 결과를 바꾸지 않았다. 바뀐 1건은 v5.1 경로로의 복귀다.
- 재시도 증가(1→5)는 관찰 항목. 늘어난 종류(CONTRADICTED 오류 누락)는 근거 판정 쪽 계약이다.
