import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const experimentDir = path.join(
  root,
  'docs/experiments/dialogue-selective-router-v2-regression-42-2026-09-09',
);
const basePath = path.join(experimentDir, 'artifacts/trajectories.json');
const rerunPath = path.join(experimentDir, 'evidence-quote-fix-rerun/artifacts/trajectories.json');
const finalPath = path.join(experimentDir, 'artifacts/trajectories-final.json');
const summaryPath = path.join(experimentDir, 'SUMMARY-FINAL.json');
const v1SummaryPath = path.join(
  root,
  'docs/experiments/dialogue-selective-router-regression-42-2026-09-09/SUMMARY.json',
);
const v1TrajectoriesPath = path.join(
  root,
  'docs/experiments/dialogue-selective-router-regression-42-2026-09-09/artifacts/trajectories.json',
);

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const base = readJson(basePath);
const reruns = readJson(rerunPath);
const v1Summary = readJson(v1SummaryPath);
const v1Trajectories = readJson(v1TrajectoriesPath);
const rerunByKey = new Map(reruns.map((item) => [item.targetKey, item]));
const merged = base.map((item) => rerunByKey.get(item.targetKey) ?? item);

if (merged.length !== 42 || new Set(merged.map((item) => item.targetKey)).size !== 42) {
  throw new Error('최종 병합은 서로 다른 42개 targetKey를 포함해야 합니다.');
}
if (rerunByKey.size !== 6) throw new Error('보정 재실행은 정확히 6사례여야 합니다.');

const v1InitialByKey = new Map(v1Trajectories.map((item) => [item.targetKey, item.initialStudentSummary]));
const initialResponseMismatches = merged.filter(
  (item) => v1InitialByKey.get(item.targetKey) !== item.initialStudentSummary,
).map((item) => item.targetKey);
if (initialResponseMismatches.length > 0) {
  throw new Error(`V1과 최초 응답이 다른 사례: ${initialResponseMismatches.join(', ')}`);
}

const sum = (values) => values.reduce((total, value) => total + value, 0);
const judge = (trajectory) => trajectory.judge?.output ?? {};
const routes = ['ERROR', 'TARGETED_GAP', 'SPARSE_GAP', 'PASS'];
const categories = ['PARTIAL', 'EXPLICIT_ERROR', 'TOPIC_ONLY'];

function metrics(group) {
  return {
    cases: group.length,
    initialRoutes: Object.fromEntries(routes.map((route) => [
      route,
      group.filter((item) => (item.evaluations[0]?.result.snapshot.diagnosticRoute ?? 'PASS') === route).length,
    ])),
    finalPass: group.filter((item) => item.finalStatus === 'PASS').length,
    completeStudentOutcome: group.filter((item) => judge(item).studentOutcome === 'COMPLETE').length,
    finalDecisionAppropriate: group.filter((item) => judge(item).finalDecisionAppropriate).length,
    initialRouteAppropriate: group.filter((item) => judge(item).initialRouteAppropriate).length,
    routeSequenceAppropriate: group.filter((item) => judge(item).routeSequenceAppropriate).length,
    prematurePass: group.filter((item) => judge(item).prematurePass).length,
    overHeld: group.filter((item) => judge(item).overHeld).length,
    leakageTurns: sum(group.map((item) => judge(item).solutionLeakageCount ?? 0)),
    redundantTurns: sum(group.map((item) => judge(item).redundantQuestionCount ?? 0)),
    questions: sum(group.map((item) => item.students.length)),
    averageScore: group.length === 0
      ? 0
      : sum(group.map((item) => judge(item).overallScore ?? 0)) / group.length,
  };
}

const finalMetrics = metrics(merged);
const normalizationEvents = merged.flatMap((trajectory) => trajectory.evaluations.flatMap(
  (evaluation) => (evaluation.call?.decisionAudit?.normalizationEvents ?? []).map((event) => ({
    targetKey: trajectory.targetKey,
    turn: evaluation.turn,
    ...event,
  })),
));
const summary = {
  experiment: 'dialogue-selective-router-regression-42-v2-final',
  assembledAt: new Date().toISOString(),
  model: 'gpt-5.6-terra',
  effort: 'medium',
  cases: merged.length,
  sameInitialResponsesAsV1: initialResponseMismatches.length === 0,
  rerunCaseCount: reruns.length,
  byCategory: Object.fromEntries(categories.map((category) => [
    category,
    metrics(merged.filter((item) => item.category === category)),
  ])),
  overall: finalMetrics,
  gateNormalization: {
    events: normalizationEvents.length,
    affectedCases: new Set(normalizationEvents.map((item) => item.targetKey)).size,
    details: normalizationEvents,
  },
  comparisonWithV1: {
    v1: v1Summary.overall,
    v2: finalMetrics,
    deltaV2MinusV1: {
      finalPass: finalMetrics.finalPass - v1Summary.overall.finalPass,
      completeStudentOutcome: finalMetrics.completeStudentOutcome - v1Summary.overall.completeStudentOutcome,
      finalDecisionAppropriate: finalMetrics.finalDecisionAppropriate - v1Summary.overall.finalDecisionAppropriate,
      initialRouteAppropriate: finalMetrics.initialRouteAppropriate - v1Summary.overall.initialRouteAppropriate,
      routeSequenceAppropriate: finalMetrics.routeSequenceAppropriate - v1Summary.overall.routeSequenceAppropriate,
      prematurePass: finalMetrics.prematurePass - v1Summary.overall.prematurePass,
      overHeld: finalMetrics.overHeld - v1Summary.overall.overHeld,
      leakageTurns: finalMetrics.leakageTurns - v1Summary.overall.leakageTurns,
      redundantTurns: finalMetrics.redundantTurns - v1Summary.overall.redundantTurns,
      questions: finalMetrics.questions - v1Summary.overall.questions,
      averageScore: finalMetrics.averageScore - v1Summary.overall.averageScore,
    },
  },
  budget: {
    approvedHardCapUsd: 6,
    successfulCallsAndFailedCallAllowanceUsd: 2.8728404,
    note: '첫 전체 실행, 실패 호출 0.15달러 안전 충당, 6사례 재실행을 모두 포함한 보수적 계상값',
  },
};

fs.writeFileSync(finalPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(finalPath);
console.log(summaryPath);
console.log(JSON.stringify(summary.overall, null, 2));
