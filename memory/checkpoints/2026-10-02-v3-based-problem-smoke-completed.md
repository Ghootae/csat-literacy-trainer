---
date: 2026-10-02
scope: problem-v3-based-v4-smoke-results
base_commit: uncommitted
---

# v3 기반 문제 후보 실모델 시험 완료

- 사용자 외부 전송 승인 D-0074로 준비 시점의 차단이 해소됐다. 고정 입력·후보 해시를 유지하고 18요청을 실행했다. 과거 단가 추정$0.2261228, 미확정 예약0.
- 후보 최초10평가 중8평가가 사전 필드와 일치했다. 공손룡 실제 응답은2/3 SUPPORTED,1/3 ERROR로 표현 차이를 과잉 교정했다. 반대로 d/e 지시 대상을 뒤집은 명시적 오류는 SUPPORTED로 과수용했다.
- 기존 v4 대조1회도 정상 통과해 개선 입증은 아니다. 후보의 모든 판정은 재시도 후 계약 유효하나, 표면 장력 실행 오류 사례는 첫 원문 증거 누락을 자동 재시도1회로 복구했다. 선택 결론 감사1회 포함.
- 정보 비대칭 실제 수정/단순 동의·표면 장력 수정 후속3경로는 기대 종료했다. 공손룡 교정1경로는 최초 오류 미검출로 진입 불가·후속 호출0이다. 교정 판정 실패와 미검증을 구분한다.
- 경로 일치와 별개로 정보 비대칭 수정의 충분성 이유에 다른 선지 전체 판단 요구가 관측됐다. 표면 장력 미공개 코칭에는 인과 방향 역전이 있었다. 학생에게 노출된 코칭 오류로 집계하지 않는다.
- 후보 추가 수정·제품/UI 연결 변경·재시작 없음. 다음 행동은 남은 내용 판정 경계와 충분성 범위의 검토이며, 자동 수정이나 운영 승격을 하지 않는다.

출처: `docs/experiments/problem-v3-based-v4-smoke-2026-10-02/REPORT.md`, `RESULTS.json`,
같은 디렉터리 `initial/candidate-G-actual-r3.json`, `initial/candidate-G-error-r1.json`,
`initial/baseline-G-actual-r1.json`, `initial/candidate-S3-r1.json`,
`cycles/I1-repair.json`, `cycles/I1-assent.json`, `cycles/S2-repair.json`, `cycles/G-repair.json`,
`requests.jsonl` 및 `scripts/test-problem-v3-based-v4-smoke.mjs`.
