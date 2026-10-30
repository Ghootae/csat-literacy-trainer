# 체크포인트: 마지막 설명 문단 넘기기·칠하기 미리보기 (2026-10-30)

- 사용자 메모 1(피드백이 너무 김 → 한 문단씩, [다음])·메모 2(문단마다 지문 영역 미색 표시)를 논의하고, 질문 4개로 규칙을 정했다([D-0193](../decisions/D-0193-end-explanation-paragraph-steps-with-marks.md)).
- 사용자 제안으로 지시문 변경 전 화면만 먼저 만들었다: `/problem/lab?endPreview=S-A1|KF-r1|QP-r2`(개발자 전용, 모델 호출 없음). 서버 `startEndPreview`·Runtime `endParagraphs`, 공용 `shared/quote-locate.ts`, 문단 사이 다음 버튼(`sequenceState`), 화면 문단 칠하기. 실제 세션 동작은 그대로.
- 구현은 executor(sonnet), 메인 세션이 diff 검토 뒤 화면 두 곳을 고침(미리보기가 기억된 세션을 읽고 쓰던 문제, 처음 열 때 문단이 한꺼번에 보이던 문제). `npm test` 1503 통과·기존 실패 2, Chrome으로 KF-r1·S-A1 넘기기·칠하기 확인.
- 사용자 판정: "사용감이 매우 좋아졌어." 다음: 모델이 문단 목록과 칠할 곳을 직접 쓰는 마지막 설명 지시문·형식 시험(저장 입력 12건 재생성, 사용자 판정).
