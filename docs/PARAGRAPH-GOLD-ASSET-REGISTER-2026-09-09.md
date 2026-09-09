# 문단 골드 자산 원장

- 원장 기준일: 2026-09-09 KST
- 대상: 2026-09-04에 생산·승인한 문단 골드 60개
- 운영 기준선: `PG-PROD-BATCH004-AUDIT-V1`
- 자산 상태: 11개 완전 지문, 60개 문단 모두 `PRODUCTION_ELIGIBLE`
- 현재 웹앱 배포 상태: **미연결**. 웹앱은 별도 `gold-v2` fixture 31개를 읽으며, 이 원장의
  60개를 자동으로 읽지 않는다.

이 문서는 “생산 자격이 있다”와 “같은 버전으로 생산됐다”, “현재 웹앱이 사용한다”를 구분하기
위한 자산 원장이다. 문단별 최종 파일과 해시의 정본은 네 개의 승인 manifest다.

## 1. 현재 수량과 상태

| 항목 | 수량 | 의미 |
|---|---:|---|
| 원천 후보군 | 24지문 / 140문단 | `prospective-paragraph-gold-manifest-v1`에 고정된 전체 생산 후보 |
| 생산·승인 완료 | 11지문 / 60문단 | 네 승인 manifest에 등재된 현재 문단 골드 자산 |
| 자동 감사 경로 승인 | 44문단 | `AUTOMATIC_AGENT_AUDITED` |
| 협업 수리·사용자 승인 | 16문단 | `SEMIAUTOMATIC_USER_AGENT_APPROVED` |
| 현재 독립 감사 PASS | 57문단 | 기존 자동 PASS 44 + 협업 승인본 재감사 PASS 10 + 수리 후 PASS 3 |
| 사람 판정 승인 | 3문단 | 수리본 채택 1 + 기존 승인본 유지 2; 독립 PASS로 세지 않음 |
| 재검토 큐 | 0문단 | 6개 비통과 사례의 제한 수리·사람 판정 완료 |
| 기존 승인 절차의 미결 | 0문단 | 2026-09-04 승인 절차에는 미결 항목이 없음 |
| 미처리 | 13지문 / 80문단 | 아직 골드 생산을 실행하지 않은 원천 후보 |

60개는 모두 최종 승인 manifest에서 `productionEligible: true`다. 다만 16개는 독립 감사의
자동 PASS가 아니라, 자동 경로 종료 후 에이전트가 원문에 맞게 제한적으로 수리하고 사용자가
배치 승인을 한 자산이다. 따라서 60개를 모두 “독립 감사 자동 통과”라고 부르면 안 된다.

2026-09-09에는 이 협업 승인본 16개를 현재 감사 프롬프트로 독립 재감사했다. 최초 결과는 PASS
10개, REPAIR_REQUIRED 6개였다. 이후 사용자 승인에 따라 6개를 제한 수리·판정했고, 수정 후보
5개를 다시 독립 감사하여 3개가 PASS했다. 나머지는 감사 요구의 충돌 또는 중심 요약 범위의
과잉 확장으로 판정했다. 최종적으로 수리본 4개를 채택하고 기존 승인본 2개를 유지했다.

현재 전체 자산은 독립 감사 PASS 57개와 사람 판정 승인 3개로 구성된다. 60개 모두 생산 자격은
유지하지만, 사람 판정 3개를 독립 감사 PASS로 표기하면 안 된다. 과거 정본은 덮어쓰지 않았으며
`repair-approved-overlay-v2.json`이 해당 6개에 대한 최신 승인 경로와 판정을 제공한다.

### 원천 고정 상태

- 원천 manifest 버전: `prospective-paragraph-gold-manifest-v1`
- 생성 시각: `2026-09-03T16:27:16.083Z` (2026-09-04 01:27:16 KST)
- 실행 계획들이 참조한 원천 manifest 해시:
  `40e7c9fd77ab6eb33e7be82983429f83e250f38e30d70ad57c1d7cbd0da086b7`
- 최초 24문항 표본 manifest 해시:
  `0ad2f6f91082e0b2118e16053598ae82e32548e6eea4203bf19ea5934a954bba`
- 문단 분리 원칙: 비어 있지 않은 원문 줄을 문단으로 사용하고 `*`, `＊`, `※`로 시작하는
  각주는 바로 앞 문단에 결합

원천 manifest는 각 지문에 시험·제목·표본 문제 번호, 원문·enrichment·문제 생산 스냅샷의
경로와 해시, 지문 해시, 미디어·각주 수를 기록한다. 각 문단에는 위치, 원문과 원문 해시,
문자·문장 수, 원천 줄 범위, 결합 각주 수, 시각 자료 참조 여부가 기록되어 있다.

## 2. 생산 계보

모든 배치의 공통 골격은 다음과 같다.

```text
고정된 문단 원문과 지문 문맥
→ 문단 분석
→ 중심 이야기의 중심축 분해
→ 중심축–핵심 관계 매핑
→ 진단 골드 + 명제 Bundle 조립 및 코드 검증
→ 독립 의미 감사 v1
→ 필요한 경우 자동 수리와 재감사
→ 자동 미통과 사례의 협업 수리와 사용자 배치 승인
```

단, 카나리 배치와 이후 배치의 자동 수리 한도가 다르며, 배치 004 직전에 프롬프트 내용이
일괄 변경됐다.

| 배치 | 생산 시각·기록 시각 (KST) | 지문 / 문단 | 자동 / 협업 | 실행 특징 | 최종 승인 |
|---|---|---:|---:|---|---|
| 카나리·배치 001 | 최초 stage 2026-09-04 01:28:09, 최종 stage·summary 12:40:47 | 3 / 16 | 13 / 3 | 3개 문단에 2차 자동 수리·재감사까지 허용한 예외적 카나리 | 2026-09-04 |
| 배치 002 | plan 13:45:31, run summary 13:57:01 | 2 / 10 | 7 / 3 | 이후 운영 원칙대로 자동 수리 최대 1회 | 2026-09-04 |
| 배치 003 | plan 14:21:07, run summary 14:39:53 | 3 / 16 | 10 / 6 | 완전한 지문 3개 단위, 자동 수리 최대 1회 | 2026-09-04 |
| 배치 004 | plan 15:42:33, run summary 16:06:43 | 3 / 18 | 14 / 4 | 앞선 42문단에서 얻은 네 일반화 규칙을 프롬프트 전 단계에 반영 | 2026-09-04 |

시간은 JSON의 UTC `createdAt`을 KST로 환산했다. 승인 manifest에는 일자만 있고 승인 시각은
없으므로, 승인 시간은 더 정밀하게 확정할 수 없다.

### 배치별 실행량

| 배치 | API 응답 | 기록 비용(USD) | 실행 결과상 자동 통과 / 검토 필요 |
|---|---:|---:|---:|
| 카나리·001 | 92 | 2.4021087 | 13 / 3 |
| 002 | 48 | 1.2566028 | 7 / 3 |
| 003 | 84 | 2.0293216 | 10 / 6 |
| 004 | 96 | 2.2693276 | 14 / 4 |
| 합계 | 320 | 7.9573607 | 44 / 16 |

오른쪽의 “검토 필요” 16개는 이후 협업 수리와 사용자 승인으로 모두 생산 자격을 얻었다.

실제 실행을 식별하는 plan hash는 다음과 같다.

- 카나리·001: `3e3d5b07bd11f5b2233b5561bc9b71c8275fc4f58a38803ab26c196ecb507848`
- 배치 002: `05e3770ab03d6e8dd89cd17650243813551f0bbb9c81bade2b3098858ac87443`
- 배치 003: `6090917b301179dc47c55705ad938e66477cf50327e18410c923d51426f8ed4f`
- 배치 004: `0dc59cb1b705f480adc9b3ad816412848774b139dbb76d714e5ca8bbe8c2215e`

## 3. 버전 계보

### 공통 논리 버전과 모델

| 구성요소 | 배치 001~004의 스키마·명칭 |
|---|---|
| 생성 모델 | `gpt-5.6-terra`, effort `medium`, service tier `default` |
| 문단 분석 | `paragraph-analysis-prompt-v3.1` / `paragraph-analysis-openai-v3` |
| 중심축 분해 | `central-axis-decomposition-prompt-v2` / `central-axis-decomposition-openai-v2` |
| 축–관계 매핑 | `axis-relation-mapping-prompt-v1` / `axis-relation-mapping-openai-v1` |
| 진단 골드 | 실행 계획상 `paragraph-diagnostic-gold-v1`; JSON 자체에는 version 필드가 없음 |
| 명제 Bundle | `paragraph-proposition-bundle-v1`; JSON에 version 필드가 있음 |
| 감사 | `paragraph-gold-audit-v1` |
| 자동 수리 | `paragraph-gold-repair-v1` 스키마 |

버전 이름이 같아도 프롬프트 본문 해시가 바뀌었다. 따라서 이름만으로 동일 생산 조건이라고
판단하면 안 된다.

### 실행 당시 프롬프트 해시

아래 해시는 각 실행 계획에 기록된 `sha256:` 값이다.

| 단계 | 배치 002·003 | 배치 004 |
|---|---|---|
| 분석 | `8ba3a6561db207423280ba9383b791a5bb06c5e044776e226d112efb850574cb` | `66da46ff3763b2ed092cce923e334fcfa412216b4aab7bc04896fdf00e5fc7db` |
| 중심축 분해 | `6307ff9f7ad23482ecd5cc2c318eccd80ca7365e378eebda6ea0669eeb695534` | `b984257f3d1432e0bc088296d002290a9b2e0111770bb415a4a80f946f3da2d4` |
| 축–관계 매핑 | `d221fb59af3893b8b3302457f03ee716eb47e857e4413b8dffc96812abe9d8c1` | `1f2e78586e8e39c3a235f81846cde94521957d982e052aadc4d0efd1285b6d3e` |
| 감사 | `08eb4094efa4a73e4a5b693759b683683d7f434940b6d87c42d560edce2c2657` | `6ce2a74e8fde7aa420b15801f1d7f9d8e7587ed622fe8e3c0860fec847424585` |
| 수리 | `3057bd59c15a573cec006d9277d0f6bcfcbc0673dbc0a56ef6aed73cc2dc07bf` | `d1fe94aff284e4da22316d88712710e39f0f3be0275597f9898540b9d1448896` |

- 배치 002 plan: `prospective-paragraph-gold-runner-v9`
- 배치 003 plan: `prospective-paragraph-gold-runner-v10`
- 배치 004 plan: `prospective-paragraph-gold-runner-v10`
- 배치 002와 003은 위 다섯 프롬프트 해시가 동일하다.
- 배치 004는 다섯 해시가 모두 달라졌다. 간선 근거, 조건·범위·양상, 진단 coverage, 수리 후
  인접 필드 점검 규칙을 반영한 변경이다.

### 카나리·배치 001의 재현성 제한

실제 카나리 run summary와 gate가 가리키는 계획 해시는
`3e3d5b07bd11f5b2233b5561bc9b71c8275fc4f58a38803ab26c196ecb507848`이다. 그러나 같은 폴더의
현재 `execution-plan.json`은 실행 뒤 생성된 다른 dry-run 계획이며 해시는
`149f68f248a3d7dd42f881ba06c96bf617a4daff05ceb12ea6c5e42975289e47`이다.

개별 stage에는 모델, effort, service tier, 프롬프트 버전 이름, 입출력 해시와 API response ID가
남아 있다. 후대 dry-run 계획에는 배치 002·003과 같은 프롬프트 해시가 기록되어 있지만, 실제
카나리 계획 파일 자체가 보존되지 않았으므로 그 해시를 실제 카나리 실행과 암호학적으로 직접
연결할 수는 없다. 카나리는 결과와 단계별 계보를 재검토할 수 있지만, 실행 계획 한 파일만으로
완전 재현 가능한 상태는 아니다.

### 현재 운영 기준선과 배치 004의 관계

현재 운영 기준선 `PG-PROD-BATCH004-AUDIT-V1`의 프롬프트 본문은 배치 004 실행 스냅샷과
동일하다. 두 문서의 해시 문자열이 달라 보이는 이유는 계산 방식이 다르기 때문이다. 실행 계획은
trim한 문자열을 JSON 직렬화한 `artifactHash`를 사용하고, 기준선 문서는 파일 바이트의 SHA-256을
사용했다. 현재 파일을 두 방식으로 다시 계산했을 때 각각 배치 004 실행 계획과 기준선 표의
값에 일치했다.

| 단계 | 현재 기준선 파일 바이트 SHA-256 |
|---|---|
| 분석 | `cd8edce49f25ce88b90c34aa254c24b7c9d124cac73b73b336b58d217e1ee19b` |
| 중심축 분해 | `fd1db328ac36959556e1f2c43400c6fabf13965f823d53f11879fdc8191ae3f3` |
| 축–관계 매핑 | `c491c542df09e98bbddc018e72b77af1177af6e342cbfb5453e00fb236ac261e` |
| 감사 v1 | `3daa332fa1654197e3d70058df4a9296d5617c83e434b96a2e1107f56fe3a4fb` |
| 결합 수리 v2 | `ff104f9f80e7b9d530fb5f000fc7419405f14e7d57bfd45a73181b88835dcd49` |

따라서 배치 004의 18개는 현재 기준선과 같은 프롬프트 본문으로 생산됐다. 배치 001~003의
42개는 그 이전 프롬프트 본문으로 생산됐으므로, 기존 60개 전체를 현재 기준선의 동질 배치라고
기록해서는 안 된다.

## 4. 지문별 자산 목록

| 배치 | sourceId | 지문 | 시험 | 문단 | 자동 / 협업 |
|---|---|---|---|---:|---:|
| 001 | `69fd388386fd308968e0b9f4` | 볼록 렌즈와 비점 수차 | 고3 2026년 5월 교육청 | 4 | 3 / 1 |
| 001 | `69c09163fa5063deffe1c180` | 준거가격과 거래효용 | 고1 2025년 10월 교육청 | 6 | 5 / 1 |
| 001 | `69c0961c78128b2a9bee0717` | 지진파의 특성과 내진설계 | 고1 2025년 6월 교육청 | 6 | 5 / 1 |
| 002 | `6a2294f386fd308968e10e95` | 나미브 사막 딱정벌레의 수분 획득 원리와 방법 | 고1 2026년 6월 교육청 | 5 | 3 / 2 |
| 002 | `69c0994b78128b2a9bee0922` | 구조물의 하중과 허용응력 | 고1 2024년 10월 교육청 | 5 | 4 / 1 |
| 003 | `69c0186c78128b2a9bede0c8` | 수치예보와 수치예보 모델의 원리 | 고2 2025년 10월 교육청 | 6 | 5 / 1 |
| 003 | `6a22950f86fd308968e11320` | 옥신의 기능과 식물 생장 조절 | 고2 2026년 6월 교육청 | 6 | 4 / 2 |
| 003 | `69bcae308095df3b8c53d9a2` | 블록체인 기술의 특성 | 고3 2025학년도 9월 평가원 | 4 | 1 / 3 |
| 004 | `69c006f178128b2a9bedd2f3` | 데이터의 결측치와 이상치 처리 | 2024학년도 수능 | 5 | 4 / 1 |
| 004 | `69c0ad79fa5063deffe1e90b` | 유동성과 금리의 관계 | 고1 2023년 3월 교육청 | 5 | 5 / 0 |
| 004 | `69bffa62fa5063deffe19c88` | 법 모델과 임대차 보호 제도 | 2026학년도 6월 평가원 | 8 | 5 / 3 |

11개 지문은 원천 manifest의 해당 지문 문단을 빠짐없이 포함한다. 원천 메타데이터상 이 지문들에는
미디어 13개와 각주 4개가 연결되어 있다. 실제 골드는 `paragraphText` 중심의 텍스트 자산이며
미디어 객체를 포함하지 않는다. `textReferencesVisual: true`인 승인 문단은
`69c09163fa5063deffe1c180-p1` 한 개다. 생산 계획의 `visualProcessingDeferred: true`와 함께
해석해야 한다.

### 협업 승인 16문단

- 카나리·001: `69fd388386fd308968e0b9f4-p3`, `69c09163fa5063deffe1c180-p5`,
  `69c0961c78128b2a9bee0717-p2`
- 배치 002: `69c0994b78128b2a9bee0922-p2`, `6a2294f386fd308968e10e95-p4`,
  `6a2294f386fd308968e10e95-p5`
- 배치 003: `69c0186c78128b2a9bede0c8-p5`, `6a22950f86fd308968e11320-p3`,
  `6a22950f86fd308968e11320-p4`, `69bcae308095df3b8c53d9a2-p1`,
  `69bcae308095df3b8c53d9a2-p2`, `69bcae308095df3b8c53d9a2-p4`
- 배치 004: `69c006f178128b2a9bedd2f3-p5`, `69bffa62fa5063deffe19c88-p4`,
  `69bffa62fa5063deffe19c88-p6`, `69bffa62fa5063deffe19c88-p8`

### 협업 승인본 독립 재감사 상태 (2026-09-09)

- PASS 10개: `69bcae308095df3b8c53d9a2-p1`, `69bcae308095df3b8c53d9a2-p2`,
  `69bffa62fa5063deffe19c88-p4`, `69bffa62fa5063deffe19c88-p8`,
  `69c0186c78128b2a9bede0c8-p5`, `69c09163fa5063deffe1c180-p5`,
  `69c0961c78128b2a9bee0717-p2`, `6a2294f386fd308968e10e95-p5`,
  `6a22950f86fd308968e11320-p3`, `6a22950f86fd308968e11320-p4`
- REPAIR_REQUIRED 6개: `69bcae308095df3b8c53d9a2-p4`,
  `69bffa62fa5063deffe19c88-p6`, `69c006f178128b2a9bedd2f3-p5`,
  `69c0994b78128b2a9bee0922-p2`, `69fd388386fd308968e0b9f4-p3`,
  `6a2294f386fd308968e10e95-p4`
- 비용: USD 0.385002 / 16회 호출 / 하드캡 USD 2
- 해석 보고서:
  `docs/experiments/paragraph-gold-collaborative-reaudit-16-2026-09-09/FINAL-REPORT.md`
- 기계 결과 정본:
  `docs/experiments/paragraph-gold-collaborative-reaudit-16-2026-09-09/reaudit-summary.json`

### 재감사 비통과 6문단의 최종 처리 (2026-09-09)

- 수리 후 독립 PASS 3개: `69bcae308095df3b8c53d9a2-p4`,
  `69bffa62fa5063deffe19c88-p6`, `6a2294f386fd308968e10e95-p4`
- 수리본 사람 판정 승인 1개: `69c0994b78128b2a9bee0922-p2`
- 기존 승인본 유지·사람 판정 승인 2개: `69c006f178128b2a9bedd2f3-p5`,
  `69fd388386fd308968e0b9f4-p3`
- 채택된 새 수리본: 4개
- 기각된 수리 시도: `69c006f178128b2a9bedd2f3-p5`의 절차 간선 추가 1건
- 후속 독립 감사: 5회, USD 0.142010, PASS 3 / REPAIR_REQUIRED 2
- 최종 승인 오버레이:
  `docs/experiments/paragraph-gold-collaborative-reaudit-16-2026-09-09/repair-approved-overlay-v2.json`
- 수리 보고서:
  `docs/experiments/paragraph-gold-collaborative-reaudit-16-2026-09-09/REPAIR-REPORT.md`

## 5. 골드 한 쌍에 포함되는 내용

각 문단의 최종 승인 단위는 다음 두 JSON의 쌍이다.

### 진단 골드

모든 60개가 동일한 필드 집합을 가진다.

- `paragraphId`, `paragraphText`
- `centralObject`: 문단의 중심 대상
- `centralStory`: 문단의 중심 이야기
- `centralAxes`: 독립 중심축과 각 축에 연결된 `relationIds`
- `coreRelations`: 중심 관계의 ID와 설명
- `keyMappings`: 핵심 개념·대상 간 매핑
- `supportingConcepts`: 중심 이해를 보조하는 개념

### 명제 Bundle

모든 60개가 `paragraph-proposition-bundle-v1`이며 다음을 포함한다.

- 원천 식별자: `sourceId`, `passageId`, `paragraphId`, `position`
- 원천 무결성: `passageHash`, `paragraphHash`
- 생성 계보: 분석 response ID, 분석 스키마·프롬프트 버전, 수리 response ID와 부모 해시
- `propositions`: 원자 명제, 설명, 원문 직접 근거
- `propositionEdges`: 명제 간 연결의 출발·도착 ID, 유형, 방향, 설명
- 내부 생성·감사 상태 필드

현재 60개 전체의 구조 집계는 다음과 같다.

| 요소 | 총수 | 문단당 평균 |
|---|---:|---:|
| 중심축 | 92 | 1.53 |
| 핵심 관계 | 205 | 3.42 |
| key mapping | 184 | 3.07 |
| 보조 개념 | 205 | 3.42 |
| 명제 | 538 | 8.97 |
| 명제 간선 | 310 | 5.17 |

## 6. 최종 파일의 형태와 승인 경로

| 최종 파일 조합 | 문단 수 | 의미 |
|---|---:|---|
| `diagnostic-gold-candidate` + `proposition-bundle-candidate` | 20 | 최초 후보 쌍이 최종 승인됨 |
| `diagnostic-gold-repaired` + `proposition-bundle-repaired` | 20 | 자동 수리된 두 파일이 최종 승인됨 |
| candidate 진단 골드 + repaired 명제 Bundle | 4 | 감사 수리가 Bundle에만 필요했던 혼합 계보 |
| 협업 `diagnostic-gold` + `proposition-bundle` | 16 | 자동 경로 뒤 협업 수리·사용자 승인 |

명제 Bundle 60개의 `derivation`은 `INITIAL_ANALYSIS` 20개, `AUDIT_REPAIR` 40개다.

각 배치 폴더에는 정본 외에도 `00-source`, 3단계 생성 응답, 감사, 수리, 재감사, status와
검토 보고서가 보존되어 있다. 후보·수리본을 합친 골드형 JSON은 총 230개(진단 골드 115개,
명제 Bundle 115개)지만, 이들을 각각 별도 현행 골드로 세지 않는다. 승인 manifest가 선택한
진단 골드 60개와 명제 Bundle 60개만 현행 정본이다.

### 상태 필드 해석상의 주의

승인된 명제 Bundle 60개 내부에는 모두 다음 값이 남아 있다.

```text
generationStatus = STATIC_VALIDATED
auditStatus = NOT_AUDITED
productionEligible = false
```

이는 Bundle이 후보·수리 산출물로 만들어질 때의 보수적 내부 상태이며, 최종 승인 상태가 Bundle
안으로 다시 투영되지 않았기 때문이다. **현재 자격 판단의 정본은 Bundle 내부 플래그가 아니라
최종 승인 manifest의 항목과 해시다.** 협업 수리 폴더의 `validation.json`도 사용자 승인 전
상태를 기록하므로 `productionEligible: false`일 수 있다.

이 이중 상태는 소비 코드가 승인 manifest를 거치지 않고 Bundle만 읽을 경우 오판을 만들 수
있는 기술 부채다. 자산 자체가 미승인이라는 뜻은 아니지만, 향후 단일 카탈로그로 정규화할 필요가
있다.

## 7. 문단별 정본과 무결성

문단별 정본은 다음 순서로 결정한다.

1. 해당 배치의 최종 승인 manifest에서 `paragraphId`를 찾는다.
2. `approvedDiagnosticGold.path`와 `approvedPropositionBundle.path`를 사용한다.
3. 각 `hash`를 `artifactHash` 방식으로 확인한다. 이 해시는 파일 바이트가 아니라 JSON을 parse한
   뒤 `JSON.stringify(value)`한 값의 SHA-256이다.
4. 승인 라벨과 `productionEligible`은 manifest 값을 사용한다.

2026-09-09 원장 작성 시 다음을 다시 검사했다.

- 네 승인 manifest의 항목: 60개
- 고유 `paragraphId`: 60개
- 승인된 JSON 참조: 120개 모두 존재
- 120개 canonical JSON 해시: manifest와 모두 일치
- 문단 ID·source ID·원문: 원천 manifest와 모두 일치
- 11개 지문: 원천 manifest상의 문단 전체를 모두 포함

## 8. 승인 정본과 관련 문서

### 문단별 최종 승인 manifest

- 카나리·001: `docs/experiments/prospective-paragraph-gold-24-2026-09-04/canary-approved-manifest-v1.json`
- 배치 002: `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-002-next-10/approved-manifest-v1.json`
- 배치 003: `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-003-three-passages/approved-manifest-v1.json`
- 배치 004: `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages/approved-manifest-v1.json`

### 원천·운영·설명 문서

- 원천 24지문·140문단 manifest:
  `packages/pipeline/experiments/dialogue/prospective-paragraph-gold-manifest-v1.json`
- 현재 운영 기준선: `docs/PARAGRAPH-GOLD-OPERATIONAL-BASELINE-2026-09-04.md`
- 배치 004 일반화 관찰:
  `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages/GENERALIZATION-OBSERVATION-REPORT.md`
- 전체 작업 상태: `docs/WORKSTREAM-STATE.md`
- 협업 승인 16문단 독립 재감사:
  `docs/experiments/paragraph-gold-collaborative-reaudit-16-2026-09-09/FINAL-REPORT.md`
- 재감사 후 제한 수리·최종 판정:
  `docs/experiments/paragraph-gold-collaborative-reaudit-16-2026-09-09/REPAIR-REPORT.md`

## 9. 사용 규칙

- 기존 60개를 평가·회귀 자료로 사용할 때는 `batchId`, 실제 프롬프트 해시 계열,
  `approvalLabel`을 함께 기록한다.
- 네 승인 manifest를 읽은 뒤 `repair-approved-overlay-v2.json`의 동일 `paragraphId` 항목을
  우선 적용한다. 오버레이 v1은 후속 감사 전 제안이므로 현행 정본으로 사용하지 않는다.
- 60개 전체를 “현재 기준선으로 동일 생성된 데이터”라고 표기하지 않는다.
- 새 생산분은 `PG-PROD-BATCH004-AUDIT-V1`의 현재 해시를 동결하고 별도 batch ID와 승인
  manifest를 만든다.
- 엄격한 동질 비교가 필요하면 새 기준선으로 만든 별도 holdout을 사용한다. 기존 60개를
  묵시적으로 재생성하거나 덮어쓰지 않는다.
- 웹앱에서 사용하려면 승인 manifest를 읽는 명시적 배포·동기화 단계가 추가로 필요하다.
  현재의 `packages/pipeline/fixtures/experiments/dialogue/passages/*.json`은 이 60개와 별도다.
