---
date: 2026-10-02
scope: gongsun-q12-db-marker-metadata
base_commit: uncommitted
---

# 자료 DB의 기호 범위 메타데이터 확인

사용자가 지정한 `/Users/mac/Projects/csat-literacy-trainer/data`를 읽었다.
`69c011fd78128b2a9beddd5e_questions.json`의 question_number12 → supplements[0].elements와
같은 ID의 `_result.json` → questions 내 동일 문항에는 ⓐ~ⓔ 각각의 kind=phrase,
start/end, symbol, style=underline 필드가 존재한다. DB에 범위 필드 자체가 없다는 설명은 틀리다.
직전 기록은 실제 모델 입력의 범위 종료 정보 부재를 확인한 것이며 DB 부재를 입증한 것이 아니다.

다만 보기 text는146자·UTF-8 330바이트인데 각 범위는 ⓐ360~361, ⓑ367~368,
ⓒ371~372, ⓓ378~379, ⓔ382~383이다. 이 문자열의 문자/바이트 위치로는 곧바로
적용할 수 없다. 다른 원본 좌표계인지 수집 오류인지는 미확인이다. 숫자만으로 기호가 가리키는
텍스트를 확정하거나 범위 데이터를 그대로 전달하면 문제가 해결된다고 주장하지 않는다.

현재 MVP의 `loadProblemSolvingBundle`은 위 외부 DB를 매 요청 읽는 것이 아니라 로컬 public
fixture의 scenario 평문과 별도 참조 해설을 조합한다. 그 fixture에 elements 필드는 없으며
실제 시험 입력에도 없다. 따라서 현재 입력 경로가 원자료의 범위 메타데이터를 보존하지 않는 것은
확인했지만, 과거 fixture 작성 시점의 정확한 누락 경위나 오판 인과는 입증하지 않았다.

출처: 사용자 지정 위 두 외부 DB JSON,
`packages/app/src/server/content.ts`의 loadProblemSolvingBundle,
`packages/pipeline/fixtures/experiments/problem-solving/public/gongsun-long-later-mohists-q12.json`,
`docs/experiments/problem-v3-based-v4-smoke-2026-10-02/initial/candidate-G-actual-r1.json`.
기존 입력 확인은 `memory/checkpoints/2026-10-02-gongsun-marker-range-input-review.md`.

DB·제품·프롬프트 수정0, 추가 모델 호출0. 후속은 좌표 기준과 원본 표시 범위 확인이다.
