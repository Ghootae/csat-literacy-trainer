# 인계: 분석 지도 공손룡 2단계 v2(판정 기준 수정 재판정 + 오류 집계)

- 날짜: 2026-10-17
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0143-analysis-map-gongsun-pilot.md`(2단계 절, 오류 집계 규칙 절, v2 절)
- 앞 단계: `docs/handoffs/2026-10-16-analysis-map-gongsun-stage2.md`

## 목표

- 같은 77라운드·1,552단위를 `JUDGE-PROMPT-v2.md`로 다시 판정한 결과가 `stage2-v2/`에 있다.
- 오류 집계 규칙(오류 사건·대표 위치·생김/유지/해소)이 순수 함수로 구현되어 v1(`stage2/`)과 v2 결과 모두에 적용된다.
- v1과 v2를 나란히 놓은 비교 보고서 `COMPARE-v1-v2.md`가 있다. 지정한 사례 목록의 v1 → v2 라벨이 표로 보인다.

## 범위 밖

- `stage2/`의 기존 산출물 변경(읽기만). `frozen-map.json`, `JUDGE-PROMPT.md`, `JUDGE-PROMPT-v2.md`, `MAP-PROMPT.md` 변경.
- 결합 규칙(포섭·불일치·나열형) 변경. 기존 `combineRound` 그대로 v2에도 적용한다.
- 라운드 단조성 규칙, 교차 관계 재배정, 지문 단위 판정. 이후 논의다.
- `packages/**`, `.omc/logs/**`, `memory/**` 변경. 해석·평가 문장.

## 손댈 파일과 계약

### 1. 스크립트 확장 `scripts/run-analysis-judge-gongsun.mjs`

- `--prompt v2` 옵션: 지시문을 `JUDGE-PROMPT-v2.md`, 출력 폴더를 `stage2-v2/`로 바꾼다. 옵션이 없으면 지금과 똑같이 동작한다(v1, `stage2/`). 두 실행의 원장·판정 파일은 섞이지 않는다.
- 추출·라운드·단위·요청 형식·모델·인용 검사·결합은 v1과 같다. 구조화 출력 스키마 이름은 `analysis_judgment_v2`.
- 상한: 요청 2,000(이 v2 실행의 시도 기준), 실제 청구 $1. 비용 계산·연속 연결 오류 차단·`--resume`은 현재 코드 그대로.
- `RUN.json`에 프롬프트 버전과 v2 지시문 해시를 기록.

### 2. 오류 집계 `errorEvents(rounds, judgmentRows, map)` (순수 함수, 내보내서 테스트)

**문장 나누기 `segmentStudentTurn(text)`**: 학생 차례 하나를 구간으로 나눈다. 1차로 `.` `?` `!` `。` 줄바꿈에서, 2차로 각 조각을 `,` `;` `/`에서 나눈다. 구분 기호는 앞 구간에 붙인다. 공백만 남은 구간은 버린다. 각 구간은 `{ turnIndex(학생 차례 순번, 1부터), start, end, text }`(원문 오프셋).

**사건 만들기** (대화별, 라운드별):
- 라운드 k의 `finalLabel === 'CONTRADICTS'`인 노드·관계 판정마다, 유효 인용(학생 차례의 부분 문자열)을 학생 차례에서 찾는다(처음 나타난 위치). 인용과 겹치는 구간마다 사건 키 `dialogueId|turnIndex|segmentIndex`에 그 단위를 건다. 인용이 여러 구간에 걸치면 구간마다 건다.
- 유효 인용이 없는 ✕ 판정은 `unlocated` 목록에 넣는다.
- 사건 레코드: `{ key, dialogueId, paragraphId, turnIndex, segmentText, round, units: { nodes: [...], relations: [...] }, representative }`.
- `representative`: 걸린 **노드**들을 모두 덮는 가장 낮은 노드(동결 지도 나무의 최소 공통 조상, 노드 하나면 그 노드). 관계만 걸린 사건은 관계 양 끝 중 이 문단 노드들의 공통 조상.

**라운드 연결 꼬리표** (라운드 k의 사건마다):
- `NEW` 생김: 사건의 학생 차례가 라운드 k에서 새로 들어온 차례(= 라운드 k의 마지막 학생 차례).
- `KEPT` 유지: 이전 차례에 속하고, 라운드 k-1에도 같은 키 사건이 있었다.
- `LATE` 늦게 잡힘: 이전 차례에 속하는데 라운드 k-1에는 같은 키 사건이 없었다.
- 라운드 k-1에 있던 사건이 라운드 k에 없으면 `RESOLVED` 해소 또는 `DROPPED` 사라짐을 기록한다. 그 사건에 걸렸던 노드·관계 중 하나 이상이 라운드 k에서 `DIRECT`·`PARTIAL`이고 그 인용이 라운드 k의 새 학생 차례에 있으면 `RESOLVED`, 아니면 `DROPPED`.

### 3. 비교 보고서 `docs/experiments/analysis-map-gongsun-2026-10-16/COMPARE-v1-v2.md` (+ `compare-v1-v2.json`)

결과만 쓴다. 해석·평가 문장 없음.

**요약표 (v1 | v2)**: 노드·관계 라벨 분포, 원문 복사 대조군 노드 라벨 분포, 결합 패턴 수, 인용 강등·무효 인용 수, 평균 인용 길이(글자), 오류 사건 수(꼬리표별 NEW/KEPT/LATE, 그리고 RESOLVED/DROPPED 수), `unlocated` 수, 라운드 k≥2 라벨 상승·하락 수.

**라벨 전이표**: 노드·관계 각각 v1 라벨 × v2 라벨 4×4 개수.

**지정 사례표**: 아래 사례마다 단위별 `v1 라벨(인용) → v2 라벨(인용)`. 대화는 `dialogueId` 접두어 + 문단 + 라운드로 찾는다(단순 형식은 `sh:<세션 앞 8자>`로 시작하고 해당 문단인 대화. 둘 이상이면 모두 표시).

| 묶음 | 대화 | 문단 | 라운드 | 단위 |
|---|---|---|---|---|
| 오탐 후보 F1 | `v4:5f5ba586` | p1 | 1 | G1 |
| F2 | `v4:8e2ead22` | p1 | 1 | G1 |
| F3 | `v4:d1b8b941` | p3 | 1 | P3-5, P3-10 |
| F4 | `v4:19b3cc0d` | p3 | 1 | P3-10, R11 |
| F5 | `sh:54bfce80` | p3 | 1 | P3-10 |
| F6 | `sh:54bfce80` | p4 | 1 | P4-4, P4-10, C4-2, C4-3, C4-4, R17, R18, R19 |
| 부분 후보 F7 | `v4:81557ccb` | p2 | 1 | P2-8, P2-9 |
| 실제 오류 T1 | `sh:578fc718` | p4 | 1 | P4-11, C4-4, C4-5, G4 |
| T2 | `sh:54bfce80` | p4 | 2 | P4-4, C4-4 |
| T3 | `sh:54bfce80` | p5 | 2 | P5-4, P5-8, C5-2 |
| T4 | `v4:83601960` | p2 | 1 | P2-5, C2-1 |
| T5 | `sh:578fc718` | p5 | 2 | P5-6, P5-8 |
| 해소 확인 T6 | `v4:83601960` | p2 | 2 | P2-5, C2-1 |

**오류 사건 목록**: v1과 v2 각각, 대화·라운드별 사건(학생 구간, 걸린 단위 수, 대표 위치, 꼬리표). 길면 대화당 사건이 있는 라운드만.

## 완료 조건

- [ ] `node --test scripts/run-analysis-judge-gongsun.test.mjs scripts/run-analysis-map-gongsun.test.mjs` 통과. 새 테스트: `--prompt` 옵션의 경로 분기(기본값 불변), `segmentStudentTurn`(문장·쉼표·줄바꿈·구분 기호 위치), 사건 묶기(같은 구간 여러 단위 → 1사건, 두 구간에 걸친 인용 → 2사건, 무효 인용 → unlocated), 대표 위치(단일 노드, 형제 노드 → 부모, 관계만), 꼬리표 NEW/KEPT/LATE/RESOLVED/DROPPED 각각.
- [ ] v2 dry-run 요청 수 1,552, 요청 본문의 instructions가 v2 절 본문과 일치.
- [ ] v2 실제 실행 완료, 실패 0 또는 `--resume`으로 0, 요청 ≤ 2,000·실제 청구 ≤ $1.
- [ ] `stage2/` 파일 해시 실행 전후 동일. 보호 파일 해시 동일. `packages/**`·`.omc/logs/**`·`memory/**` 변경 없음.
- [ ] `COMPARE-v1-v2.md`, `compare-v1-v2.json`, `stage2-v2/` 산출물(`REPORT.md` 포함) 존재.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 전송 승인 범위: 사용자가 2026-10-17에 승인한 v2 재판정(D-0143 v2 절) 안에서만 보낸다. 그 밖의 전송·모델·요청 수가 필요하면 실행 전에 멈춘다.
- 지정 사례의 대화를 찾지 못하거나 둘 이상 찾으면 표에 그대로 적고 보고에 남긴다(멈추지 않음).
- dry-run 요청 수가 1,552가 아니면 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/run-analysis-judge-gongsun.mjs`(`--prompt v2`, `--compare`, `segmentStudentTurn`, `lowestCommonAncestor`, `errorEvents`, 비교 함수), `scripts/run-analysis-judge-gongsun.test.mjs`(테스트 6개 추가), `docs/experiments/analysis-map-gongsun-2026-10-16/stage2-v2/`(신규), `COMPARE-v1-v2.md`, `compare-v1-v2.json`, 이 절. `stage2/` 파일 해시와 보호 파일 해시 전후 동일, `packages/**`·`.omc/logs/**`·`memory/**` 변경 없음.
- 테스트 결과: `node --test scripts/run-analysis-judge-gongsun.test.mjs scripts/run-analysis-map-gongsun.test.mjs` 34개 통과, 실패 0.
- v2 dry-run: 요청 1,552(대화 47, 라운드 77), 요청 본문 instructions가 v2 절 본문과 일치, 스키마 이름 `analysis_judgment_v2`.
- v2 실제 실행: 요청 1,552, 판정 1,552 전부 OK, 실패 0(resume 불필요), 실제 청구 약 $0.3668.
- 남은 문제: (1) 라운드 k≥2 라벨 상승·하락은 ABSENT<PARTIAL<DIRECT 순서로 세고 ✕가 낀 변화는 별도 행으로 뒀다(인계 문서에 ✕ 순위 규정 없음). (2) 문장 나누기에서 `?!`·`...`처럼 연속한 구분 기호는 앞 구간에 모두 붙였다. (3) 지정 사례의 대화는 모두 1건씩 찾았다.
