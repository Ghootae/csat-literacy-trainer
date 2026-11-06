# 인계: E1 v3 "관계 먼저 설계" — A′·B v3 지시문, 스키마·코드 검사, dry-run

- 날짜: 2026-11-06
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0206-gold-based-item-generation-experiment-design.md` 보완 2(20~25). 이 문서와 다르면 D-0206을 따른다.
- 이전 인계: `docs/handoffs/2026-11-06-e1-item-generation-implementation.md`(v1 구현, 관례 동일)
- **이번 단계는 외부 전송이 없다.** 실제 API 호출은 하지 않는다. `--dry-run`만 실행한다.

## 목표

1. `--prompt-version v3`가 있다. A2·B만 v3 지시문·스키마·검사를 쓴다. A는 v3에서 쓰지 않는다(`--conditions A2,B`).
2. 지시문 3개를 새로 쓴다: `DESIGN-PROMPT-A2-v3.md`, `DESIGN-PROMPT-B-v3.md`, `WRITE-PROMPT-v3.md`(실험 폴더).
3. v3 검사가 시험으로 확인된다.
4. `--prompt-version v3 --conditions A2,B --out <EXP>/v3 --dry-run`이 16요청 파일을 만든다. 예상 비용 표가 `v3/DRY-RUN.md`에 있다.
5. v1·v2 동작과 기존 시험이 그대로다.

## 범위 밖

- 실제 전송, `memory/`, `packages/**`.
- 기존 v1·v2 지시문·결과 파일(`runs/`, `v2/`) 수정.
- 판정 기준 `JUDGE-DEPTH-v1.md` 수정. 판정·블라인드 묶음 만들기는 코드 에이전트가 따로 한다.
- 자기모순 검사 요청 추가(D-0206 23: 판정 신호로만 센다).

## 손댈 파일과 계약

실험 폴더 `EXP = docs/experiments/gold-item-generation-2026-11-06`.

### 1. 문장 번호 (공통 도우미, `scripts/run-item-generation.mjs`)

- 문단마다 `text.split(/(?<=[.?!])\s+/u)`로 문장을 나눈다. 문장 키는 `"<문단 index>:<문장 index>"`다.
- 구절 → 문장 키 집합: 공백을 지운 구절이 공백을 지운 문장에 들어 있거나, 문장이 구절에 들어 있으면 그 문장이다. 구절이 문장을 넘으면 여러 개가 나온다.
- 지도 단위 → 문장 키 집합:
  - 명제: `sourceQuote`로 구한다.
  - 노드: `childIds`를 재귀로 펼쳐 합집합을 낸다.
- **서로 다른 문장**: 양 끝의 문장 키 집합이 둘 다 비지 않고 겹치지 않는다.
- 참고: 코드 에이전트가 같은 규칙으로 측정한 문장을 넘는 관계 수는 법인 22/39, 표면 장력 29/35, 오디오 27/37, 플라스틱 18/29다. 명제 `sourceQuote`의 미대응은 0이었다. 이 수치를 시험 하나로 고정한다.

### 2. B v3 설계 입력

- v2 입력(`designInputB`)에 `relationCandidates`를 더한다.
- 후보 조건:
  - 지도 relations 가운데 양 끝이 서로 다른 문장이다.
  - `relationType`이 `ELABORATION`·`DEFINITION`·`DEVELOPMENT`가 아니다.
- 항목 형식: `{ id, fromId, toId, fromText, toText, name, relationType, crossParagraph }`. `crossParagraph`는 양 끝 문장 키의 문단 번호가 겹치지 않는지다.
- `map.relations` 전체도 그대로 넣는다. 사슬을 만들 때 쓴다.

### 3. 설계표 스키마 v3

v2 스키마에 아래를 더한다(strict). **필드 순서가 중요하다.** 자리 객체에서 `plannedRelations`가 `choices` 앞에 와야 한다. "관계 먼저"를 출력 순서로 강제하기 위해서다.

- 자리마다 `plannedRelations: [{ key, ... }]`(2개 이상은 지시문과 검사로 요구, 스키마는 배열).
  - B: `{ key, relationIds: string[] }`
    - `key`는 자리 안에서 쓰는 짧은 이름이다(예: "r1").
    - `relationIds`는 후보 id 1개이거나, 사슬이면 2개 이상이다.
    - 사슬의 관계 가운데 적어도 하나는 후보여야 하고, 나머지도 지도 relations에 있어야 한다.
  - A2: `{ key, fromQuote, toQuote, linkName }`
    - `fromQuote`·`toQuote`는 지문 원문 구절이다.
    - `linkName`은 관계 이름이다(예: "원인", "대비", "조건").
    - 사슬이면 `viaQuote`(중간 구절, nullable)를 둔다. 이 필드는 스키마에 항상 있고, 사슬이 아니면 null이다.
- 선지마다 `relationRef: string | null`(그 자리 `plannedRelations`의 `key`). `basis`·`twist` 앞에 둔다.
- 스키마 이름에 v3를 붙인다(예: `item_generation_design_b_v3`).

### 4. v3 코드 검사 (`validateDesign`, v3일 때만)

위반은 `violations`에 기록하고 재시도는 하지 않는다(기존과 같음).

1. 자리마다 `relationRef`가 null이 아닌 선지가 2개 이상이다. 모든 `relationRef`는 그 자리의 key를 가리킨다.
2. 계획 관계의 양 끝이 서로 다른 문장이다.
   - B는 사슬의 첫 관계 `fromId`와 마지막 관계 `toId`로 본다.
   - A2는 `fromQuote`·`toQuote`로 보며, 두 구절은 원문 부분 문자열이어야 한다(공백 차이는 info).
3. B: 계획 관계의 id가 지도에 있고, 적어도 하나가 후보다. 관계 선지의 `basis`에 계획 관계의 양 끝 id가 있다.
4. 관계 선지 중 FALSE인 것의 `twist`가 관계를 가리킨다.
   - B는 `targetIds`에 계획 관계 id 중 하나가 있다.
   - A2는 `targetQuote`가 `fromQuote`나 `toQuote`의 일부를 포함하거나 그 반대다.
5. `SELECT_CORRECT` 자리에는 FALSE 관계 선지가 1개 이상이다. 지문 전체로는 FALSE 관계 선지가 1개 이상이다.
6. 같은 관계를 지문 전체에서 3회 이상 계획하면 위반이다.
   - B는 관계 id 기준이다.
   - A2는 (`fromQuote`, `toQuote`) 쌍을 공백 제거 뒤 비교한다.

### 5. 집필 검사 (`validateItems`, v3일 때만)

- **정답 혼자 가장 김**: 공백을 뺀 글자 수 기준으로 정답 선지가 그 자리에서 가장 길고, 둘째로 긴 선지보다 길면 위반이다(`answer uniquely longest`). 같은 길이로 공동 최장이면 위반이 아니다.
- 기존 검사(발문 극성·이중 부정·기호·중복)는 그대로 둔다.

### 6. 집필 입력

- B: `resolveDesignB`가 선지의 `relationRef`를 풀어 넣는다. 형식은 `relation: { key, chain: [{ id, name, typeName?, fromText, toText }] }`다. `relationType`의 한국어 이름표가 없으면 영어 코드를 그대로 둔다.
- A2: 선지에 `relation: { key, fromQuote, toQuote, viaQuote, linkName }`를 붙인다.
- 집필 스키마(`items`)는 바꾸지 않는다.

### 7. 지시문 3개

v2 문서를 복사해 시작하고, 머리말에 v3 변경점을 적는다. 바꿀 내용은 아래와 같다.

**공통(설계 A2·B)**
- "관계 선지(v2)" 절을 "관계 먼저(v3)" 절로 바꾼다. 순서는 다음과 같다.
  1. 자리마다 먼저 이 문항에서 물을 관계를 2개 이상 고른다. 양 끝이 원문의 서로 다른 문장에 있는 관계여야 한다.
  2. 한 문장 안에 "~므로"로 이미 이어진 연결은 고르지 않는다.
  3. 관계 둘을 이어 붙인 사슬(A→B, B→C에서 A와 C를 잇기)을 쓸 수 있고 권장한다. 단, 이은 관계들이 같은 조건·상황·대상에서 성립해야 한다.
  4. 그다음 선지를 설계한다. 관계 선지는 `relationRef`로 그 관계를 가리킨다.
  5. 맞는 관계 선지는 관계를 진술한다.
  6. 틀린 관계 선지는 관계를 비튼다: 원인 바꿈·엉뚱한 이유·조건 옮김·방향 뒤집기·대비 쌍 뒤바꿈, 또는 지문에 없는 관계 덧붙이기.
  7. "적절한 것" 자리에는 틀린 관계 선지를 1개 이상 둔다.
  8. "적절하지 않은 것" 자리의 정답을 관계 선지로 강제하지 않는다.
  9. 같은 관계는 지문 전체에서 2회까지만 쓴다.
- 정답 선지만 관계 선지이거나 혼자 길어지지 않게 하라는 문장을 더한다.
- 나머지 품질 요구·비틂 표는 v2 그대로다.

**B**
- 입력 설명에 `relationCandidates`를 더한다.
- 계획 관계는 후보에서 고른다. 사슬의 나머지 고리는 `map.relations`에서 고를 수 있다.

**A2**
- 지도가 없으므로 관계를 지문에서 직접 찾아 `fromQuote`·`toQuote`(원문 그대로)와 `linkName`을 적는다.
- 관계 유형은 근거·인과·조건·대비·양보·목적·문제와 해결·적용·과정 가운데 하나다. 단순 부연·정의·전개는 관계로 고르지 않는다.

**집필 v3**
- v2 규칙 8을 "선지에 `relation`이 있으면 양 끝 내용을 **모두** 담아 이어 주는 말로 잇는다. 한쪽만 쓰지 않는다. 사슬이면 처음과 끝을 잇고, 중간 고리는 필요할 때만 쓴다"로 바꾼다.
- 규칙 5에 다음을 더한다: 정답 선지가 혼자 가장 길지 않게, 관계 선지가 아닌 선지도 비슷한 길이로 쓴다.
- 자기모순·이중 부정 규칙 9·10은 그대로 둔다.

### 8. 시험 (`scripts/run-item-generation.test.mjs`)

- 문장 넘는 관계 수 고정(1의 수치), 후보 필터(제외 유형 없음, 같은 문장 없음).
- v3 B·A2 예시 설계표(`exampleDesign` v3판)가 스키마와 검사를 통과한다.
- 각 검사(4의 1~6, 5)마다 위반 사례를 하나씩 둔다.
- 스키마 JSON에서 `plannedRelations`가 `choices`보다 앞에 있다.
- A2 v3 요청에 지도·후보 목록·비틂 표가 없다(v1 시험과 같은 방식).
- v1·v2 요청이 이 변경 전과 바이트 단위로 같다. 변경 전 dry-run 요청 해시와 비교하거나, v1·v2 경로가 v3 코드를 타지 않음을 확인한다.

## 완료 조건

- [ ] `node --test scripts/run-item-generation.test.mjs` 통과(기존 12 + 새 시험)
- [ ] `node --test scripts/build-generation-blind-review.test.mjs scripts/run-choice-link.test.mjs` 통과(회귀 없음)
- [ ] `npm test`가 작업 전과 같은 수치다(작업 전부터 2개 파일 실패, 1534 통과 — 이전 인계의 결과 보고 참고).
- [ ] dry-run 16요청 파일 생성, `v3/DRY-RUN.md`에 요청별 입력 크기·예상 비용·합계(상한 비교 `--max-requests 16 --usd-cap 2`)
- [ ] dry-run B 설계 요청 하나에서 `relationCandidates`가 있고 제외 유형이 없음을 눈으로 확인해 보고

## 중단·보고 조건

- 이 문서와 코드·시험·D-0206이 충돌하거나 설계 판단이 필요하면 멈추고 보고한다. 예: 문장 분할 규칙으로 측정 수치가 재현되지 않음, strict 스키마에서 필드 순서가 보장되지 않음.
- 외부 호출이 필요해지면 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 수정: `scripts/run-item-generation.mjs`(문장 번호 도우미, `relationCandidates`, v3 스키마 `SCHEMAS_V3`, `PROMPT_PATHS_V3`, v3 설계·집필 검사, v3 예시 설계표, `--prompt-version v3`, `main`의 `version`), `scripts/run-item-generation.test.mjs`(고정 자료의 지도·분류를 v3 시험이 쓰도록 확장, v3 시험 8개 추가).
  - 추가: `docs/experiments/gold-item-generation-2026-11-06/DESIGN-PROMPT-A2-v3.md`, `DESIGN-PROMPT-B-v3.md`, `WRITE-PROMPT-v3.md`, `v3/DRY-RUN.md`, `v3/dry-run/`(요청 16개), `v3/inputs/`(비틂 분포 4개).
  - 이 문서의 결과 보고 절.
- 테스트 결과:
  - `node --test scripts/run-item-generation.test.mjs`: 22 통과, 0 실패(기존 14 + v3 8. 인계 문서는 기존 12로 적었으나 실제 기존은 14).
  - `node --test scripts/build-generation-blind-review.test.mjs scripts/run-choice-link.test.mjs`: 34 통과, 0 실패.
  - `npm test`: 2개 파일 실패, 127개 통과(1590 테스트 통과). 실패는 `packages/app/src/boundary.test.ts`, `packages/pipeline/src/cli/axis-architecture-experiment.test.ts`(`.omc/adhoc/...` 파일 없음)로 작업 전과 같은 파일이다. 통과 수가 인계 문서의 1534와 다르나 vitest는 `scripts/*.test.mjs`를 돌리지 않고 이 작업은 `packages/**`를 건드리지 않았다(작업 전 수치를 이 워크트리에서 다시 재지는 않음).
  - v1·v2 dry-run 요청 40개의 SHA-1이 변경 전과 같다(변경 전 dry-run을 먼저 떠 두고 비교).
  - 문장을 넘는 관계 수가 법인 22/39, 표면 장력 29/35, 오디오 27/37, 플라스틱 18/29로 재현되고, 명제 `sourceQuote` 미대응은 0이다(시험으로 고정).
- dry-run 요청 수·예상 비용:
  - 16요청(A2 8, B 8), 예약액(상한) 합계 $3.551. 자세한 표는 `docs/experiments/gold-item-generation-2026-11-06/v3/DRY-RUN.md`.
  - `--max-requests 16 --usd-cap 2` 비교: 요청 수는 이내, 예약액은 $2를 넘는다(`overCap: true`).
  - B 설계 요청의 `relationCandidates`: 법인 14/39, 표면 장력 18/35, 오디오 15/37, 플라스틱 13/29. 구체화·정의·전개 유형은 없다.
- 남은 문제:
  - **상한 충돌**: 인계 문서의 `--usd-cap 2`는 요청마다 최대 출력 16,000토큰을 예약하는 계산 때문에 16요청 합계($3.551)보다 작다. 이 상한으로 실제 전송하면 도중에 멈춘다. 설계 변경 없이 두었고 전송 승인 때 상한(예: 4)을 정해야 한다.
  - 판단한 세부(인계 문서가 정하지 않은 곳): 문장·문단 index는 0부터. 관계 선지 `basis` 검사는 사슬이면 처음 `fromId`와 마지막 `toId`만 요구한다. 집필 입력에서 v3 설계표의 `plannedRelations`·`relationRef`는 지우고 선지의 `relation`으로 대신한다(A2도 같음). A2의 `viaQuote`가 null이 아니면 원문 부분 문자열인지 검사한다. 관계 유형의 한국어 이름표는 `run-relation-classify.mjs`의 `TYPE_KO`를 썼다. 계획 관계가 2개 미만이거나 key가 겹치면 위반으로 기록한다.
  - `v3/inputs/`에 비틂 분포 파일이 같이 생겼다(기존 폴더 관례와 같음).
