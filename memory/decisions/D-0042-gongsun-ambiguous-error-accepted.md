---
id: D-0042
status: accepted
date: 2026-10-01
scope: gongsun-p3-sensitive-case-human-review
supersedes: none
---

# 공손룡 생략 표현 사례의 ERROR 판정 허용

사용자는 민감6문단 실험의 공손룡3 사례에 대해 '중의적 표현을 ERROR로 확정한 문제는 그렇게
판정해도 문제가 없을 것 같아'라고 확인했다. 대상은 `G3-sufficient`의 다음 구절이다.

> 말을 구하면 노란 말이나 검은 말도 가능하지만 흰 말을 구하면 안 된다.

L1은 '흰 말을 구하는 것 자체가 금지'라는 주장으로 읽어 ERROR3/3을 냈다. 사용자는 이 사례의
ERROR 처리를 허용했다. 따라서 이 사례를 수정이 필요한 L1 오탐이나 운영 채택의 장애물로
계속 제시하지 않는다. D-0040에 따라 교정 질문은 제시하되 학생의 진행 선택권은 유지한다.

이는 사례별 교육적 처리 승인이다. 실제 학생 의도가 확정됐다는 사실 주장도, 모든 중의적
표현을 ERROR로 처리하라는 일반 규칙도 아니다. 코드·프롬프트·운영 변경이나 추가 호출은 없다.
사전 '충분 답' 기대와 당시 Codex 의견은 보존한다. 사후 사용자 검토를 실행 전 정답으로
소급하지 않으며 원출력·집계·L2 인용 계약 실패5건은 변경하지 않는다.

## 근거

- 사용자 2026-10-01 해당 사례 ERROR 판정 허용 메시지.
- `docs/experiments/dual-routing-sensitive-six-2026-09-30/case-definitions.json`
- `docs/experiments/dual-routing-sensitive-six-2026-09-30/evaluation-results.jsonl`
- `docs/experiments/dual-routing-sensitive-six-2026-09-30/REPORT.md`
- `memory/decisions/D-0040-low-intervention-dual-routing.md`
