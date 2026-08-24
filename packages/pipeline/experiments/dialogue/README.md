# Dialogue experiment API policy

- 문단 분석과 학생 자유 응답 평가는 OpenAI Responses API를 사용한다.
- 별도 지시가 없으면 신규 실험용 API 경로의 provider는 OpenAI로 고정한다.
- 기본 모델은 `gpt-5.6-terra`, 기본 reasoning effort는 `medium`이다.
- 실험 전용 재정의는 `DIALOGUE_EXPERIMENT_OPENAI_MODEL`, `DIALOGUE_EXPERIMENT_EFFORT` 또는 CLI 옵션으로만 한다.
- API 키는 `OPENAI_API_KEY`에서 읽는다.
- 학생 응답 한 번당 API 요청은 한 번이며 SDK 자동 재시도도 사용하지 않는다.
- 기존 v02 운영 경로의 provider와 기본 설정은 이 실험 정책의 적용 대상이 아니다.
- 실제 유료 API 호출은 명시적인 실행 지시가 있을 때만 수행한다.
