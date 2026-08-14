# Roadmap 6A — 전체 지문 후보 조사와 법인 선정

## 결정

두 번째 전체 지문은 법학 분야의 **법인의 종류와 자산 운용의 법적 통제**로 확정한다.

| 항목 | 확인 결과 |
| --- | --- |
| source set ID | `69bbf88d8937cf14551903ca` |
| 출처 | 고3 2025년 10월 교육청 모의평가, 10~13번 |
| 본문 | p1~p5, 총 5문단 |
| 각주 | 2개. 정관은 p1, 액면가는 p4에 연결되며 본문 문단으로 세지 않는다. |
| 기존 제품 단락 | 원문 p1 → `content/corporate-law-p1/` |
| 신규 제작 대상 | 원문 p2~p5 |
| tracked 원본 | `packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json` |

선정 이유는 전체 문단과 각주 경계가 명확하고 passage 내부 삽화가 없으며, 기존 제품 단락이 원문 p1에 대응하기 때문이다. 정의·분류·법적 귀속과 실제 수행의 분리·권한·조건·제재·비교 관계를 포함해 광합성의 인과·과정 구조와 다른 평가 구조를 검증할 수 있다.

## 후보 비교 결과

| 후보 | source set ID | 원문 구조와 현재 자산 | 결정 |
| --- | --- | --- | --- |
| 법인 | `69bbf88d8937cf14551903ca` | 본문 5문단+각주 2개, p1이 `corporate-law-p1`, 삽화 없음 | 두 번째 전체 지문 |
| 공시 의무 | `69bbf8f5a029f488d9e52296` | 본문 5문단, p3이 `disclosure-p3` | 차선 후보 |
| 후기 묵가 | `69c011fd78128b2a9beddd5e` | 본문 5문단, p4가 `humanities-p4` | 이후 철학 분야 후보 |
| NCM 전지 | `69bffacbfa5063deffe19cc6` | 본문 6문단+각주 1개, p5가 `science-p5`; p2에 passage 내부 삽화가 있음 | 삽화 자산 문제 해결 전 후순위 |
| 니체 | `69c08e2efa5063deffe1be35` | 본문 5문단, p1이 `nietzsche-p1` | 이후 인문 분야 후보 |

후보 원문은 조사 시 ignored `data/*_result.json`의 `.passage`, `.passage_elements`, 시험 metadata를 대조했다. 이 로컬 파일은 조사 provenance일 뿐 새 clone의 실행 의존성이 아니다. 이번 배치에서 법인 외 후보 원문은 tracked 복사하지 않았다.

## 원문 동결과 p1 대조

법인 tracked fixture는 `.passage`의 정확한 5개 본문 문자열과 2개 각주 문자열을 분리해 보존한다. 전체 source hash는 본문 p1~p5와 각주 fn1~fn2를 원래 순서대로 LF 하나로 연결한 뒤 `normalizeGoldSource-v1`을 적용한 값이다. 정규화는 CRLF/CR을 LF로 바꾸고 전체 문자열 양끝 공백만 제거하며 내부 공백·특수 문자·인용 부호는 보존한다.

- 전체 hash: `sha256:2d32d519fa10d126663a45e27bf17662991ad9466a5ba1c71d5bddf29639a325`
- 원문 p1 hash: `sha256:42120f15e3d012cbdfca912299fb44201e62de3684a8a8119e908524c019a437`
- 제품 p1 hash: `sha256:a5485a190d5ca30a8a503724538526b3df3b3687a61b14159cfe98c8d044db8e`

제품 p1은 원문 p1과 byte-level 및 명시된 공백·개행 정규화 후 모두 불일치한다. 차이는 원문의 `정관*이나`가 제품에서 `정관이나`로 저장된 각주 표식 `*` 한 글자다. 이번 배치에서는 제품 passage, gold, 질의, 타이틀 질의와 회귀 fixture를 수정하지 않았다.

## 품질 상태와 다음 gate

`corporate-law-p1`은 `legacy/no-fingerprint`를 유지한다. 기존 검증 기록과 비교 회귀를 신규 generation provenance로 간주하지 않는다. 구체적인 재승격 계약은 `docs/CONTENT-ASSET-QUALIFICATION.md`에 고정했다.

신규 p2~p5 제작 비용은 72~82회 계획치를 유지한다. 기존 p1의 gold·영역 질의·타이틀 질의 verifier 재실행과 production-query 회귀, verifier calibration, 실패 재시도, 추가 repair cycle은 별도 비용이다. p1 재생성은 기본 계획이 아니다.

또한 6C/G5b 공통 E2E harness를 일반화하기 전에 `pending state-model audit before 6C/G5b`를 해결해야 한다. 문단별 완료의 정본은 기존 문단 세션이어야 하며 지문 진행률과 완료는 여기서 계산하는 것이 원칙이다. 현재 passage session의 `completedParagraphIds`가 완료 상태를 별도로 저장하므로 실제 중복 여부와 제거 경로를 먼저 감사한다. 이번 배치에서는 앱·세션 구현을 변경하지 않았다.
