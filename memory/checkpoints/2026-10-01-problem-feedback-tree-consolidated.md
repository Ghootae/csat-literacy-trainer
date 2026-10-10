---
date: 2026-10-01
scope: problem-solving-feedback-consolidated-design
base_commit: uncommitted
---

# 네 가지 명료화 승인 및 저장 가능한 수형도 작성

## 결정 delta

- 사용자 승인으로 [D-0059](../decisions/D-0059-problem-feedback-clarifications-consolidated.md)를 기록했다.
- 정답도 전체 확인 불가이면 국소 오류보다 미검증 종료를 우선한다.
- 교정 중 새 오류는 질문 목록에 추가하지 않고 최종 평가에만 반영한다.
- 이미 실제 수정한 후속 오류의 질문은 생략한다.
- 최초 오답 근거 보완 요청에 다시 미제출을 선택하면 반복 요구 없이 확인 불가·코칭·정답 공개 후 종료한다.
- 학습 분기 명료화는 완료됐으며 실제 구현·실모델 검증은 완료하지 않았다.

## 산출물

- `docs/review/problem-feedback-policy-tree-2026-10-01.html`: 독립 실행 가능한 수형도. A 최초 선택,
  B 최초 오답 근거, C 공통 교정, D 마지막 선택, E 공통 예외의 5구간을 내부 링크로 연결한다.
- `docs/review/problem-feedback-policy-tree-2026-10-01.txt`: 위 페이지의 텍스트 저장 기능으로 생성한 수형도.
- `scripts/verify-problem-feedback-policy-tree.mjs`: 저장 산출물 전용 브라우저 검증. 모델/API를 호출하지 않는다.
- 로컬 미리보기: `http://127.0.0.1:41874/problem-feedback-policy-tree-2026-10-01.html`.
  loopback 서버는 `docs/review`만 제공하며 프로세스 생존 중에만 유효하다. 파일 자체는 서버 없이 열린다.
- Codex 오른쪽 브라우저 패널 열기를 요청했고 로컬 서버에서 해당 문서 GET 200을 확인했다.
  CUA 도구는 초기화 오류로 앱 화면 자체를 읽지 못했으며, 별도 로컬 Chrome에서 화면을 검증했다.

## 검증

- 로컬 Chrome 자동 검증 통과: 구간 5개·말단 34개·접이식 분기 20개, 모든 내부 링크 유효.
- 920px·360px·320px에서 가로 넘침 없음. 데스크톱·모바일·교정 구간 스크린샷을 육안 확인했다.
- 가지 접기/펼치기, 텍스트 다운로드, HTML 다운로드 후 재열기(중복 없이 동일 구간·말단),
  인쇄 직전 전체 펼치기 및 인쇄 후 상태 복원 통과. JavaScript 오류 0건.
- 실제 인쇄 대화상자의 PDF 저장이나 학습 런타임/실모델 분기 정확성을 검증한 것은 아니다.
- 현행 코드·운영 프롬프트·학생 UI·포인트는 변경하지 않았다.

## 다음 행동

사용자가 구현을 요청하면 D-0059와 수형도를 기준으로 상태 머신·평가기 계약·회귀 사례를 구성한다.

## 근거

- 사용자 요청: 2026-10-01 ‘제안에 모두 동의. 모든 가능한 경우를 직관적으로 파악할 수 있는 수형도의 형태로 출력해서 저장 가능해?’
- `memory/decisions/D-0059-problem-feedback-clarifications-consolidated.md`
- `scripts/verify-problem-feedback-policy-tree.mjs` 실행 출력.
