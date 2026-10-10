---
date: 2026-10-02
scope: ui-linked-problem-source-marker-inputs
base_commit: uncommitted
---

# UI 연결 6문항 기호 범위 확인·입력 보완

사용자는 지문·보기 기호 범위 확인 대상을 현재 UI에 연결된 모든 문항으로 지정했다.
새 DB `suneung_db/output`과 대조하여 원자료 서식을 보완했으며, 의미 판정 정책은 변경하지 않았다.
D-0002의 원문 직접 입력을 유지하고 구조화 문제 골드의 의미 해석·추론 경로는 전달하지 않는다.

## 확인과 변경

`scripts/audit-problem-source-markers.mjs`는 dialogue passage의 problemQuestionId로 대상을 찾고,
원자료의 범위·문자열 일치를 확인한 뒤 주변 문맥을 이용해 현재 fixture 위치에 대응시킨다.
반복되는 ‘옷’의 첫 등장 위치를 임의로 고르지 않으며 유일한 대응이 없으면 실패한다.
기본 실행은 읽기 전용이다. 출처 파일 해시·원자료 좌표·대응 결과는
`docs/experiments/problem-source-markers-2026-10-02/audit.json`에 저장했다.

| 문항 | 지문 기호 | 보기 기호/항목 | 합계 |
|---|---|---|---|
| 법인13 | ㉠·㉡ | 없음 | 2 |
| 도파민13 | ㉠·㉡ | (가)·(나)·(다) | 5 |
| 공손룡12 | ㉠ | ⓐ~ⓔ | 6 |
| 정보 비대칭13 | ⓐ·㉠·㉡·ⓑ | 없음 | 4 |
| mRNA19 | ⓐ·㉠·ⓑ·ⓒ·ⓓ·㉡ | 없음 | 6 |
| 표면 장력16 | ⓐ·ⓑ·ⓒ·㉠·ⓓ·ⓔ | 없음 | 6 |

총29범위는 밑줄 기호26개와 도파민 보기의 명시적 항목 표지3개다. 공손룡 ⓒ는
‘옷장 안에 ⓒ옷이 이렇게 많은데’에서 새 DB의 ‘무슨 ⓒ옷이 없어?’ 위치로 바로잡았다.
6개 public fixture에 textAnnotations를 추가했다. 기타 원문 전체 교체, 기호 없는 상자 제목,
도식 내부 표지의 별도 추출은 이번 범위가 아니다. 인쇄 원본 대조는 수행하지 않았다.

## 전달과 검증

- `packages/pipeline/src/problem-solving/source-direct-evaluator.ts`: optional 주석 스키마와
  UTF-16 [start,end)·정확 문자열·인접 문맥·중복 기호 검증. 기존 주석 없는 세션 호환 유지.
- `packages/app/src/shared/contract.ts`, `packages/app/src/server/content.ts`: fixture에서
  세션 입력으로 메타데이터 보존. 외부 DB를 런타임 의존성으로 추가하지 않았다.
- `packages/pipeline/src/problem-solving/source-direct-evaluator-runtime.ts`,
  `packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts`: v3·v4 요청에 범위와
  필드 설명 전달. REPAIR에도 보존. 의미 판정 프롬프트 파일·운영 정책·후보 선택은 미변경.
- `packages/pipeline/src/problem-solving/source-markers.test.ts` 15개,
  `packages/app/src/server/content.test.ts` 11개를 포함해 관련6파일133테스트 통과.
  `source-direct-multi-image-fixtures.test.ts` 4개와
  `packages/app/src/server/problem-feedback-v4-http.test.ts` 3개까지 총140개 통과.
  HTTP 첫 실행은 sandbox listen EPERM으로 실패했고 로컬 listen 허용 재실행에서3개 통과했다.
  `npm run build --silent`, `npm run typecheck:client --silent` 통과.

## 남은 경계

외부 모델 호출0. 범위 보완이 기존 의미 오판을 해결한다는 증거는 아직 없다.
과거 동결 시험 입력·결과는 수정하지 않았으며 새로운 입력의 모델 검증과 구별해야 한다.
실행 중 서버 재시작·UI 디자인 변경은 하지 않았다. 최신 코드로 서버를 실행하고 새 세션을
시작해야 보완 입력을 사용한다. 기존 세션에 저장된 source는 소급 교체하지 않는다.
Q-0030은 의미 정확성 재검증 전까지 open이다.
