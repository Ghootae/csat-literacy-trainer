---
date: 2026-10-02
scope: ui-five-passage-source-candidate-gold-comparison
base_commit: uncommitted
---

# UI 5지문 원문 분할 후보 모델 비교 완료

## 작업 델타

- mRNA만 제외한5지문25문단을 사용자 승인으로 실제 실행했다(D-0075). 기존 공동 생성 자산은 동결 비교하며 모델 입력에서 제외했다.
- 생성75회·300분할→133후보, JEV180요청·665점수, OpenAI 전체135호출 성공. 기존43축→선택71축→최종70축.
- 0.1 규칙 전환4문단, L2 의심9문단·병합1문단(표면 장력6의2→1축). 후보 부재 생성은 미실행.
- 원문 복원·요청 일치·축 ID·점수 계약·기존 자산 해시를 검사했다. 같은 선택 규칙의 한 회 제외 안정18/25는 의미 품질과 구분한다.
- Codex 비교: 분리/생략 내용 복원 이점, 도입부 과분해 의심, 도파민2의 첫 축 문구 손실, 공손룡4의 부분 병합 누락 구조, 일부 L2 문구 문제를 보고했다. 사용자 의미 판정은 아직 없다.
- 기존 운영 골드·UI·학생 판정기는 유지했다. 문단별 양쪽 축/원문·후보 점수·확인 이력과 비교 보고서를 보존했다.

## 다음 검토

- 도입부의 독립 축화, 그룹 내부 부분 병합, 같은 경계 문구의 의미 보존을 검토한다. 자동 수정/추가 시험·운영 승격은 승인되지 않았다.

## 근거

- `docs/experiments/axis-candidate-jev-five-passages-2026-10-02/COMPARISON.md`
- `docs/experiments/axis-candidate-jev-five-passages-2026-10-02/REVIEW.md`
- `docs/experiments/axis-candidate-jev-five-passages-2026-10-02/final-audit.json`
