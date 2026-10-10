---
date: 2026-09-19
scope: paragraph-current-claims-lifecycle
base_commit: uncommitted
---

# 현재 주장과 수정 이력 분리 구현

## 변경

- 2번 수정 승인에 따라 모델 출력에 주장 상태 원장을 도입하고 current 주장만 현재
  목록으로 투영한다. 과거 발화·superseded/retracted 이력·수정 근거를 보존한다.
- 인용 출처/응답 번호/변경 시간 순서 검사 및 기존 계약 재시도 감사에 연결했다.
- 새 1차 버전 `central-story-gate-prompt-v4-claims-v1` / schema v7,
  새 저장 schema v5. 2차·판정 정책은 불변. 구 V4 실행기는 기록 확장 false로 고정해 보존.
- 1번 null 오류 인용 조치를 완전한 수정으로 잘못 표현한 점을 현행 메모리에 바로잡았다.
  정확한 오류 인용 자동 지정은 미완성으로 남긴다.

## 검증

- 관련 8파일 118테스트 및 전체 build 통과. 부분 수정·철회·모순·동의·잘못된 근거,
  원출력 감사, 2차 현재 목록, opt-in 재판정 없음, handoff 보존을 모의 검증했다.
- 구 실험 출력 32건 오프라인 재생은 기존 기록 방어 조치 외 결과 일치. 새 모델 의미 품질을
  검증한 것이 아니다. 새 유료 호출 0회, 서버 재시작·커밋 없음.

## 미완료와 다음 행동

- 현재/수정 상태를 실제 모델이 올바르게 분류하는지 후속 유료 표적 검증 필요.
- 1번의 정확 오류 인용 추출·저장은 별도 미완성. 정책 경계 강화와 함께 처리하지 않는다.

## 근거

- `docs/experiments/dialogue-current-claims-fix-2026-09-19/REPORT.md`
- `packages/pipeline/src/dialogue-experiment/claim-recording.ts`
- `packages/pipeline/src/dialogue-experiment/claim-recording.test.ts`
- `packages/pipeline/experiments/dialogue/current-claims-recording-v1.md`
- `packages/pipeline/src/learning-session/handoff.test.ts`
