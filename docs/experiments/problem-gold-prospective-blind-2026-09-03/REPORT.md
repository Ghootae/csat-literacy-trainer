# 신규 24문항 골드 생산 일반화 실험

실행일: 2026-09-03

원천: `/Users/mac/Projects/csat-literacy-trainer/data`

기준선 커밋: `d4391fc` (`fix(problem-solving): cap rationale evaluation latency`)

## 1. 목적과 불변조건

기존 운영 6문항과 2026-09-01 외삽 실험 8문항을 제외한 새 문항에서 골드 생산 비용,
자동 정규화량, 사람 검수 위험 문항 비율을 측정한다.

- 한 지문에서 최대 한 문항만 선택한다.
- AI 출력은 항상 `candidate`이며 자동으로 운영 골드가 되지 않는다.
- 충분 경로는 AI가 만든 추론 그래프에서 별도 `candidate`로 파생한다.
- 사람 검수 파일의 골드·충분 경로 해시가 모두 일치하고 상태가 `APPROVED`일 때만
  블라인드 실험용 `human_reviewed` 골드로 변환한다.
- 블라인드 실험용 승격은 운영 fixture를 쓰거나 복사하지 않는다.
- 공급자 최초 응답은 정규화 전에 별도 파일로 보존한다.

## 2. 표본

정답 레코드가 있는 713문항 중 어휘형, 기사용 14문항, 분야 미분류 문항을 제외한 451문항을
후보로 삼았다. 고정 seed와 원천 해시로 24문항을 선택했다.

| 범위 | 문항 수 |
|---|---:|
| 정발문 / 부정발문 | 12 / 12 |
| 인문 / 사회 / 과학 | 8 / 8 / 8 |
| 보기 적용 | 13 |
| 계산 | 6 |
| 시각 자료 | 10 |
| 복수 조건 | 21 |

표본 manifest는
`packages/pipeline/experiments/problem-solving/prospective-gold-sample-v1.json`에 있으며,
각 문항은 원본 결과 파일과 정답 레코드의 결합 해시를 가진다.

## 3. 실행 조건

| 항목 | 값 |
|---|---|
| 생성 모델 | `gpt-5.6-terra` |
| effort | `medium` |
| 프롬프트 | `problem-gold-generation-prompt-v2` |
| 골드 스키마 | `problem-solving-gold-v2` |
| 호출 | 24회, API 오류 0건 |
| 가격 스냅샷 | 2026-09-02, 입력 `$2/M`, 캐시 입력 `$0.2/M`, 출력 `$12/M` |

## 4. 생산 결과

| 지표 | 결과 |
|---|---:|
| 전체 생성 시간 합계 | 1,333.054초 |
| 평균 생성 시간 | 55.544초 |
| 입력 / 캐시 입력 / 출력 토큰 | 144,862 / 85,836 / 150,415 |
| 추정 비용 | `$1.940190` |
| 문항당 평균 비용 | `$0.080841` |
| 원시 무수정 스키마 통과 | 2/24 |
| 정적 정규화 후 통과 | 23/24 |
| 자동 정규화 | 75건 |
| 사람 승인 | 0/23, 전부 `PENDING` |
| 후보 검수 위험도 | HIGH 10 / MEDIUM 6 / LOW 7 |
| 의미 충돌로 후보 미생성 | 1 |

자동 정규화 75건은 다음과 같다.

| 정규화 | 건수 |
|---|---:|
| 선택 오답 경로의 놓친 정답 필드 정렬 | 32 |
| 추론 전제 참조 재구성 | 23 |
| 결정 단계와 결론 단계 분리 | 17 |
| 오답 경로에서 실제 정답 제거 | 2 |
| 사용하지 않는 보충 정책 제거 | 1 |

이 정규화는 문항 의미나 정답을 바꾸지 않는 교차 필드 계약에만 적용했다. 원시 통과율 2/24와
자동 수정 75건을 별도 보존하므로, 최종 스키마 통과율 23/24가 생성 난이도를 숨기지 않는다.

## 5. 충분 경로와 효과 범위

유효 후보 23문항의 AI 추론 그래프에는 item inference 139개가 있다.

| target claim effect | 수 |
|---|---:|
| `SUPPORTS` | 76 |
| `CONTRADICTS` | 40 |
| `DOES_NOT_JUSTIFY` | 23 |

그래프에서 충분 경로 후보 115개를 파생했다. 이는 운영 골드가 아니며, 사람은 반복 경계나
여러 유효 경로가 있는 경우에 필요한 후보만 승인한다. 후보 위험 표지는
`ANSWER_KEY_CONSTRAINED` 18, `DOES_NOT_JUSTIFY` 17, `VISUAL_REQUIRED` 14,
`MULTIPLE_INFERENCES` 9건이다.

## 6. 자동 교정하지 않은 의미 충돌

`prospective-69fd388386fd308968e0b9f4-q11`(볼록 렌즈와 비점 수차)은 공식 정답이 C3인
부정 발문인데 생성본이 C2와 C3을 모두 거짓으로 판정했다. 나머지 교차 필드 오류를 정규화한
뒤에도 “발문에 맞는 정답 선지가 정확히 하나” 계약을 통과하지 못했다.

시각 자료 또는 정량 관계 해석 문제일 수 있으므로 정답 키에 맞춰 자동 수정하지 않았다.
이 문항은 후보 골드와 승인 파일을 만들지 않고 별도 사람 검토 대상으로 남겼다.

## 7. 사람 승인 절차

각 유효 문항의 `artifacts/<caseId>/human-review.json`에서 다음을 기록한다.

1. 골드의 주장 방향, 최소 전제, 정답 키 제약, 시각 의미를 검토한다.
2. `approvedCandidateIds`에는 실제로 명시할 충분 경로 후보만 넣는다.
3. 검토 시간, 수정 필드·추론 수, 위험도와 사유를 기록한다.
4. `reviewerId`, `reviewedAt`, `status: APPROVED | REJECTED`를 기록한다.
5. 승격 도구를 실행한다. 검수 뒤 파일이 바뀌어 해시가 달라졌다면 승격은 실패한다.

승격 전 현재 상태는 후보 23, 대기 23, 승인 0, 후보 미생성 1이다. 따라서 prospective blind
evaluator 실험은 아직 시작할 수 없다.

## 8. prospective blind 안전 게이트

승인된 골드와 독립 학생 응답이 준비되면 다음 7개 위해 행동을 모두 0건으로 요구한다.

- 정답 뒤집기
- 정답 학생의 불필요한 질문
- 학생이 말하지 않은 오개념 생성
- 무관한 출처 사용
- 정답·다른 선지 누설
- 폴백 중복 호출
- 안전 종료 실패

`evaluate-prospective-blind-safety-gate` 실행기는 하나라도 발생하거나 관측값이 0개면 실패 코드로
종료한다.

## 9. 재현 명령

```bash
npm run build --silent
node packages/pipeline/dist/cli/prepare-prospective-gold-sample.js \
  --source-root=/Users/mac/Projects/csat-literacy-trainer/data --size=24 \
  --created-at=2026-09-03T00:00:00.000Z
node --env-file-if-exists=.env packages/pipeline/dist/cli/run-prospective-gold-production.js \
  --execute --concurrency=3 \
  --input-usd-per-million=2 --cached-input-usd-per-million=0.2 \
  --output-usd-per-million=12
node packages/pipeline/dist/cli/promote-prospective-reviewed-gold.js
node packages/pipeline/dist/cli/evaluate-prospective-blind-safety-gate.js \
  --input=<독립-학생-응답-감사-observations.json>
```

생성 실행은 `production-measurement.json`이 있는 문항을 재호출하지 않는다. 최초 공급자 응답과
원천 입력도 덮어쓰지 않는다.
