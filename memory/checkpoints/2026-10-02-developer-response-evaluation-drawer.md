---
date: 2026-10-02
scope: developer-problem-evaluation-drawer
base_commit: uncommitted
---

# 개발자 응답 평가 서랍 구현·모의 검증

## 변경한 것

- 개발자 문단 화면에서 연결 문제로 넘어온 경우 및 `/problem/dev`에 `응답 평가` 버튼을
  추가했다. 기본 닫힘, 오른쪽 서랍, 닫기/Esc/배경 클릭, 초점 복귀, 입력 초안 보존.
- 진행 상태와 과거 모델 판정을 분리한다. 판정 선택, 원 학생 인용, 모델의 추론 재구성,
  판정 이유/학습 상태/오류 분류/행동 제안, 최종 정오와 근거 검증을 따로 표시한다.
- `/api/developer/problem-inspect`는 기존 서버 개발자 모드로 보호하는 읽기 전용 GET.
  학생 session 응답에는 내부 평가를 추가하지 않는다. 추가 모델 호출이 없다.
- 평가 이력은 현행 v3 세션 런타임에서 성공한 평가 출력의 복사본을 보존한다.
  영속 로그 복원이나 v4 연결은 이번 범위에 포함하지 않는다.

## 검증

- `packages/app/src/server/problem-solving.test.ts` 17개 +
  `packages/app/src/server/problem-inspection-http.test.ts` 1개 통과.
- `packages/app/e2e/problem-evaluation-drawer.spec.ts` 5개 모의 브라우저 테스트 통과:
  초안/포커스, 학생 비노출, 이력·근거·재구성 분리/모바일, 처리 중/API 오류, 정답+미검증.
- 클라이언트 TypeScript 검사, 전체 TypeScript build, Vite client build 통과.
- 최초 샌드박스 HTTP 테스트는 listen EPERM이었고 승인된 로컬 서버 실행에서 통과했다.
  최초 브라우저 초점 복귀 실패는 트리거로 명시적 복귀시켜 재검증했다.
- 모의 화면을 1440px/390px에서 렌더·육안 확인. 실제 LLM 호출/의미 정확도 검증은 없음.

## 실행 상태와 다음 행동

진행 중인 메모리 세션 보존을 위해 기존 터널/API 서버는 재시작하지 않았다. 실행 서버에는
새 검사 API가 없을 수 있으므로 실제 연결 사용 전 세션 종료/보존 확인 후 재시작해야 한다.
PPT 전체 레이아웃이나 운영 v4 전환을 완료했다고 취급하지 않는다.

## 출처

- `memory/decisions/D-0064-developer-response-evaluation-drawer.md`
- `packages/app/src/client/ProblemEvaluationDrawer.tsx`
- `packages/app/src/client/problem-evaluation-drawer.css`
- `packages/app/src/client/ProblemApp.tsx`
- `packages/app/src/client/api.ts`
- `packages/app/src/shared/contract.ts`
- `packages/app/src/server/problem-solving.ts`
- `packages/app/src/server/index.ts`
- 위 검증 항목의 테스트 파일.
