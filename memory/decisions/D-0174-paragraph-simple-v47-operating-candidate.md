---
id: D-0174
status: accepted
date: 2026-10-25
scope: paragraph-summary-operating-candidate
supersedes: none
---

# 문단 요약 운영 후보: 단순 형식 v4.7(luna), 개발자 주소 `/dialogue/lab`

## 결정

- 문단 요약의 운영 후보를 **단순 형식 v4.7**(지시문 `paragraph-simple-holistic-prompt-v4.7.md`, 판정 모델 luna)로 확정한다. 근본 검토([D-0138](./D-0138-paragraph-fundamental-review-question-quality-first.md))는 이 결정으로 끝난다.
- 위치는 문제 풀이 v5와 같다. 개발자 경로를 기준으로 삼고, 학생용 `/dialogue`(축 기반 V4, [D-0013](./D-0013-paragraph-optional-revision-v4.md))는 이번에 바꾸지 않는다. 학생용 전환은 별도 결정이다.
- 개발자 주소 `/dialogue/dev/simple` → `/dialogue/lab`. 옛 주소는 쿼리를 유지한 채 새 주소로 넘기고, 돌아갈 곳(`returnTo`)으로도 계속 받는다. 문제 화면에서 돌아갈 곳이 잘못됐을 때의 기본값도 `/dialogue/lab`.
- 판정 모델 코드 기본값 `gpt-5.6-terra` → `gpt-6-luna`(`PARAGRAPH_SIMPLE_DEFAULT_MODEL`). 환경변수 `PARAGRAPH_SIMPLE_OPENAI_MODEL`로만 바꾼다.
- 코드 이름에는 이미 버전이 없다([D-0173](./D-0173-problem-lab-version-free-code-names.md) 원칙과 같음). API 접두 `/api/developer/dialogue-simple/`와 기록 `schemaVersion 'dialogue-simple-holistic-record-v2'`는 그대로 둔다.

## 근거

- 사용자(2026-10-25): "문단 요약은 단순 형식으로 결정." 코드 에이전트가 "근본 검토를 끝내고 운영 후보를 단순 형식 v4.7(luna)로 확정, 개발자 경로 기준, 학생용 전환은 나중"으로 정리해 확인을 구하자 "응, 맞아".
- 코드 확인: 화면 `/dialogue/dev/simple`은 v4.7 지시문을 읽는다(`packages/pipeline/src/paragraph-simple/evaluator.ts:65`). 실행 중 서버는 환경변수로 luna였으나 코드 기본값은 terra라, 환경변수를 빠뜨리면 조용히 모델이 바뀌었다.
- 코드 에이전트가 주소 `/dialogue/lab`과 기본 모델 luna 고정을 권했고 사용자가 "권한 대로 진행해줘".

## 영향

- 축 기반 쪽은 **단순 형식 채택으로 보류**한다(사용자 2026-10-25, 코드 에이전트가 보류 표시·폐기·미정 세 안 중 보류 표시를 권하자 "A로 결정"). 축 기반 개발자 화면 `/dialogue/dev`는 학생용이 아직 V4라 코드를 그대로 두고, 보여 주기 개발자 모드(D-0134~D-0137)와 [Q-0036](../OPEN_QUESTIONS.md)은 진행하지 않는다. 폐기 여부는 학생용 전환을 결정할 때 함께 정한다.
- 작동 순서 문서: [`docs/PARAGRAPH-LAB-FLOW-2026-10-25.md`](../../docs/PARAGRAPH-LAB-FLOW-2026-10-25.md).
