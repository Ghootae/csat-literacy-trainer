# 광합성 첫 전체 지문 G1~G4 완성

## 범위

- 원본 세트: `69bce4ece23376a28e12cb7c` (`식물의 광합성 효율과 C3, C4 식물`)
- 기존 제품 단락: `photosynthesis-p3`, `photosynthesis-p4`, `photosynthesis-p5`
- 이번 추가 단락: `photosynthesis-p1`, `photosynthesis-p2`, `photosynthesis-p6`
- 생성 모델: Anthropic `claude-opus-4-8`, effort `medium`
- 학생 응답 회귀: Anthropic `claude-opus-4-8`, effort `low`, proposition coverage `off`

## G1·G2 골드 생성과 검수

p1·p2·p6은 원본 데이터셋의 문장 경계를 그대로 사용해 새 provenance 계약으로 생성했다. 세 골드 모두 provider/model/effort, prompt/schema version, 생성 시각, source hash와 generator fingerprint를 보존한다.

사람 검수에서 다음 두 과생성을 수정하고 `reviewed`로 표시했다.

- p2: 원문은 기공이 필요한 조건에서 **열린다**고만 하므로, 합성 노드와 슬롯의 `개폐 기능`을 `열리는 기능`으로 좁혔다.
- p6: 5% 생물량과 23% 광합성량을 하나의 대조 슬롯으로 묶고, 원문에 명시되지 않은 `광합성 효율이 연구 가치의 근거`라는 인과를 필수 코어에서 제거했다.

원시 골드와 생성 로그:

- `.omc/agreement/69bce4ece23376a28e12cb7c_s1_p1.gold-1.json`
- `.omc/agreement/69bce4ece23376a28e12cb7c_s1_p2.gold-1.json`
- `.omc/agreement/69bce4ece23376a28e12cb7c_s1_p6.gold-1.json`
- `docs/experiments/photosynthesis-p1-gold-2026-08-13.log`
- `docs/experiments/photosynthesis-p2-gold-2026-08-13.log`
- `docs/experiments/photosynthesis-p6-gold-2026-08-13.log`

## G3 질의와 앱 콘텐츠

문단별 medium 질의 초안을 생성한 뒤 원문·검수 골드에 대조해 관계 방향, proposition/source 앵커, critical 플래그, 수용·모순 기준을 검수했다. p1 7질의, p2 12질의, p6 5질의다. 타이틀 질의도 문단별 3개를 생성·구조 검증했다.

주요 사람 수정:

- p1: 환경 이외 요인을 말한다는 이유만으로 모순이 되지 않도록, 환경 영향을 명시적으로 부정할 때만 모순으로 좁혔다.
- p2: 광합성 장소를 단순 `잎`이 아니라 `잎의 엽육 세포`로 유지했고, 기공의 두 조건 중 하나만 말한 응답을 완전 보존으로 읽지 않게 했다.
- p6: 타이틀 질의에서 광합성 기여→연구 가치 인과를 필수축으로 요구하지 않게 했다.

`content/passages/photosynthesis.json`이 p1~p6의 지문 소속과 정본 순서를 고정한다. 앱 목록의 `order`도 p1~p6이 연속되도록 40~45로 맞췄다.

## G4 표준 회귀

새 production 질의셋만 대상으로 16개 기대 판정을 고정하고 실행했다.

| 문단 | 프로브 | 기대 일치 | 위험 과대통과 |
| --- | ---: | ---: | ---: |
| p1 | 4 | 4/4 | 0 |
| p2 | 6 | 6/6 | 0 |
| p6 | 6 | 6/6 | 0 |
| 합계 | 16 | 16/16 | 0 |

p6의 `5%·23%` 단순 병치는 처음 fixture에 `partial_relation_preservation`으로 적었으나, 응답이 critical 대조 관계를 표현하지 않으므로 확정된 same-relation-frame 규칙과 영역 정규화상 `topic_only`가 맞다. evaluator나 질의를 바꾸지 않고 사람 기대값만 바로잡았고, 최초 로그와 검증 로그를 모두 보존했다.

- `docs/experiments/photosynthesis-p1-low-off-regression-2026-08-13.log`
- `docs/experiments/photosynthesis-p2-low-off-regression-2026-08-13.log`
- `docs/experiments/photosynthesis-p6-low-off-regression-2026-08-13.log` (최초 기대값 불일치)
- `docs/experiments/photosynthesis-p6-low-off-regression-verified-2026-08-13.log` (확정)

기존 42프로브 기준선은 재작성하지 않았다. 처음 전체 `base`를 실행했을 때 기존 법인 프로브가 API를 다시 호출하기 시작해 해당 명령만 중단했고, 이후 새 세 문단만 이름 필터로 실행했다. 현재 표준 suite의 선언상 총량은 58프로브·11제품 단락이다.

## 결정론적 검증

- `npm run typecheck`: 통과
- `npm test`: 24 files, 302 tests 통과
- `npm run test:e2e`: 1 passed
- 대표 p4 E2E의 다음 문단은 새 정본 순서에 따라 p5로 변경했다.

이번 완료는 광합성 p1~p6의 G1~G4와 앱 등록 순서를 뜻한다. p1부터 p6 완료 후 지문 표제로 넘어가는 전체 지문 G5b는 5단계 작업이며 아직 완료되지 않았다.
