# Diagnostic full-session synthetic student simulation — Desktop report

Date: 2026-11-13. UI: local `/diagnostic?dev=1`, fresh browser origin `http://localhost:5173` to avoid prior local storage; same app as the supplied `127.0.0.1:5173` URL. One participant, four passages, 22 paragraph summaries, 16 item submissions, four wrong-answer review paths, and final result. All inputs were deliberately scripted synthetic responses. No real-student evidence, calibration validation, code change, or deployment.

## Conditions and measured output

| Passage | Paragraphs completed | First-choice correct | Wrong item and correction |
|---|---:|---:|---|
| 의식과 인지 과정 | 8/8 | 4/5 | 14: ⑤→①, subject/object order corrected |
| 경마식 보도와 선거 방송 토론회 | 4/4 | 3/4 | 6: ⑤→②, exact condition in option reread |
| 플라스틱 중합과 물성 | 5/5 | 2/3 | 8: ⑤→④, double-bond strengths and initiator subject corrected |
| 오디오 지각부호화 | 5/5 | 3/4 | 16: ③→⑤, minimum audible intensity distinguished from critical-band width |
| Total | 22/22 | 12/16 | Four review paths completed; first-choice score retained |

Final UI: 3등급, highest displayed probability 43%; progression for 3등급 31%→36%→39%→43% after passages 1–4. `근거까지 정확한 정답 5 / 근거를 판정한 정답 7`; five correct answers without written rationale (SURE 2, UNSURE 2, elimination 1). Wrong-option trap count: direction reversal 2, positive/negative reversal 1, unsupported addition 1. First-summary-only reading pattern: paragraph gist 18/22, groups 58/75, details 112/180; category counts relationships 15/28, claim/evidence 36/66, stances 2/7, flow 1/3. These are UI outputs, not validated psychometric measurements.

## Paragraph response ledger

| Passage / paragraph | Synthetic first response | Observed trajectory |
|---|---|---|
| Consciousness 1 | Accurate identity/functionalist contrast | Both axes immediate capture |
| Consciousness 2 | “Chinese room criticizes functionalism” only | Follow-up asked key comparison; correction about same output without understanding accepted |
| Consciousness 3 | False: cognition only within body; notebook merely example | Follow-up corrected to body/environment coupling |
| Consciousness 4 | Correct derived state versus mental state and integration | Immediate capture |
| Consciousness 5 | Two-world perception difficulty | Immediate capture |
| Consciousness 6 | Two objectivist positions but missed common premise; follow-up “의식과 물질을 구분” | Feedback corrected to subject/object separation before perception; no student recovery |
| Consciousness 7 | Entanglement before subject/object split; sensation and perception linked | Immediate capture |
| Consciousness 8 | Bodily experience of perception | Immediate capture |
| Horse race 1 | Participation benefit and issue/fairness cost | Immediate capture |
| Horse race 2 | False: ban on conducting polls six days before election; ranking allowed inside error margin | Both errors explicitly corrected; false `지금까지 내 요약` remained |
| Horse race 3 | Debate supplements issue comparison; invitation criteria and separate debate | Immediate capture |
| Horse race 4 | Majority efficiency versus minority discrimination | Immediate capture |
| Plastic 1 | Short but accurate definition | Immediate capture |
| Plastic 2 | Monomer, covalent/single/double bond, carbon skeleton | Immediate capture |
| Plastic 3 | Ethylene polymerization and weaker bond | Immediate capture |
| Plastic 4 | False reversal: initiator stops growth, chain-end meeting restarts it | Both stages explicitly corrected; false `지금까지 내 요약` remained |
| Plastic 5 | Crystallinity property tradeoffs and use | Immediate capture |
| Audio 1 | Phonograph groove and analog storage | Follow-up asked whether later media were analog; answer accepted |
| Audio 2 | Digital bits and compression need | Immediate capture |
| Audio 3 | Perceptual coding and threshold, missing frequency dependence | Follow-up asked frequency dependence; answer accepted |
| Audio 4 | Masking, critical band, masking threshold | Immediate capture |
| Audio 5 | Threshold-based removal and variable bit allocation | Immediate capture |

## Item response ledger

| Item | Initial choice / response mode | UI classification | Review or notable behavior |
|---|---|---|---|
| Consciousness 12 | ①, full correct rationale | SUPPORTED_CORRECT | — |
| Consciousness 13 | ③, weak/misleading notebook rationale | WEAK_CORRECT | No review path offered for correct choice |
| Consciousness 14 | ⑤, unsure/no rationale | WRONG | Asked for rationale despite initial omission, targeted order of perception and subject/object, reselected ① with correct rationale |
| Consciousness 15 | ②, sure/no rationale | SURE_CORRECT | — |
| Consciousness 16 | ③, correct derived-state rationale | SUPPORTED_CORRECT | — |
| Horse race 4 | ⑤, elimination | WEAK_CORRECT (소거법) | — |
| Horse race 5 | ③, accurate rights-versus-restriction rationale | SUPPORTED_CORRECT | — |
| Horse race 6 | ⑤, reasoning collapsed exact conditional | WRONG | Question contrasted student's paraphrase with option condition; reselected ② correctly |
| Horse race 7 | ②, unsure/no rationale | UNSURE_CORRECT | Table given as image; no rationale analyzed |
| Plastic 8 | ⑤, asserted double-bond strengths equal | WRONG | Asked strength comparison; corrected and reselected ④ |
| Plastic 9 | ①, “text says chain end, not both ends” | WEAK_CORRECT | Short exclusion did not establish all necessary detail |
| Plastic 10 | ③, crystallinity and chemical resistance rationale | SUPPORTED_CORRECT | — |
| Audio 14 | ③, 2nd paragraph did not present loudness as compression variable | SUPPORTED_CORRECT | — |
| Audio 15 | ③, sure/no rationale | SURE_CORRECT | — |
| Audio 16 | ③, incorrectly inferred low-frequency critical band wider | WRONG | Asked which frequency has wider critical band; corrected and reselected ⑤ |
| Audio 17 | ⑤, unsure/no rationale | UNSURE_CORRECT | Table given as image; no rationale analyzed |

## Findings and interpretation

1. **Q-0050 reproduced in two more passages.** Horse-race P2 and plastic P4 feedback correctly identified explicit false relations, yet `지금까지 내 요약` retained them as current-sounding statements. This extends the prior consciousness P2 example in `docs/experiments/diagnostic-mixed-review-2026-11-13/REPORT-mixed-student-desktop.md`. The current label and contents conflict with the completed correction. Trace `restatedSummary` generation and rendering before changing behavior. Acceptance cases: these exact two synthetic first responses, feedback, then corrected current summary distinguished from original utterance.
2. **Local-error coaching succeeded in this scripted run.** Each wrong item used the user's stated misconception or a specific unsupported relation, accepted a corrected answer, then allowed a reasoned reselect. The result kept the initial wrong marker. This is observed interface behavior for selected inputs, not evidence that students will recover or transfer to new items.
3. **Correct-answer quality categories were differentiated.** `WEAK_CORRECT` appeared for consciousness 13 and plastic 9, while five other reasoned correct answers were `SUPPORTED_CORRECT`. SURE, UNSURE, and elimination were displayed separately. `UNKNOWN` was not elicited here; Q-0048 cannot be closed by this run.
4. **Result communication remains ambiguous.** `12/16` is explicitly first choice only in our report, but the UI does not place a clear first-choice label next to that number while all four reviews were subsequently corrected. “첫 요약만” is present in the reading-pattern section; the 18/22 gist figure omits follow-up recovery. The selected wrong-choice trap taxonomy is a property of choices and should not be equated automatically with personal reasoning. Final recommendation names “방향 뒤집기(2번)” but no direct practice/review link was observed.
5. **UI flow and density.** Per-item hidden results and required wrong-item reviews impose many clicks. The dual correct-rate percentages are explained only in the passage-result footer. At the observed 1280×720 viewport with developer map open, item 17's table was clipped inside the question column and required internal scrolling; this setup is insufficient to judge the public student layout. No mobile breakpoint was tested. No exact model latency was measured.

## Proposed follow-up

- Resolve Q-0050's display rule and implement a corrected, clearly attributed current summary; preserve the student's words in dialogue history. Replay consciousness P2, horse-race P2, and plastic P4.
- Clarify first-choice score versus coached reselect; repeat “first summary only” close to reading-pattern counts. Label both correct-rate percentages inline by subject.
- Check Q-0048 `UNKNOWN`/`INSUFFICIENT` live branches separately. Review whether trap counts and recommendations should say “선지의 특징” unless a student's reason supports a causal diagnosis.
- Obtain actual student observation before claiming usability, learning effect, or calibrated grade accuracy.
