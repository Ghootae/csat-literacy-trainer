---
date: 2026-10-09
scope: v5-multi-item-luna-sol
base_commit: de9d766b97ab947193e3acbdedbeace11b699608
---

# v5 다문항 시험(gpt-6-luna·gpt-6.1-sol)

- 사용자 판단(2026-10-08): luna는 가격 이점이 크고 gemini는 2027년 가격 인상 예정 → luna 운영 후보, sol 정확도 기준선. gemini·DeepSeek 제외.
  설계 [`docs/review/v5-multi-item-luna-sol-design-2026-10-08.md`](../../docs/review/v5-multi-item-luna-sol-design-2026-10-08.md), 인계 `docs/handoffs/2026-10-08-v5-multi-item-luna-sol.md`(Codex 구현, Claude 검토).
  mRNA 6응답 기대값 사용자 확인. 사전 점검·본 실행 사용자 승인.
- 조건: methods(v5 + 주장 분리 + 인용 규칙), effort medium, 5문항 30응답 × 3반복 × 2모델. 운영 앱과 같게 그림 alt 제외.
  [실행 결과](../../docs/experiments/v5-multi-item-luna-sol-2026-10-08/), [작업 보고(자동 단계)](../../docs/review/v5-multi-item-luna-sol-report-2026-10-08.md).
- 자동 일치: luna 85/90(I1 0/3·D6 1/3), sol 90/90. 칸 중앙값 luna 16.9초·sol 23.9초. 보수 비용 luna 0.18·sol 2.74달러. M3 그림 오독 두 모델 3/3 검출.
- luna effort 시험(사용자 지시, `scripts/test-v5-multi-item-effort-probe.mjs`): high는 불일치 5칸 중 3칸 개선, 응답 시간 2배 이상.
  low는 30응답 1회 25/30, 오류가 여럿인 응답에서 주장 계약 위반으로 판정 실패 3·재시도 2, 중앙값 12.3초. medium 유지가 균형점이라는 데 사용자와 의견 일치(결정 아님).
- 경계 응답(I1·D6) 판정 후보: Q-0032에 기록. 정답 여부에 따른 해석 기본값(사용자 제안, 고친 형태) D6 2/3, 판정 단계 출력 강제 D6 1/3. 둘 다 뚜렷한 개선 없음.
  사용자 판단: 모델의 기본 사고력 문제라 규칙으로 쉽게 해결되지 않는다. [I1·D6 상세](../../docs/review/v5-i1-d6-detail-2026-10-08.md).
- 라우팅 논의(사용자 제안): JEV 1차 판정은 D-0036 보류 조건 미충족·구조상 효과 없음으로 Claude가 비권고.
  luna 판정 결과로 sol 호출은 기존 결과로 시뮬레이션: 근거 부족·확인 불가 전부를 sol로 보내면 sol 호출 29/90·자동 일치 90/90·비용 0.93달러, 중앙값은 sol과 비슷(22.7초). 정답 선택만 보내면 11/90·87/90·0.46달러. 응답 시간 절감책은 아니다.
- 의미 검토([요약](../../docs/experiments/v5-multi-item-luna-sol-review-2026-10-08/REVIEW-SUMMARY.json)): Claude 먼저 고정(sha256 72744baa…) → GPT-6 Astra 블라인드 10묶음.
  첫 GPT 실행은 지시문의 '명령 실행 금지'로 파일을 못 읽어 무효, 읽기용 명령 허용 후 재실행.
  P1~P4 전부 통과: sol 88/90(내부 근거 오류 2), luna 결론 중복을 경미로 보면 78/90(I1 엄격 76), P4 실패로 보면 67/90(65).
  luna의 학생 노출 근거 오류 3(B21 판단 방향, D21·D22 '반비례' 강화), 공개 문구 내부 번호(C3·C5 등) 17칸, 학생 최종 판정을 별도 오류로 세어 교정 질문 추가 12칸. sol은 학생 노출 실패 0.
- 코드 확인: 학생에게 보이는 것은 교정 질문과 COACHING_TERMINATED 코칭뿐이고 errors.description은 개발자 화면 전용, 근거 미확인 정답은 고정 문구만 보인다. 설계 문서의 노출 칸 목록은 이 사실로 정정.
- Claude는 이번에도 GPT가 찾은 근거 문장 오류(반비례 강화, 판단 방향, sourceBasis 대상 혼동)와 공개 질문의 내부 번호를 놓쳤다. 원문 대조로 GPT 지적을 모두 수용, 반박 없음.

## 다음 행동

- 판정기 모델: 2026-10-10 선택 정오 라우팅으로 결정([D-0104](../decisions/D-0104-problem-evaluator-model-routing-by-choice.md)). 다음은 REPAIR 단계 시험 설계.
- luna를 쓸 경우 공개 문구의 내부 선지 번호 제거(코드 후처리 또는 지시)와 결론 중복 오류 처리 검토. 두 모델 공통으로 교정 질문 형식(단답·예/아니오) 과제.
