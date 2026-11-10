---
date: 2026-11-10
scope: problem-feedback-prompt-adoption
base_commit: 4bbe5305
---

# 체크포인트: 교정 질문 블라인드 판정 — v5.9 질문 4/5 우세

- D-0216 2번의 블라인드 판정을 사용자가 마쳤다(2026-11-10). 저장된 v5.8·v5.9 sol r1 질문 5사례, 새 외부 전송 없음.
- 결과([RESULT](../../docs/experiments/question-rules-v59-2026-11-09/blind/RESULT.md)): v5.9 우세 4(오디오 17·경마 5·플라 10 V1·오디오 16 V3), v5.8 미세 우세 1(플라 10 V2, 사용자 "거의 비슷", 두 질문은 "플라스틱의" 한 단어 차이). v5.9가 뚜렷이 나쁜 사례 0.
- D-0216 다시 볼 조건(v5.9 질문이 더 나쁨)에 해당하지 않음. 진단평가 기본값을 v5.10으로 바꾸는 전제 충족.
- 한계: 5사례, r1 한 번, 판정자 1명, 항목별 점수는 남기지 않음.
- 다음: 진단평가 판정 기본값 v5.10 전환(옵션 `judgmentRules`, 코드 변경). lab은 v5.8 유지.

## 진단 v5.10 전환 (같은 날)

- `packages/app/src/server/diagnostic/controller.ts`: 상수 `DIAGNOSTIC_JUDGMENT`(judgmentRules `v5.10`, 지시문 `source-direct-problem-feedback-v5.10.md`, promptVersion `problem-feedback-v5.10`)를 진단 기본 평가기에 넣음. 교정 판정(luna)도 같은 지시문. lab(`index.ts`)은 v5.8 그대로.
- 시험: `controller-evaluator.test.ts`에 v5.10 설정·지시문 파일 존재 확인 추가. 진단·판정 585 통과, `npm test` 1682 통과·2 실패(기존: `boundary.test.ts`, `axis-architecture-experiment.test.ts`).
- 실모델 진단 완주는 아직 안 함. 서버 재빌드·재시작 뒤 적용.
