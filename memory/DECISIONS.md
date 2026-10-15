# 결정 색인

현재 효력이 있는 결정과 의도적으로 보류·폐기한 선택을 찾는 색인이다. 상세 근거와 재검토
조건은 각 레코드에 있다.

| ID | 상태 | 범위 | 결정 |
|---|---|---|---|
| [`D-0001`](./decisions/D-0001-semantic-relation-verdict.md) | accepted | 문단 평가 | 핵심 의미 관계 보존을 기본 채점축으로 사용 |
| [`D-0002`](./decisions/D-0002-problem-source-direct-runtime.md) | accepted | 문제 풀이 | 전체 런타임을 원문 직접 방식으로 운영 |
| [`D-0003`](./decisions/D-0003-problem-gold-offline-only.md) | accepted | 문제 골드 | 구조화 문제 골드를 오프라인 자산으로 제한 |
| [`D-0004`](./decisions/D-0004-paragraph-selective-dialogue-v2.md) | superseded | 문단 대화 | 간결 판정과 선택적 상세 진단을 결합; D-0010으로 범위 명확화 |
| [`D-0005`](./decisions/D-0005-paragraph-gold-audit-baseline.md) | accepted | 문단 골드 | 단일 감사 v1 생산 기준선을 유지 |
| [`D-0006`](./decisions/D-0006-title-abstraction-reward-deferred.md) | accepted | 표제 평가 | 추상화 보상 판정을 보류 |
| [`D-0007`](./decisions/D-0007-problem-dialogue-v3-candidate.md) | superseded | 문제 풀이 | 학생 발화 보존 v3 후보를 운영 v2와 분리해 검증 |
| [`D-0008`](./decisions/D-0008-problem-dialogue-v3-operational-default.md) | accepted | 문제 풀이 | v3를 운영 기본값으로 고정하고 실제 학생 경험·세트 확장으로 검증 |
| [`D-0009`](./decisions/D-0009-paragraph-gate-contract-retry.md) | accepted | 문단 대화 | 근거 없는 축 상태 변경을 조용히 되돌리지 않고 학생 답변 보존 계약 재시도로 처리 |
| [`D-0010`](./decisions/D-0010-paragraph-axis-scope-v3.md) | accepted | 문단 대화 | 중심축을 유일한 통과 기준으로 제한; V3 구현의 의미 검증은 아직 실패 |
| [`D-0011`](./decisions/D-0011-paragraph-student-controlled-progression.md) | accepted | 문단 진행 | 모든 판정에서 학생의 진행 선택 허용; D-0013에서 구현 |
| [`D-0012`](./decisions/D-0012-paragraph-compression-measurement-deferred.md) | accepted | 문단 압축 | 청킹·압축 측정과 보상·처벌은 보류하고 새 판정 규칙 논의에 집중 |
| [`D-0013`](./decisions/D-0013-paragraph-optional-revision-v4.md) | accepted | 문단 V4 | 축별 공개·OK 선택적 보완·모든 판정에서 진행 허용을 구현; 의미 품질 검증은 별도 |
| [`D-0014`](./decisions/D-0014-current-claims-recording.md) | accepted | 문단 기록 | 현재 주장과 수정·철회 이력을 분리하고 현재 목록만 2차로 전달; 원문·과거 발화 보존 |
| [`D-0015`](./decisions/D-0015-explicit-error-quotations.md) | accepted | 문단 오류 기록 | 오류 구절을 현재 주장에서 별도 지정·검증·저장; 축 첫 근거를 오류 인용으로 대체하지 않음 |
| [`D-0016`](./decisions/D-0016-personal-reading-workbench.md) | accepted | 개인 테스트 UI | 개발자 3단·자유 탐색 맵, 학생 2단, SERIOUS 원문 위치 안내; 평가 범위와 진행 선택 유지 |
| [`D-0017`](./decisions/D-0017-axis-core-filter-experiment.md) | accepted | 축 필터 실험 | 1차 골드 유지·직접 2차 필터 비교 완료, 공손룡 핵심 손실·보류 악화로 운영 미승격 |
| [`D-0018`](./decisions/D-0018-axis-function-filter-experiment.md) | accepted | 축 기능 필터 실험 | 중심 대상→설명 기능→정제 후보 구현·API 비교 승인, 기능은 감사 기록으로만 보존 |
| [`D-0019`](./decisions/D-0019-axis-meaning-filter-only-experiment.md) | accepted | 축 의미 필터 실험 | 내부 required/optional 분해·필터 단독10호출, 학생 평가0; 공손룡 핵심 손실로 운영 미승격 |
| [`D-0020`](./decisions/D-0020-axis-relation-decomposition-experiment.md) | accepted | 축 관계 추출 실험 | 축 문장만으로 관계 추출10호출, 중요도·학생 평가0; 관계·위상 미분리와 조건 범위 문제로 미승격 |
| [`D-0021`](./decisions/D-0021-single-call-materiality-experiment.md) | accepted | 동일 호출 중요도 실험 | 골드·호출 수 유지한 후보40호출 비교; 경계 개선·엄격화 공존으로 운영 미적용 |
| [`D-0022`](./decisions/D-0022-axis-direct-judgment-experiment.md) | accepted | 최소 출력 직접 판정 실험 | 같은20응답×2조건×3회120호출; 속도·반복 일치 개선과 핵심 누락 과수용 공존, 운영 미적용 |
| [`D-0023`](./decisions/D-0023-direct-relational-boundary-design.md) | accepted | 직접 판정 관계 누락 경계 시험 | 120호출 완료·부분 개선이나 도파민 과수용 유지·공손룡 충분 축 보류 재현, 운영 미승격 |
| [`D-0024`](./decisions/D-0024-axis-context-isolation-diagnostic.md) | accepted | 축 범위 격리 진단 | 기존 두 프롬프트 고정·60호출 완료, 범위 영향 관측이나 완전 해결·운영 승격 아님 |
| [`D-0025`](./decisions/D-0025-counterfactual-context-and-conditional-benchmark.md) | accepted | 반사실 맥락·조건부 병렬 시험 | v1 고정180호출 완료, 도파민1문단 차이·충분보류0; 진입 기준 미달로 병렬 측정 건너뜀 |
| [`D-0026`](./decisions/D-0026-natural-response-disagreement-mining.md) | accepted | 자연 응답 오프라인 비교 | 전송 명시 승인·90호출 완료,14불일치·질문 후보4→11; 사람 검토20건 대기·운영 유지 |
| [`D-0027`](./decisions/D-0027-v4-light-output-experiment.md) | accepted | V4 최소 출력 실험 | 90호출 완료·속도/비용 개선, OK 양극화·질문 후보4→9로 품질 보존 실패; 미승격·운영 유지 |
| [`D-0028`](./decisions/D-0028-v4-output-optimization-human-policy.md) | superseded | V4 출력 최적화 | 불일치15건 각각 V4 표시 결과 승인; 단계적 절삭 탐색은 D-0030에서 보류 |
| [`D-0029`](./decisions/D-0029-v4-output-ablation-interpretation-correction.md) | accepted | V4 출력 절삭 해석 | 첫 실행을 주 지표로 고정하고 계약 재시도·연구 재실행 비용을 분리; S2 안정 통과 표현 철회·B1 실익 미입증·N03 인용 문제 분리 |
| [`D-0030`](./decisions/D-0030-v4-operational-output-ablation-paused.md) | accepted | 문단 V4 운영·출력 절삭 | 운영 V4 유지; 모든 절삭 결과 보존·B2 및 추가 절삭 보류; 실제 사용 병목이 확인될 때만 재개 |
| [`D-0031`](./decisions/D-0031-developer-ui-url-only.md) | accepted | 개인 테스트 UI 안내 | URL은 개발자용 `/dialogue/dev`만 제시; 학생용 UI는 개발자 화면 확정 전 수정·안내하지 않음 |
| [`D-0032`](./decisions/D-0032-developer-dialogue-thread-ui.md) | accepted | 개인 개발자 대화 UI | 오른쪽 현재 이해·골드·평가, 고정 입력창, 선택적 질문 전 피드백을 보존하는 누적 스레드 구현; 학생용 UI 유지 |
| [`D-0033`](./decisions/D-0033-jev-semantic-measurement-layer.md) | superseded | JEV 의미 측정 연구 | 단일 분류 대신 다중 의미 센서 연구 후보로 채택했으나 D-0036에서 제품 적용 연구 보류 |
| [`D-0034`](./decisions/D-0034-korean-default-for-prompts.md) | accepted | 프로젝트 프롬프트 언어 | 별도 지시가 없으면 새 프롬프트를 한글로 작성하고 기존 실행본은 재현성을 위해 보존 |
| [`D-0035`](./decisions/D-0035-jev-mr-gauge-ui-prototype.md) | superseded | JEV 개인 UI 프로토타입 | MR 게이지·학생 선택 UI 후보였으나 D-0036에서 구현·검증 보류 |
| [`D-0036`](./decisions/D-0036-jev-product-work-parked.md) | accepted | JEV 제품 적용 | 자동 PASS·MR 게이지·추가 rubric·collision 확장과 추가 호출을 보류하고 운영 V4 유지 |
| [`D-0037`](./decisions/D-0037-concrete-meaning-realization-candidate.md) | accepted | 구체적 의미 실현 판정 | `v4-concrete-meaning-v1`을 개선 후보로 보존; 4문단 개선 신호·누락/오류 보호, 일반화 대기·운영 미적용 |
| [`D-0038`](./decisions/D-0038-functional-meta-axis-generation-pilot.md) | accepted | 기능적 메타 축 생성 시험 | 법인4문단 기존/후보6호출·형식유효, 메타1방향누락·메타2위험약화와조건잔존; 생성물검토대기·학생평가/운영변경없음 |
| [`D-0039`](./decisions/D-0039-two-level-meta-axis-evaluation-pilot.md) | accepted | 기능적 메타 축 이중 판정 시험 | 차이만표현시기본PASS 기준승인; 반복2골드36호출·35유효, L2구별관측이나L1도PASS하여보상경계미분리·운영미적용 |
| [`D-0040`](./decisions/D-0040-low-intervention-dual-routing.md) | accepted | 비개입 우선 이중 판정 기준 | L1 PASS/OK는 L2와 무관하게 보완 표시 없이 통과, SERIOUS는 L2로 질문/선택적 보완 구분, ERROR는 질문 제시 필수·응답 없이 진행 가능; 기준 확정·운영 미적용 |
| [`D-0041`](./decisions/D-0041-regenerated-dual-sensitive-expansion.md) | accepted | 민감 문단 이중 판정 확대 | 기존 방식대로 구체 축·메타 축 공동 재생성6회와 판정180회 일괄 승인; 같은 새 축의 L1-only와 이중 정책 비교, 운영 변경 없음 |

| [`D-0042`](./decisions/D-0042-gongsun-ambiguous-error-accepted.md) | accepted | 공손룡 사례 검토 | 생략 표현의 ERROR 처리 사용자 허용; 일반 중의문 규칙·프롬프트 변경으로 확대하지 않음 |

| [`D-0043`](./decisions/D-0043-natural-eight-human-routing.md) | superseded | 실제 응답8건 최초 기준 | 최초 통과4·선택적보완3·질문1; D-0044에서7·8번정정 |
| [`D-0044`](./decisions/D-0044-natural-eight-acceptable-routes.md) | accepted | 실제 응답8건 허용 처리 | 8번선택적보완, 7번질문/선택적보완모두허용; 과거V4처리8/8허용범위·독립정확도아님 |
| [`D-0045`](./decisions/D-0045-conditional-meta-natural-eight-experiment.md) | accepted | 실제8응답 조건부 메타 판정 시험 | L1 각3회 후 SERIOUS 축만 L2; 기존 공동생성6문단 재사용·미보유2문단 생성. D-0040 정책·운영 미변경 |
| [`D-0046`](./decisions/D-0046-conditional-meta-results-accepted.md) | accepted | 조건부 메타8 결과 수용 | OK무보완통과·관대한 결과 수용. 사전 경로차이9회를 실패로 간주하지 않음; 원자료·집계 보존·운영미승격 |
| [`D-0047`](./decisions/D-0047-conditional-meta-developer-mode.md) | accepted | 조건부 메타 개발자 연결 | 6지문30문단 축준비·개발자 실험모드 연결 승인 및 구현. L1 SERIOUS만 L2, 원판정/정책 분리·학생 기본 V4 유지 |
| [`D-0048`](./decisions/D-0048-student-state-model-next-goal.md) | accepted | 학생 상태·정기 피드백 | 현재 문단·문제 기록 기반의 증거·불확실성 보존 다차원 상태 모델을 다음 개발 목표로 설정; 난이도 보정 전 단일 능력 점수·적응형 제시 미승인 |
| [`D-0049`](./decisions/D-0049-stem-polarity-normalization-deferred.md) | accepted | 문제 풀이 선택 의미 | 발문 극성을 한 번 정규화하고 선택 의미·학생 추론·파생 결론·내용 정확성을 분리하는 설계 승인; 다른 수정 사안과 함께 구현할 때까지 현행 v3 유지 |
| [`D-0050`](./decisions/D-0050-reasoning-reconstructability-gate-deferred.md) | accepted | 문제 풀이 추론 재구성 | 근거 제출과 추론 가능성을 구분하고 파편·모순·과소결정 발화의 선지 결론을 보류하는 게이트를 후속 구현 후보로 채택; D-0049와 함께 구현 대기 |
| [`D-0051`](./decisions/D-0051-bounded-problem-feedback-flow-deferred.md) | accepted | 문제 풀이 개입·종료 후보 | 근거 기본·답만 제출 선택, 교정 1회·성공 시 재선택 1회, 추론 불가능·교정 실패·최종 오답은 코칭 종료; 후보 기록만 승인·개발 실제 차감 없음·운영 미변경 |
| [`D-0052`](./decisions/D-0052-correction-vs-historical-selection-deferred.md) | accepted | 문제 풀이 교정 판정 시점 | 교정 답변은 기존 오류 수정으로 평가하고 과거 선택과의 불일치를 새 실행 오류로 만들지 않음; 설계 합의·구현 보류 |
| [`D-0053`](./decisions/D-0053-global-unknown-priority-deferred.md) | accepted | 문제 풀이 게이트 우선순위 | 전체 결론 확인 불가이면 국소 오류가 명확해도 확인불가 우선; 최초 오답은 코칭 종료·정답 분기 적용 범위 확인 필요·구현 보류 |
| [`D-0054`](./decisions/D-0054-insufficient-wrong-rationale-exit-deferred.md) | accepted | 문제 풀이 불충분 오답 근거 | 사실은 참이나 선지 판단 연결이 불충분한 최초 오답은 확인 불가·코칭 종료; 명시적 잘못된 연결과 구별·구현 보류 |
| [`D-0055`](./decisions/D-0055-multiple-error-correction-batch-deferred.md) | accepted | 문제 풀이 복수 오류 교정 | 최초 오답의 오류별 순차 질문 후 누적 최종 판정; 중간 실패로 종료하지 않음·모두 수정 시만 재선택·기존 총 1회 제한 부분 대체·구현 보류 |
| [`D-0056`](./decisions/D-0056-question-count-per-error-deferred.md) | accepted | 문제 풀이 교정 질문 수 | 한 응답의 오류 N개에 오류별 1회씩 N개 질문·별도 총수 상한 없음·누적 최종 판정 유지·구현 보류 |
| [`D-0057`](./decisions/D-0057-explicit-rationale-submission-deferred.md) | accepted | 문제 풀이 근거 제출 경계 | 명시적 근거 미제출/입력 후 제출과 입력 대기 구분; 최초 오답의 근거 확인 불가 답변은 코칭 종료·구현 보류 |
| [`D-0058`](./decisions/D-0058-terminal-coaching-answer-reveal-deferred.md) | accepted | 문제 풀이 코칭 종료 | 선택 회차와 무관하게 코칭 종료 시 정답 공개·재선택 없음; 설계 확정·구현 보류 |
| [`D-0059`](./decisions/D-0059-problem-feedback-clarifications-consolidated.md) | accepted | 문제 풀이 통합 설계 | 마지막 네 명료화 승인·D-0049~D-0058 통합·저장 가능한 수형도 작성; 학습 분기 설계 합의 완료·운영 구현 보류 |
| [`D-0060`](./decisions/D-0060-problem-feedback-v4-headless-implementation.md) | accepted | 문제 피드백 UI 제외 구현 | 사용자 구현 승인·D-0059를 별도 v4 코어/판정기/로컬 개발자 API/저장으로 구현; UI·실제 차감·운영 전환 미포함·실모델 의미 검증 대기 |
| [`D-0061`](./decisions/D-0061-problem-feedback-v4-synthetic-test.md) | accepted | 문제 피드백 가상 응답 시험 | 시험 방향 승인·4문항24응답/추가8반복/후속8경로 동결; 외부 전송 명시 승인 부족으로 API 실행 차단·호출0 |

| [`D-0062`](./decisions/D-0062-problem-feedback-v4-external-transfer-approved.md) | accepted | 가상 응답 시험 외부 전송 | 4문항 원자료·가상 응답·후속 대화의 OpenAI API 전송 명시 승인; 최대64요청·추정3달러, 운영 미변경 |

| [`D-0063`](./decisions/D-0063-problem-feedback-v4-hardening.md) | accepted | 문제 피드백 네 실패 보완 | 학생 결론 확인·최신 응답 인용·공개 코칭 검증·제한적 원문 복원과 오류별 재시도 구현 및 같은 4문항 재검증 승인; 교육 정책·UI·운영 전환 미변경 |

| [`D-0064`](./decisions/D-0064-developer-response-evaluation-drawer.md) | accepted | 개발자 응답 평가 서랍 | 현행 v3 평가 이력·학생 발화·모델 재구성·정오와 근거 검증을 읽기 전용 서랍에 분리; 전체 PPT UI/v4 연결 미포함 |

| [`D-0065`](./decisions/D-0065-developer-problem-v4-workbench-and-tunnel.md) | accepted | 개발자 v4 UI·터널 | PPT 구조 기반 3단·평가 서랍·v4 연결, 지정 공개 터널 opt-in 승인; 학생용 유지·기존 문단 세션 보존 |

| [`D-0066`](./decisions/D-0066-offline-axis-candidate-jev-pilot.md) | accepted | 오프라인 축 후보 JEV 시험 | 사용자 승인8문단·2/3/4축3회·고유 경계 후보·JEV5회 평균 선택; 제품 적용 보류 유지 |

| [`D-0067`](./decisions/D-0067-mrna-passage-axis-l1-l2-pilot.md) | accepted | mRNA 지문1/2/3/4축+별도L2 시험 | 전체문맥·문단별3회·JEV5회선택·L2별도생성, 단일지문오프라인승인·운영미변경 |

| [`D-0068`](./decisions/D-0068-near-score-fewer-axes-next-test.md) | accepted | 다음시험근소점수적은축우선 | 1/2위평균점수차≤0.10/4점이면적은축선택·과거결과유지 |

| [`D-0069`](./decisions/D-0069-clarify-user-instructions-before-work.md) | accepted | 프로젝트 작업 전 지시 확인 | 이해 불충분한 부분 목록 제시 → 하나씩 질문 → 사용자 답변으로 해소 여부 확인 후 작업 |

| [`D-0070`](./decisions/D-0070-v3-based-problem-prompt-draft-review.md) | accepted | v3 기반 문제 프롬프트 초안 | v3 판정·질문 지침 기반으로 합의한 v4 변경만 반영한 후보 작성·중요 포인트 검토. 실제 적용·재평가 미승인 |

| [`D-0071`](./decisions/D-0071-mrna-p4-l2-duplicate-merge-pilot.md) | accepted | mRNA4문단 L2 중복 병합 시험 | 원문·L1/L2 외부전송3호출 승인, 중복 확인 후 기존2축후보 선택·오프라인 한정 |

| [`D-0073`](./decisions/D-0073-current-gold-generation-name.md) | accepted | 현재 골드 생성 명칭 | 중심 이야기 기반 L1·L2 공동 생성; 자산버전·판정기·후속실험과 구분 |

| [`D-0072`](./decisions/D-0072-v3-based-problem-candidate-accepted-test-requested.md) | accepted | 문제 v3 기반 후보 승인·시험 | 후보 검토 완료·공손룡 포함 소규모 시험 요청. 3문항 준비 완료, 자동 승인 검토의 구체적 외부 전송 승인 요구로 API0 |

| [`D-0074`](./decisions/D-0074-problem-candidate-smoke-transfer-approved.md) | accepted | 문제 후보 외부 전송 시험 | 3문항·고정 응답의 API 전송 승인. 18요청 시험 완료, 공손룡 의미 판정 문제 잔존·후보 추가 수정/UI 교체 없음 |

| [`D-0075`](./decisions/D-0075-five-passage-source-axis-jev-comparison.md) | accepted | UI5지문 원문 골드 후보 비교 시험 | mRNA만 제외·OpenAI/Playground 전송 승인·근소 규칙/L2 병합 적용·오프라인 한정 |

| [`D-0076`](./decisions/D-0076-l2-suspected-duplicate-auto-merge.md) | accepted | 다음시험 L2 의심 자동 병합 | 의심 그룹을 재확인 없이 병합·FA 회피 우선·기존 시험 보존 |

| [`D-0077`](./decisions/D-0077-post-merge-axis-auditor.md) | accepted | 자동 병합 뒤 전체 축 감사 | 병합 후 과분해·불필요한 축·문구 결함 감사, 허용된 L2 추상화 유지·후속 D-0080 시험 완료 |

| [`D-0078`](./decisions/D-0078-gongsun-marker-ab-transfer-approved.md) | accepted | 공손룡 기호 보완 A/B 외부 전송 | 15요청 완료·분기7/7·후속1통과이나 내부 의미 오류 잔존·운영 미승격 |

## 상태 의미

| [`D-0085`](./decisions/D-0085-relation-only-rationale-sufficient.md) | accepted | 문제 근거 충분성 | 선지 핵심 전제를 정확히 부정한 관계 진술은 앞선 모순 없으면 근거 충분, 대응 채워넣기 금지 |

| [`D-0084`](./decisions/D-0084-local-marker-gloss-direction.md) | accepted | 기호 지칭 국소 해석본 | 기호·도표 지칭에 한해 문항별 해석본(기호 해석만)+인용 형식 규칙 방향, D-0002·D-0003 부분 대체, 운영 미연결 |

| [`D-0083`](./decisions/D-0083-inline-marker-interpretation-modes-pilot.md) | accepted | 기호 표시와 해석 표 두 방식 시험 | 한 호출/학생 응답 없는 별도 호출·대조 포함 각3반복·운영 미변경 |

| [`D-0082`](./decisions/D-0082-inline-source-marker-pilot.md) | accepted | 원문 내 기호 범위 표시 시험 | 동일 v3/응답·각3반복·외부 전송 승인, 의미 해석 규칙·제품 변경 제외 |

| [`D-0081`](./decisions/D-0081-original-v3-gongsun-transfer-approved.md) | accepted | 원래 v3 공손룡 역전 응답 외부 전송 | 같은 수정 기호 입력·3반복/최대6요청·추정1달러 승인, 운영 전환 제외 |

- `proposed`: 검토 중이며 정본 설계가 아님
- `accepted`: 현재 효력이 있음
- `rejected`: 검토했으나 채택하지 않음
- `superseded`: 더 최신 결정이 대체함
- `deprecated`: 역사적 호환 때문에 남아 있으나 새 작업에 적용하지 않음

| [`D-0079`](./decisions/D-0079-auto-merge-auditor-execution.md) | accepted | 자동 병합·감사 수정 실행 | 기존25문단에 직접 수정 감사 승인·준비 검증, 후속 D-0080 전송 승인/실행 완료 |

| [`D-0080`](./decisions/D-0080-auto-merge-audit-external-transfer-approved.md) | accepted | 병합·감사 외부 전송 | 25문단 원문/축→OpenAI 최대37회 명시 승인·37회 완료/71→60→46축·품질 검토 잔존 |

| [`D-0086`](./decisions/D-0086-auditor-min-two-axes-and-merge-contract.md) | accepted | 감사기 v2 최소 2축·병합 기록 | 도입·정리 외 일반 문단은 감사 후 최소2축(감사기만·예외 없음), FA 문구 수정·관계 중심 기준·병합 기록 계약 수용, 구현 준비·API0 |

| [`D-0087`](./decisions/D-0087-axis-audit-v2-transfer-approved.md) | accepted | 감사기 v2 외부 전송 | 25문단 원문/60축→OpenAI gpt-5.6-terra 최대25회·재시도0 명시 승인 |

| [`D-0088`](./decisions/D-0088-substantive-axis-minimum-two.md) | accepted | 감사기 v3 실질 설명 최소 2축 | D-0086 규칙2 수정: 원문 한 문장 소개·연결 축은 흡수·삭제 가능(코드 검사), 실질 설명 2개 이상이면 최소2축, 준비·API0 |

| [`D-0089`](./decisions/D-0089-axis-audit-v3-transfer-approved.md) | accepted | 감사기 v3 외부 전송 | 25문단 원문/60축→OpenAI gpt-5.6-terra 최대25회·재시도0 명시 승인 |
| [`D-0090`](./decisions/D-0090-problem-evaluator-v5-naming.md) | accepted | 문제 판정기 명칭 | 'v3 기반 v4 후보'를 v5로 부름(대화·문서만). v4는 운영 후보로 쓰지 않음 |
| [`D-0091`](./decisions/D-0091-v3-marker-phase-closed-port-to-v5.md) | accepted | 기호 실험 단계 | v3 기호 실험 마무리. 주장 분리·인용 규칙·승인 해석본을 v5로 옮김, 미해결 과제는 v5에서 |
| [`D-0092`](./decisions/D-0092-claude-codex-work-division.md) | accepted | 클로드·코덱스 업무 분장 | 클로드=주 사고 파트너, 코덱스=명시 시 보조 논의·확정 설계 실행. 인계 문서·중단 보고·diff 검토 |
| [`D-0093`](./decisions/D-0093-v5-composition-auto-gloss-pipeline.md) | accepted | v5 구성·자동 해석본 | v5 규칙 + 자동 중간안 해석본(독립 재도출 대조, 최대 3회차, 실패 시 해석본 없이) + v3 판정 방법. 사람 승인 해석본 미사용. 해석본 사용(2번)은 [D-0114](./decisions/D-0114-v5-current-composition-methods-without-gloss.md)로 보류 |

| [`D-0094`](./decisions/D-0094-source-jev-gold-flow-stopped.md) | accepted | 원문 분할·JEV 골드 흐름 중단 | 골드 생성 방향에서 제외·결과 보존. 최소2축(실질)·문단 기능·관계 기준은 새 방향으로 계승 |
| [`D-0095`](./decisions/D-0095-central-story-two-stage-generation.md) | accepted | 중심 이야기 두 단계 생성 실험 | 보강(원문 대조·덧붙이기만·문장 배정)→축 생성(최소2축 우선), 25문단·최대50회·별도 실험, Codex 인계 |

| [`D-0096`](./decisions/D-0096-central-story-two-stage-transfer-approved.md) | accepted | 두 단계 생성 외부 전송 | 25문단 원문·중심 이야기→OpenAI gpt-5.6-terra 최대50회·재시도0 명시 승인 |

| [`D-0097`](./decisions/D-0097-central-story-two-stage-v2.md) | accepted | 두 단계 생성 v2 | CONNECTIVE에 개관·요약 문장 포함, CONNECTIVE 내용·부수 정의 보충 금지(근거 인용 코드 검사), 1단계 centralStory 필드 제거, 25문단 재실행 |

| [`D-0098`](./decisions/D-0098-central-story-two-stage-v2-transfer-approved.md) | accepted | 두 단계 생성 v2 외부 전송 | 25문단 원문·중심 이야기→OpenAI gpt-5.6-terra 최대50회·재시도0, 검토 통과 후 실행 |

| [`D-0099`](./decisions/D-0099-central-story-two-stage-v3-no-role-exemption.md) | accepted | 두 단계 생성 v3 | 최소 축 수에서 도입·정리 문단 면제 제거(설명 단위≥2면 2), v2 1단계 재사용·4문단 2단계만 재실행 |

| [`D-0100`](./decisions/D-0100-central-story-two-stage-v3-transfer-approved.md) | accepted | 두 단계 생성 v3 외부 전송 | 4문단 2단계 입력(원문 미포함)→OpenAI gpt-5.6-terra 최대4회·재시도0 |

| [`D-0101`](./decisions/D-0101-holistic-verdict-shadow-experiment.md) | accepted | 문단 전체 판정 그림자 실험 | 운영 V4 유지, 실데이터 72시점·탐침 13개에 문단 전체 판정 H0/H1 오프라인 비교, 성공 규칙 사전 확정 |

| [`D-0102`](./decisions/D-0102-holistic-verdict-shadow-transfer-approved.md) | accepted | 그림자 실험 1차 외부 전송 | 원문·학생 발화72·탐침13·gold-v2 축→OpenAI gpt-5.6-terra 최대353회·재시도0 |

| [`D-0103`](./decisions/D-0103-holistic-verdict-axis-recording-direction.md) | accepted | 문단 판정 방향 | 질문 여부는 H0 전체 판정, 미확인 기록·질문 생성은 축 근거. 철회 규칙의 누락 통과 결함 확인. 운영 미변경 |

| [`D-0104`](./decisions/D-0104-problem-evaluator-model-routing-by-choice.md) | accepted | 문제 판정기 모델 라우팅 | 정답 선택 gpt-6-luna, 오답 선택 gpt-6.1-sol(둘 다 medium). 운영 코드 미변경, REPAIR 미검증 |

| [`D-0105`](./decisions/D-0105-correction-question-covers-choice-deciding-relation.md) | accepted | 교정 질문 규칙 방향 | 오류가 여러 관계를 담으면 선지 정오를 가르는 관계까지 한 질문으로 묻는 것을 권장(D-0106 뒤 필수→권장, 질문 수 늘리지 않음). 지시문 미변경 |

| [`D-0106`](./decisions/D-0106-post-repair-choice-reselect-or-coaching.md) | accepted | 교정 성공 뒤 흐름 | 오답: [다시 선택]/[코칭 보기], 정답·틀린 근거: [설명 보기]/[마치기]. 교정 실패는 설명 후 종료. 구현 미착수 |

| [`D-0107`](./decisions/D-0107-session-model-routing-repair-reselect-coaching.md) | accepted | 세션 안 모델 배정 | 모든 선택 판정은 그 선택의 정오(정답 luna·오답 sol), REPAIR는 luna 고정, 공개 코칭은 세션 정오 모델(오답 세션 sol은 별도 코칭 호출). 구현 미착수 |

| [`D-0108`](./decisions/D-0108-repair-judges-local-error-only.md) | accepted | 교정 판정 범위 | 질문이 겨냥한 국소 오류만 판정, 전역 이해는 학생이 재선택 여부로 판단. 짧은·일부 칸 답과 '아니요'는 고쳤음, 새 오류는 기록만. 지시문·서버 미변경 |

| [`D-0109`](./decisions/D-0109-trap-map-v0-external-rate-experiment.md) | accepted | 사고 추적기 함정 지도 실험 | 6문항 LLM 함정 지도(sol·luna 각3회, 상한3.5달러)를 메가스터디 선지별 선택 비율과 대조. 분석층 전용·모델은 비율 비공개. Codex 인계 |
| [`D-0110`](./decisions/D-0110-public-coaching-format-haeyo-and-markdown.md) | accepted | 공개 설명 형식 | 정답 세션 설명은 luna가 해요체 지시문으로 따로 생성(36칸 형식·내용 문제 0). 코칭 마크다운은 유지하고 화면이 렌더링. 운영 미반영 |

| [`D-0111`](./decisions/D-0111-thought-diagnosis-v0-experiment.md) | accepted | 사고 진단 v0 실험 | 가상 풀이 30개의 결과 유형·단계별 성공/실패·함정 유형 분류를 Claude·Codex 독립 라벨(불일치는 사용자 판정)과 대조. sol·luna 각3회, 상한4.5달러. Codex 인계 |
| [`D-0112`](./decisions/D-0112-v5-developer-path-connection-end-states.md) | accepted | v5 개발자 경로 종료 상태 | 정답·교정 실패는 정답·근거 미확인+luna 설명만, 오답 모든 종료 지점에 sol 해요체 코칭(공식 해설 제거, 정답 번호 유지) |
| [`D-0113`](./decisions/D-0113-work-tree-entry-map.md) | accepted | 메모리 진입점 | 제품 기능 단위 작업 수형도 `memory/WORK_TREE.md`를 작업 시작 때 먼저 읽고, 갈래 상태가 바뀐 작업 끝에 갱신. 검증기가 필수 파일·링크 검사 |
| [`D-0114`](./decisions/D-0114-v5-current-composition-methods-without-gloss.md) | accepted | v5 실제 구성 | 현재 v5는 해석본 없는 methods(규칙+주장 분리+인용 규칙). D-0093의 해석본 사용은 luna·sol 기호 오독 확인 전까지 보류 |

| [`D-0115`](./decisions/D-0115-thought-diagnosis-periodic-sol.md) | accepted | 사고 진단 운영 | 사고 진단은 주기 실행, 모델 sol 고정. 진단 결과는 실시간 판정기 입력 아님 |
| [`D-0116`](./decisions/D-0116-student-facing-tone-banmal.md) | accepted | 학생용 말투 | 고정 문구·교정 질문·종료 설명 모두 반말로 통일(D-0110 해요체 대체), 선지 조사 "①번을"(D-0112 3항 대체). 미반영 |
| [`D-0117`](./decisions/D-0117-end-coaching-sectioned-sequence.md) | accepted | 마지막 설명 구조 | 선지별 칸 → 정답 이유 → 이해 확인, 코드 연결 문장+[다음], 시작 확인 뒤 백그라운드 생성, 자기 보고 이해는 증거 아님. 미반영 |
| [`D-0118`](./decisions/D-0118-direct-correction-questions-and-highlight.md) | accepted | 교정 질문 직접성 | 학생 주장 직접 겨냥, 구체 사실로, 두 갈래 또는 짧은 직접 질문. 근거 구절 지문 표시. 미반영 |
| [`D-0119`](./decisions/D-0119-answer-path-elements-and-depth.md) | accepted | 문항 지도 정답 경로 | 요구 요소 E1~E10·선지별 연산 사슬(깊이) 추가, sol 1회 생성·동결. 채점: 정답=사슬 전체 성공, 오답=끊긴 고리 기록, 확인 질문 없음. 정답·오답 지표 분리. 실행 보류 |
| [`D-0120`](./decisions/D-0120-omitted-conclusion-reconstruction.md) | accepted | 결론 생략 재구성 | 사실이 선지 핵심 전제를 직접 다루고 판정이 한 방향이면 결론 생략도 재구성(D-0054 보완). 미반영 |
| [`D-0121`](./decisions/D-0121-answer-path-layers-and-failed-operation.md) | accepted | 정답 경로 깊이·오답 지표 | D-0119 일부 대체: 깊이=의존 층수(READ/LINK/APPLY), 오답=실패 노드 종류(위치 % 폐지), 정답 꼬리표(찍음·근거 오류), 오답 분모, 독립 재채점 일관성 |
| [`D-0122`](./decisions/D-0122-answer-path-depth-node-count.md) | accepted | 정답 경로 깊이 | D-0121 깊이 정의 대체: 깊이=선지 노드 수(READ+LINK+APPLY). 층은 지도 구조로만, 지표 아님 |
| [`D-0123`](./decisions/D-0123-answer-path-explicit-misstatement-priority.md) | accepted | 오답 실패 종류 귀속 | 지문과 어긋나는 사실 진술이 있으면 그 사실의 READ 노드 실패로 기록, 없을 때만 LINK·APPLY |
| [`D-0124`](./decisions/D-0124-answer-path-element-override-on-evidence.md) | accepted | 오답 실패 요소 | 기본은 실패 노드 요소, 풀이에 다른 요소 오류가 말로 드러날 때만 덮어쓰고 원래 요소·인용 보존 |
| [`D-0126`](./decisions/D-0126-answer-path-element-metric-failure-distribution.md) | accepted | 요소 누적 지표 | 리포트 요소 지표는 오답의 요소별 실패 분포만, 요소별 성공·실패 비율은 쓰지 않음(정답 수의 재표현) |
| [`D-0127`](./decisions/D-0127-section-lead-sentence-fixed-by-code.md) | accepted | 마지막 설명 첫 판정 문장 | 선지 칸 첫 문장(정답 인정·오답 판정)은 코드가 틀로 쓰고 모델은 다음 문장부터 씀. 학생 입장은 근거가 같은 방향일 때만 말함 |
| [`D-0132`](./decisions/D-0132-paragraph-judge-keep-v4.md) | accepted | 문단 판정기 V4 유지 | D-0103의 "판정은 H0"를 대체. C1(중심 이야기 판정) 진행 안 함. 경계 보여 주기 계산: (나) FA 7→2·질문 필요 8/11 강등, (가) 질문 불변. 사람 재판정 32/33 일관 |
| [`D-0133`](./decisions/D-0133-paragraph-boundary-rule-na-double-prime.md) | accepted | 문단 경계 처리 규칙 (나″) | ERROR·전체 SERIOUS → 질문, 일부 SERIOUS → 문단 끝 중심 이야기 보여 주기, OK만·PASS → 통과. 33시점: 질문 17→9·FA 7→2·질문 필요 7/11 질문. 새 응답 검증·UI는 별도 |
| [`D-0134`](./decisions/D-0134-boundary-show-dev-mode-central-object.md) | accepted | (나″) 사용감 시험 | 개발자 모드만, 질문 최대 1회, 2차 뒤 미해결은 보여 주기 종료. 보여 주기는 centralObject+놓친 축 구간 밑줄(손 연결 3지문), 반말, 고쳐 쓰기는 기록만. 만족 시 별도·지문 단위 API 생성 |
| [`D-0135`](./decisions/D-0135-boundary-show-error-question-per-axis.md) | accepted | 보여 주기 모드 오류 축마다 질문 | D-0134 질문 1회 상한 대체: 상한=1차 ERROR 축 수, 축마다 한 번(재질문 없음), 실패는 고정 문구로 알리고 다음 오류 축, 끝나면 남은 ERROR·SERIOUS 모두 표시. 오류 없으면 기존 (나″) |
| [`D-0136`](./decisions/D-0136-boundary-show-banmal-question-feedback.md) | accepted | 보여 주기 모드 질문·피드백 반말 | 개발자 모드 전용 피드백 프롬프트 변형으로 질문·피드백 반말, 코드 고정 문구도 모드별 반말. 운영 V4는 그대로, 시험 후 같은 버전 운영 반영은 별도 승인 |
| [`D-0137`](./decisions/D-0137-boundary-show-effective-response-restatement.md) | accepted | 보여 주기 모드 재구성 응답 | 피드백의 학생 응답 재진술과 "내 요약"은 그 시점 게이트 `effectiveResponse`(추가 호출 없음). 그림 문구는 예시. 3인칭 보고체·빠진 내용 언급은 시험에서 관찰 |
| [`D-0138`](./decisions/D-0138-paragraph-fundamental-review-question-quality-first.md) | accepted | 문단 요약 근본 검토 | 축 구조 전제를 검토 대상으로 둠. 보여 주기 모드(D-0134~0137) 구현 중지·기록 보존. 첫 확인은 H0 대 V4 질문 10쌍 블라인드 비교(API 0) |
| [`D-0139`](./decisions/D-0139-paragraph-simple-format-question-rules.md) | accepted | 문단 질문 생성 방향 | D-0103 "질문 생성은 축 근거" 대체. 단순 형식(전체 판정+질문 하나), 가장 큰 구멍=전체 관계의 빈 곳, 질문 규칙 4(전체 관계·답 미노출·반복 금지·하나만). 새 응답 검증 뒤 채택 |
