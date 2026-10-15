---
id: D-0138
status: accepted
date: 2026-10-15
scope: paragraph-dialogue-fundamental-review
supersedes: none
---

# 문단 요약 근본 검토: 보여 주기 모드 구현 중지, 질문 비교 먼저

## 결정

- 문단 요약 파트를 목표에서 다시 검토한다. 목표는 학생 응답이 문단의 핵심을 잡았는지 확인하고, 못 잡았으면 질문으로 학생 스스로 고치게 하는 것이다. 축 골드·V4 축 판정·축 기반 질문은 이 목표의 수단으로 보고 검토 대상에 둔다.
- 검토 가설(사용자 제안): 문단에 최적의 축 구조가 있다는 전제가 무리였다. 문단과 응답만으로 전체 판정을 하고, 부족하면 가장 큰 구멍 하나를 묻는 단순 형식이 목표에 맞을 수 있다.
- 보여 주기 개발자 모드 구현([D-0134](./D-0134-boundary-show-dev-mode-central-object.md)~[D-0137](./D-0137-boundary-show-effective-response-restatement.md), 미구현 후속)은 검토가 끝날 때까지 멈춘다. 결정 기록은 보존한다.
- 첫 확인은 질문의 질이다. H0와 V4 질문이 함께 있는 10시점을 블라인드로 비교한다(API 0회, [묶음](../../docs/experiments/question-quality-h0-vs-v4-2026-10-15/README.md)).

## 근거

- 사용자 지시(2026-10-15): "그 방향이 정말 맞는 거였는지 근본적으로 검토", "문단에 최적의 구조가 있으리란 전제 자체가 무리이지 않았을까?", 보여 주기 모드 중지와 비교 시험 "그렇게 진행해줘", "10쌍 비교 묶음 만들어줘".
- 축 구조는 수렴하지 않았다: 축 후보 시험 사람 exact 3/8·매회 1위 동일 3/8([D-0066 요약](../../docs/experiments/axis-candidate-jev-eight-2026-10-02/SUMMARY.md)), 두 단계 생성 v3에서 과적합 우려로 멈춤([체크포인트](../checkpoints/2026-10-08-two-stage-paused-at-v3.md)), 축 묶임 Q-0036.
- 제안 형식은 이미 H0로 시험됐다. H0 요청은 지문·대상 문단·대화만 받았고 축·centralStory가 없었으며, 판정·`brokenRelation` 하나·질문을 한 호출에서 냈다(`docs/experiments/holistic-verdict-shadow-2026-10-08/shadow-instructions.md`, `sent-requests.jsonl`). 축 귀속 호출은 축 ID만 붙이고 질문을 만들지 않았다.
- 33시점 사람 2회차 기준 V4 대 H0: 질문 17 대 15, 불필요한 질문 7 대 6, 놓침 1 대 2([REPORT](../../docs/experiments/holistic-verdict-shadow-2026-10-08/REPORT.md)). D-0132는 "H0가 V4를 대체할 만큼 뚜렷하게 나은가"를 물어 V4를 유지했다. 이번 검토는 "축 구조가 복잡도만큼 값을 하는가"를 묻고, 같은 자료는 측정되는 이득이 없다고 답한다(Claude 해석).
- H0 질문 18개는 사람이 평가한 적이 없다.

## 포함하지 않는 것

운영 판정·UI 변경, D-0132·D-0133 철회, 추가 API 실행. 단순 형식 채택은 질문 비교 결과와 조정에 쓰지 않은 새 응답 검증 뒤 별도 결정한다.
