---
date: 2026-10-08
scope: v5-provider-compare-gongsun
base_commit: de9d766b97ab947193e3acbdedbeace11b699608
---

# v5 공급자 비교(공손룡 12번)

- 사용자 결정: 지연 시간 때문에 Gemini 3.8 Flash와 DeepSeek V4.1 Flash(`deepseek-flash`, effort low·high)만 먼저 시험. 사전 점검과 본 실행 모두 사용자 승인.
- 조건: v5 + 주장 분해 + 인용 규칙(methods), 응답 11개 × 3반복. 구현 `scripts/lib/provider-adapter.mjs`·`scripts/test-v5-provider-compare-gongsun.mjs`(Codex, Claude 검토).
  Gemini 생각 토큰이 `total_tokens`에만 잡히는 문제를 사전 점검에서 찾아 어댑터를 고친 뒤 다시 고정.
- [실행 결과](../../docs/experiments/v5-provider-compare-gongsun-2026-10-07/), [의미 검토 요약](../../docs/experiments/v5-provider-compare-review-2026-10-08/REVIEW-SUMMARY.json)
  (Claude 먼저 고정 → GPT-6 Astra 블라인드). GPT 기준 P1~P4 전부 통과:
  Gemini 32/33, DeepSeek low 25/33, DeepSeek high 22/33(+시간 초과로 판정 없음 1). 같은 기준의 OpenAI 결과: terra 28, sol 32, luna 29.
- Gemini는 심각한 실패 0, 칸 중앙값 24초, 공식 단가 약 0.55~0.77달러/33칸. DeepSeek은 S7(갑이 가지고 있지 않은 옷)을 low 3/3·high 2/2 통과시켰고
  low는 X3도 2/3 통과시켰다. high는 칸 중앙값 45초·p90 142초이고 코칭·근거에서 판정기 자신의 오독(ⓓ=들고 있는 옷, "없다는 게 아니라"를 "없다"로 자름, ④ 정답 뒤집힘)이 잦았다.
- Claude 판정은 코칭 앞부분만 읽어 DeepSeek high의 코칭·근거 오류 7건을 놓쳤다. 원문 대조로 GPT 지적을 수용했다.
- 교정 질문의 양자택일·예/아니오·정답 노출은 모든 모델에 남은 과제다.
- 가설(미확정): 판정기 모델 후보는 gemini-3.8-flash와 gpt-6.1-sol. 한 문항·소표본이라 다른 문항 시험 전에는 고르지 않는다.

## 다음 행동

- 판정기 모델 후보 결정(사용자) → 다른 문항(정보 비대칭 13, 표면 장력 16, 도파민 13, mRNA 19 그림) 시험. DeepSeek 데이터 정책은 채택 전 확인.
