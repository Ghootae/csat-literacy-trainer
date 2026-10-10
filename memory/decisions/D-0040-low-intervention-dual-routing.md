---
id: D-0040
status: accepted
date: 2026-09-30
scope: paragraph-dual-evaluation-routing-design
supersedes: none
---

# 비개입 우선 이중 판정 정책 — 기준 확정, 운영 미적용

## 목적과 사용자 확인

사용자는 불필요한 질문·보완 표시가 주는 부담을 줄이는 것을 일부 누락 탐지보다 우선한다.
학생에게 보완 선택을 보여 주는 것 자체도 실패감을 줄 수 있으므로 PASS/OK에서는 표시하지 않는다.

다음 두 질문에 사용자가 각각 '통과', '질문을 반드시 제시한다'고 명시적으로 답했다.

1. '자본금 운용은 신중해야 한다' 정도의 답도 해당 축 Level1이 OK라면 Level2 미충족과 무관하게 통과시킨다.
2. ERROR의 mandatory는 질문 제시를 뜻하며, 답변하거나 오류를 수정하기 전까지 다음 문단을 잠그는 뜻이 아니다.

## 결합 기준

축별로 적용한다. 한 축의 통과가 다른 축의 미확인·오류까지 해소하는 것은 아니다.

| Level1 | Level2 | 학생 경험 |
|---|---|---|
| PASS / UNCLEAR_OK | 어느 결과든 | 통과. 보완 선택도 표시하지 않음 |
| UNCLEAR_SERIOUS | 충족 | 기본 통과 + 선택적 보완 기회 |
| UNCLEAR_SERIOUS | 미충족 | 보완 질문 제시. 답변 없이 진행 가능 |
| ERROR | 어느 결과든 | 교정 질문 반드시 제시. 답변·교정 완료 없이도 진행 가능 |

진행 허용과 오류 교정 완료는 별개다. 질문을 건너뛰었다고 실제 ERROR를 교정 완료로 기록하거나
틀린 주장을 옳다고 승인하지 않는다. 기존 판정 기록과 학생 선택은 보존한다.
따라서 D-0011의 모든 상태 진행 선택권을 철회하지 않는다.

## 적용 범위와 미결정

이는 다음 이중 판정 구현·검증에 사용할 제품 기준의 확정이다. 이번 확인은 코드·프롬프트·UI·
서버·운영 골드 수정이나 추가 유료 호출의 승인이 아니다. 운영은 D-0013의 V4 그대로다.
D-0039의 과거 실험과 보상 자격 결과는 보존하며, 이번에는 새 추가 보상 규칙을 정하지 않는다.

현재 기준에서 Level2가 행동을 바꾸는 분기는 Level1 SERIOUS일 때다. 기존 실험 유효 축 관측34건에
이 규칙을 적용 계산하면 조용한 통과27·보완 질문4·ERROR 질문3·선택적 보완0이다.
SERIOUS+Level2충족 표본이 없어 Level2의 추가 효용은 이 표본에서 입증되지 않았다.
이는 새 모델 측정이나 독립 학생34명의 결과가 아니다.

실제 C1 AX2의 Level1 S/OK/OK와 Level2 미충족3회는 새 정책에서도 질문/통과/통과로 갈린다.
OK/SERIOUS 경계 변동, 명시적 오류 오탐, 불필요한 보완 표시·질문, 허용할 누락과 학습 효과는 후속 검증 대상이다.
정확 인용 등 계약 실패를 교육적 OK나 PASS로 취급하는 예외는 이번 확인에 포함되지 않는다.

## 근거

- 사용자 2026-09-30 제안과 확인: '1. 통과 2. 질문을 반드시 제시한다.'
- `memory/decisions/D-0011-paragraph-student-controlled-progression.md`
- `memory/decisions/D-0013-paragraph-optional-revision-v4.md`
- `memory/decisions/D-0039-two-level-meta-axis-evaluation-pilot.md`
- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/cases.json`
- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/summary.json`
