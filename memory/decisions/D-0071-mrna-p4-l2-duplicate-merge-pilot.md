---
id: D-0071
status: accepted
date: 2026-10-02
scope: mrna-p4-offline-l2-duplicate-merge-pilot
supersedes: none
---

# mRNA 4문단 L2 중복 확인·병합 단일 시험

## 결정

사용자는 4문단의 첫 두 축을 명백한 과분해로 판정하고, L2 중복 의심 → L1·원문 확인 → 병합 경계와 일치하는 기존 후보 선택, 없으면 병합 축 생성의 단일 시험을 요청했다. 원문·기존 L1/L2를 OpenAI gpt-5.6-terra로 전송하는 중복 탐지·원문 확인·새 L2 생성 총 3회 호출을 명시적으로 승인했다.

이번 한 문단의 오프라인 시험 승인이다. 생산 규칙 채택·기존 골드 교체·UI 변경 승인이 아니다. D-0068의 근소 점수 규칙과 별개인 후처리이며 기존 JEV 순위는 보존한다.

## 관측

L2만 입력한 탐지에서 AX1·AX2를 찾았고, L1·원문 확인은 결과와 이유로 병합을 승인했다. 기존 C2의 경계가 정확히 일치하여 재평가 없이 선택, 새 L2를 생성했다. 3축→2축. 3호출 성공. 후보 부재 시 새 L1 생성 분기는 미실행이다. 알려진 실패 사례 단회이며 반복 안정성·일반화는 미검증이다.

## 근거

- `docs/experiments/mrna-p4-l2-merge-2026-10-02/REVIEW.md`
- `docs/experiments/mrna-p4-l2-merge-2026-10-02/result.json`
- `docs/experiments/mrna-p4-l2-merge-2026-10-02/audit.json`
- `scripts/test-mrna-p4-l2-merge.mjs`
