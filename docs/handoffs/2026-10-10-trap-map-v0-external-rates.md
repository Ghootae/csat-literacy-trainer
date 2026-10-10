# 인계: 함정 지도 v0와 외부 선지 선택 비율 대조

- 날짜: 2026-10-10
- 작성: Claude
- 실행: Codex
- 관련 결정: `memory/decisions/D-0109-trap-map-v0-external-rate-experiment.md`
- 배경: `docs/review/inner-thought-inference-moat-discussion-2026-10-10.md`

## 목표

- 기존 연결 문항 6개에 대해 LLM이 만든 선지별 함정 지도(근거 위치, 선지 거리, 함정 태그, 예상 선택 비율)를
  메가스터디 실제 선지별 선택 비율과 대조한 수치가 `RESULTS.json`과 `REPORT.md`에 남는다.
- 모델 두 개(`gpt-6-luna`, `gpt-6.1-sol`) × 문항 6개 × 반복 3회.
- 외부 요청(메가스터디 수집, OpenAI 호출)은 **사용자 승인 완료**(D-0109). 아래 상한 안에서 Codex가 직접 실행한다.

## 범위 밖

- `packages/**` 소스, 운영 판정기 프롬프트·서버·UI 수정 금지. `packages/pipeline/dist`는 읽기만 한다.
- 기존 실험 폴더 수정 금지.
- `.env` 열람 금지(환경 변수 `OPENAI_API_KEY`만 SDK가 읽는다). 커밋·푸시 금지.
- 결과 해석 문장 작성 금지. `REPORT.md`에는 수치 표와 사실만 쓴다. 해석은 Claude가 한다.

## 실험 폴더

`docs/experiments/trap-map-v0-external-rates-2026-10-10/`

## 1. 스크립트 `scripts/test-trap-map-v0.mjs`

모드: `collect-rates`, `prepare`, `run <model>`, `report`. 구조와 원장·상한 방식은 `scripts/test-v5-multi-item-models.mjs`를 따른다.

### 1-1. `collect-rates` (메가스터디, 요청 상한 14, 요청 간 1초 이상)

- 엔드포인트: `POST https://www.megastudy.net/Entinfo/correctRate/main_rate_ax.asp`,
  본문 `examSeq=<seq>&tabNo=1&selSubCd=<code>&selExamType=1`, 헤더 `Referer: https://www.megastudy.net/Entinfo/correctRate/main.asp`.
  응답은 CP949다. 국어 선택과목 탭이 있는 회차는 `selSubCd` `1004`(화법과작문)와 `1005`(언어와매체)를 둘 다 받는다.
  탭이 없는 회차는 `selSubCd`를 빼고 한 번만 받는다.
- 행 구조(2026-10-10 Claude 확인): `번호 | 정답 | 난이도 | 배점 | 정답률 | ①% ②% ③% ④% ⑤%`.
  회차 356은 두 탭이 있고(`selSubCd=1005` 요청으로 언어와매체 표 확인), 고2 회차 306은 탭 없이 한 표다.
- 회차 대응(`exam` 필드 기준, Claude가 목록 조회로 확인):

| questionId | fixture `exam` | examSeq | 상태 |
|---|---|---|---|
| corporate-law-q13 | 고3 2025년 10월 교육청 | 348 (2025.10.14 학력평가) | 사용 |
| dopamine-motor-control-q13 | 고3 2026년 3월 교육청 | 352 (2026.03.24 학력평가) | 사용 |
| information-asymmetry-free-marketplace-q13 | 고3 2027학년도 6월 평가원 | 356 (2026.06.04 모의평가) | 사용 |
| surface-tension-laplace-q16 | 고3 2027학년도 6월 평가원 | 356 | 사용 |
| mrna-vaccine-lipid-nanoparticle-q19 | 고2 2023년 3월 교육청 | 306 (고2 2023.03.23 학력평가) | 사용 |
| gongsun-long-later-mohists-q12 | 고3 2023년 4월 교육청 | 후보 308 (2023.05.10 학력평가) | **날짜 불일치**: 목록에 4월 회차가 없다. `DATE_MISMATCH_CANDIDATE`로 저장하고 주 지표에서 제외, 별도 표에만 싣는다 |

- 검증: 문항 번호 일치, 메가스터디 정답 번호와 `source-direct-runtime-v1.json`의 `answerChoiceId`(C1~C5 ↔ 1~5) 일치,
  다섯 비율 합 97~103. 사용 문항에서 하나라도 어긋나면 **멈추고 보고**한다.
- 저장: `external-rates.json`. 문항별로 `examSeq`, `selSubCd`별 `{ correctRate, choicePercents[5], difficulty, points }`,
  요청 URL·본문, `fetchedAt`, 원 응답 `sha256`, `status`(`USED` | `DATE_MISMATCH_CANDIDATE`).
  출처 표기: `megastudy-correctRate, 풀서비스 이용자 채점 기준, 내부 실험 전용(D-0109)`.
- 원 HTML은 `raw/`에 저장하고, `raw/.gitignore`에 `*`와 `!.gitignore`를 둔다.
- 기존 `external-rates.json`이 있으면 거부(재수집은 파일을 지운 뒤에만).

### 1-2. `prepare` (API 0)

- 원자료: `test-v5-multi-item-models.mjs` 90~101행과 같은 방식으로 `public/<id>.json` + `source-direct-runtime-v1.json`을
  `SourceDirectProblemBundleSchema`로 합친다(mRNA 그림은 `alt` 제외, 운영 투영과 같게).
- 지시문·스키마·원자료·`external-rates.json` 해시를 `FROZEN.json`에 고정한다. `prompts.json`, `sources.json` 저장.
- **외부 비율은 모델 요청에 절대 들어가지 않는다.** 테스트에서 요청 본문에 비율 숫자 문자열이 없음을 검사한다.

### 1-3. 지시문 (그대로 사용)

```
너는 수능 국어 독서 문항 분석가다. 지문, 〈보기〉, 발문, 다섯 선지, 정답, 공식 해설을 읽고 선지마다 다음을 분석한다.

1. 판정 근거(decisiveEvidence): 그 선지의 정오를 가르는 원문 구절. 지문·〈보기〉·발문의 문자열을 그대로 인용한다.
2. 근거 범위(evidenceSpan): SAME_SENTENCE(한 문장) / SAME_PARAGRAPH(한 문단 안 여러 문장) / CROSS_PARAGRAPH(여러 문단 결합) / PASSAGE_PLUS_SCENARIO(지문과 〈보기〉 결합).
3. 변형 종류(transformType): 선지가 근거를 어떻게 바꾸었는가.
   FAITHFUL_PARAPHRASE(충실한 재진술), INFERENCE_VALID(타당한 추론으로 참), DIRECTION_REVERSAL(인과·증감·논리 방향 역전),
   ATTRIBUTION_SWAP(주장·입장의 주체 교체), CONDITION_CHANGE(조건·한정의 누락·추가), SCOPE_CHANGE(범위 확대·축소),
   MAPPING_SHIFT(〈보기〉 요소를 지문의 다른 개념에 대응), UNSUPPORTED_ADDITION(근거 없는 내용 추가).
4. 변형 크기(transformSize): NONE / WORD(한 단어) / PHRASE(구) / STRUCTURE(문장 구조·관계).
5. 유인 태그(attractionTags): 수험생이 이 선지를 답으로 고르게 만드는 사고 오류. 정답 선지는 빈 배열로 둔다.
   발문이 '적절하지 않은 것'을 고르게 하면, 오답 선지를 고르는 것은 '맞는 진술을 틀렸다고 판단'하는 것임에 주의한다.
   POLARITY(발문의 적절/부적절 방향 처리 실패), REFERENT(기호·지시 대상 혼동), ATTRIBUTION(입장·주체 귀속 혼동),
   DIRECTION(인과·논리·증감 방향 오독), CONDITION(조건·한정 누락), SCOPE(범위 과잉 일반화·축소),
   MAPPING(〈보기〉 사례를 지문 개념에 잘못 대응), SURFACE_MATCH(지문 어휘와 표면적으로 일치해 그럴듯해 보임),
   PARAPHRASE_DISTANCE(맞는 내용이지만 재진술이 멀어 틀려 보임), MULTI_STEP(여러 근거를 결합하다 이탈),
   OUTSIDE_KNOWLEDGE(배경지식·상식에 기대 판단).
6. 유인 경로(attractionMechanism): 수험생이 이 선지를 고르게 되는 사고 경로를 한두 문장으로 쓴다. 정답 선지는 정답을 맞히는 데 필요한 핵심 판단을 쓴다.
7. 예상 선택 비율(predictedSelectionPercent): 고3 수험생 집단이 각 선지를 고를 비율(정수 %). 다섯 선지 합은 100이다.
   정답 선지의 비율이 예상 정답률이다.
```

### 1-4. 출력 스키마

`{ choices: [ { choiceId, isAnswer, decisiveEvidence: [{ source: PASSAGE|SCENARIO|STEM, quote }], evidenceSpan, transformType,
transformSize, attractionTags: [...], attractionMechanism, predictedSelectionPercent } ×5 ] }` — 열거값은 위 지시문 그대로, strict JSON schema.

검증(실패 시 1회 재시도, 다시 실패하면 칸을 `FORMAT_ERROR`로 저장):
choiceId 5개 정확히 일치, `isAnswer`가 정답과 일치, 비율 합 98~102, 정답 선지의 `attractionTags` 빈 배열.
인용 정확 일치는 실패 사유가 아니라 지표로만 기록한다(공백 정규화 후 부분 문자열 여부).

### 1-5. `run <model>`

- 모델 인자는 `gpt-6-luna` 또는 `gpt-6.1-sol`만 허용. OpenAI 직접 호출(`new OpenAI({ maxRetries: 0 })`), `reasoning: { effort: 'medium' }`,
  `maxOutputTokens` 8000, `timeoutMs` 90000. mRNA는 `input_image`(`detail: 'high'`) 포함.
- 일정: 6문항 × 3반복, 반복마다 문항 순서를 고정 시드로 돌린다. 칸 이름 `<questionId>-r<n>`.
- 상한: luna 40요청·0.5달러, sol 40요청·3.0달러. 가격(100만 토큰당) luna 입력 0.10·출력 0.50, sol 입력 2·출력 10,
  캐시 토큰도 입력 가격으로 보수 계산(`user-supplied official prices 2026-10-07`). 넘으면 `RUN_LIMIT`로 멈춘다.
- 원장 START/END/ERROR, 미완료 원장 재개 거부, 정책 거부(HTTP 400)는 재전송 없이 `POLICY_REFUSAL`로 저장.

### 1-6. `report`

주 지표는 `status: USED` 5문항(오답 선지 20개). 아래 지표를 화법과작문 탭과 언어와매체 탭 기준으로 **각각** 계산한다
(탭이 없는 고2 회차는 두 계산에 같은 값을 쓴다). 두 탭은 정답률 차이가 크다(정보 비대칭 13번 30% 대 47%, Claude 확인). 모델별로 반복별 값과
**3반복 평균 예측**(선지별 비율 평균) 값을 함께 낸다. 평균 예측의 P 집합도 같은 동률 규칙을 쓴다(비교는 소수점 그대로).

| 지표 | 정의 |
|---|---|
| 최다 오답 적중 | 문항 점수 = \|P ∩ A\| / \|P\|. P는 예측 오답 비율이 최대인 오답 선지 집합, A는 실제 최대인 오답 선지 집합(둘 다 동률 포함). 예측 동률 집합에서 균등 추첨했을 때의 기대 적중이다(2026-10-10 Codex 보고에 따른 Claude 보완). 문항 평균으로 보고한다. 우연 기준은 문항별 \|A\|/4의 평균으로 함께 보고한다(동률이 없으면 25%) |
| 문항 내 순위 상관 | 오답 4개의 예측·실제 비율 Spearman, 문항 평균 |
| 통합 상관 | 오답 선지 20개 전체의 예측·실제 비율 Spearman과 Pearson |
| 정답률 오차 | 정답 선지 예측 비율과 실제 정답률의 절대 오차, 평균 |
| 반복 안정성 | 3반복 최다 오답 일치 문항 수(세 반복의 P 집합이 모두 같은 문항), 선지별 예측 비율 표준편차 평균, `attractionTags` Jaccard 평균, `transformType` 일치율 |
| 형식 | 형식 오류·재시도 수, 인용 정확 일치율 |
| 비용 | 토큰, 추정 비용, 실제 응답 모델 |

부가 표: 화작·언매 탭 간 실제 비율 최대 차이(민감도), 공손룡 후보 회차 대조(별도 표, 주 지표 제외),
문항별 실제 비율 vs 모델별 평균 예측 비율과 반복별 태그·유인 경로 원문(사람 검토용 `REVIEW.md`).

산출: `RESULTS.json`, `REPORT.md`(수치·사실만), `REVIEW.md`.

## 2. 테스트 `scripts/test-trap-map-v0.test.mjs`

가짜 transport·가짜 fetch, 임시 폴더 사용:
CP949 응답 파싱(행 구조 샘플 HTML), 정답 불일치 시 정지, `DATE_MISMATCH_CANDIDATE` 처리, prepare 고정과 해시 변경 시 run 거부,
요청 본문에 외부 비율 미포함, mRNA 요청에 `input_image` 포함, 스키마 검증·재시도·`FORMAT_ERROR`, 상한 정지,
미완료 원장 재개 거부, 지표 계산(손으로 계산한 작은 예제와 일치, 동률 처리 포함).

## 완료 조건

- [x] `node --test scripts/test-trap-map-v0.test.mjs` 통과
- [x] `node scripts/test-trap-map-v0.mjs collect-rates` 성공, 사용 5문항 검증 통과, 요청 14 이하
- [x] `prepare` 성공, 외부 요청 0
- [x] `node --env-file-if-exists=.env scripts/test-trap-map-v0.mjs run gpt-6-luna`, 같은 방식으로 `run gpt-6.1-sol` 완료(각 18칸, 상한 내).
      키는 기존 실험처럼 node의 `--env-file-if-exists=.env`로만 읽는다(파일을 열어 보지 않는다).
- [x] `report`로 `RESULTS.json`·`REPORT.md`·`REVIEW.md` 생성
- [x] `git status`에 `raw/` HTML이 나타나지 않음

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 메가스터디 응답 구조가 위 행 구조와 다르거나, 사용 문항의 번호·정답이 어긋나거나, 네트워크가 막히면 멈추고 보고한다.
- 위 상한·요청 범위를 넘는 외부 요청이 필요해지면 실행 전 멈춘다.

## 결과 보고 (실행 후 작성)

- 실행 상태: **완료**. §1-6 보완 규칙(예측 최다 오답 P 집합·기대 적중·반복 P 집합 일치·평균 예측 동률)을 적용했다.
  기존 `external-rates.json` 재사용, 재수집 0회. `prepare`·두 모델 `run`·`report` 모두 종료 코드 0.
- OpenAI: luna 19요청·sol 18요청, 합계 37요청. 각 모델 18/18칸 `VALID`.
  추정 비용 합계 **$0.5462494**, 미확정 예약 **$0**. 사용자 제공 단가와 캐시 전체 입력 단가 적용.
- 변경 파일:
  - `scripts/test-trap-map-v0.mjs`: 기존 수집 구현을 유지하고 prepare·run·report를 구현했다.
    정확한 §1-3 지시문·strict 스키마·원자료·외부 비율·실행 스크립트 해시 고정, 고정 시드 문항 순서,
    source-only 요청, mRNA `input_image` high, 검증 1회 재시도, 원장 START/END/ERROR·비용 예약·상한·재개 거부,
    동률 지표·두 탭별 반복/평균 지표·안정성·후보 별도 표·사람 검토 원문을 포함한다.
  - `scripts/test-trap-map-v0.test.mjs`: 수집 테스트 4개에 prepare·run·report 테스트 12개 추가(총 16개).
  - 실험 폴더 `FROZEN.json`, `prompts.json`, `sources.json`.
  - 모델별 폴더 `gpt-6-luna/`, `gpt-6.1-sol/`: 각각 칸 JSON 18개, `requests.jsonl`, 모델별 `RESULTS.json`.
    실패한 첫 시도와 성공한 재시도의 원 응답은 luna 도파민 r1 칸 JSON에 함께 보존했다.
  - 실험 폴더 [`RESULTS.json`](../experiments/trap-map-v0-external-rates-2026-10-10/RESULTS.json),
    [`REPORT.md`](../experiments/trap-map-v0-external-rates-2026-10-10/REPORT.md),
    [`REVIEW.md`](../experiments/trap-map-v0-external-rates-2026-10-10/REVIEW.md).
  - 이 인계 문서의 완료 체크와 결과 보고 절.
- 검증 결과:
  - `node --test scripts/test-trap-map-v0.test.mjs`: **16/16 통과**.
    CP949·번호/정답/비율 합·날짜 불일치 후보·수집 중복 거부, 준비 고정·해시 변경 거부,
    외부 비율 sentinel 숫자 미포함·요청 독립성·mRNA 이미지/alt 제외, strict 스키마·인용 지표,
    1회 재시도·FORMAT_ERROR·HTTP 400 무재전송·네트워크 중단·미완료 원장/칸 유실 재개 거부,
    요청/보수 비용 상한, 손계산 동률·상관·안정성, 두 탭·후보 제외·소수 평균 예측·원문 보고를 확인했다.
  - `node scripts/test-trap-map-v0.mjs prepare`: 6문항·모델당 18칸, **외부 요청 0**.
  - `node --env-file-if-exists=.env scripts/test-trap-map-v0.mjs run gpt-6-luna`와 동일 방식 `run gpt-6.1-sol`: 성공.
    `.env`는 위 Node 옵션으로만 로드하고 파일 내용은 열람하지 않았다.
  - `node scripts/test-trap-map-v0.mjs report`: 세 결과 파일 생성 성공. 해석 문장은 작성하지 않았다.
  - 별도 Python 표준 라이브러리 계산(`/tmp/verify-trap-map-v0.py`): **158개 대조 통과**.
    두 탭·각 반복/평균의 적중·우연·Spearman·Pearson·정답률 오차, 안정성, 토큰 비용,
    인용 검사·원장 START/END 대응·고정 파일 해시를 독립 계산했다.
  - 실제 요청 **37/37개**의 원장 해시가 `sources.json`·`prompts.json`·고정 스키마만으로 재구성한 요청과 일치했다.
  - `external-rates.json` 해시 보존: `dbcf3a6f190093b5472ea69ff046b5ea4d73355df1dd12d74ca391cdbd1e59d2`.
  - `git status`에 raw HTML 0개, `git check-ignore`에서 HTML 9개 모두 제외. `raw/.gitignore`만 나타난다.

| 완료 조건 | 상태 | 확인 내용 |
|---|---|---|
| 지정 테스트 통과 | 완료 | 16/16 통과 |
| 실제 비율 수집·사용 5문항 검증·14요청 이하 | 완료(기존 자료 재사용) | 직전 수집 9/14요청·사용 5문항 9개 탭 행 검증 통과. 이번 수집 0요청 |
| prepare 성공·외부 요청 0 | 완료 | FROZEN.json·prompts.json·sources.json 생성, 외부 요청 0 |
| luna·sol 각각 18칸·상한 내 | 완료 | 모두 VALID 18/18. luna 19/40요청·$0.0393874/$0.5, sol 18/40요청·$0.5068620/$3.0 |
| RESULTS.json·REPORT.md·REVIEW.md 생성 | 완료 | 두 탭별 3반복/평균 주 지표, 안정성, 비용, 민감도, 후보 별도 표, 검토 원문 |
| git status에 원 HTML 없음 | 완료 | 원 HTML 9개 모두 ignored |

| 모델 | 입력 토큰 | 출력 토큰 | 캐시 입력(전체 입력에 포함) | reasoning(출력에 포함) | 추정 USD | 미확정 USD | 형식 실패 시도/재시도 | 최종 FORMAT_ERROR | 정확 인용 |
|---|---|---|---|---|---|---|---|---|---|
| gpt-6-luna | 66,704 | 65,434 | 45,673 | 37,452 | 0.0393874 | 0 | 1/1 | 0 | 240/245 |
| gpt-6.1-sol | 62,976 | 38,091 | 41,948 | 4,044 | 0.5068620 | 0 | 0/0 | 0 | 297/297 |

- 실패·복구 사실: luna 도파민 r1 첫 출력은 정답 선지 태그가 2개여서 `ANSWER_TAGS` 검증 실패.
  동일 입력 1회 재시도 후 통과했다. 최종 형식 오류·정책 거부·API 오류는 두 모델 모두 0칸.
- 계산 관례는 `FROZEN.json.metrics`와 `REPORT.md`에 명시했다: 평균 순위 동률, 상수 벡터 상관은 null,
  3회 유효 출력이 있어야 평균 예측 산출, 모집단 SD(ddof=0), 3개 반복쌍의 선지별 태그 Jaccard/변형 일치,
  빈 태그끼리 Jaccard=1. 안정성은 USED 5문항·각 5선지, 후보는 별도 표.
- 남은 문제/검토:
  - 공손룡은 날짜 불일치 후보 상태 유지, 주 지표 제외. 회차 일치 확정은 수행하지 않았다.
  - luna 인용 문자열 불일치 5건: 법인 r1 C3, 법인 r2 C2·C5, 공손룡 r3 C3·C5.
    인계 규칙대로 재시도 사유로 삼지 않고 원출력·인용 검사에 보존했다. sol 불일치 0건.
  - 함정 태그·유인 경로·판정 근거의 의미 검토와 결과 해석, 인계 문서 대비 diff 검토는 Claude가 수행할 차례다.
    실행자가 결과 해석이나 운영 반영을 수행하지 않았다.
- `memory/`·`packages/**`·기존 실험 폴더 수정, `.env` 열람, 커밋·푸시: 수행하지 않음.
  시작 시 보호 대상 2,247개 파일 중 2,245개 해시 동일. 동시 변경 감지: `memory/CURRENT_STATE.md`, `memory/DECISIONS.md`.
  두 파일은 이 실행에서 쓰지 않았다. 현재 D-0110 공개 코칭 형식 기록은 함정 지도 인계와 충돌하지 않는다.
  보호 경로 새 파일 3개: `memory/checkpoints/2026-10-10-v5-coaching-fix-test.md`, `memory/decisions/D-0110-public-coaching-format-haeyo-and-markdown.md`, `packages/pipeline/fixtures/experiments/problem-solving/public/.omc/state/sessions/4e53703c-99c2-4b8b-8704-a128d3266d8a/pre-tool-advisory-throttle.json`. 이 실행에서 생성한 파일이 아니다.
  시작 시 존재한 `packages/**` 파일 및 기존 `external-rates.json`은 종료 시 해시가 모두 동일하다.
