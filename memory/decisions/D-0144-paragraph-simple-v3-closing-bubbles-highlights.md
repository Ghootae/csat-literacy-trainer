---
id: D-0144
status: accepted
date: 2026-10-17
scope: paragraph-simple-holistic-dev-mode
supersedes: none
---

# 단순 형식 문단 개발자 모드 v3: 마무리 말풍선, 한 문장 표시, 구멍 일관성

## 결정

[D-0142](./D-0142-paragraph-simple-v2-restated-summary-attempts.md) v2를 쓰며 나온 사용 메모 1~5(`docs/review/simple-holistic-dev-ui-feedback-2026-10-16/README.md` "v2 사용 메모")를 프롬프트 v3와 화면에 반영한다. 흐름(행동 표)은 바꾸지 않는다.

- **문단 핵심 말풍선:** 모델이 쓰는 도입 문장(`coreIntro`, 판단임을 드러냄) 아래 옅은 배경 상자에 `coreSummary`. 응답 없음 마무리도 같은 형식(`message`가 도입).
- **오류 바로잡기:** 도입 → 오류마다 말풍선(학생 발화 인용 + `errors[].feedback`) → 문단 핵심으로 분리.
- **지문 표시 범위:** 근거를 가장 직접 담은 문장 하나 전체(v2의 여러 문장 인용을 대체).
- **표시 규칙:** 칭찬이 아닌 마무리면 항상 표시. 응답 없음은 `coreSourceQuote`로 표시. 질문 중 표시(사용자 원안)는 누출 우려로 보류.
  - (2026-10-25 추가) 교정 질문 중 표시는 [D-0175](./D-0175-paragraph-simple-correction-hint-during-question.md)로 채택됐다. 이 결정의 필드 이름 `coreIntro`·`coreSummary`는 v4.6에서 `corePartSummaries`·`closingFeedback`으로 바뀌었다([체크포인트](../checkpoints/2026-10-22-paragraph-simple-v46-dev-ui.md)).
- **빠진 내용 코멘트:** 학생 답에 없는 핵심 하나만 판단임을 드러내며 짚고 빠졌다고 말한다. 이미 말한 내용은 다시 들려주지 않는다. 골드가 없으므로 질문 때 고른 구멍(`targetGap`)을 답 판정 입력에 넘겨 같은 구멍을 짚게 한다(좁히기 허용, 옮기기 금지).

## 근거

사용자 지시(2026-10-16~17, 대화): 메모 1~5와 각 확인 답변, "나머지 수정 사항도 구현".

## 범위 밖

메모 6(이미 말한 관계를 구멍으로 판정)은 판정 모델을 gpt-6-luna로 바꿔 관찰 중이며 프롬프트 v2.1 수정은 재발 시 적용한다(사용자 승인, 2026-10-16).

## 구현

프롬프트 `packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v3.md`, 인계 `docs/handoffs/2026-10-17-paragraph-simple-holistic-v3.md`.
