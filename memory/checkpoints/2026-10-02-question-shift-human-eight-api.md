---
date: 2026-10-02
scope: question-shift-human-boundary-eight
base_commit: uncommitted
---

# 사용자 경계8문단과 이전/현재 프롬프트 비교

## 새로 확인된 것

- 사용자는 `docs/review/single-axis-eight-boundary-marking-2026-10-02.md`의 마킹을 완료했다고 명시했다. `/` 경계를 해석하고 미검토 라벨보다 사용자 완료 메시지를 우선했다. 원문 정합 검사 뒤 사전 snapshot을 동결했다.
- 사람은7문단3청크·공손룡5는4청크, 총17경계로 나눴다. 이를 API에 제공하지 않고 이전/현재 요청을 각문단1회씩 실행했다. 총16성공·SDK재시도0, 두 조건 모두 원문 복원8/8.
- 이전 완전 일치3/8·경계F1 66.7%, 현재1/8·61.1%. 양쪽 사람17경계중11일치, 추가 경계 이전5/현재8. 축 개수 일치와 위치 일치를 구분했다.
- 현재 mRNA5·도파민3·공손룡3은 앞선 동일프롬프트 단회 결과와 개수 또는 경계가 달랐다. 단회 비교의 인과효과·반복 안정성을 확정하지 않는다.
- 사용자는 일부 선행 결과를 본 뒤 마킹했다. 개인 기준 대조이지 독립 블라인드 심사나 학생 효과 검증이 아니다. 이번 비교는 경계 위치이며 축 문장의 의미 정확도 전체 심사가 아니다.
- 근거: `docs/experiments/question-shift-human-eight-2026-10-02/REVIEW.md`, `human-marking-snapshot.md`, `items.json`, `requests.json`, `comparison.json`, `summary.json`(동일 디렉터리).

## 결정된 것

- 기존/현재 프롬프트·새 골드의 운영 채택 없음. 사용자 mRNA 단회 수용을8문단 일반 승인으로 확대하지 않는다.

## 변경한 것

- `scripts/test-question-shift-human-eight.mjs`와 실험 산출물·사람 비교 보고서 추가. 기존 골드·UI·마킹 원본 유지.

## 미해결

- Q-0031: 중심 질문의 추상 수준이 미정이다. 과결합과 과분해가 함께 남는다.

## 다음 행동

- 사용자 마킹과 생성 경계의 불일치를 검토해 다음 후보의 중심 질문 수준을 정한다.

## 근거

- `docs/experiments/question-shift-human-eight-2026-10-02/REVIEW.md`
- `scripts/test-question-shift-human-eight.mjs`
