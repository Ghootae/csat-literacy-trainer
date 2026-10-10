---
date: 2026-09-20
scope: direct-relational-boundary-preparation
base_commit: 58f9c93
---

# 관계 누락 대조 시험 동결·오프라인 검증

## 작업 delta

- `axis-direct-judgment-v2-relational-boundary` 후보를 v1의 두 문단 교체로 구현했다. 입력·출력 계약은 동일하다.
- 실제 골드3문단의5쌍과 가상 통제5쌍, 총10쌍을 작성했다. 도파민 기존 실패 응답을 그대로 포함했다.
- cases·요청 템플릿40개·120작업 순서·기대·프롬프트·관련 파일 해시를 동결했다.
- build 및 문단 대화200테스트(신규12) 통과. 원본3골드·관련30파일 검증. API0호출.
- 기존 V4/문제V3/골드/UI 변경이나 서버 재시작은 없다.

## 결정 및 미해결

D-0023은 후속 설계·준비에 관한 결정이다. 신규 유료 실행과 제안 상한$1은 미승인이다. 의미 결과, 직접 판정 후보 승격, 운영 기능과의 결합은 여전히 미확정이다.

## 다음 행동

120호출·로컬$1상한 승인을 받은 뒤 동결 요청을 집행할 예산 제한 실행기를 연결한다. 이 준비 스크립트 자체는 API를 호출하지 않는다. 원응답·요청·계약 실패를 모두 보존하고 중간 프롬프트 수정은 하지 않는다.

## 근거

- `docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20/PREPARATION-REPORT.md`
- `docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20/manifest.json`
- `scripts/prepare-relational-boundary.mjs`
- `packages/pipeline/src/dialogue-experiment/relational-boundary-experiment.test.ts`
