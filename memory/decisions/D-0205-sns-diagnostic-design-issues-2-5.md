---
id: D-0205
status: accepted
date: 2026-11-06
scope: sns-diagnostic-mode
supersedes: none
---

# SNS 진단평가 설계: 사고 진단 대상, 로컬 시범, 결과 화면 한 페이지 배치

## 결정

`docs/SNS-DIAGNOSTIC-DESIGN-DRAFT-2026-11-06.md` 1절 문제점 2~5의 논의 결과다(문제점 1은
[D-0204](./D-0204-sns-diagnostic-keeps-service-feedback.md)).

1. **사고 진단 대상(문제점 2, 사용자 선택 (나)).** 사고 진단 v0.1([D-0111](./D-0111-thought-diagnosis-v0-experiment.md))은
   첫 응답이 오답인 문항과 근거 판정이 `SUPPORTED`가 아닌 정답에만 돌린다. `SUPPORTED` 정답과 근거 생략 문항은 돌리지 않는다.
   스크립트의 지시문·스키마를 바꾸지 않고 파이프라인 모듈로 옮긴다.
2. **문단 판정(문제점 2, 결정 질문 없음).** 첫 차례가 들어오면 바로 노드마다 판정을 시작한다. 결과 화면 ③에만 쓰고,
   못 끝난 칸은 "분석 중"으로 둔다.
3. **지문당 여러 문항(문제점 3, 결정 질문 없음).** 공용 읽기 함수와 `problemQuestionId`는 고치지 않는다. 세트 목록 파일과
   컨트롤러에 넣는 읽기 함수로 처리한다.
4. **저장(문제점 4, 사용자 선택 (가)).** 이번 단계는 로컬 시연·소규모 시범이다. 참가자별 JSON 파일과 사건 기록에 저장하고,
   저장 부분은 인터페이스로 감싼다. 공개 배포용 저장소는 개인정보 조건과 함께 정한다.
5. **결과 화면(문제점 5, 사용자 "일단은 이 안으로 진행하자").** 한 페이지를 위에서 아래로 읽는다: ① 내 위치 → ② 문제 풀이
   결과 → ③ 독해 패턴 → 추천. 지문 끝 중간 화면을 따로 둔다. 샘플: https://claude.ai/artifact/923cWFBgxxuSS2evZ8SLVX
   (비공개 웹 캔버스, 참가자 풀이는 가상).
6. **공유 기능은 열린 항목.** 결과 공유(위치 카드 이미지·링크)와 PC로 이어 하기 링크는 공개 배포 때 개인정보와 함께 정한다.

## 근거

- 사용자 답(2026-11-06): 사고 진단 "나로 동의", 저장 "(가)로 동의", 결과 화면 샘플을 본 뒤 "일단은 이 안으로 진행하자".
- 코드 확인(2026-11-06): 사고 진단 입력이 세트 E 묶음과 같은 형식(`docs/experiments/thought-diagnosis-v01-2026-10-10/sources.json`),
  문단 판정은 노드마다 1회(`scripts/run-analysis-judge-gongsun.mjs:219`), 컨트롤러 주입점(`packages/app/src/server/problem-feedback.ts:59`,
  `packages/app/src/server/dialogue-simple.ts:72`), 요약 대화는 골드를 읽지 않음(`dialogue-simple.ts:55`).

## 다시 볼 조건

- 실제 참가자 근거에서 `SUPPORTED` 정답의 근거 오류가 자주 보이면 사고 진단 대상을 넓힌다.
- 공개 배포를 정할 때 저장소와 공유 기능을 함께 다시 정한다.
