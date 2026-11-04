---
id: D-0199
status: accepted
date: 2026-11-04
scope: problem-evaluator-model-routing
supersedes: none
---

# gpt-6.1-terra 시험 뒤에도 오답 경로는 sol 유지

## 결정

문제 풀이 판정기의 오답 경로(선택 판정·결론 확인·마지막 설명)는 `gpt-6.1-sol`을 유지한다([D-0104](./D-0104-problem-evaluator-model-routing-by-choice.md)·[D-0107](./D-0107-session-model-routing-repair-reselect-coaching.md)). `gpt-6.1-terra`는 대체 후보로 기록만 한다.

## 근거

- 사용자 결정(2026-11-04): "솔로 유지하는 걸로 결정. 테라 실험 결과는 기록." (코드 에이전트 권고 (가)와 같음)
- [실험 보고](../../docs/experiments/terra-vs-sol-2026-11-04/REPORT-desktop.md): 저장된 sol 기록을 기준으로 재사용(D-0168), terra만 새로 실행, 비용 $1.11.
  - 회귀 13세션 재생: 최종 outcome 13/13 같음, 첫 판정 결론 12/12 같음(S-A1은 기준이 DIVERGED). 교정 질문은 G-A2·I-A2에서 terra가 더 추상적.
  - 19번 ⑤ P1 SUPPORTED: sol 4/10, terra 0/10(luna·DeepSeek Flash와 같은 엄격 쪽). N1·N2 음성 대조는 둘 다 0.
  - 공손룡 12번 S2·G2 기호 조건: terra·sol 모두 ERROR 10/10, 기호 오독 0.
  - 마지막 설명: v2.2 형식(같은 입력 6쌍) 정확성 대등(경미 3 대 3). layout v1에서는 terra가 근거 단계를 압축해 빠뜨린 사례 1건(S-B2 answer, "세 값의 곱" 전제 누락).
  - 비용은 sol의 약 절반(오답 세션당 약 $0.06 → $0.03), 지연은 같음(약 24초).
- sol을 오답 경로에 둔 이유(D-0107 오답 코칭 품질, D-0192 경계 판정 수준)와 terra가 약한 지점이 겹치고, 절감액이 작다.

## 폐기한 대안

- (나) 판정만 terra, 마지막 설명은 sol: 경계 판정이 엄격해지는 위험이 남는다.
- (다) 오답 경로 전부 terra: 위 위험에 설명 압축이 더해진다.

## 재검토 조건

- 오답 세션 비용이 운영에서 문제가 될 때, 또는 terra 후속판이 P1 같은 경계 근거와 설명 단계 서술에서 sol 수준이라는 근거가 생길 때. 실행기(`scripts/run-v5-regression-replay.mjs --incorrect-model`, `scripts/run-v58-terra-p1.mjs`, `scripts/run-end-explanation-v22-terra.mjs`, `scripts/run-marker-terra-sol.mjs`)를 다시 쓸 수 있다.
