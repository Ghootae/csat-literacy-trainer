# Dialogue experiment API policy

## Gold baseline

- `paragraph-analysis-prompt-v2`는 사람 검토형 골드 생성 기준선이다.
- `paragraph-analysis-prompt-v3`는 중심 이야기를 전면 요약이 아닌 문단의 독립 중심 방향과
  이를 성립시키는 핵심 연결로 정제하는 신규 후보 기준선이다. v2는 회귀 비교용으로 보존하며,
  v3도 사람 또는 독립 검토 API가 승인하기 전까지 확정 골드가 아니다.
- `paragraph-analysis-prompt-v3.1`은 검증된 v3 중심 이야기 규칙을 유지하되 원리 적용 문단의
  `원리 → 적용 사례` 연결을 보강하고, `diagnosticRole` 생성을 문단 분석에서 제거한다.
- 신규 역할 비의존 경로는 `central-axis-decomposition-prompt-v2`에 paragraphId와
  centralStory만 전달해 거시 중심축을 먼저 확정한다. `coreRelations`는 축의 개수나 경계를
  결정하는 입력으로 전달하지 않는다.
- 확정된 축은 `axis-relation-mapping-prompt-v1`에 고정 입력으로 넘기고, 이 단계는 축을
  수정·분할·병합하지 않은 채 원자적인 core 관계만 연결한다. core의 단위 원칙은
  `한 관계 = 한 상태·한 오류`이며 질문 단위는 관계가 아니라 축이다.
- 신규 축 기반 대화 경로는 `required/error_only`를 생성하거나 사용하지 않는다. 기존 역할
  필드는 회귀 자료로 보존하되 모델 입력에서 제거하며, 미포착·부분·왜곡 축이 질문을 발생시킨다.
- 저장된 v3.1 분석 결과를 재사용한 역할 비의존 축 실험은
  `npm run experiment:axis-architecture -- --input=... --output=...`으로 실행한다. 축 확정과
  관계 매핑을 순서대로 호출하고 각 단계의 결과·비용·실패를 별도로 보존한다.
- 기존 비교 경로에서 v3는 `centralAxes`를 생성하지 않는다. 확정된 `centralStory`와 `coreRelations`는 별도
  `central-axes-prompt-v1` API 단계에 전달된다. 이 단계는 중요도를 다시 판단하지 않고
  centralStory를 무손실 의미 분할하며, 불일치는 `NEEDS_REVIEW`로 보존한다.
- 기존 비교 경로에서는 중심축이 확정되면 `diagnostic-roles-prompt-v1`이 축별 반사실적 검사를 수행한다. 같은 축의
  다른 관계만으로 중심 방향을 판단할 수 있으면 `error_only`, 그렇지 않을 때만 최소 앵커를
  `required`로 배정한다.
- 중심축 대량 실행은 `npm run experiment:central-axes -- [입력 파일/디렉터리...]`를 사용한다.
  기본 입력은 현재 `gold-v2` 디렉터리, 기본 출력은 `.omc/adhoc/central-axes-v1`이며 호출별
  최대 1회 재시도하고 최종 실패를 `failures/`에 보존한다.
- `dialogue-prompt-v7`은 required 관계 충족형 판정의 회귀 기준선으로 보존한다.
- `dialogue-prompt-v8`은 한 호출 안에서 centralStory 판정과 관계 진단을 분리하려 한
  비교 기준선으로 보존한다.
- 현재 UI는 `central-story-gate-prompt-v1`과 `dialogue-axis-diagnostic-prompt-v1`을
  순차 사용하는 `axis-dialogue-v1` 기준선이다. 게이트에는 `centralStory`, 사람이 검토한
  소수의 `centralAxes`, 누적 응답만 제공하며 모든 독립 축이 포착되어야 CAPTURED다.
- 축 판정 우선순위는 왜곡된 축 → 완전히 빠진 축 → 부분적인 축이다. 한 질문은 선택된
  중심 축 하나를 확인하며, 축 안의 관계 여러 개를 함께 다룰 수 있다.
- 관계 단계는 게이트의 PASS 여부를 뒤집지 않는다. 매 턴 호출되어 마지막 답변으로 새로
  확인·수정된 관계 상태를 갱신하고, 새 판단이 unknown인 관계만 이전 상태로 보완한다.
- 게이트는 최초 응답과 모든 질문–응답을 `effectiveResponse` 하나로 합성한다. 질문은 학생
  지식의 근거가 아니라 생략된 답변의 지시 대상과 의미 슬롯을 해석하는 담화 문맥으로만
  사용하며, 관계 단계도 원시 문답을 별도로 재해석하지 않고 같은 합성 응답을 사용한다.
- `coreRelations`와 `diagnosticRole`은 PASS 체크리스트나 질문 순서표가 아니라 선택된 축
  안의 표상과 오류 위치를 기록하는 하위 진단 자료다.
- `centralAxes`는 확정된 centralStory의 의미를 추가·삭제하지 않고 독립 의미 구조로
  무손실 분할한다. 사례·적용·논평이 이미 centralStory에 포함됐다면 축 단계에서 중요도를
  다시 판단해 제외하지 않으며, 제외가 필요하면 upstream centralStory를 먼저 수정한다.
- v2 분석 결과는 사람이 core 관계와 `required/error_only` 역할을 검토한 뒤 확정한다.
- v2는 검토 없는 자동 확정 골드 생성기가 아니다.
- `paragraph-analysis-prompt-v1`과 `dialogue-prompt-v6`은 비교·회귀 기준선으로 유지한다.

## API policy

- 문단 분석과 학생 자유 응답 평가는 OpenAI Responses API를 사용한다.
- 별도 지시가 없으면 신규 실험용 API 경로의 provider는 OpenAI로 고정한다.
- 기본 모델은 `gpt-5.6-terra`, 기본 reasoning effort는 `medium`이다.
- 실험 전용 재정의는 `DIALOGUE_EXPERIMENT_OPENAI_MODEL`, `DIALOGUE_EXPERIMENT_EFFORT` 또는 CLI 옵션으로만 한다.
- API 키는 `OPENAI_API_KEY`에서 읽는다.
- 판정 호출은 시도당 60초로 제한하고 SDK 자동 재시도는 사용하지 않는다.
- 연결 오류·타임아웃·429·5xx만 한 번 수동 재시도하며, 계약·스키마 오류는 재시도하지 않는다.
- 최초 실패와 대체 시도는 각각 metric과 호출 메타데이터에 보존한다.
- 기존 v02 운영 경로의 provider와 기본 설정은 이 실험 정책의 적용 대상이 아니다.
- 실제 유료 API 호출은 명시적인 실행 지시가 있을 때만 수행한다.

## Local sequential test UI

```sh
npm run dialogue:ui
```

브라우저에서 `http://127.0.0.1:5173/dialogue`를 연다. 이전 문단은 계속 보이고 현재
문단만 강조된다. 최초 응답 뒤 판정과 질문을 반복하며, 후속 질문은 문단마다 최대 3회다.
PASS일 때만 다음 문단으로 이동하고 세 번째 후속 답변 뒤에도 통과하지 못하면
`UNRESOLVED`로 종료한다.

현재 전체 원문과 문단별 골드가 갖춰진 지문은 도파민(4문단), 법인(5문단), 표면 장력
(6문단), 정보 비대칭(5문단)이다. 헤겔 자료는 저장소에 첫 문단만 있으므로 전체 지문
테스트 목록에서는 비활성화된다. 이 작업에서 새로 생성한 13개 v2 골드는 역할 감사를
거친 후보이며, 확정 골드로 승격하려면 개발자의 최종 의미 검토가 필요하다.
