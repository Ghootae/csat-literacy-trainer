---
date: 2026-10-27
scope: problem-feedback-judgment
base_commit: 88d7401
---

# K4 판정 재검토와 재구성·합당 기준 설계 논의

## 새로 확인된 것

- 원 세션 `c87d3acd`(회사법 13번 ②, "주식회사 법인격의 부여 대상은 단체, not 개인")는 v5.1이 아니라 v5로 판정됐다. 기록 `promptVersion`이 `problem-feedback-v5`이고 `coaching` 칸이 있다. v5.1 커밋(10-26 10:57 KST) 뒤 그날 개발자 화면 호출 18건이 모두 v5였다(서버 미재빌드). v5와 v5.1 판정 규칙은 같다.
- v5.1 판정기는 ②의 법인격 주장을 "주주들이 부여"로만 읽고 받는 쪽을 읽지 않아 재구성 불가로 판정했다. v5.1 안에 64-67행("핵심 전제")과 68-70행("상황 일치 시 재구성")의 우선순위가 없다.
- 정답 선택에서 재구성 불가와 근거 부족은 학생 화면이 같다(`feedback.ts:424`, `:444`). v5.2 실측에서도 K4는 어느 회차에서도 SUPPORTED가 나오지 않았다(P4 "선지에 쓰인 지점만" 때문).
- 정정: 체크포인트 `2026-10-26-partial-refutation-v52-parked.md`의 "K4 재구성 가능 1·2차 0/3"은 1차 기록(재구성 가능 2/3)과 다르다.

## 결정된 것

사용자와 합의한 설계 방향(설계안 작성 때 반영, 상세는 보고서 논의 메모 절):

- 재구성은 세 칸(① 선지 이해 ② 근거 ③ 판단)이 모두 채워졌을 때다. 칸 채움과 내용 정오는 따로 본다. 결론 반복·판단 방식 근거도 재구성 가능 + 근거 부족.
- 합당 기준: 학생의 반박 대상이 선지와 일치한다고 볼 수 있는가. 빈자리 채움은 서술어가 요구하는 자리를 선지 문장 안의 말로 채울 때만, 모호한 빈자리는 반박 대상당 한 개까지, 사전 확률로 채우려면 학생 말에 단서가 있어야 한다(K4 충족, KF "법인격은 단체에 부여됨." 근거 부족). 약하게 읽은 반박은 인정, 강하게 읽음·원인 보탬은 근거 부족, 방향 뒤집기는 근거 오류로, 다른 대상 명시는 대상 오류.
- 사전 확률은 정답 선택에만(발문 무관), 해석이 둘일 때 기우는 데만 쓴다.
- 긍정 발문 정답은 선지 전체 지지 요구. 긍정 발문 오답의 지지 미도달은 v5.1 오류 가설 방식 유지. 근거 오류·대상 오류는 v5.1 유지(대상 미명시는 선지 대상으로 복원해 내용 오류).
- 오답 선택에서 학생 말에 선지 읽기가 드러나면 새 오류 종류 `READING`으로 교정(발문 무관).
- 교정 뒤 근거 확인은 SELECTION 기준과 통일, "근거는 발화 한 곳" 규칙 유지. 두 번째 선택은 v5.1 흐름 유지 + 사전 확률 적용 + 읽기 오류 기록.
- 마지막 설명: v5.2 E1·E3·E4·E5 가져옴, E2는 "선지 이해" 칸 기준으로 경우별 조정.
- 보고 규칙: 약어는 한 보고 안 첫 사용에 설명([D-0179](../decisions/D-0179-explain-abbreviations-on-first-use.md)).

## 변경한 것

- 보고서 `docs/reports/REPORT-k4-v51-judgment-review-human.md`(논의 메모 절 포함), `REPORT-k4-v51-judgment-review-desktop.md`.
- D-0179, `AGENTS.md` 결과 보고 형식 절 한 줄.

## 미해결

- 위 합의 전체의 결정 기록 번호와 v5.2 보관분(`wip/partial-refutation-v52`)과의 관계(D-0178 이름 「부분 반박 근거 판정 (v5.2)」을 그대로 쓸지).
- 검증 사례 중 과잉 인정·긍정 발문·오답 사례는 실제 문항에서 골라야 한다.

## 다음 행동

- 새 세션에서 보고서 논의 메모를 바탕으로 v5.1 기준 설계안(인계 문서, `docs/handoffs/TEMPLATE.md` 형식)을 쓴다. v5.2 보관분에서 가져올 부분(E1·E3·E4·E5, `point` 칸 등)을 표시한다.

## 근거

- `.omc/logs/problem-feedback-v4/events.jsonl` (세션 `c87d3acd`)
- `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.1.md`
- `wip/partial-refutation-v52`: `docs/experiments/v5-any-falsity-point-2026-10-26*/cases/K4*.records.jsonl`
- `docs/reports/REPORT-k4-v51-judgment-review-human.md`
