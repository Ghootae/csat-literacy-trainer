# 인계: JEV 선택 확률 이동 시험 실행

- 날짜: 2026-10-29
- 작성: 코드 에이전트(메인 세션)
- 실행: executor 하위 에이전트(sonnet)
- 설계: `docs/review/jev-choice-shift-draft-2026-10-29.md`(사용자 검토 완료: W5 문구 승인, 사전 점검 뒤 본 실행 "전송" 승인)
- 관련: `memory/OPEN_QUESTIONS.md` Q-0040, `memory/decisions/D-0036-jev-product-work-parked.md`(보류 중 사용자 지시로 하는 탐색 실험)

## 목표

- 설계 초안 2장의 23조건 × 5회 = 115요청을 JEV에 보내고, 원 요청·응답과 집계를 실험 폴더에 남긴다.
- 해석과 보고서는 쓰지 않는다(메인 세션이 함). 집계 표까지만 만든다.

## 범위 밖

- 보고서(REPORT-*.md), `memory/` 수정, 커밋.
- 설계 초안의 조건·문구·지시문·판정 기준 변경.
- 제품 코드(`packages/`, `apps/`) 수정.

## 손댈 파일과 계약

새 폴더 `docs/experiments/jev-choice-shift-2026-10-29/`:

- `run.mjs`: 실행 스크립트(이 폴더 안에 둔다).
  - 엔드포인트 `POST https://jevplayground.com/api/evaluate`, 헤더 `Content-Type: application/json`, `Authorization: Bearer ${JEV_API_KEY}`(`.env`에서 읽음, 값은 어디에도 출력·저장하지 않음), `redirect: 'error'`.
  - 요청 본문: `{ state, questions: { Q1: { type: 'choice', instructions, criteria } } }`.
  - `instructions`(모든 조건 같음): `아래 지문과 문항을 읽고, 이 문항의 정답일 가능성이 가장 높은 선지를 고르라.`
  - `criteria`: 라벨 `C1`~`C5`, 값은 선지 문장 원문. 반복 r(1~5)마다 키 삽입 순서를 한 칸씩 돌린다(r1: C1..C5, r2: C2..C5,C1, …). 라벨 이름은 고정.
  - `state`: 문항 본문 + (조건에 따라) 학생 풀이 블록. 정답 번호·공식 해설은 넣지 않는다.
    - 19번 본문: 사전 점검과 같은 문자열. 만드는 법: `docs/experiments/v58-conclusion-2026-10-29/jev/request-sample.json`의 `stateA`에서 `[정답]` 앞까지 자르고 끝 공백 제거.
    - 16번 본문: 같은 구획 형식(`[지문]`, `[〈보기〉]`, `[그림 설명]`(그림이 없으면 구획 생략), `[발문]`, `[선지]` + `1. …`~`5. …`)으로 `packages/pipeline/fixtures/experiments/problem-solving/public/surface-tension-laplace-q16.json`(지문이 없으면 `packages/pipeline/fixtures/experiments/dialogue/passages/surface-tension-laplace.json`)에서 만든다. 19번 형식과 맞추는 것이 목적이다.
    - 학생 풀이 블록(학생 정보 없음 조건에는 붙이지 않음): 본문 뒤에 빈 줄 하나 + `[학생 풀이]\n학생은 N번을 골랐다.` 근거가 있으면 이어서 `\n근거: <원문>`.
  - 조건 23개와 근거 원문은 설계 초안 2장 두 표를 글자 그대로 쓴다. 표의 P1-b·P1-c는 앞 조건 문자열에 따옴표 안 문자열을 이어 붙인 것이다(P1-b = `ph 높이면 이온화 지질이 수소이온 덜 받아서 중성됨 -> 전하 없어지니까 소수성은 오히려 강해짐(약해지는 거 x).`, P1-c = P1-b + ` 그럼 소수성끼리 인력도 커져서 뭉침.`).
  - 조건 ID: `q19-0, q19-C5, q19-S12, q19-S12a, q19-S12b, q19-P1, q19-P1a, q19-P1b, q19-P1c, q19-N1, q19-N2, q19-AS, q19-CP, q19-C1, q19-W1, q16-0, q16-C3, q16-P2, q16-P3, q16-AS, q16-CP, q16-C5, q16-W5`.
  - 순서: 반복 r1의 23조건 → r2 … → r5. 요청 사이 7초. 실패(HTTP≠200, `ok`≠true, 확률 키가 C1~C5가 아님)는 같은 요청을 1번만 재시도하고, 그래도 실패면 기록하고 다음으로 간다. 최대 전송 수 130(재시도 포함)을 넘기지 않는다.
  - 실행 전에 `FROZEN.json`을 쓴다: 23조건의 선택 번호·근거 원문, 지시문, 두 문항 본문 문자열의 sha256, 스크립트 sha256. 19번 본문 sha256은 사전 점검 `state`와 같아야 한다(사전 점검 요청: `/private/tmp/claude-501/-Users-mac-Projects-csat-literacy-problem-solving-mvp/77279e0c-0f6c-41d2-bf58-929f162107f2/scratchpad/preflight-result.json`의 `payload.state`). 다르면 전송 전에 멈춘다.
- `requests.jsonl`: 한 줄에 `{conditionId, replicate, criteriaOrder, payload}`.
- `results.jsonl`: 한 줄에 `{conditionId, replicate, attempt, http, wallMs, latencyMs, probabilities, choice, confidence, usage, error}`.
- `aggregate.mjs` → `AGGREGATE.json`과 `AGGREGATE.md`:
  - 조건별 대상 선지 = 그 조건의 선택 번호(학생 정보 없음 조건은 정답: q19는 C5, q16은 C3).
  - P를 [0.001, 0.999]로 자르고 logit. 조건별 5회 P 값, 평균 P, 평균 logit, logit 폭(최대−최소).
  - Δ: 근거 조건 = 평균 logit − 같은 선택의 '선택만' 조건 평균 logit(q19 ⑤ → q19-C5, q19 ① → q19-C1, q16 ③ → q16-C3, q16 ⑤ → q16-C5). 선택 효과 = '선택만' − 학생 정보 없음(정답 선지 기준; 오답 '선택만'은 그 오답 선지의 P를 학생 정보 없음 조건에서 같은 선지 P와 비교).
  - 조건별 5선지 평균 분포 표.
  - P가 0.99 이상인 회차 수 표시(반올림 천장).
  - 총 전송 수, 실패 수, 토큰 합계, latencyMs 중앙값.

## 완료 조건

- [ ] `FROZEN.json`의 19번 본문 해시가 사전 점검 state 해시와 같음
- [ ] `results.jsonl`에 23조건 × 5회 모두 유효 응답(또는 실패 건이 목록으로 보고됨)
- [ ] `AGGREGATE.md`의 Δ 표에 근거 조건 17개(q19: S12, S12a, S12b, P1, P1a, P1b, P1c, N1, N2, AS, CP, W1 / q16: P2, P3, AS, CP, W5)가 모두 있음
- [ ] 키 값이 저장 파일 어디에도 없음(`grep`으로 확인)

## 중단·보고 조건

- 이 문서와 설계 초안이 충돌하거나 설계 공백(예: 16번 본문 구성 자료가 없거나 모호)을 만나면 멈추고 보고한다.
- 사전 점검과 응답 형식이 다르거나 연속 3회 실패하면 멈추고 보고한다.
- 승인 범위(115요청 + 재시도, 최대 130) 밖 전송은 하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `docs/experiments/jev-choice-shift-2026-10-29/` 안의 `run.mjs`, `aggregate.mjs`, `FROZEN.json`, `requests.jsonl`, `results.jsonl`, `AGGREGATE.json`, `AGGREGATE.md`, `run.log`(진행 로그, 키 없음). 그 밖 파일 변경 없음.
- 테스트 결과: 19번 본문 sha256 == 사전 점검 state sha256(`ffda2e83c6c3...`) 확인 후 전송. 총 115 전송, 실패 0, 재시도 0, 유효 115/115. 토큰 합계 293,800(입력 287,015, 출력 6,785). 키 값 grep 0건.
- 남은 문제: 16번 본문은 `surface-tension-laplace-q16.json`의 `passage`, `scenario`(→ `[〈보기〉]`), `stem`(→ `[발문]`), `choices`로 구성. `media`가 비어 `[그림 설명]` 구획 생략. 같은 파일의 `textAnnotations`(밑줄 표지)는 19번 형식에 없어 넣지 않음.
