# 인계: 학생 역할 시뮬레이션 도구 (문단 요약·문제 풀이, 실제 판정기)

- 날짜: 2026-10-29
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet). 도구 확인용 외부 호출만(아래).
- 사용자 승인: 학생 역할 시뮬레이션, 1단계 상한 $10("상한은 넉넉하게"). 검토 기준: [체크리스트](../review/student-sim-review-checklist-2026-10-29.md)

## 목표

Claude가 학생 역할로 **한 턴씩** 응답을 넣고 피드백을 읽을 수 있는 명령줄 도구 `scripts/student-sim.mjs`. 사람이 화면에서 하는 것과 같은 서버 로직(판정기·상태 기계·코드가 쓰는 문장)을 타야 한다.

- **프로세스 안에서 실행**: HTTP 서버를 띄우지 말고 빌드 산출물의 서비스 클래스를 직접 쓴다. 문단은 `packages/app/dist/server/dialogue-simple.js`의 서비스(생성자 옵션 `logDirectory`), 문제는 `problem-feedback.js`의 `ProblemFeedbackController`(로그 경로는 env `CSAT_PROBLEM_FEEDBACK_LOG`, `CSAT_PROBLEM_SESSION_LOG`, `CSAT_EXAMINER_STRATEGY_LOG`, `CSAT_STUDENT_EVIDENCE_LOG`). 상태는 각 서비스의 기록에서 복원되므로 명령 사이에 프로세스가 끝나도 이어져야 한다(서비스가 그렇게 못 하면 결과에 적고 대안 제시).
- **기록 분리**: 모든 기록을 `--run <dir>` 아래로(`<dir>/logs/...`). 사용자 기록(`.omc/logs/...`)에 한 줄도 쓰지 않는다.
- **명령** (모두 `--run <dir>` 필수, 출력은 사람이 읽기 쉬운 한국어 텍스트 + 끝에 JSON 한 줄)
  - `para-start --passage <id> --paragraph <n> --label <이름>` → 세션 키 출력, 문단 원문도 출력.
  - `para-say --key <키> --text "<학생 말>"` → 그 턴에 학생이 받는 말풍선들(화면 순서, 상자·번호 목록·꼬리표 포함), 단계·action·category·corePartsCovered·끝났는지.
  - `prob-start --question <questionId> --label <이름>` → 지문·발문·선지 출력.
  - 문제 화면에서 학생이 할 수 있는 동작(선지 고르기+근거 쓰기, 교정 질문에 답하기, 응/아니 같은 이해 확인, 다시 고르기, [다시 풀기] 등)을 각각 명령으로. 이름은 실제 컨트롤러 동작에 맞춰 정하고 `--help`에 목록. 각 명령은 그 턴에 학생이 받는 말풍선과 지금 누를 수 있는 버튼 목록을 출력.
  - `show --key <키>`: 지금까지의 전체 대화(학생·튜터)를 출력.
  - `cost`: 이 run의 누적 호출 수·토큰·비용(모델별 단가: luna 입력 $0.10/출력 $0.50, sol 입력 $2/출력 $10 per 1M).
- **비용 상한**: run마다 `--cap-usd`(기본 10). 누적 비용이 상한을 넘으면 새 판정 명령을 거부한다. 토큰은 서비스 기록(각 단계 call 메타데이터)에서 합산한다.
- 모델·지시문은 제품 기본값(문단 v4.8, 문제 v5.6·레이아웃 v1) 그대로. 바꾸는 옵션을 만들지 않는다.

## 확인 (외부 호출은 이것만)

- `docs/experiments/student-sim-2026-10-29/smoke/`에 run 하나: 문단 1세션(mRNA 1문단, 정확한 요약 한 번), 문제 1세션(mRNA q19, 오답 하나 고르고 교정 질문에 한 번 답하고 끝까지). 출력 예를 결과에 붙인다. 이 run 비용 $1 이하.
- `.omc/logs/` 아래 파일들의 크기·수정 시각이 실행 전후 같음을 확인.

## 범위 밖

- 제품 코드 변경(필요하면 하지 말고 보고). 판정 지시문. git 쓰기. 5173·5174·5175 서버 건드리기.

## 완료 조건

- [x] `node scripts/student-sim.mjs --help`와 위 확인 run 성공.
- [x] `npm run build` 통과(제품 코드 안 바꿨으므로 생략).
- [x] 아래 "결과"에 명령 목록, 출력 예, 비용, 문서와 달리 판단한 점.

## 결과 (실행 후 작성)

작성: executor (2026-10-29). 산출물: `scripts/student-sim.mjs`, 확인 run `docs/experiments/student-sim-2026-10-29/smoke/`.

### 사용법

공통: `node --env-file-if-exists=.env scripts/student-sim.mjs <명령> --run <dir> ...` (`--help`에 전체 목록). 키는 도구가 붙인다(`para-1`, `prob-1`, ...). run 폴더에 `run.json`(키 표·상한)과 `logs/`(서비스 기록)가 생긴다.

| 명령 | 컨트롤러 동작 |
|---|---|
| `para-start --passage --paragraph(1부터) --label` | 문단 세션 시작, 원문 출력 |
| `para-say --key --text` | `respond` (나의 요약 / 다시 쓴 요약 / 나의 답) |
| `para-retry --key` | 판정 실패 뒤 같은 발화 재전송 |
| `para-new-attempt --key` | `startAttempt` |
| `prob-start --question --label` | 문제 세션 시작, 지문·발문·선지 출력 |
| `prob-select --key --choice N (--text \| --no-rationale)` | SELECT (첫 선택·다시 선택 둘 다) |
| `prob-rationale --key (--text \| --none)` | RATIONALE |
| `prob-correct --key --text` | CORRECT (activeErrorId 자동) |
| `prob-reselect` / `prob-explain` / `prob-finish` | RESELECT / REQUEST_EXPLANATION / FINISH |
| `prob-end --yes\|--no`, `prob-understood --yes\|--no` | END_START, UNDERSTOOD |
| `prob-resume` | RESUME |
| `prob-restart` | [다시 풀기] = 같은 문항의 새 세션(새 키) |
| `show --key`, `cost` | 전체 대화, 누적 비용 |

### 출력 예 (확인 run)

문단 1세션(mRNA 1문단, 정확한 요약 한 번): 판정 INITIAL / PRAISE / CAPTURED / corePartsCovered=[true], 끝남.

```
[튜터 · 피드백]
  문단의 핵심을 빠짐없이 잡았어! 잘했어~
  ┌ 내가 파악한 문단의 핵심 내용
  │ 1. 백신 접종으로 면역 반응을 일으키면 바이러스 감염에 미리 대비할 수 있다. (바로 캐치)
  └
-- 판정(마지막 단계): 단계=INITIAL, action=PRAISE, category=CAPTURED, corePartsCovered=[true]
```

문제 세션 prob-2 (q19, ④ 오답 + 구체적 오류 근거 → 교정 질문 → 답 → 다시 선택 ⑤ → 정답, VERIFIED_CORRECT):

```
[코치]
  "수소 이온 농도가 오히려 높아져서"라고 했지. 보기처럼 투석 처리로 pH를 높이면 수소 이온 농도는 높아지는 쪽이야, 낮아지는 쪽이야?
-- 교정 질문 대상 errorId=E1; 지문 강조: ...
-- 지금 할 수 있는 것: prob-correct --text "..." (답변 전송)
```

문제 세션 prob-1 (같은 문항, 모호한 근거 → 교정 질문 없이 설명으로): 설명 보기 → 이해됐어 응 → COACHING_TERMINATED. END_START·UNDERSTOOD 명령 확인용.

### 비용

확인 run 합계 약 $0.18 (호출 7: luna 3, sol 4; 문단 1회 포함). 상한 $1 안. 캐시 할인 미반영 상한치.

### 확인

- `--help` 정상. 상한 초과 시 거부, `--run .omc/logs/...` 거부, 모르는 키 거부 확인.
- `.omc/logs/` 아래 파일 19개의 크기·수정 시각이 실행 전후 같음(비교 후 SAME).
- 명령마다 프로세스가 새로 뜨고 기록에서 복원되는 것을 확인(문단 `show`, 문제 교정→다시 선택→끝).
- `npm run build`는 제품 코드를 안 바꿔 생략. 5173·5174·5175 서버와 git은 건드리지 않음.

### 문서와 달리 판단한 점

1. **"상태는 서비스 기록에서 복원"은 서비스가 하지 않는다.** 두 컨트롤러 모두 세션을 메모리 Map에만 둔다(복원 API 없음). 도구가 기록(문단 `sessions.jsonl`의 마지막 줄들, 문제 `events.jsonl`의 마지막 세션 스냅샷+대화)을 읽어 컨트롤러의 비공개 `sessions` 맵에 직접 넣는 방식으로 복원한다. 제품 코드는 안 바꿨지만 비공개 필드에 의존하므로 컨트롤러 내부 구조가 바뀌면 깨질 수 있다. 판정 도중 프로세스가 죽으면 문제는 [평가 다시 시도] 상태로 복원(prob-resume), 문단은 제출 직전 상태로 돌아간다(제출 기록이 판정 뒤에만 남음).
2. **문제의 마지막 설명 순차 공개(`다음으로 넘어가기` 버튼)는 재현하지 않음.** 그 단계의 전환은 화면에서만 일어나는 연출이라, 설명 말풍선을 한꺼번에 출력하고 `응/아니`만 준다.
3. **시각 자료(<보기> 그림)는 텍스트로 안 보임.** 도구는 "시각 자료 N개 있음"만 알린다. q19는 <보기>가 그림이라 학생 역할 응답이 그림 내용을 가정할 수 있다(검토 시 주의).
4. **출제자 전략 보기(STRATEGY_NEXT)는 만들지 않음**(문서 요구 목록에 없고 화면 전용). 환경변수 경로는 run 아래로 돌려 두었다.
5. **비용 계산**: 문단은 STEP 기록의 call, 문제는 call.metadata.attempts(없으면 합계)를 쓴다. 문단 판정 실패(EVALUATION_FAILED)는 토큰이 기록되지 않아 비용에서 빠진다(도구가 건수만 경고).
6. 문단 번호 `--paragraph`는 1부터. 세션 하나는 한 문단에 묶인다(다른 문단은 새 세션).
7. 확인 run에서 문제 세션을 둘 만들었다(prob-1: 모호한 근거라 교정 질문이 안 나와 prob-2로 교정 경로 확인). 합계는 위 $0.18 안.
