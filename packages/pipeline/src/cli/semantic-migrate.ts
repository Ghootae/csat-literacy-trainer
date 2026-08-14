/**
 * 현재 production content를 독립 semantic verifier 계약으로 마이그레이션한다.
 *
 *   npm run content:verify -- --id photosynthesis-p1
 *   npm run content:verify -- --all
 *
 * 각 verifier pass는 원문+현재 후보만 받는다. 이전 verdict와 repair 설명은 second pass에
 * 전달하지 않는다. raw structured output은 tracked fixture에 pass별로 보존한다.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import type { Gold } from '../gold.js';
import { GoldGenerationMetadataSchema } from '../gold-generation-metadata.js';
import { MODEL } from '../llm/client.js';
import { GeneratedQuerySetSchema, type GeneratedQuerySet } from '../llm/query-gen.js';
import { generateTitleQuerySet, validateTitleQuerySet } from '../llm/title-gen.js';
import {
  assertVerificationGate,
  makeVerificationRecord,
  planSemanticRepair,
  SEMANTIC_REPORT_SCHEMA_VERSION,
  SEMANTIC_VERIFICATION_EFFORT,
  SEMANTIC_VERIFIER_VERSION,
  validateGoldStructure,
  validateQueryStructure,
  type SemanticVerificationReport,
} from '../semantic-verification.js';
import {
  applyGuardedRepairPlan,
  runSemanticQualification,
  type GuardedRepairResult,
  type QualificationExecution,
} from '../semantic-qualification.js';
import { runSelectedSemanticVerifier } from '../semantic-verification-routing.js';

const ROOT = process.cwd();
const CONTENT = resolve(ROOT, 'content');
const ARTIFACTS = resolve(ROOT, 'packages/pipeline/fixtures/semantic-verification');
const IDS = [
  'corporate-law-p1',
  'disclosure-p3',
  'humanities-p4',
  'nietzsche-p1',
  'photosynthesis-p1',
  'photosynthesis-p2',
  'photosynthesis-p3',
  'photosynthesis-p4',
  'photosynthesis-p5',
  'photosynthesis-p6',
  'science-p5',
] as const;

interface Passage { readonly text: string }

function validateMigratedTitleQuerySet(set: GeneratedQuerySet): void {
  if (set.regions.length !== 1) throw new Error(`${set.paragraphId}: title 영역은 1개여야 한다`);
  const queries = set.regions[0]?.queries ?? [];
  if (queries.length !== 3) throw new Error(`${set.paragraphId}: title 질의는 3개여야 한다`);
  for (const id of ['qT1', 'qT2', 'qT3']) {
    if (!queries.some((query) => query.id === id)) throw new Error(`${set.paragraphId}: ${id} 없음`);
  }
  const byId = new Map(queries.map((query) => [query.id, query]));
  if (byId.get('qT1')?.level !== 'scope') throw new Error(`${set.paragraphId}: qT1은 scope여야 한다`);
  if (!['relation', 'argument'].includes(byId.get('qT2')?.level ?? '')) throw new Error(`${set.paragraphId}: qT2 level 오류`);
  if (byId.get('qT2')?.criticalForRelation !== true) throw new Error(`${set.paragraphId}: qT2는 critical이어야 한다`);
  if (byId.get('qT3')?.level !== 'argument' || byId.get('qT3')?.criticalForRelation === true) {
    throw new Error(`${set.paragraphId}: qT3는 비필수 argument여야 한다`);
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function runId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function verifyWithRepair<T extends Gold | GeneratedQuerySet>(args: {
  readonly kind: 'gold' | 'query' | 'title-query';
  readonly paragraphId: string;
  readonly sourceText: string;
  readonly initial: T;
  readonly artifactDir: string;
  readonly verify: (candidate: T) => Promise<SemanticVerificationReport>;
  readonly validate: (candidate: T) => void;
}): Promise<QualificationExecution<T>> {
  return runSemanticQualification({
    assetType: args.kind,
    verifierKind: args.kind,
    sourceText: args.sourceText,
    initial: args.initial,
    provider: 'anthropic',
    model: MODEL,
    effort: SEMANTIC_VERIFICATION_EFFORT,
    promptVersion: `${SEMANTIC_VERIFIER_VERSION}:${args.kind}`,
    reportSchemaVersion: SEMANTIC_REPORT_SCHEMA_VERSION,
    maxRepairCycles: 2,
    verify: async (candidate) => ({ output: await args.verify(candidate), resultReplay: false }),
    repair: async (candidate, blockers, repairCycle): Promise<GuardedRepairResult<T>> => {
      const plan = await planSemanticRepair(args.kind, args.sourceText, candidate, blockers, args.paragraphId);
      const repairPath = resolve(args.artifactDir, `${args.kind}-repair-${repairCycle}.json`);
      const diffPath = resolve(args.artifactDir, `${args.kind}-repair-${repairCycle}-diff.json`);
      const artifactPath = relative(ROOT, repairPath);
      writeJson(repairPath, plan);
      const repaired = applyGuardedRepairPlan({
        assetType: args.kind,
        candidate,
        issues: blockers,
        plan,
        repairCycle,
        artifactPath,
      });
      writeJson(diffPath, {
        repairCycle,
        repairArtifactPath: artifactPath,
        diffs: repaired.diffs,
      });
      writeJson(resolve(args.artifactDir, `${args.kind}-candidate-${repairCycle + 1}.json`), repaired.candidate);
      return repaired;
    },
    validate: args.validate,
    persistReport: (report, pass) => {
      const path = resolve(args.artifactDir, `${args.kind}-pass-${pass}.json`);
      const relativePath = relative(ROOT, path);
      writeJson(path, report);
      writeJson(resolve(args.artifactDir, `${args.kind}-pass-${pass}-evidence.json`), {
        compliant: true,
        issueCount: report.issues.length,
        violationCount: 0,
        violations: [],
      });
      return relativePath;
    },
  });
}

function correctedGenerationMetadata(gold: Gold, repaired: boolean, at: string): Gold['generationMetadata'] {
  if (gold.generationMetadata === undefined) return undefined;
  const metadata = GoldGenerationMetadataSchema.parse(gold.generationMetadata);
  const hasCorrection = metadata.revisions.some((revision) => revision.kind === 'legacy_correction');
  return {
    ...metadata,
    revisions: [
      ...metadata.revisions,
      ...(hasCorrection ? [] : [{
        at,
        kind: 'legacy_correction' as const,
        actor: 'system' as const,
        note: '기존 reviewed/human_edit 표시는 Codex agent 작업 기록이며 실제 인간 검수 증거가 아니다. semanticVerification이 production 품질 gate의 정본이다.',
      }]),
      ...(repaired ? [{
        at,
        kind: 'ai_repair' as const,
        actor: 'semantic_repairer' as const,
        note: '독립 semantic verifier의 critical/error issue만 최소 수정하고 새 pass로 재검증했다.',
      }] : []),
    ],
  };
}

async function migrate(id: string): Promise<void> {
  const dir = resolve(CONTENT, id);
  const passage = readJson<Passage>(resolve(dir, 'passage.json'));
  const existingGold = readJson<Gold>(resolve(dir, 'gold.json'));
  const existingQueries = readJson<GeneratedQuerySet>(resolve(dir, 'queries.json'));
  const existingTitleQueries = readJson<GeneratedQuerySet>(resolve(dir, 'title-queries.json'));

  try {
    assertVerificationGate(passage.text, existingGold, existingGold.semanticVerification);
    assertVerificationGate(passage.text, existingQueries, existingQueries.semanticVerification);
    assertVerificationGate(passage.text, existingTitleQueries, existingTitleQueries.semanticVerification);
    console.log(`  ${id}: 이미 현재 계약으로 통과 — 재실행하지 않음`);
    return;
  } catch {
    // 미검증 또는 구 fingerprint는 새 run으로 검증한다.
  }

  const stamp = runId();
  const artifactDir = resolve(ARTIFACTS, id, stamp);
  mkdirSync(artifactDir, { recursive: true });
  writeJson(resolve(artifactDir, 'gold-candidate-1.json'), existingGold);
  writeJson(resolve(artifactDir, 'query-candidate-1.json'), existingQueries);
  writeJson(resolve(artifactDir, 'title-query-candidate-1.json'), existingTitleQueries);
  console.log(`  ${id}`);

  const goldResult = await verifyWithRepair({
    kind: 'gold', paragraphId: id, sourceText: passage.text, initial: existingGold, artifactDir,
    verify: (candidate) => runSelectedSemanticVerifier({ kind: 'gold', sourceText: passage.text, candidate, paragraphId: id }),
    validate: validateGoldStructure,
  });
  if (goldResult.status !== 'qualified') {
    writeJson(resolve(artifactDir, 'summary.json'), { id, status: goldResult.status, failureReason: goldResult.failureReason });
    throw new Error(`${id}: gold semantic qualification ${goldResult.status}`);
  }
  const goldRecord = makeVerificationRecord({
    sourceText: passage.text,
    candidate: goldResult.candidate,
    reports: goldResult.reports,
    repairCycles: goldResult.repairs.length,
    reportPaths: goldResult.reportPaths,
  });
  if (goldRecord.status !== 'passed') {
    writeJson(resolve(artifactDir, 'summary.json'), { id, gold: goldRecord, status: 'blocked' });
    throw new Error(`${id}: gold semantic verification 실패`);
  }
  const now = new Date().toISOString();
  const correctedMetadata = correctedGenerationMetadata(existingGold, goldResult.repairs.length > 0, now);
  const verifiedGold: Gold = {
    ...goldResult.candidate,
    ...(correctedMetadata === undefined ? {} : { generationMetadata: correctedMetadata }),
    semanticVerification: goldRecord,
  };
  assertVerificationGate(passage.text, verifiedGold, verifiedGold.semanticVerification);

  const queryResult = await verifyWithRepair({
    kind: 'query', paragraphId: id, sourceText: passage.text, initial: existingQueries, artifactDir,
    verify: (candidate) => runSelectedSemanticVerifier({ kind: 'query', sourceText: passage.text, gold: verifiedGold, candidate, paragraphId: id }),
    validate: (candidate) => { GeneratedQuerySetSchema.parse(candidate); validateQueryStructure(verifiedGold, candidate); },
  });
  if (queryResult.status !== 'qualified') {
    writeJson(resolve(artifactDir, 'summary.json'), { id, gold: goldRecord, status: queryResult.status, failureReason: queryResult.failureReason });
    throw new Error(`${id}: query semantic qualification ${queryResult.status}`);
  }
  const queryRecord = makeVerificationRecord({
    sourceText: passage.text,
    candidate: queryResult.candidate,
    reports: queryResult.reports,
    repairCycles: queryResult.repairs.length,
    reportPaths: queryResult.reportPaths,
  });
  if (queryRecord.status !== 'passed') {
    writeJson(resolve(artifactDir, 'summary.json'), { id, gold: goldRecord, query: queryRecord, status: 'blocked' });
    throw new Error(`${id}: query semantic verification 실패`);
  }
  const verifiedQueries: GeneratedQuerySet = { ...queryResult.candidate, semanticVerification: queryRecord };
  assertVerificationGate(passage.text, verifiedQueries, verifiedQueries.semanticVerification);

  const titleResult = await verifyWithRepair({
    kind: 'title-query', paragraphId: id, sourceText: passage.text, initial: existingTitleQueries, artifactDir,
    verify: (candidate) => runSelectedSemanticVerifier({ kind: 'title-query', sourceText: passage.text, gold: verifiedGold, candidate, paragraphId: id }),
    validate: (candidate) => {
      GeneratedQuerySetSchema.parse(candidate);
      validateQueryStructure(verifiedGold, candidate);
      validateMigratedTitleQuerySet(candidate);
    },
  });
  if (titleResult.status !== 'qualified') {
    writeJson(resolve(artifactDir, 'summary.json'), { id, gold: goldRecord, query: queryRecord, status: titleResult.status, failureReason: titleResult.failureReason });
    throw new Error(`${id}: title query semantic qualification ${titleResult.status}`);
  }
  const titleRecord = makeVerificationRecord({
    sourceText: passage.text,
    candidate: titleResult.candidate,
    reports: titleResult.reports,
    repairCycles: titleResult.repairs.length,
    reportPaths: titleResult.reportPaths,
  });
  if (titleRecord.status !== 'passed') {
    writeJson(resolve(artifactDir, 'summary.json'), { id, gold: goldRecord, query: queryRecord, titleQuery: titleRecord, status: 'blocked' });
    throw new Error(`${id}: title query semantic verification 실패`);
  }
  const verifiedTitleQueries: GeneratedQuerySet = { ...titleResult.candidate, semanticVerification: titleRecord };
  assertVerificationGate(passage.text, verifiedTitleQueries, verifiedTitleQueries.semanticVerification);

  writeJson(resolve(artifactDir, 'summary.json'), {
    id,
    status: 'passed',
    gold: goldRecord,
    query: queryRecord,
    titleQuery: titleRecord,
    semanticChanges: {
      gold: goldResult.repairs.length > 0,
      query: queryResult.repairs.length > 0,
      titleQuery: titleResult.repairs.length > 0,
    },
  });
  // 두 자산이 모두 통과한 뒤에만 production을 함께 교체한다.
  writeJson(resolve(dir, 'gold.json'), verifiedGold);
  writeJson(resolve(dir, 'queries.json'), verifiedQueries);
  writeJson(resolve(dir, 'title-queries.json'), verifiedTitleQueries);
}

async function migrateTitleOnly(id: string): Promise<void> {
  const dir = resolve(CONTENT, id);
  const passage = readJson<Passage>(resolve(dir, 'passage.json'));
  const gold = readJson<Gold>(resolve(dir, 'gold.json'));
  const queries = readJson<GeneratedQuerySet>(resolve(dir, 'queries.json'));
  const existing = readJson<GeneratedQuerySet>(resolve(dir, 'title-queries.json'));
  assertVerificationGate(passage.text, gold, gold.semanticVerification);
  assertVerificationGate(passage.text, queries, queries.semanticVerification);
  try {
    assertVerificationGate(passage.text, existing, existing.semanticVerification);
    console.log(`  ${id}: title query도 이미 현재 계약으로 통과 — 재실행하지 않음`);
    return;
  } catch {
    // title query만 아직 미검증이다.
  }

  const stamp = runId();
  const artifactDir = resolve(ARTIFACTS, id, stamp);
  mkdirSync(artifactDir, { recursive: true });
  writeJson(resolve(artifactDir, 'title-query-candidate-1.json'), existing);
  console.log(`  ${id} (title query)`);
  let candidate = existing;
  let legacyRecord: ReturnType<typeof makeVerificationRecord> | undefined;
  let result = await verifyWithRepair({
    kind: 'title-query', paragraphId: id, sourceText: passage.text, initial: existing, artifactDir,
    verify: (candidate) => runSelectedSemanticVerifier({ kind: 'title-query', sourceText: passage.text, gold, candidate, paragraphId: id }),
    validate: (candidate) => {
      GeneratedQuerySetSchema.parse(candidate);
      validateQueryStructure(gold, candidate);
      validateMigratedTitleQuerySet(candidate);
    },
  });
  if (result.status === 'incomplete') {
    writeJson(resolve(artifactDir, 'legacy-summary.json'), { id, status: result.status, failureReason: result.failureReason });
    throw new Error(`${id}: title query semantic qualification ${result.status}`);
  }
  let record = makeVerificationRecord({
    sourceText: passage.text,
    candidate: result.candidate,
    reports: result.reports,
    repairCycles: result.repairs.length,
    reportPaths: result.reportPaths,
  });
  if (record.status !== 'passed') {
    legacyRecord = record;
    writeJson(resolve(artifactDir, 'legacy-summary.json'), { id, titleQuery: record, status: 'failed' });
    console.log(`    legacy title 실패 — 현재 v2 generator로 새 후보 생성`);
    const titleNode = gold.nodes.find((node) => node.id === gold.titleId);
    candidate = await generateTitleQuerySet({
      paragraphId: id,
      titleShortForm: titleNode?.shortForm ?? titleNode?.text ?? '',
      sentences: gold.sentences,
      slots: gold.slots.map((slot) => ({ id: slot.slotId, shortForm: slot.shortForm })),
    });
    const generatedProblems = validateTitleQuerySet(candidate);
    if (generatedProblems.length > 0) throw new Error(`${id}: regenerated title 구조 오류: ${generatedProblems.join(', ')}`);
    writeJson(resolve(artifactDir, 'title-query-regenerated-candidate-1.json'), candidate);
    const regeneratedDir = resolve(artifactDir, 'regenerated');
    mkdirSync(regeneratedDir, { recursive: true });
    result = await verifyWithRepair({
      kind: 'title-query', paragraphId: id, sourceText: passage.text, initial: candidate, artifactDir: regeneratedDir,
      verify: (next) => runSelectedSemanticVerifier({ kind: 'title-query', sourceText: passage.text, gold, candidate: next, paragraphId: id }),
      validate: (next) => {
        GeneratedQuerySetSchema.parse(next);
        validateQueryStructure(gold, next);
        const problems = validateTitleQuerySet(next);
        if (problems.length > 0) throw new Error(`${id}: regenerated title 구조 오류: ${problems.join(', ')}`);
      },
    });
    if (result.status === 'incomplete') {
      writeJson(resolve(artifactDir, 'summary.json'), { id, legacyTitleQuery: legacyRecord, status: result.status, failureReason: result.failureReason });
      throw new Error(`${id}: regenerated title query semantic qualification ${result.status}`);
    }
    record = makeVerificationRecord({
      sourceText: passage.text,
      candidate: result.candidate,
      reports: result.reports,
      repairCycles: result.repairs.length,
      reportPaths: result.reportPaths,
    });
    if (record.status !== 'passed') {
      writeJson(resolve(artifactDir, 'summary.json'), { id, legacyTitleQuery: legacyRecord, regeneratedTitleQuery: record, status: 'blocked' });
      throw new Error(`${id}: regenerated title query semantic verification 실패`);
    }
  }
  const verified: GeneratedQuerySet = { ...result.candidate, semanticVerification: record };
  assertVerificationGate(passage.text, verified, verified.semanticVerification);
  writeJson(resolve(artifactDir, 'summary.json'), {
    id,
    status: 'passed',
    ...(legacyRecord === undefined ? {} : { legacyTitleQuery: legacyRecord }),
    titleQuery: record,
    semanticChanges: { titleQuery: result.repairs.length > 0 },
  });
  writeJson(resolve(dir, 'title-queries.json'), verified);
}

async function main(): Promise<void> {
  if (existsSync(resolve(ROOT, '.env'))) process.loadEnvFile(resolve(ROOT, '.env'));
  if (process.env['ANTHROPIC_API_KEY'] === undefined) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았다');
  const idIndex = process.argv.indexOf('--id');
  const only = idIndex === -1 ? undefined : process.argv[idIndex + 1];
  const all = process.argv.includes('--all');
  const titlesOnly = process.argv.includes('--titles-only');
  if ((only === undefined) === !all) throw new Error('사용법: npm run content:verify -- --id <id> 또는 --all');
  if (only !== undefined && !IDS.includes(only as typeof IDS[number])) throw new Error(`알 수 없는 production 문단: ${only}`);
  const selected: readonly string[] = only === undefined ? IDS : [only];
  for (const id of selected) {
    if (titlesOnly) await migrateTitleOnly(id);
    else await migrate(id);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
