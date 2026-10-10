---
date: 2026-10-02
scope: axis-boundary-codex-independent-semantic-review
base_commit: uncommitted
---

# 새 사용자 판정 미열람 상태의 사람/JEV 경계 비교

## 새로 확인된 것

- 사용자는 사후 판정을 완료했다고 말하고 그 내용을 모른 채 사람/JEV를 비교하도록 요청했다. 새 판정이 있을 수 있는 SUMMARY/REVIEW/마킹 원본을 읽지 않고 동결 items·candidate pool·원시JEV로 비교했다.
- Codex 잠정판정: JEV우위1(정보비대칭2), 인정가능7(동일경계3 포함), 명백열위0. 새 사용자 승인·독립 사람 심사·정확도 집계가 아니다. 근거: `docs/experiments/axis-candidate-jev-eight-2026-10-02/CODEX-INDEPENDENT-ADJUDICATION.md`, `codex-independent-adjudication.json`(동일 디렉터리).
- 이전 exact/F1은 사용자 경계 재현도다. 사람과exact한 후보 미생성5문단을 적절한 후보 미생성으로 해석하지 않는다. 이번 Codex는5문단 모두 대안 분할 인정가능 이상으로 보았다.
- 비교는 경계 기준이다. 도파민3 실제 축 문구의 “글루타메이트성 활성화”는 뉴런 종류와 입력물질 혼동 가능성을 별도 주석으로 남겼다. 사람 축 문장이 없어 분할 비교에 섞지 않았다.

## 결정된 것

- 새 정책/자산 채택 없음. 새 사용자 판정은 계속 미열람으로 유지.

## 변경한 것

- Codex 판정 문서·JSON 고정, 오른쪽 패널에 열었다. API0회·기존 문서/골드 유지.

## 미해결

- 새 사용자 판정과의 비교는 아직 수행하지 않았다. 질문 수준·유효 대안 허용 범위의 합의 필요.

## 다음 행동

- 사용자가 원하면 고정한 Codex 판정을 새 사용자 판정과 대조한다.

## 근거

- `docs/experiments/axis-candidate-jev-eight-2026-10-02/CODEX-INDEPENDENT-ADJUDICATION.md`
