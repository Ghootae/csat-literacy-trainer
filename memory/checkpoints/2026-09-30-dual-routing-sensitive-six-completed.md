---
date: 2026-09-30
scope: paragraph-dual-sensitive-expansion
base_commit: uncommitted
---

# 민감 6문단 이중 판정 확대 완료

## 결정 delta

- 사용자는 일관성을 위해 구체 축·메타 축을 공동 재생성하고 생성6회·판정180회까지 일괄 실행하도록 승인했다(D-0041).
- 생성 후 확인 대기는 철회됐으며 운영 V4·골드·UI·서버·보상·JEV 상태는 변경하지 않았다.

## 측정 delta

- 공손룡1·3, mRNA2, 도파민1, 정보비대칭2, 헤겔1. 기존 중심 이야기만 입력, 이전 candidate-2 요청과 input 외 동일.
- 생성6/6 READY·유효, 공손룡1·3 각각2축→1축으로 전체11→9축. 일부 구체 축 세부 증가·메타 표현 어색함도 보존했다.
- 생성 전 동결한 합성30응답에 L1/L2 각각3회. 판정180회 중175유효(L1 90/90, L2 85/90).
- 정상 API 응답은 총186회·계약유효181회. 이전 sandbox DNS 실패6시도는 별도 보존했고 동일 요청을 네트워크 권한으로 실행했다.
- 같은 새 축·같은 L1 결과로 비교한 유효85쌍에서 L2로 라우팅이 바뀐 사례0. SERIOUS+L2충족0, 선택적보완0.
- 간접 표현18/18·기능답18/18은 L1만으로 이미PASS/OK. 나열18/18 문단에 SERIOUS, 명시 오류18/18 문단에 ERROR.
- '충분 답' 공손룡3의 '흰 말을 구하면 안 된다'라는 생략 표현은 L1 ERROR3/3. 문장 중의성 때문에 깨끗한 충분 대조나 확정 오탐으로 집계하지 않는다.
- L2 실패5회는 공손룡3에서 인용에 따옴표를 추가한 정확 인용 계약 위반. 사후 수리·재시도 없이 보존했다.
- mRNA 나열 AX1은 S/S/OK, L2false3. 마지막 반복의 축은통과하나 다른 축S로 문단 질문은유지. OK/S 위험잔존.
- 헤겔 뒤바꾼 귀속 AX2는 L1 ERROR3이나 L2 true/false/false. 메타 자체에 올바른 귀속이 있는데도 L2 첫회과수용; L1 우선규칙보호.
- 기능답도 L1 PASS하므로 L1을 구체 세부 완전성 검사로 해석하지 않는다. 중요한 관계 하나만 누락한 자연 답·실제 질문·독립 사람 판정은 미검증.

## 산출물과 다음 검토

- 확대 실험 스크립트, 생성/판정 동결요청·실전송·원출력·검증·집계·보고서·응답별표를 추가했다.
- 다음은 사용자와 응답별 결과표의 기능답·중의문·mRNA OK/S 경계를 검토하는 것. L2 운영 추가나 폐기를 자동 결정하지 않는다.

## 근거

- `docs/experiments/dual-routing-sensitive-six-2026-09-30/PLAN.md`
- `docs/experiments/dual-routing-sensitive-six-2026-09-30/REPORT.md`
- `docs/experiments/dual-routing-sensitive-six-2026-09-30/CASE-RESULTS.md`
- `docs/experiments/dual-routing-sensitive-six-2026-09-30/GENERATION-REVIEW.md`
- `docs/experiments/dual-routing-sensitive-six-2026-09-30/metrics.json`
- `docs/experiments/dual-routing-sensitive-six-2026-09-30/generation-audit.json`
- `docs/experiments/dual-routing-sensitive-six-2026-09-30/evaluation-audit.json`
- `docs/experiments/dual-routing-sensitive-six-2026-09-30/network-recovery.json`
- `scripts/test-dual-routing-sensitive-six.mjs`
- `scripts/summarize-dual-routing-sensitive-six.mjs`
