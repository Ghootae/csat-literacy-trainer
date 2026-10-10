---
date: 2026-10-01
scope: problem-feedback-v4-four-failure-hardening
base_commit: uncommitted
---

# 문제 피드백 네 실패 보완과 재검증

- 사용자 수정·재검증 승인 D-0063에 따라 학생 관점 결론 분리와 충돌 후보의 별도 확인,
  최신 교정 답변 명시·읽기 인용 계약, 공개 코칭 검사·판정 고정 재생성, 제한적 원문 복원·
  실패 이유를 포함한 재시도를 구현했다. 자동 재시도는 합쳐 1회이며 지속 실패는 학생 실패로
  종료하지 않는다. 근거: `packages/pipeline/src/problem-solving/feedback-v4.ts`,
  `packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts`,
  `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4.md`.
- 같은 4문항·최초34판정·후속10경로를 별도 디렉터리에서 시험했다. 최초33/34·후속10/10
  사전 필드 일치. S2-r2는 API 400 거부로 결과 없음이며 우회·재전송하지 않았다. 기존32조건만
  비교하면32/32, 기존후속8경로8/8이다. 독립 사람 정확도가 아니다. 근거:
  `docs/experiments/problem-feedback-v4-hardening-2026-10-01/RESULTS.json`, `docs/experiments/problem-feedback-v4-hardening-2026-10-01/REPORT.md`.
- S2 유효2회는 학생 VALID 결론과 CONTENT를 보존했다. I1 올바른 수정 답변은3/3 인식하고
  재선택으로 이어졌다. I1-persist·C1-new의 공개 대상 코칭 손상2건은 코칭만 재생성해 회복,
  공개 모델 코칭9건의 손상 노출0건이다. 원문 따옴표 인용1구절 복원, 인용 계약 실패0건.
  근거: `docs/experiments/problem-feedback-v4-hardening-2026-10-01/METRICS.json`, `docs/experiments/problem-feedback-v4-hardening-2026-10-01/REVIEW-PACKET.md`.
- API54요청(완료53·거부1), 논리 평가49건. 사용량 확인분 추정 USD0.5678646, 미확정
  예약 USD0.13091을 포함한 예산 계산 USD0.6987746. 64요청·3달러 한도 준수. 최초 출력
  C1-r3는 빈 coaching으로 계약 재시도1회가 필요했다. 근거: `docs/experiments/problem-feedback-v4-hardening-2026-10-01/requests.jsonl`, `docs/experiments/problem-feedback-v4-hardening-2026-10-01/METRICS.json`.
- build·클라이언트 타입 검사·v4 77테스트와 기존 평가기15테스트 통과. 전체1005중1003통과,
  기존 student-state 파일 접근 경계·과거 헤겔 fixture 누락2실패만 남았다. 근거:
  `docs/experiments/problem-feedback-v4-hardening-2026-10-01/OFFLINE-TESTS.json`.
- 미공개·미사용 coaching9개에는 손상이 남아 있다. 생성 자체의 제거가 아니라 공개 전
  차단과 회복이다. 별도 결론 확인 역시 같은 모델이라 동반 의미 오판 가능성이 남고, 최신
  응답 인용은 이해 정확성의 보장이 아니다. I1 귀속 표현·S4 오류 분절·D2 질문의 전제 제공,
  미사용 문항과 실제 학생 검증은 남는다. 근거: `docs/experiments/problem-feedback-v4-hardening-2026-10-01/REPORT.md`.
- 교육 정책·UI·운영 v3·서버 재시작·학생 상태 집계 편입은 변경하지 않았다. 기존 실행본을
  보존했고 Q-0028~Q-0030은 open 유지한다. 근거: D-0063, 위 보고서와 실행 고정 파일.
