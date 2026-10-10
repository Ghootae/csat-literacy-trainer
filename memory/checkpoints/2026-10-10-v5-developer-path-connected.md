---
date: 2026-10-10
scope: v5-developer-path-connection
base_commit: 0c903b8
---

# v5 개발자 경로 연결 구현(코덱스)과 diff 검토

- 인계 [문서](../../docs/handoffs/2026-10-10-v5-developer-path-connection.md)대로 코덱스가 구현: v5 지시문(교정 판정 국소 규칙 v2 포함, 실험 파일과 바이트 동일), 주장 분리 계약, 호출별 모델 라우팅, 교정 후 버튼 단계, 별도 종료 설명 호출(오답 sol·정답 luna), 공식 해설 비공개, 코치 마크다운 렌더링.
- 1차 실행은 "네트워크 금지"가 루프백 테스트 서버를 포함하는지 불명확해 구현 전 중단·보고. 외부 네트워크만 금지로 보완해 재실행.
- Claude diff 검토 후 직접 수정 2건(기울임 제거, 버튼 명령 발화 제외). 지정 테스트 342/342·build·client typecheck 통과. 기준선 사본 `.omc/artifacts/baseline-v5-connect-2026-10-10/`.
- 규칙 수형도: https://claude.ai/artifact/JDq5jP8TkJngn4gXZAz5aY
- 위험: v4 런타임·v5 지시문·개발자 UI 파일 다수가 git 미추적이다(커밋 미정).

## 다음 행동

- 실모델 확인 시험(승인 필요): 종료 지점 표의 각 행, 특히 미시험인 재선택 오답·근거 확인 불가·NO_CORRECTION 코칭.
- 커밋 범위 결정.
