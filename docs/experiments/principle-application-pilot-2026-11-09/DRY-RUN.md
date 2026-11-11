# 드라이런 요청 수와 예상 비용 상한 (P1)

작성: 2026-11-09, 하위 에이전트(executor). 이번 단계는 외부 전송이 없다. 모든 숫자는 `node --env-file-if-exists=.env scripts/run-principle-pilot.mjs --dry-run`으로 만든 요청 파일에서 센 값이다.

- 근거 인계 문서: `docs/handoffs/2026-11-09-principle-application-pilot-p1.md`, 결정 `memory/decisions/D-0215-principle-application-structure-review-and-pilot.md`.
- **입력 토큰 추정**은 기존 추정 함수(`reserveUsd`: 요청 JSON 바이트 수를 토큰 수로 보고 입력 단가를 곱함)를 그대로 쓴 **상한**이다. 한글은 바이트보다 토큰이 훨씬 적으므로 실제 입력 비용은 이보다 작다.
- **예상 비용 상한** = 요청마다 (요청 바이트 x 입력 단가 + 최대 출력 토큰 x 출력 단가) / 1,000,000. 응답이 최대 출력 토큰까지 가는 경우를 가정한 값이고, 실제 청구는 보통 이보다 훨씬 작다. `--usd-cap`은 이 예약액 기준으로 요청 전에 멈춘다.
- 단가: `gpt-6.1-sol`, reasoning medium, USD 2 / 10 (입력 / 출력, 100만 토큰당). 요청마다 최대 출력 16,000토큰. 재시도 없음.
- 단계 2·3 요청은 앞 단계의 **가짜 예시 출력**으로 만들었다. 가짜 출력은 실제보다 짧아(규칙 2개, 열린 자리 2개, 계산표 단계 2개) 단계 2·3의 입력 바이트가 실제보다 작게 잡힌다. 실제 단계 1 출력(규칙 3~8개)이 요청마다 수 KB 더 실리면 입력 상한이 $0.1 안팎 늘 수 있다. 출력 상한(전체의 약 88%)이 비용 대부분이라 상한 판단은 바뀌지 않는다.

## 요청 수와 상한

| 단계 | 요청 단위 | 요청 수 | 입력 바이트(=토큰 추정 상한) | 최대 출력 토큰 합 | 예상 비용 상한 |
|---|---|---:|---:|---:|---:|
| 1 규칙 뽑기 | 지문 | 4 | 33,762 | 64,000 | $0.708 |
| 2 상황·계산표 | 문항 | 8 | 90,052 | 128,000 | $1.460 |
| 3 선지 집필 | 문항 | 8 | 84,948 | 128,000 | $1.450 |
| 합계 | | 20 | 208,762 | 320,000 | $3.618 |

- 기본 상한(`LIMITS`): 20요청, $5. 합계는 상한 아래다(`overCap: false`, `overMaxRequests: false`).
- 참고 실측: E1 v3는 16요청 실제 청구 $0.589였다(`docs/experiments/gold-item-generation-2026-11-06/v3/runs/ledger.jsonl`). 결정 기록 D-0215 15항의 P1 추정은 약 20요청, $1~1.5다.
- 실행 순서: 단계 1을 4지문 모두 끝낸다 → 열린 자리 거르기(코드) → 관문 → 지문마다 a, b 순서로 단계 2 → 3.
  - 관문: 쓸 수 있는 열린 자리가 0개인 지문이 2개 이상이면 단계 2로 가지 않는다(요청 4개에서 멈춤, `RUN.json`의 `stop: "GATE: openSlots"`).
  - 쓸 수 있는 열린 자리가 0개인 지문이 하나뿐이면 그 지문의 a는 보내지 않는다(`NOT_SENT: NO_OPEN_SLOT`, 요청 2개 감소).
  - 단계 2가 파싱에 실패한 문항은 단계 3을 보내지 않는다(요청 수가 줄 수 있음).

## 외부로 나가는 자료 (OpenAI, `gpt-6.1-sol`)

| 단계 | 나가는 자료 |
|---|---|
| 1 규칙 뽑기 | 지문 원문(문단별). 골드 지도·입장·기출 문항은 없다. |
| 2 상황·계산표 | 지문 원문, 단계 1 출력(규칙 목록. a 문항은 제외 상황과 겹치는 열린 자리를 뺀 것), 문항 정보(`itemKey`, `form`, `stemPolarity`, `excludedSituations`) |
| 3 선지 집필 | 지문 원문, 단계 2 출력(상황·계산표·참인 결론), 문항 정보(`itemKey`, `form`, `stemPolarity`) |

- `excludedSituations`는 표면 장력 문항 a에만 있다. 나가는 내용: 상황 설명 한 줄("크기가 다른 두 기포가 접하여 하나로 합쳐지는 경우(3문단)")과 지문 3문단의 문장 세 개(지문 원문에 있는 문장이다).
  - 이 한 줄이 **기출 15번의 상황을 가리키는 유일한 예외**다(D-0215 12). 이 설명은 기출 문항 텍스트가 아니고, 지문 3문단의 내용을 요약한 것이다.
- 단계 3 요청에는 `excludedSituations`가 없다.

## 기출 문항이 생성 요청에 들어가지 않는다는 확인 (시험 근거)

`scripts/run-principle-pilot.test.mjs`의 "dry-run on the real targets" 시험이 실제 대상 4지문의 dry-run 요청 20개에 대해 확인한다.

- 4지문 기출 문항 전부(어휘 제외)의 발문과 선지 전문(공백 제거 후 20자 이상인 것)이 요청의 입력에도 지시문에도 없다.
- 요청에 `realNumber`, `mapPath`, `propositions`, `relations`, `stances`, `slots`, `questionsPath`, `answersPath`가 없다. 골드 지도·입장은 읽지도 않는다(대상 파일에 해당 필드가 없다).
- `excludedSituations` 한 줄을 담은 요청은 표면 장력 단계 2 a 하나뿐이다.
- 대상 파일은 기출 문항 파일 경로(`questionsPath`, `answersPath`)를 갖고 있으나 생성 스크립트는 읽지 않는다. 기출 문항은 `check-exam-overlap.mjs`와 `build-structure-judge-bundle.mjs`(외부 전송 없음)만 읽는다.

## 가짜 transport 시험으로 확인한 동작

- 관문(열린 자리 0개 지문 2개 이상)에서 단계 2 전에 멈춘다. 열린 자리 0개 지문이 하나면 그 지문의 a만 `NO_OPEN_SLOT`으로 건너뛴다.
- 단계 2 응답이 파싱에 실패한 문항은 단계 3을 보내지 않고, 다른 문항은 계속 진행한다. 단계 1 파싱 실패 지문은 단계 2·3을 보내지 않는다.
- 한도(최대 요청 수·usd 상한)에서 멈추고 `STOP`을 ledger에 남긴다. `RUN_EXISTS`면 재실행을 거부한다.
- 인계 문서 2.3의 코드 검사 위반이 각각 가짜 출력에서 잡힌다.

## 만든 파일 위치

- 대상: `targets.json`(지문 4, 문항 8, 표면 장력 a의 제외 상황 1).
- 지시문(코드 에이전트 작성, 수정하지 않음): `RULES-PROMPT-v1.md`, `SITUATION-PROMPT-v1.md`, `WRITE-PROMPT-v1.md`, `SOLVE-PROMPT-v1.md`.
- 생성 dry-run 요청: `dry-run/<지문>/{rules|situation-a|situation-b|write-a|write-b}.request.json` (20개).
- 판정 묶음(외부 전송 없음): `docs/experiments/principle-application-structure-2026-11-09/judge/` — 판정자별 지문 파일 8개씩(기출 31 + E1 v3 20 = 51문항)과 `blind-key.json`. P1 생성 뒤 `--include-p1`로 다시 만든다.
