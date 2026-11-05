# 인계: SNS 진단 세트 E의 분석 골드·선지 연결 생성

- 날짜: 2026-11-05
- 작성: Claude(코드 에이전트)
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0201-sns-diagnostic-set-e.md`, 절차 `memory/decisions/D-0151-analysis-gold-standard-procedure.md`
  (`docs/ANALYSIS-GOLD-PROCEDURE-2026-10-20.md`), 선지 연결 `memory/decisions/D-0162-choice-link-layer-direction.md`

## 목표

D-0201 세트 E 4지문의 분석 골드(지도·입장·관계 유형)와 선지 연결(3회)을 기존 도구로 만든다. 단계 사이의 동결 선택·입장
확정·선지 연결 덮어쓰기는 코드 에이전트가 하므로, 각 단계 끝에서 멈추고 보고한다.

| passageId | set_id | 제목 | 비고 |
|---|---|---|---|
| consciousness-cognition-ga | 69c0114f78128b2a9bedd8fc | 의식과 인지 과정에 대한 철학적 논의 (가) | 복합, `--section`, 짝 `consciousness-cognition-na` |
| consciousness-cognition-na | 69c0114f78128b2a9bedd8fc | 같은 글 (나) | 복합, 짝 `consciousness-cognition-ga` |
| plastic-polymerization | 69bc1c89a029f488d9e54e5b | 플라스틱의 중합 반응과 물리적 성질 | 단일 |
| audio-perceptual-coding | 69bc96468095df3b8c51460e | 오디오 신호의 디지털 저장과 지각부호화 압축 | 단일 |
| horse-race-reporting | 69c0041afa5063deffe1a036 | 경마식 보도와 선거 방송 토론회 | **분석 골드 이미 동결**(`docs/experiments/analysis-gold-calibration-2026-10-20/horse-race-reporting/`, 관계 유형 `.../classify/horse-race-reporting/classify.json`). 선지 연결만 한다 |

작업 폴더: `docs/experiments/sns-diagnostic-gold-2026-11-05/`(새로 만든다). 폴더 구성은 `docs/experiments/analysis-gold-calibration-2-2026-10-21/`를 따른다.

## 범위 밖

- 지시문·점검표·스크립트 수정 금지. 지시문은 아래 파일을 **무수정**으로 쓴다. 스크립트에 기능이 없어 막히면 멈추고 보고한다.
- 동결 회차 고르기, `stance-final.json` 덮어쓰기, 선지 연결 `overrides.json` 작성은 하지 않는다(코드 에이전트 몫).
- 다리 층((가)–(나) 관계), 출제자 전략 글, 앱 연결(`packages/**`)은 하지 않는다.
- 기존 실험 폴더(경마식 포함)는 읽기만 한다. 파일 삭제 금지.
- `git add`·`commit`·`stash` 금지. `memory/**`, `AGENTS.md`는 건드리지 않는다.

## 단계와 계약

외부 전송은 아래 "외부 전송 승인" 범위 안에서만 한다. 단계마다 dry-run을 먼저 하고 통과해야 실제 전송한다.
응답이 없는 서버·연결 오류(503 등)는 같은 회차를 한 번만 다시 보낸다(`--round <n>`, `<id>/rerun-r<n>/`). 응답이 온 실패(형식
오류·거부·검증 실패)는 다시 보내지 않는다.

### 1단계: 변환 + 지도 3회 → 멈춤

1. `scripts/import-suneung-passage.mjs`로 4개 지문 파일을 `<작업 폴더>/passages/`에 만든다. 복합 지문은 `--section`(가·나)과
   `--pair-passage-id`를 쓴다. 문단 수·각주 수를 보고에 적는다.
2. 지도: `scripts/run-analysis-map-gongsun.mjs --prompt docs/experiments/analysis-gold-calibration-2-2026-10-21/MAP-PROMPT-v2.md`,
   `gpt-6.1-sol` medium, 지문당 3회. 명령 형태는 `analysis-gold-calibration-2-2026-10-21`의 `RUN.json`과
   `docs/handoffs/2026-10-20-analysis-gold-calibration-maps.md`를 따른다.
3. 보고: 지문·회차별 구조 검증 6항목 결과, 비용, 실패·재전송. **여기서 멈춘다.** 코드 에이전트가 동결본(`frozen-map.json`,
   `FROZEN.md`)을 만든 뒤 2단계를 지시한다.

### 2단계: 입장 + 관계 유형 → 멈춤

1. 입장: `scripts/run-analysis-stance-gongsun.mjs --prompt docs/experiments/analysis-gold-calibration-2-2026-10-21/STANCE-PROMPT-v2.md`,
   sol medium, 동결본당 1회. 검증 3항목 결과를 보고한다.
2. 관계 유형: `scripts/run-relation-classify.mjs`, 지시문 `docs/experiments/relation-classify-2026-10-19/CLASSIFY-PROMPT-v3.md`,
   sol medium, 동결본당 1회. 검증 결과와 기타 비율을 보고한다.
3. **여기서 멈춘다.** 코드 에이전트가 `stance-final.json`을 만든 뒤 3단계를 지시한다.

### 3단계: 선지 연결 3회 → 멈춤

1. `<작업 폴더>/targets.json`을 만든다. 형식은 `docs/experiments/choice-link-2026-10-22/targets-calib.json`과 같다(복합 지문은
   `key`+`sections`). 경마식 보도는 기존 동결 지도·`stance-final.json`·`classify.json` 경로를 그대로 가리킨다.
   어휘 문항은 넣지 않는다: 의식과 인지 17번, 플라스틱 11번. 넣을 문항: 의식과 인지 12~16, 경마식 4~7, 플라스틱 8~10, 오디오 14~17(16문항).
   어휘 문항을 빼는 방법이 기존 형식에 없으면 멈추고 보고한다.
2. `scripts/run-choice-link.mjs --prompt docs/experiments/choice-link-2026-10-22/CHOICE-LINK-PROMPT-v5.md --runs 3`, sol medium,
   결과는 `<작업 폴더>/choice-link/runs/`. 명령 형태는 `docs/experiments/choice-link-2026-10-22/runs/ui-v5/RUN.json`을 따른다.
3. `scripts/freeze-choice-link.mjs`를 덮어쓰기 없이 한 번 돌려 미결(`UNRESOLVED_TYPE`)·위반·`explanationAgreement: DIFFER` 목록을
   보고한다. **여기서 멈춘다.**

## 외부 전송 승인

(사용자 승인 뒤 코드 에이전트가 채운다. 승인 전에는 dry-run까지만 한다.)

## 완료 조건

- [ ] 1단계: 4개 지문 파일, 지도 12회 결과와 검증 보고
- [ ] 2단계: 입장 4회·관계 유형 4회 결과와 검증 보고
- [ ] 3단계: `targets.json`(16문항), 선지 연결 3회 결과, 덮어쓰기 없는 동결 시험 결과 보고
- [ ] 단계마다 `RUN.json`·`ledger.jsonl`에 모델·요청 수·비용이 남음
- [ ] 관련 테스트: `node --test scripts/run-analysis-map-gongsun.test.mjs scripts/run-analysis-stance-gongsun.test.mjs scripts/run-relation-classify.test.mjs scripts/run-choice-link.test.mjs scripts/freeze-choice-link.test.mjs` 통과(스크립트를 고치지 않았으면 기존 상태 그대로)

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 승인 범위(요청 수·비용 상한)를 넘게 되면 보내기 전에 멈춘다.
- 지도 3회 모두 구조 검증 실패인 지문이 있으면 그 지문은 2단계로 넘기지 말고 보고한다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
- 테스트 결과:
- 남은 문제:
