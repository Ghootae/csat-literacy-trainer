---
date: 2026-11-10
scope: sns-diagnostic-grade-bar
base_commit: d342a5da
---

# 체크포인트: 진단 등급 띠 위 확률 곡선(D-0225)

- 세트 결과의 전국 분포 곡선과 전국 비율 문장을 없애고, 지문 결과·세트 결과의 큰 등급 띠 위에 등급별 확률 선을 그렸다(`GradeBar.tsx`, `logic.ts` `gradeCurvePath`).
- D-0222 2번은 사용자 답을 잘못 옮긴 것으로 정정, D-0225로 대체.
- Playwright 진단 시험은 사용자의 5173 개발 서버를 재사용하면 실제 서버로 요청이 가서 실패한다. `PLAYWRIGHT_CLIENT_PORT=5393 CSAT_API_PORT=5374`로 따로 띄우면 통과.
- 남은 관찰: 코사인 잇기로 곡선 등급 가운데에 작은 턱이 보인다(D-0225 다시 볼 조건).
