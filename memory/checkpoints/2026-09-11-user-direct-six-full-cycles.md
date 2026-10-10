# 사용자 직접 6지문 전 구간 사용 기록

- 날짜: 2026-09-11 KST
- 성격: 실사용 관찰 자료 정리

## 범위

- 프로젝트 사용자가 학생 역할로 학생용 UI에서 연결 가능한 6개 지문을 모두 수행했다.
- 총 30개 문단의 자유 응답과 연결 문항 6개가 완료됐다.
- 외부 학생 표본이나 학습 효과 실험이 아니라 제품 흐름을 직접 사용한 1인 자기 테스트다.

## 원기록 기반 집계

- 문단 최종 PASS: 30/30
- 최초 응답 즉시 PASS: 20/30
- 문단 후속 질문: 13회
- 중간 비통과 판정: UNCLEAR 12회, ERROR 1회
- 문단 평가 호출: 43회
- 문제 최종 정답: 6/6
- 문제 첫 선택 정답: 5/6
- 문제 재선택 정답: 1/6
- 문제 최종 근거 판정: SUPPORTED 5건, UNCERTAIN 1건
- 문제 평가 호출: 9회
- 정답 공개: 0건

## 산출물과 출처

- 웹앱 검토 패킷:
  `docs/experiments/user-direct-full-cycle-six-2026-09-11/REVIEW-PACKET.md`
- 생성 스크립트: `scripts/build-actual-student-cycle-review.mjs`
- 문단 원기록: `.omc/logs/dialogue-experiment/sessions.jsonl`
- 문제 원기록: `.omc/logs/problem-solving/sessions.jsonl`
- 원문: `packages/pipeline/fixtures/experiments/dialogue/passages/*.json`
- 문항: `packages/pipeline/fixtures/experiments/problem-solving/public/*.json`

## 해석 제한

- 현재 결과는 질문을 이해할 수 있는 프로젝트 사용자의 직접 테스트다.
- 실제 학생의 회피·오개념·부분 수정에서의 회복률과 도움 없는 전이는 여전히 확인되지 않았다.
- `Q-0009`는 닫지 않는다.
