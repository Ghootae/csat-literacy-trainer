import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type {
  PropositionCoverageResult,
  TargetPropositionView,
} from './llm/proposition-coverage-eval.js';

export type Coverage = 'explicit' | 'partial' | 'none';

export interface CalibrationObservation {
  readonly caseId: string;
  readonly repeat: number;
  readonly expectedCoverage?: Coverage;
  readonly output?: PropositionCoverageResult;
  readonly error?: string;
}

export interface CaseCalibrationSummary {
  readonly caseId: string;
  readonly expectedCoverage: Coverage;
  readonly predictions: readonly (Coverage | 'error')[];
  readonly majority: Coverage | 'error';
  readonly majorityCorrect: boolean;
  readonly stable: boolean;
}

export interface CalibrationSummary {
  readonly runAccuracy: readonly {
    readonly repeat: number;
    readonly correct: number;
    readonly total: number;
    readonly accuracy: number;
  }[];
  readonly overall: { readonly correct: number; readonly total: number; readonly accuracy: number };
  readonly majority: { readonly correct: number; readonly total: number; readonly accuracy: number };
  readonly confusionMatrix: Readonly<Record<Coverage, Readonly<Record<Coverage, number>>>>;
  readonly recall: Readonly<Record<Coverage, number>>;
  readonly fullyStableCases: number;
  readonly unstableCaseIds: readonly string[];
  readonly overestimation: readonly { readonly caseId: string; readonly repeat: number; readonly from: Coverage; readonly to: Coverage }[];
  readonly underestimation: readonly { readonly caseId: string; readonly repeat: number; readonly from: Coverage; readonly to: Coverage }[];
  readonly cases: readonly CaseCalibrationSummary[];
}

const LABELS: readonly Coverage[] = ['explicit', 'partial', 'none'];
const RANK: Record<Coverage, number> = { none: 0, partial: 1, explicit: 2 };

export function resolveGoldPropositionView(
  paragraphId: string,
  propositionId: string,
  contentRoot: string = resolve(process.cwd(), 'content'),
): TargetPropositionView {
  const gold = JSON.parse(
    readFileSync(resolve(contentRoot, paragraphId, 'gold.json'), 'utf8'),
  ) as {
    propositions: readonly (TargetPropositionView & { readonly id: string })[];
  };
  const proposition = gold.propositions.find((p) => p.id === propositionId);
  if (proposition === undefined) {
    throw new Error(`gold proposition 없음: ${paragraphId}/${propositionId}`);
  }
  if (proposition.text.trim() === '') {
    throw new Error(`gold proposition text가 비었다: ${paragraphId}/${propositionId}`);
  }
  const scalarFields = ['predicate', 'argument', 'aspect', 'subjectRole'] as const;
  for (const field of scalarFields) {
    if (typeof proposition[field] !== 'string') {
      throw new Error(`gold proposition ${field}가 문자열이 아니다: ${paragraphId}/${propositionId}`);
    }
  }
  if (
    proposition.relation === null ||
    typeof proposition.relation !== 'object' ||
    typeof proposition.relation.from !== 'string' ||
    typeof proposition.relation.to !== 'string' ||
    typeof proposition.relation.kind !== 'string'
  ) {
    throw new Error(`gold proposition relation이 불완전하다: ${paragraphId}/${propositionId}`);
  }
  // 새 객체로 명시적으로 투영해 sourceSentences/links/id 같은 gold 메타데이터가 모델 입력으로
  // 새어 들어갈 수 없게 한다.
  return {
    text: proposition.text,
    relation: {
      from: proposition.relation.from,
      to: proposition.relation.to,
      kind: proposition.relation.kind,
    },
    predicate: proposition.predicate,
    argument: proposition.argument,
    aspect: proposition.aspect,
    subjectRole: proposition.subjectRole,
  };
}

function majority(predictions: readonly (Coverage | 'error')[]): Coverage | 'error' {
  const counts = new Map<Coverage, number>();
  for (const p of predictions) {
    if (p !== 'error') counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0 || (ranked[1] !== undefined && ranked[0]![1] === ranked[1][1])) return 'error';
  return ranked[0]![0];
}

export function summarizeCalibration(observations: readonly CalibrationObservation[]): CalibrationSummary {
  const core = observations.filter((o): o is CalibrationObservation & { expectedCoverage: Coverage } =>
    LABELS.includes(o.expectedCoverage as Coverage),
  );
  const repeats = [...new Set(core.map((o) => o.repeat))].sort((a, b) => a - b);
  const successful = core.filter((o): o is typeof o & { output: PropositionCoverageResult } => o.output !== undefined);

  const runAccuracy = repeats.map((repeat) => {
    const run = core.filter((o) => o.repeat === repeat);
    const correct = run.filter((o) => o.output?.coverage === o.expectedCoverage).length;
    return { repeat, correct, total: run.length, accuracy: run.length === 0 ? 0 : correct / run.length };
  });

  const matrix = Object.fromEntries(
    LABELS.map((expected) => [expected, Object.fromEntries(LABELS.map((predicted) => [predicted, 0]))]),
  ) as Record<Coverage, Record<Coverage, number>>;
  for (const o of successful) matrix[o.expectedCoverage][o.output.coverage]++;

  const recall = Object.fromEntries(
    LABELS.map((label) => {
      const row = matrix[label];
      const total = LABELS.reduce((sum, predicted) => sum + row[predicted], 0);
      return [label, total === 0 ? 0 : row[label] / total];
    }),
  ) as Record<Coverage, number>;

  const byCase = new Map<string, (CalibrationObservation & { expectedCoverage: Coverage })[]>();
  for (const o of core) byCase.set(o.caseId, [...(byCase.get(o.caseId) ?? []), o]);
  const cases = [...byCase.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([caseId, rows]) => {
      const sorted = [...rows].sort((a, b) => a.repeat - b.repeat);
      const predictions = sorted.map((o) => o.output?.coverage ?? 'error');
      const voted = majority(predictions);
      return {
        caseId,
        expectedCoverage: sorted[0]!.expectedCoverage,
        predictions,
        majority: voted,
        majorityCorrect: voted === sorted[0]!.expectedCoverage,
        stable: predictions.length > 0 && predictions.every((p) => p === predictions[0]),
      } satisfies CaseCalibrationSummary;
    });

  const errors = successful.filter((o) => o.output.coverage !== o.expectedCoverage);
  const classify = (direction: 'over' | 'under') =>
    errors
      .filter((o) =>
        direction === 'over'
          ? RANK[o.output.coverage] > RANK[o.expectedCoverage]
          : RANK[o.output.coverage] < RANK[o.expectedCoverage],
      )
      .map((o) => ({
        caseId: o.caseId,
        repeat: o.repeat,
        from: o.expectedCoverage,
        to: o.output.coverage,
      }));

  const correct = successful.filter((o) => o.output.coverage === o.expectedCoverage).length;
  const majorityCorrect = cases.filter((c) => c.majorityCorrect).length;
  return {
    runAccuracy,
    overall: { correct, total: core.length, accuracy: core.length === 0 ? 0 : correct / core.length },
    majority: {
      correct: majorityCorrect,
      total: cases.length,
      accuracy: cases.length === 0 ? 0 : majorityCorrect / cases.length,
    },
    confusionMatrix: matrix,
    recall,
    fullyStableCases: cases.filter((c) => c.stable).length,
    unstableCaseIds: cases.filter((c) => !c.stable).map((c) => c.caseId),
    overestimation: classify('over'),
    underestimation: classify('under'),
    cases,
  };
}
