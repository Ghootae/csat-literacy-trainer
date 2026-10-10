---
date: 2026-10-06
scope: auditor-v2-min-two-axes-prepared
base_commit: uncommitted
---

# 감사기 v2(일반 문단 최소 2축·병합 기록 계약) 결정과 준비

사용자 제안과 명료화 답변으로 [D-0086](../decisions/D-0086-auditor-min-two-axes-and-merge-contract.md)을 기록했다. 핵심은 다음과 같다.

- 감사기만 일반 문단을 최소 2축으로 유지한다. 예외는 없다.
- 문단 기능은 모델이 판정하되, 확실하지 않으면 일반 문단으로 본다.
- Claude·Codex 권고 전체(FA 문구 수정, 관계 중심 기준, 병합 기록 계약, 검토 표시만, A+B 먼저)와 Claude의 우려 2개를 수용했다.

구현과 검증 결과는 다음과 같다.

- `scripts/test-axis-audit-v2.mjs`와 `scripts/lib/axis-audit-v2-contract.mjs`를 추가했다. v1의 자동 병합 결과 25문단·60축을 그대로 입력으로 쓰고 감사 단계만 바꾼다.
- 단위 테스트 16/16 통과(코드 리뷰 지적 9건 반영 후). prepare는 25문단 모두 '모두 유지' 출력의 계약 통과, 결정적 요청 생성, 최소 2축 위반 검출을 확인했다. API 호출은 0회다.
- `run`은 D-0086 이후의 이 실험 전송 승인 기록 없이는 실행을 거부한다.
- 실제 실행(감사 25회, 원문·축의 OpenAI 전송)은 별도 명시 승인을 기다린다. 기존 v1 스크립트·결과, 운영 골드·UI는 변경하지 않았다.
- 계획: `docs/experiments/axis-audit-v2-min-two-2026-10-06/PLAN.md`.
