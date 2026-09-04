# 볼록렌즈 Source Bundle 수직 실험 — 체크포인트 2

## 현재 상태

- 구현 및 오프라인 준비 완료
- OpenAI API 호출: **0회**
- 기존 지문 골드·문제 골드·24문항 후보: 변경 없음
- 원자료, 이미지, 프롬프트는 SHA-256으로 잠금
- 정답 키·해설·사람 평가 기준은 Source 단계 입력과 다른 디렉터리에 격리

이 체크포인트는 Source 전처리 생산선만 실행 가능하게 만든다. Source Bundle을 실제로
동결한 뒤 수행할 해설 감사, 지문 골드, 문제 골드, B3, C0/C1은 실행 계획에 남겨 두었고
아직 호출하지 않는다. 잘못된 Source Bundle 위에서 후속 골드를 생성하지 않기 위해서다.

## 입력 분리

| packet | 포함 | 제외 |
|---|---|---|
| PASSAGE | 4개 지문 문단 | 발문, 보기, 그림, 선지, 정답, 해설 |
| ITEM | 발문, 보기 텍스트, 787×481 실제 그림 | 선지, 정답, 해설, 지문 |
| OPTIONS | 선지 원문, 동결 PASSAGE·ITEM 해시 | 정답, 해설, 참·거짓 판정 |

원자료에서 `result.image_urls`에도 같은 이미지 URL이 중복되지만 `passage_elements`에는
이미지가 없고 문항 보기의 element에 배치되어 있다. 따라서 이 실험에서는 해당 이미지를
PASSAGE가 아니라 ITEM packet의 `SCENARIO_VISUAL`로 한 번만 분류한다.

Source 단계의 `visualRequiredForSourceUnderstanding`는 이미지를 빼면 보기의 명시 사실이
손실되는지를 뜻한다. 선지 판정에 실제로 필수인지 나타내는 `visualRequiredForSolving`은
선지를 보지 않은 이 단계에서 결정하지 않고 `UNASSESSED`로 둔다. 최종
`VISUAL_REQUIRED`는 동결된 선지 원자화와 Item Inference 이후에 판정한다.

## 실행 구조

```text
원자료·이미지 해시 검증
  ├─ PASSAGE 생성 3회 (Terra/medium)
  │    ├─ 후보 비공개 독립 판독 1회 + 세 후보 배치 비교 1회 (Terra/medium)
  │    └─ 후보 비공개 독립 판독 1회 + 세 후보 배치 비교 1회 (Terra/high)
  │         └─ 3/3 의미 일치·두 감사 모두 PASS일 때만 동결
  ├─ ITEM 생성 1회 (Terra/medium)
  │    ├─ 후보 비공개 독립 판독 1회 + 비교 1회 (Terra/medium)
  │    └─ 후보 비공개 독립 판독 1회 + 비교 1회 (Terra/high)
  ├─ OPTIONS 원자화 1회 (Terra/medium)
  │    ├─ 후보 비공개 독립 원자화 1회 + 비교 1회 (Terra/medium)
  │    └─ 후보 비공개 독립 원자화 1회 + 비교 1회 (Terra/high)
  └─ 의도적 의미 변이 5종 × 두 감사 설정별 비교 1회
       └─ 10/10 REJECT 필요
```

감사의 독립 판독과 후보 비교는 같은 대화의 두 턴이 아니다. 서로 별도 Responses API
호출이며 둘 다 `store:false`, `previous_response_id:null`이다. 첫 호출에는 후보 artifact가
들어가지 않는다.

## 변이 검사

1. `P0 = 0.5 × P2`를 `P2 = 0.5 × P0`로 방향 반전
2. `P4는 광축 위`를 광축 밖으로 위치 반전
3. 거리의 제곱 비례를 단순 비례로 변경
4. `E가 C와 D 사이`를 구간 밖으로 변경
5. 광축 위 물체점 조건 삭제

변이 artifact는 negative control이며 production 후보로 승격될 수 없다.

## 호출량과 비교 계약

- 총 27회
- 생성 Terra/medium: 5회
- 감사 Terra/medium: 11회
- 감사 Terra/high: 11회
- 실제 이미지 포함 호출: 11회
- 이미지 1장의 `detail:high` 예상량: `ceil(787/32) × ceil(481/32) × 1.2`
  = `25 × 16 × 1.2` = 480 input tokens
- 이미지 입력 합계: 5,280 tokens

모든 호출은 같은 GPT-5.6 Terra 단가를 사용한다. medium과 high의 가격표는 같지만 high가
더 많은 reasoning/output token을 사용할 수 있으므로 실제 비용은 실행 후 API `usage`로
분리 집계한다. 비교 보고서는 정상 자료 오탐, 변이 검출, 토큰, 지연, 비용을 effort별로
나란히 기록한다.

공식 OpenAI 문서상 GPT-5.6 Terra는 입력 $2/MTok·캐시 입력 $0.20/MTok·출력
$12/MTok이며 Responses API·이미지 입력·Structured Outputs를 지원한다. 이미지 `high`는
이 크기에서 32px patch 수에 1.2 배수를 적용한다.

- [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [Images and vision](https://developers.openai.com/api/docs/guides/images-vision)
- [Responses create](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)

## 실행 경계

준비 모드(API 호출 없음):

```bash
npm run build --silent
node packages/pipeline/dist/cli/run-lens-source-bundle-vertical.js
```

유료 실행은 별도 승인 뒤에만 다음 두 플래그를 모두 사용한다.

```bash
node --env-file-if-exists=.env \
  packages/pipeline/dist/cli/run-lens-source-bundle-vertical.js \
  --execute \
  --approval-id=lens-source-bundle-api-run-v2-2026-09-03
```

`--execute`만 주면 호출 전에 중단된다. 실행은 각 API 원문 응답, 파싱 결과, 안전한 span
정규화 기록, metadata와 usage를 분리 저장한다.

## 성공 기준과 중단 조건

다음을 모두 만족해야 Source 단계가 통과한다.

- PASSAGE 생성 3/3 의미 fingerprint 일치
- ITEM·OPTIONS 생성 각 1회 정적 검사 통과
- Terra/medium과 Terra/high의 source-only 독립 감사 모두 정상 자료 PASS
- 비율 방향·제곱·조건·시각 정밀도 오류 없음
- 격리된 사람 기준과 핵심 Source Claim 일치
- 변이 10/10 REJECT
- 계획된 API 호출 수 27회와 실제 호출 수 일치
- 정답 키·해설·평가 기준 누출 0건

하나라도 실패하면 후속 골드 생성으로 진행하지 않는다. 코드가 의미를 자동 수정하지도
않는다. 실패 artifact와 감사 근거를 보존하고 사람에게 넘긴다.
