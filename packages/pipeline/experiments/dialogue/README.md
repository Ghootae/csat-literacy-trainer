# Dialogue experiment API policy

## Gold baseline

- `paragraph-analysis-prompt-v2`와 `dialogue-prompt-v7`은 사람 검토형 골드 생성·판정의 기준선이다.
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
