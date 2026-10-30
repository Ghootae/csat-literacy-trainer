---
id: D-0192
status: accepted
date: 2026-10-30
scope: problem-evaluator-model-routing
supersedes: none
---

# DeepSeek V4-Pro·Flash 시험 뒤에도 판정기 luna·sol 구성 유지

## 결정

문제 풀이 판정기 모델은 [D-0104](./D-0104-problem-evaluator-model-routing-by-choice.md)·[D-0165](./D-0165-keep-luna-sol-over-deepseek-1017.md) 구성(정답 luna, 오답 sol)을 유지한다.
정답 세션의 어려운 근거를 sol 수준으로 판정하되 비용을 낮추려는 DeepSeek 대체 시도는 종결한다.

## 근거

- 사용자 결정(2026-10-30): "구성 유지·DeepSeek 종결만"(코드 에이전트 권고).
- [실험 보고](../../docs/experiments/v58-conclusion-2026-10-29/deepseek/REPORT-desktop.md): 19번 ⑤ P1 글을 v5.8로 판정, 기준은 저장된 sol 기록 재사용(D-0168), DeepSeek은 그림을 텍스트 설명으로 대체.
  - P1 SUPPORTED: luna 0/5, sol 4/10, Pro(high) 3/10, Flash(high) 0/10. 음성 대조 N1은 모두 INSUFFICIENT.
  - 세션당 비용: sol $0.051, Pro 비피크 $0.037·피크 환산 약 $0.074(출력 토큰 sol의 약 5.5배), Flash 비피크 $0.008.
  - 요청 지연 중앙: sol 33초, Pro 173초, Flash 70초. Pro 형식 재시도 3/16.
- Pro는 sol 수준 판단이지만 학생 사용 시간대(피크)에 더 비싸고 5배 느리다. Flash는 luna 수준이다.
- 데이터 정책(2026-10-30 확인): 서버가 중국에 있고, API 데이터를 훈련에 쓰는지는 명시돼 있지 않다. 14세 미만 서비스 제외, 14~17세 보호자 동의 필요.

## 폐기한 대안

- Pro 생각 강도 low·끔 조건 재시험: 판단이 Flash 수준으로 내려갈 가능성이 크고 지연·데이터 정책 문제가 남는다.

## 재검토 조건

- DeepSeek(또는 다른 공급자)의 출력 토큰·지연이 크게 줄었다는 근거가 생기고 데이터 정책이 학생 사용에 맞을 때.
