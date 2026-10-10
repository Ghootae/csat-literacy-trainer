# 축 2차 필터와 6문단 비교 준비

- `axis-core-filter-v1` 구현: 학생 응답 없는 allowlist 입력, 축 ID/순서/원문 인용 검증,
  description만 치환한 별도 골드와 해시 계보 반환. 의미 보존 자체는 코드 검증 범위 밖.
- 6문단 25응답 조건(기존 민감 5문단 + 실제 공손룡 1문단), 50평가 비교 준비.
- 1차 생성 재실행·변경 없음. 기존 생성/평가/질문 프롬프트와 상태 전이 코드 해시 고정.
- 필터 신규 12테스트 포함 209테스트·build 통과. 실 API 명령은 전송·과금 명시 승인 부족으로
  자동 검토 차단되어 호출 0. 승인 후 동일 실행기로 재개; 로컬 비용 추정 상한 USD2.
- 출처: `docs/experiments/axis-core-filter-six-2026-09-20/STATUS.md`,
  `docs/experiments/axis-core-filter-six-2026-09-20/manifest.json`,
  `scripts/test-axis-core-filter-six.mjs`.
- 운영 골드 승격·서버 재시작 없음. [D-0017](../decisions/D-0017-axis-core-filter-experiment.md).
