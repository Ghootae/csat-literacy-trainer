---
date: 2026-11-05
scope: sns-diagnostic-mode
base_commit: ee88cc8d
---

# 사고 패턴 분석 활용 방향: SNS 진단평가 모드 (방향만)

## 새로 확인된 것

- EBS 단추 진단평가 결과는 점수·정답률·풀이 시간, 단원 단위 추천 커리큘럼, 문항별 분야·읽기 유형 꼬리표와 O/X다
  (`docs/EBS _ 인공지능 DANCHOO+.pdf`). 학생이 왜 틀렸는지는 나오지 않는다.
- 수능 DB(158세트·752문항)와 trainer 보강 자료에는 정답률·선지별 선택률이 없다. 저장소의 선택률은 D-0109의 6문항뿐이다.
- DB 158세트는 모두 메가스터디 정답률 페이지의 회차와 대응된다(149 같은 달, 1 이름표, 8 정답 대조 38/38). 수집은 안 했다.
  D-0109의 공손룡 12번 `DATE_MISMATCH_CANDIDATE`는 회차 308(2023.05.10)과 정답이 일치해 같은 시험으로 확인됐다.
  기록: `docs/experiments/megastudy-rate-coverage-2026-11-05/README.md`.

## 결정된 것

- SNS 독해력 진단평가 모드를 따로 두고, 결과 화면(내 위치 → 문제 풀이 결과 → 독해 패턴)과 맛보기 추천에 사고 패턴 분석을 쓴다.
  방향만 정했다([D-0200](../decisions/D-0200-sns-diagnostic-mode-result-screen-direction.md)).

## 변경한 것

- 논의 인계 `docs/reports/REPORT-learner-analysis-usage-desktop.md`(4절에 선택률 확인 결과), 웹 에이전트 결과
  `docs/reports/REPORT-learner-analysis-usage-web-result.md`, 대응 확인 기록 `docs/experiments/megastudy-rate-coverage-2026-11-05/`.
- 열린 질문 Q-0042(선택률 출처·이용 범위), Q-0043(진단 지문 범위).
- `WORK_TREE.md`·`CURRENT_STATE.md`에 남아 있던 끝난 "다음" 줄 정리: 마지막 설명 지시문 시험(D-0194로 끝남),
  메모장 38·40·41·43(2026-10-28 반영).

## 미해결

- D-0200 "설계 확정 전에 풀 조건" 1~6, 훈련 서비스용 추천, 학생 기록 형태(Q-0037).

## 다음 행동

- Q-0042·Q-0043을 사용자가 정한 뒤 SNS 진단평가 화면·백엔드 설계(인계 문서 수준)로 넘어간다.
