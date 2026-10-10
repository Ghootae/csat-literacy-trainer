# 문단 공통 규칙 V3.1 후보 준비 — 외부 API 승인 대기

## Delta

- 사용자 요청은 mRNA 한 문단 특화가 아닌 문단 공통 개선의 시험이다.
- `packages/pipeline/experiments/dialogue/central-story-gate-prompt-v3.1.md`와
  `selective-feedback-prompt-v3.1.md`를 별도 후보로 고정했다. 자연어 축 유지, 압축/누락 구분,
  학생 관계 보존, 이번 질문 목적 전달만 변경하며 문단별 규칙은 넣지 않았다.
- `packages/pipeline/src/dialogue-experiment/gate.ts`에 opt-in `promptRevision`과
  v5 후보 스키마의 questionIntent를 추가했다. `selective-feedback.ts`는 이를 그대로 전달한다.
  `two-stage-evaluator.ts`는 후보 실행에 별도 통합 버전명을 기록한다. 기본값 V3는 유지한다.
- `docs/experiments/dialogue-axis-v31-cross-paragraph-2026-09-18/cases.json`에 6지문/6문단,
  32개 합성 고정 입력 및 기대값을 작성했다. V3/V3.1 동일 입력 비교를 계획했다.
  도파민·폐포·헤겔은 이번 프롬프트 고정 뒤 열었으나 과거 프로젝트에서도 미사용인 것은 아니다.
- 실행기: `scripts/test-dialogue-axis-v31-cross-paragraph.mjs`. 최대 120호출, 과거 단가
  추정 USD 2 중단 한도 (실제 청구 하드캡 아님). 운영 서버/터널은 변경하지 않는다.
- API 실행 명령은 외부 자료 전송 범위에 대한 구체적 승인 부족으로 자동 보안 검토에서 거절됐다.
  프로세스 미시작, 이번 시험 API 0회. 우회하지 않았다. 원문·골드·합성 응답을 OpenAI API로
  보내는 범위와 비용 한도에 대해 사용자의 명시적 승인이 필요하다.
- 준비·차단 정본: `docs/experiments/dialogue-axis-v31-cross-paragraph-2026-09-18/STATUS.md`.
  기대값은 Codex 작성이며 독립 사람 평가가 아니다. 실모형 성능 변화는 아직 알 수 없다.
- 로컬 검증: 전체 TypeScript build, 관련 5파일 76테스트, `git diff --check` 통과.
  `node scripts/validate-memory.mjs`도 통과 (결정 10개, 체크포인트 18개).
