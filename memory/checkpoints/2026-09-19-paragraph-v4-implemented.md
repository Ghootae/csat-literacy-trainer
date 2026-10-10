---
date: 2026-09-19
scope: paragraph-dialogue-v4
base_commit: 58f9c93889a57414bf89ee5b25e698894caad96e
---

# 문단 V4 선택형 보완 구현 및 모의 흐름 검증

## 이번 delta

- 사용자 구현 승인에 따라 D-0013을 추가했다. D-0010 축 범위와 D-0011 진행 선택을 유지한다.
- 1차에 축별 PASS/UNCLEAR_OK/UNCLEAR_SERIOUS/ERROR, 공개 텍스트와 근거를 추가했다.
  구조화 출력 계약은 모든 축·상태 일치·공개 허용·질문 대상 우선순위를 검사한다.
- PASS/OK만 남으면 자동 질문을 생략한다. 학생이 OK 보완을 선택하면 저장한 1차 원판정의
  validatedResult/questionIntent로 2차만 호출한다. 응답을 새로 만든 것으로 기록하지 않는다.
- UI에 축 박스·누적 학생 의미를 분리 표시하고 모든 상태에서 진행을 허용했다.
  숨겨진 축의 정답 텍스트는 학생용 DTO에 넣지 않는다.
- SKIPPED와 UNRESOLVED의 진행 선택을 PASS와 구분해 저장하고 문제 handoff에 전달한다.
  완료/진행 선택된 문단들로 연결 문항에 진입할 수 있다. 문제 평가 V3는 변경하지 않았다.
- 초기·후속·선택적 질문 호출 실패 후 재시도를 허용하고 UI 초안을 보존한다.
- 학생용 TwoStage 기본값은 V4다. 과거 재생 CLI 세 개는 기존 V3를 명시했고 V3/V3.1은 보존했다.
- 골드 수정, 청킹·압축 측정, 유료 API 호출, 공개 서버/터널 재시작, 커밋은 하지 않았다.

## 검증

- `npm run build`, `npm run typecheck:client`, Vite production build 통과.
- 문단·handoff·문제 서버·프로세스 경계 관련 9파일 120테스트 통과.
  신규 V4 단위 흐름은 13테스트이며 축 계약, OK 무질문, opt-in 2차 호출, 3회 한도,
  ERROR/SERIOUS skip, 판정 보존, 실패 후 재제출, 공개 내용/학생 근거 분리를 포함한다.
- 전체 `npm test`: 83파일 773테스트 중 772통과, 1실패. 실패는 변경하지 않은
  `packages/pipeline/src/cli/axis-architecture-experiment.test.ts`가 아래 과거 입력 파일을
  읽지 못하는 ENOENT다. 전체 녹색이라고 보고하지 않는다.
  `.omc/adhoc/paragraph-analysis-v3-1-six-3x-2026-08-26/run-1/hegel-aesthetics-absolute-spirit-p1.json`
- 별도 로컬 포트 5273/5274에서 전체 Playwright **24/24 통과**. 새 V4 테스트 2개를 포함하며
  데스크톱·390px 모바일 박스, OK 보완, SERIOUS/ERROR skip, 연결 문항, 새로고침 표시,
  실패 뒤 초안/질문 재시도를 확인했다. 평가기는 모두 모의이며 모델 비용은 없다.
- 신규 브라우저/서버 테스트 로그는 임시 디렉터리로 격리했다. 화면 PNG도 직접 검토했다.
- 최초 전체 검사에서 새 controller의 fs 직접 사용을 경계 테스트가 탐지했다. JSONL 저장을
  pipeline logger로 옮겨 해결했다. 기존 완료 문구를 기대하던 회귀도 새 표현에 맞춰 갱신했다.

## 버전 재현

- 전체 문단: `axis-dialogue-selective-v4` / 합성 스키마 `axis-dialogue-selective-openai-v3`.
- 1차: `central-story-gate-prompt-v4` / `central-story-gate-openai-v6`.
  프롬프트 SHA-256: `10c318de8c0fa9851a40c389836e4658577055147dabbf9ee32a51c818fa7323`.
- 2차: `dialogue-selective-feedback-prompt-v4` / 기존 질문 스키마 v2.
  프롬프트 SHA-256: `d5480f741c74ccefdaf653e572f91f69cdd042e6e84a7b570f7b1e2c83b7b612`.
- `sessions.jsonl`의 선택적 질문 호출은 `turns[].questionCall`, 진행 선택은 별도
  `progression.jsonl`과 handoff의 `STUDENT_CONTINUED`로 기록한다.

## 미검증과 다음 행동

- 모의 테스트는 실제 학생의 OK/SERIOUS 의미 경계, 부분 공개 정확성, 불필요한 개입 감소를
  검증하지 않는다. Q-0013은 열린 상태다. 서버 재시작 후 진행 중 세션 복원도 이번 구현 범위가 아니다.
- 다음 작업은 현재 버전/해시를 고정한 짧은 실제 응답 표적 검증이다. 유료 시험과 공개 서버
  적용은 실행 범위를 확인한 뒤 별도로 진행한다. 논쟁적인 mRNA PASS를 확정 오류로 되돌리지 않는다.

## 근거

- `docs/PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V4-2026-09-19.md`
- `packages/pipeline/src/dialogue-experiment/optional-revision-v4.test.ts`
- `packages/pipeline/src/dialogue-experiment/gate.ts`, `selective-feedback.ts`, `two-stage-evaluator.ts`, `session.ts`
- `packages/pipeline/src/learning-session/handoff.ts`
- `packages/app/src/server/dialogue.test.ts`, `packages/app/e2e/dialogue-optional-revision.spec.ts`
- `packages/app/src/client/DialogueApp.tsx`, `packages/app/src/server/dialogue.ts`
