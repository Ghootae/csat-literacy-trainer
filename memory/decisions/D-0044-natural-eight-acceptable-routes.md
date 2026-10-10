---
id: D-0044
status: accepted
date: 2026-10-01
scope: eight-natural-responses-human-routing-reference
supersedes: D-0043
---

# 실제8응답의 7번과 8번 허용 처리 수정

과거 V4 비교를 본 뒤 사용자는 '8번은 선택적 보완이 맞아. 7번도 선택적 보완도 용납 가능한
판정일 듯'이라고 정정했다. 8번(N38)은 선택적 보완으로 바꾸고, 7번(N36)은 기존 질문 필요를
철회했다고 단정하지 않고 질문/선택적 보완 둘 다 허용한다. 다른6건과 기존 보완 초점은 유지한다.

최신 기준은 통과3·선택적보완4·질문/선택적보완복수허용1이다. 비교에는 acceptableRoutes를 사용한다.
최초 D-0043과 사람 JSON의 초기 답변은 보존하고 정정은 별도 기록한다. 과거 V4 단회 라벨을
당시 정책으로 해석하면8/8허용범위지만 결과 공개 후 정정이므로 독립 정확도 검증이 아니다.
현재 L1/L2 측정이나 D-0040 정책 변경도 아니다. 추가 API·운영·코드 변경은 없다.

## 근거

- 사용자 2026-10-01 7·8번 재검토 메시지.
- `docs/review/natural-eight-human-routing-2026-10-01.json`
- `docs/review/natural-eight-human-routing-2026-10-01.md`
- `docs/experiments/natural-response-disagreement-v1-2026-09-21/results.jsonl`
