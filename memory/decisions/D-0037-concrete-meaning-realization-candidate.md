---
id: D-0037
status: accepted
date: 2026-09-29
scope: paragraph-v4-quality-candidate
supersedes: none
---

# 구체적 의미 실현 판정을 V4 개선 후보로 보존

## 결정과 명칭

사용자가 실험의 일부 개선을 인정하며 '일단 후보로 기록하자'고 결정했다.

- 명칭: **구체적 의미 실현 판정**
- 후보 식별자: `v4-concrete-meaning-v1`
- 상태: **개선 후보로 보존 / 운영 미적용 / 일반화 검증 대기**
- 이 결정의 accepted는 후보 보존을 승인했다는 뜻이지, 운영 판정기로 채택했다는 뜻이 아니다.

핵심은 축의 추상적인 문구를 반복하지 않아도 학생이 구체적인 행동·용도·대조로 같은 핵심
구별과 연결을 표현했다면 인정하는 것이다. 예를 들어 '배당 가능/불가능'을 설명한 응답에
'자유로운/제한된 용도'라는 재진술을 추가로 요구하지 않는다. 실제 누락·명시적 오류를
허용하거나 원문으로 학생의 빈 내용을 보충하는 후보는 아니다.

## 관측 근거와 한계

- 법인 2·4문단, 8응답 조건, 기존/후보 각3반복, 총48호출.
- 실제4문단 AX1 PASS는 기존1/3에서 후보3/3. AX2의 실제 조건 연결 누락은 후보3/3 보류.
- 실제2문단 AX3는 양쪽3/3 PASS로 추가 개선 미입증.
- 후보 표적 충분6/6·누락6/6·오류6/6은 사전 기대와 일치했다.
- 실제 응답2개뿐인 개발 표본이며 반복 횟수는 독립 표본 수나 재현 확률이 아니다.
- 2문단 법인격 귀속 판단과 OK/SERIOUS 강도는 여전히 변동한다. 전반적 안정화는 미입증.

## 보존 대상

실험 경로는 이름을 붙이기 전 경로 그대로 유지한다.

- `docs/experiments/axis-concrete-meaning-two-paragraphs-2026-09-29/REPORT.md`
- 같은 디렉터리의 `principles.md`, `candidate-instructions.md`, `PLAN.md`, `cases.json`,
  `manifest.json`, `requests.json`, `wire.jsonl`, `results.jsonl`, `summary.json`, `REVIEW-PACKET.md`
- 동결 후보 지시문 SHA-256: `6fb9baf54a1a1f7f864f1d8c562512e81c119ad6a4fc4c32ade4bce21e4aeaf4`

## 적용 범위와 후속 검증 조건

기존 운영 V4, 골드, 출력 계약, UI와 서버는 유지한다. 이번 결정은 추가 API 실행이나
운영 배포를 승인한 것이 아니다. D-0013과 D-0030의 운영 유지·출력 절삭 보류를 대체하지 않는다.

운영 적용을 검토하려면 후보를 고정한 상태에서 미사용 문단의 구체적 충분 응답을 인정하면서
실제 관계 누락·주체 귀속 오류·관계 역전·단순 나열은 구별하는지 확인해야 한다.
다른 축의 과수용, OK/SERIOUS 강도, 질문·후속 대화와의 연결도 검토한다. 결과와 사용자
판단을 거쳐 별도로 승격 여부를 결정하며, 실패한 원출력을 삭제하거나 선택적으로 재실행하지 않는다.

## 근거 자료

- `docs/experiments/axis-concrete-meaning-two-paragraphs-2026-09-29/REPORT.md`
- `docs/experiments/axis-concrete-meaning-two-paragraphs-2026-09-29/manifest.json`
- `memory/checkpoints/2026-09-29-axis-concrete-meaning-two-paragraphs.md`
- 사용자 명시 결정: '이 실험(명칭 필요)은 어느 정도 개선이 있어보이니, 일단 후보로 기록하자.'
