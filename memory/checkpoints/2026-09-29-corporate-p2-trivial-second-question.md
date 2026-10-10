---
date: 2026-09-29
scope: paragraph-v4-question-quality
base_commit: 58f9c93
---

# 법인 2문단 선택적 2차 질문의 빈칸형 실패

## 새로 확인된 것

- 개발자 세션 `126037eb-1619-49b9-a490-ba5bc6795e0f`에서 최초 응답은 기본 재산 외 수익 활동이 영리 목적이 아니라 목적 사업 재원 마련용이며 관리·보고가 필요하다고 설명했다.
- 첫 보완 답변 `재산` 뒤 AX3만 `UNCLEAR_OK`로 남았고, 저장된 판정에는 자동 질문이 없었다. 학생의 별도 보완 요청으로 2차 질문 호출이 실행됐다.
- 2차 질문은 `기본 재산 외 자산으로 수익을 추구하는 활동은 어느 정도 범위에서 할 수 있나요?`였고 학생의 `일정 범위` 답변만으로 AX3가 PASS했다.
- 이 질문은 대상 축의 `제한적으로 허용된다`를 사실상 빈칸으로 바꿨으며, 질문 프롬프트의 축 설명 단순 의문형 금지·정답 문장 빈칸형 추종 금지 계약과 맞지 않는다.

## 결정된 것

- 정책이나 프롬프트 수정은 아직 결정하지 않았다.

## 변경한 것

- 제품 코드 변경은 없다. 실제 세션의 판정·질문·후속 PASS 경로만 감사했다.

## 미해결

- 최초 응답의 목적 제한과 관리·보고가 AX3의 제한성을 이미 충분히 표현한 것으로 보아야 하는지, 또는 `UNCLEAR_OK`는 유지하되 선택적 질문이 무의미한 경우 질문 생성을 거절할 수 있게 할지 정해야 한다.

## 다음 행동

- 수정 전에 같은 유형의 수식어·범위 누락 질문이 다른 실제 세션에도 반복되는지 확인하고, 게이트 판정과 2차 질문 거절 경로를 분리해 검토한다.

## 근거

- `.omc/logs/dialogue-experiment/sessions.jsonl`의 문단 세션 `deba1db1-ab28-455c-a351-4c676a6b905a` (후속 요청 감사에서 확인. 본문의 `126037eb-1619-49b9-a490-ba5bc6795e0f`는 상위 개발자 UI 세션 ID)
- `packages/pipeline/experiments/dialogue/central-story-gate-prompt-v4.md`
- `packages/pipeline/experiments/dialogue/selective-feedback-prompt-v4.md`
- `docs/PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V4-2026-09-19.md`
