# 승인 골드 JEV candidate sensor 무호출 복원 감사

- 승인 manifest 60문단·92축을 전수 감사했다. API/JEV 호출0. AX→MR→region→P로 P는92/92, 내부 E는87/92축에서 후보 회수됐다.
- 경고 축77/92, 비대상 MR과 region 공유50, mapped MR끼리 region 공유52, 최종 AX mapping 변경10, 최종 MR 설명 변경23, 최종 bundle에서 candidate P 누락4다.
- Codex 단회 의미 검토23축(고위험15+구조 clean8)은 대체로 정렬11, 과포함6, stale/불완전6. 선택 편향·비독립 검토라 전체 정확도로 일반화하지 않는다.
- 후보 회수는 통과, JEV 센서 자동 확정은 미통과. 후속 최소 변경은 MR별 propositionIds/edgeIds 직접 저장과 수리 동시 갱신이다. Optional은 생성하지 않았다.
- 근거: `docs/experiments/jev-candidate-sensor-audit-v1-2026-09-23/REPORT.md` 및 같은 폴더 JSON/검토 패킷.
