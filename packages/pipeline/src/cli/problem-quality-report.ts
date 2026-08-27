import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  DiagnosticQualityExpectationSchema,
  assessProblemDiagnosticQuality,
  createProblemDiagnosticQualityReport,
  type DiagnosticQualityAssessment,
} from '../problem-solving/quality-evaluation.js';
import type { ProblemVerticalSliceResult } from '../problem-solving/vertical-slice.js';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function jsonFiles(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(path, entry.name);
    return entry.isDirectory() ? jsonFiles(child) : entry.name === 'results.json' ? [child] : [];
  }).sort();
}

const root = process.cwd();
const inputPath = resolve(root, option('--input') ?? '.omc/experiments/problem-path-vertical');
const reviewPath = resolve(
  root,
  option('--review') ??
    'packages/pipeline/fixtures/experiments/problem-solving/quality/mrna-q19-blind-review.json',
);
const review = JSON.parse(readFileSync(reviewPath, 'utf8')) as { cases: readonly unknown[] };
const expectations = review.cases.map((item) => DiagnosticQualityExpectationSchema.parse(item));

// 같은 사례를 여러 번 실행했다면, 시간순으로 가장 최근에 구조 실행을 통과한 결과를 사용한다.
// 실패 실행을 숨기기 위한 규칙이 아니라 수정 전 canary와 수정 후 재실행을 구별하기 위한 규칙이다.
const resultsByCase = new Map<string, ProblemVerticalSliceResult>();
for (const path of jsonFiles(inputPath)) {
  const artifact = JSON.parse(readFileSync(path, 'utf8')) as {
    records?: readonly {
      status?: string;
      result?: ProblemVerticalSliceResult;
    }[];
  };
  for (const record of artifact.records ?? []) {
    if (record.status === 'PASS' && record.result !== undefined) {
      resultsByCase.set(record.result.caseId, record.result);
    }
  }
}

const assessments: DiagnosticQualityAssessment[] = [];
for (const expectation of expectations) {
  const result = resultsByCase.get(expectation.caseId);
  if (result === undefined) throw new Error(`품질 검토 실행 결과 없음: ${expectation.caseId}`);
  const assessment = assessProblemDiagnosticQuality({ expectation, result });
  assessments.push(assessment);
  process.stdout.write(
    `${assessment.passed ? 'PASS' : 'FAIL'} ${assessment.caseId}: ` +
    `${assessment.failureCategories.join(', ') || 'no failures'}\n`,
  );
}

const generatedAt = new Date().toISOString();
const report = createProblemDiagnosticQualityReport({ generatedAt, assessments });
const runId = generatedAt.replaceAll(':', '-');
const outputDir = resolve(
  root,
  option('--output-dir') ?? `.omc/experiments/problem-quality/${runId}`,
);
mkdirSync(outputDir, { recursive: true });
const outputPath = resolve(outputDir, 'report.json');
writeFileSync(outputPath, `${JSON.stringify({
  source: {
    inputPath,
    reviewPath,
    selectedCaseIds: [...resultsByCase.keys()].filter((caseId) =>
      expectations.some((expectation) => expectation.caseId === caseId)),
  },
  ...report,
}, null, 2)}\n`);
process.stdout.write(`MVP ${report.mvpDecision}\n결과: ${outputPath}\n`);
if (report.mvpDecision === 'NO_GO') process.exitCode = 1;
