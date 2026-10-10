---
date: 2026-09-19
scope: paragraph-v4-sensitive-live-test-preparation
base_commit: uncommitted
---

# V4 민감 문단 시험 준비 및 API 전송 차단

## 이번 작업의 변화

- 사용자 표적 테스트 승인에 따라 민감 6문단 28개 입력을 준비했다. 프롬프트·골드·입력
  해시를 고정하고 자체 $2 제한, 최대 64물리 호출, 전송 재시도 0회로 실행기를 작성했다.
- `npm run build`와 준비 단계는 성공했다. 유료 실행은 프로세스 시작 전 보안 검토에서
  외부 API 전송 범위에 대한 명시적 승인 부족으로 거절됐다. API 요청 0건, 비용 $0.
- 결과를 만들거나 품질 개선을 주장하지 않는다. 운영 프롬프트·서버·터널 변경 및 커밋 없음.
- 과거 mRNA 압축 문장을 확정 오류 정답표로 재사용하지 않으며, 자동 행동 기대와 의미
  검토를 분리한다. 기존 정책을 변경하는 신규 결정은 없다.

## 다음 행동

- 문단 원문·중심축·합성 응답·일부 기존 사용자 응답을 OpenAI API에 전송하는 범위를
  사용자에게 확인받은 뒤 고정된 초기 시험을 실행한다. 차단을 우회하지 않는다.

## 근거

- `docs/experiments/dialogue-v4-sensitive-2026-09-19/PLAN.md`
- `docs/experiments/dialogue-v4-sensitive-2026-09-19/manifest.json`
- `docs/experiments/dialogue-v4-sensitive-2026-09-19/cases.json`
- `scripts/test-dialogue-v4-sensitive.mjs`
