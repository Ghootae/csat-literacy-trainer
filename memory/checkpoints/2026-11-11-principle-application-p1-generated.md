---
date: 2026-11-11
scope: principle-application-item-generation
base_commit: uncommitted
---

# P1 생성 완료(7문항), E1 4지문 구조 판정·풀이 검증 실행 중에 사용 한도로 중단

## 된 것
- 결정: D-0220(원리 적용형은 유형 하나), D-0223(기준표 v1.1), D-0224(v1.2·방향 키·범위 집계), D-0227(RULES v2·관문 a만·재사용·시간 한도 5분).
- 보고: `docs/experiments/principle-application-structure-2026-11-09/REPORT-judge-v1.1-{desktop,human}.md`. 웹 검토: `docs/handoffs/2026-11-10-judge-v1.1-review-web.md`.
- P1 실행
  - 1차 `runs/`: 관문 정지, $0.11
  - 2차 `runs-v2/`: 연결 오류, 장부 $0.34
  - 3차 `runs-v2b/`: 13요청 모두 성공, $0.26, 재사용 5. 오디오 a는 열린 자리 없음.
- 생성 문항 7개. 코드 위반 4건이다.
  - 발문 끝 2건: 법인 a, 표면 장력 a
  - 정답 길이 2건: 오디오 b, 표면 장력 b
- 기출 겹침 표시 0건(`quality/exam-overlap-v2b.json`).
- 판정 묶음을 `--include-p1 --p1-runs runs-v2b`로 다시 만들었다. 개발자 4지문 파일은 바뀌지 않았다.

## 실행 중이던 것 (결과 파일이 있는지 먼저 확인)
- 구조 판정 v1.2, E1 4지문 × j1·j2 → `judge/out-v1.2/{j1,j2}/`
- 풀이 검증 → `principle-application-pilot-2026-11-09/quality/solve/<지문>.json`
- 파일이 없거나 깨진 것만 같은 지시로 다시 돌린다(지시문은 대화 기록의 판정자 호출 형식: JUDGE-INSTRUCTIONS-v1.2 / SOLVE-PROMPT-v1).

## 다음
1. 판정·풀이 결과 집계
   - P1 통과 조건 (가)~(다)
   - 기출 주 지표: 엄격·관대·실행 간 범위
2. 사용자 "깊다" 판정(라)을 위한 비교표
3. 두 형식 보고서, 커밋 제안

## 갱신 (재개 뒤)

- 판정과 풀이 결과 12개는 완성돼 있었다. 하위 에이전트는 파일 저장 뒤 한도 오류로 끝났다.
- P1 7/7이 (가)~(다)를 통과했다(두 판정자 모두).
  - E1 v3는 APPLIED 0/100이다.
  - 기출 주 지표는 9~10/31(〈보기〉 7/10, 〈보기〉 없음 2~3/21)이다.
- 방향 키 오검출을 고쳤다. "1,000원인"이 '원인'으로 걸렸다.
- 보고: `docs/experiments/principle-application-pilot-2026-11-09/REPORT-p1-{desktop,human}.md`
- 다음: (라) 사용자 "깊다" 판정, 계산형 수렴과 a 수치 허용 논의, 커밋.
