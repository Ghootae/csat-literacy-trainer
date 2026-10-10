# 2026-09-29 — 기능적 메타 축 이중 판정 v1

## 변경분

- 사용자는 생성 후보반복2를 실제 응답 판정에 쓰도록 요청했고, '사용할 수 있는 범위가 다르다'만
  말한 답은 Level1 미충족·Level2 충족→보상없는기본PASS가 의도임을 명시 확인했다.
- 향후 실행에 필요한 정보·의미 기준이 있으면 충분히 질문한 뒤 진행하라는 선호를 기록했다.
- D-0038의 비교방향 생략 관측은 유지하되 그것이 메타 수준에서도 반드시 결함이라는 해석은
  사용자 승인으로 수정한다. D-0039는 실험·예시기준 승인이지 운영 승격이 아니다.

## 측정

- 법인4문단 실제최초1+합성5 × Level1/2 ×3 =36호출, API실패0·계약유효35·재시도0.
- Level1은 D-0037 후보 그대로, 입력description은 생성반복2. Level2는 metaAxis+학생응답만.
- 사용자승인C3: L1도PASS3/3·L2true3/3→보상자격PASS가 되어 기대기본PASS와 불일치.
- 실제C1 AX1: L1 OK/PASS/PASS, L2true3/3→기본/보상/보상. AX2는모두질문후보, 문단전체PASS아님.
- C4 위험·신중함: L1원판정OK3/3·L2true3/3; 유효2회기본PASS,1회정확인용계약실패.
- 충분C2양축3/3보상PASS, 누락C5양축3/3질문후보, 방향역전C6 AX1 L1ERROR3/3로
  L2true3/3에도최종ERROR. L2가정확성검사를대체하지않음을확인.
- 구조실패는 '쓸 수 있지만'을 인용에서 '쓸 수 있다'로 바꾼 claimLedger 때문. 원출력보존·수리0.
- Level1중앙13.032초·Level2중앙4.128초. 비용절감시험이아니며 운영UI지연으로환산하지않음.

## 남은 결정과 범위

Level1 PASS가세부이해보상자격을충분히보증하지않음. 다음실험전 보상경계와C4허용여부는
사용자와논의한다. 기대미확정사례는정확도에포함하지않음. 작은개발표본이고일반화미검증.
운영프롬프트·골드·UI·서버변경0, 보상지급0, 질문생성0, JEV0.

## 출처

- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/PLAN.md`
- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/REPORT.md`
- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/REVIEW-PACKET.md`
- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/summary.json`
- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/execution-audit.json`
- `scripts/test-meta-axis-evaluation.mjs`
- `memory/decisions/D-0039-two-level-meta-axis-evaluation-pilot.md`
