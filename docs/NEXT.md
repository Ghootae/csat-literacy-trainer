# 다음 재개 지점 (2026-07-25)

## 학생 루프 시뮬레이션 발견 (2026-07-26) — 차후 반영 예정 (아직 미구현)
명실론 지문(공손룡 vs 후기 묵가) p2·p3·p4 + 표제로 학생 역할 시뮬레이션. Claude가 평가기 역할
(API 0). 다섯 경로를 실제로 겪으며 아래 설계 근거 확보. **아직 코드/스펙 미반영 — 원재료 보존용.**

확정 후보(교차검증 전이지만 강한 근거):
- **완료 게이트**: 모순=하드 게이트(다음 단계 차단+해당 항목 필수 재제출), 미포착/불명확=소프트
  제안(선택), 관계보존=참고만. (p4에서 하드 경로 실증: ✗ 감지→차단→교정→해제)
- **피드백 오블리크성은 판정 유형별 스펙트럼**: 모순=원문 문구 그대로 짚어 재확인("몇 개인가?"),
  미포착/불명확=위치만 가리키는 우회 넛지, 관계보존=참고만. 정답은 어느 경우도 직접 안 줌.
- **결과 화면 = 위계 수형도 + 커버리지 오버레이**(●직접/◐병치/○참고·미확인/✗모순/■영역판정).
  학생이 요약할 땐 골드 미노출, 결과에서 처음 봄 → 정독 철학과 맞음.
- **수정 보상은 시각적 전환으로**: ⚠→●, ✗→● 하이라이트가 "재독→다듬기"의 강화 장치. 텍스트
  칭찬보다 강력. 하드 게이트는 벌이 아니라 "여기만 고치면 통과"의 집중 교정 장치.
- **2단계(표제) = 별도 평가기 아님**: regionSemanticVerdict를 지문 최상위 조직 관계에 적용한 것.
  "명실 관계"(주제만) vs "두 입장의 대립"(관계보존) = 1단계와 동형. → 같은 프레임·Claude 유지.
- **불명확(unclear) 상태 필요**: "가리키나 내용이 안 잡힌" 항목(p3 항목②)은 evidenced도
  not_evidenced도 아님 → 5번째 evidence 상태 또는 피드백 레이어 'clarify' 신호로 처리 검토.
- **부분 정답 보존**: 모순 응답이어도 맞은 항목은 관계보존 인정(좌절 방지·국소 교정).
- **보상**: 최종 상태 + 교정 이력을 긍정적으로 표시(감점 회수 아님, 성장 기록).

남은 결정: 상호작용 단위(문단별 표제 vs 지문 전체 종합 — 반론형은 지문 전체가 자연스러움) /
불명확 상태를 evidence에 넣을지 피드백에만 둘지 / 점수 롤업 공식(weights.ts globalWeight 재사용) /
focal-scope 문단 층위 집계. 전체 시뮬레이션 상세는 이 세션 트랜스크립트에 있음.

## 학생 루프 교차검증 완료 (2026-07-27) — 광합성 지문(과정형+문제해결형)
로그: docs/experiments/student-loop-photosynthesis-2026-07-27.md (API 0, 손 시뮬레이션)
P3(캘빈 회로=순환)·P4(실제 골드/오라클)·P5(두 공간 분업)·2단계 표제로 위 가설 8개 검증.
- **6개 유지**(하드/소프트 게이트, 오블리크 피드백, 수형도+오버레이, 시각적 보상, 부분 정답 보존).
- **H5 부분 반증**: 2단계 표제 프레임은 동형이나 **최상위 관계가 복수**일 수 있음(광합성 =
  문제→해결 축 + C3/C4 대조·기제 축, 둘 다 정당한 표제). overallCategory(regions, focalId)의
  focal 단수 전제로는 정당한 응답이 미포착으로 떨어짐 → **후보 집합 채점**으로 수정 필요.
  선행 작업: 지문 층위 골드 노드(문단 표제들의 상위 조직)가 아직 없음.
- **H6 위치 확정**: 불명확은 regionSemanticVerdict 6번째 값 아님(게이트·롤업이 전부 갈라짐).
  **질의 층위 evidence 5번째 상태 + 피드백 clarify 신호**, 영역 판정은 topic_only로 접고 소프트.
- **상호작용 단위 결정**: 양자택일 아님 — 2단 구조(1단계 문단별 + 2단계 전체 표제)를 모든 지문에
  고정하고, 지문 유형은 2단계 focal 후보 도출에만 반영.
- 신규 N1: `assessment.ts:141-149` relation_preserved 참고 세부를 **전량 나열** → 과정형(명제 10+)
  에서 우수 응답에 5~7개가 붙어 결손표처럼 읽힘. **상한 2~3개**(globalWeight 상위) + 나머지는
  수형도 오버레이(○)로만. 잘한 응답에 가장 긴 텍스트가 붙는 현상은 H4와 충돌.
- 신규 N2: **과정형 관계는 하위 유형별 압축 허용도가 다름** — 선형 인과 연쇄=양끝 보존이면
  관계보존 / 순환=되먹임 생략 시 부분관계 / 공간·주체 분업=두 항 병치 필수. v0 생성기 프롬프트
  (원칙 A~F)에 이 구분 없음 → **과대평가 위험 미검증**(기존 회귀는 focal이 전부 비순환형이었음).
- 부수 확인: `partial_relation_preservation`은 과정형에서 **상시 발생 판정**(P3·P5 독립 발생).
  1차 노트가 4값만 나열한 것은 대립형 편향.
- 미결 유지: 점수 롤업 공식(롤업을 흔드는 학생 경로를 구성하지 못함).

다음: (1) N2 실험 — P3(순환)·P5(분업) 손 오라클 작성 후 v0 생성기와 대조(`npm run assess` 틀,
"중간 생략" 프로브 추가). v0의 첫 실질적 반증 시도. → (2) docs/STUDENT-LOOP-DESIGN.md 정리
(N1~N3을 스펙 항목으로 포함).

## 지금까지 (한 줄)
골드 생성 파이프라인 + 재현성 측정 완성 → 자유형 추상 응답 평가를 위해 **질의 보존 평가
(Query-Preservation)** 접근을 손 질의로 검증 완료. 슬롯 평가기보다 명확히 우수함이 확인됨.

## 방금 실험 결과 (docs/experiments/query-preservation-2026-07-25.log)
- 질의 평가기가 **B("법인의 자산 운용", topic_only) vs E2("소유와 사람의 운영", 관계 보존)를 변별** —
  슬롯 평가기는 둘 다 "부분"으로 뭉갬. → 스키마 변경 도입 근거 충족.
- 병치 정책 작동: E2 preserved+implicit / E3("운영 주체") topic_only.
- 손 질의: packages/pipeline/fixtures/queries-corporate-law-p0.json (9개)
- 코드: packages/pipeline/src/llm/query-eval.ts, cli/query-experiment.ts (npm run qexp)

## 진행 중 (2026-07-25) — 최소 평가 구조 확정
인간 라벨링에서 regionSemanticVerdict 일치 ≫ argumentCoverage → 결론을 구조에 반영.
인간 오라클 검증은 로드맵에서 제외(현실적 어려움).
- **핵심 채점축 = regionSemanticVerdict 하나** (미포착/주제만/관계보존/모순).
- argumentCoverage·expressionProfile → `_debug` 강등(실험 필드, 채점 제외).
- 명제 evidence map(evidenced/supported_by_abstraction/not_evidenced/contradicted): **점수 아님**,
  골드 명제 앵커링(생성기 논항 분해와 무관), 근거·피드백·디버깅용.
- 설명형 피드백: 포착한 핵심 관계 + 참고 세부(감점 아님).
- 모듈: packages/pipeline/src/assessment.ts (결정적, 단위테스트 10개)
- 회귀: cli/assess.ts (npm run assess) — 3문단 × 4분해, 과대평가(topic_only/contradicted→
  relation_preserved) 우선 점검. 결과 로그: docs/experiments/assess-2026-07-25.log
- production 미연결, 생성기 미확장.

## 완료 (2026-07-25) — v0 일반화 실험 (과학·인문)
생성기 v0 동결(query-gen.ts GENERATOR_VERSION='v0', EVAL_SCHEMA_VERSION='query-3axis-v1').
실험 중 프롬프트 수정 금지. 과학(NCM 인과·트레이드오프)·인문(묵가 주장-원리-사례) 각 문단.
- 공유 lib: packages/pipeline/src/query-gen-lib.ts (골드→입력, 오라클/생성→EvalSet, 재버킷팅, cluster)
- 손 오라클: fixtures/query-oracles/{science-p5,humanities-p4}-hand.json
- 일반화 CLI: cli/query-gen-generalize.ts (npm run qgen:general) — 생성×3, 핵심관계 커버리지,
  regionSemanticVerdict/범주/모순대상/교정대상 기능 일치, argumentCoverage 변이 수집
- 1차 게이트: 핵심관계 누락 0, 의미판정 일치 ≥90%(argumentCoverage는 탐색 지표)
- 결과 로그: docs/experiments/query-gen-general-2026-07-25.log (진행 중)

## 완료 (2026-07-25) — 자동 질의 생성 재현성 (1차 문단)
로그: docs/experiments/query-gen-2026-07-25-v2.log (v1=수정 전, v2=수정 후)
- 구조적 재현성 **강함**: 핵심 관계 7/7 × 3회 전부 커버, 영역 4/4/4 안정, 오라클 정렬 문장J≥0.5.
- 기능적 재현성: **의미 판정 축(regionSemanticVerdict) 8/8 프로브 재현** (B→topic_only, E3→topic_only,
  C→미포착, D→모순, A/E2/F 의미클래스 모두 오라클과 일치). 3축 전체 엄격 일치는 4/8.
- 잔여 불안정 = **argumentCoverage 축**(full/partial/none) — 생성기가 논항 질의(q6a/q6b류) 분할·
  requiredForFullArgumentCoverage 플래그를 실행마다 다르게 부여. expr은 경미.
- 두 수정 적용: (1) 생성기 영역마다 scope 질의 필수(B/E3 해결), (2) 기능 비교 span 재버킷팅
  (1:1 정렬 아티팩트 제거, G8 해결). query-gen.ts / cli/query-gen-experiment.ts.
- 판단: **의미 판정 수준에서는 대체 근접, 논항 커버리지 안정화 전에는 손 질의 대체 불가.**

### 다음
1. 논항 커버리지 안정화: 생성 프롬프트에 논항 분해·필수 플래그 규범 명시 후 재측정.
2. 다른 관계유형 문단 일반화 (과학 causal: 69bffacbfa..._s1_p5 / 인문 주장-근거: 69c011fd..._s1_p4 /
   경제·사회 조건-결과: s1_p3).

## 진행 중(이전) — 자동 질의 생성 재현성
손 질의를 오라클로 동결(수정 금지, 생성 입력/few-shot 미사용). 생성기는 원문+안정화 그래프
(명제·span·관계간선)만 입력, 합성 노드 미입력.
- 생성기: packages/pipeline/src/llm/query-gen.ts (원칙 A~F, zod 출력 스키마)
- 정렬: packages/pipeline/src/query-align.ts (span/명제 겹침 기반 결정적 영역 정렬, 핵심관계 커버리지)
- 실험: cli/query-gen-experiment.ts (npm run qgen) — 생성×3 저장, 구조적 재현성(영역/핵심관계/
  층위/플래그) + 기능적 재현성(프로브별 자산영역 3축 오라클 대비) + 모순 cluster
- 생성 결과: fixtures/generated-queries/corporate-law-run{1,2,3}.json
- 최종 게이트: 표면 문장 아닌 **기능적 평가 동등성** (B→topic_only, E2→관계보존/partial/implicit,
  E3→관계보존 미만, F→관계보존/full/explicit, C→미포착, D→모순)
- 단위 테스트: query-align.test.ts 7개 통과

## 완료 (2026-07-25) — 세 축 분리 (검증됨)
결과 로그: docs/experiments/query-3axis-2026-07-25.log
반복 안정성: semanticState 98% / regionSemanticVerdict **100%** / argumentCoverage **100%** /
expressionProfile 92%. E2(관계보존/partial/implicit)와 F(관계보존/full/explicit) 명확히 분리.
G1~G8로 q6a(역할)·q6b(자격) 변별 확인. 유일 불일치: G8 q6b(법인 직접→모순, 오라클 정정 대상).
→ **자동 질의 생성 실험 진입 준비 완료.** 재현성은 구조(영역/앵커/층위/플래그/수용기준) +
   기능적 평가 일치도(서로 다른 질의셋 → 동일 응답에 동일 판정)에 걸 것.

### 세부
축 혼합 문제 수정: `explicit_high_resolution`이 의미·논항·표현을 합쳐 E2(암묵)를 F(명시)와
동일 분류하던 문제 → 영역 판정을 **세 축**으로 분리.
- regionSemanticVerdict: region_not_evidenced/topic_only/partial_relation_preservation/relation_preserved/contradicted
- argumentCoverage: none/partial/full
- expressionProfile: explicit/implicit/mixed/none
- explicit_high_resolution은 displayLabel()에서 파생(relation_preserved+full+explicit일 때만)
- q6 → q6a(역할 주체, requiredForRelation) + q6b(권한 자격, requiredForFullArgument만)
- 질의 플래그(requiredForRelation/requiredForFullArgumentCoverage)가 정규화 축을 결정
- 단위 테스트 13개(3축·E2↔F 구분·규칙1·2), 전체 104개 통과
- G1~G8 경계 응답 추가 (q6a/q6b 변별 검사)
- 실험 재실행: 16응답 × 3반복 = 48콜 (docs/experiments/, 진행 중)

## 이전 (2026-07-25) — 양방향 정규화(1차)
단순 하향 게이트 대신 **상·하위 질의 양방향 정규화**를 구현. 하위 relation/argument 보존이
상위 scope를 승격(규칙 1), 모순도 영역 정렬 증거로 처리(규칙 2)해 "자산은 법인 소유, 운영은
권한자" 같은 scope 미표현 우수 응답이 탈락하지 않도록 함.
- 모듈: packages/pipeline/src/query-normalize.ts (규칙 1~6 + partial fallback)
- 단위 테스트: query-normalize.test.ts (12개, LLM 없이 규칙 검증 — 통과)
- 상위 영역 정책: fixtures/queries-corporate-law-p0.json의 regionPolicy (프롬프트 불변)
- 실험 재작성: cli/query-experiment.ts — 8응답(F=고해상도 추가) × 3반복, raw/normalized 로깅
- verdict 6종: region_contradicted / explicit_high_resolution / relation_preserving_abstraction /
  partial_relation_preservation / topic_only / region_not_evidenced

## 다음 할 일 (우선순위)
1. **위 실험 결과 판정** — B→topic_only / E2→relation_preserving / E3→topic_only 경계가
   3회 모두 유지되는지, 인간 기대와 불일치 사례가 있는지. 안정적이면 2번으로.
2. **실험 4: 질의 생성 재현성** — 손 질의를 자동 생성했을 때 3회 일치하는지가 실전 도입의
   마지막 게이트. 질의는 문단 층위·문장/명제/링크 앵커링(합성 노드 X).
3. **인간 오라클 이중 라벨링** — 불일치로 acceptanceCriteria 다듬기.

## 확정된 설계 원칙 (바꾸지 말 것)
- 질의는 **불안정한 합성 노드가 아니라 문단 층위**에 정의, 원문 span·명제·관계 간선에 앵커링.
- 보존 여부와 암묵성을 **semanticState(preserved/not_evidenced/contradicted) +
  expressionMode(explicit/implicit)** 두 축으로 분리. implicitly_preserved 단일 상태 금지.
- 관계 질의는 **병치만으로 인정** (분리·대조·다르다 단어 불요). 한쪽 주체만 언급하면 불인정.
- 자동 질의 생성기·스키마 변경 전에 **손 질의로 접근 검증** (완료).

## 열려 있는 정책 결정
- A(최상급 추상)가 슬롯 평가기에서 전부 "부분"으로 과소평가됨. 질의 평가기는 덜함 — 이게
  슬롯→질의 전환의 또 다른 근거.
- 목적 관계(q8)만 보존하고 목적 내용(q9)을 생략해도 좋은 추상으로 인정할지 — 현재 q8/q9 분리로
  기록만 하고 정책 미결정.

## 전체 지도
- 설계 개요: docs/ARCHITECTURE.md
- 마스터 계획: .omc/plans/consensus-csat-literacy.md
- 실행: nvm use 24.18.0; set -a; . ./.env; set +a; npm test / npm run qexp / npm run agreement
