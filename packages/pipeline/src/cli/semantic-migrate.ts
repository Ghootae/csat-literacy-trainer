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
import { resolve } from 'node:path';

import type { Gold } from '../gold.js';
import { GoldGenerationMetadataSchema } from '../gold-generation-metadata.js';
import { GeneratedQuerySetSchema, type GeneratedQuerySet } from '../llm/query-gen.js';
import { validateTitleQuerySet } from '../llm/title-gen.js';
import {
  applyRepairPlan,
  assertVerificationGate,
  evidenceContractViolations,
  makeVerificationRecord,
  planSemanticRepair,
  reportBlockers,
  validateGoldStructure,
  validateQueryStructure,
  verifyGoldSemantic,
  verifyQuerySemantic,
  type RepairPlan,
  type SemanticVerificationReport,
} from '../semantic-verification.js';

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
}): Promise<{ candidate: T; reports: SemanticVerificationReport[]; repairs: RepairPlan[]; reportPaths: string[] }> {
  let candidate = structuredClone(args.initial);
  const reports: SemanticVerificationReport[] = [];
  const repairs: RepairPlan[] = [];
  const reportPaths: string[] = [];
  let repairCycles = 0;
  let consecutiveCleanPasses = 0;

  for (let pass = 1; ; pass++) {
    // 이 호출에는 앞선 pass의 issue나 repair rationale가 들어가지 않는다.
    const report = await args.verify(candidate);
    reports.push(report);
    const relative = `packages/pipeline/fixtures/semantic-verification/${args.paragraphId}/${args.artifactDir.split('/').at(-1)}/${args.kind}-pass-${pass}.json`;
    writeJson(resolve(ROOT, relative), report);
    const evidencePath = resolve(args.artifactDir, `${args.kind}-pass-${pass}-evidence.json`);
    const violations = evidenceContractViolations(args.sourceText, report);
    writeJson(evidencePath, {
      compliant: violations.length === 0,
      issueCount: report.issues.length,
      violationCount: violations.length,
      violations,
    });
    reportPaths.push(relative);
    const blockers = reportBlockers(report);
    console.log(`    ${args.kind} pass ${pass}: blocker ${blockers.length}, warning ${report.issues.length - blockers.length}`);

    consecutiveCleanPasses = blockers.length === 0 ? consecutiveCleanPasses + 1 : 0;
    if (consecutiveCleanPasses >= 2) {
      return { candidate, reports, repairs, reportPaths };
    }
    if (blockers.length === 0) continue;
    if (repairCycles >= 2) {
      return { candidate, reports, repairs, reportPaths };
    }

    const repairKind = args.kind === 'gold' ? 'gold' : 'query';
    const plan = await planSemanticRepair(repairKind, args.sourceText, candidate, blockers, args.paragraphId);
    repairCycles++;
    repairs.push(plan);
    writeJson(resolve(args.artifactDir, `${args.kind}-repair-${repairCycles}.json`), plan);
    candidate = applyRepairPlan(candidate, plan);
    consecutiveCleanPasses = 0;
    args.validate(candidate);
    writeJson(resolve(args.artifactDir, `${args.kind}-candidate-${repairCycles + 1}.json`), candidate);
  }
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
    verify: (candidate) => verifyGoldSemantic(passage.text, candidate, id),
    validate: validateGoldStructure,
  });
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
    verify: (candidate) => verifyQuerySemantic(passage.text, verifiedGold, candidate, id),
    validate: (candidate) => { GeneratedQuerySetSchema.parse(candidate); validateQueryStructure(verifiedGold, candidate); },
  });
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
    verify: (candidate) => verifyQuerySemantic(passage.text, verifiedGold, candidate, id),
    validate: (candidate) => {
      GeneratedQuerySetSchema.parse(candidate);
      validateQueryStructure(verifiedGold, candidate);
      const problems = validateTitleQuerySet(candidate);
      if (problems.length > 0) throw new Error(`${id}: title query 구조 오류: ${problems.join(', ')}`);
    },
  });
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
  const result = await verifyWithRepair({
    kind: 'title-query', paragraphId: id, sourceText: passage.text, initial: existing, artifactDir,
    verify: (candidate) => verifyQuerySemantic(passage.text, gold, candidate, id),
    validate: (candidate) => {
      GeneratedQuerySetSchema.parse(candidate);
      validateQueryStructure(gold, candidate);
      const problems = validateTitleQuerySet(candidate);
      if (problems.length > 0) throw new Error(`${id}: title query 구조 오류: ${problems.join(', ')}`);
    },
  });
  const record = makeVerificationRecord({
    sourceText: passage.text,
    candidate: result.candidate,
    reports: result.reports,
    repairCycles: result.repairs.length,
    reportPaths: result.reportPaths,
  });
  if (record.status !== 'passed') {
    writeJson(resolve(artifactDir, 'summary.json'), { id, titleQuery: record, status: 'blocked' });
    throw new Error(`${id}: title query semantic verification 실패`);
  }
  const verified: GeneratedQuerySet = { ...result.candidate, semanticVerification: record };
  assertVerificationGate(passage.text, verified, verified.semanticVerification);
  writeJson(resolve(artifactDir, 'summary.json'), {
    id,
    status: 'passed',
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
