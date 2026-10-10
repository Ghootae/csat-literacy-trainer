---
date: 2026-09-19
scope: paragraph-error-evidence-recording-only
base_commit: uncommitted
---

# 오류 인용 임의 선택 중단

## 이번 작업의 변화

- 사용자 ‘1번 수정 승인.’에 따라 `explicitErrors()`가 오류 축의 첫 evidence를 잘못된
  문장으로 지정하는 결함만 수정했다. 오류 판정은 유지하고 정확 인용은 null, 근거 전체는
  axis_context/axisEvidence로 출처와 함께 보존한다. 오류 문장을 새로 추론하지 않는다.
- 저장 합성 스키마만 `axis-dialogue-selective-openai-v4`로 갱신했다. 구형 문자열 인용
  읽기와 handoff는 호환된다. 과거 원본 기록은 변경하지 않았다.
- 판정 기준·프롬프트·API 출력 계약·골드·질문 정책은 불변. 사용자 지적 2번인 수정된
  주장 목록 문제와 OK/PASS 경계는 미수정이다. 신규 교육 정책 결정은 없다.

## 검증

- 전체 build, 관련 7파일 103테스트 통과.
- 기존 실모델 32건을 저장된 1차/2차 출력으로 재생하여 오류 기록을 제외한 결과 전체 일치.
  ERROR 8결과의 축 오류 10개를 문맥 기록으로 보존했다. 프롬프트 해시 동일 확인.
- 신규 API 호출/비용 0, 서버 재시작·커밋 없음.

## 한계와 다음 행동

- 정확한 오류 문장 자동 지정은 구현하지 않았다. 현재 모델 계약에는 이를 식별할 전용
  정보가 없으므로 코드가 추측하지 않게 한 수정이다. 앞으로 축 문맥을 오류 인용으로
  오독하지 않는지 확인한다. 별도 의미 판정 변경 없이 직접 사용 검토를 이어갈 수 있다.

## 근거

- `docs/experiments/dialogue-error-recording-fix-2026-09-19/REPORT.md`
- `docs/experiments/dialogue-error-recording-fix-2026-09-19/REPLAY.json`
- `scripts/replay-dialogue-error-recording.mjs`
- `packages/pipeline/src/dialogue-experiment/two-stage-evaluator.ts`
- `packages/pipeline/src/dialogue-experiment/schema.ts`
- `packages/pipeline/src/dialogue-experiment/two-stage-evaluator.test.ts`
- `packages/pipeline/src/learning-session/handoff.test.ts`
