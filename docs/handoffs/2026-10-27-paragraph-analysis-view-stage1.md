# 인계: 문단 분석 화면 1단계(`/dialogue/lab/analysis`)

- 날짜: 2026-10-27
- 작성: 코드 에이전트(Claude Code 메인 세션)
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0183-paragraph-analysis-ui-tree-and-relation-graphs.md`, `memory/decisions/D-0160-student-fingerprint-aggregation.md`

## 목표

개발자 주소 `/dialogue/lab/analysis`에서 지문·세션을 고르면 왼쪽에 지문 수형도(노드 밝기), 오른쪽에 관계 유형 그래프(누적·추이)가 보인다. 자료는 저장소에 있는 기존 판정 기록뿐이다. 외부 전송 없음.

## 범위 밖

- `/dialogue/lab`(`SimpleDialogueApp`)과 그 API·판정 흐름. 손대지 않는다.
- 새 판정·분류 실행, 외부 API 호출.
- `scripts/aggregate-student-fingerprint.mjs`·`scripts/run-relation-classify.mjs`·`scripts/run-analysis-judge-gongsun.mjs`의 동작 변경(가져다 쓰기만).
- 새 npm 의존성(차트·그래프 라이브러리 포함). 그림은 HTML/CSS 또는 손으로 쓴 SVG.
- 학생용 화면·문구, 문제 풀이 화면.

## 입력 자료

| 지문 | 지도 | 판정(rounds·judgments·combined) | 관계 유형 |
|---|---|---|---|
| 공손룡·도파민 | `docs/experiments/student-fingerprint-2026-10-21/config.json`의 각 항목 경로 그대로 | 같은 config | 같은 config의 `classifyPath` |
| 법인·정보 비대칭·mRNA·표면 장력 | `docs/experiments/analysis-gold-ui-2026-10-21/<지문 폴더>/frozen-map.json` | 없음(구조만) | `docs/experiments/analysis-gold-ui-2026-10-21/classify/<지문 폴더>/classify.json` |

- 지도: `propositions[{id,paragraphId,text,...}]`, `nodes[{id,kind,paragraphId,text,childIds}]`(kind: `COMPOSITE`·`PARAGRAPH_GIST`·`CROSS`·`TOP`), `relations[{id,fromId,toId,name,note}]`.
- combined 한 줄: `{dialogueId, roundIndex, paragraphId, nodes:{id:{label}}, relations:{id:{label, crossEndUnchecked}}}`. 라벨 `DIRECT`·`PARTIAL`·`ABSENT`·`CONTRADICTS`.
- rounds 한 줄: `{dialogueId, source, sessionId, paragraphId, roundIndex, dialogue:[{role,text}]}`.

## 손댈 파일과 계약

### 1. `scripts/build-analysis-view.mjs` (새 파일) + `scripts/build-analysis-view.test.mjs`

`node scripts/build-analysis-view.mjs --out docs/experiments/analysis-view-2026-10-27/view-data.json`로 화면 자료 JSON 하나를 만든다. 계산은 모두 여기서 하고 서버·화면은 그리기만 한다.

출력 계약:

```
{
  generatedFrom: [{ path, sha256 }],          // 읽은 입력 파일
  passages: [{
    passageId, title?,                         // title은 지도·기존 지문 JSON에서 얻을 수 있으면, 없으면 생략
    map: { propositions, nodes, relations },   // 동결 지도 그대로
    relationTypes: { [relId]: { type, typeKo, branch } },  // TYPE_KO·BRANCH_OF 사용
    paragraphIds: [...],                       // 지도 순서
    sessions: [ SessionView ]                  // 판정 없는 지문은 []
  }]
}
SessionView = {
  sessionId, source,
  judgedParagraphs: number, totalParagraphs: number, complete: boolean,
  tree: { [unitId]: { brightness: 'BRIGHT'|'HALF'|'DIM', computed: boolean, label?: 판정 라벨 } },
  graph: {                                     // 첫 차례
    branches: { [갈래]: { D,P,A,C,Cinherited, smallSample, capture, errorRate } },
    types:    { [유형]: { ...같음 } },
    trendPoint: { passageId, capture, errorRate, relationN },
    wrongRelations: [{ relId, paragraphId, dialogueId, studentText, fixedAfterDialogue: boolean }]
  }
}
```

규칙:

1. **세션 묶음**: rounds의 `sessionId`. 한 세션의 문단 판정은 같은 지문 안에서 모은다.
2. **수형도 차례(마지막)**: 문단마다 그 세션의 마지막 대화의 마지막 `roundIndex`를 쓴다. 같은 세션·문단에 대화가 여럿이면(`dialogueId` 끝의 `:<문단>:<n>`) `n`이 가장 큰 대화. 이 규칙으로 정할 수 없는 경우가 나오면 멈추고 보고한다.
3. **밝기**: 명제·합성·문단 요지 노드 `DIRECT`→`BRIGHT`, `PARTIAL`→`HALF`, `ABSENT`·`CONTRADICTS`→`DIM`. 판정 안 된 문단의 노드는 `DIM`이고 `label` 없음. 관계에도 같은 밝기를 준다.
4. **계산값(CROSS·TOP)**: `childIds`의 밝기가 모두 `BRIGHT`→`BRIGHT`, 모두 `HALF` 이상→`HALF`, 그 밖→`DIM`. `computed: true`. CROSS를 먼저, TOP을 나중에 계산한다.
5. **완료**: 지도의 모든 문단에 그 세션의 판정이 있으면 `complete: true`.
6. **그래프(첫 차례)**: `aggregate()`(`scripts/aggregate-student-fingerprint.mjs`)를 `groupBy: 'session'`으로 불러 해당 세션 묶음의 `views.first`를 그대로 쓴다. 숫자는 `docs/experiments/student-fingerprint-2026-10-21/by-session/`의 기존 결과와 같아야 한다. 문단을 넘는 관계 제외·물려받은 오류 처리도 `aggregate()`를 따른다(새로 구현하지 않는다).
7. **추이 점**: 세션의 그 지문 관계 전체(문단 안, 물려받은 오류 제외) 기준 `capture`·`errorRate`. 집계 방식은 `finishCell`과 같다.
8. **틀린 관계 목록**: 첫 차례에서 자체 `CONTRADICTS`인 관계(물려받은 오류 제외). `studentText`는 그 차례 rounds의 학생 발화를 이어 붙인 것. 같은 대화의 마지막 차례에서 그 관계가 `DIRECT`·`PARTIAL`이면 `fixedAfterDialogue: true`.

테스트(`node --test`): 작은 가짜 지도·판정으로 규칙 2~8을 각각 확인한다. 추이 점이 여러 개인 세션(가짜 자료 두 지문)도 포함한다. 실제 자료로 공손룡 `complete: true` 세션이 2개, 도파민 0개인지 확인한다.

### 2. 서버 `packages/app/src/server/index.ts`

- `GET /api/developer/dialogue-analysis/view`: 위 JSON 파일을 읽어 그대로 돌려준다. 파일 경로는 기본 `docs/experiments/analysis-view-2026-10-27/view-data.json`(저장소 루트 기준), 환경변수 `CSAT_ANALYSIS_VIEW_PATH`로 바꿀 수 있다. 파일이 없으면 404와 "분석 화면 자료가 없습니다. scripts/build-analysis-view.mjs를 먼저 실행하세요."
- 접근 규칙: `/api/developer/` 공통 개발자 모드 검사를 그대로 받고, 추가로 loopback 요청만 허용한다(공개 호스트 예외 없음). 아니면 404.
- 그 밖 메서드·경로는 404.

### 3. 클라이언트

- `packages/app/src/client/main.tsx`: `/dialogue/lab/analysis`면 새 `AnalysisViewApp`. `/dialogue` 일반 규칙보다 앞에 둔다.
- `packages/app/src/client/AnalysisViewApp.tsx`(새), `analysis-view.css`(새), 순수 계산이 생기면 `analysis-view-state.ts` + `.test.ts`(vitest).
- 화면:
  - 위: 지문 선택, 세션 선택. 세션 항목에 `judgedParagraphs/totalParagraphs`와 출처 표시, 완료 세션 먼저. 판정 없는 지문은 "구조만(판정 없음)".
  - 왼쪽 수형도: TOP 위, 아래로 CROSS·문단 요지·합성·명제 가지. 처음에는 TOP·CROSS·문단 요지까지 펼침, 노드 누르면 자식 펼치기/접기. 밝기 3단계를 색 진하기로. `computed` 노드에 "계산값" 표시, `complete`면 TOP에 "완료" 테두리. 노드를 고르면 옆 칸에 노드 문장, 그 노드에 걸린 문단 안 관계(유형 한글 이름·`name`·`note`·양 끝 문장)와 판정 라벨.
  - 오른쪽 그래프: (가) 갈래 4개(기타는 값이 있을 때만) 막대, 막대마다 잡은 개수(D+P)와 틀린 개수(C). 막대를 누르면 그 갈래의 유형별 막대가 펼쳐지고 `smallSample` 칸은 "아직 적음". (나) 추이: 세션 안 지문 순서대로 오류율 선, 포착률 흐린 보조선(점 하나면 점만). (다) 틀린 관계 목록: 관계 내용·학생 문장, `fixedAfterDialogue`면 "대화 뒤 고침".
  - 그래프 칸 머리에 "첫 차례 기준", 수형도 칸 머리에 "마지막 차례 기준"을 작게 적는다.

### 4. 자료 파일

`docs/experiments/analysis-view-2026-10-27/view-data.json`을 생성해 둔다(커밋 대상 여부는 메인 세션이 정한다).

## 완료 조건

- [ ] `node scripts/build-analysis-view.mjs --out docs/experiments/analysis-view-2026-10-27/view-data.json` 실행 성공, 6지문 포함, 공손룡 완료 세션 2·도파민 0.
- [ ] 그래프 숫자가 `aggregate()`의 같은 세션 `views.first`와 일치(테스트로 확인).
- [ ] `node --test scripts/build-analysis-view.test.mjs` 통과, 기존 `node --test scripts/aggregate-student-fingerprint.test.mjs scripts/run-analysis-*.test.mjs scripts/run-relation-classify.test.mjs` 통과 유지.
- [ ] `npm test`, `npm run typecheck`, `npm run typecheck:client` 통과.
- [ ] 서버를 개발자 모드로 띄워 `/dialogue/lab/analysis`에서 공손룡 완료 세션 하나·도파민 세션 하나·법인(구조만)을 열어 본 화면 캡처 또는 확인 기록을 남긴다(`docs/experiments/analysis-view-2026-10-27/`).
- [ ] `/dialogue/lab` 기존 동작 변화 없음(관련 테스트 통과).

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- `aggregate()`를 그대로 쓸 수 없어 집계 로직을 새로 써야 할 것 같으면 멈추고 보고한다.

## 결과 보고 (실행 후 작성)

- 변경 파일: 새로 `scripts/build-analysis-view.mjs`·`.test.mjs`, `packages/app/src/server/analysis-view.ts`·`analysis-view-http.test.ts`, `packages/app/src/client/AnalysisViewApp.tsx`·`analysis-view.css`·`analysis-view-state.ts`·`.test.ts`, `docs/experiments/analysis-view-2026-10-27/`(`view-data.json`, 캡처 3장). 수정 `packages/app/src/server/index.ts`(라우트 + import), `packages/app/src/client/main.tsx`(라우팅), `packages/app/src/boundary.test.ts`(REPOSITORIES에 `server/analysis-view.ts` 한 줄).
- 테스트 결과: `node --test scripts/build-analysis-view.test.mjs` 9/9. 기존 scripts 테스트 포함 83/83 통과. vitest 신규 10건 통과(client state 8, server http 2). `npm run typecheck`·`typecheck:client` 통과. `npm test`는 2건 실패, 둘 다 이번 변경 전부터의 실패(`boundary.test.ts`의 `server/student-state.ts` node:fs import, `axis-architecture-experiment.test.ts`의 `.omc/adhoc` 파일 없음).
- 실제 자료: 6지문, 세션 53(공손룡 31·도파민 22), 공손룡 완료 세션 2, 도파민 0. 그래프 숫자는 by-session 기존 결과와 전 세션 일치.
- 인계와 다르게 한 점: (1) 서버의 파일 읽기를 `index.ts`가 아니라 새 `server/analysis-view.ts`로 분리하고 `boundary.test.ts`의 REPOSITORIES(파일시스템 허용 목록)에 추가했다. D4 경계 테스트 때문. (2) 지문 `title`은 지도·기존 지문 JSON에서 얻을 수 없어 생략(지문 id로 표시). (3) 서버 응답은 기본 경로를 `process.cwd()` 기준으로 읽는다.
- 남은 문제: 경계 테스트의 `student-state.ts` 기존 실패. 틀린 관계 목록은 공손룡 두 세션(R6·R7)만 나옴(R1은 첫 차례가 아님). Playwright 번들 브라우저가 없어 설치된 Chrome(`channel: 'chrome'`)으로 캡처.
