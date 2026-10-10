# 문단 중심축 범위 V3 구현 및 mRNA 1차 검증

## 이번 delta

- 사용자 승인에 따라 D-0010과 `docs/PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V3-2026-09-18.md`
  추가. D-0004는 기록을 보존하고 superseded로 연결했다. D-0009 재시도 원칙은 유지한다.
- `packages/pipeline/src/dialogue-experiment/gate.ts`: V3 프롬프트 / v4 스키마,
  중심 이야기·축 relationIds 입력 제외, missingAxisEvidence 정확한 축 인용 계약 추가.
- `packages/pipeline/src/dialogue-experiment/selective-feedback.ts`: V3 질문 프롬프트,
  중심 이야기 제외, 누락 축 인용 전달. `two-stage-evaluator.ts` 통합 버전 V3.
- 새 프롬프트는 `packages/pipeline/experiments/dialogue/central-story-gate-prompt-v3.md`,
  `selective-feedback-prompt-v3.md`. 골드 및 문제 풀이 프롬프트는 변경하지 않았다.
- 전체 TypeScript build 및 관련 5파일 72테스트 통과. 입력·인용·상태 계약 검증이지 의미 보증은 아니다.
- `scripts/test-dialogue-axis-v3-mrna.mjs`로 5조건·8판정 턴·12 API 호출.
  기록은 `docs/experiments/dialogue-axis-v3-mrna-2026-09-18/REPORT.md` 및 동 디렉터리 JSON/JSONL.
  과거 단가 추정 비용 USD 0.0909152 (청구 확인 아님).
- 실험 결과는 의미 검증 실패다. 충분 답 PASS 외에 축 밖 이유 질문, 특징 누락 통과,
  명시적 원인 오류 통과를 확인했다. 후속 짧은 보완·철회는 최초 오통과로 미실행이다.
  원출력/검증 결과의 보정·재시도는 없었다. 첫 결과를 보존하고 같은 묶음에서 재튜닝하지 않았다.
- 소스·빌드 기본값만 V3이며 기존 실행 중 서버·터널 재시작은 하지 않았다. 운영 세션 보존.
- Q-0012 개설. 다음 단계는 실패 원인을 분리 검토하고 별도 해시로 재검증하는 것이다.
  다른 지문·42사례 유료 회귀는 이번 작업 범위 밖이다.
- 메모리 갱신 후 `node scripts/validate-memory.mjs` 통과 (결정 10개, 체크포인트 17개).
  `git diff --check`도 통과했다.
