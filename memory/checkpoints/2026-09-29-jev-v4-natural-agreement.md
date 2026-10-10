# JEV–V4 자연 응답 일치도 shadow 완료

- V4 자연 응답 45건을 감사해 연결 MR의 `diagnosticRole`이 완전한 29건·50축을 1차 비교 표본으로 고정했다. 역할이 없는 16건·24축은 임의로 `required` 처리하지 않고 제외했다.
- JEV Playground 공개 평가 경로에 `TARGET_MR + 학생 원발화`로 200개 coverage/collision 센서를 49묶음 실행했다. 49/49 최종 성공, 왕복 중앙값 618ms, 모델 중앙값 168.4ms, 총 67,380토큰이다.
- V4 계약 유효 46축에서 required MR 최저 coverage의 PASS/non-PASS AUC는 0.670, collision 최고값의 non-PASS/PASS AUC는 0.445였다. PASS coverage 범위는 0.08–0.88로 넓었다.
- coverage 0.7·collision 0.2 shadow 조건은 5/46축만 자동 통과 후보로 골랐고 모두 V4 PASS였지만, 사람 비교는 1축뿐이라 임계값·자동 PASS 근거로 승격하지 않았다.
- 낮은 일치도의 핵심 혼입은 평가 계약 차이다. 현재 V4는 AX 설명만 통과 기준으로 사용하고 MR/role을 보지 않지만, JEV는 required MR 전체의 최솟값을 사용했다. N15는 AX 기준 PASS이나 AX 밖 목적을 담은 required MR11 때문에 JEV 0.08이었다.
- 유효 V4 ERROR N33의 대상 귀속 오류는 고정 MR의 직접 반대가 아니어서 collision 0.05로 미탐지됐다. 현재 collision은 V4 오류 안전망으로 승인하지 않는다.
- 운영 V4, 임계값, 자동 PASS, 학생용 배포는 변경하지 않았다.
- 근거: `docs/experiments/jev-v4-natural-agreement-v1-2026-09-29/REPORT.md`, `manifest.json`, `raw-results.jsonl`, `results.json`

