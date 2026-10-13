# 인계: 정답 경로 오답 지표 시험 (가상 오답 20개, Codex 직접 채점)

- 날짜: 2026-10-13
- 작성: Claude
- 실행: Codex (r1, r2 서로 독립 실행)
- 관련 결정: D-0119, D-0121, D-0122 (`memory/decisions/`)
- 정의 문서(필독, "v0.1 개정 규칙"): `docs/review/answer-path-element-vocabulary-v0-2026-10-13.md`
- 채점 규칙·스키마: `docs/handoffs/2026-10-13-answer-path-depth-pilot-v2.md`의 A2 절을 그대로 쓴다. 단 `depth`는 D-0122에 따라 **정답 선지 노드 수**로 적는다.

## 목표

파일럿 2차에서 시험하지 못한 오답 지표(실패 노드 종류·요소, 미확정 처리)를 근거 있는 오답 중심 사례로 시험한다. Claude가 사례와 정답 라벨을 만들었고, 라벨은 채점 완료 후 공개한다.

## 범위 밖

- 외부 API·모델 호출 금지. Codex가 직접 판단한다.
- 동결 지도 수정 금지. `packages/**`, `memory/`, 다른 실험 폴더 수정 금지. `.env` 열람·커밋·푸시 금지.
- 보지 말 것: 파일럿 1·2차의 `scoring*.json`·`REPORT.md`, 이 폴더의 다른 회차 채점 파일, `thought-diagnosis-*` 폴더의 정답·결과.

## 입력

- 동결 지도: `docs/experiments/answer-path-depth-pilot-v2-2026-10-13/item-maps/` (해시: 같은 폴더 `FROZEN.json`)
- 문항(공개): `packages/pipeline/fixtures/experiments/problem-solving/public/` 두 파일
- 사례: `docs/experiments/answer-path-wrong-cases-2026-10-13/cases.json` (20개, 모두 오답 선택)

## 출력

- 회차 지시에 따라 `docs/experiments/answer-path-wrong-cases-2026-10-13/scoring-r1.json` 또는 `scoring-r2.json` 하나만.
- 다른 파일은 만들지도 고치지도 않는다. 비교·보고는 Claude가 한다.

## 중단·보고 조건

- 이 문서와 정의 문서·결정 기록이 충돌하거나 설계 판단이 필요하면 멈추고 보고한다. 미확정·근거 없음은 기록 대상이지 중단 사유가 아니다.
