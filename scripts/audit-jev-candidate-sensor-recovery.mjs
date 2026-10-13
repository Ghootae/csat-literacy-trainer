import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const root = process.cwd();
const experimentRoot = 'docs/experiments/jev-candidate-sensor-audit-v1-2026-09-23';
const productionRoot = 'docs/experiments/prospective-paragraph-gold-24-2026-09-04';
const manifests = [
  `${productionRoot}/canary-approved-manifest-v1.json`,
  `${productionRoot}/batches/paragraph-gold-batch-002-next-10/approved-manifest-v1.json`,
  `${productionRoot}/batches/paragraph-gold-batch-003-three-passages/approved-manifest-v1.json`,
  `${productionRoot}/batches/paragraph-gold-batch-004-three-passages/approved-manifest-v1.json`,
];
const overlayPath = 'docs/experiments/paragraph-gold-collaborative-reaudit-16-2026-09-09/repair-approved-overlay-v2.json';

const read = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
const save = (name, value) => {
  mkdirSync(join(root, experimentRoot), { recursive: true });
  writeFileSync(join(root, experimentRoot, name), `${JSON.stringify(value, null, 2)}\n`);
};
const hash = value => `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
const eqSet = (a, b) => a.length === b.length && a.every(value => b.includes(value));
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});
const result = stage => stage.result ?? stage;

const base = manifests.flatMap(path => read(path).paragraphs.map(paragraph => ({ ...paragraph, approvalManifestPath: path })));
const byId = new Map(base.map(row => [row.paragraphId, row]));
for (const row of read(overlayPath).paragraphs) {
  const previous = byId.get(row.paragraphId);
  if (!previous) throw new Error(`overlay paragraph absent from base manifests: ${row.paragraphId}`);
  byId.set(row.paragraphId, { ...previous, ...row, approvalManifestPath: overlayPath, baseApprovalManifestPath: previous.approvalManifestPath });
}
const approved = [...byId.values()].sort((a, b) => a.paragraphId.localeCompare(b.paragraphId));
if (approved.length !== 60) throw new Error(`expected 60 approved paragraphs, got ${approved.length}`);

const stageFiles = walk(join(root, productionRoot));
const stageIndex = new Map();
for (const path of stageFiles) {
  const match = path.match(/\/([^/]+-p\d+)\/(01-analysis|03-mapping)\.json$/u);
  if (!match) continue;
  const [, paragraphId, stage] = match;
  const key = `${paragraphId}:${stage}`;
  if (stageIndex.has(key)) throw new Error(`duplicate stage file: ${key}`);
  stageIndex.set(key, relative(root, path));
}

const axes = [];
const paragraphs = [];
for (const approval of approved) {
  const analysisPath = stageIndex.get(`${approval.paragraphId}:01-analysis`);
  const mappingPath = stageIndex.get(`${approval.paragraphId}:03-mapping`);
  if (!analysisPath || !mappingPath) throw new Error(`stage file missing: ${approval.paragraphId}`);
  const analysis = result(read(analysisPath));
  const mapping = result(read(mappingPath));
  const gold = read(approval.approvedDiagnosticGold.path);
  const bundle = read(approval.approvedPropositionBundle.path);
  if (hash(gold) !== approval.approvedDiagnosticGold.hash) throw new Error(`gold hash mismatch: ${approval.paragraphId}`);
  if (hash(bundle) !== approval.approvedPropositionBundle.hash) throw new Error(`bundle hash mismatch: ${approval.paragraphId}`);

  const regionById = new Map(analysis.regions.map(item => [item.id, item]));
  const relationById = new Map(analysis.majorRelations.map(item => [item.id, item]));
  const propositionById = new Map(bundle.propositions.map(item => [item.id, item]));
  const analysisPropositionById = new Map(analysis.propositions.map(item => [item.id, item]));
  const mappingByAxis = new Map(mapping.axisMappings.map(item => [item.axisId, item.relationIds]));
  const finalRelationById = new Map(gold.coreRelations.map(item => [item.id, item]));
  const paragraphWarnings = [];

  for (const axis of gold.centralAxes) {
    const warnings = [];
    const mappedStageRelationIds = mappingByAxis.get(axis.id) ?? [];
    if (!eqSet(axis.relationIds, mappedStageRelationIds)) warnings.push('FINAL_AXIS_MAPPING_DIFFERS_FROM_STAGE3');
    const selectedRelations = axis.relationIds.map(id => relationById.get(id)).filter(Boolean);
    const missingRelationIds = axis.relationIds.filter(id => !relationById.has(id));
    if (missingRelationIds.length) warnings.push('FINAL_RELATION_ID_MISSING_IN_STAGE1');
    const selectedRegionIds = [...new Set(selectedRelations.flatMap(item => item.relatedRegionIds))];
    const missingRegionIds = selectedRegionIds.filter(id => !regionById.has(id));
    if (missingRegionIds.length) warnings.push('STAGE1_REGION_REFERENCE_MISSING');
    const candidatePropositionIds = [...new Set(selectedRegionIds.flatMap(id => regionById.get(id)?.propositionIds ?? []))];
    const missingFinalPropositionIds = candidatePropositionIds.filter(id => !propositionById.has(id));
    if (missingFinalPropositionIds.length) warnings.push('CANDIDATE_P_MISSING_IN_FINAL_BUNDLE');
    const changedPropositionIds = candidatePropositionIds.filter(id => {
      const before = analysisPropositionById.get(id);
      const after = propositionById.get(id);
      return before && after && JSON.stringify(before) !== JSON.stringify(after);
    });
    if (changedPropositionIds.length) warnings.push('CANDIDATE_P_CHANGED_AFTER_STAGE1');

    const candidateSet = new Set(candidatePropositionIds);
    const inducedEdges = bundle.propositionEdges.filter(edge =>
      [...edge.fromPropositionIds, ...edge.toPropositionIds].every(id => candidateSet.has(id))
    );
    const boundaryEdges = bundle.propositionEdges.filter(edge => {
      const endpoints = [...edge.fromPropositionIds, ...edge.toPropositionIds];
      const inside = endpoints.filter(id => candidateSet.has(id)).length;
      return inside > 0 && inside < endpoints.length;
    });
    if (!inducedEdges.length) warnings.push('NO_INDUCED_EDGE');
    if (boundaryEdges.length) warnings.push('BOUNDARY_EDGE_PRESENT');

    const otherRelationsSharingRegions = analysis.majorRelations.filter(relation =>
      !axis.relationIds.includes(relation.id) && relation.relatedRegionIds.some(id => selectedRegionIds.includes(id))
    );
    if (otherRelationsSharingRegions.length) warnings.push('REGION_SHARED_WITH_UNMAPPED_RELATION');
    const sameRegionMappedRelations = selectedRelations.some((relation, index) =>
      selectedRelations.some((other, otherIndex) => index !== otherIndex && relation.relatedRegionIds.some(id => other.relatedRegionIds.includes(id)))
    );
    if (sameRegionMappedRelations) warnings.push('MAPPED_RELATIONS_SHARE_REGION');
    const changedRelationIds = axis.relationIds.filter(id => {
      const before = relationById.get(id);
      const after = finalRelationById.get(id);
      return before && after && before.description !== after.description;
    });
    if (changedRelationIds.length) warnings.push('RELATION_DESCRIPTION_CHANGED_AFTER_STAGE1');

    axes.push({
      paragraphId: approval.paragraphId,
      axisId: axis.id,
      axisDescription: axis.description,
      relationIds: axis.relationIds,
      stage3RelationIds: mappedStageRelationIds,
      relations: axis.relationIds.map(id => ({
        id,
        finalDescription: finalRelationById.get(id)?.description ?? null,
        stage1Description: relationById.get(id)?.description ?? null,
        classification: relationById.get(id)?.classification ?? null,
        relatedRegionIds: relationById.get(id)?.relatedRegionIds ?? [],
      })),
      candidatePropositions: candidatePropositionIds.map(id => ({ id, ...(propositionById.get(id) ?? analysisPropositionById.get(id)) })),
      candidateEdges: inducedEdges,
      boundaryEdges,
      otherRelationsSharingRegions: otherRelationsSharingRegions.map(item => ({
        id: item.id, classification: item.classification, description: item.description, relatedRegionIds: item.relatedRegionIds,
      })),
      missingRelationIds,
      missingRegionIds,
      missingFinalPropositionIds,
      changedPropositionIds,
      changedRelationIds,
      warnings,
      source: {
        approvalManifestPath: approval.approvalManifestPath,
        analysisPath,
        mappingPath,
        diagnosticGoldPath: approval.approvedDiagnosticGold.path,
        propositionBundlePath: approval.approvedPropositionBundle.path,
      },
    });
    paragraphWarnings.push(...warnings);
  }
  paragraphs.push({
    paragraphId: approval.paragraphId,
    axisCount: gold.centralAxes.length,
    approvalLabel: approval.approvalLabel,
    finalBundleDerivation: bundle.derivation,
    warnings: [...new Set(paragraphWarnings)],
  });
}

const warningCounts = Object.fromEntries([...new Set(axes.flatMap(row => row.warnings))].sort().map(warning => [warning, axes.filter(row => row.warnings.includes(warning)).length]));
const summary = {
  approvedParagraphs: paragraphs.length,
  axes: axes.length,
  axesWithNoWarnings: axes.filter(row => row.warnings.length === 0).length,
  axesWithWarnings: axes.filter(row => row.warnings.length > 0).length,
  axesWithCandidatePropositions: axes.filter(row => row.candidatePropositions.length > 0).length,
  axesWithCandidateEdges: axes.filter(row => row.candidateEdges.length > 0).length,
  candidatePropositionCount: axes.reduce((sum, row) => sum + row.candidatePropositions.length, 0),
  candidateEdgeCount: axes.reduce((sum, row) => sum + row.candidateEdges.length, 0),
  medianCandidatePropositions: null,
  medianCandidateEdges: null,
  warningCounts,
};
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
summary.medianCandidatePropositions = median(axes.map(row => row.candidatePropositions.length));
summary.medianCandidateEdges = median(axes.map(row => row.candidateEdges.length));

const riskScore = row => row.warnings.length * 10 + row.candidatePropositions.length + row.candidateEdges.length;
const reviewAxes = [...axes].sort((a, b) => riskScore(b) - riskScore(a) || a.paragraphId.localeCompare(b.paragraphId)).slice(0, 15);
let review = '# JEV candidate sensor set 구조 감사 검토 패킷\n\n';
review += 'API 호출 없이 최종 승인 manifest와 기존 01/03단계 산출물만 사용했다. 아래 15축은 구조 경고와 후보 크기가 큰 순서의 검토 표본이다. `candidate`는 필수 센서 확정값이 아니다.\n\n';
review += `전체: ${summary.approvedParagraphs}문단, ${summary.axes}축. 경고 없는 축 ${summary.axesWithNoWarnings}, 경고 축 ${summary.axesWithWarnings}.\n\n`;
for (const row of reviewAxes) {
  review += `## ${row.paragraphId} / ${row.axisId}\n\n${row.axisDescription}\n\n`;
  review += `- MR: ${row.relations.map(item => `${item.id} ${item.finalDescription ?? '(최종 설명 없음)'}`).join(' / ')}\n`;
  review += `- 후보 P: ${row.candidatePropositions.map(item => `${item.id} ${item.description}`).join(' / ') || '(없음)'}\n`;
  review += `- 후보 E: ${row.candidateEdges.map(item => `${item.id} [${item.type}] ${item.description}`).join(' / ') || '(없음)'}\n`;
  review += `- 공유 region의 비대상 MR: ${row.otherRelationsSharingRegions.map(item => `${item.id}(${item.classification}) ${item.description}`).join(' / ') || '(없음)'}\n`;
  review += `- 경고: ${row.warnings.join(', ') || '(없음)'}\n\n`;
}

save('summary.json', summary);
save('paragraphs.json', paragraphs);
save('axis-candidate-sensors.json', axes);
writeFileSync(join(root, experimentRoot, 'REVIEW-PACKET.md'), review);
console.log(JSON.stringify(summary, null, 2));
