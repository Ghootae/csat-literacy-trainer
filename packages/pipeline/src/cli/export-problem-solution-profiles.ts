import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import {
  type ChoiceProofProfileRow,
  type EvidenceDetailRow,
  type ManualReviewRow,
  SOLUTION_PROFILE_ANALYSIS_VERSION,
  extractSolutionProfiles,
} from '../problem-solving/solution-profile.js';

const FIXTURE_ROOT = resolve(
  'packages/pipeline/fixtures/experiments/problem-solving',
);
const DEFAULT_OUTPUT_ROOT = resolve(
  'docs/experiments/problem-solution-profile-2026-09-02',
);
const FIXTURE_NAMES = [
  'mrna-vaccine-lipid-nanoparticle-q19.json',
  'gongsun-long-later-mohists-q12.json',
  'corporate-law-q13.json',
  'information-asymmetry-free-marketplace-q13.json',
  'surface-tension-laplace-q16.json',
  'dopamine-motor-control-q13.json',
] as const;

function csvCell(value: unknown): string {
  const normalized = Array.isArray(value)
    ? value.join(' | ')
    : typeof value === 'boolean'
      ? value ? 'true' : 'false'
      : String(value ?? '');
  return `"${normalized.replaceAll('"', '""')}"`;
}

function csv<T extends object>(rows: readonly T[], columns: readonly (keyof T)[]): string {
  return [
    columns.map(csvCell).join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ].join('\n') + '\n';
}

function hash(text: string): string {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function parseOutputRoot(): string {
  const argument = process.argv.find((item) => item.startsWith('--output-root='));
  return argument === undefined
    ? DEFAULT_OUTPUT_ROOT
    : resolve(argument.slice('--output-root='.length));
}

function compactMarkdownTable(rows: readonly ChoiceProofProfileRow[]): string {
  const header = '| 문항 | 선지 | 진위 | 근거 ID | 연산 | 판정 관계 | 수동 검수 |';
  const divider = '|---|---:|---|---|---|---|---|';
  const body = rows.map((row) => {
    const review = [
      row.compressedMultiStepReview === 'PENDING' ? '다단계' : '',
      row.errorMechanismReview === 'PENDING' ? '오류 기제' : '',
    ].filter(Boolean).join(', ') || '—';
    return [
      row.questionId,
      `${row.position}${row.isAnswer ? ' (정답)' : ''}`,
      row.judgment,
      row.allEvidenceRefs.join('+'),
      row.operations.join('+') || '직접 근거',
      row.targetClaimEffects.join('<br>') || row.claimAssessments.join('<br>'),
      review,
    ].map((value) => String(value).replaceAll('|', '\\|')).join(' | ');
  }).map((line) => `| ${line} |`);
  return [header, divider, ...body].join('\n');
}

async function initializeManualReview(path: string, content: string): Promise<void> {
  try {
    await writeFile(path, content, { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
}

async function main(): Promise<void> {
  const outputRoot = parseOutputRoot();
  const artifactRoot = resolve(outputRoot, 'artifacts');
  const sourceFiles = await Promise.all(FIXTURE_NAMES.map(async (name) => {
    const path = resolve(FIXTURE_ROOT, name);
    const text = await readFile(path, 'utf8');
    return { name, path, text, gold: JSON.parse(text) as unknown };
  }));
  const extraction = extractSolutionProfiles(sourceFiles.map((source) => source.gold));
  const choiceColumns: readonly (keyof ChoiceProofProfileRow)[] = [
    'analysisVersion', 'questionId', 'exam', 'questionNumber', 'goldReviewStatus',
    'stemPolarity', 'choiceId', 'position', 'isAnswer', 'judgment', 'choiceText',
    'claimIds', 'claimDescriptions', 'claimAssessments', 'claimDecisions',
    'claimDecisionBases', 'unlinkedClaimIds', 'choiceEvidenceRefs',
    'inferencePremiseRefs', 'allEvidenceRefs', 'evidenceSourceKinds',
    'evidenceDescriptions', 'inferenceIds', 'operations', 'conclusions',
    'targetClaimEffects', 'groundingKinds', 'necessityKinds',
    'compressedMultiStepReview', 'compressedMultiStepSignals',
    'errorMechanismReview',
  ];
  const evidenceColumns: readonly (keyof EvidenceDetailRow)[] = [
    'analysisVersion', 'questionId', 'choiceId', 'position', 'evidenceRef',
    'evidenceSourceKind', 'evidenceDescription', 'origins', 'claimIds',
    'inferenceIds',
  ];
  const reviewColumns: readonly (keyof ManualReviewRow)[] = [
    'analysisVersion', 'reviewId', 'reviewType', 'questionId', 'choiceId',
    'position', 'targetIds', 'automaticSignals', 'sourceSummary',
    'reviewerStatus', 'reviewerDecision', 'reviewedStructureOrMechanism',
    'reviewerNotes',
  ];
  const multiStepCount = extraction.manualReview.filter(
    (row) => row.reviewType === 'COMPRESSED_MULTI_STEP',
  ).length;
  const errorMechanismCount = extraction.manualReview.filter(
    (row) => row.reviewType === 'ERROR_MECHANISM',
  ).length;
  const operationCounts = Object.entries(extraction.choices.flatMap((row) => row.operations)
    .reduce<Record<string, number>>((counts, operation) => ({
      ...counts,
      [operation]: (counts[operation] ?? 0) + 1,
    }), {})).sort(([left], [right]) => left.localeCompare(right));

  await mkdir(artifactRoot, { recursive: true });
  const manualReviewCsv = csv(extraction.manualReview, reviewColumns);
  await Promise.all([
    writeFile(
      resolve(artifactRoot, 'choice-proof-profiles.csv'),
      csv(extraction.choices, choiceColumns),
    ),
    writeFile(
      resolve(artifactRoot, 'evidence-details.csv'),
      csv(extraction.evidence, evidenceColumns),
    ),
    writeFile(
      resolve(artifactRoot, 'manual-review-queue.csv'),
      manualReviewCsv,
    ),
    initializeManualReview(resolve(artifactRoot, 'manual-review.csv'), manualReviewCsv),
    writeFile(resolve(artifactRoot, 'manifest.json'), `${JSON.stringify({
      analysisVersion: SOLUTION_PROFILE_ANALYSIS_VERSION,
      sourceFiles: sourceFiles.map((source) => ({
        file: basename(source.path),
        sha256: hash(source.text),
      })),
      counts: {
        questions: sourceFiles.length,
        choices: extraction.choices.length,
        evidenceRows: extraction.evidence.length,
        compressedMultiStepReviewRows: multiStepCount,
        errorMechanismReviewRows: errorMechanismCount,
      },
      operationCounts: Object.fromEntries(operationCounts),
    }, null, 2)}\n`),
  ]);

  const report = `# 6문항 선지별 proof profile 추출\n\n` +
    `## 범위\n\n` +
    `기존 \`problem-solving-gold-v2\` 6문항을 읽기 전용 입력으로 사용해 선지별 근거·연산·판정 관계를 펼쳤다. 원본 골드와 스키마는 변경하지 않았다.\n\n` +
    `- 문항: ${sourceFiles.length}개\n` +
    `- 선지: ${extraction.choices.length}개\n` +
    `- 근거 상세 행: ${extraction.evidence.length}개\n` +
    `- 압축 다단계 수동 검수 후보: ${multiStepCount}개\n` +
    `- 선지 오류 기제 수동 검수 대상: ${errorMechanismCount}개\n\n` +
    `## 자동 추출과 사람 검수의 경계\n\n` +
    `자동 추출 필드는 골드에 명시된 ID와 관계만 복사·집계한다. \`FOLLOW_CAUSAL_CHAIN\`, 주장 의존, 선지 내 복수 추론, 복수 주장 대상 추론은 압축 가능성을 나타내는 신호일 뿐 다단계 구조로 확정하지 않는다. \`judgment: FALSE\`인 선지의 오류 기제도 자동 추정하지 않는다. 두 항목은 \`manual-review.csv\`의 빈 검수 열에만 사람이 기록한다. 재실행 시 최신 자동 큐는 \`manual-review-queue.csv\`에 쓰고, 기존 \`manual-review.csv\`는 덮어쓰지 않는다.\n\n` +
    `권장 오류 기제 어휘의 초기 후보는 방향 반전, 대상 교환, 조건 누락, 필요·충분조건 혼동, 범위 확대·축소, 근거 없는 연결, 비교 기준 교환, 계산 관계 오류, 분류 경계 혼동이다. 이 목록은 확정 taxonomy가 아니다.\n\n` +
    `## 선지별 요약\n\n${compactMarkdownTable(extraction.choices)}\n\n` +
    `## 산출물\n\n` +
    `- \`artifacts/choice-proof-profiles.csv\`: 선지당 1행의 전체 요약\n` +
    `- \`artifacts/evidence-details.csv\`: 근거 ID당 1행의 출처·설명·연결 정보\n` +
    `- \`artifacts/manual-review-queue.csv\`: 재실행할 때마다 갱신되는 자동 검수 큐\n` +
    `- \`artifacts/manual-review.csv\`: 사람이 판정을 추가하는 작업본(재실행 시 보존)\n` +
    `- \`artifacts/manifest.json\`: 입력 파일 해시와 행 수 집계\n\n` +
    `## 해석 제한\n\n` +
    `이 표는 학생의 실제 풀이 경로가 아니라 문항 골드가 명시한 판정 요구를 기술한다. \`itemInference\` 하나가 실제로 몇 개의 인지 단계를 압축하는지는 사람 검수 전까지 확정하지 않는다.\n`;
  await writeFile(resolve(outputRoot, 'REPORT.md'), report);

  process.stdout.write(JSON.stringify({
    outputRoot,
    questions: sourceFiles.length,
    choices: extraction.choices.length,
    evidenceRows: extraction.evidence.length,
    multiStepReviewRows: multiStepCount,
    errorMechanismReviewRows: errorMechanismCount,
  }, null, 2) + '\n');
}

await main();
