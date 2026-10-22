---
date: 2026-10-22
scope: v5-provider-compare-deepseek-1017
base_commit: e951d9d
---

# v5 공급자 비교 재시험: DeepSeek V4.1 Flash-1017 (공손룡 12번)

- 사용자 결정: 1017로 10-08과 같은 내용을 돌려 Gemini·sol·luna와 비교. 10-07 실행 코드는 미커밋으로 덮어써져 재현 불가 →
  현재 운영 v5 판정기로 다섯 설정 모두 재실행(방안 A). 판정은 Codex 종료로 블라인드 하위 에이전트 + Claude 원문 대조 + GPT 판정 기준 칸(방안 가).
- [인계](../../docs/handoffs/2026-10-22-v5-provider-compare-1017.md), [Desktop 보고서](../../docs/experiments/v5-provider-compare-1017-2026-10-22/REPORT-desktop.md),
  [인간 보고서](../../docs/experiments/v5-provider-compare-1017-2026-10-22/REPORT-human.md), [판정 요약](../../docs/experiments/v5-provider-compare-1017-2026-10-22/review/REVIEW-SUMMARY.json).
- 165칸·약 $3.19. 의미 판정 통과: DeepSeek low 28, high 26(판정 없음 1), Gemini 30, sol 30, luna 29 /33.
  기준 칸 12개는 블라인드 판정이 GPT와 12/12 일치.
- 1017은 9월판 약점 일부 해소(X3 통과 0/6, high S7 통과 0, 판정기 자신 ⓓ 오독 0). low는 S7 오독을 2/3 놓침(다섯 설정 중 유일한 오류 놓침).
  OpenAI·Gemini 실패는 대부분 S4·S5 지나친 엄격. luna S2-r3은 판정기 자신 오독.
- 최초 판정 중앙/p90(초): low 40.7/111.7, high 50.9/126.2, Gemini 38.5/122.2, sol 27.2/35.8, luna 21.2/27.4. 비OpenAI 재시도는 전부 90초 시간 초과.
  DeepSeek은 피크 시간 실행. sol·luna 비용은 캐시 할인 미반영 상한.
- 33칸이 모두 정답 선택이라 운영상 luna 자리. 오답(sol) 자리 품질은 측정하지 않았다.

## 다음 행동

- 사용자 결정(가): 현재 구성 유지·1017 종결 → [D-0165](../decisions/D-0165-keep-luna-sol-over-deepseek-1017.md). 재검토는 sol 비용 부담 또는 DeepSeek 지연 개선 시.
