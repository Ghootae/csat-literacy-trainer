# 인계: luna 기호 오독 집계 1단계 — 저장 출력 추리기

- 날짜: 2026-11-03
- 작성: 코드 에이전트(메인 세션)
- 실행: executor 하위 에이전트(sonnet)
- 관련 질문: `memory/OPEN_QUESTIONS.md` Q-0030 맨 위 항목(판정기 자신의 기호 오독)

## 목표

`docs/experiments/` 아래 저장된 출력에서 **luna(`gpt-6-luna`)가 문제 풀이 6문항에 대해 쓴 출력**을
모두 찾아, 중복을 지우고, 기호(ⓐ~ⓔ, ㉠~㉤, (가)~(다) 등)가 luna 자신의 문장에 나오는 출력만
후보 파일로 남긴다. 외부 호출 없이 저장 파일만 읽는다. 오독 판정은 하지 않는다(다음 단계).

## 범위 밖

- 오독 여부 판정, 기호 정답표 작성, 보고서 작성.
- `docs/experiments/` 안 기존 파일 수정·삭제. 제품 코드·지시문·`memory/` 수정.
- 외부 API 호출.

## 손댈 파일과 계약

- 새 스크립트 `scripts/collect-luna-marker-outputs.mjs`(Node, 의존성 추가 없음).
- 출력 폴더 `docs/experiments/luna-marker-misread-count-2026-11-03/`:
  - `candidates.jsonl`: 후보 한 줄에 한 출력.
  - `all-luna-outputs.jsonl`: 기호 유무와 상관없이 찾은 luna 출력 전부(같은 필드, 원문 `outputText`는 빼도 됨).
  - `INVENTORY.md`: 폴더별 표 — 읽은 파일 수, 파싱 실패 파일 수, luna 출력 수(중복 제거 전), 6문항 luna 출력 수,
    기호 후보 수. 맨 아래에 전체 합계, 중복 제거 뒤 수, 형식을 알 수 없어 건너뛴 파일 경로 목록.

### 찾는 방법(형식이 폴더마다 다르다)

알려진 형식(전부가 아님, 직접 확인하며 늘린다):

1. 짝 파일 `*.request.json` + `*.response.json`(예: `v58-conclusion-2026-10-29/regression-recheck/requests/`).
   request는 `{caseId, request:{model, instructions, input:[{content:[{text}]}], text:{format:{name}}}}`,
   response는 OpenAI 응답 원본(`model`, `instructions`, `output_text`).
2. 세션 묶음 파일(예: `v5-provider-compare-1017-2026-10-22/gpt-6-luna-medium/S2-r3.json`):
   상위에 `config`, `requests[]` 안에 `output_text`. 같은 폴더의 `requests.jsonl`에 요청 본문이 있을 수 있다.
3. `*.jsonl` 기록(`ledger.jsonl`, `*.records.jsonl`, `requests.jsonl` 등): 줄마다 JSON.

일반 규칙: JSON을 재귀로 걸으며 문자열 `output_text`가 있는 객체를 출력으로 잡는다. 모델은 그 객체 또는
가장 가까운 조상·짝 요청의 `model`/`config`로 정하고, `luna`가 들어간 것만 남긴다(`gpt-6-luna`,
`gpt-6-luna-medium` 등). 모델을 정할 수 없는 출력은 `model: "UNKNOWN"`으로 `INVENTORY.md`에 수만 적는다.

### 후보 한 줄의 필드

- `id`: `output_text`의 sha256 앞 16자. 같은 `output_text`는 한 줄로 합치고 발견 위치는 `locations[]`(파일 경로·caseId 등)에 모두 넣는다.
- `folder`, `folderDate`(폴더 이름의 날짜, 없으면 null). `folderDate`가 2026-10-07 이전이면 제외(v5 이후 범위)하고 수만 INVENTORY에 적는다.
- `model`, `callKind`: 응답 스키마 이름(`text.format.name`, 예 `problem_feedback_assessment`, `problem_feedback_end_explanation`)
  또는 instructions 첫 줄로 정한다. 정할 수 없으면 `UNKNOWN`.
- `promptVersion`: instructions 첫 줄 제목(예 `# 문제 풀이 판정 v5.8` → `v5.8`) 또는 기록에 있는 버전 값. 없으면 null.
- `questionId`: 요청 입력의 `source.questionId` 또는 기록의 `questionId`. 아래 6개 중 하나가 아니면 제외.
  `corporate-law-q13`, `dopamine-motor-control-q13`, `gongsun-long-later-mohists-q12`,
  `information-asymmetry-free-marketplace-q13`, `mrna-vaccine-lipid-nanoparticle-q19`, `surface-tension-laplace-q16`.
- `sessionKind`: 선택한 `choiceId`(요청 입력 `selection.choiceId` 등)가
  `packages/pipeline/fixtures/experiments/problem-solving/source-direct-runtime-v1.json`의 `answerChoiceId`와 같으면
  `CORRECT`, 다르면 `WRONG`, 알 수 없으면 `UNKNOWN`. `selectionNumber`도 있으면 넣는다.
- `studentText`: 요청에 있는 학생 근거·후속 응답 원문(있으면, 없으면 null).
- `fields`: `output_text`를 JSON으로 파싱해 luna 자신의 문장이 담긴 칸만 경로와 함께 펼친 목록
  `[{path, text}]`. 포함: `reason`, `reconstructedPath[]`, `errors[].description`, 이름에 `question`·`Question`이
  들어간 칸(보기 포함), `coaching` 계열, `diagnosis`, `endExplanation` 및 마지막 설명 칸(`firstChoice`,
  `reselection`, `answer` 등)과 그 아래 문자열, `keyRelationCoverage[].element`. 제외: 이름이 `quote`인 칸,
  `studentEvidence`, `sourceEvidence`(원문·학생 인용이라 luna 문장이 아님). 파싱 실패면 `fields: null`, `parseError: true`.
- `markers`: `fields` 문자열에서 찾은 기호 목록. 정규식 `[ⓐ-ⓩ]|[㉠-㉭]|\((가|나|다|라|마)\)|\[[A-E]\]`.
- `outputText`: 원문(`candidates.jsonl`에만).

`candidates.jsonl`에는 `markers`가 하나 이상인 출력만 넣는다.

## 완료 조건

- [ ] `node scripts/collect-luna-marker-outputs.mjs`가 오류 없이 끝나고 위 세 파일을 만든다(다시 돌려도 같은 결과).
- [ ] 알려진 점검 사례가 후보에 있다: `v5-provider-compare-1017-2026-10-22/gpt-6-luna-medium/S2-r3.json`의 출력
      (`reason`에 "ⓓ가 빨간 옷이 필요한데 없다는 뜻" 포함), `questionId: gongsun-long-later-mohists-q12`, `sessionKind: CORRECT`.
- [ ] sol·terra·deepseek·gemini 출력이 후보에 하나도 없다(모델 값 집계로 확인해 보고).
- [ ] `INVENTORY.md`에 폴더별 수와 건너뛴 파일 목록이 있다.
- [ ] 결과 보고에 다음 수를 적는다: 전체 luna 출력(중복 제거 전·후), 6문항·v5 이후, 기호 후보 수,
      후보의 문항별·`callKind`별·`sessionKind`별·`promptVersion`별 수, `UNKNOWN` 수.

## 중단·보고 조건

- 이 문서와 코드·자료가 충돌하거나 설계 판단이 필요해지면 멈추고 충돌 내용과 선택지를 보고한다.
  예: 상당수 출력에서 모델·문항·선택을 정할 수 없을 때, 같은 출력이 서로 다른 문항으로 기록돼 있을 때.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다.
- 커밋하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/collect-luna-marker-outputs.mjs`(새 파일), `docs/experiments/luna-marker-misread-count-2026-11-03/{candidates.jsonl, all-luna-outputs.jsonl, INVENTORY.md}`(새 파일, 생성물). 기존 실험 파일·제품 코드·`memory/` 수정 없음, 외부 호출 없음, 커밋 없음.
- 테스트 결과: 스크립트 두 번 실행해 세 파일 해시 동일(재실행 같은 결과). 파싱 실패 파일 0, 형식을 몰라 건너뛴 파일 0.
  - 완료 조건 점검: S2-r3 출력은 후보에 있음(`gongsun-long-later-mohists-q12`, `CORRECT`, 선택 C4, 기호 ⓓ·ⓔ, `reason`에 "ⓓ가 빨간 옷이 필요한데 없다는 뜻" 포함). 후보 228건의 모델은 전부 `gpt-6-luna`(sol·terra·deepseek·gemini 0).
  - 수치: luna 출력 2179(중복 제거 전)->1665(후), 6문항·v5 이후 2145->1664, 기호 후보 263->228. 후보 문항별 gongsun 197·dopamine 24·information-asymmetry 7(corporate·mrna·surface-tension은 원자료에 기호가 없어 0). callKind별 problem_feedback_v4_assessment 139·ASSESSMENT 33·problem_feedback_assessment 28·problem_feedback_v4_end_explanation 21·problem_feedback_end_explanation 6·blank_check 1. sessionKind별 CORRECT 175·WRONG 53·UNKNOWN 0. promptVersion별 v3 기반 v4 연결 후보 139·problem-feedback-v5 33·v5.3 13·v5.8 6·v5.7 4·v5.1 4·v5.7-1 1·null 28.
  - UNKNOWN: 모델 UNKNOWN 223(전부 `holistic-verdict-shadow-2026-10-08/mock/responses.jsonl`, mock 응답이라 luna 집계 밖), 문항 미상 luna 출력 1(`v5-provider-compare-1017-2026-10-22/preflight-gpt-6-luna-medium.json`, 연결 점검 출력 `{"answer":5}`), 후보 중 callKind·sessionKind UNKNOWN 0, 같은 출력이 다른 문항·선택으로 기록된 충돌 0.
- 남은 문제:
  - 문항·선택을 요청 입력에서 못 얻는 폴더는 대체 규칙으로 정했다: 지문·선지 원문 대조(blank_check, examiner_strategy, conclusion_audit), 폴더 `cases.json`(thought-diagnosis, multi-item, provider-compare, substitution), 원 세션 `src`/`correctChoice`(coaching-fix). 이 규칙의 정확도는 표본 점검을 하지 않았다.
  - `trap_map_v0` 19건은 학생 선택이 없는 분석 호출이라 sessionKind가 UNKNOWN이다(후보에는 없음).
  - provider-compare-1017 출력은 callKind가 기록의 `kind` 값 `ASSESSMENT`이고 promptVersion이 `problem-feedback-v5`라 다른 폴더(`v5.x`)와 표기가 다르다.
  - end explanation의 `choiceId`는 마지막 선택(finalSelectedChoice), 첫 선택은 `firstChoiceId`에 따로 있다. sessionKind는 `choiceId` 기준이다.
  - 후보 중 promptVersion null 28건은 instructions 제목이 없는 end explanation 호출이다.
