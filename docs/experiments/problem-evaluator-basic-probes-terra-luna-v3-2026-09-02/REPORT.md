# v7 기본 20개 논리 프로브 Terra–Luna 비교

사람 검토 충분 경로와 생략 정책을 포함한 동일 프롬프트 v7·전체 골드·medium effort로 기본 20개 논리 프로브를 모델별 각 3회 실행했다. Luna가 절대 게이트를 통과한 뒤에만 Terra 60회를 실행했다.

| 지표 | Luna medium | Terra medium |
|---|---:|---:|
| assessment | 59/60 | 58/60 |
| finding | 58/60 | 60/60 |
| 상세 | 58/60 | 58/60 |
| 오류 | 0 | 0 |
| 평균 지연 | 9.90초 | 7.67초 |
| 관측 비용 | `$0.090136` | `$0.767970` |
| cold-cache 추정 비용 | `$0.163629` | `$1.464210` |

Luna는 전체 57/60 이상, 모든 프로브 2/3 이상, 모든 카테고리 14/15 이상, 오류 0건을 모두 충족했다. 상세 품질은 Terra와 동률이고 assessment는 한 건 높았다. 관측 비용은 Terra의 약 11.7%였지만 평균 지연은 약 29.1% 길었다.

운영 정책은 정답 근거 사전 판정(`ASSESS_SELECTION_RATIONALE`)만 Luna medium으로 전환하고, 더 복잡한 사고 경로 진단(`DIAGNOSE_PATH`)은 Terra medium을 유지한다. `PROBLEM_PATH_OPENAI_MODEL=gpt-5.6-terra`는 두 모드를 함께 되돌리는 즉시 롤백 설정이며, `PROBLEM_RATIONALE_OPENAI_MODEL`로 근거 판정 모델만 별도 지정할 수 있다.
