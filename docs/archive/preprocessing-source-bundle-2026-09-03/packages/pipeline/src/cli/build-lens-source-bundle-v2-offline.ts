import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { SourcePacketSchema, sourceArtifactHash } from '../problem-solving/source-bundle.js';
import {
  buildSourceUnitRegistry,
  type SourceUnitRegistry,
  validateSourceUnitRegistryAgainstPacket,
} from '../problem-solving/source-bundle-v2.js';
import {
  LegacyRawSourceBundleSchema,
  buildLensEntityRegistry,
  compareLegacyRunsBySourceUnit,
  remapLegacyRawBundle,
  type LegacyClaimRemap,
} from '../problem-solving/source-bundle-v2-analysis.js';

const DEFAULT_ARTIFACT_ROOT = resolve(
  'docs/experiments/problem-source-bundle-lens-2026-09-03/artifacts',
);
const DEFAULT_V2_ROOT = resolve(
  'docs/experiments/problem-source-bundle-lens-2026-09-03/v2-offline',
);

function option(name: string): string | undefined {
  return process.argv.find((argument) => argument.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function tsvCell(value: unknown): string {
  return String(value ?? '').replaceAll(/[\t\r\n]+/g, ' ');
}

async function writeTsv(path: string, rows: readonly unknown[][]): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${rows.map((row) => row.map(tsvCell).join('\t')).join('\n')}\n`, 'utf8');
}

function registrySummary(registry: SourceUnitRegistry): unknown {
  return {
    sourcePacketHash: registry.sourcePacketHash,
    unitCount: registry.units.length,
    countsByType: Object.fromEntries([...new Set(registry.units.map((unit) => unit.unitType))]
      .map((type) => [type, registry.units.filter((unit) => unit.unitType === type).length])),
    offsetOwnership: registry.offsetOwnership,
    exactReconstructionValidation: 'PASSED',
  };
}

async function main(): Promise<void> {
  const artifactRoot = resolve(option('--artifact-root') ?? DEFAULT_ARTIFACT_ROOT);
  const outputRoot = resolve(option('--output-root') ?? DEFAULT_V2_ROOT);
  const passagePacket = SourcePacketSchema.parse(JSON.parse(await readFile(
    resolve(artifactRoot, 'inputs/passage-source-packet.json'),
    'utf8',
  )));
  const itemPacket = SourcePacketSchema.parse(JSON.parse(await readFile(
    resolve(artifactRoot, 'inputs/item-source-packet.json'),
    'utf8',
  )));
  const passageRegistry = buildSourceUnitRegistry(passagePacket);
  const itemRegistry = buildSourceUnitRegistry(itemPacket);
  validateSourceUnitRegistryAgainstPacket({ registry: passageRegistry, sourcePacket: passagePacket });
  validateSourceUnitRegistryAgainstPacket({ registry: itemRegistry, sourcePacket: itemPacket });
  const entities = buildLensEntityRegistry(passageRegistry);
  const remaps: LegacyClaimRemap[] = [];
  const rawLocks = [];
  for (let run = 1; run <= 3; run++) {
    const path = resolve(artifactRoot, `runs/passage/${run}/generation/raw-output.txt`);
    const rawText = await readFile(path, 'utf8');
    const rawBundle = LegacyRawSourceBundleSchema.parse(JSON.parse(rawText));
    const mapped = remapLegacyRawBundle({
      run,
      rawBundle,
      rawBundleText: rawText,
      registry: passageRegistry,
      sourcePacket: passagePacket,
    });
    remaps.push(...mapped);
    rawLocks.push({
      run,
      path,
      rawBundleHash: mapped[0]?.rawBundleHash ?? null,
      claimCount: rawBundle.claims.length,
    });
  }
  const comparison = compareLegacyRunsBySourceUnit({
    registry: passageRegistry,
    remaps,
    entities,
  });
  const remapCounts = Object.fromEntries([1, 2, 3].map((run) => [
    `run${run}`,
    Object.fromEntries(['EXACT', 'AMBIGUOUS', 'NON_EXACT', 'UNMAPPED', 'CROSS_UNIT'].map((status) => [
      status,
      remaps.filter((remap) => remap.run === run && remap.mappingStatus === status).length,
    ])),
  ]));
  const classificationCounts = Object.fromEntries([
    'SEMANTIC_AGREEMENT',
    'STRUCTURAL_VARIANT',
    'MEANING_CONFLICT',
    'UNRESOLVED',
  ].map((classification) => [
    classification,
    comparison.filter((entry) => entry.classification === classification).length,
  ]));
  const criticalUnit = passageRegistry.units.find((unit) => (
    unit.rawText?.includes('비점 격차는 물체점에서 광축까지의 거리의 제곱')
  ));
  if (criticalUnit === undefined) throw new Error('볼록렌즈 제곱 비례 Source Unit을 찾지 못했다.');
  const criticalComparison = comparison.find((entry) => (
    entry.sourceUnitId === criticalUnit.sourceUnitId
  ));
  if (criticalComparison === undefined) throw new Error('핵심 unit 비교 결과가 없다.');
  const criticalCorePassed = criticalComparison.classification === 'SEMANTIC_AGREEMENT' &&
    criticalComparison.runs.every((run) => run.semanticSignatures.some((signature) => (
      signature.relationFamily === 'PROPORTIONALITY' &&
      signature.direction?.[0] === 'E_OFF_AXIS_DISTANCE' &&
      signature.direction[1] === 'E_ASTIGMATIC_GAP' &&
      signature.exponent === 2 && signature.polarity === 'POSITIVE'
    )));
  if (!criticalCorePassed) throw new Error('P4-S2 핵심 의미 서명이 사람 기준과 일치하지 않는다.');

  const auditContract = {
    contractVersion: 'problem-source-audit-v2-contract-1',
    coverageBasis: 'FIXED_SOURCE_UNIT',
    offsetOwnership: 'CODE_ONLY',
    requiredPerUnitFields: [
      'sourceUnitId',
      'candidateClaimIds',
      'claimsReviewed',
      'candidateVisualIds',
      'visualCandidatesReviewed',
      'omittedMeaningDetected',
      'unsupportedMeaningDetected',
      'omittedVisualMeaningDetected',
      'unsupportedVisualMeaningDetected',
      'decision',
      'downstreamImpact',
      'issues[].issueCode',
      'issues[].issueClass',
      'issues[].description',
      'issues[].affectedClaimIds',
    ],
    staticRequirements: [
      '모든 expectedSourceUnitId가 코드 순서대로 정확히 한 번 등장',
      '모든 candidateClaimId가 claimsReviewed에 정확히 한 번 등장',
      '모든 candidateVisualId가 visualCandidatesReviewed에 정확히 한 번 등장',
      '존재하지 않는 claim ID 금지',
      'C1-C13 또는 SC1-SC13 같은 범위 ID 금지',
      '누락 의미와 추가 의미를 boolean으로 명시',
    ],
    decisions: {
      PASS: { productionEligibleAfterAudit: true },
      WARNING: { productionEligibleAfterAudit: 'ONLY_IF_DOWNSTREAM_IMPACT_NONE' },
      REPAIR_REQUIRED: { productionEligibleAfterAudit: false, next: 'UNIT_REPAIR_AND_REAUDIT' },
      BLOCKING: { productionEligibleAfterAudit: false, next: 'STOP_GOLD_AND_ESCALATE' },
      UNRESOLVED: { productionEligibleAfterAudit: false, next: 'HIGH_OR_HUMAN_REVIEW' },
    },
    highRiskAlwaysGetsIndependentHighAudit: [
      'RATIO',
      'FORMULA',
      'EXPONENT',
      'COMPARISON_DIRECTION',
      'NEGATION',
      'NECESSARY_OR_SUFFICIENT_CONDITION',
      'COMPOUND_CONDITION',
      'CAUSAL_DIRECTION',
      'VISUAL_RELATION',
      'CROSS_MODAL_CONFLICT',
    ],
    adjudication: {
      mediumSeesHigh: false,
      highSeesMedium: false,
      majorityVoteAllowed: false,
    },
  };

  const itemExplorationPlan = {
    planVersion: 'lens-item-source-exploration-v2',
    mode: 'PLAN_ONLY_NO_API_CALLS',
    productionPromotionAllowed: false,
    sourcePacketHash: itemRegistry.sourcePacketHash,
    sourceUnits: itemRegistry.units.map((unit) => ({
      sourceUnitId: unit.sourceUnitId,
      unitType: unit.unitType,
      sourceArea: unit.sourceArea,
    })),
    calls: [
      { stage: 'ITEM_GENERATE', model: 'gpt-5.6-terra', effort: 'medium', calls: 1 },
      { stage: 'ITEM_INDEPENDENT_READ', model: 'gpt-5.6-terra', effort: 'medium', calls: 1 },
      { stage: 'ITEM_COMPARE', model: 'gpt-5.6-terra', effort: 'medium', calls: 1 },
      { stage: 'ITEM_INDEPENDENT_READ', model: 'gpt-5.6-terra', effort: 'high', calls: 1 },
      { stage: 'ITEM_COMPARE', model: 'gpt-5.6-terra', effort: 'high', calls: 1 },
      { stage: 'CANDIDATE_B_COMPARE', model: 'gpt-5.6-terra', effort: 'medium', calls: 1 },
      { stage: 'CANDIDATE_B_COMPARE', model: 'gpt-5.6-terra', effort: 'high', calls: 1 },
    ],
    totalCalls: 7,
    estimatedCostUsd: {
      expectedRange: [0.5, 1.5],
      approvalBudgetCeiling: 2,
      pricingBasis: 'Terra input $2/MTok, cached input $0.20/MTok, output $12/MTok',
      note: '실제 reasoning/output token에 따라 달라지며 실행 후 usage로 확정한다.',
    },
    sourceOnlyIsolation: {
      answerKeyUsed: false,
      officialExplanationUsed: false,
      existingGoldUsed: false,
      mediumAndHighIndependent: true,
    },
    successCriteria: [
      'distance(P0,axis) = 2 × distance(P1,axis) 추출',
      'distance(P0,axis) = 0.5 × distance(P2,axis) 추출',
      '정확한 배율 근거는 보기 텍스트로 한정',
      '그림은 거리 대소 방향의 CONSISTENCY_HINT로만 사용',
      'medium/high 정상 후보 PASS',
      'medium/high 후보 B가 productionEligible=false',
      '후보 B의 DIRECTION 검출 성공과 안전 차단 성공을 별도 기록',
      'offset을 모델이 생성하지 않음',
      'productionEligible은 false로 유지',
    ],
    stopConditions: [
      '원자료 또는 이미지 hash 불일치',
      '비율 방향·계수 불일치',
      '텍스트 없이 그림에서 정확한 배율 추출',
      'medium/high 의미 해석 불일치',
      '감사 coverage 위반',
    ],
  };

  const productionEligibilityPolicy = {
    policyVersion: 'problem-source-production-eligibility-v2-1',
    concepts: {
      artifactFrozen: '원시 산출물과 감사 이력을 불변 snapshot으로 보존했는지 나타낸다.',
      productionEligible: '지문·문제 골드 생성 입력으로 사용할 수 있는지 나타낸다.',
    },
    states: [
      { auditState: 'PASS', artifactFrozenAllowed: true, productionEligible: true },
      {
        auditState: 'WARNING', artifactFrozenAllowed: true,
        productionEligible: 'ONLY_IF_DOWNSTREAM_IMPACT_NONE',
      },
      { auditState: 'REPAIR_REQUIRED', artifactFrozenAllowed: true, productionEligible: false },
      { auditState: 'BLOCKING', artifactFrozenAllowed: true, productionEligible: false },
      {
        auditState: 'UNRESOLVED', artifactFrozenAllowed: true,
        productionEligible: 'ONLY_AFTER_ALL_EXCLUSION_CHECKS_AND_HUMAN_APPROVAL',
      },
    ],
    warningMayNotCover: [
      'DIRECTION', 'COEFFICIENT', 'EXPONENT', 'NEGATION', 'MODALITY', 'REQUIRED_CONDITION',
      'CAUSE_EFFECT', 'DEFINITION_TARGET', 'ENTITY_IDENTITY', 'SOURCE_LINEAGE',
    ],
    unresolvedExceptionChecks: [
      'sourceMeaningNonDecisive',
      'passageGoldImpactNone',
      'allLinkedItemImpactNone',
      'coverageReasonRecorded',
      'humanApproved',
    ],
  };

  const remapTsvRows = [
    ['run', 'claimId', 'mappedSourceUnitId', 'mappingStatus', 'relationKind', 'modality', 'riskFlags', 'normalizedClaim'],
    ...remaps.map((remap) => [
      remap.run,
      remap.claimId,
      remap.mappedSourceUnitId,
      remap.mappingStatus,
      remap.rawRelation['kind'],
      remap.rawModality,
      remap.rawRiskFlags.join(','),
      remap.normalizedClaim,
    ]),
  ];
  const comparisonTsvRows = [
    ['sourceUnitId', 'classification', 'run1Claims', 'run2Claims', 'run3Claims', 'run1SignatureHash', 'run2SignatureHash', 'run3SignatureHash'],
    ...comparison.map((entry) => [
      entry.sourceUnitId,
      entry.classification,
      entry.runs[0]?.claimIds.join(','),
      entry.runs[1]?.claimIds.join(','),
      entry.runs[2]?.claimIds.join(','),
      entry.runs[0]?.signatureSetHash,
      entry.runs[1]?.signatureSetHash,
      entry.runs[2]?.signatureSetHash,
    ]),
  ];

  await Promise.all([
    writeJson(resolve(outputRoot, 'source-unit-registry-passage.json'), passageRegistry),
    writeJson(resolve(outputRoot, 'source-unit-registry-item.json'), itemRegistry),
    writeJson(resolve(outputRoot, 'source-unit-registry-summary.json'), {
      passage: registrySummary(passageRegistry),
      item: registrySummary(itemRegistry),
    }),
    writeJson(resolve(outputRoot, 'legacy-raw-locks.json'), rawLocks),
    writeJson(resolve(outputRoot, 'legacy-raw-remap.json'), { remapCounts, claims: remaps }),
    writeTsv(resolve(outputRoot, 'legacy-raw-remap.tsv'), remapTsvRows),
    writeJson(resolve(outputRoot, 'entity-registry.json'), {
      status: 'EVIDENCE_GROUNDED_CANDIDATES_NOT_YET_AUDITED',
      entries: entities,
    }),
    writeJson(resolve(outputRoot, 'unit-semantic-comparison.json'), {
      classificationCounts,
      criticalUnit: {
        sourceUnitId: criticalUnit.sourceUnitId,
        rawText: criticalUnit.rawText,
        expectedCore: {
          entities: ['E_OFF_AXIS_DISTANCE', 'E_ASTIGMATIC_GAP'],
          relationFamily: 'PROPORTIONALITY',
          direction: ['E_OFF_AXIS_DISTANCE', 'E_ASTIGMATIC_GAP'],
          exponent: 2,
        },
        corePassed: criticalCorePassed,
        comparison: criticalComparison,
      },
      units: comparison,
    }),
    writeTsv(resolve(outputRoot, 'unit-semantic-comparison.tsv'), comparisonTsvRows),
    writeJson(resolve(outputRoot, 'source-audit-v2-contract.json'), auditContract),
    writeJson(resolve(outputRoot, 'production-eligibility-policy.json'), productionEligibilityPolicy),
    writeJson(resolve(outputRoot, 'item-exploration-plan.json'), itemExplorationPlan),
    writeJson(resolve(outputRoot, 'v1-termination.json'), {
      v1Status: 'HALTED_SUPERSEDED_BY_V2',
      v1ArtifactsImmutable: true,
      remainingV1ApiCallsCancelled: true,
      reason: [
        '전체 Bundle fingerprint 3/3 일치 가정이 claim 세분화 차이를 의미 충돌로 오인',
        '긴 후보 3개 단일 배치 감사에서 exact claim coverage 붕괴',
      ],
      sourceHaltSummaryHash: sourceArtifactHash(JSON.parse(await readFile(
        resolve(artifactRoot, 'source-vertical-halt-summary.json'),
        'utf8',
      ))),
    }),
    writeJson(resolve(outputRoot, 'offline-summary.json'), {
      status: 'SOURCE_BUNDLE_V2_OFFLINE_COMPLETE',
      apiCalls: 0,
      existingGoldModified: false,
      officialAnswerOrExplanationUsed: false,
      sourceUnitRegistries: {
        passage: registrySummary(passageRegistry),
        item: registrySummary(itemRegistry),
      },
      legacyRawRemap: {
        totalClaims: remaps.length,
        exactClaims: remaps.filter((remap) => remap.mappingStatus === 'EXACT').length,
        remapCounts,
      },
      preliminaryUnitComparison: {
        classificationCounts,
        notice: 'MEANING_CONFLICT는 확정 오류가 아니라 독립 재감사가 필요한 후보 분류다.',
      },
      criticalUnit: {
        sourceUnitId: criticalUnit.sourceUnitId,
        classification: criticalComparison.classification,
        corePassed: criticalCorePassed,
      },
      nextPaidStage: {
        status: 'PLAN_ONLY_NOT_EXECUTED',
        calls: itemExplorationPlan.totalCalls,
        expectedCostUsd: itemExplorationPlan.estimatedCostUsd.expectedRange,
        approvalBudgetCeilingUsd: itemExplorationPlan.estimatedCostUsd.approvalBudgetCeiling,
      },
    }),
  ]);
  process.stdout.write(`${JSON.stringify({
    status: 'SOURCE_BUNDLE_V2_OFFLINE_COMPLETE',
    apiCalls: 0,
    outputRoot,
    passageUnits: passageRegistry.units.length,
    itemUnits: itemRegistry.units.length,
    remapCounts,
    classificationCounts,
    criticalUnit: {
      sourceUnitId: criticalUnit.sourceUnitId,
      classification: criticalComparison.classification,
    },
    itemExplorationCalls: itemExplorationPlan.totalCalls,
  }, null, 2)}\n`);
}

await main();
