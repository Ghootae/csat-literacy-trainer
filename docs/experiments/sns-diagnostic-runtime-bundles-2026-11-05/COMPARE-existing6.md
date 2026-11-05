# 기존 6문항 재생성 대 손 작성본 비교 (2026-11-05)

- 재생성: `node scripts/build-runtime-bundles.mjs --config docs/experiments/sns-diagnostic-runtime-bundles-2026-11-05/config-existing6.json --out docs/experiments/sns-diagnostic-runtime-bundles-2026-11-05/existing6/` (표지 이슈 0건)
- 비교 기준: `packages/pipeline/fixtures/experiments/problem-solving/public/*.json`, `source-direct-runtime-v1.json`, `dialogue/passages/*.json`. `officialExplanation`은 비교 제외(방안 ㄱ으로 새로 구성).
- 결과 요약: stem, choices, questionNumber, title, exam, 극성, 정답은 6문항 모두 같다. passage는 2문항(corporate-law, mrna)에서 공백을 넘어 다르다(원인 아래). scenario는 gongsun에서 다르다. 이 때문에 세트 E 생성 전에 멈췄다.

## 칸별 비교

| 칸 | corporate-law-q13 | dopamine-motor-control-q13 | information-asymmetry-q13 | surface-tension-laplace-q16 | mrna-vaccine-q19 | gongsun-q12 |
|---|---|---|---|---|---|---|
| stem | 같음 | 같음 | 같음 | 같음 | 같음 | 같음 |
| choices(5개) | 같음 | 같음 | 같음 | 같음 | 같음 | 같음 |
| passage | 다름(A) | 같음 | 같음 | 같음 | 다름(B) | 같음 |
| scenario | 같음 | 같음 | 같음 | 같음 | 공백만 다름(개행 대 띄어쓰기) | 다름(C) |
| media(형식·크기·placement) | 같음(없음) | 같음(없음) | 같음(없음) | 같음(없음) | 같음, url·mimeType·크기·placement 같음, alt는 DB 값 null(손 작성본은 직접 쓴 문장), `contentHash`(DB sha256) 추가 | 같음(없음) |
| textAnnotations | 2 대 2 같음 | 5 대 2 (다름 D) | 4 대 4 같음 | 6 대 6 같음 | 6 대 6, 2건 오프셋 +1 (B 때문) | 6 대 6, 5건 오프셋 다름(C 때문) |
| stemPolarity | SELECT_INCORRECT 일치 | 일치 | 일치 | SELECT_CORRECT 일치 | 일치 | 일치 |
| answerChoiceId | C2 일치 | C2 일치 | C5 일치 | C3 일치 | C5 일치 | C4 일치 |
| passage 파일 문단 text·id·position | 같음 | 같음 | 같음 | 같음 | 5번째 문단 다름(B) | 같음 |

## 다른 칸의 원인

- A. corporate-law passage: 재생성본은 DB 문단 중 각주 2개("* 정관: …", "* 액면가: …")를 passage 끝에 붙인다. 손 작성본 passage에는 각주가 없고(dialogue 지문 파일의 notes에만 있음) mRNA 손 작성본에는 각주가 passage에 들어 있어 손 작성본끼리도 일관되지 않다. 스크립트는 DB 문단을 전부 잇는 규칙이다.
- B. mrna passage: DB 원문은 "pH*에"(각주 별표가 본문에 붙음)이고 손 작성본은 별표를 지웠다. 각주 문단도 DB는 "* pH : 수용액…"(콜론 앞 공백)이고 손 작성본은 "* pH: 수용액…"이다. 이 때문에 passage 길이가 1847 대 1849이고 ⓓ·㉡ 오프셋이 +1 이동한다(범위 문자열은 일치).
- C. gongsun scenario: 손 작성본은 DB 보기에 없는 ⓐ~ⓔ 문자와 홑따옴표(‘ ’)를 직접 넣었다(손 작성본 notes에 "밑줄 표시는 … 복원" 기록). DB 보기 원문에는 두 가지 모두 없고 기호 범위만 elements에 있다. 재생성본은 DB 원문 그대로이고 범위가 원문 문자열과 일치한다. 길이 159 대 146, 주석 5건 오프셋이 다르다.
- D. dopamine 주석: 손 작성본에는 `scripts/audit-problem-source-markers.mjs`가 보기의 문단 라벨 (가)(나)(다)를 별도로 추가한 주석 3건이 있다. DB의 기호(symbol) 요소에는 없는 항목이라 재생성본에는 없다(2건은 같음).
- 부가: 손 작성본 dialogue passage 문단에는 `goldPath` 필드가 있고 재생성본에는 없다(원자료에 없는 필드). mrna questionRange는 손 작성본 "19", 재생성본 DB 값 "16~20". gongsun notes는 손 작성본의 수동 설명 2줄 대신 "연결 문항 전체" 한 줄이다.

## 기호 표지 대조

- `scripts/audit-problem-source-markers.mjs`는 입력이 고정 경로(`packages/pipeline/fixtures/experiments/**`)이고 출력 폴더를 받지 않아 재생성본에 적용하지 못한다.
- 대신 같은 대조(`원문.slice(start, end) === text`)를 `scripts/build-runtime-bundles.test.mjs`에 넣었고, 재생성본 전체 26개 주석에 직접 돌려 불일치 0건을 확인했다. 빌드 중 DB 범위 문자열 불일치 이슈도 0건이다.

(media 갱신: 코드 에이전트 결정에 따라 url은 DB `source_url`, `contentHash`는 DB `sha256`로 다시 생성했다. 이슈 0건.)

판정: DB 원문 정본(코드 에이전트, 2026-11-05)
