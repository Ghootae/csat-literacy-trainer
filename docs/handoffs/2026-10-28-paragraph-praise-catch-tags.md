# 인계: 문단 요약 통과 피드백 — 상자 제목과 핵심 내용별 '바로/질문 후 캐치' 꼬리표

- 날짜: 2026-10-28
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet). 외부 API 호출 없음.
- 사용자 요청(2026-10-28, 그림): 통과(PRAISE) 말풍선의 핵심 내용 상자 맨 위에 "내가 파악한 문단의 핵심 내용", 각 항목 오른쪽 끝에 "(질문 후 캐치)" 또는 "(바로 캐치)".
- 앞 작업: [말풍선 운영 규칙](./2026-10-28-bubble-pacing-rules.md) 3단계(PRAISE = 코드 칭찬 한 문장 + 상자).

## 목표

`/dialogue/lab`의 PRAISE 말풍선(모든 단계)이 다음처럼 보인다.

```text
피드백
핵심 내용을 정확하게 잡아냈어! 잘했어~          ← 지금 그대로(칭찬 문장 세트)
┌ 내가 파악한 문단의 핵심 내용 ───────────────┐
│ 1. …핵심 내용 1…                (질문 후 캐치) │
│ 2. …핵심 내용 2…                  (바로 캐치) │
└──────────────────────────────────────────┘
```

## 꼬리표 규칙 (서버가 정한다)

- 현재 시도(attempt)의 단계 기록 `p.steps`를 순서대로 보며, 각 핵심 부분 i가 `output.corePartsCovered[i] === true`가 된 첫 단계의 `stage`를 찾는다.
  - 그 단계가 `INITIAL` 또는 `RETRY`(학생이 직접 쓴 요약) → `(바로 캐치)`
  - `AFTER_GAP` 또는 `AFTER_CORRECTION`(질문에 답한 단계) → `(질문 후 캐치)`
- PRAISE는 모든 부분이 덮인 상태라 모든 항목에 꼬리표가 붙는다. 어떤 부분이 어느 단계에서도 true가 아닌 이상한 기록이면 꼬리표를 비운다(오류를 내지 않는다).
- 판정·지시문·스키마·상태 기계(`packages/pipeline`)는 바꾸지 않는다.

## 손댈 곳

- `packages/app/src/shared/dialogue-simple.ts` `SimpleMessageView`: 상자 제목 `partsTitle?: string`, 항목별 꼬리표 `partTags?: string[]`(parts와 같은 길이) 추가.
- `packages/app/src/server/dialogue-simple.ts` `tutorMessages`: PRAISE일 때만 `partsTitle: '내가 파악한 문단의 핵심 내용'`, `partTags`를 위 규칙으로 채운다. 판정 직후 그 단계 출력도 포함해 계산한다(지금 단계가 `p.steps`에 들어간 뒤인지 확인). 다른 action(CLOSE_GAP·CLOSE_ERRORS·CLOSE_NO_RESPONSE)의 상자는 바꾸지 않는다.
- `packages/app/src/client/SimpleDialogueApp.tsx`(`SimpleBubble`)와 CSS: 상자 안 맨 위 제목(작은 글씨, 상자 안), 항목 오른쪽 끝 꼬리표(작은 흐린 글씨, 좁은 화면에서는 항목 아래로 줄바꿈 가능). 숫자 목록 모양은 지금 그대로.
- 저장된 옛 세션 메시지에는 두 칸이 없으므로, 없으면 지금처럼 그린다.

## 완료 조건

- [ ] 단위 테스트(`dialogue-simple.test.ts`): INITIAL에서 바로 통과 → 모두 '(바로 캐치)'; INITIAL에서 일부만 덮고 AFTER_GAP에서 나머지 → 섞여 나옴; RETRY 뒤 통과 → '(바로 캐치)'; AFTER_CORRECTION 통과 → 그 단계에서 처음 덮인 부분만 '(질문 후 캐치)'; CLOSE_* 상자에는 제목·꼬리표 없음.
- [ ] 문단 e2e(`packages/app/e2e/paragraph-bubble-pacing.spec.ts` 또는 새 시험, 포트 5395/5396)에서 상자 제목과 꼬리표가 보인다.
- [ ] `npm run build` 통과, `npm test`는 기존 실패 2건만.
- [ ] 1600×1000 캡처 `docs/handoffs/2026-10-28-paragraph-praise-catch-tags.png`(질문 후 통과 경우, 꼬리표가 섞여 보이게).
- [ ] 다른 작업자가 `packages/app/e2e/problem-lab-workbench.spec.ts`를 고치는 중이다. 그 파일과 문제 화면 코드는 건드리지 않는다. git 쓰기 명령 금지.

## 결과 (실행 후 작성)

### 바뀐 파일
- `packages/app/src/shared/dialogue-simple.ts`: `partsTitle?`, `partTags?` 추가.
- `packages/app/src/server/dialogue-simple.ts`: `catchTags()` 추가, PRAISE에서만 제목·꼬리표 채움(`tutorMessages`가 `p.steps`를 받음; 현재 단계는 push된 뒤 호출되어 포함됨).
- `packages/app/src/client/SimpleDialogueDrawer.tsx`(`SimpleBubble`), `simple-dialogue.css`: 상자 제목, 항목 오른쪽 꼬리표(좁으면 줄바꿈). 꼬리표가 있을 때만 CSS 카운터로 번호를 그려 모양 유지.
- `packages/app/src/server/dialogue-simple.test.ts`: 기존 PRAISE 기대값 갱신 + 꼬리표 시험 2개 추가.
- `packages/app/e2e/paragraph-bubble-pacing.spec.ts`(li 기대값에 꼬리표 반영), 새 `packages/app/e2e/paragraph-praise-catch-tags.spec.ts`.

### 시험
- `npm run build` 통과. `npm test` 1466 통과, 기존 실패 2건만(boundary.test, axis-architecture-experiment.test).
- e2e(포트 5395/5396) paragraph-* 4건 통과.
- 캡처: `docs/handoffs/2026-10-28-paragraph-praise-catch-tags.png` (1600x1000, 질문 후 통과, 꼬리표 섞임).

### 문서와 달리 판단한 점
- 컴포넌트는 `SimpleDialogueApp.tsx`가 아니라 `SimpleDialogueDrawer.tsx`에 있어 거기를 고침.
- "이상한 기록이면 꼬리표 비움"은 코드에 방어로 넣었으나, 판정 검증이 그런 출력을 막아 단위·e2e로는 도달 불가라 시험은 뺌.
- 꼬리표가 비면 제목은 남기고 번호 목록만 기존 모양으로 그림.
