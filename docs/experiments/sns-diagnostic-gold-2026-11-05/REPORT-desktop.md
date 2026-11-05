# SNS 진단 세트 E 자료 만들기: Desktop 보고서

## 실행 조건
- 세트: D-0201 세트 E. 절차: `docs/SNS-DIAGNOSTIC-SET-PROCEDURE-2026-11-05.md`(③′→③→④), 인계 `docs/handoffs/2026-11-05-sns-diagnostic-runtime-bundles.md`, `docs/handoffs/2026-11-05-sns-diagnostic-set-e-gold.md`.
- 모델 `gpt-6.1-sol` medium. 지시문: MAP-PROMPT-v2, STANCE-PROMPT-v2, CLASSIFY-PROMPT-v3, CHOICE-LINK-PROMPT-v5(모두 무수정, 해시 불변).
- 승인: "세트 E의 외부 전송 승인(순서대로)"(32요청·$6.5), 추가 "3요청 재전송 승인".

## 측정

| 단계 | 요청 | 성공 | 비용 | 검증 |
|---|---|---|---|---|
| ③′ 원자료 묶음 | 0 | - | 0 | 테스트 8 통과, 기호 주석 71 범위=원문, 정답 16/16 메가스터디 일치 |
| ③ 지도 | 12 | 12 | $1.1381 | 12회 모두 6/6 |
| ③ 입장 | 4 | 4 | $0.1279 | 4/4 3항목 통과 |
| ③ 관계 유형 | 4 | 4 | $0.1725 | 통과, 기타 1/120("설명 대상", ga) |
| ④ 선지 연결 | 12+3 | 9+3 | $1.3586+$0.2839 | 성공분 전부 통과. 실패 3: plastic r3 시간 초과(예약 $0.3145 청구 처리), audio·horse r3 연결 오류 |

- 지도 동결(`*/FROZEN.md`, 비교 `FREEZE-REVIEW.md` opus 독립 검토 + 코드 에이전트 확인): ga r3, na r1, plastic r3(근소, 진단 해상도), audio r1(근소, 다수안). 다수안 없는 문단 ga 1/4, na 0/4, plastic 2/5, audio 1/5.
- 입장 덮어쓰기: ga P4-4 FIGURE(로랜즈)→AUTHOR("예를 들어" 예시, 점검표 7). 1/34. na·plastic·audio 0.
- 선지 연결 동결 `choice-link/frozen-3runs/`: 80선지, 위반 0, 미결 0, DIFFER 1. decidedBy: cc FIRST 12/UNANIMOUS 13, plastic U 8/F 7, audio U 16/F 4, horse U 15/F 5. 2회차 잠정(`choice-link/frozen/`)은 미결 4·DIFFER 2였음.

## 해석
- DIFFER cc q15 ①: 3회 모두 ADDED_CONTENT. EBSi는 객관주의 입장 귀속으로 설명하나 원문 (나)에 해당 서술 없음. 진리값 일치, 이유만 차이 → 덮어쓰지 않음.
- 잠정 DIFFER audio q17 ④(해설은 A·C 주파수로 폭 대소 단정, 원문 기준은 차폐음 주파수)는 3회 동결에서 사라짐.
- 비틂 분포: cc NEGATION 11/19 쏠림. 대조 문장 많은 인문 지문 특성. 결과 화면 경향 집계 시 지문 효과로 섞일 위험.

## 정정·운영 메모
- 그림 〈보기〉 전사 누락(audio q17): 실험 전용 `supplement-fixed.json`(원본 4 + 1). ⑤/절차 문서에 "그림 〈보기〉 전사 확인"을 ③′ 확인 항목으로 넣을 것 제안.
- `run-choice-link.mjs --round`는 전 키 재전송 → 부분 재전송은 대상 파일 분리. `freeze-choice-link.mjs`는 `r<n>`만 읽음 → `runs-final/`(복사, `SOURCES.txt`). 스크립트 수정은 안 함.

## 열린 질문
- 결과 화면 "걸린 비틂" 집계에서 지문별 비틂 분포 쏠림을 보정할지(⑥ 설계).
- Q-0042(선택률 이용 범위·보정 방법).

## 파일
`docs/experiments/sns-diagnostic-gold-2026-11-05/`(passages, 지도 폴더 4, classify/, choice-link/{runs,runs-final,frozen,frozen-3runs,FROZEN.md}, targets*.json, supplement-fixed.json, FREEZE-REVIEW.md), `packages/pipeline/fixtures/experiments/sns-diagnostic/`, `scripts/build-runtime-bundles.mjs`(+test), `docs/experiments/sns-diagnostic-runtime-bundles-2026-11-05/`.
