---
id: D-0165
status: accepted
date: 2026-10-22
scope: problem-evaluator-model-routing
supersedes: none
---

# DeepSeek V4.1 Flash-1017 재시험 뒤 판정기 luna·sol 구성 유지

## 결정

문제 풀이 판정기 모델은 [D-0104](./D-0104-problem-evaluator-model-routing-by-choice.md)·[D-0129](./D-0129-keep-luna-sol-over-gemini-after-price-check.md) 구성(정답 luna, 오답 sol)을 유지한다.
DeepSeek V4.1 Flash-1017은 채택하지 않고, sol 자리 후보 추가 시험도 지금은 하지 않는다.

## 근거

- 사용자 결정(2026-10-22): "가로 선택"(Claude 권고: 현재 구성 유지, 1017 종결).
- [재시험 보고서](../../docs/experiments/v5-provider-compare-1017-2026-10-22/REPORT-desktop.md): 공손룡 12번 33칸, 현재 운영 v5 판정기, 블라인드 판정이 GPT 기준 칸 12/12 일치.
  통과 DeepSeek low 28·high 26·Gemini 30·sol 30·luna 29. low만 S7 학생 오류를 2/3 놓침, high는 판정 없음 1.
- 33칸이 모두 정답 선택(운영상 luna 자리). luna는 최초 판정 중앙 21초·$0.08 이하로, 1017 low(41초, 비피크 약 $0.18)보다 빠르고 싸다.
- 1017의 비용 이점은 sol 자리에서만 가능한데, 지연(high p90 126초, 비OpenAI 재시도 전부 90초 시간 초과)이 학생 대기로 쓰기 어렵고 데이터 정책도 확인되지 않았다.

## 폐기한 대안

- 1017을 sol 자리 후보로 오답 48세션 사례에서 추가 시험: 지금 병목은 비용이 아니라 외부 학생 검증이고, 속도 문제가 먼저 풀려야 한다.

## 재검토 조건

- sol 비용이 실제 부담이 될 때, 또는 DeepSeek 지연이 크게 줄었다는 근거가 생길 때 오답 자리 시험으로 다시 연다(데이터 정책 확인 선행).
