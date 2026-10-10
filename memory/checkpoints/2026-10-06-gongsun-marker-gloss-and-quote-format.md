---
date: 2026-10-06
scope: gongsun-marker-gloss-and-quote-format
base_commit: 58f9c93889a57414bf89ee5b25e698894caad96e
---

# 공손룡 12번 기호 해석 실패 공동 검토와 국소 해석본·인용 형식 실험

[검토 요청 문서](../../docs/review/claude-gongsun-judgment-consultation-2026-10-05.md)를 Claude와 GPT(GPT-6 Astra, Codex 읽기 전용)가
원자료로 각자 검토하고 반론을 한 차례 주고받은 뒤, 사용자 승인 단계마다 시험을 진행했다. 모델은 모두 `gpt-5.6-terra`/medium,
외부 전송은 사용자가 단계별로 승인했다. 의미 판정은 매번 Claude와 GPT가 조건·기대값을 가린 채 각자 판정했다.

## 새로 확인된 것

- 기존 기록 재대조(API 0): 같은 역전 응답에서 첫 평가(ASSESS) 18런 중 의미 실패 5건, 질문 단계(DIAGNOSE) 17런은 ⓓ·ⓔ 방향 0건 실패.
  역전 4건은 모두 "ⓓ=빨간 옷" 한 방향이다. 첫 개발자 UI 사례는 당시 ⓒ 위치 오류로 설명된다.
- 해석 방식 시험(2026-10-03)의 인용 계약 실패 5건은 실험 하네스가 시험용 태그까지 글자 그대로 요구한 검사 결함이었다.
  새 검사 `scripts/lib/marker-quote-validation.mjs`로 보존 원출력을 재검사하면 35곳 모두 통과한다(API 0).
- 학생 주장 분리 기록 실험(②, 20요청 $0.2565): 단일 판정 의미 통과 3/5, 분리 기록 5/5(Fisher 단측 p≈0.22). 분리 기록은 복합 처치다.
- 응답 유형 실험(③, 18요청 $0.2631): 분리 기록에서 S1~S4 라벨 12/12 기대 일치, 과잉 교정·대응 채워넣기 0.
  다만 "ⓔ는 빨간 옷의 부재" 같은 대상 대신 문장 뜻을 쓰는 서술이 남았다(GPT 판정 10/12, Claude 12/12로 엄격도 차이).
- 기호 범위 혼동은 판정기만이 아니라 제공 해설·채점 기준에도 있었다. 해설은 이름의 뜻(색을 정하지 않은 옷)까지만 쓰고
  이 발화에서 가리키는 대상을 쓰지 않는다. ⓐ는 이름은 '옷'이지만 이 발화에서 빨간 옷을 가리키며, 판정기의 "ⓓ=빨간 옷"은
  ⓐ의 가리킴을 ⓓ에 옮긴 모양이다.
- 세 조건 비교(65요청 $1.0618, [결과](../../docs/experiments/gongsun-gloss-arms-2026-10-06/REVIEW-SUMMARY.json)): 라벨 none 13/15,
  기호 해석만 15/15, 선지 해석 포함 15/15. S5 과잉 교정 none 2/3 → 해석본 0/6. 해석본이 학생 표현을 해석본 표현으로 바꿔
  학생에게 귀속하는 부작용 3/6. 교정 질문이 정답 표현을 보여 주는 문제는 조건과 무관하다.
- 인용 형식 실험(18요청 $0.3237, [결과](../../docs/experiments/gongsun-quote-format-2026-10-07/REVIEW-SUMMARY.json)): 귀속 대체 4/8 → 0/8
  (Fisher 단측 p≈0.038), SUPPORTED 7/8로 같음. 해석본이 있어도 허용 읽기 과잉 교정 1/8, 처치 조건에서 발문 극성 오적용 1/8.
  두 과잉 교정 모두 질문 단계에서 판정이 뒤집혀 계약 실패가 났다. 실행은 2026-10-06 21:49 KST이며 폴더 이름의 10-07은 잘못 붙인 날짜다.

## 결정된 것

- [D-0084](../decisions/D-0084-local-marker-gloss-direction.md): 기호·도표 지칭 부분에 한한 국소 해석본(기호 해석만)과 인용 형식 규칙 방향 채택.
  D-0002·D-0003 부분 대체. 운영 연결은 하지 않았다.
- [D-0085](../decisions/D-0085-relation-only-rationale-sufficient.md): 선지 핵심 전제를 정확히 부정한 관계 진술은 앞선 모순이 없으면 근거 충분.
- 사용자 승인: Codex CLI 0.152.1 → 0.160.1 업데이트(GPT-6 Astra 사용), 해석본 초안과 GPT 검토 반영 수정안 승인.

## 변경한 것

- 해석본 `packages/pipeline/fixtures/experiments/problem-solving/marker-glosses/gongsun-long-later-mohists-q12.json`과 검증
  `scripts/lib/marker-gloss-validation.mjs`(테스트 포함), 인용 검사 `scripts/lib/marker-quote-validation.mjs`(테스트 포함).
- 실험 스크립트 `scripts/revalidate-gongsun-marker-quotes.mjs`, `test-gongsun-claim-split.mjs`, `test-gongsun-response-types.mjs`,
  `test-gongsun-gloss-arms.mjs`, `test-gongsun-quote-format.mjs`와 각 실험 폴더(FROZEN·원장·REVIEW-*).
- 운영 판정기 코드·프롬프트·UI·서버는 바꾸지 않았다.

## 미해결

- 다른 기호 문항에서 해석본·인용 규칙 효과, 해석본 조건에 남은 과잉 교정, 질문 단계 요약 필드의 귀속 대체, 교정 질문이 정답 표현을
  보여 주는 문제, 해석본 제작·승인 절차, ⓒ 원 시험지 위치 확인(D-0084 재검토 조건).
- API 키가 실행 명령으로 대화 기록에 남은 일이 있어 사용자에게 폐기를 권했다.

## 다음 행동

- 다른 기호 문항 하나를 골라 해석본을 같은 절차로 만들고, 해석본 없음 / 기호 해석+인용 규칙 두 조건으로 비교한다.

## 근거

- `docs/experiments/gongsun-marker-quote-revalidation-2026-10-06/REPORT.json`
- `docs/experiments/gongsun-claim-split-2026-10-06/REVIEW-SUMMARY.json`
- `docs/experiments/gongsun-response-types-2026-10-06/REVIEW-SUMMARY.json`
- `docs/experiments/gongsun-gloss-arms-2026-10-06/REVIEW-SUMMARY.json`
- `docs/experiments/gongsun-quote-format-2026-10-07/REVIEW-SUMMARY.json`
- `node --test scripts/lib/marker-gloss-validation.test.mjs scripts/lib/marker-quote-validation.test.mjs` 10/10 통과
