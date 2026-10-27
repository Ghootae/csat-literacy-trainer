---
id: D-0182
status: accepted
date: 2026-10-27
scope: problem-feedback-judgment
supersedes: D-0161
---

# 문제 판정 운영 후보를 v5.3 보강판(재구성 세 칸, 서버 결론 확정)으로 바꾼다

## 결정

사용자 결정(2026-10-27, "권고대로 채택하고 K4는 (나)로 K4 케이스에만 짧게 실험해서 결과를 보는 건 어때?"). 앞선 결정 "권고대로 (가)로 진행해줘", "권고대로 ①로 진행해줘"를 포함한다.

- 문제 판정 운영 후보(v5)의 판정 지시문을 `source-direct-problem-feedback-v5.3.md`(`promptVersion: problem-feedback-v5.3`)로 바꾼다. v5.1은 재현용으로 둔다.
- 정답 선택의 근거는 세 칸(선지 이해 `choiceReading`, 근거 `ground`, 판단 `judgment`)으로 기록한다. 재구성 가능 여부와 충족·부족은 **서버가 세 칸에서 확정**하고, 판정기 결론과 달라도 실패시키지 않는다. 형식 잡음은 서버가 정리한다(`normalizeCells`·`settleConclusion`).
- 근거·읽기 인용 분리 규칙(D-0161에서 이어받은 것)은 없앤다. 결론 반복은 `ground.kind=CONCLUSION_RESTATED`로 거른다.
- 오답 선택의 선지 읽기 오류는 오류 종류 `READING`으로 교정한다(첫 선택은 교정 질문, 두 번째는 기록만).
- D-0161(`keyRelationCoverage` 핵심 관계 조각)은 이 결정으로 대체한다.
- K4(회사법 13번 ②, 근거 "주식회사 법인격의 부여 대상은 단체, not 개인")는 현재 동작("정답, 근거 미확인")을 받아들인다(사용자 "권고대로 (라)로 정리하고 커밋해줘"). 확인 단계 (나) 실험에서 판정기는 ②의 법인격 받는 쪽을 회사(A)로 읽어 K4를 1/3만 인정했고, 이는 장치가 아니라 사람과 판정기의 읽기 차이다([실험 보고](../../docs/experiments/k4-blank-probe-2026-10-27/REPORT-desktop.md)). (나)는 런타임에 연결하지 않는다. 빈자리 채움 칸(`blanks`)은 스키마에 남긴다.

## 이유

- 63세션 재실행에서 형식 실패 0(앞 실행 21), 회귀 18세션의 역할별 결과가 v5.1(10-26)과 같았다. 경로가 바뀐 G-B3 1건은 바뀌지 않은 교정 판정 규칙을 sol이 잘못 적용한 것이다.
- 사례: 맞는 근거 K1·DA·QF 충족 3/3, 결론 반복 KC 부족 3/3, 원인 보탬 XA 부족 3/3, 오답 READING 6/6·추정 오류 3/3.
- 근거: [재실행 보고](../../docs/experiments/v53-three-cell-check-2026-10-27-b/REPORT-desktop.md), [첫 실측 보고](../../docs/experiments/v53-three-cell-check-2026-10-27/REPORT-desktop.md), [인계 문서](../../docs/handoffs/2026-10-27-problem-feedback-k4-judgment-redesign.md).

## 재검토 조건

- 실제 학생 풀이에서 K4처럼 선지의 숨은 빈자리를 반박하는 근거가 자주 나오면 확인 단계 (나)나 조건 완화 (마)를 다시 본다.

- 실제 학생 자료나 다음 회귀에서 결론 반복을 충족으로 판정하는 사례가 반복되면 인용 분리를 다른 형태로 다시 본다.
- 정답 선택의 읽기 차이를 오류로 만들어 교정 질문을 하는 사례(XS 2/3)가 실제 학생에게 혼란을 주면 규칙을 정한다.

## 관련

- [D-0178](./D-0178-partial-refutation-v52-parked.md)(v5.2 보관), [D-0161](./D-0161-supported-needs-key-relation-coverage.md)(대체됨), [D-0177](./D-0177-problem-feedback-v51-drop-unused-coaching.md)(v5.1)
- [체크포인트](../checkpoints/2026-10-27-k4-v53-stage3-rerun.md)
