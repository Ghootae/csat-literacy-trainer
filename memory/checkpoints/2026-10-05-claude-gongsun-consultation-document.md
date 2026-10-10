---
date: 2026-10-05
scope: claude-gongsun-consultation-document
base_commit: uncommitted
---

# Claude 검토용 공손룡 자료 작성

사용자 요청으로 `docs/review/claude-gongsun-judgment-consultation-2026-10-05.md`를 작성했다.
기존10월3일 보고서를 덮어쓰지 않고 최신20요청까지 포함한 독립 문서로 정리했다.

- 지문 전문·보기·5선지·제공 해설·기호 메타데이터를 최신 시험의 source.json에서 그대로 포함했다.
- 실제 사용자 응답/질문/후속 답변과 가상 역전 응답을 구분했다.
- 기존v4 SELECTION/REPAIR 흐름과 원래v3 기반 해석표 실험을 구분했다.
- 원문 의미 혼동, 정확한 표 이후 학생 주장 덮어쓰기, 별도 호출 성공의 대표 출력을 포함했다.
- 원래v3·해석표 생성/소비 지침·현재 기존v4 프롬프트 전문을 포함했다.
- 학생 주장 보존·질문 명료성·고정표 대조는 검토 후보로만 기록했다. 새 정책 결정이 아니다.
- 5출력 인용 태그 복구와 재추첨을 구분하고, 53집중요청은 정확도의 공통 분모가 아님을 명시했다.

원자료·출력·프롬프트 일치와 JSON 코드 블록 파싱을 점검했다. 새 모델 호출·제품 변경·서버 재시작·
Claude 자동 전송은 하지 않았다. 현재 정책/미해결 질문의 상태는 바뀌지 않는다.

근거: 위 문서, `docs/experiments/gongsun-interpretation-modes-2026-10-03/`의 source.json,
prompts.json, requests.jsonl, recovered/RESULTS.json,
`memory/checkpoints/2026-10-02-gongsun-q12-v4-user-review.md`,
`memory/checkpoints/2026-10-03-gongsun-interpretation-modes-completed.md`,
`packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts`.
