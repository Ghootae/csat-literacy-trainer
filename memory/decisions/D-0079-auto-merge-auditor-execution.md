---
id: D-0079
status: accepted
date: 2026-10-02
scope: five-passage-auto-merge-and-auditor-offline-test
supersedes: none
---

# 기존 5지문 결과에 자동 병합과 수정 수행 감사기 시험

## 사용자 결정

기존 JEV 선택·최초 L2·의심 탐지 결과를 재사용하고, 자동 병합→변경 L1/L2 생성→전체25문단 감사를 시험한다. 사용자는 “이번에는 감사기가 추가 병합·불필요한 축 삭제·문구 수정까지 수행하는 것에 동의. 실행 승인.”이라고 명시했다. 문단당 감사1회를 제안했고 이 실행 범위로 준비했다.

D-0076의 자동 병합과 D-0077의 감사 역할을 계승한다. 감사 수정은 제안만 저장하는 것이 아니라 실험 최종본에 직접 반영한다. 운영 UI 자산 적용은 포함하지 않는다.

## 준비와 실행 상태

`scripts/test-axis-auto-merge-audit.mjs`에 별도 실험 경로를 구현했다. 기존 선택71축에서 의심9그룹을 모두 합치면60축이며, 기존 후보 일치6문단·신규 병합 L1 필요3문단이다. 전체25문단 원문 복원·경계와77개 입력/자산 해시를 무호출 검증했다.

OpenAI `gpt-5.6-terra` medium에 원문·축을 보내는 최대37회(병합L1 3+L2 최대9+감사25) 실행 명령은 자동 승인 검토에서 거부됐다. 사유는 실행 승인은 있으나 특정 원문/축 payload의 OpenAI 외부 전송 승인이 명확하지 않다는 것이었다. 명령은 실행되지 않았고 실제 API0회다. 거부를 우회하지 않고 외부 전송 명시 확인을 요청한다. 구현의 실모델 결과와 의미 품질은 미검증이다.

## 근거

- 사용자 직접 실행 승인(2026-10-02).
- `docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02/PLAN.md`
- `docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02/preflight-validation.json`
- `docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02/STATUS.md`
- `scripts/test-axis-auto-merge-audit.mjs`
