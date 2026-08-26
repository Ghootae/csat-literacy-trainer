# Dialogue axis architecture v2 checkpoint — 2026-08-26

## Decision

The role-free axis architecture is accepted as an implementation checkpoint.

- `paragraph-analysis-prompt-v3.1` remains the human-reviewed central-story candidate generator.
- Axis decomposition receives only `paragraphId` and `centralStory`.
- A separate mapping stage attaches atomic core relations after the axes are fixed.
- Core relations follow `one relation = one state and one error`; they are not question units.
- The new axis dialogue path does not generate or consume `required/error_only`.
- Existing role-based APIs remain available only as comparison and regression paths.

## Experiment

The stored v3.1 analyses for six paragraphs were reused. Each paragraph had three independently
generated v3.1 candidates. Only axis decomposition and relation mapping were called again.

- Model: `gpt-5.6-sol`
- Reasoning effort: `medium`
- Final batch: 18 decompositions + 18 mappings
- READY: 18/18
- NEEDS_REVIEW: 0
- Failed/retried: 0/0
- Unmapped core relations: 0
- Decomposition prompt hash: `sha256:188b204d0ce27286c500d7deb3cc2c0c54da67cd9ed4200a7d6794c34d606dfc`
- Mapping prompt hash: `sha256:490df76cd0fe57aa9a7a446e76717a967d8c1c70bd902f9992f6d53c7c2743e7`

| Paragraph | Expected axes | Run 1 | Run 2 | Run 3 |
|---|---:|---:|---:|---:|
| Corporate law p2 | 3 | 3 | 3 | 3 |
| Dopamine p4 | 1 | 1 | 1 | 1 |
| Hegel p1 | 2 | 2 | 2 | 2 |
| Information asymmetry p2 | 1 | 1 | 1 | 1 |
| Surface tension p3 | 1 | 1 | 1 | 1 |
| Corporate law p5 | 1 | 1 | 1 | 1 |

Final-batch aggregate usage:

- Decomposition: 26,020 input tokens, 8,488 output tokens, 1,919 reasoning tokens;
  mean duration 7.9 seconds.
- Mapping: 21,671 input tokens, 1,521 output tokens, 0 reasoning tokens;
  mean duration 2.3 seconds.

Two earlier tuning batches were retained only in the ignored `.omc/adhoc` workspace. They exposed
and helped correct two boundary errors: policy response and policy-scope controversy were split too
aggressively, while legal character, external control, and conditionally permitted activity were
merged too aggressively.

## Dialogue smoke test

The final corporate-law-p2 candidate was exercised through the two-stage dialogue evaluator.

- Exact central story: PASS; all three axes captured; no target or question.
- Legal character only: UNCLEAR; the missing external-control axis was selected.
- Explicit claim that the board decides independently without agency approval: ERROR; the distorted
  external-control axis and its contradicted relation were selected.
- Diagnostic and corrective questions did not reveal the correct direction.

A deliberately compressed response that covered the three concrete structures but omitted the
candidate's general statement that legal control varies by corporation type was UNCLEAR. This is an
upstream central-story breadth issue in corporate-law-p2, already identified as a human-review
boundary, rather than an axis-mapping failure. It must be resolved during gold approval.

## Verification

- 48 test files passed.
- 461 tests passed.
- TypeScript project typecheck passed.
- `git diff --check` passed.

Raw final artifacts were generated at
`.omc/adhoc/axis-architecture-v2-final-six-3x-2026-08-26`. The directory is intentionally ignored;
this report preserves the checkpoint result and prompt hashes.
