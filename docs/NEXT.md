# 다음 재개 지점 (2026-07-25)

## 지금까지 (한 줄)
골드 생성 파이프라인 + 재현성 측정 완성 → 자유형 추상 응답 평가를 위해 **질의 보존 평가
(Query-Preservation)** 접근을 손 질의로 검증 완료. 슬롯 평가기보다 명확히 우수함이 확인됨.

## 방금 실험 결과 (docs/experiments/query-preservation-2026-07-25.log)
- 질의 평가기가 **B("법인의 자산 운용", topic_only) vs E2("소유와 사람의 운영", 관계 보존)를 변별** —
  슬롯 평가기는 둘 다 "부분"으로 뭉갬. → 스키마 변경 도입 근거 충족.
- 병치 정책 작동: E2 preserved+implicit / E3("운영 주체") topic_only.
- 손 질의: packages/pipeline/fixtures/queries-corporate-law-p0.json (9개)
- 코드: packages/pipeline/src/llm/query-eval.ts, cli/query-experiment.ts (npm run qexp)

## 다음 할 일 (우선순위)
1. **위계 제약 코드 추가 (즉시)** — C(공허 표제)에서 scope ○인데 하위 관계 질의가 topic_only로
   과대평가됨. "scope 미포착 → 그 region 하위 질의 자동 not_evidenced" 결정적 후처리.
   query-experiment.ts의 deriveVerdicts에 region-scope 게이트 추가.
2. **실험 4: 질의 생성 재현성** — 접근 타당성 확인됐으니, 손 질의를 자동 생성했을 때 3회
   일치하는지가 실전 도입의 마지막 게이트. 질의는 문단 층위·문장/명제/링크 앵커링(합성 노드 X).
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
