# 인계: 출제자 전략 글 2차 — 함정 의도 제약 있음·없음 비교 실행기

- 날짜: 2026-10-23
- 작성: 코드 에이전트
- 실행: 하위 에이전트(executor, sonnet)
- 관련 결정: `memory/decisions/D-0170-optional-examiner-strategy-feedback.md`
- 앞선 인계: `docs/handoffs/2026-10-23-examiner-strategy-trial.md`(1차 실행기), 1차 보고 `docs/experiments/examiner-strategy-2026-10-23/REPORT-trial-1-desktop.md`

## 목표

`scripts/run-examiner-strategy.mjs`를 확장해 다음을 할 수 있게 한다.

- 지시문 두 판(조건)을 한 번에 돌린다.
- 지시문 v2 출력 스키마를 쓴다.
- 입력에 지도 명제 글 대신 원문 구절을 넣는다.
- 1차 실행 결과(`trial-1/`)는 v1 설정으로 그대로 재현할 수 있어야 한다. 기존 기본 동작과 기존 테스트를 깨지 않는다.

**외부 전송은 하지 않는다.** 단위 테스트(가짜 전송)와 dry-run까지만 한다.

## 범위 밖

- 지시문 내용(`docs/experiments/examiner-strategy-2026-10-23/PROMPT-v1.md`, `PROMPT-v2-constrained.md`, `PROMPT-v2-open.md`) 수정.
- `trial-1/` 폴더의 파일, `scripts/lib/provider-adapter.mjs`, 운영 코드(`packages/`), `memory/`.

## 손댈 파일과 계약

### `scripts/run-examiner-strategy.mjs`

1. **조건 인자** `--conditions <이름>=<지시문 경로>,...`(선택).
   - 없으면 지금처럼 `PROMPT-v1.md` 하나를 조건 이름 `v1`로 쓴다.
   - 작업 단위는 target × 조건 × 모델 × 회차다.
   - 파일 이름은 `<target>__<조건>__<model>__r<n>.json`이다. `ledger.jsonl`·`RUN.json`에 조건을 남기고, `RUN.json`에는 조건별 지시문 SHA-256을 남긴다.
2. **스키마 선택** `--schema v1|v2`(기본 v1).
   - v1은 지금 스키마 그대로다.
   - v2: `{ parts: [{ choiceQuote, twisted, evidenceQuotes: string[], trapIntent: string, intentQuotes: string[] }], text }`. 모든 필드 required, `additionalProperties: false`, `text`는 `minLength: 1`.
3. **입력 원문화** `--source-quotes`(선택, v2 실행에서 켬). 켜면 `support`·`changed`·`nearby`의 각 id를 다음처럼 원문 글로 바꾼다.
   - 명제(`P…`): 지도 `propositions[].sourceQuote`.
   - 노드(`C…`·`G…`·`X…` 등 `nodes`에 있고 `childIds`가 있는 것): `childIds`를 따라 내려가 만나는 명제들의 `sourceQuote`를 차례대로 모은다(중복 제거).
   - 관계(`R…`): 지도 `relations`에서 그 관계가 잇는 양 끝 id를 위 규칙으로 바꾼다. 필드 이름은 지도 파일을 읽어 확인한다. 양 끝을 가리키는 필드가 분명하지 않으면 멈추고 보고한다.
   - 〈보기〉 조각(`S…`): 지금처럼 조각 글.
   - 바꿀 수 없는 id(`TOP` 등)는 빼고 `missingIds`에 남긴다.
   - 한 필드 안에서 같은 글은 한 번만 넣는다. 꺼져 있으면 지금처럼 `textOfId`를 쓴다.
4. **재시도 대상 추가**: 출력의 `parts`가 입력과 맞지 않으면(`partsMatch` 실패) 파싱 실패와 같이 1회 재시도한다. 재시도해도 실패하면 그 출력을 저장하고 실패로 기록한다.
5. **검사**(v2 스키마일 때. v1은 지금 검사 그대로):
   - `partsMatch`: 지금과 같다.
   - `quotesFound`: `evidenceQuotes`와 `intentQuotes`가 원문(passage)이나 〈보기〉(scenario)의 정확한 부분 문자열인지 본다.
   - `textQuotes`: `text` 안의 작은따옴표 구간(`'…'`, `‘…’`)을 모두 뽑는다. 앞뒤 공백과 끝 마침표를 떼고, `<보기>`는 `〈보기〉`로 맞춘 뒤 원문·〈보기〉·대상 선지 문장 중 하나의 부분 문자열인지 본다. 못 찾은 구간 목록을 남기되, 실패로 막지는 않는다(학생 생각을 따옴표로 보인 구간일 수 있음).
   - `intentFields`: 맞는 조각은 `trapIntent`가 빈 문자열이고 `intentQuotes`가 빈 배열이어야 한다. 비튼 조각은 `trapIntent`가 비어 있는지 여부를 기록한다(constrained 조건은 비울 수 있으므로 위반으로 보지 않는다).
   - `forbiddenTerms`, `honorific`: 지금과 같다.
6. **검토 화면**:
   - 실행기 `REVIEW.html`·`KEY.json`은 지금처럼 만든다(가림 키에 조건 포함).
   - 추가로 `USER-REVIEW.html`·`USER-REVIEW-KEY.json`을 만든다. 형식은 `docs/experiments/examiner-strategy-2026-10-23/trial-1/build-user-review.mjs`의 출력과 같게 한다.
     - target마다 절을 나눈다. 절마다 선지 문장을 맨 위에 둔다.
     - 그 target의 글을 조건·모델을 가린 채 무작위 순서(시드 20261024)로 보인다. 글 이름은 절마다 A, B, …다.
     - 글마다 이해 용이성 상·중·하와 메모를 받는다.
     - target마다 "가장 좋은 글" 하나를 받는다.
     - [결과 복사] 버튼은 `{ trial, targets: { <target>: { grades: {...}, best } }, overall }` JSON을 클립보드에 복사한다.
     - 자동 검사 결과는 보이지 않는다. `partsMatch` 실패 출력은 화면에서 빼고 키에 `excluded`로 남긴다.
     - 색은 `:root` 변수로 정하고, 다크 모드와 좁은 화면(16px 여백)에서도 읽히게 한다.

### `scripts/run-examiner-strategy.test.mjs`

기존 17개는 그대로 통과해야 한다. 추가로 다음을 확인한다.

- 조건 인자 파싱과 작업 수: target 4 × 조건 2 × 모델 1 × 회차 2 = 16.
- `--source-quotes`일 때 법인 13번 ② 입력에 지도 명제 글 "법인 자산의 실제 운용은 …"이 없고, 원문 구절 "실제 자산의 운용은 법인의 정관*이나 법령에서 권한을 부여한 사람에 의해 이루어진다."(지도의 해당 명제 `sourceQuote` 그대로)가 있다.
- v2 스키마 검사 각 항목의 통과·실패 예. `textQuotes`가 `‘…’`·`'…'`를 모두 뽑는지도 확인한다.
- `partsMatch` 실패가 1회 재시도된다(가짜 전송).
- `USER-REVIEW.html`에 모델·조건 이름이 없다.

## 완료 조건

- [ ] `node --test scripts/run-examiner-strategy.test.mjs` 통과(기존+추가).
- [ ] 아래 dry-run이 요청 16개와 `RUN.json`을 만들고 예약 비용 합계를 출력한다. 외부 전송은 0회다.

```
node --env-file=.env scripts/run-examiner-strategy.mjs --dry-run \
  --targets corporate-law:13:2,surface-tension-laplace:16:2,gongsun-long-later-mohists:12:4,dopamine-motor-control:13:2 \
  --conditions constrained=docs/experiments/examiner-strategy-2026-10-23/PROMPT-v2-constrained.md,open=docs/experiments/examiner-strategy-2026-10-23/PROMPT-v2-open.md \
  --schema v2 --source-quotes --runs 2 --models gpt-6.1-sol \
  --out docs/experiments/examiner-strategy-2026-10-23/dry-run-2
```

- [ ] 상한은 이번 실행에서 인자로 줄 수 있어야 한다: `--max-requests 32 --usd-cap 1.5`(없으면 지금 기본값 18·$1.00).

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고, 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전에 멈춘다(별도 승인 필요).
- 파일을 삭제(`rm` 등)하지 않는다. git commit·add·stash를 하지 않는다. `.env` 키 값을 출력하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/run-examiner-strategy.mjs`(조건·스키마 v2·원문화·partsMatch 재시도·v2 검사·USER-REVIEW·`--max-requests`/`--usd-cap`), `scripts/run-examiner-strategy.test.mjs`(11개 추가), 인계 문서 이 절. dry-run 산출물 `docs/experiments/examiner-strategy-2026-10-23/dry-run-2/`.
- 테스트 결과: `node --test scripts/run-examiner-strategy.test.mjs` 28개 통과(기존 17 + 추가 11), 실패 0.
- dry-run: 요청 16개(`requests/` 16파일), `RUN.json` 생성, 외부 전송 0회. 예약 비용 합계 $3.097(gpt-6.1-sol). 인자 `--max-requests 32 --usd-cap 1.5`로 보면 요청 수는 상한 안이지만 `overCap: true`다(예약은 요청마다 최대 출력 16000토큰 x $10/M = $0.16 + 입력 기준의 최대치이고 실제 비용은 훨씬 적다. 실제 실행은 요청마다 "누적 실비 + 그 요청 예약 > 상한"일 때 멈추므로 실행은 가능하지만, 예약 합계가 상한을 넘는 점은 실행 승인 때 판단 필요).
- missingIds: 빈 배열(`RUN.json`).
- 구현 중 해석한 점(설계 공백 아님, 확인 요망):
  - 지도 `TOP` 노드는 `childIds`가 있지만 인계 문서의 "TOP 등은 빼고 missingIds" 규정에 따라 명시적으로 제외했다.
  - 관계(`R…`)는 지도의 `fromId`·`toId` 두 필드로 양 끝을 읽는다(6개 지도 모두 동일).
  - partsMatch 실패 재시도는 v2 스키마일 때만 적용했다(v1은 기존 동작 유지).
  - 조건 이름은 영숫자와 `-`만 허용(파일 이름 구분자 `__` 때문). 조건 인자를 안 주면 조건 이름 `v1`, 파일 이름에 `__v1__`이 들어간다.
  - `RUN.json` version을 2로 올리고 지시문 SHA-256을 `conditions.<이름>`에 둔다(최상위 `instructionsSha256` 제거).
  - `USER-REVIEW-KEY.json`: `{ seed, note, key: {"<target>:<A..>": {condition, model, run}}, excluded: [...] }`.
- 남은 문제: 실제 전송 없음. `USER-REVIEW.html`을 실제 출력으로 만든 화면은 검증하지 못함(가짜 전송 테스트만).
