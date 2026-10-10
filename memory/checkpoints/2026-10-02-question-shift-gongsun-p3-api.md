---
date: 2026-10-02
scope: question-shift-gongsun-p3-comparison
base_commit: uncommitted
---

# 공손룡3 이전/현재 프롬프트 단회 비교

## 새로 확인된 것

- 사용자 동일 테스트 요청으로 이전/현재 프롬프트를 각1회 호출했다. 모델 gpt-5.6-terra medium, 성공2회·재시도0.
- 이전4축(주장 / 형체·색 근거 / 요구 대상 근거 / 용법 구분), 현재3축(주장 / 두 근거 통합 / 용법 구분). “또한…” 앞 경계 유무가 달랐다. 공백 제외 원문 복원 모두 통과.
- 현재 두 번째 축 문장의 학설 귀속 생략을 Codex 검토 사항으로 남겼다. 이는 사람 심사 결과가 아니다.
- 근거: `docs/experiments/question-shift-gongsun-p3-2026-10-02/REVIEW.md`, `requests.json`, `previous-response.json`, `current-response.json`, `audit.json`(동일 디렉터리).

## 결정된 것

- 축 수/프롬프트 효과/운영 승격 결정 없음.

## 변경한 것

- `scripts/test-question-shift-gongsun-p3.mjs` 및 실험 기록 추가. 기존 골드·UI 유지.

## 미해결

- Q-0031 유지. 단회 비교이며 최적 경계·귀속 보존·반복 안정성은 미검증.

## 다음 행동

- 실제 축과 경계를 사용자 검토한다.

## 근거

- `docs/experiments/question-shift-gongsun-p3-2026-10-02/REVIEW.md`
