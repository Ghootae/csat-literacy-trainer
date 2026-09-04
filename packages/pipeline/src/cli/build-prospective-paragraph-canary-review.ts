import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

import {
  ProspectiveParagraphGoldManifestSchema,
  artifactHash,
} from '../paragraph-analysis/production.js';

const CANARY_SOURCE_IDS = new Set([
  '69fd388386fd308968e0b9f4',
  '69c09163fa5063deffe1c180',
  '69c0961c78128b2a9bee0717',
]);

const manifestPath = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/prospective-paragraph-gold-manifest-v1.json',
);
const experimentRoot = resolve(
  process.cwd(),
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04',
);
const reviewRoot = resolve(experimentRoot, 'canary-review');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readIfExists(path: string): unknown | null {
  return existsSync(path) ? readJson(path) : null;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function stageResult(value: unknown): unknown | null {
  if (typeof value !== 'object' || value === null || !('result' in value)) return null;
  return (value as { readonly result: unknown }).result;
}

function stageTrace(value: unknown): unknown | null {
  if (typeof value !== 'object' || value === null) return null;
  const stage = value as {
    readonly createdAt?: unknown;
    readonly inputHash?: unknown;
    readonly config?: unknown;
    readonly metadata?: unknown;
  };
  return {
    createdAt: stage.createdAt ?? null,
    inputHash: stage.inputHash ?? null,
    config: stage.config ?? null,
    metadata: stage.metadata ?? null,
  };
}

interface JsonDifference {
  readonly path: string;
  readonly before: unknown;
  readonly after: unknown;
}

function jsonDifferences(before: unknown, after: unknown, path = '$'): JsonDifference[] {
  if (Object.is(before, after)) return [];
  if (
    typeof before !== 'object' || before === null ||
    typeof after !== 'object' || after === null ||
    Array.isArray(before) !== Array.isArray(after)
  ) {
    return [{ path, before, after }];
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const differences: JsonDifference[] = [];
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index += 1) {
      differences.push(...jsonDifferences(before[index], after[index], `${path}[${index}]`));
    }
    return differences;
  }
  const beforeRecord = before as Record<string, unknown>;
  const afterRecord = after as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])].sort();
  return keys.flatMap((key) =>
    jsonDifferences(beforeRecord[key], afterRecord[key], `${path}.${key}`));
}

function field(value: unknown, name: string): unknown {
  if (typeof value !== 'object' || value === null) return null;
  return (value as Record<string, unknown>)[name] ?? null;
}

function textField(value: unknown, name: string, fallback = '-'): string {
  const selected = field(value, name);
  return typeof selected === 'string' ? selected : fallback;
}

function arrayField(value: unknown, name: string): readonly unknown[] {
  const selected = field(value, name);
  return Array.isArray(selected) ? selected : [];
}

function issueLines(audit: unknown): string[] {
  const issues = arrayField(audit, 'issues');
  if (issues.length === 0) return ['- 없음'];
  return issues.map((issue) => {
    const issueId = textField(issue, 'issueId');
    const severity = textField(issue, 'severity');
    const category = textField(issue, 'category');
    const description = textField(issue, 'description');
    return `- ${issueId} · ${severity} · ${category}: ${description}`;
  });
}

function markdownLink(fromFile: string, target: string, label: string): string {
  return `[${label}](${relative(dirname(fromFile), target)})`;
}

const manifest = ProspectiveParagraphGoldManifestSchema.parse(readJson(manifestPath));
const summaries: Array<{
  readonly passageTitle: string;
  readonly paragraphId: string;
  readonly position: number;
  readonly initialDecision: string;
  readonly repairCycles: number;
  readonly finalStatus: string;
  readonly reviewFile: string;
}> = [];

for (const passage of manifest.passages.filter((value) => CANARY_SOURCE_IDS.has(value.sourceId))) {
  for (const paragraph of passage.paragraphs) {
    const artifactDir = resolve(experimentRoot, 'artifacts', passage.sourceId, paragraph.paragraphId);
    const source = readJson(resolve(artifactDir, '00-source.json'));
    const initialDiagnostic = readJson(resolve(artifactDir, 'diagnostic-gold-candidate.json'));
    const initialBundle = readJson(resolve(artifactDir, 'proposition-bundle-candidate.json'));
    const initialAuditStage = readJson(resolve(artifactDir, '04-audit.json'));
    const firstRepairStage = readIfExists(resolve(artifactDir, '05-repair.json'));
    const firstReauditStage = readIfExists(resolve(artifactDir, '06-reaudit.json'));
    const secondRepairStage = readIfExists(resolve(artifactDir, '07-repair-2.json'));
    const secondReauditStage = readIfExists(resolve(artifactDir, '08-reaudit-2.json'));
    const firstDiagnostic = readIfExists(resolve(artifactDir, 'diagnostic-gold-repaired.json'));
    const firstBundle = readIfExists(resolve(artifactDir, 'proposition-bundle-repaired.json'));
    const secondDiagnostic = readIfExists(resolve(artifactDir, 'diagnostic-gold-repaired-2.json'));
    const secondBundle = readIfExists(resolve(artifactDir, 'proposition-bundle-repaired-2.json'));
    const finalStatus = readJson(resolve(artifactDir, 'status.json'));

    const initialAudit = stageResult(initialAuditStage);
    const firstRepair = stageResult(firstRepairStage);
    const firstReaudit = stageResult(firstReauditStage);
    const secondRepair = stageResult(secondRepairStage);
    const secondReaudit = stageResult(secondReauditStage);
    const repairCycles = secondRepair !== null ? 2 : firstRepair !== null ? 1 : 0;

    const initialRecord = {
      artifactType: 'canary-paragraph-initial-result-v1',
      passage: {
        sourceId: passage.sourceId,
        passageId: passage.passageId,
        title: passage.title,
        exam: passage.exam,
      },
      paragraph: field(source, 'paragraph'),
      initialCandidate: {
        diagnosticGold: initialDiagnostic,
        propositionBundle: initialBundle,
      },
      initialAudit,
      trace: {
        analysis: stageTrace(readJson(resolve(artifactDir, '01-analysis.json'))),
        decomposition: stageTrace(readJson(resolve(artifactDir, '02-decomposition.json'))),
        mapping: stageTrace(readJson(resolve(artifactDir, '03-mapping.json'))),
        audit: stageTrace(initialAuditStage),
      },
      sourceArtifactPath: relative(reviewRoot, resolve(artifactDir, '00-source.json')),
      sourceArtifactHash: artifactHash(source),
    };

    const firstChanges = firstRepair === null ? null : {
      diagnosticGold: jsonDifferences(initialDiagnostic, firstDiagnostic),
      propositionBundle: jsonDifferences(initialBundle, firstBundle),
    };
    const secondChanges = secondRepair === null ? null : {
      diagnosticGold: jsonDifferences(firstDiagnostic, secondDiagnostic),
      propositionBundle: jsonDifferences(firstBundle, secondBundle),
    };
    const historyRecord = {
      artifactType: 'canary-paragraph-repair-history-v1',
      sourceId: passage.sourceId,
      passageId: passage.passageId,
      paragraphId: paragraph.paragraphId,
      initialAudit,
      repairCycles: [
        ...(firstRepair === null ? [] : [{
          cycle: 1,
          repair: firstRepair,
          repairTrace: stageTrace(firstRepairStage),
          repairedDiagnosticGold: firstDiagnostic,
          repairedPropositionBundle: firstBundle,
          fieldChanges: firstChanges,
          reaudit: firstReaudit,
          reauditTrace: stageTrace(firstReauditStage),
        }]),
        ...(secondRepair === null ? [] : [{
          cycle: 2,
          repair: secondRepair,
          repairTrace: stageTrace(secondRepairStage),
          repairedDiagnosticGold: secondDiagnostic,
          repairedPropositionBundle: secondBundle,
          fieldChanges: secondChanges,
          reaudit: secondReaudit,
          reauditTrace: stageTrace(secondReauditStage),
        }]),
      ],
      finalStatus,
    };

    const initialPath = resolve(reviewRoot, 'initial-results', `${paragraph.paragraphId}.json`);
    const historyPath = resolve(reviewRoot, 'repair-history', `${paragraph.paragraphId}.json`);
    const paragraphReviewPath = resolve(reviewRoot, 'paragraphs', `${paragraph.paragraphId}.md`);
    writeJson(initialPath, initialRecord);
    writeJson(historyPath, historyRecord);

    const markdown: string[] = [
      `# ${passage.title} · ${paragraph.position}문단`,
      '',
      `- 문단 ID: \`${paragraph.paragraphId}\``,
      `- 최초 감사: ${textField(initialAudit, 'decision')}`,
      `- 자동 수리 횟수: ${repairCycles}회`,
      `- 최종 상태: ${textField(finalStatus, 'status')}`,
      `- 생산 사용 가능: ${String(field(finalStatus, 'productionEligible'))}`,
      `- 원본 JSON: ${markdownLink(paragraphReviewPath, initialPath, '1차 결과')}`,
      `- 수정 이력 JSON: ${markdownLink(paragraphReviewPath, historyPath, '수정 과정')}`,
      '',
      '## 원문',
      '',
      paragraph.text,
      '',
      '## 최초 감사 결과',
      '',
      textField(initialAudit, 'summary'),
      '',
      ...issueLines(initialAudit),
    ];
    if (firstRepair !== null) {
      markdown.push(
        '',
        '## 1차 수리와 재감사',
        '',
        `수리 요약: ${textField(firstRepair, 'summary')}`,
        '',
        `재감사 결정: ${textField(firstReaudit, 'decision')}`,
        '',
        textField(firstReaudit, 'summary'),
        '',
        ...issueLines(firstReaudit),
      );
    }
    if (secondRepair !== null) {
      markdown.push(
        '',
        '## 2차 수리와 재감사',
        '',
        `수리 요약: ${textField(secondRepair, 'summary')}`,
        '',
        `재감사 결정: ${textField(secondReaudit, 'decision')}`,
        '',
        textField(secondReaudit, 'summary'),
        '',
        ...issueLines(secondReaudit),
      );
    }
    markdown.push(
      '',
      '## 최종 상태',
      '',
      textField(finalStatus, 'reason'),
      '',
    );
    mkdirSync(dirname(paragraphReviewPath), { recursive: true });
    writeFileSync(paragraphReviewPath, markdown.join('\n'), 'utf8');

    summaries.push({
      passageTitle: passage.title,
      paragraphId: paragraph.paragraphId,
      position: paragraph.position,
      initialDecision: textField(initialAudit, 'decision'),
      repairCycles,
      finalStatus: textField(finalStatus, 'status'),
      reviewFile: paragraphReviewPath,
    });
  }
}

const summaryPath = resolve(reviewRoot, 'README.md');
const auditedCount = summaries.filter((summary) => summary.finalStatus === 'AGENT_AUDITED').length;
const reviewRequiredCount = summaries.length - auditedCount;
const summaryMarkdown = [
  '# 카나리 16개 문단 직접 검토 자료',
  '',
  '이 폴더는 최초 생성 결과와 이후 수정 과정을 분리해 보존한다.',
  '',
  '- `initial-results/`: 원문, 최초 진단 골드·명제 Bundle, 최초 독립 감사 결과',
  '- `repair-history/`: 감사 쟁점, 1·2차 수리 결과, 재감사 결과, 필드별 변경 내역',
  '- `paragraphs/`: 사람이 읽기 쉬운 문단별 요약',
  '',
  `현재 결과: AGENT_AUDITED ${auditedCount}개, REVIEW_REQUIRED ${reviewRequiredCount}개`,
  '',
  '| 지문 | 문단 | 최초 감사 | 수리 횟수 | 최종 상태 | 검토 |',
  '|---|---:|---|---:|---|---|',
  ...summaries.map((summary) =>
    `| ${summary.passageTitle} | ${summary.position} | ${summary.initialDecision} | ` +
    `${summary.repairCycles} | ${summary.finalStatus} | ` +
    `${markdownLink(summaryPath, summary.reviewFile, '열기')} |`),
  '',
  '주의: REVIEW_REQUIRED 문단은 2차 자동 수리까지 완료했지만 감사 쟁점이 남아 있으며, 더 이상 자동 수정하지 않았다.',
  '',
].join('\n');
mkdirSync(reviewRoot, { recursive: true });
writeFileSync(summaryPath, summaryMarkdown, 'utf8');

process.stdout.write(
  `카나리 검토 자료 생성 완료: ${summaries.length}개 문단 ` +
  `(AGENT_AUDITED ${auditedCount}, REVIEW_REQUIRED ${reviewRequiredCount})\n${summaryPath}\n`,
);
