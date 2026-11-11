# 문항 재생성 방향 검토 — 웹 에이전트 논의용

날짜: 2026-11-11. 실행 주체: Codex 메인 에이전트 및 산출물 검토 하위 에이전트. 기존 opus 판정 재실행이 아니라 저장 자료를 읽은 방향 검토다. 코드·프롬프트·기존 결과는 변경하지 않았고 외부 생성 호출도 없다.

## 측정과 관측

- `docs/experiments/principle-application-pilot-2026-11-09/runs-v2b/`: item-a/b 총 7개. 계획 8개 중 audio-perceptual-coding/a 미생성.
- `quality/solve/`의 4개 JSON: 7문항 모두 verdict OK, chosen과 생성 answer 일치, bogiIssues 빈 배열, outsideKnowledge NONE. 단 notes의 해석 전제를 별도 검토해야 한다.
- `docs/experiments/principle-application-structure-2026-11-09/judge/out-v1.2/{j1,j2}/`: 판정자별 E1 대상 4개 파일 존재. 하위 에이전트가 저장 결과와 키를 대조한 P1 결과는 다음과 같다.

| 항목 | 저장 결과 |
|---|---|
| 판정자 j1 APPLIED(상황에 원리 적용) | 35/35선지 |
| 판정자 j2 APPLIED | 34/35선지; 법인 a③만 STATED(직접 확인) |
| onItemSituation(문항 상황에 대한 진술) | 두 판정자 전부 true |
| P1 조건 (가)~(다) | 저장 판정상 7/7 |
| 사용자 깊이 조건 (라) | 이번 검토로 대체하지 않음 |
| 자동 코드 위반 | 발문 끝 2건, 정답 유일 최장 2건 |
| 자동 기출 겹침 표시 | 0; 의미 독립성 검증 아님 |

이는 새 판정이나 최종 성공률이 아니다. 계획 분모 8과 생성분모 7을 구별한다.

## 해석·사례

1. 방향은 타당: D-0210의 E1 종료, D-0220의 ‘유형 하나’ 제한, D-0215의 단계별 생성과 별도 풀이 검증을 지지한다. E1 결과의 ‘골드 이점 없음’은 해당 표본·설정에서 관찰되지 않았다는 뜻으로 한정한다.
2. 깊이의 대리지표 한계: `runs-v2b/plastic-polymerization/item-b.json`은 보기 25%/55%의 순서와 물성 방향을 적용한다. APPLIED 5개여도 필요한 연결의 깊이가 크다는 증거는 아니다. 가장 쉬운 정답 도달 경로를 보조 검토하자는 제안이다.
3. 의미 겹침: `runs-v2b/corporate-law/item-a.json`, `item-b.json`은 무상증자→자본금 증가를 수치화한다. D-0227 자체가 기출 12①과 같은 열린 자리임을 명시한다. `quality/exam-overlap-v2b.json`도 해당 기출 선지를 보존한다. `scripts/check-exam-overlap.mjs`는 문자 2-gram Dice로 선지 0.6·상황 0.5 이상만 표시한다. 기호의 지시 대상을 해석하는 의미 비교가 아니다. 자동 표시 0과 기출 재현 없음은 구분해야 한다.
4. a/b 해석: `runs-v2b/surface-tension-laplace/item-a.json`은 발문에 새 압력·장력 조건, 법인 a는 새 주식·금액 조건을 넣었다. 보기 유무, 소재 출처, 조건 출처를 분리해야 기존/새 상황 비교를 과장하지 않는다. 현행 위반 확정은 아니다.
5. 남은 해석 전제: `quality/solve/surface-tension-laplace.json`의 b 주석은 C=2.0의 원인이 주어지지 않아 범위 초과 일반에 결과를 적용하는 읽기를 전제한다. OK만 집계하면 이 경계가 사라진다. 사람 원문 검토 대상으로 남긴다.
6. 형식 경고: 법인 a·표면 장력 a는 물음 뒤 단서 때문에 endsWith 검사 실패. 오디오 b·표면 장력 b의 유일 최장 정답과 위험 성격이 다르다.

## 제안과 열린 판단

기존 P1 기준과 5/8 문턱은 소급 변경하지 않는다. 저장된 (가)~(다)와 별도로 의미 중복·최소 필요 추론·검토 주석을 함께 제시하고 사용자 (라) 판단을 받는다. 그 뒤 프롬프트·기준을 고정한 새 지문 검증을 권한다. 표본을 보며 계속 기준을 고친 동일 4지문 반복은 개발 근거이며 일반화 검증과 분리한다. 대량 생성·다른 유형 확대는 그 뒤다. 어느 제안도 새 채택 결정으로 기록하지 않았다.

## 근거

- `memory/decisions/D-0210-close-e1-hold-e2.md`
- `memory/decisions/D-0215-principle-application-structure-review-and-pilot.md`
- `memory/decisions/D-0220-principle-application-is-one-type-of-many.md`
- `memory/decisions/D-0224-judge-structure-v1-2-and-aggregation.md`
- `memory/decisions/D-0227-p1-rules-v2-gate-in-passage-only.md`
- `docs/experiments/gold-item-generation-2026-11-06/REPORT-v3-human.md`
- `docs/experiments/principle-application-pilot-2026-11-09/{SITUATION-PROMPT-v1,WRITE-PROMPT-v1,SOLVE-PROMPT-v1}.md`

## 기록 정합성

`memory/WORK_TREE.md`는 P1을 준비 완료·전송 대기로 표기하지만, CURRENT_STATE와 11-11 체크포인트 및 runs-v2b는 생성 완료를 보여 준다. 최신 실행 파일과 체크포인트를 기준으로 검토했다. 이 보고서에서는 기존 작업 갈래의 정책·다음 단계 자체를 재결정하지 않는다.
