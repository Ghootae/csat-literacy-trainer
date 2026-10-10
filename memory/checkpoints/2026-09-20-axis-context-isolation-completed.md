---
date: 2026-09-20
scope: axis-context-isolation-live-diagnostic
base_commit: 58f9c93
---

# 축 맥락 격리 진단 완료

## delta

- 기존5응답·2프롬프트의 전체/단일 축 비교를3회씩60호출 실행했다. 중앙축 목록 외 원문·학생 답·schema·프롬프트 불변을 감사했다.
- 도파민 D01 과수용은 두 프롬프트 모두3/3→1/3. 공손룡 G01 후보 AX2 보류는2/3→0/3, v1은 원래0/3. 충분 대조군은 모든 조건PASS.
- 후보 G01 전체 첫 회는 전문성·대표성을 이유로SERIOUS, 두 번째는 핵심을 확인했다고 쓰면서OK였다. 단일 축은3/3PASS.
- 도파민 완결문 D02도 이번 v1 전체에서1회PASS해 과거3/3SERIOUS를 고정 법칙으로 취급할 수 없다.
- 비용추정$0.1405383, 계약60/60·재시도0·질문0. 신규8테스트 포함208테스트 및build 통과.
- 운영 V4·문제V3·골드·UI 변경 및 서버 재시작 없음.

## 해석과 미해결

평가 축 범위에 따른 차이를 관측했지만 의미적 간섭·동시 판단 부담·순서 효과는 구별하지 못했다. 도파민 잔여 과수용이 있어 격리는 완전 해결이 아니다. 전체 문단의 축별 호출 비용·지연은 미검증이다.

## 다음 행동

원사례와 전체60판정을 검토하고, 후속 검증이 필요하면 운영 전환과 구분해 승인받는다. 새 규칙·인용 필드나 대규모 회귀를 자동 진행하지 않는다.

## 근거

- `docs/experiments/axis-context-isolation-v1-2026-09-20/REPORT.md`
- `docs/experiments/axis-context-isolation-v1-2026-09-20/REVIEW-PACKET.md`
- `docs/experiments/axis-context-isolation-v1-2026-09-20/execution-audit.json`
- `packages/pipeline/src/dialogue-experiment/axis-context-isolation.test.ts`
