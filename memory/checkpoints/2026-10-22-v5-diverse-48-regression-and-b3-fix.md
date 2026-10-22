# v5 48세션 회귀·B3 선택 충돌 인용 수정 (2026-10-22)

## 바뀐 것

- D-0156·D-0157·D-0159·D-0161 반영 뒤 10-12 사례 48개 회귀([인계](../../docs/handoffs/2026-10-22-v5-diverse-48-regression.md),
  [판정 기록](../../docs/experiments/v5-diverse-48-regression-2026-10-22/REVIEW.md)). 147회 약 $1.98. 역할별 최종 결과는 10-12와 같다.
  A2 정답 재선택 6/6 SUPPORTED, CT·CP 12개 근거 미확인.
- 발견: B3 선택 충돌 항목 인용이 D-0157 겹침 검사에 걸려 교정 판정이 막힘(6/6), G-B3는 잘못된 교정 실패 피드백. 사용자 "1번 수정 진행" →
  [D-0164](../decisions/D-0164-selection-mismatch-quote-allowed-as-sufficiency.md). B3 재확인([보고](../../docs/experiments/v5-diverse-48-b3-recheck-2026-10-22/REPORT-b3-recheck-human.md))
  재시도 0·6/6 RESELECTION_WRONG, 30회 약 $0.59.
- S-A3 진술 모순(오류 3개 중 모순과 무관한 명시 오류도 버려짐): 사용자 "모순이 하나만 있어도 판정 안함 유지" → D-0156 변경 없음.
- 시험: 파이프라인 410/410, npm test 1344 통과·2 실패(기존), 빌드 통과.

## 다음

- 실행기 `draft()` A2 정답 재선택 키(`id.split('-')[1]`)가 `C-A2` 형식 id에서 실패한다. 미수정.
- 재확인 1차에서 sol 상한을 세션당 호출 수보다 적게 잡았다(20 < 24). 다음 상한은 세션당 호출 수 × 세션 수로 계산한다.
