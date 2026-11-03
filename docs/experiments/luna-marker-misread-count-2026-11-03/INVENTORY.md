# INVENTORY — luna 기호 오독 집계 1단계

`node scripts/collect-luna-marker-outputs.mjs`가 만든다. 외부 호출 없음. 열 설명: 읽은 파일 수 / 파싱 실패 파일 수 / luna 출력 수(중복 제거 전) / 6문항 luna 출력 수(v5 이후, 중복 제거 전) / 기호 후보 수(발생 기준, 중복 제거 전).

규칙 메모: (1) 같은 출력이 요청 로그·세션 묶음·jsonl 에 여러 번 기록돼 있어 "중복 제거 전" 수는 발생 횟수다. (2) choiceId 는 그 호출이 다루는 선택(selection.choiceId, 없으면 마지막 SELECT 관찰, 없으면 finalSelectedChoice)이고 firstChoiceId 는 첫 선택이다. (3) callKind 를 응답 스키마 이름·instructions 로 정할 수 없을 때 기록의 kind 값(예 ASSESSMENT)을 쓴다. (4) promptVersion 은 instructions 첫 줄 제목, 없으면 기록의 promptVersion 값이다. (5) 요청 입력에 문항이 없으면 지문·선지 원문을 6문항 요청 입력과 대조하거나 폴더의 cases.json 으로 정한다. (6) sessionKind 는 choiceId 가 없으면 기록의 correctChoice 로 정하고, 둘 다 없으면 UNKNOWN 이다.

| 폴더 | 읽은 파일 | 파싱 실패 | luna 출력 | 6문항 luna 출력 | 기호 후보 | (제외: v5 이전) | (제외: 6문항 아님·문항 미상) |
|---|---:|---:|---:|---:|---:|---:|---:|
| .omc | 22 | 0 | 0 | 0 | 0 | 0 | 0 |
| analysis-gold-calibration-2-2026-10-21 | 65 | 0 | 0 | 0 | 0 | 0 | 0 |
| analysis-gold-calibration-2026-10-20 | 135 | 0 | 0 | 0 | 0 | 0 | 0 |
| analysis-gold-ui-2026-10-21 | 112 | 0 | 0 | 0 | 0 | 0 | 0 |
| analysis-map-dopamine-2026-10-18 | 31 | 0 | 0 | 0 | 0 | 0 | 0 |
| analysis-map-gongsun-2026-10-16 | 49 | 0 | 0 | 0 | 0 | 0 | 0 |
| analysis-map-sample-2026-10-19 | 165 | 0 | 0 | 0 | 0 | 0 | 0 |
| analysis-view-2026-10-27 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| answer-path-depth-pilot-2026-10-13 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| answer-path-depth-pilot-v2-2026-10-13 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| answer-path-sol-e2e-2026-10-13 | 229 | 0 | 0 | 0 | 0 | 0 | 0 |
| answer-path-wrong-cases-2026-10-13 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-audit-v2-min-two-2026-10-06 | 130 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-audit-v3-substantive-min-two-2026-10-07 | 132 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-auto-merge-audit-five-passages-2026-10-02 | 206 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-candidate-jev-eight-2026-10-02 | 130 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-candidate-jev-five-passages-2026-10-02 | 684 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-candidate-jev-mrna-passage-2026-10-02 | 104 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-concrete-meaning-two-paragraphs-2026-09-29 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-context-isolation-v1-2026-09-20 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-core-filter-six-2026-09-20 | 12 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-counterfactual-context-v1-2026-09-21 | 12 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-direct-judgment-v1-2026-09-20 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-direct-judgment-v2-relational-boundary-2026-09-20 | 12 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-expression-recheck-corporate-p2-2026-09-29 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-function-filter-six-2026-09-20 | 11 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-meaning-filter-only-2026-09-20 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| axis-relation-decomposition-2026-09-20 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| central-story-two-stage-2026-10-07 | 218 | 0 | 0 | 0 | 0 | 0 | 0 |
| central-story-two-stage-v2-2026-10-07 | 226 | 0 | 0 | 0 | 0 | 0 | 0 |
| central-story-two-stage-v3-2026-10-07 | 25 | 0 | 0 | 0 | 0 | 0 | 0 |
| choice-link-2026-10-22 | 296 | 0 | 0 | 0 | 0 | 0 | 0 |
| choice-link-end-explanation-compare-2026-10-23 | 387 | 0 | 12 | 12 | 3 | 0 | 0 |
| conditional-meta-natural-eight-2026-10-01 | 18 | 0 | 0 | 0 | 0 | 0 | 0 |
| conditional-meta-ui-2026-10-01 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| corporate-ui-exact-replay-2026-09-29 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| dialogue-axis-v3-mrna-2026-09-18 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| dialogue-axis-v31-cross-paragraph-2026-09-18 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| dialogue-error-recording-fix-2026-09-19 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| dialogue-gate-contract-retry-canary-2026-09-11 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| dialogue-selective-router-regression-42-2026-09-09 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| dialogue-selective-router-v2-regression-42-2026-09-09 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| dialogue-three-reference-followup-quality-42-2026-09-08 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| dialogue-three-reference-paragraph-summary-15-2026-09-07 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| dialogue-three-turn-concise-vs-hybrid-42-2026-09-08 | 14 | 0 | 0 | 0 | 0 | 0 | 0 |
| dialogue-v4-sensitive-2026-09-19 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| dual-routing-sensitive-six-2026-09-30 | 22 | 0 | 0 | 0 | 0 | 0 | 0 |
| end-explanation-layout-2026-10-28 | 30 | 0 | 9 | 9 | 0 | 0 | 0 |
| end-explanation-paragraph-marks-2026-10-31 | 19 | 0 | 0 | 0 | 0 | 0 | 0 |
| end-explanation-paragraph-marks-v21-2026-10-31 | 29 | 0 | 0 | 0 | 0 | 0 | 0 |
| end-explanation-paragraph-marks-v22-2026-11-02 | 31 | 0 | 0 | 0 | 0 | 0 | 0 |
| end-explanation-paragraph-preview-2026-10-30 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| end-inferred-asked-2026-10-28 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| examiner-strategy-2026-10-23 | 446 | 0 | 3 | 3 | 0 | 0 | 0 |
| gongsun-auto-gloss-formats-2026-10-07 | 62 | 0 | 0 | 0 | 0 | 0 | 0 |
| gongsun-claim-split-2026-10-06 | 20 | 0 | 0 | 0 | 0 | 0 | 0 |
| gongsun-gloss-arms-2026-10-06 | 55 | 0 | 0 | 0 | 0 | 0 | 0 |
| gongsun-gloss-examples-2026-10-06 | 58 | 0 | 0 | 0 | 0 | 0 | 0 |
| gongsun-interpretation-modes-2026-10-03 | 25 | 0 | 0 | 0 | 0 | 0 | 0 |
| gongsun-marker-input-ab-2026-10-02 | 20 | 0 | 0 | 0 | 0 | 0 | 0 |
| gongsun-marker-quote-revalidation-2026-10-06 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| gongsun-quote-format-2026-10-07 | 26 | 0 | 0 | 0 | 0 | 0 | 0 |
| gongsun-response-types-2026-10-06 | 22 | 0 | 0 | 0 | 0 | 0 | 0 |
| gongsun-v3-inline-markers-ab-2026-10-03 | 11 | 0 | 0 | 0 | 0 | 0 | 0 |
| gongsun-v3-reversed-response-2026-10-02 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| holistic-verdict-shadow-2026-10-08 | 31 | 0 | 0 | 0 | 0 | 0 | 0 |
| jev-attribution-v1-2026-09-23 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| jev-candidate-sensor-audit-v1-2026-09-23 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| jev-choice-shift-2026-10-29 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| jev-collision-single-question-ab-v1-2026-09-23 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| jev-element-normalization-dopamine-v1-2026-09-23 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| jev-error-input-v1-2026-09-23 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| jev-materiality-information-asymmetry-v1-2026-09-23 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| jev-mr-coverage-information-asymmetry-v1-2026-09-23 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| jev-playground-sensitive-v1-2026-09-23 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| jev-semantic-elements-dopamine-pilot-v1-2026-09-23 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| jev-v4-natural-agreement-v1-2026-09-29 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| judge-reading-paraphrase-d1-2026-10-28 | 230 | 0 | 49 | 49 | 7 | 0 | 0 |
| k4-blank-probe-2026-10-27 | 31 | 0 | 14 | 14 | 1 | 0 | 0 |
| marker-gloss-generator-gongsun-2026-10-06 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| marker-gloss-generator-v2-gongsun-2026-10-07 | 11 | 0 | 0 | 0 | 0 | 0 | 0 |
| marker-gloss-pipeline-gongsun-2026-10-07 | 12 | 0 | 0 | 0 | 0 | 0 | 0 |
| marker-gloss-pipeline-v2-gongsun-2026-10-07 | 13 | 0 | 0 | 0 | 0 | 0 | 0 |
| meta-axis-evaluation-corporate-p4-2026-09-29 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| meta-axis-generation-corporate-p4-2026-09-29 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| mrna-p4-l2-merge-2026-10-02 | 12 | 0 | 0 | 0 | 0 | 0 | 0 |
| natural-response-disagreement-v1-2026-09-21 | 14 | 0 | 0 | 0 | 0 | 0 | 0 |
| paragraph-boundary-stability-2026-10-28 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| paragraph-gap-question-v48-2026-10-28 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| paragraph-gold-audit-v2-batch003-retrospective-2026-09-04 | 19 | 0 | 0 | 0 | 0 | 0 | 0 |
| paragraph-gold-collaborative-reaudit-16-2026-09-09 | 42 | 0 | 0 | 0 | 0 | 0 | 0 |
| paragraph-gold-integrated-audit-v2-batch004-regression-2026-09-04 | 15 | 0 | 0 | 0 | 0 | 0 | 0 |
| paragraph-gold-integrated-audit-v2-batch004-regression-v2-2026-09-04 | 14 | 0 | 0 | 0 | 0 | 0 | 0 |
| paragraph-gold-integrated-audit-v2-v4-batch004-2026-09-04 | 20 | 0 | 0 | 0 | 0 | 0 | 0 |
| paragraph-gold-split-audit-batch-004-2026-09-04 | 118 | 0 | 0 | 0 | 0 | 0 | 0 |
| paragraph-initial-stability-2026-10-29 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| principle-exception-adjudicator-batch004-2026-09-04 | 11 | 0 | 0 | 0 | 0 | 0 | 0 |
| principle-exception-adjudicator-v2-five-case-2026-09-04 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| principle-exception-adjudicator-v3-four-case-2026-09-04 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| principle-exception-adjudicator-v3-stability-2026-09-04 | 17 | 0 | 0 | 0 | 0 | 0 | 0 |
| principle-exception-adjudicator-v4-regression-2026-09-04 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| principle-exception-scope-gate-offline-2026-09-04 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-basic-probes-terra-luna-2026-09-02 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-basic-probes-terra-luna-v3-2026-09-02 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-boundary-target-probes-v2-2026-09-02 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-boundary-target-probes-v3-2026-09-02 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-boundary-target-probes-v4-2026-09-02 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-four-route-correct-probes-2026-09-02 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-four-route-correct-probes-postprocessor-fix-2026-09-02 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-four-route-wrong-probes-2026-09-02 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-selected-option-risk-probes-2026-09-02 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-selected-option-risk-probes-v2-2026-09-02 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-selected-option-slice-ab-2026-09-02 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-selected-option-slice-ab-v2-2026-09-02 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-source-only-first-turn-ab-2026-09-06 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-support-route-boundary-probes-terra-v1-2026-09-02 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-support-route-boundary-probes-v1-2026-09-02 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-support-route-boundary-probes-v2-2026-09-02 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-support-route-boundary-probes-v3-2026-09-02 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-support-route-boundary-probes-v4-2026-09-02 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-terra-luna-quality-2026-09-02 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-three-reference-ab-2026-09-06 | 13 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-three-reference-combined-15-item-2026-09-06 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-evaluator-three-reference-low-skill-10-item-2026-09-06 | 40 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-feedback-v4-hardening-2026-10-01 | 51 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-feedback-v4-synthetic-2026-10-01 | 45 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-gold-explanation-audit-cycle-2026-09-02 | 153 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-gold-explanation-cycle-2026-09-01 | 210 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-gold-extrapolation-2026-09-01 | 125 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-gold-prospective-blind-2026-09-03 | 215 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-gold-selective-visual-canary-2026-09-04 | 79 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-solution-profile-2026-09-02 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-source-direct-live-canary-2026-09-08 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-source-direct-multi-image-canary-2026-09-09 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-source-direct-risk-format-canary-2026-09-08 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-source-direct-v2-full-cycle-seven-2026-09-11 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-source-direct-v3-intermediate-canary-2026-09-11 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-source-direct-v3-targeted-canary-2026-09-11 | 14 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-source-markers-2026-10-02 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| problem-v3-based-v4-smoke-2026-10-02 | 20 | 0 | 0 | 0 | 0 | 0 | 0 |
| prospective-paragraph-gold-24-2026-09-04 | 780 | 0 | 0 | 0 | 0 | 0 | 0 |
| question-actionability-corporate-p2-2026-09-29 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| question-quality-h0-vs-v4-2026-10-15 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| question-shift-dopamine-p3-2026-10-02 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| question-shift-gongsun-p3-2026-10-02 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| question-shift-human-eight-2026-10-02 | 54 | 0 | 0 | 0 | 0 | 0 | 0 |
| question-shift-mrna-p5-2026-10-02 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| question-shift-mrna-p5-no-helpers-2026-10-02 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| relation-classify-2026-10-19 | 314 | 0 | 0 | 0 | 0 | 0 | 0 |
| simple-holistic-path-simulation-2026-10-17 | 30 | 0 | 0 | 0 | 0 | 0 | 0 |
| single-call-materiality-2026-09-20 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| student-fingerprint-2026-10-21 | 19 | 0 | 0 | 0 | 0 | 0 | 0 |
| student-sim-2026-10-29 | 13 | 0 | 0 | 0 | 0 | 0 | 0 |
| student-sim-2026-10-30 | 38 | 0 | 0 | 0 | 0 | 0 | 0 |
| thought-diagnosis-v0-2026-10-10 | 193 | 0 | 90 | 90 | 0 | 0 | 0 |
| thought-diagnosis-v01-2026-10-10 | 236 | 0 | 108 | 108 | 0 | 0 | 0 |
| trap-map-jev-choice-2026-10-10 | 70 | 0 | 0 | 0 | 0 | 0 | 0 |
| trap-map-jev-four-choice-2026-10-10 | 70 | 0 | 0 | 0 | 0 | 0 | 0 |
| trap-map-v0-external-rates-2026-10-10 | 46 | 0 | 19 | 19 | 0 | 0 | 0 |
| v4-light-output-v1-2026-09-22 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| v4-output-b1-natural-2026-09-22 | 23 | 0 | 0 | 0 | 0 | 0 | 0 |
| v4-output-branch-a-short-intent-2026-09-22 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| v4-output-branch-b1-compact-ledger-2026-09-22 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| v4-output-field-ablation-s2-2026-09-22 | 13 | 0 | 0 | 0 | 0 | 0 | 0 |
| v4-output-field-ablation-s3-2026-09-22 | 16 | 0 | 0 | 0 | 0 | 0 | 0 |
| v4-output-field-ablation-v1-2026-09-22 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-absence-falsity-type-r2-user-2026-10-22 | 56 | 0 | 11 | 11 | 2 | 0 | 0 |
| v5-absence-falsity-type-user-2026-10-22 | 81 | 0 | 15 | 15 | 2 | 0 | 0 |
| v5-chosen-option-recheck-2026-10-11 | 46 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-coaching-fix-2026-10-10 | 55 | 0 | 36 | 36 | 0 | 0 | 0 |
| v5-contradiction-sufficiency-r2-user-2026-10-21 | 68 | 0 | 14 | 14 | 14 | 0 | 0 |
| v5-contradiction-sufficiency-user-2026-10-21 | 52 | 0 | 10 | 10 | 10 | 0 | 0 |
| v5-diverse-48-2026-10-12 | 614 | 0 | 55 | 55 | 9 | 0 | 0 |
| v5-diverse-48-b3-recheck-2026-10-22 | 123 | 0 | 6 | 6 | 1 | 0 | 0 |
| v5-diverse-48-regression-2026-10-22 | 610 | 0 | 76 | 76 | 15 | 0 | 0 |
| v5-diverse-48-regression-2026-10-26 | 156 | 0 | 25 | 25 | 4 | 0 | 0 |
| v5-diverse-48-regression-2026-10-27-v53 | 99 | 0 | 10 | 10 | 0 | 0 | 0 |
| v5-diverse-48-regression-2026-10-27-v53-b | 149 | 0 | 24 | 24 | 5 | 0 | 0 |
| v5-diverse-48-regression-2026-10-28-v56 | 161 | 0 | 25 | 25 | 5 | 0 | 0 |
| v5-hypothesis-user-2026-10-19 | 129 | 0 | 13 | 13 | 3 | 0 | 0 |
| v5-hypothesis-user-2026-10-19-controls | 44 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-judgment-method-r2-user-2026-10-21 | 26 | 0 | 4 | 4 | 0 | 0 | 0 |
| v5-judgment-method-user-2026-10-21 | 41 | 0 | 7 | 7 | 1 | 0 | 0 |
| v5-lead-sentence-2026-10-14 | 68 | 0 | 7 | 7 | 3 | 0 | 0 |
| v5-lead-user-2026-10-21 | 82 | 0 | 4 | 4 | 1 | 0 | 0 |
| v5-live-check-2026-10-13 | 173 | 0 | 19 | 19 | 0 | 0 | 0 |
| v5-live-check-2026-10-13-r2 | 76 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-live-check-2026-10-13-r3 | 58 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-live-check-2026-10-13-r4 | 34 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-live-check-2026-10-13-r5 | 80 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-live-connection-2026-10-10 | 116 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-marker-judgment-gongsun-2026-10-07 | 83 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-mismatch-repair-2026-10-14 | 33 | 0 | 4 | 4 | 1 | 0 | 0 |
| v5-mismatch-repair-2026-10-14-r2 | 16 | 0 | 3 | 3 | 0 | 0 | 0 |
| v5-multi-item-luna-sol-2026-10-08 | 244 | 0 | 162 | 162 | 1 | 0 | 0 |
| v5-multi-item-luna-sol-review-2026-10-08 | 22 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-provider-compare-1017-2026-10-22 | 194 | 0 | 100 | 66 | 66 | 0 | 34 |
| v5-provider-compare-gongsun-2026-10-07 | 116 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-provider-compare-review-2026-10-08 | 12 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-repair-desk-check-2026-10-10 | 30 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-repair-test-2026-10-10 | 526 | 0 | 890 | 890 | 4 | 0 | 0 |
| v5-repair-test-2026-10-10-review | 20 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-reselection-sections-2026-10-14 | 284 | 0 | 48 | 48 | 11 | 0 | 0 |
| v5-style-user-2026-10-20 | 107 | 0 | 10 | 10 | 1 | 0 | 0 |
| v5-substitution-check-gongsun-2026-10-07 | 73 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-substitution-check-review-2026-10-07 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-substitution-check-v2-gpt-6-luna-gongsun-2026-10-07 | 75 | 0 | 72 | 72 | 71 | 0 | 0 |
| v5-substitution-check-v2-gpt-6.1-sol-gongsun-2026-10-07 | 72 | 0 | 0 | 0 | 0 | 0 | 0 |
| v5-supported-coverage-r2-user-2026-10-21 | 58 | 0 | 11 | 11 | 2 | 0 | 0 |
| v5-supported-coverage-r3-user-2026-10-21 | 42 | 0 | 7 | 7 | 1 | 0 | 0 |
| v5-supported-coverage-user-2026-10-21 | 88 | 0 | 17 | 17 | 5 | 0 | 0 |
| v5-target-mismatch-2026-10-14 | 73 | 0 | 1 | 1 | 1 | 0 | 0 |
| v53-three-cell-check-2026-10-27 | 249 | 0 | 59 | 59 | 1 | 0 | 0 |
| v53-three-cell-check-2026-10-27-b | 229 | 0 | 48 | 48 | 1 | 0 | 0 |
| v57-regression-2026-10-29 | 303 | 0 | 43 | 43 | 5 | 0 | 0 |
| v58-conclusion-2026-10-29 | 261 | 0 | 39 | 39 | 6 | 0 | 0 |
| **합계** | 14644 | 0 | 2179 | 2145 | 263 | 0 | 34 |

## 합계와 중복 제거

- 전체 luna 출력: 중복 제거 전 2179, 후 1665
- 6문항·v5 이후 luna 출력: 중복 제거 전 2145, 후 1664
- 기호 후보: 중복 제거 전 263, 후 228
- 제외(중복 제거 후): v5 이전 0, 6문항 아님 0, 문항 미상 1
- 파싱 실패(output_text가 JSON 아님) 후보 외 출력(중복 제거 후): 0
- 모델 값 집계(전체 output_text 발생, luna 여부 무관): gpt-5.6-terra: 2192, gpt-6-luna: 2179, gpt-6.1-sol: 1706, deepseek-flash: 431, UNKNOWN: 223, gemini-3.8-flash: 206, deepseek-v4-pro: 19
- 후보의 모델 값 집계: gpt-6-luna: 228
- 모델을 정할 수 없는(UNKNOWN) 출력 발생 수: 223
- 후보 문항별: gongsun-long-later-mohists-q12: 197, dopamine-motor-control-q13: 24, information-asymmetry-free-marketplace-q13: 7
- 후보 callKind별: problem_feedback_v4_assessment: 139, ASSESSMENT: 33, problem_feedback_assessment: 28, problem_feedback_v4_end_explanation: 21, problem_feedback_end_explanation: 6, blank_check: 1
- 후보 sessionKind별: CORRECT: 175, WRONG: 53
- 후보 promptVersion별: 문제 풀이 판정 — v3 기반 v4 연결 후보: 139, problem-feedback-v5: 33, null: 28, v5.3: 13, v5.8: 6, v5.7: 4, v5.1: 4, v5.7-1: 1
- 후보 중 callKind UNKNOWN 0, sessionKind UNKNOWN 0, promptVersion null 28
- 같은 출력인데 문항·선택·callKind가 서로 다르게 기록된 경우: 0건

## 모델을 정할 수 없어 건너뛴 출력이 있는 파일 (1)

- docs/experiments/holistic-verdict-shadow-2026-10-08/mock/responses.jsonl

## 형식을 알 수 없어 건너뛴 파일 (0)

