# E1 v3 드라이런 요청 수와 예상 비용 상한

작성: 2026-11-06, 하위 에이전트(executor). 외부 전송 없음. `node scripts/run-item-generation.mjs --dry-run --prompt-version v3 --conditions A2,B --out docs/experiments/gold-item-generation-2026-11-06/v3 --max-requests 16 --usd-cap 2`로 만든 요청 파일(`v3/dry-run/generation/`)에서 센 값이다.

- 근거: `docs/handoffs/2026-11-06-e1-v3-relation-first.md`, 결정 `memory/decisions/D-0206-gold-based-item-generation-experiment-design.md` 보완 2.
- 모델 `gpt-6.1-sol`, reasoning medium, 단가 $2 / $10(100만 토큰), 요청마다 최대 출력 16,000토큰, 재시도 없음. 조건은 A2·B만(A는 v3에서 쓰지 않는다).
- 입력 토큰 추정과 예상 비용 상한의 계산은 `DRY-RUN.md`(실험 폴더)와 같다. 요청 JSON 바이트를 토큰 수로 보고 입력 단가를 곱한 **상한**이고, 최대 출력을 다 쓴다고 가정한 값이다.
- 집필 요청의 입력에는 설계 요청의 실제 출력이 들어가므로, dry-run에서는 가짜 설계표(v3 예시)로 크기를 쟀다.

| 조건 | 요청 종류 | 요청 수 | 입력 바이트 | 최대 출력 토큰 합 | 예상 비용 상한 |
|---|---|---:|---:|---:|---:|
| A2 | 설계(design) | 4 | 59,635 | 64,000 | $0.759 |
| A2 | 집필(write) | 4 | 75,218 | 64,000 | $0.790 |
| B | 설계(design) | 4 | 267,061 | 64,000 | $1.174 |
| B | 집필(write) | 4 | 93,784 | 64,000 | $0.828 |
| 합계 | | 16 | 495,698 | 256,000 | $3.551 |

요청별:

| 조건 | 지문 | 종류 | 입력 바이트 | 최대 출력 토큰 | 예상 비용 상한 |
|---|---|---|---:|---:|---:|
| A2 | audio-perceptual-coding | 설계 | 14,515 | 16,000 | $0.189 |
| A2 | audio-perceptual-coding | 집필 | 19,533 | 16,000 | $0.199 |
| A2 | corporate-law | 설계 | 16,017 | 16,000 | $0.192 |
| A2 | corporate-law | 집필 | 21,434 | 16,000 | $0.203 |
| A2 | plastic-polymerization | 설계 | 14,588 | 16,000 | $0.189 |
| A2 | plastic-polymerization | 집필 | 17,165 | 16,000 | $0.194 |
| A2 | surface-tension-laplace | 설계 | 14,515 | 16,000 | $0.189 |
| A2 | surface-tension-laplace | 집필 | 17,086 | 16,000 | $0.194 |
| B | audio-perceptual-coding | 설계 | 63,629 | 16,000 | $0.287 |
| B | audio-perceptual-coding | 집필 | 26,197 | 16,000 | $0.212 |
| B | corporate-law | 설계 | 75,990 | 16,000 | $0.312 |
| B | corporate-law | 집필 | 27,492 | 16,000 | $0.215 |
| B | plastic-polymerization | 설계 | 64,078 | 16,000 | $0.288 |
| B | plastic-polymerization | 집필 | 20,007 | 16,000 | $0.200 |
| B | surface-tension-laplace | 설계 | 63,364 | 16,000 | $0.287 |
| B | surface-tension-laplace | 집필 | 20,088 | 16,000 | $0.200 |

## 상한 비교 (`--max-requests 16 --usd-cap 2`)

- 요청 수 16은 상한 16 이내다(`overMaxRequests: false`).
- **예약액 합계 $3.551는 `--usd-cap 2`를 넘는다(`overCap: true`).** 요청마다 최대 출력 16,000토큰을 예약하므로 출력 예약만 16 x 16,000 x $10 / 100만 = $2.56이다. 이 상한으로 실제 전송을 하면 스크립트가 예약액 기준으로 도중에 멈춘다(`RUN_LIMIT: usd cap`). 실제 청구는 응답이 최대 출력까지 가지 않으므로 보통 이보다 훨씬 작다. 전송 승인 때 상한을 정해야 한다(예: 예약액 합계 이상인 `--usd-cap 4`).

## 외부로 나가는 자료(OpenAI, `gpt-6.1-sol`)

| 조건 | 나가는 자료 |
|---|---|
| A2 설계 | 지문 원문, 문항 자리(극성·범위) |
| B 설계 | 지문 원문, 문항 자리, 동결 지도(명제·합성·관계와 관계 유형), 명제별 입장, 다른 지문에서 센 비틂 종류별 개수·비율, 관계 후보(`relationCandidates`) |
| A2·B 집필 | 지문 원문, 설계표(설계 요청의 출력) |

기출 문항 텍스트·기출 번호(`realNumber`)·그 지문 자신의 선지 연결 동결본은 어떤 요청에도 들어가지 않는다(시험으로 확인).

## B 설계 요청의 `relationCandidates` 확인

| 지문 | 후보 수 / 지도 관계 수 | 제외 유형(구체화·정의·전개) 포함 |
|---|---:|---|
| corporate-law | 14 / 39 | 없음 |
| surface-tension-laplace | 18 / 35 | 없음 |
| audio-perceptual-coding | 15 / 37 | 없음 |
| plastic-polymerization | 13 / 29 | 없음 |

`corporate-law` B 설계 요청의 입력 키: `passageId, paragraphs, slots, map, stances, twistDistribution, relationCandidates`. 후보 관계 유형은 GROUNDS·CONCESSION·MEANS_END·CONTRAST·APPLICATION·CAUSE이고, `map.relations` 39개는 그대로 들어 있다.
