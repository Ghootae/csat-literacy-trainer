# 문제 풀이 MVP 첫 결정

기준일: 2026-08-26

## 1. 첫 실험 문항

첫 수직 슬라이스는 `dopamine-motor-control-q13`으로 고정한다.

- 출처: 고3 2026년 3월 교육청 모의평가 국어 13번
- 유형: 파킨슨병 치료 약물에 대한 보기 적용, 복합 추론, 부정 발문
- 선택 이유: 문단 사실 인출만으로 풀리지 않고, 보기의 약물별 작용 위치와 지문의 혈액-뇌 장벽·도파민 합성 관계를 결합해야 한다. 내용 표상, 보기 표상, 조건 적용, 추론 변환, 선지 판단, 발문 극성을 한 문항에서 구별할 수 있다.
- 정답: 2번. 현재 fixture는 스키마와 기준 경로를 구현하기 위한 `candidate`이며 사람 검토 뒤에만 `human_reviewed`로 승격한다.

원문은 기존 로컬 정본 `69c28579d58cf540a9bc25eb`에서 가져온다. 문항 fixture는 `packages/pipeline/fixtures/experiments/problem-solving/dopamine-motor-control-q13.json`에 둔다.

## 2. 최소 골드 경계

문단 요약 골드를 확장하지 않는다. 문제 풀이 골드는 다음 두 층을 별도로 가진다.

1. `PassageDetailGold`: 명제 ID, 문단 ID, 극성, 조건, 예외, 범위, 원문 근거
2. `ProblemQuestionGold`: 출제 출처, 발문 극성, 보기 사실, 선지별 참·거짓과 근거, 정답 기준 경로, 대표 오답 경로 후보

선지와 기준 경로는 문단·명제·관계 ID를 함께 참조한다. 대표 오답 경로는 열린 후보이며 실제 학생 경로를 제한하지 않는다.

## 3. 소유 패키지와 세션 경계

`ParagraphUnderstandingHandoff`는 어느 한 하위 엔진의 내부 타입이 아니다. 두 엔진이 공유하는 경계이므로 `packages/pipeline/src/learning-session/handoff.ts`가 소유한다.

문제 풀이 골드와 이후 evaluator/session은 `packages/pipeline/src/problem-solving/`이 소유한다. 앱 서버는 최종적으로 다음 집계를 소유한다.

```text
LearningSession
  ├─ ParagraphDialogueSession[]
  ├─ ParagraphUnderstandingHandoff
  └─ ProblemSolvingSession
       └─ ProblemDiagnosticEpisode[]
```

클라이언트 DTO는 `packages/app/src/shared/contract.ts`에 별도로 두며 모델 내부 표상을 그대로 노출하지 않는다. 현재 인메모리 `DialogueController`를 별도 앱으로 복제하지 않고, 후속 단계에서 상위 `LearningSessionController`로 확장한다.

## 4. 현재 구현 범위

- 완료 세션과 미시도 문단을 handoff로 바꾸는 순수 변환 함수
- PASS, UNRESOLVED, NOT_ATTEMPTED 및 관계 교정 궤적 테스트
- 질문 문장이 학생 근거로 새로 승격되지 않는 회귀 테스트
- 첫 실제 문항의 상세 골드·문항 골드 후보와 구조 검증

다음 단계는 학생 선택·근거를 관찰로 저장하고, 사고 경로 가설과 네 가지 충분성 판정을 추론 층에 별도로 저장하는 evaluator/session 수직 슬라이스다.
