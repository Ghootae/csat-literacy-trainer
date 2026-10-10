# 5지문 자동 병합·감사 수정 시험 준비

- D-0079: 사용자가 감사기의 직접 병합·삭제·문구 수정과 실행 승인. 기존 최초71축과 의심9그룹을 재사용한다.
- `scripts/test-axis-auto-merge-audit.mjs` 신규 작성. 기존 실험·운영 코드와 결과는 보존한다.
- `docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02/PLAN.md`와 프롬프트/입력을 동결했다. 자동 병합 후60축, 후보 일치6문단·신규 L1필요3문단.
- `preflight-validation.json`:25문단 원문·경계·77해시 통과, 구문 검사 통과. 실모델 의미 품질 검증은 아님.
- 자동 승인 검토가 원문·축의 OpenAI 전송 명시 승인 부족으로 명령을 차단했다. 실제 API0회, 외부 전송 확인 대기. `STATUS.md`에 기록.
