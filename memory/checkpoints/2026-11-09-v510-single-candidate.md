---
date: 2026-11-09
scope: problem-feedback-prompt-adoption
base_commit: fd4d8576
---

# 체크포인트: 판정 채택 후보를 v5.10 하나로 줄임

- 사용자 결정 [D-0216](../decisions/D-0216-v510-single-candidate-diagnostic-first-lab-held.md): v5.9 별도 채택 단계 없앰(v5.10이 v5.9 질문 규칙 포함). 질문 품질 블라인드 판정 뒤 진단평가 기본값 v5.10. lab은 v5.8로 보류, 진단평가 사용 뒤 진단 방식으로 고침.
- 지금 기본값: v5.8(진단·lab). 코드 변경 없음.
- 다음: 블라인드 판정 자료 만들기(저장된 v5.8·v5.9 질문 출력, 조건 가림, 외부 전송 없음, [보고](../../docs/reports/REPORT-v59-v510-run-human.md) 2-4).
