# 인계: 분석 지도 공손룡 2단계 v3(입장 입력 재판정)

- 날짜: 2026-10-17
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0143-analysis-map-gongsun-pilot.md`(명제 입장 표시와 v3 절)
- 앞 단계: `docs/handoffs/2026-10-17-analysis-map-gongsun-stage2-v2.md`, `docs/handoffs/2026-10-17-analysis-map-gongsun-stance.md`

## 목표

- 같은 77라운드·1,552단위를 `JUDGE-PROMPT-v3.md`와 확정 입장(`stance/stance-final.json`)으로 다시 판정한 결과가 `stage2-v3/`에 있다.
- v2와 v3를 나란히 놓은 비교 보고서 `COMPARE-v2-v3.md`(+ `compare-v2-v3.json`)가 있다.

## 범위 밖

- `stage2/`, `stage2-v2/`, `stance/` 기존 파일 변경(읽기만). `frozen-map.json`, 모든 `*PROMPT*.md` 변경.
- 결합 규칙·오류 집계 규칙 변경(기존 함수 그대로 적용).
- `packages/**`, `.omc/logs/**`, `memory/**` 변경. 해석·평가 문장.

## 손댈 파일과 계약

### 1. 스크립트 `scripts/run-analysis-judge-gongsun.mjs`

- `--prompt v3`: 지시문 `JUDGE-PROMPT-v3.md`, 출력 `stage2-v3/`, 스키마 이름 `analysis_judgment_v3`. v1·v2 경로와 기본 동작은 그대로.
- v3에서만 입력에 입장을 넣는다(v1·v2 요청 본문은 바이트 단위로 이전과 같아야 한다).
  - 입장 원천: `stance/stance-final.json`의 `stances`(명제)와 `nodeStances`(비명제 노드).
  - 문자열 변환 `stanceLabel(stance)`: `AUTHOR` → `필자 서술`, `COMMON` → `상식·통념`, `FIGURE` → `<holder>의 주장`, `MIXED` → `혼합(` + parts를 `count` 내림차순, 같으면 원래 순서로 `<변환된 입장> <count>`를 `, `로 이은 것 + `)`.
  - 노드 판정: `target.stance`. 관계 판정: `relation.from.stance`, `relation.to.stance`. 키 순서는 지시문 입력 형식과 같게(`text`, `sourceQuotes`, `stance`).
- 상한: 요청 2,000(이 실행 시도 기준), 실제 청구 $1. 비용 계산·연속 연결 오류 차단·`--resume`은 현재 코드 그대로. `RUN.json`에 프롬프트 버전, v3 지시문 해시, `stance-final.json` 해시 기록.

### 2. 비교 `--compare v2 v3` → `docs/experiments/analysis-map-gongsun-2026-10-16/COMPARE-v2-v3.md`, `compare-v2-v3.json`

기존 v1·v2 비교 기능을 두 버전을 받는 형태로 일반화해도 된다. 단 `COMPARE-v1-v2.*`는 다시 만들지 않는다(파일 불변).

- 요약표(v2 | v3): 기존 v1·v2 요약표와 같은 항목.
- 라벨 전이표(노드·관계, v2 × v3).
- **v2 오류 사건 추적표**: v2의 오류 사건(19개)마다 학생 구간, 걸린 단위 각각의 `v2 라벨 → v3 라벨`(v3 인용), 그리고 그 사건이 v3에서 같은 키로 남았는지(남음/사라짐).
- **v3 새 오류 사건**: v3에만 있는 사건 목록(학생 구간, 걸린 단위, 대표 위치, 꼬리표).
- 지정 사례표: v1·v2 비교와 같은 F1~F7, T1~T6에 다음을 더한다. 열은 `v2 → v3`.
  - T7 `sh:6c177d02` p4 r1 G4(귀속 오류 "묵가는 흰말은 말이 아니라고 함")
  - F8 `v4:0929fd23` p3 r1 P3-5, F9 `sh:6c177d02` p3 r1 P3-5

### 3. 테스트 `scripts/run-analysis-judge-gongsun.test.mjs`

- `--prompt v3` 경로 분기, v1·v2 요청 본문 불변(기존 dry-run 샘플과 비교 또는 고정 입력으로 확인).
- `stanceLabel` 네 종류와 혼합 순서.
- v3 요청 본문의 노드·관계 입력에 `stance`가 지정 순서로 들어감, 학생 응답 외 로그 정보 없음.

## 완료 조건

- [ ] 모든 기존·새 테스트 통과(`run-analysis-judge-gongsun`, `run-analysis-map-gongsun`, `run-analysis-stance-gongsun`).
- [ ] v3 dry-run 요청 1,552, instructions가 v3 절 본문과 일치.
- [ ] v3 실제 실행 완료, 실패 0(필요 시 `--resume`), 요청 ≤ 2,000·실제 청구 ≤ $1.
- [ ] `stage2/`, `stage2-v2/`, `stance/`, `COMPARE-v1-v2.*`, 보호 파일 해시 전후 동일. `packages/**`·`.omc/logs/**`·`memory/**` 변경 없음.
- [ ] `COMPARE-v2-v3.md`, `compare-v2-v3.json`, `stage2-v3/`(`REPORT.md` 포함) 존재.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 전송 승인 범위: 2026-10-17 사용자 승인(D-0143 명제 입장 표시와 v3 절) — `gpt-6-luna` medium 1회, 요청 2,000·실제 청구 $1. 그 밖의 전송이 필요하면 실행 전에 멈춘다.
- dry-run 요청 수가 1,552가 아니면 멈춘다.

## 보완 (2026-10-17, Claude): 라운드 입력 고정

실행 중 발견: 단순 형식 로그에 v2 이후 새 대화가 쌓여 로그에서 다시 뽑으면 93라운드·1,872요청이 된다. 비교 실험이므로 라운드 집합을 고정한다.

- `--rounds-from <path>` 옵션(또는 같은 효과의 설정)을 둔다. v3 실행과 모든 `--compare`는 `docs/experiments/analysis-map-gongsun-2026-10-16/stage2/rounds.jsonl`(77라운드, sha1 `55b5cba7…`, `stage2-v2/rounds.jsonl`과 동일)을 라운드 원천으로 쓴다. 로그는 읽지 않는다.
- 고정 파일을 쓸 때 `RUN.json`에 `roundsSource` 경로와 해시를 기록한다. `stage2-v3/rounds.jsonl`은 고정 파일의 사본이어야 한다(해시 동일).
- 옵션 없이 실행할 때의 기존 동작(로그에서 추출)은 바꾸지 않는다.
- 테스트: 고정 파일 사용 시 로그를 읽지 않음, 라운드 수 77·요청 1,552.
- 새 로그 대화를 포함한 판정은 이번 범위 밖이다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/run-analysis-judge-gongsun.mjs`(`--prompt v3`, `stanceLabel`, `loadStanceLabels`, 입장 입력, `--rounds-from`, `loadInputs(roundsFrom)`, `--compare <a> <b>` 일반화, `trackEvents`), `scripts/run-analysis-judge-gongsun.test.mjs`(테스트 6개 추가), `docs/experiments/analysis-map-gongsun-2026-10-16/stage2-v3/`(신규), `COMPARE-v2-v3.md`, `compare-v2-v3.json`, 이 절. 보호 파일·`stage2/`·`stage2-v2/`·`stance/`·`COMPARE-v1-v2.*` 해시 전후 동일, `packages/**`·`.omc/logs/**`·`memory/**` 변경 없음.
- 테스트 결과: `node --test scripts/run-analysis-judge-gongsun.test.mjs scripts/run-analysis-map-gongsun.test.mjs scripts/run-analysis-stance-gongsun.test.mjs` 46개 통과, 실패 0.
- v3 dry-run: `--rounds-from stage2/rounds.jsonl`로 77라운드·요청 1,552, instructions가 v3 절 본문과 일치, 스키마 이름 `analysis_judgment_v3`. `stage2-v3/rounds.jsonl`은 고정 파일과 바이트 동일, `RUN.json`에 `roundsSource` 기록.
- v3 실제 실행: 요청 1,552, 판정 1,552 전부 OK, 실패 0(resume 불필요), 실제 청구 약 $0.3962.
- 남은 문제: (1) 고정 파일 모드에서 대화(`dialogues`)는 라운드에서 복원하므로 보고서의 대화 목록은 마지막 라운드까지의 차례만 담는다. (2) "고정 파일 사용 시 로그를 읽지 않음"은 코드 경로로 보장하고 별도 테스트로 감시하지는 않는다. (3) 실행 중 `--compare`를 로그 기준으로 한 번 돌려 `COMPARE-v1-v2.*`가 일시적으로 덮어써졌으나 백업으로 즉시 복원했고 이후 `--compare v2 v3` 실행 전후 바이트 동일을 확인했다.
