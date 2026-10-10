---
date: 2026-10-02
scope: offline-axis-candidate-jev-pilot
base_commit: uncommitted
---

# 8문단 고정2/3/4축 후보 + JEV5회 선택 완료

## 새로 확인된 것

- 사용자 명시 승인 범위로 새 설명 과제 프롬프트를 사용해 문단당3회, 한 호출마다2/3/4축을 모두 생성했다. OpenAI24성공·72분할·원문 복원 통과, 경계 중복 제거33후보다. 같은 경계의 축 문구 variants는 보존하고 첫 문구로 평가했다.
- JEV45성공 요청·후보별5회·165score 관측. 후보 순서/라벨/일부 배치를 회전했다. 초기10성공 뒤429를 보존,60초 이상 대기 후7초 간격으로 남은 요청을 재개했다. 총HTTP46시도·SDK재시도0.
- 평균 선택8문단 중 사람exact3/8·경계microF1 75.7%. 사람과exact한 후보가 있었던3문단(법인5·도파민3·도파민4)은 모두 선택됐다. 나머지5문단은 exact 후보 미생성. 후보군 내 사람F1 최선 선택6/8.
- 각회1위집합이5회 모두 같았던 문단3/8. 한 회 제외 평균1위가5경우 모두 유지된 문단7/8. 도파민3 평균gap0.056/4점·한회제외 선택 변동. 같은후보군 단회microF1 68.6~83.9%(동률로 분모 차이)로 평균이 항상 단회보다 좋은 것은 아니다.
- 입력/출력 토큰: OpenAI16,413/37,041, JEV153,015/2,490. 청구 금액 확정 없음.
- 경계 비교이며 축 문장 전체 의미 심사·학생 효과·독립 블라인드 사람심사는 아니다. 앞선 직접 생성 대조와 여러 요인이 바뀌어 JEV 반복 단독 효과를 확정하지 않는다.
- 근거: `docs/experiments/axis-candidate-jev-eight-2026-10-02/REVIEW.md`, `analysis.json`, `candidate-pool.json`, `final-audit.json`(동일 디렉터리).

## 결정된 것

- D-0066으로 사용자 승인 오프라인 시험만 재개했다. D-0036의 JEV 제품 적용 보류는 유지한다. 산출물/새 골드/평가기 운영 승격 없음.

## 변경한 것

- 생성/평가 스크립트 `scripts/test-axis-candidate-jev-eight.mjs`, 분석 `scripts/analyze-axis-candidate-jev-eight.mjs`와 실험 기록 추가.
- 결과 요약과 선택된 축·사람 경계 비교를 `docs/experiments/axis-candidate-jev-eight-2026-10-02/SUMMARY.md`로 열었다. 기존 골드·UI·마킹 원본 유지.

## 미해결

- Q-0031: 사람 기준 후보 미생성5문단, 평균 선택의 안정화와 기준 일치의 구별, 축 문구가 점수에 미치는 영향.
- JEV의 순수 동일요청 반복과 순서/배치 민감도를 분리해 측정하지 않았다.

## 다음 행동

- 사용자와 선택 결과를 검토하고, 후보 생성의 설명 과제 수준을 더 명확히 할지 정한다. 자동 추가 호출 없음.

## 근거

- `docs/experiments/axis-candidate-jev-eight-2026-10-02/PLAN.md`
- `docs/experiments/axis-candidate-jev-eight-2026-10-02/SUMMARY.md`
- `memory/decisions/D-0066-offline-axis-candidate-jev-pilot.md`
