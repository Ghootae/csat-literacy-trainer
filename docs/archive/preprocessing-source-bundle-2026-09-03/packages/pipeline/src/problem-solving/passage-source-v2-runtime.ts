import { z } from 'zod/v4';

import { sourceArtifactHash, SourcePacketSchema, type SourcePacket } from './source-bundle.js';
import {
  SOURCE_AUDIT_V2_VERSION,
  SourceAuditV2Schema,
  SourceUnitAuditV2Schema,
  validateSourceAuditV2Coverage,
  validateSourceUnitRegistryAgainstPacket,
  type SourceAuditV2,
  type SourceUnitRegistry,
} from './source-bundle-v2.js';
import {
  PASSAGE_COMPARE_PROMPT_V2,
  PASSAGE_REPAIR_PROMPT_V2,
  PASSAGE_SOURCE_PROMPT_V2,
  SOURCE_V2_MAX_OUTPUT_TOKENS,
  SOURCE_V2_MODEL,
  SourceV2ApiOutputValidationError,
  assertNoSourceV2InputLeak,
  structuredCallV2,
  type SourceV2ApiCall,
  type SourceV2CallControl,
} from './source-bundle-v2-runtime.js';
import {
  PassageSourceBundleV2Schema,
  PassageSourceProposalV2Schema,
  PassageAuditChunkV2Schema,
  PassageUnitRepairV2Schema,
  PassageUnitRepairProposalV2Schema,
  applyPassageUnitRepairV2,
  buildPassageAuditChunks,
  projectPassageBundleChunk,
  canonicalizePassageSourceProposalV2,
  canonicalizePassageUnitRepairProposalV2,
  validatePassageSourceBundleV2AgainstInputs,
  type PassageAuditChunkV2,
  type PassageSourceBundleV2,
  type PassageUnitRepairV2,
} from './passage-source-v2.js';

type SourceUnitAuditV2 = z.infer<typeof SourceUnitAuditV2Schema>;

function passagePacketAndRegistry(options: {
  readonly packet: unknown;
  readonly registry: unknown;
}): { readonly packet: SourcePacket; readonly registry: SourceUnitRegistry } {
  const packet = SourcePacketSchema.parse(options.packet);
  if (packet.scope !== 'PASSAGE') throw new Error('PASSAGE Source Packet만 사용할 수 있다.');
  const registry = validateSourceUnitRegistryAgainstPacket({
    registry: options.registry,
    sourcePacket: packet,
  });
  return { packet, registry };
}

export function buildPassageGenerationInputV2(options: {
  readonly packet: unknown;
  readonly registry: unknown;
  readonly generationId: string;
}): unknown {
  const { packet, registry } = passagePacketAndRegistry(options);
  const requiredUnits = registry.units.filter((unit) => unit.unitRole === 'PASSAGE_CONTENT');
  return {
    task: 'PASSAGE_TEXT_SOURCE_BUNDLE_GENERATION_V2',
    generationId: options.generationId,
    sourceAuthority: 'RAW_PASSAGE_TEXT',
    exclusions: [
      'PASSAGE_IMAGE_CONTENT', 'ITEM_STEM', 'SCENARIO', 'OPTIONS', 'ANSWER_KEY',
      'OFFICIAL_EXPLANATION', 'EXISTING_GOLD', 'DERIVED_RELATIONS', 'ITEM_INFERENCE',
    ],
    requiredScope: 'PASSAGE',
    requiredSourcePacketHash: sourceArtifactHash(packet),
    requiredSourceUnitRegistryHash: sourceArtifactHash(registry),
    requiredPassageContract: {
      sourceClaimPolicy: 'EXPLICIT_OR_FAITHFUL_NORMALIZATION_ONLY',
      derivedRelationsIncluded: false,
      offsetOwnership: 'CODE_ONLY',
      mediaGroundingStatus: packet.media.length === 0 ? 'NOT_APPLICABLE' : 'PENDING',
      requiredSourceUnitIds: requiredUnits.map((unit) => unit.sourceUnitId),
    },
    mediaContentPolicy: {
      imageBytesProvided: false,
      metadataOnly: true,
      contentIntentionallyWithheld: true,
    },
    sourcePacket: {
      ...packet,
      media: packet.media.map((media) => ({
        mediaId: media.mediaId,
        contentHash: media.contentHash,
        sourceArea: media.sourceArea,
        contentIntentionallyWithheld: true,
      })),
    },
    sourceUnitRegistry: registry,
  };
}

function expectedClaimsByChunk(
  artifact: PassageSourceBundleV2,
  chunk: PassageAuditChunkV2,
): Record<string, string[]> {
  return Object.fromEntries(chunk.sourceUnitIds.map((sourceUnitId) => [
    sourceUnitId,
    artifact.bundle.claims.filter((claim) => claim.sourceUnitId === sourceUnitId)
      .map((claim) => claim.claimId),
  ]));
}

export function buildPassageAuditInputV2(options: {
  readonly packet: unknown;
  readonly registry: unknown;
  readonly candidate: unknown;
  readonly peerReadings: readonly unknown[];
  readonly chunk: unknown;
  readonly auditId: string;
  readonly effort: 'medium' | 'high';
}): unknown {
  const { packet, registry } = passagePacketAndRegistry(options);
  const candidate = validatePassageSourceBundleV2AgainstInputs({
    artifact: options.candidate,
    sourcePacket: packet,
    registry,
  });
  const peerReadings = options.peerReadings.map((artifact) => (
    validatePassageSourceBundleV2AgainstInputs({ artifact, sourcePacket: packet, registry })
  ));
  const requestedChunk = PassageAuditChunkV2Schema.parse(options.chunk);
  const chunks = buildPassageAuditChunks(registry);
  const chunk = chunks.find((entry) => entry.chunkId === requestedChunk.chunkId);
  if (chunk === undefined || sourceArtifactHash(chunk) !== sourceArtifactHash(requestedChunk)) {
    throw new Error('감사 chunk가 코드 생성 계획과 다르다.');
  }
  const sourceUnits = registry.units.filter((unit) => chunk.sourceUnitIds.includes(unit.sourceUnitId));
  return {
    task: 'PASSAGE_SOURCE_CHUNK_COMPARISON_AUDIT_V2',
    candidateLabel: 'CANDIDATE_A',
    sourceAuthority: 'RAW_SOURCE_UNITS',
    exclusions: [
      'PASSAGE_IMAGE_CONTENT', 'ITEM_STEM', 'SCENARIO', 'OPTIONS', 'ANSWER_KEY',
      'OFFICIAL_EXPLANATION', 'EXISTING_GOLD', 'OTHER_AUDIT_RESULT',
    ],
    requiredAudit: {
      auditVersion: SOURCE_AUDIT_V2_VERSION,
      auditId: options.auditId,
      model: SOURCE_V2_MODEL,
      effort: options.effort,
      independentOfOtherAudit: true,
      chunkId: chunk.chunkId,
      expectedSourceUnitIds: chunk.sourceUnitIds,
      expectedClaimsByUnit: expectedClaimsByChunk(candidate, chunk),
      expectedVisualsByUnit: Object.fromEntries(chunk.sourceUnitIds.map((id) => [id, []])),
    },
    sourcePacketHash: sourceArtifactHash(packet),
    sourceUnitRegistryHash: sourceArtifactHash(registry),
    sourceUnits,
    candidateProjection: projectPassageBundleChunk({ artifact: candidate, chunk }),
    peerReadingProjections: peerReadings.map((artifact) => (
      projectPassageBundleChunk({ artifact, chunk })
    )),
  };
}

export function buildPassageRepairInputV2(options: {
  readonly packet: unknown;
  readonly registry: unknown;
  readonly candidate: unknown;
  readonly unitAudit: unknown;
  readonly repairId: string;
}): unknown {
  const { packet, registry } = passagePacketAndRegistry(options);
  const candidate = validatePassageSourceBundleV2AgainstInputs({
    artifact: options.candidate,
    sourcePacket: packet,
    registry,
  });
  const unitAudit = SourceUnitAuditV2Schema.parse(options.unitAudit);
  if (!['REPAIR_REQUIRED', 'BLOCKING'].includes(unitAudit.decision)) {
    throw new Error('PASS/WARNING/UNRESOLVED unit은 자동 부분 수리 입력으로 만들지 않는다.');
  }
  const sourceUnit = registry.units.find((unit) => unit.sourceUnitId === unitAudit.sourceUnitId);
  if (sourceUnit === undefined) throw new Error('부분 수리 대상 Source Unit이 registry에 없다.');
  const chunk = buildPassageAuditChunks(registry, 1)
    .find((entry) => entry.sourceUnitIds[0] === sourceUnit.sourceUnitId);
  if (chunk === undefined) throw new Error('부분 수리 대상 projection을 만들 수 없다.');
  return {
    task: 'PASSAGE_SOURCE_UNIT_REPAIR_V2',
    repairId: options.repairId,
    targetSourceUnitId: sourceUnit.sourceUnitId,
    baseArtifactHash: sourceArtifactHash(candidate),
    sourceAuthority: 'RAW_SOURCE_UNIT',
    mutationBoundary: {
      mayReplaceClaimsInTargetUnit: true,
      mayReplaceRelationsInTargetUnit: true,
      mayReplaceUnresolvedInTargetUnit: true,
      mayChangeEntities: false,
      mayChangeQuantities: false,
      mayChangeOtherSourceUnits: false,
    },
    escalationRule: 'IF_ENTITY_OR_QUANTITY_CHANGE_IS_REQUIRED_DO_NOT_REPAIR_AND_KEEP_HUMAN_REVIEW',
    exclusions: [
      'PASSAGE_IMAGE_CONTENT', 'ITEM_STEM', 'SCENARIO', 'OPTIONS', 'ANSWER_KEY',
      'OFFICIAL_EXPLANATION', 'EXISTING_GOLD', 'OTHER_SOURCE_UNIT_REPAIR',
    ],
    sourceUnit,
    unitAudit,
    candidateProjection: projectPassageBundleChunk({ artifact: candidate, chunk }),
    immutableEntityRegistry: candidate.bundle.entities,
    immutableQuantityRegistry: candidate.bundle.quantities,
  };
}

export function passageHighRiskSourceUnitIds(artifactValue: unknown): string[] {
  const artifact = PassageSourceBundleV2Schema.parse(artifactValue);
  const ids = new Set<string>();
  for (const claim of artifact.bundle.claims) {
    if (claim.polarity === 'NEGATIVE' || claim.modality !== 'ASSERTED' || claim.qualifiers.length > 0) {
      ids.add(claim.sourceUnitId);
    }
  }
  for (const relation of artifact.bundle.relations) {
    if (['RATIO', 'PROPORTIONALITY', 'COMPARISON', 'CAUSAL'].includes(relation.relationFamily)) {
      ids.add(relation.sourceUnitId);
    }
  }
  for (const unresolved of artifact.bundle.unresolved) ids.add(unresolved.sourceUnitId);
  return [...ids];
}

function rethrowAsPassageValidation<T>(call: SourceV2ApiCall<T>, cause: unknown): never {
  throw new SourceV2ApiOutputValidationError({
    rawOutputText: call.rawOutputText,
    metadata: call.metadata,
    cause,
  });
}

export async function generatePassageSourceBundleV2(options: {
  readonly packet: SourcePacket;
  readonly registry: SourceUnitRegistry;
  readonly generationId: string;
  readonly callControl: SourceV2CallControl;
}): Promise<SourceV2ApiCall<PassageSourceBundleV2>> {
  const input = buildPassageGenerationInputV2(options);
  assertNoSourceV2InputLeak(input);
  const proposalCall = await structuredCallV2({
    packet: options.packet,
    effort: 'medium',
    promptVersion: PASSAGE_SOURCE_PROMPT_V2,
    outputName: 'passage_text_source_bundle_v2',
    schema: PassageSourceProposalV2Schema,
    input,
    maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_GENERATE,
    includeMedia: false,
    callControl: options.callControl,
  });
  try {
    const parsedOutput = canonicalizePassageSourceProposalV2({
      proposal: proposalCall.parsedOutput,
      sourcePacket: options.packet,
      registry: options.registry,
    });
    return { ...proposalCall, parsedOutput };
  } catch (cause) {
    rethrowAsPassageValidation(proposalCall, cause);
  }
}

export async function auditPassageSourceBundleChunkV2(options: {
  readonly packet: SourcePacket;
  readonly registry: SourceUnitRegistry;
  readonly candidate: PassageSourceBundleV2;
  readonly peerReadings: readonly PassageSourceBundleV2[];
  readonly chunk: PassageAuditChunkV2;
  readonly auditId: string;
  readonly effort: 'medium' | 'high';
  readonly callControl: SourceV2CallControl;
}): Promise<SourceV2ApiCall<SourceAuditV2>> {
  const input = buildPassageAuditInputV2(options);
  assertNoSourceV2InputLeak(input);
  const call = await structuredCallV2({
    packet: options.packet,
    effort: options.effort,
    promptVersion: PASSAGE_COMPARE_PROMPT_V2,
    outputName: 'passage_source_chunk_audit_v2',
    schema: SourceAuditV2Schema,
    input,
    maxOutputTokens: options.effort === 'medium'
      ? SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_COMPARE_MEDIUM
      : SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_COMPARE_HIGH,
    includeMedia: false,
    callControl: options.callControl,
  });
  try {
    validateSourceAuditV2Coverage({
      audit: call.parsedOutput,
      expectedClaimsByUnit: expectedClaimsByChunk(options.candidate, options.chunk),
      expectedVisualsByUnit: Object.fromEntries(options.chunk.sourceUnitIds.map((id) => [id, []])),
    });
  } catch (cause) {
    rethrowAsPassageValidation(call, cause);
  }
  return call;
}

export async function repairPassageSourceUnitV2(options: {
  readonly packet: SourcePacket;
  readonly registry: SourceUnitRegistry;
  readonly candidate: PassageSourceBundleV2;
  readonly unitAudit: SourceUnitAuditV2;
  readonly repairId: string;
  readonly callControl: SourceV2CallControl;
}): Promise<SourceV2ApiCall<PassageUnitRepairV2>> {
  const input = buildPassageRepairInputV2(options);
  assertNoSourceV2InputLeak(input);
  const proposalCall = await structuredCallV2({
    packet: options.packet,
    effort: 'medium',
    promptVersion: PASSAGE_REPAIR_PROMPT_V2,
    outputName: 'passage_source_unit_repair_v2',
    schema: PassageUnitRepairProposalV2Schema,
    input,
    maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_REPAIR,
    includeMedia: false,
    callControl: options.callControl,
  });
  try {
    const parsedOutput = canonicalizePassageUnitRepairProposalV2({
      proposal: proposalCall.parsedOutput,
      registry: options.registry,
    });
    applyPassageUnitRepairV2({
      baseArtifact: options.candidate,
      repair: parsedOutput,
      sourcePacket: options.packet,
      registry: options.registry,
    });
    return { ...proposalCall, parsedOutput };
  } catch (cause) {
    rethrowAsPassageValidation(proposalCall, cause);
  }
}
