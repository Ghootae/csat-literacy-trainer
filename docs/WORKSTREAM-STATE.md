# 작업 흐름 상태

마지막 갱신: 2026-09-04 KST

이 문서는 토픽을 바꿀 때 대화의 결론과 재개 지점을 잃지 않기 위한 장기 기억이다.
현재 집중할 작업은 하나만 `CURRENT`로 두고, 나머지는 `PARKED`로 보존한다.

## 한눈에

| 작업 흐름 | 상태 | 다음 한 단계 |
|---|---|---|
| 문제 골드 | `CURRENT` | SEVP v01.01의 내진설계 잔여 쟁점을 사람 검토한 뒤 확대 검증 범위를 정한다. |
| 문단 골드 자동 감사 | `PARKED` | 승인 문단 골드 16개와 의미 변이로 독립 감사 API를 검증한다. |

---

## 문제 골드

### 현재 상태

`CURRENT`

24문항 후보를 만든 실제 과정과 원래 계획한 전체 생산 파이프라인의 차이를 복원했다.
문제 골드를 다시 만들기 전에, 24문항에 연결된 24개 지문의 문단 골드를 먼저 생성하고 그
중간 명제 정보도 문제 골드 입력으로 보존하기로 했다. 전체 확대에 앞서 고위험 카나리 3개
지문의 16개 문단을 실제 API로 생성·감사·최대 2회 수리했다.

### 목표

원자료와 공식 해설을 근거로 문제 골드를 API로 생성하고, 정적 검사·학생 프로브·독립 의미
감사를 거쳐 운영 가능한 골드와 예외 검토 대상을 자동으로 구분한다.

### 현재 문제 골드 검증 프로토콜

정식 명칭은 `Selective Evidence Verification Protocol (SEVP) v01.01`이다.

```text
지문·선지 텍스트만으로 최초 풀이와 모든 선지의 원자 주장 분석
→ 그림 필요 여부 라우팅
→ 필요한 그림만 시각 명제로 추출
→ 정답표·상세 해설을 참고하되 원자료로 다시 입증하는 독립 감사
→ 오류 부분만 최대 1회 수리
→ 독립 재감사
   ├─ PASS → 골드 후보 통과
   └─ 문제 잔존·불확실 → REVIEW_REQUIRED 인간 검토
```

감사는 최초 라우팅이 그림 필요성을 놓쳤다고 판단하면 시각 명제 추출 단계로 되돌릴 수 있다.
생성·라우팅·시각 분석·감사·수리·재감사는 현재 모두 `gpt-5.6-terra / medium`의 분리된
API 호출로 실행한다.

알려진 고위험 오류 3문항 카나리에서 2문항은 자동 통과했고, 내진설계 1문항은 정답은
맞았지만 비교 선지의 근거 강도 문제가 남아 인간 검토로 차단됐다. 누적 24회 응답과 프로젝트
가격 스냅샷 기준 약 1.338828달러가 들었으며, 이 값에는 최초 계약 결함 수정 전 호출도 포함된다.

- 실험 위치: `docs/experiments/problem-gold-selective-visual-canary-2026-09-04/`
- 실행기: `packages/pipeline/src/cli/run-problem-gold-selective-visual-canary.ts`

### 확정된 사실

- 신규 24문항은 모두 `gpt-5.6-terra / medium` API로 각각 한 번 생성했다.
- API 생성 호출은 24회였고 API 오류는 없었다.
- 정적 정규화 후 후보 골드는 23개다.
- 볼록렌즈 1개는 원시 API 출력은 있지만 검증 실패로 후보 골드에 승격되지 않았다.
- 당시 실행한 것은 사실상 `B1 API 생성 → B2의 코드 정규화·스키마 검사 → 사람 검수 대기`였다.
- A 공식 해설 감사, B3 학생 응답 프로브, C 독립 의미 감사와 최종 품질 게이트는 24문항
  생산 과정에 포함되지 않았다.
- 생산 당시에는 공식 해설 본문이 입력에 없었다. 현재는 24문항 모두 상세 공식 해설을
  확보했다.
- 전체 원자료에는 153개 지문, 728문항, 3,640개 선지의 개별 판단 근거가 보강돼 있다.
- 기존 문제 골드는 변경하지 않는다.
- 24문항은 서로 다른 24개 지문에 연결된다.
- 원자료의 비어 있지 않은 148줄 중 8줄은 각주이며, 바로 앞 문단에 연결하면 실제 분석 대상은
  140개 문단이다.
- 문단 골드는 기존 확정 방식인 `v3.1 분석 → 중심축 분해 → 축-관계 매핑`으로 생성한다.
- v3.1 분석의 명제와 명제 간선은 `ParagraphPropositionBundle`로 별도 저장해 이후 문제 골드가
  참조할 수 있게 한다.
- 생성 후보는 독립 의미 감사 API를 통과해야 `AGENT_AUDITED + PRODUCTION_ELIGIBLE`이 된다.
- 카나리 실험에서는 자동 수리를 문단당 최대 2회까지 시험했다. 이후 배치의 생산 정책은
  자동 수리를 문단당 1회까지만 허용하고, 그래도 문제가 남으면 `REVIEW_REQUIRED` 협업 수리
  큐로 보내는 것으로 확정했다.
- 그림 전처리는 이번 범위에서 제외한다. 텍스트만으로 확정할 수 없는 시각 의존 문단은 자동
  승격하지 않는다.

### 원래 계획한 생산 파이프라인

```text
A  공식 해설 감사
→ B1 문제 골드 후보 생성
→ B2 정적 정규화·스키마 검증
→ B3 표준 학생 응답 프로브
→ C  독립 의미 감사·필요한 수리·재감사
→ 최종 품질 게이트
→ 운영 자격 판정 또는 예외 검토
```

#### A — 공식 해설 감사

원문, 문제, 정답과 공식 해설이 서로 일치하는지 확인한다. 정답 키는 원문 근거를 대체하지
않으며, 검증된 해설만 B1 입력에 사용한다.

#### B1 — 문제 골드 후보 생성

지문 원문과 그림, 발문·보기·선지와 그림, 정답, 검증된 공식 해설을 입력해 최초 후보를 만든다.

#### B2 — 정적 정규화·검증

스키마, 필수 필드, ID 참조, 선지·정답 번호, 추론 경로 연결과 같은 코드로 판정 가능한 계약만
검사한다. 의미를 임의로 수정하지 않는다.

#### B3 — 표준 학생 응답 프로브

정확한 근거, 대표 오답 근거, 부정형 문항 근거와 저정보 응답을 넣어 골드가 실제 진단과
피드백에 제대로 작동하는지 확인한다.

#### C — 독립 의미 감사

생성기와 분리된 API 역할이 원자료부터 다시 대조해 지문 사실, 선지 진릿값,
`SUPPORTS`·`CONTRADICTS`·`DOES_NOT_JUSTIFY`, 추론과 충분 근거 경로를 검사한다. 오류가
있으면 해당 부분만 수리하고 재감사한다.

### 보유 자산

- 24문항 생산 보고서와 원시 응답·호출 메타데이터
- 정규화된 후보 골드 23개
- 볼록렌즈 검증 실패 원시 출력 1개
- 24문항의 상세 공식 해설
- 기존에 완성한 6문항 A→B1→B2→B3→C 실험 산출물
- 알려진 중대 의미 오류 사례: 볼록렌즈 비율 방향, 준거가격 부호 적용, 지진 설계 효과 분류

주요 위치:

- `docs/experiments/problem-gold-prospective-blind-2026-09-03/`
- `docs/experiments/problem-gold-explanation-audit-cycle-2026-09-02/`
- `data/enrichment/records/`
- `data/enrichment/detailed-summary.json`

### 구현된 선행 문단 골드 생산선

```text
24개 지문 원문 → 140개 분석 문단 고정
→ v3.1 문단 분석
→ 중심축 분해
→ 중심축-핵심 관계 매핑
→ 문단 진단 골드 후보 + 별도 명제 Bundle
→ 독립 의미 감사
   ├─ PASS → AGENT_AUDITED + PRODUCTION_ELIGIBLE
   └─ REPAIR_REQUIRED → 부분 수리 → 재감사
                                  ├─ PASS → PRODUCTION_ELIGIBLE
                                  └─ 1회 자동 수리 후 미통과 → REVIEW_REQUIRED 협업 수리
```

모든 단계는 입력과 설정 해시를 확인해 중단 후 재개할 수 있다. 기존 문단 골드와 문제 골드는
덮어쓰지 않고 별도 실험 폴더에 저장한다.

### 중단 지점

고위험 카나리 16개 문단의 최초 생성과 독립 감사를 완료했다. 감사가 요구한 경우 최대 2차
수리와 2차 재감사까지 수행했다. 최종 누적 API 응답은 92회, 계산 비용은 약 2.4021달러다.
13개는 `AGENT_AUDITED`, 3개는 두 차례 수리 후에도 좁은 쟁점이 남아 `REVIEW_REQUIRED`다.
당시 나머지 124개 문단은 실행하지 않았다.

16개 각각의 원문·최초 후보·최초 감사와 수리·재감사·필드 변경 이력은 다음 위치에 분리했다.

- `docs/experiments/prospective-paragraph-gold-24-2026-09-04/canary-review/`

### 카나리 및 배치 002 기록

2차 수리 후 남은 3개 문단은 기존 산출물을 변경하지 않고 별도의 협업 수리 후보로 고쳤다.
이 후보들은 스키마와 의미 조건은 통과했지만 독립 재감사를 실행하지 않아, 사용자 승인 전에는
생산 자격이 없는 상태였다. 네 개의 실패 사례와 다음 배치에 전달할 일반 규칙 후보를 검토
보고서에 기록했다.

- `docs/experiments/prospective-paragraph-gold-24-2026-09-04/canary-review/collaborative-repair/`

사용자가 카나리 16개 문단을 모두 승인했다. 최종 승인 manifest에는 자동 감사 경로로 성공한
13개와 사용자–에이전트 협업 수리로 성공한 3개를 서로 다른 라벨로 기록했다.

- `AUTOMATIC_AGENT_AUDITED`: 13개
- `SEMIAUTOMATIC_USER_AGENT_APPROVED`: 3개

협업 수리에서 얻은 네 규칙과 대표 예시는 `paragraph-gold-repair-prompt-v2`에 연결했다.
이 프롬프트를 사용해 두 번째 생산 단위인 10개 문단을 실행했다. 향후 자동 수리는 문단당 1회로
끝내고, 남는 사례는 사용자–에이전트 협업 수리와 사례 기록으로 넘긴다.

두 번째 배치는 나미브 사막 딱정벌레 지문 5문단과 구조물의 하중·허용응력 지문 5문단이다.
동일한 계획 해시로 48회의 API 응답을 사용했고 계산 비용은 1.2566028달러였다. 7개는 자동
감사 경로로 통과했고 3개는 협업 수리 후보로 고쳤다. 협업 수리 후보는 스키마·원문 보존·사례별
의미 검사를 통과한 뒤 사용자가 승인했다.

- `AUTOMATIC_AGENT_AUDITED`: 7개
- `SEMIAUTOMATIC_USER_AGENT_APPROVED`: 3개
- 배치 위치: `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-002-next-10/`
- 새 사례: core 관계의 중심 서사 누락, 중심 과정의 supporting 오분류, 평가 양상의 단정 강화

자동 7개와 반자동 3개를 구분한 최종 승인 manifest를 별도로 만들었으며 10개 모두 생산 자격을
얻었다. 다음 배치부터는 자동 1차 수리·재감사까지 마친 직후 일단 중단하고, 남은 문제를 먼저
사용자에게 보고한다.

세 번째 배치는 문단 수가 아니라 완전한 지문 3개를 단위로 실행했다. 수치예보 6문단, 옥신
6문단, 블록체인 4문단의 총 16문단에 대해 최초 생성·감사와 최대 1차 자동 수리·재감사를
완료했다. 84회의 API 응답을 사용했고 계산 비용은 2.0293216달러였다.

- 최초 감사에서 바로 통과: 6개
- 1차 자동 수리 후 통과: 4개
- 1차 자동 수리 후에도 `REVIEW_REQUIRED`: 6개
- 최초 자동 경로로 통과: 10개
- 협업 수리 후 사용자 승인: 6개
- 배치 003의 최종 생산 가능 문단: 16개

사용자가 배치 003의 16문단을 모두 승인했다. 자동 성공 10개는
`AUTOMATIC_AGENT_AUDITED`, 협업 성공 6개는 `SEMIAUTOMATIC_USER_AGENT_APPROVED`로
분리 기록했으며, 세 지문 모두 지문 단위로 완료됐다.

- `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-003-three-passages/post-first-repair-manifest-v1.json`
- `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-003-three-passages/POST-FIRST-REPAIR-ISSUES.md`
- `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-003-three-passages/approved-manifest-v1.json`

네 일반화 문제 가족을 생성·중심축 분해·관계 매핑·감사·수리 프롬프트의 역할에 맞게 반영한
뒤, 네 번째 배치로 완전한 지문 세 개 18문단을 실행했다. 결측치·이상치 5문단, 유동성과 금리
5문단, 법 모델·임대차 보호 8문단이다.

- 최초 감사에서 바로 통과: 6개
- 1차 자동 수리 대상: 12개
- 1차 자동 수리 후 통과: 8개
- 최종 자동 통과: 14개
- 1차 자동 수리 후 `REVIEW_REQUIRED`: 4개
- API 응답: 96회
- 계산 비용: 2.2693276달러

규칙 적용 전 배치 003과 비교하면 최초 생성의 직접 통과율은 37.5%에서 33.3%로 낮아져 생성
단계 개선은 확인되지 않았다. 반면 수리 대상의 1차 통과율은 40.0%에서 66.7%로, 최종 자동
통과율은 62.5%에서 77.8%로 높아졌다. 현재 가장 분명한 개선 신호는 수리 후 인접 필드를
재검사하는 규칙이며, 나머지 세 규칙의 생성 단계 효과는 추가 관찰이 필요하다.

- 배치 004 보고서: `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages/GENERALIZATION-OBSERVATION-REPORT.md`
- 배치 004 상태 manifest: `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages/post-first-repair-manifest-v1.json`

현재 누적 API 응답은 320회, 계산 비용은 7.9573607달러다. 배치 004 협업 수리 전 기준으로
생산 가능한 문단은 56개, 처리했지만 검토 대기인 문단은 4개, 아직 처리하지 않은 문단은 80개였다.

### 다음 한 단계

배치 003의 협업 수리 6문단은 사용자 승인을 받아 생산 자격을 얻었다. 수리 과정에서 기록한
여덟 사례(PGC-008~PGC-015)와 이전 사례를 합쳐 다음 네 문제 가족을 프롬프트에 반영했다.

1. 간선의 방향·유형을 원문 근거보다 강하게 만드는 문제
2. 조건·대상 범위·위치·가능성·시간 양상을 잃는 문제
3. 명제와 중심 이야기·중심축·핵심 관계 사이의 coverage 불일치
4. 한 필드 수리 후 관련 필드를 다시 확인하지 않아 생기는 수리 회귀

블록체인 2문단에서 `따라서` 관계를 삭제한 사례는 직접 사례가 하나뿐이므로 독립 규칙으로
만들지 않고 첫째·넷째 규칙의 경계 회귀 사례로 보존했다. `UNSUPPORTED_MEANING`도 빈도는
높지만 범위가 너무 넓어 별도의 구체적 규칙으로 억지로 묶지 않았다.

- 협업 수리: `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-003-three-passages/collaborative-repair/`
- 누적 일반화 보고서: `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-003-three-passages/collaborative-repair/ACCUMULATED-GENERALIZATION-REVIEW.md`
- 최종 승인 manifest: `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-003-three-passages/approved-manifest-v1.json`

배치 004의 검토 대기 문단이었던 결측치·이상치 5문단과 법 모델·임대차 보호 4·6·8문단을
협업 수리하고 사용자의 사전 승인 지시에 따라 최종 승인했다. 자동 성공 14개는
`AUTOMATIC_AGENT_AUDITED`, 협업 성공 4개는 `SEMIAUTOMATIC_USER_AGENT_APPROVED`로
분리 기록했다. 새 API 호출 없이 원문 보존·스키마·사례별 의미 검사를 통과했다.

- 배치 004 최종 승인 manifest: `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages/approved-manifest-v1.json`
- 협업 수리 및 승인 보고서: `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages/COLLABORATIVE-REPAIR-AND-APPROVAL-REPORT.md`
- 사례 기록: `docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages/collaborative-repair/casebook.json`

이로써 배치 004의 세 지문 18문단이 모두 생산 자격을 얻었다. 현재까지 처리한 60문단은 모두
승인됐으며, 자동 경로 44개와 협업 경로 16개로 구분된다. 검토 대기 문단은 0개이고 아직
처리하지 않은 문단은 80개다. 다음 실제 행동은 원천 manifest 순서에서 다음 미처리 지문 3개를
선정하는 것이다.

배치004의 수정 전 최초 후보 18개를 동결해 최초 감사를 Local·Global 두 호출로 분리하는
실험도 수행했다. 알려진 협업 수리 문제점 5개 중 최초에 직접 검출한 것은 1개뿐이었고, 기존
최초 PASS 대조군 6개 중 4개가 새 수리 대상으로 분류됐다. 감사·수리 호출은 기존 42회에서
81회로 증가했고 수리 후 자동 PASS는 14개에서 10개로 감소했다. 따라서 분리 감사 v1은 기본
운영에 채택하지 않고 기존 단일 감사·수리 1회·재감사·예외 협업 방침을 유지한다.

- 분리 감사 실험: `docs/experiments/paragraph-gold-split-audit-batch-004-2026-09-04/`
- 평가 보고서: `docs/experiments/paragraph-gold-split-audit-batch-004-2026-09-04/EVALUATION-REPORT.md`

### 미해결 질문

- 문제 골드가 새 문단 골드와 `ParagraphPropositionBundle`을 어떤 ID·버전 계약으로 참조할 것인가?
- 24문항의 기존 B1 출력과 B2 후보를 그대로 재사용할 것인가?
- 새로 확보한 공식 해설을 사용한 A 이후 B1을 다시 생성할 것인가?
- C 감사 통과 결과를 사람 승인 없이 언제 `PRODUCTION_ELIGIBLE`로 둘 것인가?

---

## 문단 골드 자동 감사

### 현재 상태

`PARKED`

문단 골드 생성기와 UI는 이미 존재한다. 사람의 전수 검토를 요구하지 않고 독립 API 감사와
예외 검토 방식으로 전환하는 작업은 문제 골드 논의가 끝날 때까지 보류한다.

### 목표

문단 골드를 다른 API 역할이 원문과 대조해 의미적으로 감사하고, 문제가 없는 결과는 자동으로
운영 자격을 얻으며 자동 수리로 해결되지 않는 예외만 사람이 검토하게 한다.

### 확정된 사실

- 일반 문단 골드 생성은 문단당 API 3회다.
  1. `paragraph-analysis-prompt-v3.1`: 중심 이야기와 핵심 관계 생성
  2. 중심축 무손실 분해
  3. 중심축–핵심 관계 매핑
- 코드 검증을 통과한 결과는 `READY_CANDIDATE`이며, 기존 운영 원칙에서는 사람 승인 뒤
  `human_reviewed`로 승격했다.
- 현재 UI에는 완전한 지문 6개와 불완전한 헤겔 지문 1개가 등록돼 있다.
- 완전한 6개 지문에는 문단 골드 30개가 연결돼 있다.
- mRNA 5개와 묵가 5개, 총 10개 문단은 manifest에 `human_reviewed`가 명시돼 있다.
- 나머지 운영 문단 골드 20개는 레거시 manifest에 명시적 승인 상태가 없지만 현재 UI는 사용할
  수 있는 것으로 처리한다.
- 헤겔 1개 문단 골드는 전체 원문이 없으므로 운영 확대 실험에서 제외한다.
- 기존 문단 골드는 문단 중심 이해 진단용이며 지문의 모든 세부 사실을 포괄하는 데이터베이스가
  아니다.

### 합의한 운영 방향

```text
문단 골드 생성 API
→ 코드 구조 검증
→ 독립 의미 감사 API
   ├─ PASS → AGENT_AUDITED + PRODUCTION_ELIGIBLE
   └─ 오류 → 표적 자동 수리 → 재감사
                              ├─ PASS → PRODUCTION_ELIGIBLE
                              └─ 재실패·불명확 → REVIEW_REQUIRED
```

사람은 모든 골드를 승인하지 않고, 자동 수리와 재감사로 해결되지 않은 예외만 검토한다.

### 재개할 때 첫 행동

1. 명시적으로 승인된 문단 골드 10개로 감사기의 정상 골드 오탐을 측정한다.
2. 방향·부정·조건·인과관계를 의도적으로 바꾼 변이 골드로 오류 검출을 측정한다.
3. 통과한 감사기를 레거시 운영 문단 골드 20개에 적용한다.
4. 오류 항목만 자동 수리·재감사하고 남은 예외를 검토 큐로 보낸다.

### 미해결 질문

- 문단 감사 API의 모델과 reasoning effort
- 문단당 감사할지 지문 단위로 묶을지
- 허용할 오탐률과 변이 검출률
- 레거시 20개 골드의 승인 상태를 어떤 상태명으로 이관할지

### 관련 파일

- `docs/DIALOGUE-PARAGRAPH-BASELINE-2026-08-26.md`
- `packages/pipeline/src/paragraph-analysis/`
- `packages/pipeline/src/central-axis-decomposition/`
- `packages/pipeline/src/axis-relation-mapping/`
- `packages/pipeline/fixtures/experiments/dialogue/gold-v2/`
- `packages/pipeline/fixtures/experiments/dialogue/passages/`

---

## 토픽 전환 규칙

실행 계획은 사용자에게 보고하되, 계획 자체에 대한 별도 승인을 기다리지 않고 바로 작업을
시작한다. 다만 유료 실행, 외부 상태 변경, 의미적 예외의 사용자 판정처럼 별도로 합의한
품질·안전 게이트는 해당 계약을 따른다.

토픽을 바꾸기 직전에 현재 작업 흐름에 다음 세 항목만 갱신한다.

1. `중단 지점`: 마지막으로 확인하거나 결정한 내용
2. `다음 한 단계`: 다시 시작할 때 실제로 수행할 한 가지 작업
3. `미해결 질문`: 아직 선택하지 않은 쟁점

새 토픽을 시작할 때는 이 문서의 해당 섹션을 먼저 읽고, 사용자에게 다음 네 가지를 짧게
리마인드한 뒤 작업한다.

1. 확정된 사실
2. 현재 보유 자산
3. 중단한 정확한 위치
4. 지금 수행할 첫 작업
