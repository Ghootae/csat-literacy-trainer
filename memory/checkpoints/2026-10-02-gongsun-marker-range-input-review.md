---
date: 2026-10-02
scope: gongsun-q12-source-marker-range-review
base_commit: uncommitted
---

# 공손룡 보기 기호 범위 입력 확인

사용자가 기호 a 등의 지칭 범위가 모델 입력에서 명확한지 질문했다. 시험 입력의 scenario는
`ⓐ옷이 없어`, `ⓑ옷은 뭐니`, `ⓒ옷이 이렇게 많은데`, `ⓓ옷이 정말 없다는 게 아니라`,
`ⓔ빨간 옷이 필요한데`처럼 기호를 앞에 붙인 평문이다. 범위 종료 표식·밑줄·별도 span은 없고
media는 빈 배열이다. 모델은 기호의 위치는 알 수 있지만 표시 대상의 정확한 텍스트 범위는
문맥으로 추정해야 한다. 원본 인쇄물의 밑줄 범위와의 일치는 이번에 확인하지 않았다.

다만 제공된 해설은 d를 ‘옷’, e를 ‘빨간 옷’으로 설명하며, 실제 출력에도 그 대응을 올바르게
설명한 부분이 있다. 따라서 ‘모델이 기호가 어디인지 전혀 몰랐다’거나 ‘범위 누락이 오판의
원인이다’는 결론은 미입증이다. 앞선 시험은 입력 표기 문제와 판정 지침 효과를 분리한 시험이
아니다. 원본 표기 확인과 범위 명시 조건 대조는 후속 검토 후보이며 승인·실행하지 않았다.

근거: `docs/experiments/problem-v3-based-v4-smoke-2026-10-02/sources.json`,
같은 디렉터리 `initial/candidate-G-actual-r1.json`의 input.source,
`initial/candidate-G-error-r1.json`의 rawOutput,
`packages/pipeline/fixtures/experiments/problem-solving/public/gongsun-long-later-mohists-q12.json`,
`packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts`의 requestContent.

제품·프롬프트·고정 시험 입력 변경0, 추가 모델 호출0.
