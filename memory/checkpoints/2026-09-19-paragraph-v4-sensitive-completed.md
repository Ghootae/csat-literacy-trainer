---
date: 2026-09-19
scope: paragraph-v4-sensitive-live-test
base_commit: uncommitted
---

# V4 민감 6문단 실모델 시험 완료

## 이번 작업의 변화

- 이전 실행 차단 뒤 원문·중심축·시험/기존 사용자 응답을 OpenAI API로 전송한다는 범위와
  $2 한도에 사용자가 명시적으로 승인하여 재개했다. 고정된 28개 입력과 실제 질문 뒤 짧은
  고정 답 4건을 실행했다. 모델·프롬프트·골드 해시는 바꾸지 않았다.
- 총 32판정/46물리 호출(판정32, 질문14), usage 기반 추정 $0.435589. 호출 실패·계약
  재시도·사후 보정 0이며 1차 원출력과 검증 후 출력이 모두 동일했다.
- 충분 요약 6/6 PASS, 일부 생략 6/6 자동 질문 없음(PASS4/OK2), 나열6 진단,
  오류6 교정. 실제 공손룡 재생은 PASS, 실제 mRNA 최초 응답 재생은 두 축 OK.
- 짧은 명시 수정 2건 PASS; 단순 ‘네’는 ERROR 유지; 공손룡 부분 수정은 남은 용법
  판단에 대해 ERROR 유지. 이미 수정한 부분이 expressedClaims에 남는 기록 문제도 관찰했다.
- PASS/OK 경계, PASS 공개의 축 밖 이유 추가, 질문의 정답 단서 제공이 남았다.
  오류 근거를 축의 첫 evidence로 선택하는 파생 기록 결함은 코드 원인을 확인했다.
- 선택적 보완 대상 2건이 모두 PASS여서 opt-in 호출은 실행되지 않았다. 단회 합성
  표본으로 false positive 일반 감소나 학습 효과를 확정하지 않는다.
- 프롬프트/런타임 수정·공개 서버 재시작·커밋 없음. 신규 정책 결정 없음.

## 검증과 다음 행동

- 전후 입력/프롬프트/골드 해시 동일 확인; 보고서 생성 스크립트 문법 검사.
- 다음은 보고서의 잔여 문제 검토. PASS/OK 기록 개선과 강제 질문 확대를 혼동하지 않는다.
  mRNA 사용자 수용 압축의 PASS를 오류 정답표로 되돌리지 않는다.

## 근거

- `docs/experiments/dialogue-v4-sensitive-2026-09-19/REPORT.md`
- `docs/experiments/dialogue-v4-sensitive-2026-09-19/REVIEW-PACKET.md`
- `docs/experiments/dialogue-v4-sensitive-2026-09-19/{manifest,results,followups}.json`
- `docs/experiments/dialogue-v4-sensitive-2026-09-19/requests.jsonl`
- `docs/experiments/dialogue-v4-sensitive-2026-09-19/responses.jsonl`
- `packages/pipeline/src/dialogue-experiment/two-stage-evaluator.ts` (`explicitErrors`)
