# 문제 풀이 워크트리 인수인계

기준일: 2026-08-26

기준 코드 커밋: `7f61ec0 docs(dialogue): record paragraph evaluation baseline`

권장 브랜치: `experiment/problem-solving-mvp`

권장 워크트리: `/Users/mac/Projects/csat-literacy-problem-solving-mvp`

이 문서를 커밋한 뒤 현재 HEAD에서 다음과 같이 후속 브랜치를 만든다.

```sh
git worktree add \
  -b experiment/problem-solving-mvp \
  /Users/mac/Projects/csat-literacy-problem-solving-mvp \
  HEAD
```

## 1. 새 워크트리의 성격

새 워크트리는 독립 프로젝트가 아니라 현재 문단 이해 대화 시스템을 포함하는 후속 통합 브랜치다. 문단 요약과 문제 풀이는 기능적으로 분리하지만, 문제 풀이기는 문단 요약에서 추정된 학생 표상을 입력으로 사용한다. 최종 결과물은 두 기능을 하나의 UI와 하나의 학습 세션 안에서 연결한 앱이다.

현재 `experiment/dialogue-mvp`는 문단 요약·판정 기준선을 보존한다. 새 브랜치는 이 기준선에서 분기하고, 문제 풀이 기능과 통합 UI는 새 브랜치에서 개발한다. 기존 브랜치를 복제해 별도 앱을 만드는 방식은 사용하지 않는다.

## 2. 현재 체크포인트

관련 커밋은 다음과 같다.

| 커밋 | 의미 |
|---|---|
| `cce3776` | 축 기반 판정 아키텍처 체크포인트 |
| `339a503` | 검토된 6개 중심축 골드 승격 |
| `0ab6056` | 실제 자유 응답의 축 기반 재실행 |
| `c475645` | 명시적 관계 오류가 누락보다 우선하도록 판정기 수정 |
| `7f61ec0` | 문단 분석·판정의 최종 합의 기준선 문서화 |

현재 체크포인트에서 타입 검사와 전체 테스트가 통과했다. 마지막 코드 변경 시 기준으로 49개 테스트 파일, 466개 테스트가 통과했다.

핵심 문서는 다음 두 개다.

- `docs/DIALOGUE-PARAGRAPH-BASELINE-2026-08-26.md`: 문단 요약 파트의 결정 과정과 현재 작동 방식
- `docs/dialogue-current-prompts-2026-08-26.md`: 현재 문단 분석 및 판정 프롬프트 전문

새 작업을 시작하기 전에 두 문서를 기준선으로 읽는다.

## 3. 고정된 문단 요약 파트

현재 런타임은 `axis-dialogue-v2`다.

문단 이해 골드는 다음 세 층을 가진다.

1. `centralStory`: 문단을 조직하는 중심 방향과 핵심 연결
2. `centralAxes`: 빠지면 중심 이야기가 훼손되는 독립적인 거시 의미 구조
3. `coreRelations`: 학생 표상과 오류 위치를 기록하는 원자 관계

현재 합의는 다음과 같다.

- PASS 단위는 관계가 아니라 중심축이다.
- 모든 독립 중심축이 포착되고 명시적 오류가 없으면 PASS다.
- `coreRelations`는 PASS 체크리스트나 질문 순서표가 아니다.
- 현재 축 기반 경로는 `required/error_only`를 사용하지 않는다.
- 최초 응답과 모든 질문–응답은 담화 문맥을 반영한 `effectiveResponse`로 합성한다.
- 한 질문은 관계 하나가 아니라 중심축 하나를 확인한다.
- `contradicted` 관계가 하나라도 있으면 최종 판정은 ERROR다.
- 문단 골드는 모델 후보 생성 후 사람이 검토·승격한다.

문제 풀이 구현을 위해 문단 판정 규칙을 다시 관계 충족형으로 바꾸지 않는다. 문제 풀이에 필요한 세부 조건이 문단 요약의 core 관계에 없다는 이유로 문단 요약 골드를 확장하거나 PASS 기준을 높이지 않는다.

## 4. 문제 풀이 파트의 목표

문제 풀이 파트는 정답을 즉시 설명하는 튜터가 아니다. 학생이 어떤 내적 표상과 인과 과정을 거쳐 오답에 도달했는지 필요한 만큼만 복원하고, 최초로 어긋난 지점을 가능한 한 작은 개입으로 스스로 수정하게 하는 진단·코칭 시스템이다.

기본 흐름은 다음과 같다.

```text
문항 골드
  → 최초 선택
  → 선택 근거
  → 학생 사고 경로 재구성
  → 경로 충분성 판정
     ├─ 불충분: 오류 가설을 구별하는 진단 질문 하나
     └─ 충분: 최초 오류를 겨냥한 교정 질문 하나
  → 재선택
  → 교정 결과와 전이 기록
```

고정된 진단 질의 세트를 모두 통과시키지 않는다. 학생의 선택과 근거만으로 오답 경로가 충분히 설명되면 즉시 교정으로 이동한다. 복수 가설이 남거나 핵심 연결이 비었을 때만 능동 진단 질문을 추가한다.

## 5. 경로 충분성의 운영 기준

다음 네 조건을 모두 만족할 때 현재 학생 사고 경로를 충분히 파악한 것으로 본다.

1. 선택 설명성: 재구성한 학생 표상과 추론을 참이라고 가정하면 실제 오답 선택이 설명된다.
2. 오류 국소화: 사례 사실, 제시문 개념, 조건·관계, 추론, 선지 의미, 발문 처리 중 최초 분기점을 특정할 수 있다.
3. 개입 가능성: 관련 없는 내용을 다시 가르치지 않고 하나의 오류를 겨냥한 질문을 만들 수 있다.
4. 대안 가설 통제: 현재 증거에 비슷하게 부합하는 다른 오류 경로가 남아 있지 않다.

하나라도 충족되지 않으면 진단 질문을 추가한다. 충분한데도 더 묻지 않는다.

## 6. 문제 풀이 골드

문제 풀이기는 문단 요약 골드와 별도로 제시문 상세 골드와 문항 골드를 가져야 한다.

### 6.1 제시문 상세 골드

- 핵심 명제와 개념
- 조건, 예외, 범위, 극성
- 인과·대조·귀속 등 명제 사이의 연결
- 문항 판단에 사용될 수 있는 근거 위치

문항은 문단 중심 이야기에서 생략 가능한 조건·예외·사례를 물을 수 있다. 따라서 문단 요약의 `coreRelations`만으로 문항을 풀거나 진단하지 않는다.

### 6.2 문항 골드

- 발문이 요구하는 판단과 극성
- 보기, 실험, 사례 상황의 구조
- 정답에 이르는 기준 경로
- 각 선지의 참·거짓과 근거
- 선지 판단에 필요한 제시문·보기 정보의 조합
- 기준 경로의 각 단계가 참조하는 문단·명제·관계 ID

### 6.3 대표 오답 경로

대표 오답 경로는 사전 참고 정보로 생성할 수 있지만 완결된 오류 유형 목록이나 고정 질문 은행으로 사용하지 않는다. 실제 학생의 선택과 근거가 대표 경로에 없으면 새로운 경로 가설을 만들 수 있어야 한다.

## 7. 문단 요약에서 문제 풀이로 넘길 계약

문단 요약 결과는 정답 기준이 아니라 학생 표상의 사전 정보다. 문제 풀이의 정답 판단은 제시문·문항 골드가 담당한다.

초기 전달 스키마는 다음 형태를 권장한다.

```ts
interface ParagraphUnderstandingHandoff {
  schemaVersion: 'paragraph-understanding-handoff-v1';
  passageId: string;
  generatedAt: string;
  paragraphs: ParagraphUnderstandingRecord[];
}

interface ParagraphUnderstandingRecord {
  paragraphId: string;
  paragraphPosition: number;

  goldRef: {
    version: string;
    hash: string;
  };

  evaluatorRef: {
    runtimeVersion: string;
    gatePromptVersion: string;
    diagnosticPromptVersion: string;
  };

  dialogue: {
    outcome: 'PASS' | 'UNRESOLVED' | 'NOT_ATTEMPTED' | 'ABORTED';
    questionsAnswered: number;
    diagnosticQuestionCount: number;
    correctiveQuestionCount: number;
  };

  currentRepresentation: {
    effectiveResponse: string | null;
    centralObjectRepresentation: string | null;
    centralStoryRepresentation: string | null;
    expressedClaims: ExpressedClaim[];
    axisStates: AxisRepresentation[];
    relationStates: RelationRepresentation[];
    explicitErrors: ExplicitRelationError[];
    unresolvedQuestions: string[];
  };

  trajectory: {
    initialAxisStates: AxisRepresentation[];
    initialRelationStates: RelationRepresentation[];
    correctedRelationIds: string[];
    persistentContradictionIds: string[];
    newlyConfirmedRelationIds: string[];
  };

  observations: {
    initialResponse: string | null;
    followUpAnswers: StudentAnswerObservation[];
  };
}
```

최소 MVP에서 반드시 전달할 필드는 다음과 같다.

1. `passageId`, `paragraphId`, 문단 순서
2. 문단 골드 버전과 해시
3. 문단 대화 종료 상태
4. `effectiveResponse`
5. 최종 `axisStates`
6. 최종 `relationStates`
7. 각 상태의 학생 발화 근거와 출처
8. 최종 `explicitErrors`
9. 최초 대비 교정된 관계 ID
10. 진단·교정 질문 횟수

## 8. 전달 정보의 해석 규칙

문제 풀이기는 전달된 상태를 다음처럼 사용한다.

- `captured`, `explicit`, `entailed`: 현재 문항에서도 반드시 올바르게 적용한다는 보장이 아니라 관련 표상이 존재할 가능성을 높이는 사전 정보다.
- `partial`: 현재 오답의 상위 표상 원인 후보가 될 수 있다.
- `contradicted`, `distorted`: 현재 선택 근거에서도 같은 왜곡이 나타날 때 강한 오류 가설이 된다.
- `unknown`: 학생이 모른다는 뜻이 아니라 문단 요약 대화에서 확인하지 못했다는 뜻이다.
- `PASS`: 모든 중심축을 복원했다는 뜻이지 모든 세부 조건과 예외를 안다는 뜻이 아니다.
- 과거에 교정된 오류: 현재 오류로 단정하지 않고 재발 여부를 확인하는 참고 정보다.

문단 표상 오류가 현재 오답을 설명하지 못하면 다음 층을 순서대로 검토한다.

```text
제시문 내용 인출
  → 보기·사례 사실 표상
  → 제시문 개념과 사례의 대응
  → 조건·예외 적용
  → 추론 변환
  → 선지 의미 해석
  → 발문 극성 처리
  → 최종 선택 실행
```

모든 오답을 문단 이해 부족으로 환원하지 않는다.

## 9. 증거와 추론의 경계

다음 네 층을 저장 모델에서 분리한다.

| 층 | 내용 |
|---|---|
| 관찰 | 학생의 선택, 확신도, 실제 발화, 후속 답변, 재선택 |
| 추론 | 모델이 재구성한 내적 표상과 오류 경로 가설 |
| 검증 | 질문 답변과 재선택이 가설을 지지하거나 반박한 결과 |
| 결과 | 어느 개입 수준에서 수정됐고 이후 전이가 있었는지 |

질문 문장은 학생 지식의 독립 증거가 아니다. 짧은 학생 답변의 의미를 해석하는 담화 문맥으로만 사용한다. 모델이 추론한 성향을 즉시 학생의 고정 특성으로 저장하지 않는다.

## 10. 문항별 진단 에피소드

문항별로 최소한 다음을 저장한다.

- 최초 선택과 확신도
- 학생이 직접 쓴 선택 근거
- 선택 사항인 풀이 전략과 차선 후보
- 재구성된 학생 사고 경로
- 골드와 처음 갈라진 지점
- 경로 충분성 판정과 남은 대안 가설
- 진단 질문과 학생 응답
- 교정 질문과 개입 수준
- 재선택 결과
- 가설이 검증·기각된 과정
- 이후 유사 구조 문항에서의 재발 또는 전이

학생의 원문 응답, 모델 추론, 질문, 검증 결과를 서로 다른 필드로 보존한다.

## 11. 질문과 다음 행동

매 턴 모델은 다음을 구조화해 출력한다.

- 현재 재구성된 학생 사고 경로
- 경로 충분성
- 최초 오류 후보
- 남은 대안 가설
- 현재 질문 목적
- 다음 행동

다음 행동은 한 번에 하나만 선택한다.

```ts
type ProblemSolvingNextAction =
  | 'ASK_DIAGNOSTIC'
  | 'ASK_CORRECTIVE'
  | 'REQUEST_RESELECTION'
  | 'DIRECT_COACHING'
  | 'COMPLETE';
```

진단 질문은 오류 가설을 구별한다. 교정 질문은 이미 특정된 최초 오류를 학생 스스로 수정하게 한다. 한 번에 질문 하나만 보여 주고, 이미 확인한 내용이나 학생 오답 경로와 무관한 제시문 내용을 다시 묻지 않는다.

최대 진단 횟수를 두고 계속 불명확하면 직접 코칭으로 전환한다. 정확한 횟수는 초기 실험으로 결정하되 무제한 반복은 허용하지 않는다.

## 12. 개입 수준과 결과

최소한 다음 결과 단계를 기록한다.

1. 독립 정답
2. 근거 외현화 과정에서 자기 교정
3. 진단 질문만으로 교정
4. 간접 교정 질문 후 교정
5. 직접 정의·조건 제시 후 교정
6. 상세 코칭 필요
7. 이후 유사 문항에서 전이 성공 또는 재발

최종 정오뿐 아니라 필요한 개입의 깊이와 후속 전이를 성과로 본다.

## 13. 통합 UI 방향

별도의 문제 풀이 앱을 만들지 않는다. 기존 `DialogueApp`과 서버 세션을 후속 통합 학습 흐름으로 확장한다.

목표 흐름은 다음과 같다.

```text
지문 선택
  → 문단별 읽기·요약 대화
  → 문단 이해 handoff 생성
  → 해당 지문의 문제 목록
  → 문제 선택과 최초 답안
  → 오답 근거 입력
  → 능동 진단·교정
  → 재선택
  → 다음 문제
  → 세션 결과와 개인 경향 후보 저장
```

문단 이해 세션과 문제 풀이 세션은 같은 상위 학습 세션 ID 아래 연결하는 것이 좋다. 하위 엔진은 분리하되 UI와 서버 컨트롤러가 상위 상태 전이를 조정한다.

권장 경계는 다음과 같다.

```text
LearningSession
  ├─ ParagraphDialogueSession
  │    └─ ParagraphUnderstandingHandoff
  └─ ProblemSolvingSession
       └─ ProblemDiagnosticEpisode[]
```

## 14. 코드 배치 제안

초기 구현에서는 다음 구조를 권장한다.

```text
packages/pipeline/src/problem-solving/
  schema.ts
  gold.ts
  evaluator.ts
  session.ts

packages/pipeline/experiments/problem-solving/
  path-diagnostic-prompt-v1.md

packages/pipeline/fixtures/experiments/problem-solving/
  ...

packages/app/src/server/problem-solving.ts
packages/app/src/client/ProblemSolvingView.tsx
```

문단 요약에서 문제 풀이로 넘기는 타입은 문제 풀이 내부 구현에 숨기지 말고 두 단계가 공유할 수 있는 명시적 계약으로 둔다. 구체적인 위치는 기존 패키지 의존 방향을 확인한 뒤 결정하되, 클라이언트용 DTO와 모델 내부 표상을 같은 타입으로 섞지 않는다.

## 15. 첫 구현 순서

### 단계 1: 계약과 fixture

1. `ParagraphUnderstandingHandoff` 스키마 정의
2. 기존 완료 세션에서 handoff를 생성하는 순수 변환 함수 작성
3. PASS, UNRESOLVED, NOT_ATTEMPTED 문단 fixture 작성
4. 질문 문장이 학생 증거로 승격되지 않는지 테스트
5. 이전 오류와 최종 현재 상태가 분리되는지 테스트

### 단계 2: 문항 골드 최소 스키마

1. 보기 사례 적용 또는 복합 추론 문항 1개 선택
2. 발문 극성, 선지 판단, 기준 경로 스키마 정의
3. 제시문 근거 요구 사항에 문단·명제·관계 ID 연결
4. 대표 오답 경로를 참고 후보로만 저장

### 단계 3: 사고 경로 재구성과 충분성 판정

1. 최초 선택과 근거 입력
2. 학생 경로 후보 구조화
3. 네 가지 충분성 기준 출력
4. 하나의 다음 행동 선택
5. 관찰·추론·검증 필드 분리 저장

### 단계 4: 진단·교정 대화

1. 진단 질문 한 개 생성
2. 누적 응답으로 대안 가설 갱신
3. 충분하면 교정 질문으로 전환
4. 개입 직접성을 단계적으로 높임
5. 재선택과 종료 처리

### 단계 5: 통합 UI

1. 기존 문단 요약 완료 후 문제 단계 진입
2. 선택지, 근거 입력, 질문, 재선택 UI 추가
3. 동일 상위 세션에서 handoff 연결
4. 문제 풀이 없이 문단 화면을 다시 볼 수 있게 유지
5. 개발자용으로 관찰·추론·검증 로그 확인 화면 제공

## 16. 초기 검증 기준

최소한 다음 사례를 자동 테스트한다.

1. 문단 관계 오류와 현재 오답 근거가 직접 일치하여 즉시 교정으로 이동
2. 관련 관계가 unknown이어서 진단 질문으로 이동
3. 문단 표상은 정확하지만 사례 대응이 틀린 경우
4. 내용·추론은 맞지만 발문 극성을 반대로 처리한 경우
5. 복수 오류 가설이 남아 구별 질문이 필요한 경우
6. 근거를 설명하다 학생이 스스로 선택을 수정하는 경우
7. 교정 후 재선택 성공
8. 재선택 실패 후 더 직접적인 개입
9. 기존에 교정된 오류가 새 문항에서 재발하는 경우
10. 문항과 무관한 문단 관계를 질문하지 않는 경우

초기 품질 평가는 최종 정답률만으로 하지 않는다.

- 선택 설명성
- 최초 오류 위치의 정확성
- 불필요한 질문 수
- 질문의 정답 노출 여부
- 필요한 개입 단계
- 재선택 성공 여부
- 유사 문항 전이
- 호출 시간과 비용

## 17. 피해야 할 구현

- 모든 학생에게 고정 질의 은행을 순서대로 실행
- 문단의 모든 relation을 문제마다 다시 검사
- `unknown`을 지식 결손으로 단정
- PASS를 세부 내용 전체 숙달로 해석
- 과거 오류를 현재 오류로 자동 확정
- 대표 오답 경로에 학생을 억지로 맞춤
- 정답 경로 전체를 진단 질문에 노출
- 한 질문에서 여러 오류 가설을 동시에 확인
- 문단 요약 판정기와 문제 풀이 판정기를 하나의 거대한 프롬프트로 합침
- 별도 문제 풀이 앱을 만든 뒤 나중에 UI를 합치려 함
- 모델 추론과 학생 관찰을 같은 필드에 저장

## 18. 환경과 실행

저장소는 Node.js 24 이상과 npm workspaces를 사용한다.

새 워크트리에는 Git이 추적하지 않는 `.env`와 `node_modules`가 자동으로 생기지 않는다. API 키를 출력하거나 커밋하지 말고 기존 로컬 환경을 안전하게 연결한 뒤 의존성을 설치한다.

기본 검증 명령은 다음과 같다.

```sh
npm run typecheck
npm test
npm run test:e2e
```

현재 문단 요약 개발 UI는 다음 명령으로 실행한다.

```sh
npm run dialogue:ui
```

문제 풀이 통합 UI가 추가되더라도 최종적으로는 하나의 개발 진입점을 유지한다.

## 19. 새 워크트리의 첫 결정 사항

구현을 시작하기 전에 다음 세 가지를 먼저 확정한다.

1. 첫 실험 문항: 보기 사례 적용 또는 복합 추론 문항 중 어떤 실제 문항을 사용할지
2. 제시문 상세 골드와 문항 골드의 최소 스키마
3. `ParagraphUnderstandingHandoff`의 소유 패키지와 상위 학습 세션의 경계

이 세 결정 이후에는 작은 실제 문항 하나를 끝까지 관통하는 수직 슬라이스를 먼저 만든다. 여러 문항 유형이나 개인화 모델을 동시에 구현하지 않는다.
