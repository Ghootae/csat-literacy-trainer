# Deep Interview Spec: 수능국어 문해력 훈련 앱 (위계적 의미지도 기반)

## Metadata
- Interview ID: di-suneung-korean-2026-07-22
- Rounds: 9 (+ Round 0 topology gate)
- Final Ambiguity Score: 12%
- Type: greenfield
- Generated: 2026-07-23
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: no
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 0.40 | 0.360 |
| Constraint Clarity | 0.85 | 0.30 | 0.255 |
| Success Criteria Clarity | 0.88 | 0.30 | 0.264 |
| **Total Clarity** | | | **0.879** |
| **Ambiguity** | | | **0.121** |

## Topology

| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| 기출 콘텐츠 DB (content-db) | active | 수능국어 기출 지문·문항의 JSON 데이터베이스 | 사용자가 이미 상당 부분 구축. 로컬에서는 미발견 — 위치/스키마 확인이 실행 첫 단계 |
| 골드 의미지도 생성 (gold-semantic-map) | active | 문단 → 최소 명제 분해 → 위계적 합성 → 타이틀, + ablation 기반 가중치 산출 | 자동 초안 + 사람 검수. 목표 30개 지문 |
| 학습 인터랙션 (learning-interaction) | active | 문단 제시 → 학생의 코어 슬롯/타이틀 입력 UI | 느린 정독 훈련. 데스크톱/태블릿 키보드, 지문당 20~30분 |
| 응답 채점 엔진 (scoring-engine) | active | 학생 응답 명제 분해 → 골드 명제 매칭 → Gate A(모순) + 가중 보상 산출 | 2단 구조 확정 |
| 학습 진행 제어 (progression-control) | active | 위계 시각화 노출 → 학생이 재도전/진행 선택 | 학생 재량 모델 확정 |
| 성장 추적 (progress-tracking) | **deferred** | 계정, 학습 이력, 취약점 리포트, 반복 스케줄 | 사용자 확정 defer (Round 0, 2026-07-22). 단, 보상 점수의 축적·표시 최소 요건은 실행 중 재검토 필요 |

## Goal

수능국어 비문학 지문을 **문단 단위 정독 훈련 교재**로 변환하는 앱을 만든다.

각 문단에 대해 LLM이 **최소 의미 명제 → 상위 합성 → 문단 타이틀**로 이어지는 위계적 의미지도(골드)를 생성하고, ablation을 통해 각 요소의 중요도 가중치를 산출한다. 학생은 문단을 읽고 **코어 슬롯(핵심 서포팅 내용)을 먼저, 그다음 타이틀(문단 핵심)을** 서술형으로 입력한다. 시스템은 학생 응답을 동일한 명제 형식으로 파싱해 골드와 매칭하고, 가중 보상을 산출한 뒤, 위계 구조를 시각화해 보여준다 — **충족된 노드는 간략화된 정답을 공개하고, 미충족 노드는 위치만 표시한 채 내용을 감춘다.** 학생은 미충족 슬롯을 스스로 채워 추가 보상을 노릴지, 다음으로 넘어갈지 직접 선택한다. 단 골드와 **모순되는** 진술(인과 방향 오류 등)이 감지되면 학생 재량과 무관하게 강제 교정을 요구한다.

1차 목표는 **로컬 프로토타입**으로 이 설계의 효용을 검증하는 것이고, 검증 통과 시 웹앱으로 전환한다.

## Constraints

- **배포 경로:** 로컬 프로토타입 우선 → 정량 기준 통과 후 웹앱. 로컬 단계에서 인증·결제·저작권 처리는 범위 밖이나, 웹 전환을 원천 차단하는 구조적 선택(예: 데이터 모델을 로컬 파일시스템에 강결합)은 피할 것.
- **콘텐츠 규모:** 지문 약 30개 타게팅. 자동 초안 + 사람 검수 워크플로우 — 즉 **검수 UI/도구가 파이프라인의 일부**다.
- **사용 맥락:** 실전 모의고사가 아니라 느린 정독 훈련. 지문 1개당 20~30분 세션을 정상으로 간주. 데스크톱/태블릿 키보드 서술형 입력 전제. 모바일 최적화·짧은 세션 분할은 비목표.
- **입력 형식:** 자유 서술형. 드래그/선택식 축약 입력으로 대체하지 않는다 (정확도 우선).
- **LLM 의존:** 골드 생성(오프라인 배치, 고비용 허용)과 채점(런타임, 대화형 지연 감내 필요)의 두 경로. 런타임 응답 지연 허용치는 미확정 — 구현 중 실측 후 결정.
- **기출 저작권:** 로컬 개인 사용 단계에서는 유예. 웹앱 전환 시 반드시 재검토해야 하는 미해결 리스크.

## Non-Goals

- 계정 시스템, 학습 이력 저장, 취약점 리포트, 복습 스케줄링 (progress-tracking — 명시적 defer)
- 실전 모의고사 모드, 시간 압박 훈련
- 모바일 네이티브 앱, 짧은 세션 분할 UX
- 기출 외 지문(EBS·사설·모의고사)으로의 콘텐츠 확장
- 결제, 다중 사용자 관리, 공개 서비스 운영
- 문학·화작문 영역 (비문학 정독 훈련에 집중)

## Acceptance Criteria

### 골드 파이프라인
- [ ] 문단 텍스트를 입력하면 최소 의미 명제 리스트(p1..pn)를 산출한다
- [ ] 명제를 합성해 상위 노드(c1..cm)를 만들고, 최상위에 문단 타이틀이 오는 위계 트리를 산출한다
- [ ] 각 하위 요소에 대해 ablation(해당 요소 제거 후 상위 의미 재생성 → 원본과 의미 벡터 비교)을 수행해 가중치를 산출한다
- [ ] 위계 트리 중 학생에게 노출할 **코어 슬롯 레벨을 가중치 기준으로 자동 선정**하며, 슬롯 개수는 문단 구조에 따라 3~6개 범위에서 가변이다
- [ ] 생성된 위계를 사람이 검토·수정할 수 있는 검수 도구가 존재한다
- [ ] 지문 30개에 대해 골드가 구축되어 있다

### 채점 엔진
- [ ] 학생의 자유 서술 응답을 골드와 동일한 명제 형식으로 파싱한다
- [ ] 학생 명제와 골드 명제 간 매칭을 **명제 단위**로 판정한다 (슬롯 단위 전역 판정 아님)
- [ ] **Gate A:** 골드 명제와 모순되는(인과 방향 반전, 관계 오류) 학생 진술을 별도로 감지한다
- [ ] Gate A에 걸리면 보상 제시 이전에 해당 지점만 지적하고 교정을 요구한다 (학생 재량 없음)
- [ ] `reward = Σ(명제별 충족여부 × ablation 가중치)`로 보상을 산출한다
- [ ] 예시 검증: 골드 C2 = {p1: 금리인상→화폐유통감소, p2: 화폐유통감소→소비위축, p3: 소비위축→물가하락}에 대해 학생 응답 "금리를 올리면 사람들이 돈을 덜 써서 물가가 내린다"는 Gate A 통과 + p2 미충족의 부분 보상으로 처리된다

### 학습 인터랙션 & 진행 제어
- [ ] 문단이 1개씩 제시되고, 학생은 먼저 **코어 슬롯**을 입력한다
- [ ] 코어 슬롯 단계 완료 후 **타이틀**을 추론해 입력한다 (상향식 순서 고정)
- [ ] 보상 산출 후 위계 구조가 시각화되어 표시된다
- [ ] 충족된 명제/슬롯은 **간략화된 정답이 공개**된다
- [ ] 미충족 명제/슬롯은 **위치만 표시되고 내용은 비공개**다
- [ ] 학생은 미충족 슬롯 재도전(추가 보상)과 다음 진행 중 선택할 수 있다
- [ ] 지문 1개를 처음부터 끝까지 완주할 수 있다

### 검증 게이트 (로컬 → 웹앱 전환 조건, 둘 다 충족)
- [ ] **채점 신뢰도:** 학생 응답 표본을 사람이 수동 채점한 결과와 시스템의 명제 매칭이 90% 이상 일치한다
- [ ] **골드 품질:** 지문 30개 검수 시 자동 생성된 명제의 80% 이상을 수정 없이 사용할 수 있다

## Assumptions Exposed & Resolved

| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 타이틀과 서포트를 동시에 입력한다 | 어느 쪽을 먼저 요구하느냐가 인지 부하와 훈련 효과를 좌우 | **코어 슬롯 → 타이틀** 순서로 확정. 상향식 추론 강제 |
| 코어 슬롯의 개수·경계는 사람이 정한다 | "몇 개가 코어인가"는 해석의 폭이 큼 — 골드가 틀리면 학생이 맞고도 오답 처리됨 | ablation 손상도라는 **측정값으로 조작화**. 자의성 제거 |
| 골드 생성은 완전 자동화되어야 한다 | (Contrarian) 30~50개면 손으로 만들어도 되고, 그러면 파이프라인 전체가 불필요 | **자동 초안 + 사람 검수**의 중간 지점 채택, 30개 타게팅. 파이프라인은 유지하되 검수를 전제 |
| 지문당 20~40분의 마찰은 문제다 | 실전 수능은 지문당 7~8분 | 마찰이 아니라 **의도된 정독 훈련**. 실전 모드는 비목표로 확정 |
| 통과/실패 이진 게이트로 진행을 제어한다 | 이진 판정은 사람에게도 어려움 | **보상 모델로 전환.** 판정 단위를 슬롯 → 명제로 낮춰 국소 판단으로 분해. 진행 여부는 학생 재량 |
| 커버리지와 구조 정합성을 가중합(70:30)해 한 점수로 | 오개념이 부분점수로 희석되어 **인과 방향을 거꾸로 안 학생이 통과**할 수 있음. 두 신호는 단위가 다르고, 스칼라 하나로는 피드백 종류(보완 vs 교정)를 결정할 수 없음 | **가중합 기각.** 구조 정합성은 점수 항목이 아니라 **veto(Gate A)**로 분리. 커버리지만 연속 보상 |
| 재도전을 유도하려면 무엇을 놓쳤는지 알려줘야 하는데, 그러면 답을 주는 셈 | 알려주면 답 유출, 안 알려주면 학생이 깜깜한 상태로 선택 | **위치 정보와 내용 정보를 분리.** 위계 시각화에서 미충족 노드의 위치는 보여주되 내용은 감춤 |
| 수정 시도는 슬롯당 1회로 제한 | 보상 모델 도입으로 강제 재시도 개념 자체가 사라짐 | 제한 규칙 폐기. **재도전 여부는 학생 선택**, 단 Gate A 위반 시에만 강제 개입 |
| 처음부터 배포 가능한 서비스를 만든다 | 인증·저작권·인프라가 설계 검증보다 앞서게 됨 | **로컬 프로토타입 → 정량 게이트 통과 → 웹앱**의 2단계 |

## Technical Context

- **환경:** 신규 프로젝트(greenfield). `/Users/mac`은 git 저장소가 아니며, Desktop/Documents/Downloads에서 기출 JSON 자산을 발견하지 못함. **실행 첫 단계로 기존 JSON DB의 위치와 스키마를 확인해야 함.**
- **기술 스택:** 미확정. 로컬 실행 + 향후 웹 전환을 모두 감당해야 하므로, 골드 파이프라인(배치)과 학습 앱(대화형)을 분리하고 데이터 계층을 이식 가능하게 두는 구조가 유리.
- **LLM 사용 경로 2종:**
  1. *오프라인 배치* — 명제 분해, 위계 합성, ablation 재생성. 지문 30개 × 문단 5개 × (분해 + 합성 + 요소 수만큼 ablation) → 수백~수천 호출. 1회성 비용이므로 고성능 모델 사용이 정당화됨.
  2. *런타임 대화형* — 학생 응답 파싱, 명제 매칭, Gate A 모순 감지. 지연이 UX에 직결되므로 모델·프롬프트 최적화 대상.
- **의미 벡터 비교:** ablation 가중치 산출에 임베딩 기반 유사도가 필요. 임베딩 모델 선택은 미정.
- **미해결 기술 리스크:**
  - 런타임 응답 지연 허용치 미측정
  - 코어 슬롯 레벨 자동 선정 규칙(가중치 상위 N? 임계값? 트리 깊이?)의 구체 알고리즘 미정
  - 웹 전환 시 기출 저작권

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| Passage | core domain | id, 출처(연도·시행), 제목, 원문, 영역 | Passage has many Paragraph |
| Paragraph | core domain | id, 순서, 원문 텍스트 | Paragraph has one GoldSemanticMap |
| GoldSemanticMap | core domain | 위계 트리, 레벨 수 | 루트가 Title, 리프가 Proposition |
| Proposition | core domain | id, 진술 내용, 레벨, ablation 가중치 | Proposition composes CompositeNode |
| CompositeNode | core domain | id, 합성된 의미, 레벨, 하위 요소 참조, ablation 가중치 | CompositeNode composes 상위 CompositeNode 또는 Title |
| Title | core domain | 문단 핵심 진술 | GoldSemanticMap의 최상위 노드 |
| CoreSlot | core domain | 위계 내 노출 레벨의 노드 참조, 표시 순서 | 학생에게 제시되는 CompositeNode의 부분집합 (3~6개) |
| AblationWeight | supporting | 대상 노드 id, 제거 시 상위 의미 손상도 | Proposition/CompositeNode에 부착 |
| SemanticVector | supporting | 임베딩 벡터 | ablation 비교에 사용 |
| StudentResponse | core domain | 원문 입력, 대상 슬롯 또는 타이틀, 시도 회차 | StudentResponse parses into Proposition[] |
| PropositionMatch | core domain | 학생 명제 ↔ 골드 명제, 충족 여부 | Reward 산출의 기본 단위 |
| StructuralGate (Gate A) | core domain | 모순 감지 결과, 모순 지점 | StudentResponse를 검사, 위반 시 강제 교정 |
| Reward | core domain | Σ(충족 × 가중치), 슬롯별 내역 | StudentResponse로부터 산출 |
| SlotState | supporting | 충족/미충족/모순, 정답 공개 여부 | HierarchyView 렌더링의 상태 |
| HierarchyView | supporting | 노드별 표시 상태(공개/위치만/모순) | GoldSemanticMap + SlotState로부터 생성 |
| RevisionAttempt | supporting | 대상 슬롯, 재도전 응답, 추가 보상 | 학생이 자발적으로 생성 |
| StudySession | supporting | 대상 Passage, 진행 문단, 누적 보상 | 지문 1개 완주 단위 |
| HumanReviewPass | supporting | 검수자 수정 내역, 수정률 | GoldSemanticMap의 품질 게이트 |
| GoldGenerationPipeline | external system | 배치 실행, 모델 설정 | Paragraph → GoldSemanticMap |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 8 | 8 | - | - | N/A |
| 2 | 9 | 1 | 0 | 8 | 89% |
| 3 | 13 | 4 | 1 | 8 | 69% |
| 4 | 14 | 1 | 0 | 13 | 93% |
| 5 | 16 | 2 | 0 | 14 | 88% |
| 6 | 17 | 1 | 1 | 15 | 89% |
| 7 | 19 | 2 | 0 | 17 | 89% |
| 8 | 19 | 0 | 0 | 19 | 100% |
| 9 | 19 | 0 | 0 | 19 | 100% |

2라운드 연속 엔티티 변화 없음 — 도메인 모델 수렴 완료.

## Interview Transcript

<details>
<summary>Full Q&A (Round 0 + 9 rounds)</summary>

### Round 0 — Topology
**Q:** 상위 컴포넌트 구성 확인 (초안 4개 → 사용자 상세 설명 후 5개로 재구성)
**A:** 5개 구성 확정, progress-tracking은 defer
**Ambiguity:** not scored yet

### Round 1 — scoring-engine / Success Criteria
**Q:** 골드 슬롯 5개 중 3개를 다른 표현으로 맞고 1개는 인과 방향 반대일 때, 통과와 수정 유도를 가르는 기준은?
**A:** (사용자가 질문을 재구성) 입력-평가를 2단계로 분리 — 1단계 코어 슬롯 채우기(슬롯당 수정 1회, 실패 시 정답 제시), 2단계 타이틀 추론(역치 이상 통과, 1회 수정 한정)
**Ambiguity:** 50% (Goal 0.80, Constraints 0.15, Criteria 0.45)

### Round 2 — learning-interaction / Constraints
**Q:** 지문 1개에 20~40분, 실전은 7~8분. 이 마찰을 어떻게 다룰 것인가?
**A:** 느린 정독 훈련이 의도된 것
**Ambiguity:** 40% (Goal 0.82, Constraints 0.45, Criteria 0.45)

### Round 3 — gold-semantic-map / Success Criteria
**Q:** 코어 슬롯의 경계는 해석의 폭이 큰데, 골드가 신뢰할 만하다는 것을 무엇으로 담보하는가?
**A:** (사용자가 설계 제시) 문단 → 최소 명제 분해 → 계층적 합성 → 타이틀의 위계 구조. 역방향 ablation으로 각 요소의 상위 의미 손상도를 계산해 가중치 결정
**Ambiguity:** 36% (Goal 0.88, Constraints 0.45, Criteria 0.52)

### Round 4 — Contrarian Mode — content-db / Constraints
**Q:** 자동화가 반드시 필요하다는 전제가 틀렸다면? 몇 개의 지문을 커버해야 가치가 있는가?
**A:** 자동 초안 + 사람 검수, 30개 정도 타게팅
**Ambiguity:** 29% (Goal 0.88, Constraints 0.68, Criteria 0.52)

### Round 5 — scoring-engine / Success Criteria
**Q:** 골드 C2(금리→유통량↓→소비위축→물가↓)에 대해 학생이 중간 고리를 빼고 "금리 올리면 돈을 덜 써서 물가가 내린다"라 썼을 때, 충족으로 볼 것인가? 판정 근거는?
**A:** ablation 가중치 임계(70%)와 인과 구조 일치(30%)를 합치는 것에 대한 의견 요청
**어시스턴트 의견:** 가중합 기각 — 오개념은 부분점수 대상이 아니고, 두 신호는 단위가 다르며, 스칼라 하나로는 피드백 종류를 결정할 수 없음. 순차 2단 게이트(Gate A 구조 veto → Gate B 커버리지) 제안
**Ambiguity:** 26% (Goal 0.88, Constraints 0.68, Criteria 0.60)

### Round 6 — Simplifier Mode — scoring-engine / Success Criteria
**Q:** 2단 게이트를 채택하고 τ를 없앨 수 있는가?
**A:** 이진 판정 자체가 어려우므로 판정을 없애고 `reward = Σ(충족여부 × 가중치)`로. 추가 점수 도전 여부는 학생이 선택
**어시스턴트 관찰:** 이진 판정이 사라진 게 아니라 슬롯 → 명제로 단위가 내려간 것이며, 이는 개선. 다만 오개념은 보상만으로 막을 수 없으므로 Gate A는 유지 권장
**Ambiguity:** 29% ↑ (Goal 0.75, Constraints 0.68, Criteria 0.70) — progression-control 재개방으로 상승

### Round 7 — progression-control / Goal
**Q:** 보상 직후 무엇을 노출하는가? 놓친 것을 알려주면 답을 주는 셈이고, 안 알려주면 깜깜한 상태로 선택해야 하는데
**A:** 위계 구조를 시각화. 충족 노드는 간략화된 정답 공개, 미충족 노드는 정답 미공개. 학생이 미충족 슬롯 채우기 또는 다음 진행을 선택
**Ambiguity:** 23% (Goal 0.87, Constraints 0.68, Criteria 0.72)

### Round 8 — 전 컴포넌트 / Constraints
**Q:** 이번에 만들 것의 도달점과 배포 형태는?
**A:** 로컬로 테스트 후 웹앱으로 시도
**Ambiguity:** 19% ✅ (Goal 0.87, Constraints 0.82, Criteria 0.72)

### Round 9 — scoring-engine / progression-control / Success Criteria
**Q (a):** 오개념을 보상 모델 위에서 어떻게 처리하는가?
**A (a):** Gate A 채택 — 모순은 강제 개입
**Q (b):** 로컬 프로토타입 성공 판단 근거는?
**A (b):** 채점 신뢰도(수동 채점과 90% 일치)와 골드 품질(수정 없이 80% 사용 가능) 둘 다 충족
**Ambiguity:** 12% (Goal 0.90, Constraints 0.85, Criteria 0.88)

</details>

---
**Status: pending approval**
