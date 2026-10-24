---
date: 2026-10-24
scope: examiner-strategy-ui-and-direct-choice
base_commit: 3fa6c3c
---

# 출제자 전략 화면 연결과 문제 화면 선지 직접 누르기

## 변화

- 출제자 전략 보기를 개발자 문제 화면에 연결했다([인계](../../docs/handoffs/2026-10-24-examiner-strategy-ui.md)).
  - 서버: `FINAL.json`을 로드하고, `COMPLETED` 뒤에만 글을 내준다.
  - 사용 기록: `.omc/logs/problem-feedback-v4/examiner-strategy.jsonl`
  - 화면: 문단마다 말풍선 하나, [다음]
  - 안내 문구는 발문 방향별로 다르다(D-0170).
- 사용자 직접 사용에서 긍정 발문의 오답을 고를 수 없다는 지적이 나왔다. 그래서 [D-0172](../decisions/D-0172-problem-ui-choice-direct-select.md)로 선지를 가운데 문제 칸에서 직접 누르는 방식으로 바꾸고, 제출 칸을 정리했다([인계](../../docs/handoffs/2026-10-24-choice-direct-select-ui.md), 모형 `docs/handoffs/2026-10-24-choice-direct-mock-*.png`, 결과 캡처 `…-after-*.png`).
- 검증: e2e 18건, 앱 단위 242건(기존 `boundary.test.ts` 실패 1건 그대로), 파이프라인 문제 풀이 410건, 타입 검사 2종 통과.

## 열린 것

- 풀이 중 [제출]은 맨 오른쪽, 끝난 뒤에는 [다시 풀기]가 맨 오른쪽이라 주 버튼 자리가 한 칸 옮겨 간다. [다시 풀기]를 주 버튼 왼쪽에 둘지 사용자 답을 기다린다.
- 문제 세트 흐름([다음 문제로]·[다음 지문으로])은 별도 과제다.
