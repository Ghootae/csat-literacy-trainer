import assert from 'node:assert/strict';

export const VERSION = 'axis-counterfactual-context-v1';
export const REPEATS = 3;
export const CAP_USD = 2;
export const CONTEXTS = ['A', 'B', 'C'];
export const SCOPES = ['full', 'isolated'];
export const KINDS = ['sufficient', 'insufficient'];
export const RULE = {
  minimumErrorReduction: 3,
  minimumParagraphsWithReducedContextRange: 2,
  noIncreaseInSufficientHolds: true,
  noIncreaseInInsufficientPass: true,
  requireAllContractsValid: true,
};

export function buildCases(fixtures, sources) {
  return fixtures.flatMap(f => {
    const gold = sources[f.paragraphId].gold;
    assert.ok(gold.centralAxes.length >= 2);
    assert.equal(gold.centralAxes.filter(a => a.id === f.targetAxisId).length, 1);
    return KINDS.flatMap(kind => CONTEXTS.map(context => ({
      id: `${f.id}-${kind}-${context}`, setId: f.id, paragraphId: f.paragraphId,
      kind, context, targetAxisId: f.targetAxisId, targetText: f[kind], contextText: f.contexts[context],
      expected: kind === 'sufficient' ? ['PASS'] : ['UNCLEAR_OK', 'UNCLEAR_SERIOUS'],
      expectationSource: 'agent-authored before execution; not independent human labels',
      scopeReview: f.scopeReview,
      payload: {
        paragraphText: gold.paragraphText,
        centralAxes: gold.centralAxes.map(({ id, description }) => ({ id, description })),
        evidence: {
          initialResponse: (f.targetFirst ? [f[kind], f.contexts[context]] : [f.contexts[context], f[kind]]).join(' '),
          followUpExchanges: [], previousAxisStates: null,
        },
        turn: 1,
      },
    })));
  });
}

export function shuffled(values, seed) {
  const a = [...values]; let state = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1); [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeDiagnosticJobs(cases) {
  const jobs = [];
  for (let repeat = 1; repeat <= REPEATS; repeat++) {
    shuffled(cases, 20260921 + repeat).forEach((c, i) => {
      const scopes = (i + repeat) % 2 ? SCOPES : [...SCOPES].reverse();
      for (const scope of scopes) jobs.push({ id: `diag-${c.id}-${scope}-r${repeat}`, stage: 'diagnostic',
        caseId: c.id, scope, repeat, axisId: scope === 'isolated' ? c.targetAxisId : null });
    });
  }
  return jobs;
}

export function makeBenchmarkGroups(cases) {
  const selected = cases.filter(c => c.context === 'A'), groups = [];
  for (let repeat = 1; repeat <= REPEATS; repeat++) {
    shuffled(selected, 9102026 + repeat).forEach((c, i) => {
      const modes = (i + repeat) % 2 ? ['full', 'parallel'] : ['parallel', 'full'];
      for (const mode of modes) {
        const id = `bench-${c.id}-${mode}-r${repeat}`;
        const axisIds = mode === 'full' ? [null] : c.payload.centralAxes.map(a => a.id);
        groups.push({ id, caseId: c.id, mode, repeat, jobs: axisIds.map(axisId => ({
          id: `${id}-${axisId ?? 'all'}`, groupId: id, stage: 'benchmark', caseId: c.id, repeat,
          scope: mode === 'full' ? 'full' : 'isolated', axisId,
        })) });
      }
    });
  }
  return groups;
}

export function summarizeDiagnostic(results, cases) {
  const counts = {};
  for (const scope of SCOPES) {
    const rr = results.filter(r => r.stage === 'diagnostic' && r.scope === scope);
    const valid = rr.filter(r => r.contractValid);
    counts[scope] = {
      attempted: rr.length, valid: valid.length,
      sufficientHolds: valid.filter(r => r.kind === 'sufficient' && r.targetStatus !== 'PASS').length,
      sufficientInterventions: valid.filter(r => r.kind === 'sufficient' && ['UNCLEAR_SERIOUS', 'ERROR'].includes(r.targetStatus)).length,
      insufficientPass: valid.filter(r => r.kind === 'insufficient' && r.targetStatus === 'PASS').length,
      expectedErrors: valid.filter(r => !r.expectedMatch).length,
      errorsOnMissing: valid.filter(r => r.kind === 'insufficient' && r.targetStatus === 'ERROR').length,
      stableCells: cases.filter(c => {
        const x = valid.filter(r => r.caseId === c.id);
        return x.length === REPEATS && new Set(x.map(r => r.targetStatus)).size === 1;
      }).length,
    };
  }
  const perSet = [...new Set(cases.map(c => c.setId))].flatMap(setId => KINDS.map(kind => ({
    setId, kind, scopes: Object.fromEntries(SCOPES.map(scope => {
      const byContext = CONTEXTS.map(context => {
        const c = cases.find(c => c.setId === setId && c.kind === kind && c.context === context);
        const rr = results.filter(r => r.stage === 'diagnostic' && r.caseId === c.id && r.scope === scope).sort((a, b) => a.repeat - b.repeat);
        const valid = rr.filter(r => r.contractValid);
        return { context, labels: rr.map(r => r.targetStatus), n: valid.length,
          passRate: valid.length === REPEATS ? valid.filter(r => r.targetStatus === 'PASS').length / REPEATS : null,
          interventionRate: valid.length === REPEATS ? valid.filter(r => ['UNCLEAR_SERIOUS', 'ERROR'].includes(r.targetStatus)).length / REPEATS : null };
      });
      const complete = byContext.every(c => c.n === REPEATS);
      const range = key => complete ? Math.max(...byContext.map(c => c[key])) - Math.min(...byContext.map(c => c[key])) : null;
      return [scope, { byContext, passRange: range('passRate'), interventionRange: range('interventionRate') }];
    })),
  })));
  const reduced = [...new Set(perSet.filter(p => p.scopes.full.passRange !== null && p.scopes.isolated.passRange !== null &&
    p.scopes.full.passRange > p.scopes.isolated.passRange).map(p => p.setId))];
  const increased = [...new Set(perSet.filter(p => p.scopes.full.passRange !== null && p.scopes.isolated.passRange !== null &&
    p.scopes.full.passRange < p.scopes.isolated.passRange).map(p => p.setId))];
  const completeValid = SCOPES.every(s => counts[s].attempted === cases.length * REPEATS && counts[s].valid === counts[s].attempted);
  const conditions = {
    completeValid,
    errorReduction: counts.full.expectedErrors - counts.isolated.expectedErrors >= RULE.minimumErrorReduction,
    reducedContextRangeInTwoParagraphs: reduced.length >= RULE.minimumParagraphsWithReducedContextRange,
    noSufficientRegression: counts.isolated.sufficientHolds <= counts.full.sufficientHolds,
    noInsufficientPassRegression: counts.isolated.insufficientPass <= counts.full.insufficientPass,
  };
  return { counts, perSet, reducedContextRangeParagraphs: reduced, increasedContextRangeParagraphs: increased,
    benchmarkGate: { proceed: Object.values(conditions).every(Boolean), conditions, rule: RULE,
      interpretation: 'exploratory engineering progression rule, not statistical proof or production promotion' } };
}

export function reservationUsd(request) {
  assert.ok(Buffer.byteLength(JSON.stringify(request)) < 100_000);
  return ((Buffer.byteLength(JSON.stringify(request)) + 4000) * 2.5 + request.max_output_tokens * 12) / 1e6;
}
export function usageCost(usage) {
  if (!usage || !Number.isFinite(usage.input_tokens) || !Number.isFinite(usage.output_tokens)) return null;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0, writes = usage.input_tokens_details?.cache_write_tokens ?? 0;
  return (Math.max(0, usage.input_tokens - cached - writes) * 2 + cached * .2 + writes * 2.5 + usage.output_tokens * 12) / 1e6;
}
export function canReserveGroup(accountedUsd, calls, requests, maxCalls) {
  return calls + requests.length <= maxCalls && accountedUsd + requests.reduce((n, r) => n + reservationUsd(r), 0) <= CAP_USD;
}
export function median(values) {
  const a = [...values].sort((a, b) => a - b), i = Math.floor(a.length / 2);
  return !a.length ? null : a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2;
}
