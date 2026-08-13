# 학생 영역 평가 운영 결정 — low/off

- 날짜: 2026-08-13
- 비교 코드 기준: `6d5d54bb4fbb50573ff285d1d511933a6b8d4087`
- provider/model: Anthropic / `claude-opus-4-8`
- 채택 설정: effort `low`, proposition coverage `off`
- 롤백 설정: effort `medium`, proposition coverage `on`

## 결정

학생이 영역 요약을 제출할 때 호출하는 query evaluator의 운영 기본값을 `low/off`로 한다.
`medium/off`보다 품질은 낮지만 실제 상호작용 지연을 줄이는 편익을 우선했다. 타이틀 평가는
이번 변경 범위 밖이므로 기존 `medium/on`을 유지한다. 골드와 영역·타이틀 질의 생성은 온라인
평가와 분리해 `medium`으로 고정한다.

환경변수 `EVAL_EFFORT=medium`과 `EVAL_PROPOSITION_COVERAGE=on`을 함께 지정하면 학생 영역
평가를 명시적으로 롤백할 수 있다. effort와 coverage 여부, 실제 system prompt와 출력 schema는
모두 평가 request fingerprint에 들어가므로 두 설정은 같은 캐시를 공유하지 않는다.

## 39프로브 결과

같은 39프로브를 base 12, new 12, n2 15로 나누고 각 프로브를 오라클과 생성 질의 3종으로
평가했다. 총 156판정이다. 이 문서를 만들면서 API를 다시 호출하지 않았으며 기존 원시 로그를
분석했다.

| 지표 | low/off |
| --- | ---: |
| 기대 판정 일치 | 132/156 |
| 신규 위험 과대통과 | 0 |
| 기존 공통 위험 과대통과 | 1 |
| focal/raw 거짓 모순 | 0/1 |
| 분해 간 불안정 프로브 | 8/39 |

유일한 focal 위험 과대통과는 기존 기준선에도 있던 humanities `Bd1`이다. 신규 관계 구조에서
새 과대통과는 없었다. quality baseline은 이 39프로브 개발 회귀의 결과이지 실제 학생 응답의
정확도 주장이 아니다.

## 증거와 보존 상태

- 실험 설계·사전 인계: `docs/experiments/HANDOFF-low-nocoverage-regression.md`
- 이전 medium 기준선: `docs/experiments/effort-medium-2026-08-09.md`
- 표준 프로브 정의: `packages/pipeline/src/cli/assess.ts`
- low/off 원시 로그: `docs/experiments/low-nocoverage-base.log`,
  `docs/experiments/low-nocoverage-new.log`, `docs/experiments/low-nocoverage-n2.log`
- medium/off 원시 로그: `docs/experiments/medium-nocoverage-base.log`,
  `docs/experiments/medium-nocoverage-new.log`, `docs/experiments/medium-nocoverage-n2.log`

마지막 여섯 원시 로그는 이 결정 시점에 **untracked 증거**다. 기존 파일을 변경하거나 이 결정
커밋에 stage하지 않았다. 이 문서는 핵심 결과와 증거 위치를 tracked 상태로 동결한다.

## 구현 계약

- 학생 영역 무설정 기본값: `low/off`
- 학생 영역 롤백: 환경변수로 `medium/on`
- 타이틀 평가: 명시적 `medium/on`; 학생 영역 환경변수와 분리
- 골드 생성: `medium`
- 영역·타이틀 질의 생성: `medium`
- model: 모두 `claude-opus-4-8`
- 설정 오류: 잘못된 effort/coverage 값을 조용히 기본값으로 되돌리지 않고 즉시 실패
- 캐시: resolved model, effort, coverage, prompt, schema가 request fingerprint에 포함

검증은 `packages/pipeline/src/llm/query-eval-config.test.ts`,
`packages/pipeline/src/llm/operation-config.test.ts`, `packages/pipeline/src/eval-cache-key.test.ts`,
`packages/app/src/boundary.test.ts`에 고정한다.
