---
id: D-0090
status: accepted
date: 2026-10-07
scope: problem-evaluator-version-naming
supersedes: none
---

# 문제 풀이 판정기 운영 후보를 v5로 부름

## 결정

사용자 결정(2026-10-07)에 따라 문제 풀이 판정기 버전을 대화와 문서에서 다음처럼 부른다.

| 이름 | 가리키는 것 | 상태 |
|---|---|---|
| v3 | `packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-prompt-v3.md` | 학생용 운영 기본값([D-0008](./D-0008-problem-dialogue-v3-operational-default.md)). 기호 해석본 실험의 기준선 |
| v4 | `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4.md`를 쓰는 구현 | 개발자 UI에 연결된 상태로 남지만 운영 후보로 사용하지 않는다 |
| **v5** | 지금까지 'v3 기반 v4 후보'로 부른 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4-v3-based-candidate.md` (SHA-256 `98d36119a84d612fbb0b1a20553a49df2170633e1a78470f632b0b24ee7ec2b2`, [D-0070](./D-0070-v3-based-problem-prompt-draft-review.md)·[D-0072](./D-0072-v3-based-problem-candidate-accepted-test-requested.md)) | 실제 운영 후보 |

v5는 v4의 정책([D-0059](./D-0059-problem-feedback-clarifications-consolidated.md))·스키마·서버 상태 머신
(`packages/pipeline/src/problem-solving/feedback-v4.ts`, `feedback-v4-evaluator.ts`)을 공유하고 판정 프롬프트만
v3 의미 지침 기반으로 바꾼 것이다(`scripts/test-problem-v3-based-v4-smoke.mjs`가 이 프롬프트를 v4 세션 코드에 연결해 시험).

## 범위

- 명칭 변경은 대화와 앞으로 쓰는 문서에만 적용한다. 파일명, 코드 식별자, 경로(`/problem/dev/v4` 등), schemaVersion,
  기존 실험 폴더 이름은 바꾸지 않는다.
- 과거 결정·체크포인트·보고서의 'v4', 'v3 기반 v4 후보' 표기는 당시 이력으로 두고 고치지 않는다.
- 사용자는 v4를 운영 후보로 쓰지 않겠다고 밝혔다. 개발자 UI 연결 해제나 코드 삭제는 결정하지 않았다.
- 문단 이해 판정기의 V4(`axis-dialogue-selective-v4` 등)는 다른 계열이며 이 명칭과 무관하다.

## 근거

- 사용자 '일단 v4는 사용할 생각이 없어. v3 기반 v4이 실제 운영 후보야. 그런데 명칭이 어려우니까 명칭을 간단하게 정리하자.',
  'v5로 하자. 범위는 대화와 문서만.' (2026-10-07).
