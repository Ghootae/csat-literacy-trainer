---
date: 2026-10-10
scope: v5-repair-desk-check
base_commit: de9d766b97ab947193e3acbdedbeace11b699608
---

# v5 REPAIR 탁상 점검과 모델 라우팅 결정

- 판정기 모델: 선택 정오 라우팅으로 결정([D-0104](../decisions/D-0104-problem-evaluator-model-routing-by-choice.md)). 정답 선택에서는 과도한 관대함이 과도한 개입보다 낫다는 사용자 판단을 근거에 추가.
- 사용자 제안으로 REPAIR 판정을 대량 API 시험 전에 점검: 본 실행 1회차 첫 판정으로 세션 8개를 재현하고 Claude가 만든 교정 답변 15개를 넣어,
  Codex 안에서 gpt-6-astra·gpt-6-luna·gpt-6.1-sol이 v5 지시문으로 대행 판정(운영 API 방식과 다름). [결과](../../docs/experiments/v5-repair-desk-check-2026-10-10/), [표면 장력·mRNA 사이클](../../docs/review/v5-repair-cycles-surface-mrna-2026-10-10.md).
- 결과: 세 모델 판정이 거의 같았다. 첫 판정 분석(reason·reconstructedPath·studentClaims)을 REPAIR 입력에 추가해도 세 모델 모두 판정 변화 없음.
  luna만 정답 세션의 수정 후 근거 충분을 후하게 판정(S4a·M2a). 미수정 답을 수정으로 본 경우는 없음.
- REPAIR 입력에는 첫 판정의 reason·reconstructedPath·studentClaims가 들어가지 않는다(`packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts` 28~55행). 오류 기록·교정 질문·학생 발화·이전 REPAIR는 들어간다.
- S2 "큰 경우요"는 세 모델 모두 미수정. 사용자 판단 변화(묶어도 된다 → 선지 정오를 가르는 관계가 다뤄지지 않았다) 끝에 교정 질문 규칙 방향을 [D-0105](../decisions/D-0105-correction-question-covers-choice-deciding-relation.md)로 기록.
- 지시문에 '남음(REMAINING)'과 '확인 불가(UNCONFIRMED)'의 구분이 없다. 서버는 둘을 같게 처리한다.

- 사용자 제안으로 교정 성공 뒤 흐름을 고침: 오답은 [다시 선택]/[코칭 보기], 정답·틀린 근거는 [설명 보기]/[마치기] ([D-0106](../decisions/D-0106-post-repair-choice-reselect-or-coaching.md)). D-0105는 사용자 결정으로 필수에서 권장으로 낮춤.

- 세션 안 모델 배정 결정 [D-0107](../decisions/D-0107-session-model-routing-repair-reselect-coaching.md): 모든 선택은 그 선택의 정오로, REPAIR는 luna, 공개 코칭은 세션 정오 모델(정답 luna·오답 sol).

- REPAIR 시험 설계안([`docs/review/v5-repair-test-design-2026-10-10.md`](../../docs/review/v5-repair-test-design-2026-10-10.md)): 오답 종료 코칭은 sol이 해요체로 정답 이유까지 쓰고 서버의 공식 해설 덧붙임은 뺀다(공식 해설이 학생 친화적이지 않다는 사용자 근거, '정답은 N번' 한 줄은 유지). 경계 유형 기대값 6개 사용자 확정(단답·'아니요'·미질문 오류 수정·근거 없는 새 주장·일부 칸 답은 고쳤음, 동의만은 못 고쳤음).

- REPAIR 본 실행: luna 교정 판정 168/183(미수정→고쳤음 0, 어긋난 15칸은 모두 맞는 짧은 답을 못 고쳤음으로 봄), sol 종료 코칭 126칸 생성(0.29+1.35달러). 사용자 원칙으로 교정 판정을 국소 오류로 국한 [D-0108](../decisions/D-0108-repair-judges-local-error-only.md).

- D-0108 실험 지시문 재시험: 1차 101/108(재주장 답 4칸 과관대) → 사용자 결정 (가) 반영 2차 92/93, 미수정→고쳤음 0.

## 다음 행동

- REPAIR API 시험 설계: REPAIR는 luna(D-0107), 오답 세션 종료 코칭은 sol. 첫 판정 분석 추가 조건은 제외. 정답 세션의 근거 충분 과대 판정은 실패로 세지 않는다.
