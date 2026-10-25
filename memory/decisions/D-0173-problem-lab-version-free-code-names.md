---
id: D-0173
status: accepted
date: 2026-10-24
scope: problem-feedback-dev-naming
supersedes: none
---

# 개발자 문제 풀이 경로: 코드 이름에서 버전을 빼고 주소는 `/problem/lab`

## 결정

운영 후보 v5([D-0090](./D-0090-problem-evaluator-v5-naming.md))를 돌리는 개발자 문제 풀이 경로의 코드 이름에서 버전 번호를 뺀다.

- 화면 주소 `/problem/dev/v4` → `/problem/lab`. 옛 주소는 새 주소로 넘긴다.
- 파일·타입·함수·API 경로·환경변수 이름에서 `v4`·`v5`를 뺀다. 옛 환경변수 이름과 옛 API 경로는 호환용으로 받는다.
- 버전은 프롬프트 파일 이름(`source-direct-problem-feedback-v5.md`)과 기록되는 `promptVersion`에만 둔다.
- 저장 자료 호환을 위해 이미 기록된 값(세션 `version: 'problem-feedback-v4'`, 기록 `schemaVersion: 'problem-feedback-v4-record-v1'`, 로그 경로 `.omc/logs/problem-feedback-v4/`)은 바꾸지 않는다.
- 이번 정리는 개발자 경로만 대상으로 한다. 학생용 `/problem`(v3)과 옛 지시문 파일은 손대지 않는다.

## 근거

- 코드 에이전트 조사(2026-10-24): 개발자 경로는 지시문 v5·luna/sol 라우팅으로 도는데, 주소·파일·타입·화면 문구는 v4로 남아 있었다.
- 코드 에이전트가 세 방안(문서 대응표만 / 코드 v5로 개명 / 코드에서 버전 제거)을 제시하고 버전 제거를 권했다. 버전은 프롬프트가 바뀔 때마다 오르므로 코드 이름에 두면 같은 불일치가 되풀이된다.
- 사용자 결정: "C로 하고 주소는 /problem/lab으로 해줘". 학생용은 "개발자용에서 ui적인 부분만 걷어내거나 덧붙이면 되니까" 이번에 고려하지 않는다.

## 영향

- 실행 인계: [`docs/handoffs/2026-10-24-problem-lab-rename.md`](../../docs/handoffs/2026-10-24-problem-lab-rename.md).
- 판정·화면 동작은 바뀌지 않는다.
- 이후 기록과 안내에서 개발자 문제 화면은 `/problem/lab`으로 부른다.
