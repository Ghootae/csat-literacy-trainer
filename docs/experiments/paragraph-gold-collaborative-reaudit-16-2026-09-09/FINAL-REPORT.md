# 협업 승인 문단 골드 16개 독립 재감사 보고서

> 이 문서는 최초 재감사 결과를 기록한다. 이후 승인된 제한 수리와 최종 상태는
> `REPAIR-REPORT.md` 및 `repair-approved-overlay-v2.json`을 따른다.

- 실행일: 2026-09-09 KST
- 대상: 기존 `SEMIAUTOMATIC_USER_AGENT_APPROVED` 문단 16개
- 감사 기준: 현재 `paragraph-gold-audit-v1`
- 모델: `gpt-5.6-terra`, reasoning effort `medium`, service tier `default`
- 호출: 16회, 재시도 0회, `store: false`
- 비용: **USD 0.385002** / 하드캡 USD 2
- 실행 계획 해시: `sha256:b7b034dbc90cce617c7b87fa66aea61a06c423544c17c66b758c3ab29189ff51`

이번 작업은 재감사만 수행했다. 기존 골드, 승인 manifest, 운영 자격은 수정하지 않았다.

## 1. 기계 재감사 결과

| 판정 | 문단 수 |
|---|---:|
| PASS | 10 |
| REPAIR_REQUIRED | 6 |
| BLOCKING | 0 |
| UNRESOLVED | 0 |

따라서 협업 승인 16개는 모두 독립 재감사를 **실행 완료**했지만, 모두 독립 감사를 통과한 것은
아니다. 기존 자동 감사 경로의 PASS 44개와 이번 PASS 10개를 합치면 현재 독립 감사 PASS는
54개다. 나머지 6개는 기존 사용자 승인을 유지하되, 현재 기준의 독립 감사 PASS로 세지 않는다.

### PASS 10개

- `69bcae308095df3b8c53d9a2-p1`
- `69bcae308095df3b8c53d9a2-p2`
- `69bffa62fa5063deffe19c88-p4`
- `69bffa62fa5063deffe19c88-p8`
- `69c0186c78128b2a9bede0c8-p5`
- `69c09163fa5063deffe1c180-p5`
- `69c0961c78128b2a9bee0717-p2`
- `6a2294f386fd308968e10e95-p5`
- `6a22950f86fd308968e11320-p3`
- `6a22950f86fd308968e11320-p4`

최종 PASS 집합은 `reaudit-summary.json`의 `records[].independentAuditPassed`가 정본이다.

## 2. REPAIR_REQUIRED 6개의 사람 검토

기계 감사의 비통과를 곧바로 골드 결함 확정으로 취급하지 않았다. 원문, 진단 골드, 명제 Bundle,
감사 지적을 대조한 결과는 다음과 같다.

| 문단 | 기계 지적 | 사람 검토 | 후속 처리 권고 |
|---|---|---|---|
| `69bffa62fa5063deffe19c88-p6` | 예시 간선 E6 방향이 예시→일반으로 역전 | **타당**. 같은 Bundle의 다른 예시 간선과도 불일치 | Bundle 간선만 제한 수리 |
| `69c0994b78128b2a9bee0922-p2` | E4가 계산 선행조건을 중요성과 연결, E5가 병렬 정의를 대조화, E7이 병렬 절차를 구체화 | **타당**. 원문에 없는 관계 유형을 추가함 | 세 간선 삭제 또는 비방향·절차 관계로 제한 수리 |
| `6a2294f386fd308968e10e95-p4` | E2가 순서를 구체화로, E4가 지속적 충돌 원인을 조건 관계로 오표현 | **대체로 타당**. 중심 진단 골드는 정상이지만 Bundle 관계가 부정확 | Bundle 간선만 제한 수리 |
| `69c006f178128b2a9bedd2f3-p5` | 최종 후보군 P9에서 직선 L 선택 P10으로 이어지는 절차 간선 누락 | **경미하지만 타당 가능성 높음**. 진단 골드와 명제 자체에는 전체 절차가 보존됨 | P9→P10 절차 간선만 추가 검토 |
| `69bcae308095df3b8c53d9a2-p4` | 시간 한정 누락 및 확장성의 목표 응용 분야 요건 누락 | **혼합**. P12에는 이미 “아직 없다”가 있어 그 지적은 사실과 다름. 반면 centralStory/MR5가 확장성의 두 요건 중 하나를 약화한 지적은 검토 가치가 있음 | 자동 수리 금지, 쟁점별 수동 판정 |
| `69fd388386fd308968e0b9f4-p3` | centralStory/AX1/MR1에 주광선의 비광축 입사 단계 누락 | **과잉 감사 가능성 높음**. 명제에는 해당 단계가 있고, 중심 요약은 물체점 이탈→회전 대칭성 상실→비점 수차라는 핵심 인과를 보존 | 현행 유지 쪽으로 수동 판정 권고 |

이 사람 검토는 새로운 승인 판정이나 수리를 수행한 것이 아니다. 특히 마지막 두 문단은 현재 감사기의
`centralStory` 충족 기준이 모든 중간 단계를 요구하는 방향으로 과도해질 수 있음을 보여 준다.

## 3. 상태 해석

- **독립 재감사 실행 완료:** 16 / 16
- **독립 감사 PASS:** 10 / 16
- **기존 자동 감사 PASS를 포함한 전체 독립 PASS:** 54 / 60
- **재검토 큐:** 6 / 60
- **기존 생산 자격:** 60 / 60 유지
- **이번 실행에서 변경한 골드:** 0개

재검토 큐 6개는 수리 후보이지 폐기 자산이 아니다. 특히 진단 대화가 직접 소비하는
`centralStory`, `centralAxes`, `coreRelations`가 정상이고 명제 Bundle 간선만 문제인 사례가
다수이므로, 운영 영향도와 수리 범위를 분리해서 판단해야 한다.

## 4. 정본 파일

- 실행 계획: `execution-plan.json`
- 전체 결과와 비용: `reaudit-summary.json`
- 문단별 원문 입력·모델 판정: `artifacts/<paragraphId>/01-independent-reaudit-v1.json`
- 재실행 CLI: `packages/pipeline/src/cli/reaudit-collaborative-paragraph-gold.ts`

문단별 판정, 지적 문구, API response ID, 비용 및 산출물 해시는 `reaudit-summary.json`을 정본으로
한다. 이 보고서의 사람 검토는 기계 판정의 타당도를 해석하기 위한 별도 층이다.
