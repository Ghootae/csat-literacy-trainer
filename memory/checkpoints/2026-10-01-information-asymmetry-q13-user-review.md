# 정보 비대칭 13번 사용자 직접 실행 검토

- 날짜: 2026-10-01 KST
- 범위: 개발자 조건부 메타 문단 대화 5문단과 연결 문제 13번의 사용자 직접 실행
- 세션: 문제 `dd664066-0fe4-494b-9b1c-957d028e7c02`

## 관측

- 문단 5개는 모두 정책상 `PASS`로 종료됐다. 최종 축 상태는 P1·P2·P3·P4·P5마다 적어도
  하나의 `partial`이 남았고, P1·P2·P4는 질문 없이 진행했으며 P3·P5는 한 번씩 후속 답변을
  제출했다. 이는 조건부 메타 개발자 모드의 저개입·진행 허용 동작과 일치하지만, 의미상 모든
  축을 포착했다는 뜻은 아니다.
- P3 질문은 미국의 표현 보호, 플랫폼 자율 규제, 한국 헌법 재판소 입장을 한 문장에 함께
  물었다. 학생은 두 법원의 표현의 자유 입장만 답했고, 평가기는 플랫폼 자율 규제 누락을
  `partial / UNCLEAR_OK`로 보존했다.
- P5 질문은 오늘날 논쟁을 다시 생각할 이유를 물어 AX2를 보완했지만, 다수·소수 의견의 대립인
  AX1은 `partial`로 남았다. 그 상태에서도 학생용 최종 문구는 “핵심 의미를 잘 파악했어요”라고
  표시돼 실제 확인 범위보다 넓게 읽힐 수 있다.

## 문제 풀이의 핵심 실패

- 최초 ① 선택의 생성물 표시 의무 적용 대상 오해는 첫 교정 질문 뒤 실제로 수정됐다.
- 두 번째 ④ 선택에서 학생은 다른 이름의 반복 게시가 법 제정으로 이어진 상황을 소수 의견의
  우려를 **약화**시키는 사례라고 답했다. 정본상 이 상황은 시민의 진정한 의견으로 오인될 수
  있어 소수 의견의 우려를 **뒷받침**한다.
- 평가기는 학생이 자신의 판단과 ④의 문구가 “부합하지 않음”을 확인하자 이를 `CORRECTED`로
  처리하고 재선택을 요청했다. 그러나 발문은 ‘적절하지 않은 것’을 고르는 문제이므로, ④의
  ‘뒷받침’과 학생의 ‘약화’가 부합하지 않는다고 답한 것은 ④를 오답으로 선택한 행동과 일관된다.
  판정기는 후속 턴에서 부정 발문 극성을 놓치고 선택을 선지 내용에 대한 동의처럼 해석한 것으로
  보인다. ‘약화’를 ‘뒷받침’으로 수정한 증거는 없다.
- 학생은 이후 ⑤를 선택하고 “다수파는 규제가 위헌이라 판단 → 제재 불가능”이라고 설명했다.
  이 최종 근거 자체는 정답 ⑤를 지지하지만, ④에 관한 오해가 남은 채 세션은
  `RESELECTION_CORRECT_VERIFIED`, `SUPPORTED`, `resolvedByStudent=true`로 종료됐다.
- 따라서 이번 실행은 **최종 정답 도달**과 **일부 회복**의 증거이나, 전체 오류 경로의 교정 완료
  증거로 집계하면 안 된다. 부정 발문의 선택 의미를 보존하고, 학생 근거의 내용 정확성이 실제로
  수정됐는지를 별도로 검증해야 한다.

## 학생 상태 저장 공백

- 실행 중인 API 서버 PID 26858은 2026-10-01 11:07 KST에 시작됐고, 현재 서버 빌드 산출물은
  12:17 KST에 생성됐다.
- 실행 서버의 `/api/capabilities`와 `/api/developer/student-state`는 모두 등록되지 않은 경로를
  반환했고 `.omc/logs/student-state/evidence.jsonl`도 생성되지 않았다.
- 즉 Vite 클라이언트는 이후 변경을 반영했을 수 있지만 API 서버는 학생 상태 기능 이전 빌드를
  계속 실행했다. 이번 문단·문제 수행은 새 형식 학생 상태 증거로 저장되지 않았으며, 백필하지
  않는다.

## 출처

- `.omc/logs/dialogue-experiment/conditional-meta-v1/sessions.jsonl`
- `.omc/logs/problem-solving/sessions.jsonl`
- `.omc/metrics/llm.jsonl`
- `packages/pipeline/fixtures/experiments/problem-solving/information-asymmetry-free-marketplace-q13.json`
- `packages/pipeline/fixtures/experiments/problem-solving/public/information-asymmetry-free-marketplace-q13.json`
- `packages/app/src/server/index.ts`
- `packages/app/src/server/student-state.ts`
