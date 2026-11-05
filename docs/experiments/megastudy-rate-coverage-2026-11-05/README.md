# 메가스터디 선택률 대응 확인 (2026-11-05)

수능 DB(`/Users/mac/Projects/suneung_db/output/`, 158세트·752문항)의 세트를 메가스터디 정답률 페이지
(`https://www.megastudy.net/Entinfo/correctRate/main.asp`)의 회차와 맞출 수 있는지 확인했다. 선택률은
수집하지 않았다. 사용자 실행 승인(2026-11-05).

## 결과

| `status` | 세트 | 문항 | 방법 |
|---|---|---|---|
| `MATCH` | 149 | 710 | 학년·연도·달이 같은 회차가 하나 |
| `MATCH_BY_LABEL` | 1 | 4 | DB `exam.grade`가 비어 이름표 "고1 2025년 3월"로 맞춤 → 335 |
| `MATCH_BY_ANSWER_KEY` | 8 | 38 | 달이 다름. 후보 회차의 정답 번호가 trainer 정답(`csat-literacy-trainer/data/enrichment/records/`)과 38/38 일치 |

달이 다른 회차: 고3 2023년 4월 → 308(2023.05.10), 고1 2023년 11월 → 317(2023.12.19), 고2 2023년 11월 → 318(2023.12.19).
D-0109의 공손룡 12번 `DATE_MISMATCH_CANDIDATE`(308)도 이 대조로 같은 시험으로 확인됐다.

## 검증 수준과 한계

- `MATCH` 149세트는 회차 대응만 확인했다. 선택률 표를 받아 정답을 대조하지 않았다(348·352·356·306은 D-0109 때 대조).
- 받은 선택률 표(308·317·318)는 국어 45문항의 정답·난이도·배점·정답률·①~⑤ 선택 비율을 담는다.
- 값은 "메가스터디 풀서비스 이용자 채점 기준"이다. 전체 응시자 분포가 아니며, 이용 범위는 정하지 않았다.

## 파일

- `db-sets.json`: DB 세트별 시험 정보(학년·연도·달·문항 범위).
- `match.json`: 세트별 대응 결과(`status`, 메가스터디 `seq`·시행일).
- `parse_rate.py`: 선택률 표 HTML에서 문항 번호·정답·①~⑤ 비율을 뽑는 함수.
- `raw/`: 받은 HTML(커밋 제외). 목록 요청은 `POST /Entinfo/correctRate/main_examNm_ax.asp`(`grdFlg`, `examYear`, `examType=`),
  선택률 표는 `POST /Entinfo/correctRate/main_rate_ax.asp`(`examSeq`, `tabNo=1`, 고3은 `selSubCd`, `selExamType=1`).
- 요청: 메가스터디 16회(시험 목록 1, 학년·연도 목록 12, 선택률 표 3), 1.2초 간격.
