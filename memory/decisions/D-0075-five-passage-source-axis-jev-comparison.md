---
id: D-0075
status: accepted
date: 2026-10-02
scope: five-ui-passages-offline-source-candidate-jev-l2-merge-comparison
supersedes: none
---

# mRNA 제외 UI 연결 5지문의 원문 분할 후보·L2 병합 비교 시험

## 승인 범위

사용자는 현재 UI 연결 지문에서 mRNA만 제외하도록 지정하고, 원문 분할 후보 모델을 실행해 현재 ‘중심 이야기 기반 L1·L2 공동 생성’ 모델과 비교하도록 요청했다. JEV는 공개 Playground로 진행하도록 지정했다. 자동 승인 검토가 외부 전송 범위의 명시적 승인을 요구한 후, 사용자는 5지문·25문단의 원문/축을 OpenAI gpt-5.6-terra(후보75회 및 L2·중복 확인·병합)와 JEV 공개 Playground(후보별5회)에 보내는 것을 명시 승인했다.

1/2/3/4축3회 생성 → 경계 중복 제거 및 첫 문구 평가 → JEV5회 평균 → D-0068의1·2위 차이≤0.1이면 적은 축 → 별도 L2 → 중복 의심/원문 확인 → 기존 경계 일치 후보 선택 또는 병합 축 생성 → 변경 시 L2 재생성을 시험했다. 문단당 병합 확인은1회이며 반복 루프는 없다. 기존 골드는 비교용으로만 동결하고 새 모델 입력에서는 제외했다.

## 적용 한계

오프라인 시험 승인이다. 새 골드 생산 기준선 채택·현재 UI 자산 교체·학생 판정기 변경·JEV 제품 적용 보류(D-0036) 해제가 아니다. 두 모델을 같은 평가기로 정량 채점한 시험이나 새 사람 판정도 아니다.

## 측정

- 25문단 생성75호출·300분할 → 133후보, JEV180요청·665점수, OpenAI 전체135호출 성공.
- 기존43축 → JEV선택71축 → 병합 후70축. 기존보다 증가20·동일4·감소1문단.
- 근소 순위에 따른 적은축 전환4문단. L2 의심9문단·원문 확인 승인1문단.
- 표면 장력6에서2축을 기존C1의1축으로 병합하고 L2를 재생성했다. 후보 부재 생성 분기는 미실행이다.
- 원문 복원·요청 전송 일치·ID/순서·점수 범위·후보별5점수·기존 자산 해시 검사 통과.

## Codex 검토와 미결정

분리/내용 복원 이점 외에 도입 문장의 별도 축화(표면 장력2·3), 같은 경계의 첫 문구에서 관계 손실(도파민2), 그룹 전체 거절로 부분 병합 누락(공손룡4)을 원문과 원시 결과에 근거한 Codex 검토로 보고했다. 사람의 확정 판정이나 일반화된 성능 사실로 승격하지 않는다. 새 L2 일부의 의미 방향 약화·불필요한 대비도 검토 대상이다. 운영 승격·수정안 채택은 미결정이다.

## 근거

- `docs/experiments/axis-candidate-jev-five-passages-2026-10-02/PLAN.md`
- `docs/experiments/axis-candidate-jev-five-passages-2026-10-02/COMPARISON.md`
- `docs/experiments/axis-candidate-jev-five-passages-2026-10-02/final-audit.json`
- `scripts/test-axis-candidate-jev-five-passages.mjs`
- `scripts/finalize-axis-jev-five-passages.mjs`
