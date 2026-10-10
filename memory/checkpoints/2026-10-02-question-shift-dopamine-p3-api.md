---
date: 2026-10-02
scope: question-shift-dopamine-p3-comparison
base_commit: uncommitted
---

# 도파민3 중심 질문 전환 프롬프트 단회 비교

## 새로 확인된 것

- 사용자 요청으로 보조 지시 포함 이전 프롬프트와 두 지시 삭제 현재 프롬프트를 도파민3 원문에 각1회 호출했다. gpt-5.6-terra medium·SDK 재시도0·성공2회다.
- 둘 다3축(전체 구조 / 직접 경로 / 간접 경로). 가바성 뉴런 문장의 소속은 이전 첫청크, 현재 직접 경로 청크로 달랐다. 공백 제외 원문 복원은 양쪽 통과.
- 근거: `docs/experiments/question-shift-dopamine-p3-2026-10-02/REVIEW.md`, `requests.json`, `previous-response.json`, `current-response.json`, `audit.json`(동일 디렉터리).

## 결정된 것

- 축 채택·프롬프트 효과·반복 안정성의 승인 없음.

## 변경한 것

- `scripts/test-question-shift-dopamine-p3.mjs`와 실험 기록을 추가했다. 기존 골드·UI 유지.

## 미해결

- Q-0031 유지. 도입부 독립 축과 가바성 뉴런 문장 소속의 적절성은 사람 검토 필요.

## 다음 행동

- 오른쪽 비교 문서에서 실제 축과 경계를 사용자 검토한다.

## 근거

- `docs/experiments/question-shift-dopamine-p3-2026-10-02/REVIEW.md`
