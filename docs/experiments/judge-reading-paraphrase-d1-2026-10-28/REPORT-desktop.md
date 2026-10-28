# 판정기 선지 읽기 관계 정의 보강(D1, v5.4) — Desktop 보고

날짜: 2026-10-28. 작성: 코드 에이전트. 인계: `docs/handoffs/2026-10-28-judge-reading-paraphrase-d1.md`.

## 변경

- `source-direct-problem-feedback-v5.4.md` = v5.3 + relation 정의 문단 끝 2줄:
  - "학생 읽기가 선지 말을 같은 뜻의 다른 말로 풀어 쓴 것이거나 선지 말에서 곧바로 따라 나오는 결과를 말한 것이면 EXACT다."
  - "WEAKER·STRONGER·ADDED는 그 차이 때문에 원문에 비춘 선지의 참·거짓 판단이 달라지거나, 학생의 반박·지지가 선지에는 통하지 않게 될 때만 쓴다."
- 판정기·실행기 경로 v5.4, metadata `promptVersion: problem-feedback-v5.4`. 빌드 통과, `npm test` 1447 통과·2 실패(기존).
- 커밋 전. 채택 결정 없음.

## 실행 조건

- 묶음 A `three-cell/`: `v53-three-cell-cases.mjs`, XS·XA×3(luna), WQ×3(sol), 첫 판정(정답 선택은 M4까지).
- 묶음 B `regression-gb3/`: `v5-diverse-48-regression-cases.mjs` G-B3×3(sol 첫 판정, 교정 판정 luna), 교정 답 "적절한 설명이에요."(10-27 회귀와 같은 답)까지.
- 비용 $0.396(A: luna $0.027 + sol $0.236, B: sol $0.127 + luna $0.006). sol 예약액 $0.186/건 때문에 묶음별 sol 상한을 0.25→0.30→0.35→0.40으로 단계 조정, 합계는 승인 상한 $0.6 안.

## 측정

| 사례 | 기대 | 결과 |
|---|---|---|
| XS×3 | relation EXACT | **STRONGER 3/3**. insufficiencyCase READING_GAP 3/3. r1·r2는 정답 선택인데 READING 오류도 출력 |
| XA×3 | ADDED 유지 | ADDED 3/3, READING_GAP 3/3 (r2 1회 형식 위반 후 재시도 성공) |
| WQ×3 | WEAKER READING 오류 유지 | r1·r2 ERROR/READING, relation EXACT·WEAKER. r3 "내용 오류 판정과 오류 목록 불일치" 3회 연속 → 중단 |
| G-B3×3 | REPAIRED 비율 측정 | REPAIRED 3/3(AWAITING_POST_REPAIR_CHOICE) |

XS M4 firstChoice:
- r1: "선지는 카르비도파가 도파민을 분해되지 않은 채 계속 남게 한다고 말하지 않아" — 읽기 차이를 앞세움(문제 유지).
- r2: 읽기 차이 언급 없이 "그 사실만으로는 … 작용 기간을 늘릴 수 있는지 알 수 없어 … 카르비도파가 흑질의 도파민에 어떤 영향을 주는지는 설명하지 않아" — 근거와 틀린 지점의 연결 부족을 짚음(바람직한 형태).
- r3: "'작용 기간을 연장'한다는 말은 도파민이 계속 남아 분해되지 않는다는 뜻까지 담고 있지는 않아" — 읽기 차이 유지, 내부 필드명 "answer에서" 노출.

## 해석

- 추가 문장의 둘째 절("학생의 반박·지지가 선지에는 통하지 않게 될 때")이 XS의 STRONGER를 오히려 정당화했다. 판정기 reason 3/3이 "재흡수된 도파민의 분해 사실만으로 작용 기간 연장을 반박할 수 없다"고 썼다. 이 판단 자체는 맞다(②가 틀린 진짜 이유는 <보기>의 "카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초에서만 작용"). 즉 XS의 실제 부족은 **근거–틀린 지점 연결(MISSING_LINK)**인데, relation이 "읽은 뜻"과 "반박이 통하는가"를 함께 판단하면서 그 부족이 읽기 차이(READING_GAP)로 표시된다.
- 사용자 판단("도파민이 남는다 ≈ 작용 기간 연장")과 판정기 판단(근거 부족)은 충돌하지 않는다. 읽기는 같고, 근거가 부족하다. 바른 설명은 r2 형태다.
- 과잉 인정 방지(XA)와 오답 읽기 오류(WQ)는 영향 없음. WQ-r3 형식 위반은 -b 실행에도 같은 위반 1회가 있어 v5.4 원인으로 보기 어렵다. 다만 3회 연속이라 재시도 피드백이 효과가 없는 경로일 수 있다(별건).
- G-B3: 10-27 회귀의 REMAINING 1건은 흔들림으로 보인다(이번 3/3 REPAIRED).

## 제안

1. 둘째 문장을 "읽은 뜻만으로" 기준으로 바꾼다: "relation은 학생 근거가 선지를 반박·지지하는지와 따로, 학생이 읽은 뜻이 선지 말과 같은지만으로 정한다. 근거가 선지에 닿지 않는 것은 judgment.holds와 contradiction에서 다룬다." 기대: XS EXACT → insufficiencyCase MISSING_LINK, M4가 r2 형태. 확인: XS×3·XA×3(luna, 약 $0.03). WQ는 sol 비용이 커서 첫 확인에서는 빼고, 채택 전 회귀에서 본다.
2. v5.4는 채택하지 않는다. 다음 문장은 v5.5 새 파일로 두고 v5.4는 이번 실험 재현용으로 남긴다.
3. 별건: WQ-r3 같은 형식 위반(INSUFFICIENT인데 READING 오류)은 서버 정규화로 흡수할 수 있는지 검토 대상(정답·오답 모두에서 READING 오류가 있으면 contentAssessment를 ERROR로 맞추는 것이 계약상 안전한지).

## 열린 질문

- XS-r1·r2는 정답 선택인데 READING 오류를 출력했다("정답 선택의 읽기 차이는 오류가 아니라 충족 판단에서 다룬다" 위반). 서버가 어떻게 처리했는지(insufficiencyCase READING_GAP으로 끝남) 추가 확인이 필요하다.

## 2차 (v5.5, 사용자 승인 "승인"·"진행해")

- 문장: 첫 문장 같음 + "relation은 학생 근거가 선지를 반박·지지하는지와 따로, 학생이 읽은 뜻이 선지 말과 같은지만으로 정한다. 근거가 선지에 닿지 않는 것은 judgment.holds와 contradiction에서 다룬다."
- 실행 `three-cell-v55/`: XS×3·XA×3(luna), $0.036(중단된 XS-r2 첫 요청 1건은 응답 전 사용자 중단으로 예약액 $0.0095를 비용으로 기록, 부분 기록은 `cases/XS-r2.records.interrupted.jsonl`). D1 누계 $0.432.

| 사례 | relation | 결과 |
|---|---|---|
| XS-r1 | ADDED | INSUFFICIENT. M4: "선지의 '효소의 작용을 억제하여'는 도파민을 분해하는 효소를 억제한다는 뜻이 아니야. (나)가 억제하는 효소는 레보도파를 도파민으로 바꾸는 효소야" |
| XS-r2 | ADDED | ERROR(READING+CONTENT "항상 분해된다" ↔ 원문 "저장되어 재사용되거나 분해") → 교정 질문 |
| XS-r3 | STRONGER | INSUFFICIENT. M4: "'작용 기간을 연장'한다는 말은 도파민이 계속 남아 분해되지 않는다는 뜻은 아니야"(1차와 같은 문제) |
| XA×3 | ADDED 3/3 | INSUFFICIENT 3/3 (r1 형식 위반 1회 후 성공) |

해석:
- EXACT 0/3. 1·2차 합쳐 판정기는 XS 6/6에서 읽기 차이를 찾았다. 2차의 이유는 1차와 다르다: "분해되지 않고 남는다"는 선지의 '효소'를 **분해 효소**로 특정한 읽기라 선지에 없는 내용을 보탰다(ADDED). 이 보탬은 ②의 실제 함정(카르비도파가 억제하는 것은 합성 효소)과 같은 지점이라 내용상 근거가 있다.
- 따라서 사용자 판단 "도파민이 남는다 ≈ 작용 기간 연장"은 '연장'과 '남는다'의 관계로는 맞지만, 학생 읽기에 들어간 "분해되지 않고"(어떤 효소인지)는 선지에 없다. 지시문 수준에서 EXACT로 바꾸는 것은 판정기 판단과 계속 부딪힌다.
- XS-r1 M4는 이 지점을 바로 짚어 1차의 억지("더 강한 뜻") 없이 실제 함정으로 연결했다. r3는 1차 문제 유지.

제안: D1 트랙 종료. v5.4·v5.5는 채택하지 않고 판정기 경로를 v5.3으로 되돌린다(파일은 재현용 보존). XS 기대값 주석도 원래대로 되돌리거나 "ADDED(분해 효소로 특정)"로 고친다 — 사용자 판단 필요.

## 3차 (v5.6, 사용자 승인 "진행")

- 변경: 84행 ADDED 정의 "선지에 없는 내용(원인·조건·방식 등)", ADDED vs STRONGER 경합 판단(추가 정보 vs 정도·범위·확실성, 둘 다면 ADDED), "같은 사태를 다른 말로 = 세진 것 아님", OTHER_TARGET 경계.
- 실행 `three-cell-v56/`: XS×5, XA×3, K4×3(luna), WQ×3, WR×3(sol). luna $0.045, sol $0.324, 합계 $0.369(상한 $0.6). WR-r3는 sol 상한(예약액)으로 미전송, WQ-r3·WR-r1·WR-r2는 형식 위반 재시도 중 상한 도달. D1 누계 $0.80.

| 사례 | 결과 | v5.3-b 대비 |
|---|---|---|
| XS×5 | **ADDED 5/5**. r1–r3 INSUFFICIENT, r4·r5 ERROR(READING+CONTENT "항상 분해") → 교정 질문 | v5.4 STRONGER 3/3, v5.5 ADDED 2·STRONGER 1 |
| XA×3 | ADDED 3/3 | 같음 |
| K4×3 | OTHER_TARGET 3/3, INSUFFICIENT 2·UNKNOWN 1 | v5.3-b도 UNTOUCHED·OTHER_TARGET·REVERSED 혼재, SUPPORTED 0. 결과 수준 같음(D-0182에서 K4 읽기 차이는 현재 동작 수용) |
| WQ×3 | WEAKER 3/3, READING 오류 r1·r2 성공. r3 형식 위반 2회 | 같은 방향 |
| WR×3 | REVERSED 유지, 그러나 r1 형식 위반 2회, r2·r3는 sol 상한으로 미전송(정정: 앞선 보고의 "r2 1회"는 틀림, r2는 RUN_LIMIT) | v5.3-b ERROR 3/3(형식 위반 0) |

XS M4: r1 "선지의 '효소의 작용을 억제하여'는 카르비도파가 어떤 효소에 작용하는지를 따져야 하는 말 … 카르비도파가 그 분해를 막는지에 관한 내용은 아니야"(좋음), r2 "네가 든 근거는 … 카르비도파가 흑질에서 어떤 작용을 하는지는 설명하지 않아"(좋음), r3 "'작용 기간을 연장'은 도파민이 계속 남는다는 뜻이 아니라 …"(말꼬리 잔존).

sol 형식 위반(오답 선택, READING 오류인데 contentAssessment INSUFFICIENT): WQ·WR 판정 시도 기준 v5.3-b 1/8, v5.4 2/4, v5.6 5/7.

해석:
- 판정기 분류는 목표대로 수렴했다(XS ADDED 5/5). 마지막 설명은 3건 중 2건이 말꼬리 없이 근거–판단 연결을 짚었다.
- 회귀 신호: 오답 읽기 오류에서 sol이 contentAssessment를 INSUFFICIENT로 두는 형식 위반이 v5.4부터 늘었다. v5.4·v5.5·v5.6 공통 추가 문장 중 "근거가 선지에 닿지 않는 것은 judgment.holds와 contradiction에서 다룬다"(v5.5부터)와 "반박·지지"(v5.4)가 오답의 읽기 차이를 '근거 부족' 쪽으로 끌어당긴 것으로 추정한다. 표본이 작아 확정은 아니다.
- XS-r4·r5의 CONTENT 오류("항상 분해된다" ↔ 원문 "저장되어 재사용되거나 분해")는 D1과 별개인 근거 엄격도 문제로, v5.5 1/3 → v5.6 2/5.
- K4 OTHER_TARGET 수렴은 새 경계 문장 영향으로 보이나 결과(근거 부족·판단 불가)는 v5.3과 같다.

제안:
1. 형식 위반 대응(둘 중 하나 또는 둘 다):
   a. 지시문: 둘째 문장 끝에 "오답 선택에서 읽기 차이가 드러나면 위 선지 읽기 오류 규칙에 따라 READING 오류를 만들고 contentAssessment는 ERROR다." 확인 WQ×3·WR×3(sol, 약 $0.3).
   b. 서버 정규화: 오답 선택에서 READING 오류가 있으면 contentAssessment를 ERROR로 맞춘다(계약 변경, D-0182 정규화 방식과 같은 위치). 외부 호출 없이 저장 출력으로 검증 가능.
2. v5.6 채택은 1 해결 뒤 회귀(18세션)로 판단.
3. 별건 기록: XS CONTENT 엄격도("…된다"를 "항상"으로 읽음).

## 4차: 서버 정규화 (사용자 승인 "승인")

- `normalizeCells`: 오답 선택·RECONSTRUCTABLE·READING 오류가 있고 contentAssessment가 ERROR가 아니면 ERROR·insufficiencyKind NONE으로 맞춘다(note `contentAssessment set to ERROR: READING error on a wrong choice`). 정답 선택의 READING 오류 제거 규칙의 대칭.
- 단위 테스트 3건 추가. `npm test` 1451 통과·2 실패(기존).
- 저장 출력 재검증(`scripts/replay-reading-error-normalization.mjs`, 외부 호출 0, replay transport로 실제 평가 경로 통과): 형식 위반 시도 9건(v5.6 5, v5.4 3, v5.3-b 1) 모두 통과, 결과 `REPLAY-normalization.json`.

## 회귀 (v5.6 + 정규화, 사용자 승인 "회귀 승인")

`docs/experiments/v5-diverse-48-regression-2026-10-28-v56/REPORT-desktop.md`. 역할별 결과 8/8 v5.3과 같음, 경로 변화 G-B3 1건(v5.1 경로 복귀), 형식 재시도 1→5(모두 1회 재시도로 통과), $0.970. D1 누계 $1.77.

제안: v5.6 + 오답 READING 정규화를 운영 후보로 채택(결정 기록 D-0185), 커밋. 관찰: 형식 재시도(CONTRADICTED 오류 누락), XS CONTENT 엄격도("항상").
