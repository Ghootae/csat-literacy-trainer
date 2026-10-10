---
date: 2026-10-02
scope: source-db-history-and-gongsun-marker-discrepancy
base_commit: uncommitted
---

# 자료 수집 검증과 EBS 해설 추가 이력 재확인

사용자가 수개월 전 원자료/JSON 검토와 EBS 해설 추가 작업을 회상해 기록을 조사했다.
최근 대화 목록과 보관 목록에서 해당 대화 원문은 찾지 못했으며, 아래 사실은 저장 파일에서
확인했다. 대화 기억이나 에이전트 요약을 새 승인 사실로 승격하지 않는다.

## 확인한 과거 작업

- 2026-07-23 자료 교체: `docs/DATA-SCHEMA.md`와 외부 trainer의 동일 문서는 구
  `csat-literacy-trainer/data/` 수집본을 폐기하고 `/Users/mac/Projects/suneung_db/output/`을
  사용한다고 명시한다. 구 수집본의 오프셋이 문자 위치가 아니었던 문제와 새 지문 주석697건
  전수 일치가 기록돼 있다. 외부 trainer `.omc/plans/consensus-csat-literacy.md`에도 같은
  교체 날짜가 있으나 계획 문서보다 실제 새 JSON/검증 산출물을 우선했다.
- 새 DB `output/manifest.json`의 collected_at은 2026-07-23이며158세트·752문항을 기록한다.
  `output/README.md`는 전체 JSON 참조 검사, 구조화 표본30세트, 렌더 DOM29세트 대조를
  기록한다. `output/audits/rendered-fidelity.json`도29통과·0실패·무료체험1적용불가다.
  공손룡 세트는 렌더 DOM 표본에 포함되지 않았다. 전체 검증을 이번에 다시 실행한 것은 아니다.
- EBSi 해설 확장은 2026-09-03이다. 외부 trainer `data/enrichment/summary.json`은
  153자료·52시험·728문항을, `detailed-summary.json`은 선지 해설3640개를 기록한다.
  공손룡 개별 record에도 checked_at=2026-09-03, EBSi 공식 배포 PDF 출처가 있다.
  내용은 공식 PDF 전문이 아니라 사실 확인을 거친 독립 의역이라고 기록돼 있다.
  두 작업이 같은 날 이뤄졌다는 증거는 없으므로 날짜와 검증 범위를 분리한다.

## 새 DB의 실제 공손룡 범위 확인

`/Users/mac/Projects/suneung_db/output/questions/69c011fd78128b2a9beddd5e.json`의
number12 → supplement.elements는 start/end와 대상 text를 함께 보존한다.
범위를 현재 문자열에 적용해 5/5 일치함을 로컬에서 확인했다.

| 기호 | 범위 | text | 문맥 |
|---|---|---|---|
| ⓐ | 29~30 | 옷 | 갑의 첫 ‘옷이 없어’ |
| ⓑ | 51~52 | 옷 | 지금 네가 들고 있는 옷 |
| ⓒ | 78~79 | 옷 | 무슨 옷이 없어 |
| ⓓ | 93~94 | 옷 | 내 말은 옷이 정말 없다는 게 아니라 |
| ⓔ | 110~114 | 빨간 옷 | 빨간 옷이 필요한데 |

현재 MVP public fixture와 동결 시험 sources.json은 ⓒ를 ‘옷장 안에 ⓒ옷이 이렇게 많은데’에
붙였다. 새 DB의 표식 위치와 다르다. 범위 종료 정보 누락과 별개인 구체적인 입력 불일치다.
단, 이 차이가 d/e 오판을 일으켰다는 인과는 미입증이다. 새 DB 해당 문항의 인쇄 원본 대조도
이번에는 수행하지 않았다. 기존 시험은 입력 충실도가 확인된 프롬프트 단독 비교로 볼 수 없다.

직전 `2026-10-02-gongsun-db-marker-metadata.md`의 좌표 미확인은 구 수집본에 한정된다.
이미 대체 DB가 있다는 근거를 확인하지 않고 범위를 복원해야 한다고 안내한 것은 불완전했다.
정확한 범위를 갖춘 새 DB를 먼저 확인해야 한다. 현재 입력·프롬프트·외부 DB 수정과 추가 API0.

## 근거 경로

- `docs/DATA-SCHEMA.md`
- `/Users/mac/Projects/suneung_db/output/README.md`, `manifest.json`, `audits/rendered-fidelity.json`
- `/Users/mac/Projects/suneung_db/output/questions/69c011fd78128b2a9beddd5e.json`
- `/Users/mac/Projects/csat-literacy-trainer/data/enrichment/summary.json`, `detailed-summary.json`, `records/69c011fd78128b2a9beddd5e.json`
- `packages/pipeline/fixtures/experiments/problem-solving/public/gongsun-long-later-mohists-q12.json`
- `docs/experiments/problem-v3-based-v4-smoke-2026-10-02/sources.json`

다음 검토 후보는 새 DB 대비 현재 입력 충실도 감사다. 수정·재시험 승인은 별도로 필요하다.
