/**
 * tracked source fixture와 staging candidate를 production 편입 전에 qualification한다.
 * --dry-run은 API key를 읽지 않고 파일도 쓰지 않는다.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Gold } from '../gold.js';
import {
  buildPendingQualificationManifest,
  createQualificationDryRunSummary,
  planCandidateQualification,
  qualificationArtifactHash,
  QualificationManifestSchema,
  verifierInputText,
  type CandidateGenerationProvenance,
  type QualificationManifest,
} from '../candidate-qualification.js';
import { MODEL } from '../llm/client.js';
import { GeneratedQuerySetSchema, type GeneratedQuerySet } from '../llm/query-gen.js';
import {
  applyGuardedRepairPlan,
  makeVerificationRecordV2,
  runSemanticQualification,
  type SemanticAssetType,
} from '../semantic-qualification.js';
import {
  planSemanticRepair,
  SEMANTIC_REPORT_SCHEMA_VERSION,
  SEMANTIC_VERIFICATION_EFFORT,
  SEMANTIC_VERIFIER_VERSION,
  semanticVerifierFingerprint,
  validateGoldStructure,
  validateQueryStructure,
} from '../semantic-verification.js';
import { runSelectedSemanticVerifier } from '../semantic-verification-routing.js';

const ROOT = process.cwd();
const ARTIFACT_ROOT = resolve(ROOT, 'packages/pipeline/fixtures/semantic-qualification');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function option(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

function required(argv: readonly string[], name: string): string {
  const value = option(argv, name);
  if (value === undefined) throw new Error(`${name} 값이 필요하다`);
  return value;
}

function parseAssetTypes(value: string | undefined): SemanticAssetType[] {
  if (value === undefined || value === 'all') return ['gold', 'query', 'title-query'];
  if (value === 'gold' || value === 'query' || value === 'title-query') return [value];
  throw new Error('--asset-type은 gold|query|title-query|all이어야 한다');
}

function validateTitleCandidate(gold: Gold, candidate: GeneratedQuerySet): void {
  GeneratedQuerySetSchema.parse(candidate);
  validateQueryStructure(gold, candidate);
  const queries = candidate.regions[0]?.queries ?? [];
  if (candidate.regions.length !== 1 || queries.length !== 3) throw new Error('title-query는 1개 영역·3개 질의여야 한다');
  for (const id of ['qT1', 'qT2', 'qT3']) {
    if (!queries.some((query) => query.id === id)) throw new Error(`title-query ${id} 없음`);
  }
}

function generationSidecars(candidateDir: string): Partial<Record<SemanticAssetType, CandidateGenerationProvenance>> | undefined {
  const path = resolve(candidateDir, 'generation-provenance.json');
  if (!existsSync(path)) return undefined;
  const raw = readJson<{ gold?: CandidateGenerationProvenance; query?: CandidateGenerationProvenance; titleQuery?: CandidateGenerationProvenance }>(path);
  return {
    ...(raw.gold === undefined ? {} : { gold: raw.gold }),
    ...(raw.query === undefined ? {} : { query: raw.query }),
    ...(raw.titleQuery === undefined ? {} : { 'title-query': raw.titleQuery }),
  };
}

function isTracked(path: string): boolean {
  const repositoryPath = relative(ROOT, path);
  if (repositoryPath.startsWith('..')) return false;
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', repositoryPath], { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function runContentQualificationCli(argv = process.argv.slice(2)): Promise<unknown> {
  const dryRun = argv.includes('--dry-run');
  const legacy = argv.includes('--legacy-requalification');
  const candidateDir = resolve(ROOT, required(argv, '--candidate-dir'));
  const sourceFixturePath = resolve(ROOT, required(argv, '--source-fixture'));
  const paragraphId = required(argv, '--paragraph-id');
  const sourceParagraphId = required(argv, '--source-paragraph-id');
  const regressionProbes = Number(required(argv, '--regression-probes'));
  if (!Number.isInteger(regressionProbes) || regressionProbes < 0) throw new Error('--regression-probes는 0 이상의 정수여야 한다');
  const selectedAssetTypes = parseAssetTypes(option(argv, '--asset-type'));
  const candidatePaths = {
    gold: resolve(candidateDir, 'gold.json'),
    query: resolve(candidateDir, 'queries.json'),
    'title-query': resolve(candidateDir, 'title-queries.json'),
  } as const;
  for (const path of [sourceFixturePath, ...Object.values(candidatePaths)]) {
    if (!existsSync(path)) throw new Error(`필수 파일 없음: ${path}`);
  }

  const sidecars = generationSidecars(candidateDir);
  const regressionFixture = option(argv, '--regression-fixture');
  const plan = planCandidateQualification({
    paragraphId,
    sourceFixture: readJson<unknown>(sourceFixturePath),
    sourceParagraphId,
    gold: readJson<unknown>(candidatePaths.gold),
    query: readJson<unknown>(candidatePaths.query),
    titleQuery: readJson<unknown>(candidatePaths['title-query']),
    mode: legacy ? 'legacy-requalification' : 'new',
    selectedAssetTypes,
    regressionProbes,
    sourceFixtureTracked: isTracked(sourceFixturePath),
    ...(sidecars === undefined ? {} : { generationSidecars: sidecars }),
  });
  let manifest: QualificationManifest = buildPendingQualificationManifest({
    plan,
    paragraphId,
    sourceFixturePath: relative(ROOT, sourceFixturePath),
    candidatePaths: {
      gold: relative(ROOT, candidatePaths.gold),
      query: relative(ROOT, candidatePaths.query),
      'title-query': relative(ROOT, candidatePaths['title-query']),
    },
    regressionProbes,
    ...(regressionFixture === undefined ? {} : { regressionFixturePath: regressionFixture }),
  });

  const summary = () => dryRun
    ? createQualificationDryRunSummary(paragraphId, plan, manifest)
    : {
      ...createQualificationDryRunSummary(paragraphId, plan, manifest),
      dryRun: false,
    };

  if (dryRun) {
    const result = summary();
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  if (plan.preflightReasons.length > 0) {
    console.log(JSON.stringify(summary(), null, 2));
    throw new Error('deterministic preflight 실패 — API를 호출하지 않았다');
  }
  if (existsSync(resolve(ROOT, '.env'))) process.loadEnvFile(resolve(ROOT, '.env'));
  if (process.env['ANTHROPIC_API_KEY'] === undefined) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았다');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactDir = resolve(ARTIFACT_ROOT, paragraphId, stamp);
  let gold = plan.candidates.gold;
  let query = plan.candidates.query;
  let titleQuery = plan.candidates.titleQuery;
  const assetLinks = { ...manifest.assets };
  const sourceInput = verifierInputText(plan.bundle);

  for (const assetType of selectedAssetTypes) {
    const initial = assetType === 'gold' ? gold : assetType === 'query' ? query : titleQuery;
    const kindDir = resolve(artifactDir, assetType);
    const execution = await runSemanticQualification({
      assetType,
      verifierKind: assetType,
      sourceText: sourceInput,
      evidenceSourceTexts: [plan.bundle.qualificationPrimaryText],
      initial,
      provider: 'anthropic',
      model: MODEL,
      effort: SEMANTIC_VERIFICATION_EFFORT,
      promptVersion: `${SEMANTIC_VERIFIER_VERSION}:${assetType}:semantic-source-bundle-v2-footnotes-ignored`,
      reportSchemaVersion: SEMANTIC_REPORT_SCHEMA_VERSION,
      maxRepairCycles: 2,
      verify: async (candidate) => ({
        output: assetType === 'gold'
          ? await runSelectedSemanticVerifier({ kind: 'gold', sourceText: sourceInput, candidate: candidate as Gold, paragraphId })
          : await runSelectedSemanticVerifier({ kind: assetType, sourceText: sourceInput, gold, candidate: candidate as GeneratedQuerySet, paragraphId }),
        resultReplay: false,
      }),
      repair: async (candidate, blockers, repairCycle) => {
        const planValue = await planSemanticRepair(assetType, sourceInput, candidate as Gold | GeneratedQuerySet, blockers, paragraphId);
        const repairPath = resolve(kindDir, `repair-${repairCycle}.json`);
        const artifactPath = relative(ROOT, repairPath);
        writeJson(repairPath, planValue);
        const repaired = applyGuardedRepairPlan({
          assetType,
          candidate: candidate as Gold | GeneratedQuerySet,
          issues: blockers,
          plan: planValue,
          repairCycle,
          artifactPath,
        });
        writeJson(resolve(kindDir, `repair-${repairCycle}-diff.json`), { repairCycle, diffs: repaired.diffs });
        return repaired;
      },
      validate: (candidate) => {
        if (assetType === 'gold') validateGoldStructure(candidate as Gold);
        else if (assetType === 'query') validateQueryStructure(gold, candidate as GeneratedQuerySet);
        else validateTitleCandidate(gold, candidate as GeneratedQuerySet);
      },
      persistReport: (report, pass) => {
        const path = resolve(kindDir, `pass-${pass}.json`);
        writeJson(path, report);
        return relative(ROOT, path);
      },
    });

    const candidate = execution.candidate as Gold | GeneratedQuerySet;
    const candidatePath = resolve(kindDir, 'candidate.json');
    writeJson(candidatePath, candidate);
    const fingerprint = semanticVerifierFingerprint(assetType, 'semantic-source-bundle-v2-footnotes-ignored');
    const record = makeVerificationRecordV2({
      assetType,
      verifierKind: assetType,
      sourceText: sourceInput,
      candidate,
      verifierFingerprint: fingerprint,
      execution,
    });
    const recordPath = resolve(kindDir, 'record-v2.json');
    writeJson(recordPath, record);
    const linkKey = assetType === 'title-query' ? 'titleQuery' : assetType;
    assetLinks[linkKey] = {
      ...assetLinks[linkKey]!,
      candidatePath: relative(ROOT, candidatePath),
      candidateHash: record.candidateHash,
      qualificationStatus: record.qualificationStatus,
      qualificationRecordPath: relative(ROOT, recordPath),
      qualificationRecordHash: qualificationArtifactHash(record),
    };
    if (assetType === 'gold') gold = candidate as Gold;
    else if (assetType === 'query') query = candidate as GeneratedQuerySet;
    else titleQuery = candidate as GeneratedQuerySet;
    if (execution.status !== 'qualified') break;
  }

  const allQualified = [assetLinks.gold, assetLinks.query, assetLinks.titleQuery]
    .every((link) => link?.qualificationStatus === 'qualified');
  manifest = QualificationManifestSchema.parse({
    ...manifest,
    assets: assetLinks,
    requalificationHistory: legacy && allQualified
      ? [{ at: new Date().toISOString(), note: 'legacy/no-fingerprint를 보존한 semantic v2 재검증. regression proof는 아직 pending.' }]
      : [],
    promotionBlockers: [...new Set([
      ...manifest.promotionBlockers.filter((reason) =>
        !reason.endsWith('v2 qualification 필요') && reason !== 'production-query regression proof pending'),
      ...([assetLinks.gold, assetLinks.query, assetLinks.titleQuery]
        .filter((link) => link?.qualificationStatus !== 'qualified')
        .map((link) => `${link?.assetType ?? 'asset'}: v2 qualification 미완료`)),
      'production-query regression proof pending',
    ])],
    promotionStatus: 'blocked',
  });
  const manifestPath = resolve(artifactDir, 'qualification-manifest.json');
  writeJson(manifestPath, manifest);
  const result = { ...summary(), manifestPath: relative(ROOT, manifestPath) };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runContentQualificationCli().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
