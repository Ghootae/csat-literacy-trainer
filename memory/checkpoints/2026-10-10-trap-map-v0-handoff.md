---
date: 2026-10-10
scope: thought-tracker-trap-map-v0
base_commit: de9d766
---

# 함정 지도 v0 실험 설계·인계

## 새로 확인된 것

- 메가스터디 「역대 정답률 & 난이도」는 2016년 이후 고1~3 수능·모평·학평의 문항별 정답률과 선지별 선택 비율을
  비로그인 공개한다(풀서비스 이용자 채점 기준). 고3 국어는 화법과작문·언어와매체 탭이 따로 있다.
- 연결 문항 5개의 회차 대응을 확인했다. 정보 비대칭 13번(정답 ⑤): 화작 11/28/14/17/30%, 언매 7/26/9/10/47%.
  탭 간 정답률 차이가 크다. mRNA 19번(고2, 정답 ⑤ 39%)은 탭이 없다.
- 공손룡 12번의 `고3 2023년 4월` 회차는 목록에 없다. 2023.05.10 학평 12번이 정답 ④로 일치하는 후보일 뿐이다.

## 결정된 것

- [D-0109](../decisions/D-0109-trap-map-v0-external-rate-experiment.md): sol·luna 각 3회, 상한 3.5달러, OpenAI 전송 승인,
  메가스터디 비율 내부 수집 승인. 실행은 Codex.

## 변경한 것

- 인계 문서 `docs/handoffs/2026-10-10-trap-map-v0-external-rates.md`(지시문·스키마·오류 목록 v0·지표 포함).
- Q-0034를 `open`으로 전환.

## 미해결

- 메가스터디 이용 약관 미확인. 표본은 사용 문항 5개, 오답 선지 20개다.

## 다음 행동

- Codex 실행 결과를 인계 문서 대비로 검토하고 `REPORT.md`를 해석한다.

## 근거

- `docs/handoffs/2026-10-10-trap-map-v0-external-rates.md`
- https://www.megastudy.net/Entinfo/correctRate/main.asp (2026-10-10 조회)
