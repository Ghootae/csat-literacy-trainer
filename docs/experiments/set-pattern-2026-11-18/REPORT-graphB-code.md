# 그래프 1차 코드 보고 (REPORT-graphB-code)

2026-11-25. 인계 문서 `CLI-graphB-code.md`. 실행: `executor` 하위 에이전트(sonnet) 구현, 메인 세션(코드 에이전트) 검토·기준 갱신. API·codex 호출 없음, 생성 실행 없음.
경로: V5 = `docs/experiments/deep-item-v5-2026-11-18`, SP = `docs/experiments/set-pattern-2026-11-18`.
결정 기록: 5-a와 2-d 충돌은 Ghootae가 **방안 A**(새 이름 배치 채택, 5개 SVG 기준 갱신)로 정했다(2026-11-25).

## 1. 바꾼 파일과 함수

| 파일 | 바꾼 것 |
|---|---|
| `V5/graph/render.mjs` | `validateSpec` 확장(새 필드 검증). 새 도우미 `resolvePoint`, `yAtX`, `xAtY`, `guideGeom`, `crossMarkList`. `analyze`: 교점 y 보존, 눈금 이름에서 단위 제거. `readingText`: 세로 기호 눈금 줄·기준선 줄·교점 기호·눈금 단위 제거. `renderSvg`: 세로 기호 눈금, 기준선(guides), 교점 점·기호(crossMarks), 곡선 이름 배치(전체 이름, 끝점 겹침·오른쪽 여백 회피, 지시선), 범례 선 모양 |
| `V5/run.mjs` | `checkGraphPlan` import, 상수 `GRAPH_PLAN_SENTENCE`(RULES_V=6 + 갈래에 graph일 때만 값, 아니면 빈 문자열), 3단계 출력 지시에 graphPlan 문장, `graphPlans` 수집·3단계 것으로 덮어쓰기, 기계 점검에 `it.graphPlanCheck`와 '그래프 계획 오류: …', 3b·3c 문구에 `·graphPlan`(같은 조건일 때만). git diff 기준 run.mjs 변경은 아래 numstat 한 줄 분량(길게 늘어진 지시문 줄 4개 수정 + 추가) |
| `V5/graph/plan-check.mjs`(새) | `checkGraphPlan(graphPlan, graphSpec, passage)` → `{ok, errs}`: graphPlan 없음 / xAxis·yAxis label이 variables 미포함(공백·괄호·단위 떼고) / relation 0개 또는 3개 이상·인용이 지문에 그대로 없음(공백 정리 후 부분 문자열) / series id 집합 불일치 / shapeFrom이 지문·보기 아님 |
| `V5/kind-graph-v6.md` | '## 먼저 쓰는 것: graphPlan (2026-11-25)' 절(웹 결정 문안 그대로) + '## 형식: graphSpec' 코드 블록에 yAxis.ticks·guides·crossMarks 예와 설명 줄 |
| `V5/graph/render.test.mjs`(새) | 2-a~f 각 시험 + 회귀 9개 |
| `V5/graph/plan-check.test.mjs`(새) | graphPlan 검사 시험(정상·축 불일치·인용 없음·계열 id 불일치 등) |
| `SP/graph-census/hand/` | `s3-monopoly-v2.spec.json`, `s1-auxin-v2.spec.json`과 각 `.spec.svg`·`.spec.txt`·`.png` |
| `SP/graph-census/regress-after/` | 새 render로 그린 회귀 9개(파일 18개) |

하지 않은 것(그래프 2차): shape→점 계산, 점 계열(선 없는 점), 격자, 선 굵기, 계열 사이 색칠.

## 2. 회귀 결과

회귀 9개: `doppler-12`, hand s1~s4, tax-incidence-excise-A·B(V2), auxin-growth-A·B(V1). 수정 전에 현재 render로 다시 그려 `regress-before`와 바이트 동일함을 먼저 확인했다.

| 명세 | 읽기 판(txt) | SVG |
|---|---|---|
| doppler-12 | 동일 | 동일 |
| hand/s1-auxin | 단위 줄만 | 동일 |
| hand/s2-hysteresis | 동일 | 이름·범례 줄만(2-d) |
| hand/s3-monopoly | 단위 줄만 | 이름 줄만(2-d) |
| hand/s4-etf | 단위 줄만 | 이름·범례 줄만(2-d) |
| tax-incidence-excise-A V2 | 동일 | 이름·범례 줄만(2-d) |
| tax-incidence-excise-B V2 | 단위 줄만 | 이름·범례 줄만(2-d) |
| auxin-growth-A V1 | 동일 | 동일 |
| auxin-growth-B V1 | 단위 줄만 | 동일 |

### 2-1. 읽기 판에서 단위 버그(2-e)로 바뀐 줄 (이것이 txt 차이의 전부)

- auxin-growth-B V1 5행: `0μmol/L` → `0`
- s1-auxin 5행: `M₁M, M₂M` → `M₁, M₂`
- s1-auxin 10, 11, 16, 17, 23, 24, 26행(통과·부호·교차 줄): `M₁M`·`M₂M` → `M₁`·`M₂`
- s3-monopoly 4행: `Q₁Q, Q₂Q` → `Q₁, Q₂`
- s3-monopoly 14, 15행(교점 줄): `Q₂Q`, `Q₁Q` → `Q₂`, `Q₁`
- s4-etf 4행: `t₁t … t₅t` → `t₁ … t₅`
- s4-etf 24, 25, 26행(교점 줄): `t₂t`, `t₄t`, `t₅t` → `t₂`, `t₄`, `t₅`
- tax-incidence-excise-B V2 5행: `0원, 40원, 80원, 120원` → `0, 40, 80, 120`

### 2-2. 방안 A: SVG 5개에서 바뀐 줄 diff 목록 (`diff regress-before regress-after`)

**확인 결과: 5개 모두 바뀐 줄이 곡선 이름 `<text>`, 범례 `<text>`, 범례 선 `<line … data-role="legend-swatch">` 뿐이다.** `<path>`(곡선), 축, 눈금, 표시 점 줄은 변하지 않았다(`render.test.mjs`가 곡선 `<path>` 줄 동일도 검사). `<text>`·`<line>` 외 변경 줄: 0개(위 diff 출력에서 grep 확인).

`<` = 수정 전, `>` = 수정 뒤.

| SVG | 수정 전 | 수정 뒤 |
|---|---|---|
| s2-hysteresis | `<text x="64" y="382">혈장 약물 농도</text>` (범례, 선 모양 없음) | `<line x1=64 x2=92 y=377.5 … legend-swatch>` + `<text x="98" y="382">혈장 약물 농도</text>` |
| | `<text x="466.3" y="229.9">혈장</text>` (곡선 끝에 첫 낱말만) | `<text x="456.3" y="225.9" text-anchor="end">혈장 약물 농도</text>` (전체 이름) |
| s3-monopoly | `<text x="504.0" y="177.3">한계비용곡선</text>` (오른쪽 여백 밖으로 잘림) | `<text x="494.0" y="173.3" text-anchor="end">한계비용곡선</text>` |
| s4-etf | 범례 `<text>` 2줄(`시장 가격`, `실시간 추정 순자산가치`), 선 모양 없음 | 범례 `<line>` 2줄(실선, `stroke-dasharray="7,5"` 점선) + `<text x="98">` 2줄 |
| | `<text x="504.0" y="75.9">시장</text>`·`<text x="504.0" y="75.9">실시간</text>` (같은 좌표에 겹쳐 글자가 깨짐) | `<text x="494.0" y="71.9" text-anchor="end">시장 가격</text>`·`<text x="494.0" y="97.9" text-anchor="end">실시간 추정 순자산가치</text>` |
| tax-incidence-excise-A V2 | 범례 `<text>` 2줄(`㉠ 공급자에게 부과`, `㉡ 수요자에게 부과`) | 범례 `<line>` 2줄(실선·점선) + `<text x="98">` 2줄 |
| | `<text x="504.0" y="122.9">㉠</text>`·`<text x="504.0" y="122.9">㉡</text>` (같은 좌표, 겹침) | `<text x="494.0" y="118.9" …>㉠ 공급자에게 부과</text>`·`<text x="494.0" y="144.9" …>㉡ 수요자에게 부과</text>` |
| tax-incidence-excise-B V2 | 범례 `<text>`(`도자기용 점토 시장(공급자 과세)`) | 범례 `<line>`(실선) + `<text x="98">` |
| | `<text x="504.0" y="48.7">도자기용</text>` (첫 낱말만) | `<text x="494.0" y="44.7" text-anchor="end">도자기용 점토 시장(공급자 과세)</text>` |

기준 갱신: 이 5개 SVG는 `regress-after/`가 새 기준(골든)이다. `regress-before/`는 수정 전 기록으로 그대로 둔다(덮어쓰지 않음). `render.test.mjs`는 이 5개를 ① 수정 전과 견줘 "사라진 줄이 `<text>`뿐, 새 줄이 `<text>`·legend-swatch·name-leader뿐, `<path>` 동일", ② `regress-after` 골든과 바이트 동일로 검사한다.

## 3. 새 도구 그림 비교 (hand/s3-monopoly-v2, s1-auxin-v2)

기출: 독점 `/Users/mac/Projects/suneung_db/output/assets/69c08eeefa5063deffe1bf3c/img_001.jpg`, 옥신 `/Users/mac/Projects/suneung_db/output/assets/6a22950f86fd308968e11320/img_001.png`. 그림: `SP/graph-census/hand/s3-monopoly-v2.png`, `s1-auxin-v2.png`.

**s3 독점 v2**
- 새로 쓴 것: yAxis.ticks P₁·P₂, guides(ⓐ에서 세로축까지 수평 점선, Q₁ 수직선(점 참조), Q₂ 수직선(숫자 + `to:"d"`)), crossMarks로 교점 ⓑ·ⓒ.
- 같아진 것: P₂ 수평 점선과 기호 눈금(v1의 가장 큰 차이), 교점 점, 곡선 이름이 잘리지 않음.
- 남은 차이: 이름에서 곡선을 가리키는 화살표 없음(한계수입곡선 이름이 가로축 선에 걸림), 원점 O 표시 없음, 기출에 없는 점 기호 ⓐ가 붙음, 가로축 이름 위치·글꼴 다름.

**s1 옥신 v2**
- 새로 쓴 것: yAxis.ticks +·0·−, 0 높이 수평 점선, M₁ 수직선(계열 b의 peak 참조), M₂ 수직선(x=39.2에서 계열 c까지). v1의 표시 점 ⓜ·ⓝ은 없앰.
- 같아진 것: 세로 기호 눈금(v1은 0만), M₁·M₂ 수직선이 점·기호 없이 그어짐.
- 남은 차이: 가로축이 y=0에 놓여 0 높이 점선이 축 선과 겹쳐 안 보임, 곡선 선 굵기 구분 없음(ⓒ가 굵음), 곡선 이름 ⓐⓑⓒ 위치(기출은 봉우리 위, 우리는 끝점 옆), M 수직선이 기출은 가로축 아래 기호까지 이어지나 우리는 가로축에서 끝남, ⓐ 앞의 빈 구간 없음.

## 4. 시험 결과 (메인 세션이 다시 실행해 확인)

| 시험 | 결과 |
|---|---|
| `V5/graph/render.test.mjs` | 39/39 통과 (새 도구 20 + 회귀 19. 방안 A 골든 비교 포함) |
| `V5/graph/plan-check.test.mjs` | 9/9 통과 |
| `V5/classify-v6.test.mjs` | 13/13 통과 |
| v5 경로 프롬프트(RULES_V 미지정) 1-search·2-select·3-assemble | 수정 전 기준과 바이트 동일(하위 에이전트가 DRY_RUN으로 확인, `git show HEAD`의 수정 전 run.mjs로 돌린 결과와도 동일) |
| v6 + graph 경로 | run.mjs 변경에 의한 프롬프트 차이는 3단계 1행(graphPlan 문장)뿐. 나머지 차이는 `kind-graph-v6.md` 변경분. 1-search·2-select 동일 |
| v6 + case·table(그래프 없음) | 수정 전과 동일 |

미확인: 3b·3c 문구 변경과 run.mjs의 graphPlan 연결 줄(덮어쓰기·checkGraphPlan 호출)은 API 단계라 실행해 보지 못했다(`node --check`와 DRY 실행의 import 통과만). 처음 실제로 도는 곳은 ④ 2단계 생성이다.
저장소 안 임시 출력(`out-dry-tmp-*`)은 지웠다(0개 확인).

## 5. kind-graph grep

- `## 먼저 쓰는 것: graphPlan (2026-11-25)`: 1곳
- `shapeFrom`: 2곳

## 6. eval-repair·leak-fix 확인

- `eval-repair.mjs` 171행은 `{...it, …}`, `leak-fix.mjs` 104행은 `{ ...it, … }`로 항목을 만들어 graphPlan이 그대로 보존된다. 코드 수정 없음. `dispute-fix.mjs`도 수정 없이 `node --check` 통과.
- 후보(그래프 2차): eval-repair 프롬프트가 graphSpec 축 이름 수정을 허용해, 수리가 축 이름을 바꾸면 graphPlan의 `variables`와 어긋날 수 있다. 이번 범위 밖.

## 7. 한계

- 곡선 이름 배치는 먼저 놓은 이름과의 겹침만 피한다. 곡선·표시 점 기호는 피하지 않아 tax-B에서 이름과 ⓓ 기호가 맞붙고 s4에서 이름이 곡선에 살짝 닿는다.
- 기준선의 `to`가 계열 id일 때 곡선과 만나는 곳은 선형 보간이라 smooth 곡선과 미세하게 다를 수 있다.
- 기출 그래프 14개를 모두 새 도구로 다시 그려 본 것은 아니다(2개만).

## 8. 다음 스텝

| 할 일 | 외부 전송 | 사용자 판단 |
|---|---|---|
| ④ 1단계(지문 생성) 결과를 기다려 2단계 지시문에 경제 V2(graph) 시험 넣기. 3b·3c·graphPlan 연결 줄은 그때 처음 실제로 돈다 | 있음(2단계 생성, API) | 2단계 전송 승인 |
| 그래프 2차(shape→점 계산, 점 계열, 격자, 선 굵기, 계열 사이 색칠, eval-repair 축 이름 수정 정합) 여부 | 없음 | 필요한지 판단 |
