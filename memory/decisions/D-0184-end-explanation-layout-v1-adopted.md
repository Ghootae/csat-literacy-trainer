---
id: D-0184
status: accepted
date: 2026-10-28
scope: problem-feedback-end-explanation
supersedes: none
---

# 마지막 설명(M4)을 칸 유형 레이아웃 v1(판정기 진단 글 + 유형별 순서)으로 바꾼다

## 결정

사용자 결정(2026-10-28, "새 레이아웃 채택 후 결정 기록."). 설계 방향은 사용자 제안("판정기에서 1차로 판정 결과와 문제점을 알리는 글을 작성하고, 2차로 피드백 생성기에선 최소화된 규칙으로 자연스러운 피드백을 생성")과 보완("타입별 글의 전체적 레이아웃 정도의 규칙은 전달", "덜 압축적으로 풀어서 차근차근, 분량이 느는 건 상관없어"), 학생 말 풀어 말하기(보강안 B, "두 안에 모두 동의")다.

- 문제 판정 운영 후보(v5)의 M4 기본값을 `END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS`(정답·오답 공통 한 벌)로 바꾼다. `OpenAIFeedbackEvaluator`의 `endLayout` 기본값 `'layout-v1'`, `'v5.3'`은 옛 두 지시문(`CORRECT_END_INSTRUCTIONS`·`INCORRECT_END_INSTRUCTIONS`) 재현용으로 남긴다.
- M4 입력: `insufficiencyKind`·`insufficiencyCase`를 넘기지 않고 `sections.{firstChoice,reselection}`를 넘긴다. 칸마다 서버가 정한 `type`(ERROR·GAP·UNVERIFIABLE), `correctChoice`, `conclusionOnly`, `repair`(REPAIRED·NOT_REPAIRED·NOT_ASKED), 판정기 진단 `diagnosis`(M1 `reason`)·`judgmentNote`(M1 `judgment.contradiction`).
- 세션 요약 `readingSummary`에 `conclusionOnly`·`judgmentNote`를 더한다(optional, 옛 기록 통과).
- 지시문 내용: 근거 부족 여섯 경우 문단 → 유형별 순서(ERROR 5단계, GAP "맞은 것 → 빠진 것(선지의 말 인용)" + 결론 반복 예외, UNVERIFIABLE 정답/오답), [풀어 쓰기] 원칙, 학생 말은 그대로 옮기지 않고 풀어 말함, "확인되지 않아"·틀린 선지에 "맞는지" 금지. 설계 원문 `docs/experiments/end-explanation-layout-2026-10-28/PROMPT-DRAFT.md`.

## 이유

- v5.3 첫 칸 사용자 판정에서 결론 반복(KC)·연결 빠짐(K4-r1·K4-r3)이 "무엇이 빠졌는지" 말하지 못했다. KC 요청 추적 결과 두 경우 이름이 서로 다른 문단을 걸어 모델이 일반 규칙으로 물러났고, 판정기 `reason`의 정확한 진단은 M4에 전달되지 않았다.
- 저장 판정 재사용 12건 재생성(같은 모델·입력, 지시문·payload만 다름, 기본 payload 대조 12/12, $0.064): 사용자 판정 11/12 긍정(좋아짐·좋은 해설·acceptable). 남은 XS-r1은 판정기 선지 읽기 분류(STRONGER) 문제다.
- 근거: [실험 보고](../../docs/experiments/end-explanation-layout-2026-10-28/REPORT-desktop.md), [인계](../../docs/handoffs/2026-10-28-end-explanation-layout-v1.md).

## 재검토 조건

- 판단 방식 근거([D-0159](./D-0159-correct-unverified-judgment-method-note.md))의 전용 문단은 진단 글에 맡겼다. C-CT 1건은 사용자 "좋은 해설"이었으나, 다음 회귀나 실제 학생 자료에서 판단 방식을 맞는 근거처럼 인정하는 사례가 문제가 되면 GAP 1단계에 예외 한 줄을 되살린다.
- 오답 읽기 오류(ERROR+READING) 레이아웃은 실측하지 못했다. 다음 회귀에서 확인한다.
- 판정기 진단 글이 틀리면 설명도 따라 틀린다(XS-r1). 판정 쪽 보강(선지 읽기 관계 정의)으로 다룬다.

## 관련

- [D-0182](./D-0182-problem-feedback-v53-three-cell-adopted.md)(v5.3 판정), [D-0117](./D-0117-end-coaching-sectioned-sequence.md)(칸 구조), [D-0127](./D-0127-section-lead-sentence-fixed-by-code.md)(첫 문장 코드 고정), [D-0168](./D-0168-reuse-existing-data-in-comparison-experiments.md)(재활용).
