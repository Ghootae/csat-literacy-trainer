---
date: 2026-11-26
scope: result-screen-fixture
base_commit: d808e038f7351e327b6c1e7cf7f73ee04a0db93f
---

# 최종 결과 화면 검토용 가상 학생 자료에 맨 위 읽기 습관(1층) 채움

## 새로 확인된 것

- 고정 세션 `a5a1f4b3-…`(`sessions/diagnostic/`, git 무시 폴더)는 16문항·문단 요약·근거·오답 카드까지 완주 자료인데, 읽기 습관이 `READY`·`shown: null`(생성 NONE)이고 `promptVersion` 필드가 없어 결과를 열면 현행 지시문(v2.5)으로 다시 생성하는 상태였다.
- 이 세션의 근거 오독 세 곳(경마 6·플라스틱 8·오디오 16번)은 근거 문장을 고치지 않고도 "비교·정도를 정하는 말을 거꾸로 읽거나 지움"으로 묶인다.

## 결정된 것

- 사용자 지시(2026-11-26): 앞으로 최종 결과 분석 화면 검토는 이 가상 학생 자료 기준으로 한다. 새 학생을 만들지 않고 a5a1f4b3을 고쳐 쓴다. 읽기 습관 자료는 모델 호출 없이 손으로 써서 저장한다.

## 변경한 것

- `readingHabit`만 교체: `PATTERN`(THREE_PLUS), 대표 사례 오디오 16번(지문 문장), 다른 사례 플라스틱 8번·경마 6번, 둘째 습관 없음(null), `promptVersion: v2.5`, 입력 해시는 실제 `buildHabitInput`·`jsonHash`로 계산. 근거·판정·사고 진단·오답 카드는 그대로.
- 검증: 실제 컨트롤러로 결과를 열어 `readingHabit.status = ready`, 모델 호출 0회, 오답 카드 해시 불일치 없음. 원본 백업은 세션 스크래치패드에만 있다.
- 한계: 이 자료는 직접 쓴 것이라 실제 모델 출력과 문구가 다를 수 있다. 둘째 습관 줄은 이 자료로 볼 수 없다.

## 미해결

- 지시문 버전이 바뀌면 입력 해시·`promptVersion` 불일치로 다시 생성된다(오답 카드 v1.4도 같은 규칙).

## 다음 행동

- 결과 화면 검토 때 이 세션으로 맨 위 읽기 습관 상자를 확인한다.

## 근거

- `packages/app/src/server/diagnostic/reading-habit.ts`(`buildHabitInput`, `checkHabit`)
- `packages/app/src/server/diagnostic/controller.ts`(`readingHabit`)
- `docs/experiments/reading-error-2026-11-18/PROMPT-v2.5.md`
