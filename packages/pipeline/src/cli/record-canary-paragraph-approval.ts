import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  ParagraphPropositionBundleSchema,
  ProspectiveParagraphGoldManifestSchema,
  artifactHash,
} from '../paragraph-analysis/production.js';

const CANARY_SOURCE_IDS = new Set([
  '69fd388386fd308968e0b9f4',
  '69c09163fa5063deffe1c180',
  '69c0961c78128b2a9bee0717',
]);
const COLLABORATIVE_PARAGRAPH_IDS = new Set([
  '69fd388386fd308968e0b9f4-p3',
  '69c09163fa5063deffe1c180-p5',
  '69c0961c78128b2a9bee0717-p2',
]);

const manifestPath = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/prospective-paragraph-gold-manifest-v1.json',
);
const experimentRoot = resolve(
  process.cwd(),
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04',
);
const approvalPath = resolve(experimentRoot, 'canary-approved-manifest-v1.json');
const artifactRoot = resolve(experimentRoot, 'artifacts');
const collaborativeRoot = resolve(experimentRoot, 'canary-review', 'collaborative-repair');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function relativeProjectPath(path: string): string {
  return relative(process.cwd(), path);
}

function findArtifactByHash<T>(options: {
  readonly paths: readonly string[];
  readonly expectedHash: string;
  readonly parse: (value: unknown) => T;
}): { readonly path: string; readonly value: T; readonly hash: string } {
  for (const path of options.paths) {
    if (!existsSync(path)) continue;
    const value = options.parse(readJson(path));
    const hash = artifactHash(value);
    if (hash === options.expectedHash) return { path, value, hash };
  }
  throw new Error(`승인 상태의 해시와 일치하는 산출물을 찾지 못했다: ${options.expectedHash}`);
}

const manifest = ProspectiveParagraphGoldManifestSchema.parse(readJson(manifestPath));
const approvals: Array<Record<string, unknown>> = [];

for (const passage of manifest.passages.filter((value) => CANARY_SOURCE_IDS.has(value.sourceId))) {
  for (const paragraph of passage.paragraphs) {
    if (COLLABORATIVE_PARAGRAPH_IDS.has(paragraph.paragraphId)) {
      const root = resolve(collaborativeRoot, paragraph.paragraphId);
      const diagnosticPath = resolve(root, 'diagnostic-gold.json');
      const bundlePath = resolve(root, 'proposition-bundle.json');
      const validationPath = resolve(root, 'validation.json');
      const diagnosticGold = ParagraphDiagnosticGoldSchema.parse(readJson(diagnosticPath));
      const propositionBundle = ParagraphPropositionBundleSchema.parse(readJson(bundlePath));
      const validation = readJson(validationPath) as {
        readonly schemaValidation?: unknown;
        readonly sourceTextPreserved?: unknown;
        readonly semanticChecks?: readonly { readonly passed?: unknown }[];
      };
      if (
        validation.schemaValidation !== 'PASS' ||
        validation.sourceTextPreserved !== true ||
        !Array.isArray(validation.semanticChecks) ||
        validation.semanticChecks.some((check) => check.passed !== true)
      ) {
        throw new Error(`${paragraph.paragraphId}: 협업 수리 검증이 완료되지 않았다.`);
      }
      approvals.push({
        sourceId: passage.sourceId,
        passageId: passage.passageId,
        paragraphId: paragraph.paragraphId,
        position: paragraph.position,
        title: passage.title,
        approvalLabel: 'SEMIAUTOMATIC_USER_AGENT_APPROVED',
        approvalPath: 'SEMIAUTOMATIC_COLLABORATION',
        approvedDiagnosticGold: {
          path: relativeProjectPath(diagnosticPath),
          hash: artifactHash(diagnosticGold),
        },
        approvedPropositionBundle: {
          path: relativeProjectPath(bundlePath),
          hash: artifactHash(propositionBundle),
        },
        approvalEvidence: {
          authority: 'USER',
          record: '2026-09-04 대화에서 카나리 16개 문단 전체 승인',
          validationPath: relativeProjectPath(validationPath),
        },
        productionEligible: true,
      });
      continue;
    }

    const root = resolve(artifactRoot, passage.sourceId, paragraph.paragraphId);
    const statusPath = resolve(root, 'status.json');
    const status = readJson(statusPath) as {
      readonly status?: unknown;
      readonly productionEligible?: unknown;
      readonly diagnosticGoldHash?: unknown;
      readonly propositionBundleHash?: unknown;
      readonly auditHash?: unknown;
    };
    if (
      status.status !== 'AGENT_AUDITED' ||
      status.productionEligible !== true ||
      typeof status.diagnosticGoldHash !== 'string' ||
      typeof status.propositionBundleHash !== 'string' ||
      typeof status.auditHash !== 'string'
    ) {
      throw new Error(`${paragraph.paragraphId}: 자동 감사 통과 상태가 아니다.`);
    }
    const diagnostic = findArtifactByHash({
      paths: [
        resolve(root, 'diagnostic-gold-candidate.json'),
        resolve(root, 'diagnostic-gold-repaired.json'),
      ],
      expectedHash: status.diagnosticGoldHash,
      parse: (value) => ParagraphDiagnosticGoldSchema.parse(value),
    });
    const bundle = findArtifactByHash({
      paths: [
        resolve(root, 'proposition-bundle-candidate.json'),
        resolve(root, 'proposition-bundle-repaired.json'),
      ],
      expectedHash: status.propositionBundleHash,
      parse: (value) => ParagraphPropositionBundleSchema.parse(value),
    });
    const auditPaths = [resolve(root, '04-audit.json'), resolve(root, '06-reaudit.json')];
    const auditPath = auditPaths.find((path) => {
      if (!existsSync(path)) return false;
      const artifact = readJson(path) as { readonly result?: unknown };
      return artifactHash(artifact.result) === status.auditHash;
    });
    if (auditPath === undefined) {
      throw new Error(`${paragraph.paragraphId}: 승인 상태의 감사 해시를 찾지 못했다.`);
    }
    approvals.push({
      sourceId: passage.sourceId,
      passageId: passage.passageId,
      paragraphId: paragraph.paragraphId,
      position: paragraph.position,
      title: passage.title,
      approvalLabel: 'AUTOMATIC_AGENT_AUDITED',
      approvalPath: 'AUTOMATIC',
      approvedDiagnosticGold: {
        path: relativeProjectPath(diagnostic.path),
        hash: diagnostic.hash,
      },
      approvedPropositionBundle: {
        path: relativeProjectPath(bundle.path),
        hash: bundle.hash,
      },
      approvalEvidence: {
        authority: 'AGENT_AUDIT_PIPELINE',
        statusPath: relativeProjectPath(statusPath),
        auditPath: relativeProjectPath(auditPath),
        auditHash: status.auditHash,
      },
      productionEligible: true,
    });
  }
}

const automaticCount = approvals.filter((approval) =>
  approval['approvalPath'] === 'AUTOMATIC').length;
const semiautomaticCount = approvals.filter((approval) =>
  approval['approvalPath'] === 'SEMIAUTOMATIC_COLLABORATION').length;
if (approvals.length !== 16 || automaticCount !== 13 || semiautomaticCount !== 3) {
  throw new Error(
    `승인 분류 수가 예상과 다르다: 전체 ${approvals.length}, 자동 ${automaticCount}, 반자동 ${semiautomaticCount}`,
  );
}

writeJson(approvalPath, {
  artifactType: 'paragraph-gold-approved-canary-manifest-v1',
  batchId: 'canary-16-batch-001',
  userApprovalRecordedOn: '2026-09-04',
  sourceManifestPath: relativeProjectPath(manifestPath),
  sourceManifestHash: artifactHash(manifest),
  counts: {
    total: approvals.length,
    automaticAgentAudited: automaticCount,
    semiautomaticUserAgentApproved: semiautomaticCount,
    productionEligible: approvals.filter((approval) =>
      approval['productionEligible'] === true).length,
  },
  labels: {
    AUTOMATIC_AGENT_AUDITED: '자동 생성·감사 및 최대 1차 수리 안에서 통과한 문단',
    SEMIAUTOMATIC_USER_AGENT_APPROVED: '자동 수리 후 남은 문제를 사용자와 에이전트가 협업 수리하여 승인한 문단',
  },
  paragraphs: approvals,
});

process.stdout.write(
  `카나리 승인 기록 완료: 전체 ${approvals.length}, 자동 ${automaticCount}, 반자동 ${semiautomaticCount}\n` +
  `${approvalPath}\n`,
);
