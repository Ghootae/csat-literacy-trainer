# 학생 상태 과거 직접 사용 6세션 감사

`docs/experiments/user-direct-full-cycle-six-2026-09-11/REVIEW-PACKET.md`의 학습 세션 ID 여섯 개로
문제 완료 JSONL을 읽기 전용 재생했다.

- 6개 ID 모두 정확히 한 문제 완료 기록과 매칭됐고 현재 세션 스키마에 유효했다.
- 근거 기반 문제 해결은 긍정4·부정1·불확정1, 서로 다른 문항6, `EARLY_PATTERN`이었다.
- 최초 오답 1건은 `CORRECTIVE_ONLY` 뒤 두 번째 선택에서 해결되어 교정·회복 긍정1로 별도 보존됐다.
- 확신도 입력이 없어 자기 점검 관측은 0이었다.
- 문단 JSONL에는 상위 학습 세션 ID가 없어 실제 여섯 세션과 안전하게 결합하지 않았다.
- `HISTORICAL_UNKNOWN`으로만 계산했으며 현재 학생 프로필에 백필하지 않았다.

알려진 첫 선택 정답5/6·최종6/6·재선택1/6과 모순은 없었다. 감사 중 `EARLY_PATTERN`을
“반복적으로”라고 표현한 과장을 발견해 잠정 후보 문구로 수정하고, `REPEATED_PATTERN`만 반복
확인으로 표현했다. 불확정 증거 수도 같은 피드백 문장에 표시한다.

후속 계약 검토에서 `UNRESOLVED`를 도움 단계로 둔 모순도 제거했다. 미해결 여부는 부정/불확정
결과가 담당하고 도움 단계는 독립·진단·교정·코칭·정답 공개만 기록한다. 문단 질문 뒤
`unknown→unknown` 관계는 누락하지 않고 사용한 질문 단계의 `INDETERMINATE` 회복 증거로 남긴다.

상세: `docs/experiments/student-state-historical-direct-six-2026-10-01/REPORT.md`
