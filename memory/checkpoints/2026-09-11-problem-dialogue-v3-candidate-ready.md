# 문제 풀이 v3 후보 무과금 준비

- 날짜: 2026-09-11 KST
- 운영 기본값: `source-direct-problem-dialogue-prompt-v2` 유지
- 후보: `source-direct-problem-dialogue-prompt-v3`
- 최종 후보 SHA-256: `3ba91f7093612560a874304265d510d5d968e3101983aff449152f08301a48ff`
- 최종 회귀 계약 SHA-256: `f4b7a8d1840bcfc905f6b325e57986833d6a7a8d5e308b2a7960de4362c2012a`
- 유료 호출: 25회, USD 0.314664 / 하드캡 USD 0.50

## 작업 delta

- 학생 발화에서 생략된 언어 표현과 확인되지 않은 판단 내용의 복원을 분리했다.
- 정답 근거의 오류 여부와 충분성을 분리하고 `reason`–`assessment` 정합 규칙을 추가했다.
- 호출 사이 학생 명제 보존, 중립적 진단, 실제 오류를 겨냥하는 교정, 간접 정답 누출 없는
  재선택, 부분 수정의 제한적 인정을 v3 후보에 반영했다.
- 기존 관측 실패 9건과 합성 대조 4가족을 기계 판독 가능한 회귀 계약으로 고정했다.
- evaluator가 v2를 기본값으로 유지하면서 실험 입력에서만 v3를 선택하고 실제 버전을 호출·감사
  메타데이터에 기록하도록 확장했다. 입력과 evaluator 버전이 다르면 호출 전에 거부한다.
- 기존 7문항 전체 사이클 runner는 기본 v2 동작을 유지하면서 프롬프트 버전과
  `questionId/caseId` 표적을 명시할 수 있게 확장했다. v3 표적 dry-run은 6문항·10경로·계획
  19호출이며 실제 API 호출은 발생하지 않았다.
- 최초 표적은 행동 19/19가 일치했지만 진단 질문 1건이 미확인 가설을 학생 주장으로 바꿨다.
  첫 보정은 정답 관계를 양자택일로 제공해 실패했고, 두 번째 보정의 동일 3턴은 중립적 진단,
  교정, 재선택으로 정상 완료됐다.

## 검증

- `packages/pipeline/src/problem-solving/source-direct-evaluator.test.ts`: 15/15 통과
- 다중 이미지 fixture 및 앱 서버 문제 풀이 표적 테스트: 18/18 통과
- `npm run build --silent`: 통과
- 전체 테스트에서는 작업과 무관한 `.omc/adhoc/.../hegel-aesthetics-absolute-spirit-p1.json`
  부재로 `axis-architecture-experiment.test.ts` 1건이 실패했다.

## 다음 단계

최종 v3 해시로 최초 표적 19호출을 다시 실행한다. 최종 해시의 전체 표적이 통과하기 전에는
82호출 전체 회귀나 운영 승격을 진행하지 않는다.

## 출처

- `packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-prompt-v3.md`
- `packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-v3-regression-contract-v1.json`
- `packages/pipeline/src/problem-solving/source-direct-evaluator.ts`
- `packages/pipeline/src/problem-solving/source-direct-evaluator-runtime.ts`
- `packages/pipeline/src/problem-solving/source-direct-evaluator.test.ts`
- `docs/experiments/problem-source-direct-v3-targeted-canary-2026-09-11/FINAL-REPORT.md`
