# 인계 — `low/off` 회귀 3세트

2×2 예비측정이 통과했다. 남은 일은 **최종 후보 하나(`low` + `propositionCoverage off`)만** 회귀
3세트에 올리는 것이다.

## 0. 전제 — 주간 한도와 무관하다

회귀는 `.env`의 `ANTHROPIC_API_KEY`로 나가는 **종량제 API 호출**이다
(`client.ts:69` `new Anthropic()` → 키를 env에서 읽는다). Claude Code 구독의 주간 한도를
쓰는 것은 대화 턴이지 이 subprocess가 아니다. 그러므로 어느 CLI에서 돌려도 결과는 같고,
한도가 차서 중단되는 것은 **감독**이지 **실행**이 아니다.

## 1. 상태

```
브랜치   experiment/no-proposition-glyph
HEAD     55335af  experiment(pipeline): gate propositionCoverage behind EVAL_PROPOSITION_COVERAGE
기반     e45b42e ← 2d906df(main)에서 분기
main     2d906df  ← propositionCoverage 없음. 07bbca0은 main의 조상이 아니다
```

**아직 push하지 않았다.** Codex CLI가 이 머신의 로컬 저장소에서 돌면 그대로 쓰면 되고,
GitHub을 통해 읽어야 하면 먼저 `git push -u origin experiment/no-proposition-glyph`.

## 2. 실행

```sh
cd /Users/mac/Projects/csat-literacy-trainer
git rev-parse --short HEAD            # 55335af 확인
npm run build                         # dist가 55335af 반영했는지 보장

set -a; . ./.env; set +a
export EVAL_EFFORT=low
export EVAL_PROPOSITION_COVERAGE=off

npm run assess -- base 2>&1 | tee docs/experiments/low-nocoverage-base.log
npm run assess -- new  2>&1 | tee docs/experiments/low-nocoverage-new.log
npm run assess -- n2   2>&1 | tee docs/experiments/low-nocoverage-n2.log
```

세 세트 합쳐 **37프로브 × 분해 4종 = 148콜**. `assess`는 순차 실행이라 `low/off` 기준
**약 60~70분, 약 $9** 예상(2×2에서 잰 $0.060/콜).

**환경변수 두 개가 핵심이다.** 빠뜨리면 기본값(medium / coverage on)으로 돌아 다른 설정을
잰다. 시작 직후 로그 첫 줄의 effort 표기로 확인할 것.

## 3. 재개

세트 단위로 나뉘어 있으니 중단되면 **끝내지 못한 세트만** 다시 돌리면 된다. 로그가
`tee`로 남으므로 어디까지 갔는지는 로그 끝을 보면 된다.

`assess`는 `cacheDir`를 쓰지 않아 매 호출이 실제 API 요청이다 — 재개 시 이미 끝난 세트를
다시 돌리면 그만큼 다시 과금된다.

## 4. 대조 기준선 — 새로 잴 필요 없다

`docs/experiments/effort-medium-2026-08-09.md`가 기준선이다. 그 측정은 **2026-08-09**이고
`propositionCoverage`는 **2026-08-11**(07bbca0)에 들어왔으므로, 그 문서의 `medium` 숫자는
사실상 **medium + coverage off**다. 즉 main의 현재 구성과 같다.

따라서 비교는 1회로 끝난다:

```
기준선  medium/off   effort-medium-2026-08-09.md   과대평가 1건 · 오라클≠기대 3/37 · 불안정 6/37
후보    low/off      이번 회귀
```

## 5. 통과 기준

| 항목 | 기준 |
|---|---|
| 과대평가 | **새로 생긴 것 0건.** 기존 1건(`base` 인문 `Bd1`)은 기준선부터 있던 것 |
| 거짓 모순 | 0건. 모순은 하드 게이트라 인접 등급 미끄러짐과 성격이 다르다 |
| 오라클≠기대 | 3/37 대비 악화 없음 |
| 불안정 | 6/37 대비 악화 없음. 단 반복 변동 1~2/9와 구분되지 않는 범위는 잡음으로 본다 |

## 6. 예비측정 요약 (근거)

법인 프로브 4개(코덱스 실제 답안) × 4설정 × 2회 = 32런.

```
설정          벽시계   출력   JSON   사고   비용
med/on        45.7s   4086   2016   2124  $0.108   ← 현행 experiment 브랜치
med/off       34.9s   3074   1368   1845  $0.082   ← main 구성
low/on        38.1s   3536   1949   1628  $0.094
low/off       25.3s   2193   1291    918  $0.060   ← 후보

짝비교  med/on → low/off   8/8 같은 방향, 중앙 −47%, 판정 8/8 동일
        low/on → low/off   8/8 같은 방향, 중앙 −29%(−12.8s)

영역 판정 vs 세션 기록   med/on 0/32 · low/on 0/32 · low/off 0/32 · med/off 1/32
semanticState 불일치     low/off 0/104 (설정 간·반복 간 모두 0)
```

`low/off`가 가장 빠르면서 가장 안정적이었다. 유일한 판정 흔들림은 `med/off`에 있었다
(`B1#1` r1 부분→주제, `semanticState` 반복 변동 2/104) — **medium에서만 coverage를 빼면
약간 불안정해지는지**가 회귀에서 지켜볼 지점이다.

## 7. 주의

- **앱 서버·브라우저 탭을 닫고 돌릴 것.** 2×2 측정 중 다른 문단 채점이 섞여 들어와
  계측 귀속이 오염됐다(`humanities-p4` 4건, `photosynthesis-p4` 1건, `disclosure-p3`).
- 운영 기본값은 건드리지 않았다. `EVAL_PROPOSITION_COVERAGE` 미설정 = on,
  `EVAL_EFFORT` 미설정 = medium. **회귀 통과 전에는 기본값을 바꾸지 말 것.**
- 프로브 4개짜리 예비측정에서 "과대통과 0건"은 안전의 증거가 아니다 — 이 프로젝트의
  과대평가 기저율이 37프로브에 1건이라 4프로브로는 검출력이 없다. 그래서 회귀를 도는 것이다.
- 연결 재시도로 벽시계가 튀는 행이 나올 수 있다(2×2에서 1건, 4220초). 지연 집계에서 빼되
  토큰은 유효하다.
