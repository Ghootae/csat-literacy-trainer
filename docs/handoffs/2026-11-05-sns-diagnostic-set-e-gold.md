# 인계: SNS 진단 세트 E의 분석 골드·선지 연결 생성

- 날짜: 2026-11-05
- 작성: Claude(코드 에이전트)
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0201-sns-diagnostic-set-e.md`, 절차 `memory/decisions/D-0151-analysis-gold-standard-procedure.md`
  (`docs/ANALYSIS-GOLD-PROCEDURE-2026-10-20.md`), 선지 연결 `memory/decisions/D-0162-choice-link-layer-direction.md`

## 목표

D-0201 세트 E 4지문의 분석 골드(지도·입장·관계 유형)와 선지 연결(3회)을 기존 도구로 만든다. 단계 사이의 동결 선택·입장
확정·선지 연결 덮어쓰기는 코드 에이전트가 하므로, 각 단계 끝에서 멈추고 보고한다.

| passageId | set_id | 제목 | 비고 |
|---|---|---|---|
| consciousness-cognition-ga | 69c0114f78128b2a9bedd8fc | 의식과 인지 과정에 대한 철학적 논의 (가) | 복합, `--section`, 짝 `consciousness-cognition-na` |
| consciousness-cognition-na | 69c0114f78128b2a9bedd8fc | 같은 글 (나) | 복합, 짝 `consciousness-cognition-ga` |
| plastic-polymerization | 69bc1c89a029f488d9e54e5b | 플라스틱의 중합 반응과 물리적 성질 | 단일 |
| audio-perceptual-coding | 69bc96468095df3b8c51460e | 오디오 신호의 디지털 저장과 지각부호화 압축 | 단일 |
| horse-race-reporting | 69c0041afa5063deffe1a036 | 경마식 보도와 선거 방송 토론회 | **분석 골드 이미 동결**(`docs/experiments/analysis-gold-calibration-2026-10-20/horse-race-reporting/`, 관계 유형 `.../classify/horse-race-reporting/classify.json`). 선지 연결만 한다 |

작업 폴더: `docs/experiments/sns-diagnostic-gold-2026-11-05/`(새로 만든다). 폴더 구성은 `docs/experiments/analysis-gold-calibration-2-2026-10-21/`를 따른다.

## 범위 밖

- 지시문·점검표·스크립트 수정 금지. 지시문은 아래 파일을 **무수정**으로 쓴다. 스크립트에 기능이 없어 막히면 멈추고 보고한다.
- 동결 회차 고르기, `stance-final.json` 덮어쓰기, 선지 연결 `overrides.json` 작성은 하지 않는다(코드 에이전트 몫).
- 다리 층((가)–(나) 관계), 출제자 전략 글, 앱 연결(`packages/**`)은 하지 않는다.
- 기존 실험 폴더(경마식 포함)는 읽기만 한다. 파일 삭제 금지.
- `git add`·`commit`·`stash` 금지. `memory/**`, `AGENTS.md`는 건드리지 않는다.

## 단계와 계약

외부 전송은 아래 "외부 전송 승인" 범위 안에서만 한다. 단계마다 dry-run을 먼저 하고 통과해야 실제 전송한다.
응답이 없는 서버·연결 오류(503 등)는 같은 회차를 한 번만 다시 보낸다(`--round <n>`, `<id>/rerun-r<n>/`). 응답이 온 실패(형식
오류·거부·검증 실패)는 다시 보내지 않는다.

### 1단계: 변환 + 지도 3회 → 멈춤

1. `scripts/import-suneung-passage.mjs`로 4개 지문 파일을 `<작업 폴더>/passages/`에 만든다. 복합 지문은 `--section`(가·나)과
   `--pair-passage-id`를 쓴다. 문단 수·각주 수를 보고에 적는다.
2. 지도: `scripts/run-analysis-map-gongsun.mjs --prompt docs/experiments/analysis-gold-calibration-2-2026-10-21/MAP-PROMPT-v2.md`,
   `gpt-6.1-sol` medium, 지문당 3회. 명령 형태는 `analysis-gold-calibration-2-2026-10-21`의 `RUN.json`과
   `docs/handoffs/2026-10-20-analysis-gold-calibration-maps.md`를 따른다.
3. 보고: 지문·회차별 구조 검증 6항목 결과, 비용, 실패·재전송. **여기서 멈춘다.** 코드 에이전트가 동결본(`frozen-map.json`,
   `FROZEN.md`)을 만든 뒤 2단계를 지시한다.

### 2단계: 입장 + 관계 유형 → 멈춤

1. 입장: `scripts/run-analysis-stance-gongsun.mjs --prompt docs/experiments/analysis-gold-calibration-2-2026-10-21/STANCE-PROMPT-v2.md`,
   sol medium, 동결본당 1회. 검증 3항목 결과를 보고한다.
2. 관계 유형: `scripts/run-relation-classify.mjs`, 지시문 `docs/experiments/relation-classify-2026-10-19/CLASSIFY-PROMPT-v3.md`,
   sol medium, 동결본당 1회. 검증 결과와 기타 비율을 보고한다.
3. **여기서 멈춘다.** 코드 에이전트가 `stance-final.json`을 만든 뒤 3단계를 지시한다.

### 3단계: 선지 연결 3회 → 멈춤

1. `<작업 폴더>/targets.json`을 만든다. 형식은 `docs/experiments/choice-link-2026-10-22/targets-calib.json`과 같다(복합 지문은
   `key`+`sections`). 경마식 보도는 기존 동결 지도·`stance-final.json`·`classify.json` 경로를 그대로 가리킨다.
   어휘 문항은 넣지 않는다: 의식과 인지 17번, 플라스틱 11번. 넣을 문항: 의식과 인지 12~16, 경마식 4~7, 플라스틱 8~10, 오디오 14~17(16문항).
   어휘 문항을 빼는 방법이 기존 형식에 없으면 멈추고 보고한다.
2. `scripts/run-choice-link.mjs --prompt docs/experiments/choice-link-2026-10-22/CHOICE-LINK-PROMPT-v5.md --runs 3`, sol medium,
   결과는 `<작업 폴더>/choice-link/runs/`. 명령 형태는 `docs/experiments/choice-link-2026-10-22/runs/ui-v5/RUN.json`을 따른다.
3. `scripts/freeze-choice-link.mjs`를 덮어쓰기 없이 한 번 돌려 미결(`UNRESOLVED_TYPE`)·위반·`explanationAgreement: DIFFER` 목록을
   보고한다. **여기서 멈춘다.**

## 외부 전송 승인

사용자 승인(2026-11-05, "세트 E의 외부 전송 승인(순서대로)"): ③′(판정용 원자료 묶음) 뒤에 1→2→3단계 순서로 실행한다.
OpenAI `gpt-6.1-sol` medium, 재시도 없음(응답 없는 서버·연결 오류만 같은 회차 1회 재전송, 상한 안).

| 단계 | 보내는 내용 | 요청 수 | 실제 청구 상한 |
|---|---|---|---|
| 1 지도 | 지문 원문(의식과 인지 (가)·(나), 플라스틱, 오디오) | 12 | $2.5 |
| 2 입장 | 원문·동결 지도 명제 | 4 | $0.5 |
| 2 관계 유형 | 원문·동결 지도 | 4 | $0.5 |
| 3 선지 연결 | 원문·문항·선지·정답·EBSi 해설(trainer 보강 자료), 4세트 16문항 | 12 | $3.0 |

합계 32요청·상한 $6.5. 보내기 전에 요청 수가 이 표와 같은지 확인한다.

## 완료 조건

- [x] 1단계: 4개 지문 파일, 지도 12회 결과와 검증 보고
- [x] 2단계: 입장 4회·관계 유형 4회 결과와 검증 보고
- [x] 3단계: `targets.json`(16문항), 선지 연결 3회 결과, 덮어쓰기 없는 동결 시험 결과 보고 (3회차 3키는 재전송, 아래 참고)
- [x] 단계마다 `RUN.json`·`ledger.jsonl`에 모델·요청 수·비용이 남음
- [x] 관련 테스트: `node --test scripts/run-analysis-map-gongsun.test.mjs scripts/run-analysis-stance-gongsun.test.mjs scripts/run-relation-classify.test.mjs scripts/run-choice-link.test.mjs scripts/freeze-choice-link.test.mjs` 통과(스크립트를 고치지 않았으면 기존 상태 그대로)

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 승인 범위(요청 수·비용 상한)를 넘게 되면 보내기 전에 멈춘다.
- 지도 3회 모두 구조 검증 실패인 지문이 있으면 그 지문은 2단계로 넘기지 말고 보고한다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `docs/experiments/sns-diagnostic-gold-2026-11-05/` 아래 새 산출물만(passages, 지문별 폴더, classify, targets.json, choice-link/). 스크립트·지시문·동결 지도 무수정. 이 문서만 수정.
- 테스트 결과: 지정 5개 테스트 파일 72건 통과, 실패 0(2026-11-05 3단계 후).
- 남은 문제: 선지 연결 3회차에서 plastic·audio·horse-race 3키가 응답 없음(아래 3단계 결과). 재전송 판단 필요. 동결 시험은 이 3키가 2회차 기준이라 잠정.

### 1단계 결과 (executor, 2026-11-05)

- 변환: consciousness-cognition-ga 문단 4·각주 0, -na 4·0, plastic-polymerization 5·0, audio-perceptual-coding 5·0. dry-run 4개 모두 예시 지도 검증 통과, 외부 전송 0.
- 지도: 12요청, 재전송 0, 실패 0. 모든 회차 구조 검증 6/6 통과. 실제 청구 합계 $1.1381(상한 $2.5 이내). 지시문 해시 변화 없음.
- 산출물: `docs/experiments/sns-diagnostic-gold-2026-11-05/`(passages, dry-run, 지문별 폴더). 2단계 미착수.

### 2단계 결과 (executor, 2026-11-05)

- 입장(STANCE-PROMPT-v2, sol medium, 동결본당 1회): 4요청, 재전송 0, 실패 0. 검증 3항목 모두 통과: 의식과 인지 (가) 3/3, (나) 3/3, 플라스틱 3/3, 오디오 3/3. 비용 (가) $0.0377, (나) $0.0212, 플라스틱 $0.0390, 오디오 $0.0300, 합계 $0.1279(상한 $0.5 이내). 지시문 해시 변화 없음.
- 관계 유형(CLASSIFY-PROMPT-v3, sol medium, 동결본당 1회): 4요청, 재전송 0, 실패 0. 검증 모두 통과. 기타(OTHER) 비율: (가) 1/32, (나) 0/22, 플라스틱 0/29, 오디오 0/37, 전체 1/120(기타 이름 "설명 대상" 1건). 비용 합계 $0.1725(상한 $0.5 이내; 지문별 $0.0475/$0.0341/$0.0448/$0.0461). 지시문 해시·보호 파일(원문·동결 지도) 변화 없음.
- 요청 수: dry-run에서 입장 4개·관계 유형 4개(관계 32/22/29/37) 확인 후 전송(4+4). 외부 전송은 dry-run 0, 실제 8요청.
- 산출물: 입장 `docs/experiments/sns-diagnostic-gold-2026-11-05/<id>/stance/`(stance.json, node-stances.json, STANCES.md, validation.json, RUN.json, ledger.jsonl). 관계 유형 `docs/experiments/sns-diagnostic-gold-2026-11-05/classify/`(`<id>/classify.json`, RUN.json, summary.json, REPORT.md, ledger.jsonl), 대상 목록 `.../classify-targets.json`, dry-run `.../dry-run/<id>-stance/`, `.../dry-run/classify/`. `stance-final.json`은 만들지 않았다. 3단계 미착수.

### 3단계 결과 (executor, 2026-11-05)

- fixed 파일 변경: 코드 에이전트 결정에 따라 `--fixed`를 원본 `docs/experiments/choice-link-2026-10-22/supplement-fixed.json` 대신 실험 전용 사본 `docs/experiments/sns-diagnostic-gold-2026-11-05/supplement-fixed.json`(원본 4항목 + 오디오 q17 표 전사 1항목)으로 썼다. 원본은 그대로. 이유: 원본에 오디오 q17 전사가 없어 dry-run이 `FIGURE_UNFIXED: question 17`로 중단.
- targets.json: 4키(의식과 인지 복합 `key`+`sections`, 플라스틱, 오디오, 경마식=기존 calibration 경로). 어휘 문항은 `isVocabulary`(source_tags '어휘')가 자동 제외해 형식상 방법 있음. dry-run 문항 5/3/4/4=16, 요청 12 확인. dry-run은 예약 합계 $5.98로 `overCap: true`였으나(최악 예약값), 실행은 실제 청구 누적 기준으로 멈추므로 상한 $3.0 안에서 실제 전송(승인된 실제 청구 상한 기준).
- 명령: `node --env-file-if-exists=.env scripts/run-choice-link.mjs --targets <W>/targets.json --out <W>/choice-link/runs --prompt .../CHOICE-LINK-PROMPT-v5.md --fixed <W>/supplement-fixed.json --runs 3 --max-requests 12 --usd-cap 3.0`. 지시문 해시·보호 파일 변화 없음.
- 결과: 12요청 전송, 9건 PARSED(검증 전부 통과: 1·2회차 4키 8건 + 의식과 인지 3회차), 3건 API_ERROR(3회차 plastic: Request timed out, 약 29분 후, 예약액 $0.3145 청구 처리; 3회차 audio·horse-race: Connection error, 청구 0). 실제 청구 합계 $1.3586(상한 $3.0 이내).
- 재전송 안 함: 응답 없는 오류라 규칙상 재전송 대상이나, `--round 3`은 4키 전체를 다시 보내고 이미 12요청을 써서 승인 12요청을 넘기므로 보내기 전에 멈췄다. 코드 에이전트 판단 필요.
- 동결 시험(`freeze-choice-link.mjs`, overrides 없음, `--out <W>/choice-link/frozen`): 의식과 인지 3회, 나머지 3키는 2회차 기준으로 돎(잠정). 80선지, 위반 0.
  - UNRESOLVED_TYPE 4: plastic q10#1·#2·#5(r1 PAIR_SWAP vs r2 DIRECTION), audio q17#4(r1 CAUSE_SWAP vs r2 DEGREE).
  - explanationAgreement DIFFER 2: 의식과 인지 q15#1(해설의 "물질세계" 이유가 원문에 없어 ADDED_CONTENT로 연결), audio q17#4(해설은 A·C 주파수로 폭 대소를 단정하나 원문 기준은 차폐음 주파수이고 표에 없음).
- 산출물: `docs/experiments/sns-diagnostic-gold-2026-11-05/choice-link/`(runs/, frozen/, run-stdout.json, dry-run/), `supplement-fixed.json`.

### 3단계 재전송·동결 (코드 에이전트, 2026-11-06)

- 사용자 "3요청 재전송 승인". `targets-rerun-r3.json`(3키) `--round 3 --max-requests 3`, 3/3 PARSED, $0.2839. 3단계 합계 15요청 $1.6425.
- 3회 동결 `choice-link/frozen-3runs/`: 위반 0, 미결 0, DIFFER 1(의식과 인지 q15 ①, 덮어쓰지 않음). 기록 `choice-link/FROZEN.md`.
