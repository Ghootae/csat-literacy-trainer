# 인계: 문제 화면 e2e 기존 실패 14개 복구

- 날짜: 2026-10-28
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet). 외부 API 호출 없음.
- 사용자 승인(2026-10-28): "두가지 모두 진행"

## 문제

`packages/app/e2e/problem-lab-workbench.spec.ts`는 커밋 `e03cb6e1`(묶음 작업 전 HEAD)에서도 19개 중 14개가 실패했다. 지금(커밋 `fc23963b`)은 새 시험이 더해져 22개 중 8개 통과, 14개 실패다. 실패 예: "system failure resumes…"에서 [평가 다시 시도] 뒤 평가가 또 실패해 `답변 전송`이 나오지 않는다(화면에 "피드백을 만들지 못했어…" 경고).

가설(미검증): 판정기 v5.3~v5.6(D-0178·D-0182·D-0185)에서 판정 출력 스키마·서버 검증(`normalizeCells`·`settleConclusion`·`validateClaims`, 세 칸 판정, `readingSummary`)과 마지막 설명 레이아웃 v1(D-0184) 출력 계약이 바뀌었는데, 스펙 안 모의 판정기(`FeedbackEvaluator` 구현, 13행 근처)가 옛 형식 출력을 낸다. 묶음 2 작업자가 현재 형식의 `페이싱` 분기를 모의 판정기에 이미 더했으니 본보기로 쓴다.

## 목표

- 14개 실패의 원인을 시험마다 분류해 아래 "결과"에 표로 적는다: (가) 모의 판정기 출력이 현재 계약과 맞지 않음, (나) 시험 기대값이 결정으로 바뀐 동작과 맞지 않음(어느 결정인지), (다) 실제 제품 버그.
- (가)·(나)는 시험 쪽(모의 판정기·기대값)을 고쳐 통과시킨다. 시험이 확인하려던 동작(이름이 말하는 것)은 줄이지 않는다. 확인 항목을 빼야만 통과하면 빼지 말고 보고한다.
- (다)는 고치지 않고 재현 조건·관련 코드 위치를 보고한다.

## 범위 밖

- 제품 코드(`packages/app/src`, `packages/pipeline/src`)와 지시문 변경. git 쓰기 명령. 외부 API 호출.
- `docs/PROBLEM-LAB-FLOW-2026-10-24.md`(다른 작업자가 동시에 고친다).

## 완료 조건

- [ ] `PLAYWRIGHT_CLIENT_PORT=5393 CSAT_API_PORT=5394 CSAT_PROBLEM_LAB_API_PORT=5394 npx --no-install playwright test packages/app/e2e/problem-lab-workbench.spec.ts` 전부 통과, 또는 (다)로 분류한 시험만 실패.
- [ ] 문단 화면 `packages/app/e2e/paragraph-bubble-pacing.spec.ts`(포트 5395/5396)도 통과.
- [ ] `npm run build` 통과, `npm test`는 기존 실패 2건만.
- [ ] e2e가 다른 날짜의 `docs/handoffs/*.png`를 덮어쓰면 HEAD 내용으로 되돌린다.

## 결과 (실행 후 작성)

### 원인 분류 (기준: 복구 전 HEAD 스펙을 그대로 돌린 결과 22개 중 14개 실패)

- (가) 모의 판정기가 현재 판정 스키마에 없는 `coaching` 키를 내서, 엄격 스키마(`FeedbackSelectionAssessmentSchema`·`FeedbackRepairAssessmentSchema`, `packages/pipeline/src/problem-solving/feedback.ts`)가 거부 → 평가 실패 경고. 실패 14개 모두의 1차 원인.
- (나) (가)를 고친 뒤에야 드러난 시험 기대값 문제 5개: 대기 말풍선 문구가 3종 풀에서 무작위(`packages/app/src/shared/bubble-lines.ts`)인데 시험은 1종 고정, 말풍선 간격(최소 1.2초)으로 응 버튼이 5초 안에 안 켜짐.
- (다) 실제 제품 버그: 없음.

| # | 시험 | 원인 | 고친 곳 |
|---|---|---|---|
| 2 | three panes, persistent draft… | (가) | coaching 제거 |
| 4 | ambiguous correct can decline… | (가) | 〃 |
| 5 | system failure resumes… | (가) | 〃 |
| 6 | a RESUME that fails again… | (가) | 〃 |
| 7 | failed correction ends with coaching… | (가) | 〃 |
| 8 | lost POST response recovers… | (가) | 〃 |
| 9 | composer keeps three rows… | (가) | 〃 |
| 11 | restored sections appear immediately… | (가) | 〃 |
| 13 | mobile correction button… | (가) | 〃 |
| 10 | wrong reselection gates… | (가)+(나) 대기 문구 3종 풀, 전체 30초 제한 부족 | 문구를 3종 정규식으로, `test.setTimeout(75000)` |
| 12 | reduced motion retains both… | (가)+(나) 말풍선 간격으로 5초 초과 | 응 버튼 대기 15초 |
| 14 | instant verdict precedes waiting… | (가)+(나) 대기 문구 3종 풀 | 문구를 3종 정규식으로 |
| 15·16 | layout economy… (1600x1000, 1280x720) | (가)+(나) 말풍선 간격으로 5초 초과 | 응 버튼 대기 15초 |

시험이 확인하려던 동작은 줄이지 않았다(확인 항목 삭제 없음). 고친 파일은 `packages/app/e2e/problem-lab-workbench.spec.ts` 하나(모의 판정기 `coaching` 2곳 제거, 위 대기 시간·문구 조정). 제품 코드는 손대지 않았다.

### 테스트 결과

- `problem-lab-workbench.spec.ts` (포트 5393/5394): 22개 전부 통과.
- `paragraph-bubble-pacing.spec.ts` (포트 5395/5396): 2개 통과.
- `npm run build`: 통과.
- `npm test`: 1466 통과, 2 실패. 실패는 기존 2건(`boundary.test.ts` node:fs 규칙, `axis-architecture-experiment.test.ts`)뿐.
- e2e가 덮어쓴 다른 날짜 이미지 `docs/handoffs/2026-10-24-choice-direct-after-1~4.png`는 HEAD 내용으로 되돌렸다. 오늘 날짜(10-28) 이미지 2장(`bubble-pacing-paragraph`·`strategy-highlight`)은 이 작업 중 시험이 다시 생성해 바뀐 상태로 남아 있다.
- 참고: 10번 시험은 단독 실행에서 약 28초로 원래 30초 제한에 매우 가까웠다.
