import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  ParagraphGoldAuditOutputSchema,
  ParagraphPropositionBundleSchema,
  artifactHash,
  type ParagraphPropositionBundle,
} from '../paragraph-analysis/production.js';

const batchId = 'paragraph-gold-batch-003-three-passages';
const projectRoot = process.cwd();
const experimentRoot = resolve(
  projectRoot,
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04',
);
const batchRoot = resolve(experimentRoot, 'batches', batchId);
const artifactRoot = resolve(batchRoot, 'artifacts');
const outputRoot = resolve(batchRoot, 'collaborative-repair');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, 'utf8');
}

function projectPath(path: string): string {
  return relative(projectRoot, path);
}

function paragraphDir(sourceId: string, paragraphId: string): string {
  return resolve(artifactRoot, sourceId, paragraphId);
}

function currentArtifacts(sourceId: string, paragraphId: string): {
  readonly diagnosticGold: ReturnType<typeof ParagraphDiagnosticGoldSchema.parse>;
  readonly propositionBundle: ParagraphPropositionBundle;
  readonly reaudit: ReturnType<typeof ParagraphGoldAuditOutputSchema.parse>;
} {
  const dir = paragraphDir(sourceId, paragraphId);
  return {
    diagnosticGold: ParagraphDiagnosticGoldSchema.parse(
      readJson(resolve(dir, 'diagnostic-gold-repaired.json')),
    ),
    propositionBundle: ParagraphPropositionBundleSchema.parse(
      readJson(resolve(dir, 'proposition-bundle-repaired.json')),
    ),
    reaudit: ParagraphGoldAuditOutputSchema.parse(
      (readJson(resolve(dir, '06-reaudit.json')) as { readonly result: unknown }).result,
    ),
  };
}

function collaborativeBundle(options: {
  readonly parent: ParagraphPropositionBundle;
  readonly propositions?: ParagraphPropositionBundle['propositions'];
  readonly propositionEdges?: ParagraphPropositionBundle['propositionEdges'];
}): ParagraphPropositionBundle {
  return ParagraphPropositionBundleSchema.parse({
    ...options.parent,
    derivation: 'AUDIT_REPAIR',
    parentBundleHash: artifactHash(options.parent),
    repairRunId: `collaborative-${batchId}-${options.parent.paragraphId}`,
    propositions: options.propositions ?? options.parent.propositions,
    propositionEdges: options.propositionEdges ?? options.parent.propositionEdges,
    auditStatus: 'NOT_AUDITED',
    productionEligible: false,
  });
}

interface SemanticCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly explanation: string;
}

interface CollaborativeResult {
  readonly sourceId: string;
  readonly paragraphId: string;
  readonly title: string;
  readonly repairSummary: string;
  readonly operations: readonly Record<string, unknown>[];
  readonly diagnosticGold: ReturnType<typeof ParagraphDiagnosticGoldSchema.parse>;
  readonly propositionBundle: ParagraphPropositionBundle;
  readonly reaudit: ReturnType<typeof ParagraphGoldAuditOutputSchema.parse>;
  readonly semanticChecks: readonly SemanticCheck[];
}

const results: CollaborativeResult[] = [];

// 수치예보 5문단: 감쇠층의 위치 조건을 모든 관련 층위에 복원한다.
{
  const sourceId = '69c0186c78128b2a9bede0c8';
  const paragraphId = `${sourceId}-p5`;
  const current = currentArtifacts(sourceId, paragraphId);
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse({
    ...current.diagnosticGold,
    centralStory:
      '최상층에서 연직 속도를 0으로 설정하면 외부로 나갈 에너지가 반사되어 내부 에너지가 ' +
      '비현실적으로 증가하고, 대기 상태 변수 값이 왜곡될 수 있다. 이를 완화하려 영역 내부에 ' +
      '감쇠층을 두는 흡수 방식과 상향 에너지의 자연 분산 방식을 함께 적용하며, 최상층이 약 ' +
      '80km 이상이면 자연 분산 방식이, 그보다 낮으면 감쇠층 흡수 방식이 주요하게 작용한다.',
    centralAxes: current.diagnosticGold.centralAxes.map((axis) => axis.id === 'AX2'
      ? {
          ...axis,
          description:
            '이 문제를 완화하기 위해 영역 내부에 감쇠층을 두는 흡수 방식과 자연 분산 방식을 ' +
            '함께 적용하며, 최상층이 약 80km 이상이면 자연 분산이, 더 낮으면 감쇠층 흡수가 ' +
            '주요하게 작용하는 방식',
        }
      : axis),
    coreRelations: current.diagnosticGold.coreRelations.map((relation) => relation.id === 'MR3'
      ? {
          ...relation,
          description:
            '에너지 증가에 따른 변수 값 왜곡을 완화하기 위해 영역 내부에 감쇠층을 두어 ' +
            '에너지를 흡수시키는 계산과 상향 에너지가 자연스럽게 흩어지게 하는 계산을 함께 적용한다.',
        }
      : relation),
    keyMappings: (current.diagnosticGold.keyMappings ?? []).map((mapping) =>
      mapping.left === '최상층 고도 약 80km 미만'
        ? { ...mapping, right: '영역 내부 감쇠층에서 에너지를 흡수시키는 방식이 주요하게 작용' }
        : mapping),
  });
  const propositions = current.propositionBundle.propositions.map((proposition) =>
    proposition.id === 'P6'
      ? {
          ...proposition,
          description:
            '이 왜곡을 완화하기 위해 영역 내부에 감쇠층을 두어 에너지가 감쇠층에서 ' +
            '흡수되도록 계산하는 방법을 적용한다.',
        }
      : proposition);
  const propositionBundle = collaborativeBundle({
    parent: current.propositionBundle,
    propositions,
  });
  results.push({
    sourceId,
    paragraphId,
    title: '수치예보와 수치예보 모델의 원리 · 5문단',
    repairSummary: '감쇠층이 영역 내부에 놓인다는 공간 조건을 P6과 관련 진단 구조에 복원했다.',
    operations: [
      { operation: 'RESTORE_EXPLICIT_QUALIFIER', targetId: 'P6', qualifier: '영역 내부' },
      { operation: 'PROPAGATE_TO_DIAGNOSTIC_STRUCTURE', targetIds: ['centralStory', 'AX2', 'MR3'] },
    ],
    diagnosticGold,
    propositionBundle,
    reaudit: current.reaudit,
    semanticChecks: [
      {
        name: '감쇠층의 공간 조건 보존',
        passed: propositionBundle.propositions.some((proposition) =>
          proposition.id === 'P6' && proposition.description.includes('영역 내부에 감쇠층')),
        explanation: '원문에 명시된 감쇠층의 위치를 P6에 보존한다.',
      },
      {
        name: '진단 구조의 위치 조건 일치',
        passed: diagnosticGold.centralStory.includes('영역 내부에 감쇠층') &&
          diagnosticGold.centralAxes.some((axis) =>
            axis.id === 'AX2' && axis.description.includes('영역 내부에 감쇠층')) &&
          diagnosticGold.coreRelations.some((relation) =>
            relation.id === 'MR3' && relation.description.includes('영역 내부에 감쇠층')),
        explanation: '명제에서 복원한 조건이 중심 이야기·중심축·핵심 관계에도 일관되게 반영된다.',
      },
    ],
  });
}

// 옥신 3문단: 단계적 변화를 인과로 만들지 않고 감수성 비교 범위를 뿌리·줄기로 제한한다.
{
  const sourceId = '6a22950f86fd308968e11320';
  const paragraphId = `${sourceId}-p3`;
  const current = currentArtifacts(sourceId, paragraphId);
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse({
    ...current.diagnosticGold,
    centralObject:
      '옥신 농도에 따른 식물 기관별 생장 반응과, 기관별 반응 시작 농도 및 뿌리·줄기의 ' +
      '감수성 차이',
    centralStory:
      '옥신에 대한 생장 반응은 농도가 증가하면서 일정 범위에서는 촉진이 커지지만 최고 ' +
      '생장점 이후에는 촉진이 약화되고, 일정 농도에 이르면 생장이 억제된다. 기관별 생장 ' +
      '반응 시작 농도가 다르고 뿌리는 줄기보다 옥신 감수성이 높으므로, 동일한 옥신 농도에서도 ' +
      '기관별 생장 반응은 다를 수 있다.',
    centralAxes: current.diagnosticGold.centralAxes.map((axis) => axis.id === 'AX2'
      ? {
          ...axis,
          description:
            '기관별 생장 반응 시작 농도 차이와 뿌리·줄기의 옥신 감수성 차이로 인해 동일한 ' +
            '농도에서도 기관별 생장 반응이 달라질 수 있음',
        }
      : axis),
    coreRelations: current.diagnosticGold.coreRelations.map((relation) => relation.id === 'MR2'
      ? {
          ...relation,
          description:
            '기관별 생장 반응 시작 농도가 다르고 뿌리는 줄기보다 옥신 감수성이 높기 때문에, ' +
            '동일한 옥신 농도에서도 기관별 생장 반응이 다를 수 있다.',
        }
      : relation),
  });
  const propositionEdges = current.propositionBundle.propositionEdges.map((edge) => {
    if (edge.id === 'E2') {
      return {
        ...edge,
        type: '수정-전환' as const,
        direction:
          '옥신 농도가 증가하는 과정에서 최고 생장점 이후 촉진 정도가 낮아지고, 이어 일정 ' +
          '농도에 이르면 생장이 억제되는 단계로 변한다.',
        description: '농도 증가에 따른 반응의 순차적 변화를 나타내며, 앞 단계가 뒤 단계의 원인임을 뜻하지 않는다.',
      };
    }
    if (edge.id === 'E4') {
      return {
        ...edge,
        direction:
          '기관별 반응 시작 농도 차이와 뿌리·줄기의 감수성 차이가 같은 농도에서 기관별 반응이 ' +
          '달라질 수 있다는 결론을 뒷받침한다.',
        description:
          '기관 일반에 대해서는 반응 시작 농도 차이를, 뿌리와 줄기에 대해서는 감수성 차이를 ' +
          '근거로 사용한다.',
      };
    }
    return edge;
  });
  const propositionBundle = collaborativeBundle({
    parent: current.propositionBundle,
    propositionEdges,
  });
  const generalizedSensitivity = '기관마다 생장 반응 시작 농도와 옥신 감수성이 다르';
  results.push({
    sourceId,
    paragraphId,
    title: '옥신의 기능과 식물 생장 조절 · 3문단',
    repairSummary:
      '농도 증가에 따른 반응 변화를 비인과적 단계 관계로 바꾸고, 감수성 차이의 범위를 ' +
      '뿌리와 줄기의 비교로 한정했다.',
    operations: [
      { operation: 'RETYPE_EDGE_AS_SEQUENCE', edgeId: 'E2' },
      { operation: 'NARROW_EXAMPLE_SCOPE', targets: ['centralObject', 'centralStory', 'AX2', 'MR2', 'E4'] },
    ],
    diagnosticGold,
    propositionBundle,
    reaudit: current.reaudit,
    semanticChecks: [
      {
        name: '단계 관계와 인과 관계 구분',
        passed: propositionBundle.propositionEdges.some((edge) =>
          edge.id === 'E2' && edge.type === '수정-전환' && edge.description.includes('원인임을 뜻하지 않는다')),
        explanation: '촉진 약화가 억제를 발생시킨다는 원문 밖 인과를 제거한다.',
      },
      {
        name: '감수성 비교 범위 제한',
        passed: !diagnosticGold.centralStory.includes(generalizedSensitivity) &&
          diagnosticGold.centralStory.includes('뿌리는 줄기보다 옥신 감수성이 높으므로') &&
          diagnosticGold.centralAxes.some((axis) =>
            axis.id === 'AX2' && axis.description.includes('뿌리·줄기의 옥신 감수성 차이')) &&
          diagnosticGold.coreRelations.some((relation) =>
            relation.id === 'MR2' && relation.description.includes('뿌리는 줄기보다 옥신 감수성이 높기')),
        explanation: '기관 일반의 차이와 뿌리·줄기 사례의 차이를 구분한다.',
      },
    ],
  });
}

// 옥신 4문단: 옥신 농도 상승 뒤 생장 촉진이 일어나는 경우라는 조건을 보존한다.
{
  const sourceId = '6a22950f86fd308968e11320';
  const paragraphId = `${sourceId}-p4`;
  const current = currentArtifacts(sourceId, paragraphId);
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse({
    ...current.diagnosticGold,
    centralStory:
      '빛을 받은 쪽에서 활성화된 포토트로핀이 옥신을 그늘진 쪽으로 수송하게 하여 옥신 ' +
      '분포를 비대칭적으로 만든다. 그늘진 쪽의 옥신 농도가 높아져 그쪽 생장이 촉진되면, ' +
      '줄기는 빛을 향해 굽는 굴광성을 보인다.',
    centralAxes: current.diagnosticGold.centralAxes.map((axis) => axis.id === 'AX1'
      ? {
          ...axis,
          description:
            '빛 자극에 따라 포토트로핀이 활성화되고 옥신이 그늘진 쪽으로 수송되어 비대칭적으로 ' +
            '분포하며, 그쪽 생장이 촉진되는 경우 줄기가 빛을 향해 굽는 과정',
        }
      : axis),
    coreRelations: current.diagnosticGold.coreRelations.map((relation) => relation.id === 'MR2'
      ? {
          ...relation,
          description:
            '그늘진 쪽의 옥신 농도가 높아져 그쪽 생장이 촉진되면, 비대칭 생장 때문에 줄기가 ' +
            '빛을 향해 굽는다.',
        }
      : relation),
    keyMappings: (current.diagnosticGold.keyMappings ?? []).map((mapping) => mapping.left === '그늘진 쪽'
      ? {
          ...mapping,
          right: '옥신 수송·고농도 분포 위치이며, 그쪽 생장이 촉진되면 줄기가 빛을 향해 굽음',
        }
      : mapping),
  });
  const propositionBundle = collaborativeBundle({ parent: current.propositionBundle });
  results.push({
    sourceId,
    paragraphId,
    title: '옥신의 기능과 식물 생장 조절 · 4문단',
    repairSummary: '생장 촉진을 무조건적 결과로 단정하지 않고 굴광성 발생의 조건으로 보존했다.',
    operations: [
      { operation: 'RESTORE_CONDITIONAL_SCOPE', targets: ['centralStory', 'AX1', 'MR2', 'keyMapping'] },
    ],
    diagnosticGold,
    propositionBundle,
    reaudit: current.reaudit,
    semanticChecks: [
      {
        name: '조건부 생장 촉진 보존',
        passed: diagnosticGold.centralStory.includes('생장이 촉진되면') &&
          diagnosticGold.centralAxes.some((axis) =>
            axis.id === 'AX1' && axis.description.includes('생장이 촉진되는 경우')) &&
          diagnosticGold.coreRelations.some((relation) =>
            relation.id === 'MR2' && relation.description.includes('생장이 촉진되면')),
        explanation: '원문의 조건절을 중심 이야기·중심축·핵심 관계에서 같은 양상으로 유지한다.',
      },
    ],
  });
}

// 블록체인 1문단: 합의 알고리즘의 사용 관계와 작업증명 예시를 중심 구조에 복원한다.
{
  const sourceId = '69bcae308095df3b8c53d9a2';
  const paragraphId = `${sourceId}-p1`;
  const current = currentArtifacts(sourceId, paragraphId);
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse({
    ...current.diagnosticGold,
    centralStory:
      '블록체인 기술은 체인으로 연결한 블록들을 여러 노드에 중복 저장하며, 블록체인은 그 ' +
      '블록들의 집합이고 노드는 이를 저장하는 컴퓨터이다. 새 블록은 노드들에 전파되고 노드들은 ' +
      '상충·이중 포함 여부를 검증한다. 검증된 블록의 연결 여부는 모든 노드가 참여하는 승인 ' +
      '과정으로 정해지며, 승인 과정에는 합의 알고리즘이 사용되고 작업증명은 그 예이다. 승인된 ' +
      '블록은 블록체인에 연결되고 이 블록체인은 노드들에 저장된다.',
    centralAxes: current.diagnosticGold.centralAxes.map((axis) => axis.id === 'AX2'
      ? {
          ...axis,
          description:
            '새 블록의 전파·검증과 모든 노드의 승인, 승인 과정에서의 합의 알고리즘 사용 및 ' +
            '작업증명 예시, 승인 완료 블록의 연결·저장으로 이어지는 절차',
          relationIds: ['MR2', 'MR3', 'MR4'],
        }
      : axis),
    coreRelations: [
      ...current.diagnosticGold.coreRelations,
      {
        id: 'MR4',
        description: '승인 과정에는 합의 알고리즘이 사용되며, 작업증명은 합의 알고리즘의 예이다.',
      },
    ],
    supportingConcepts: [],
  });
  const propositionBundle = collaborativeBundle({ parent: current.propositionBundle });
  results.push({
    sourceId,
    paragraphId,
    title: '블록체인 기술의 특성 · 1문단',
    repairSummary: '승인 과정의 합의 알고리즘 사용과 작업증명 예시를 중심 이야기·축·핵심 관계에 복원했다.',
    operations: [
      { operation: 'ADD_CORE_RELATION', relationId: 'MR4', propositionIds: ['P10', 'P11'] },
      { operation: 'MAP_CORE_RELATION_TO_AXIS', relationId: 'MR4', axisId: 'AX2' },
      { operation: 'REMOVE_DUPLICATE_SUPPORTING_LABELS', values: ['합의 알고리즘', '작업증명'] },
    ],
    diagnosticGold,
    propositionBundle,
    reaudit: current.reaudit,
    semanticChecks: [
      {
        name: '합의 알고리즘 관계의 중심 구조 포함',
        passed: diagnosticGold.centralStory.includes('작업증명은 그 예') &&
          diagnosticGold.centralAxes.some((axis) => axis.id === 'AX2' && axis.relationIds.includes('MR4')) &&
          diagnosticGold.coreRelations.some((relation) =>
            relation.id === 'MR4' && relation.description.includes('합의 알고리즘의 예')),
        explanation: '단순 용어 목록이 아니라 사용 관계와 예시 관계를 진단 가능한 구조로 보존한다.',
      },
    ],
  });
}

// 블록체인 2문단: '따라서'가 허가하는 합의 속도→승인 시간 관계를 복원한다.
{
  const sourceId = '69bcae308095df3b8c53d9a2';
  const paragraphId = `${sourceId}-p2`;
  const current = currentArtifacts(sourceId, paragraphId);
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse({
    ...current.diagnosticGold,
    centralStory:
      '블록체인 성능은 데이터 저장 속도, 즉 단위 시간당 저장되는 데이터 양으로 파악된다. ' +
      '비공개형은 공개형보다 일반적으로 합의 알고리즘의 속도가 빠르므로 승인 과정에 걸리는 ' +
      '시간이 짧고, 승인 시간이 짧기 때문에 성능이 높다.',
    centralAxes: current.diagnosticGold.centralAxes.map((axis) => axis.id === 'AX1'
      ? {
          ...axis,
          description:
            '블록체인 성능의 측정 기준과, 비공개형의 공개형 대비 빠른 합의 알고리즘에서 짧은 ' +
            '승인 시간 및 높은 성능으로 이어지는 관계',
        }
      : axis),
    coreRelations: current.diagnosticGold.coreRelations.map((relation) => relation.id === 'MR2'
      ? {
          ...relation,
          description:
            '비공개형은 일반적으로 공개형보다 합의 알고리즘의 속도가 빠르므로 승인 과정에 ' +
            '걸리는 시간이 짧고, 승인 시간이 짧기 때문에 성능이 높다.',
        }
      : relation),
    keyMappings: [
      ...(current.diagnosticGold.keyMappings ?? []),
      { left: '비공개형의 더 빠른 합의 알고리즘', right: '더 짧은 승인 과정 시간' },
      { left: '더 짧은 승인 과정 시간', right: '더 높은 성능' },
    ],
  });
  const restoredEdge: ParagraphPropositionBundle['propositionEdges'][number] = {
    id: 'E3',
    fromPropositionIds: ['P5'],
    toPropositionIds: ['P6'],
    type: '근거-주장',
    direction: '비공개형의 더 빠른 합의 알고리즘 → 더 짧은 승인 과정 시간',
    description:
      '원문의 접속 표현 ‘따라서’에 따라, 비공개형의 더 빠른 합의 알고리즘이 승인 과정 ' +
      '시간이 짧다는 결론의 근거가 된다.',
  };
  const propositionEdges = [
    ...current.propositionBundle.propositionEdges,
    restoredEdge,
  ].sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }));
  const propositionBundle = collaborativeBundle({
    parent: current.propositionBundle,
    propositionEdges,
  });
  results.push({
    sourceId,
    paragraphId,
    title: '블록체인 기술의 특성 · 2문단',
    repairSummary: '원문의 명시적 접속어 ‘따라서’가 허가하는 합의 속도에서 승인 시간으로의 관계를 복원했다.',
    operations: [
      { operation: 'RESTORE_EXPLICIT_DISCOURSE_RELATION', edgeId: 'E3', marker: '따라서' },
      { operation: 'PROPAGATE_TO_DIAGNOSTIC_STRUCTURE', targets: ['centralStory', 'AX1', 'MR2', 'keyMappings'] },
    ],
    diagnosticGold,
    propositionBundle,
    reaudit: current.reaudit,
    semanticChecks: [
      {
        name: '명시적 담화 관계 복원',
        passed: propositionBundle.propositionEdges.some((edge) =>
          edge.id === 'E3' && edge.fromPropositionIds.join(',') === 'P5' &&
          edge.toPropositionIds.join(',') === 'P6' && edge.description.includes('따라서')),
        explanation: '최초 감사의 과잉 삭제를 따르지 않고 원문의 접속 표지를 근거로 관계를 복원한다.',
      },
      {
        name: '승인 시간에서 성능으로의 기존 관계 보존',
        passed: propositionBundle.propositionEdges.some((edge) =>
          edge.id === 'E4' && edge.fromPropositionIds.includes('P6') && edge.toPropositionIds.includes('P7')),
        explanation: 'P5→P6을 복원하면서 기존의 P6→P7 관계를 훼손하지 않는다.',
      },
    ],
  });
}

// 블록체인 4문단: 누락된 승인 시간 관계와 '아직까지'라는 시간 양상을 복원한다.
{
  const sourceId = '69bcae308095df3b8c53d9a2';
  const paragraphId = `${sourceId}-p4`;
  const current = currentArtifacts(sourceId, paragraphId);
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse({
    ...current.diagnosticGold,
    centralObject: '블록체인의 세 특성과 승인 시간·노드 수를 둘러싼 상충 및 현재까지의 기술적 한계',
    centralStory:
      '블록체인에서 보안성, 탈중앙성, 확장성은 각각 데이터 변경·중복 방지, 다수 노드의 ' +
      '비지배적 승인 참여, 노드 증가에도 큰 성능 저하 없이 서비스를 유지하는 성질이다. 승인 ' +
      '시간이 줄거나 노드 수가 감소하면 보안성이 낮아지고, 노드 수 감소는 탈중앙성도 낮춘다. ' +
      '반면 노드 수 증가는 성능을 저하시켜 확장성 확보를 위해 노드 수를 제한하기도 한다. ' +
      '아직까지 세 특성을 함께 높일 방법이 없어 블록체인은 대규모로 채택되지 못하고 있다.',
    centralAxes: current.diagnosticGold.centralAxes.map((axis) => axis.id === 'AX2'
      ? {
          ...axis,
          description:
            '승인 시간과 노드 수 변화에 따른 보안성·탈중앙성·확장성의 상충, 세 특성을 함께 ' +
            '높일 방법의 현재까지의 부재, 그리고 대규모 채택 제한으로 이어지는 관계',
          relationIds: ['MR2', 'MR4', 'MR6', 'MR7', 'MR8'],
        }
      : axis),
    coreRelations: [
      ...current.diagnosticGold.coreRelations.map((relation) => relation.id === 'MR7'
        ? {
            ...relation,
            description:
              '아직까지 보안성·탈중앙성·확장성을 함께 높일 방법이 없어서 블록체인 기술은 ' +
              '대규모로 채택되지 못하고 있다.',
          }
        : relation),
      { id: 'MR8', description: '승인 과정에 걸리는 시간이 줄면 보안성이 낮아진다.' },
    ],
    keyMappings: [
      { left: '승인 과정에 걸리는 시간 감소', right: '보안성 저하' },
      ...(current.diagnosticGold.keyMappings ?? []).map((mapping) =>
        mapping.left === '세 특성 동시 향상 방법 부재'
          ? { left: '세 특성 동시 향상 방법의 현재까지의 부재', right: mapping.right }
          : mapping),
    ],
    supportingConcepts: (current.diagnosticGold.supportingConcepts ?? []).filter((concept) =>
      concept !== '승인 과정에 걸리는 시간 감소와 보안성 저하의 관계'),
  });
  const propositionBundle = collaborativeBundle({ parent: current.propositionBundle });
  results.push({
    sourceId,
    paragraphId,
    title: '블록체인 기술의 특성 · 4문단',
    repairSummary:
      '승인 시간 감소에 따른 보안성 저하를 핵심 관계로 승격하고, 세 특성 동시 향상의 ' +
      '한계를 현재까지의 방법 부재로 한정했다.',
    operations: [
      { operation: 'PROMOTE_RELATION_TO_CORE', relationId: 'MR8', propositionId: 'P3' },
      { operation: 'MAP_CORE_RELATION_TO_AXIS', relationId: 'MR8', axisId: 'AX2' },
      { operation: 'RESTORE_TEMPORAL_MODALITY', targetIds: ['centralObject', 'centralStory', 'AX2', 'MR7'] },
    ],
    diagnosticGold,
    propositionBundle,
    reaudit: current.reaudit,
    semanticChecks: [
      {
        name: '승인 시간 관계의 중심 구조 포함',
        passed: diagnosticGold.coreRelations.some((relation) =>
          relation.id === 'MR8' && relation.description.includes('시간이 줄면 보안성이 낮아')) &&
          diagnosticGold.centralAxes.some((axis) => axis.id === 'AX2' && axis.relationIds.includes('MR8')),
        explanation: 'supporting 항목에만 있던 독립 관계를 핵심 관계와 중심축에 포함한다.',
      },
      {
        name: '현재까지의 기술적 한계 보존',
        passed: diagnosticGold.centralStory.includes('아직까지') &&
          diagnosticGold.centralAxes.some((axis) =>
            axis.id === 'AX2' && axis.description.includes('현재까지의 부재')) &&
          diagnosticGold.coreRelations.some((relation) =>
            relation.id === 'MR7' && relation.description.startsWith('아직까지')),
        explanation: '현재 방법이 없다는 진술을 원리적인 불가능성으로 강화하지 않는다.',
      },
    ],
  });
}

if (results.length !== 6) {
  throw new Error(`협업 수리 대상 수 오류: ${results.length}`);
}

for (const result of results) {
  if (result.reaudit.decision !== 'REPAIR_REQUIRED') {
    throw new Error(`${result.paragraphId}: 재감사 상태가 REPAIR_REQUIRED가 아니다.`);
  }
  if (result.semanticChecks.some((check) => !check.passed)) {
    throw new Error(`${result.paragraphId}: 협업 수리 의미 점검 실패`);
  }
  const source = readJson(resolve(
    paragraphDir(result.sourceId, result.paragraphId),
    '00-source.json',
  )) as { readonly paragraph: { readonly text: string } };
  if (result.diagnosticGold.paragraphText !== source.paragraph.text) {
    throw new Error(`${result.paragraphId}: 원문이 변경됐다.`);
  }
  const dir = resolve(outputRoot, result.paragraphId);
  writeJson(resolve(dir, 'diagnostic-gold.json'), result.diagnosticGold);
  writeJson(resolve(dir, 'proposition-bundle.json'), result.propositionBundle);
  writeJson(resolve(dir, 'repair.json'), {
    artifactType: 'paragraph-gold-collaborative-repair-v1',
    batchId,
    sourceId: result.sourceId,
    paragraphId: result.paragraphId,
    title: result.title,
    issueSource: {
      type: 'FIRST_REAUDIT_REPAIR_REQUIRED',
      auditHash: artifactHash(result.reaudit),
      issues: result.reaudit.issues,
    },
    repairSummary: result.repairSummary,
    operations: result.operations,
    diagnosticGold: result.diagnosticGold,
    propositionBundle: result.propositionBundle,
    semanticChecks: result.semanticChecks,
    status: 'SEMIAUTOMATIC_REPAIR_PENDING_USER_APPROVAL',
    productionEligible: false,
  });
  writeJson(resolve(dir, 'validation.json'), {
    artifactType: 'paragraph-gold-collaborative-repair-validation-v1',
    batchId,
    paragraphId: result.paragraphId,
    schemaValidation: 'PASS',
    sourceTextPreserved: true,
    semanticChecks: result.semanticChecks,
    outputHashes: {
      diagnosticGold: artifactHash(result.diagnosticGold),
      propositionBundle: artifactHash(result.propositionBundle),
    },
    productionEligible: false,
    reason: '사용자가 요청한 반자동 수리 후보이며 결과 승인 전에는 생산 자격을 부여하지 않는다.',
  });
}

const casebook = {
  artifactType: 'paragraph-gold-repair-casebook-v1',
  batchId,
  cases: [
    {
      caseId: 'PGC-008',
      category: 'EXPLICIT_QUALIFIER_OMITTED',
      sourceParagraphId: '69c0186c78128b2a9bede0c8-p5',
      failure: '감쇠층을 둔다는 내용은 보존했지만 감쇠층이 영역 내부에 있다는 공간 조건을 P6에서 누락했다.',
      correction: 'P6과 중심 이야기·축·핵심 관계에 영역 내부 조건을 복원했다.',
      generalRule: '관계의 대상·위치·범위를 제한하는 원문 수식어를 핵심 명제와 요약 구조에 함께 보존한다.',
      proposedPromotion: 'MERGE_INTO_QUALIFIER_SCOPE_FIDELITY',
    },
    {
      caseId: 'PGC-009',
      category: 'EXAMPLE_SCOPE_OVERGENERALIZATION',
      sourceParagraphId: '6a22950f86fd308968e11320-p3',
      failure: '뿌리와 줄기의 감수성 비교 사례를 모든 기관의 일반적 감수성 차이로 확대했다.',
      correction: '기관 일반에는 반응 시작 농도 차이만 적용하고 감수성 차이는 뿌리·줄기에 한정했다.',
      generalRule: '일부 대상의 비교·예시를 상위 범주의 모든 대상에 일반화하지 않는다.',
      proposedPromotion: 'MERGE_INTO_QUALIFIER_SCOPE_FIDELITY',
    },
    {
      caseId: 'PGC-010',
      category: 'SEQUENTIAL_CHANGE_CAST_AS_CAUSAL',
      sourceParagraphId: '6a22950f86fd308968e11320-p3',
      failure: '농도 증가에 따른 촉진 약화와 억제 도달의 순차적 변화를 원인-결과 간선으로 만들었다.',
      correction: 'E2를 비인과적인 단계적 변화 관계로 바꿨다.',
      generalRule: '시간·단계의 선후만 제시된 경우 앞 단계를 뒤 단계의 원인으로 만들지 않는다.',
      proposedPromotion: 'MERGE_INTO_EDGE_EVIDENCE_BEFORE_DIRECTION',
    },
    {
      caseId: 'PGC-011',
      category: 'CONDITIONAL_RESULT_STRENGTHENED',
      sourceParagraphId: '6a22950f86fd308968e11320-p4',
      failure: '생장이 촉진되면이라는 조건을 옥신 농도 상승이 생장을 촉진한다는 무조건적 결과로 강화했다.',
      correction: '중심 이야기·축·핵심 관계에 생장이 촉진되는 경우라는 조건을 복원했다.',
      generalRule: '조건절의 내용을 독립 사실이나 무조건적 인과로 강화하지 않는다.',
      proposedPromotion: 'MERGE_INTO_QUALIFIER_SCOPE_FIDELITY',
    },
    {
      caseId: 'PGC-012',
      category: 'CENTRAL_RELATION_OMITTED_FROM_DIAGNOSTIC_STRUCTURE',
      sourceParagraphId: '69bcae308095df3b8c53d9a2-p1',
      failure: '합의 알고리즘의 사용과 작업증명 예시가 명제에는 있지만 중심 이야기·축·핵심 관계에는 없었다.',
      correction: '두 관계를 MR4로 묶어 중심 이야기와 AX2에 포함했다.',
      generalRule: '문단의 중심 절차·분류 관계가 명제에만 있고 진단 구조에서 빠지지 않도록 coverage를 검사한다.',
      proposedPromotion: 'MERGE_INTO_DIAGNOSTIC_COVERAGE_INVARIANT',
    },
    {
      caseId: 'PGC-013',
      category: 'EXPLICIT_CONNECTIVE_RELATION_DELETED_DURING_REPAIR',
      sourceParagraphId: '69bcae308095df3b8c53d9a2-p2',
      failure: '최초 감사의 지적을 따라 간선을 삭제하면서 원문의 명시적 접속어 따라서가 표시한 관계까지 제거했다.',
      correction: 'P5→P6 간선을 복원하고 기존 P6→P7과 함께 두 단계 관계를 보존했다.',
      generalRule: '간선 삭제 전 접속어와 문장 간 논리 표지가 해당 관계를 명시하는지 다시 확인한다.',
      proposedPromotion: 'KEEP_AS_REPAIR_REGRESSION_CASE',
    },
    {
      caseId: 'PGC-014',
      category: 'CENTRAL_RELATION_OMITTED_FROM_DIAGNOSTIC_STRUCTURE',
      sourceParagraphId: '69bcae308095df3b8c53d9a2-p4',
      failure: '승인 시간 감소에 따른 보안성 저하가 명제와 supporting 항목에는 있지만 중심축·핵심 관계에는 없었다.',
      correction: 'MR8을 추가하고 AX2와 중심 이야기에 연결했다.',
      generalRule: '중심 상충을 구성하는 독립 관계를 보조 정보로 낮추지 않고 중심축과 핵심 관계에 연결한다.',
      proposedPromotion: 'MERGE_INTO_DIAGNOSTIC_COVERAGE_INVARIANT',
    },
    {
      caseId: 'PGC-015',
      category: 'TEMPORAL_MODALITY_LOSS',
      sourceParagraphId: '69bcae308095df3b8c53d9a2-p4',
      failure: '아직까지 동시 향상 방법이 없다는 현재의 한계를 원리적인 불가능성처럼 표현했다.',
      correction: '중심 이야기·축·핵심 관계에 현재까지 또는 아직이라는 시간 양상을 복원했다.',
      generalRule: '아직, 현재, 가능, 평가와 같은 양상·시간 한정어를 삭제하거나 단정으로 강화하지 않는다.',
      proposedPromotion: 'MERGE_INTO_QUALIFIER_SCOPE_FIDELITY',
    },
  ],
};
writeJson(resolve(outputRoot, 'casebook.json'), casebook);

interface AuditIssueRow {
  readonly sourceId: string;
  readonly paragraphId: string;
  readonly category: string;
  readonly targetType: string;
}

function collectFiles(root: string, fileName: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = resolve(root, entry);
    if (statSync(path).isDirectory()) {
      files.push(...collectFiles(path, fileName));
    } else if (entry === fileName) {
      files.push(path);
    }
  }
  return files;
}

const initialAuditFiles = collectFiles(experimentRoot, '04-audit.json');
const initialAuditIssues: AuditIssueRow[] = [];
for (const path of initialAuditFiles) {
  const auditArtifact = readJson(path) as {
    readonly result?: {
      readonly sourceId?: unknown;
      readonly paragraphId?: unknown;
      readonly issues?: readonly { readonly category?: unknown; readonly targetType?: unknown }[];
    };
  };
  if (
    typeof auditArtifact.result?.sourceId !== 'string' ||
    typeof auditArtifact.result.paragraphId !== 'string'
  ) continue;
  for (const issue of auditArtifact.result.issues ?? []) {
    if (typeof issue.category !== 'string' || typeof issue.targetType !== 'string') continue;
    initialAuditIssues.push({
      sourceId: auditArtifact.result.sourceId,
      paragraphId: auditArtifact.result.paragraphId,
      category: issue.category,
      targetType: issue.targetType,
    });
  }
}

const issueCategories = [...new Set(initialAuditIssues.map((issue) => issue.category))]
  .map((category) => {
    const issues = initialAuditIssues.filter((issue) => issue.category === category);
    return {
      category,
      issueCount: issues.length,
      paragraphCount: new Set(issues.map((issue) => issue.paragraphId)).size,
      sourceCount: new Set(issues.map((issue) => issue.sourceId)).size,
    };
  })
  .sort((left, right) => right.issueCount - left.issueCount);

const generalizationReview = {
  artifactType: 'paragraph-gold-accumulated-generalization-review-v1',
  scope: {
    processedParagraphCount: 42,
    initialAuditArtifactCount: initialAuditFiles.length,
    initialAuditIssueCount: initialAuditIssues.length,
    accumulatedCollaborativeCaseCount: 15,
    caseSources: [
      'canary-review/collaborative-repair/casebook.json',
      'batches/paragraph-gold-batch-002-next-10/collaborative-repair/casebook.json',
      'batches/paragraph-gold-batch-003-three-passages/collaborative-repair/casebook.json',
    ],
  },
  initialAuditCategoryCounts: issueCategories,
  generalizedFamilies: [
    {
      familyId: 'PG-RULE-001',
      name: 'EDGE_EVIDENCE_BEFORE_DIRECTION',
      evidence:
        'DIRECTION 19건이 13문단·6지문에서 발생했고, 조건·지원되지 않은 의미 문제도 간선에 반복적으로 집중됐다.',
      rule:
        '간선을 만들거나 바꾸거나 삭제하기 전에 원문이 방향과 관계 유형을 실제로 허가하는지 확인한다. ' +
        '병렬·순서는 인과가 아니지만 따라서·때문에 같은 명시 표지는 보존한다.',
      decision: 'GENERALIZE_NOW',
    },
    {
      familyId: 'PG-RULE-002',
      name: 'QUALIFIER_SCOPE_FIDELITY',
      evidence:
        'CONDITION_OR_SCOPE 14건이 8문단·6지문에서 발생했고, 협업 사례에서도 조건절 독립화, ' +
        '예시 범위 확대, 시간·가능성 양상 손실이 서로 다른 지문에서 반복됐다.',
      rule:
        '조건, 대상 범위, 위치, 가능성·평가·시간 한정어를 원문보다 넓히거나 강하게 만들지 않고 ' +
        '명제와 진단 구조 전반에 같은 범위로 보존한다.',
      decision: 'GENERALIZE_NOW',
    },
    {
      familyId: 'PG-RULE-003',
      name: 'DIAGNOSTIC_COVERAGE_INVARIANT',
      evidence:
        'AXIS_COVERAGE 4건이 4문단·3지문에서 발생했고, PGC-005·006·012·014에서 중심 관계가 ' +
        '명제에는 있으나 중심 이야기·축·핵심 관계 중 하나 이상에서 반복적으로 빠졌다.',
      rule:
        'core relation과 문단 중심 절차·상충 관계는 중심 이야기에서 의미가 드러나고 적어도 한 ' +
        '중심축에 연결되어야 한다. 중심축 relationIds와 coreRelations는 양방향으로 일치해야 한다.',
      decision: 'GENERALIZE_NOW_AS_STRUCTURAL_INVARIANT',
    },
    {
      familyId: 'PG-RULE-004',
      name: 'REPAIR_NEIGHBORHOOD_REGRESSION_CHECK',
      evidence:
        '배치 003에서 최초 수리 대상 10문단 중 6문단은 지적된 문제를 고친 뒤 인접 필드의 누락·' +
        '범위·양상 문제가 재감사에서 남았다. 이전 카나리에서도 반복 수리 후 잔존 문제가 있었다.',
      rule:
        '명제·간선·핵심 관계 하나를 수리하면 참조 ID뿐 아니라 centralStory, centralAxes, ' +
        'coreRelations, keyMappings, supportingConcepts의 같은 의미를 함께 재검사한다.',
      decision: 'GENERALIZE_NOW_AS_REPAIR_PROCESS_RULE',
    },
  ],
  retainedCases: [
    {
      caseId: 'PGC-013',
      reason:
        '명시적 접속 관계를 수리 과정에서 삭제한 직접 사례는 현재 한 건이다. PG-RULE-001과 ' +
        'PG-RULE-004의 경계 예시로 보존하되 독립 규칙으로 만들지는 않는다.',
    },
  ],
  rejectedForcedGeneralizations: [
    {
      candidate: '모든 접속 문장은 반드시 인과 간선을 가져야 한다.',
      reason: '접속 표현에는 병렬·대조·순서·인과가 섞여 있어 거짓 규칙이다.',
    },
    {
      candidate: '모든 원문 세부를 core relation으로 승격한다.',
      reason: '위치·예시·보조 설명까지 모두 core로 만들면 문단 진단 구조의 중심성이 사라진다.',
    },
    {
      candidate: '감사기가 지적한 간선은 삭제하는 것이 안전하다.',
      reason: '블록체인 2문단처럼 삭제가 원문의 명시적 관계를 없애는 수리 회귀를 만들 수 있다.',
    },
  ],
};
writeJson(resolve(outputRoot, 'accumulated-generalization-review-v1.json'), generalizationReview);

writeText(resolve(outputRoot, 'ACCUMULATED-GENERALIZATION-REVIEW.md'), `# 누적 문단 골드 사례 일반화 검토

## 1. 전체 맥락

카나리 16문단, 배치 002의 10문단, 배치 003의 16문단까지 총 42문단을 처리했다. 협업 수리
사례는 카나리 4건, 배치 002 3건, 배치 003 8건으로 총 15건이다. 42문단 중 독립 최초 감사
산출물이 존재하는 40문단에서는 총 60개의 이슈가 보고됐다. 두 문단은 매핑 게이트에서 먼저
차단되어 최초 의미 감사 파일이 없다.

## 2. 수행한 작업에 대한 목적

개별 사례를 무조건 규칙으로 늘리지 않고, 서로 다른 지문에서 되풀이된 구조적 오류만 다음
생성·감사·수리 단계에 재사용할 일반 규칙 후보로 정리하는 것이 목적이다.

## 3. 작업 과정

- 세 개 casebook의 15개 협업 사례를 원문 의미, 실패 위치, 수정 방법 기준으로 다시 비교했다.
- 40개 최초 감사 파일의 이슈를 category, 문단, 지문 단위로 집계했다.
- 이름이 비슷한 사례가 아니라 같은 방지 규칙으로 막을 수 있는 사례만 하나의 가족으로 묶었다.
- 직접 사례가 한 건뿐이거나 반례 가능성이 있는 규칙은 독립 일반화하지 않았다.

최초 감사의 주요 분포는 다음과 같다.

| 감사 범주 | 이슈 | 문단 | 지문 |
|---|---:|---:|---:|
| DIRECTION | 19 | 13 | 6 |
| CONDITION_OR_SCOPE | 14 | 8 | 6 |
| UNSUPPORTED_MEANING | 11 | 7 | 6 |
| OTHER | 6 | 6 | 4 |
| AXIS_COVERAGE | 4 | 4 | 3 |

## 4. 작업 결과

### 지금 일반화할 수 있는 네 문제 가족

1. **간선의 방향과 유형을 근거보다 강하게 만드는 문제**
   - 6개 지문에서 방향 오류가 반복됐다.
   - 병렬 속성, 단계적 변화, 정의, 절차 순서를 인과·근거 간선으로 강제하는 사례가 포함된다.
   - 규칙: 간선을 만들기 전 원문이 방향과 유형을 허가하는지 확인한다. 단, ‘따라서’처럼
     명시적 관계 표지는 삭제하지 않는다.

2. **조건·범위·양상 한정어를 잃는 문제**
   - 조건·범위 이슈가 6개 지문에서 반복됐다.
   - 조건절을 독립 사실로 만들기, 일부 대상의 사례를 전체에 일반화하기, ‘아직까지’와
     ‘할 수 있다’를 단정으로 바꾸기, 위치 조건 누락이 같은 가족이다.
   - 규칙: 조건, 대상 범위, 위치, 가능성·평가·시간 한정어를 명제와 진단 구조에서 동일하게
     보존한다.

3. **명제와 중심 진단 구조 사이의 coverage 불일치**
   - 서로 다른 지문에서 중심 관계가 명제에는 있지만 centralStory·centralAxes·coreRelations에
     빠지는 문제가 반복됐다.
   - 규칙: core 관계는 중심 이야기에 의미가 나타나고 적어도 한 중심축에 연결되어야 하며,
     중심축의 relationIds와 coreRelations는 서로 일치해야 한다.

4. **한 필드만 고친 뒤 인접 필드를 놓치는 수리 회귀**
   - 배치 003에서 수리 대상 10문단 중 6문단이 첫 문제를 고친 뒤에도 관련 필드 문제로 남았다.
   - 규칙: 명제나 간선을 고치면 같은 의미가 등장하는 모든 진단 필드와 이웃 간선을 다시 검사한다.

### 독립 규칙으로 만들지 않은 사례

- PGC-013의 ‘따라서’ 관계 삭제는 직접 사례가 한 건이다. 간선 근거 규칙과 수리 회귀 점검의
  경계 예시로 보존하되 별도 보편 규칙으로 만들지 않는다.
- UNSUPPORTED_MEANING은 빈도가 높지만 범위가 너무 넓다. ‘원문에 없는 내용을 추가하지 않는다’는
  기존 계약 이상의 구체적인 단일 규칙으로 묶지 않았다.

### 만들지 않은 과잉 규칙

- 모든 접속 문장에 인과 간선을 만든다.
- 모든 세부 정보를 core relation으로 승격한다.
- 감사기가 지적한 간선은 삭제하는 것이 안전하다.

세 규칙 모두 실제 반례가 있으므로 채택하지 않았다.

## 5. 결과 해석

누적 사례는 무작위 오류의 모음만은 아니다. 간선 근거, 조건·범위 보존, 진단 coverage, 수리 후
인접 필드 점검이라는 네 가족은 여러 지문에서 반복됐으므로 일반화할 근거가 충분하다. 반면
개별 접속어 처리처럼 아직 한 사례뿐인 세부 규칙은 예시로만 보존하는 것이 안전하다.

네 가족 중 진단 coverage는 코드 불변 조건으로 옮길 가능성이 가장 높다. 나머지 세 개는 자연어
의미 판단이 필요하므로 우선 생성·감사·수리 체크리스트와 회귀 사례로 사용하는 편이 적절하다.
현재 결과만으로 특정 교과별 규칙이나 모든 문장을 원자화해야 한다는 결론은 지지되지 않는다.
`);

const automaticParagraphs: Array<Record<string, unknown>> = [];
const sourceParagraphs = new Map([
  ['69c0186c78128b2a9bede0c8', 6],
  ['6a22950f86fd308968e11320', 6],
  ['69bcae308095df3b8c53d9a2', 4],
]);
for (const [sourceId, count] of sourceParagraphs) {
  for (let position = 1; position <= count; position += 1) {
    const paragraphId = `${sourceId}-p${position}`;
    if (results.some((result) => result.paragraphId === paragraphId)) continue;
    const dir = paragraphDir(sourceId, paragraphId);
    const status = readJson(resolve(dir, 'status.json')) as {
      readonly status?: unknown;
      readonly productionEligible?: unknown;
      readonly diagnosticGoldHash?: unknown;
      readonly propositionBundleHash?: unknown;
    };
    if (
      status.status !== 'AGENT_AUDITED' ||
      status.productionEligible !== true ||
      typeof status.diagnosticGoldHash !== 'string' ||
      typeof status.propositionBundleHash !== 'string'
    ) {
      throw new Error(`${paragraphId}: 자동 감사 통과 문단이 아니다.`);
    }
    const diagnosticPaths = [
      resolve(dir, 'diagnostic-gold-candidate.json'),
      resolve(dir, 'diagnostic-gold-repaired.json'),
    ];
    const bundlePaths = [
      resolve(dir, 'proposition-bundle-candidate.json'),
      resolve(dir, 'proposition-bundle-repaired.json'),
    ];
    const diagnosticPath = diagnosticPaths.find((path) =>
      existsSync(path) &&
      artifactHash(ParagraphDiagnosticGoldSchema.parse(readJson(path))) === status.diagnosticGoldHash);
    const bundlePath = bundlePaths.find((path) =>
      existsSync(path) &&
      artifactHash(ParagraphPropositionBundleSchema.parse(readJson(path))) === status.propositionBundleHash);
    if (diagnosticPath === undefined || bundlePath === undefined) {
      throw new Error(`${paragraphId}: 상태 해시와 일치하는 자동 산출물이 없다.`);
    }
    automaticParagraphs.push({
      sourceId,
      paragraphId,
      approvalLabel: 'AUTOMATIC_AGENT_AUDITED',
      approvedDiagnosticGold: {
        path: projectPath(diagnosticPath),
        hash: status.diagnosticGoldHash,
      },
      approvedPropositionBundle: {
        path: projectPath(bundlePath),
        hash: status.propositionBundleHash,
      },
      productionEligible: true,
    });
  }
}

const semiautomaticParagraphs = results.map((result) => {
  const dir = resolve(outputRoot, result.paragraphId);
  return {
    sourceId: result.sourceId,
    paragraphId: result.paragraphId,
    approvalLabel: 'SEMIAUTOMATIC_PENDING_USER_APPROVAL',
    proposedDiagnosticGold: {
      path: projectPath(resolve(dir, 'diagnostic-gold.json')),
      hash: artifactHash(result.diagnosticGold),
    },
    proposedPropositionBundle: {
      path: projectPath(resolve(dir, 'proposition-bundle.json')),
      hash: artifactHash(result.propositionBundle),
    },
    productionEligible: false,
  };
});
if (automaticParagraphs.length !== 10 || semiautomaticParagraphs.length !== 6) {
  throw new Error(
    `분류 수 오류: 자동 ${automaticParagraphs.length}, 반자동 ${semiautomaticParagraphs.length}`,
  );
}
writeJson(resolve(batchRoot, 'approval-pending-manifest-v1.json'), {
  artifactType: 'paragraph-gold-batch-approval-pending-manifest-v1',
  batchId,
  counts: {
    total: 16,
    automaticAgentAudited: 10,
    semiautomaticPendingUserApproval: 6,
    productionEligibleBeforeUserApproval: 10,
  },
  paragraphs: [...automaticParagraphs, ...semiautomaticParagraphs],
});

writeJson(resolve(outputRoot, 'summary.json'), {
  artifactType: 'paragraph-gold-collaborative-repair-summary-v1',
  batchId,
  repairedParagraphCount: results.length,
  results: results.map((result) => ({
    paragraphId: result.paragraphId,
    title: result.title,
    repairSummary: result.repairSummary,
    semanticChecks: result.semanticChecks,
    status: 'SEMIAUTOMATIC_REPAIR_PENDING_USER_APPROVAL',
  })),
  automaticAgentAuditedCount: 10,
  semiautomaticPendingUserApprovalCount: 6,
  semiautomaticProductionEligibleCount: 0,
  apiExecutionAddedByCollaborativeRepair: {
    responseCount: 0,
    costUsd: 0,
  },
});

writeText(resolve(outputRoot, 'REPORT.md'), `# 배치 003 협업 수리 보고

## 1. 전체 맥락

완전한 지문 3개의 16문단을 생성·감사하고 자동 수리를 한 번 실행한 결과, 10문단은 자동으로
통과했고 6문단은 검토 대상으로 남았다. 이번 작업은 이 6문단만 기존 산출물과 분리해 수리했다.

## 2. 수행한 작업에 대한 목적

재감사에서 확인된 의미 문제를 원문에 맞게 최소 수정하고, 같은 문제가 다음 배치에서 반복되는지
판단할 수 있도록 실패와 해결 방법을 사례로 남기는 것이 목적이다.

## 3. 작업 과정

- 수치예보 5문단: 감쇠층의 ‘영역 내부’ 위치 조건 복원
- 옥신 3문단: 단계 관계의 인과화 제거 및 감수성 비교 범위 제한
- 옥신 4문단: 생장 촉진의 조건부 양상 복원
- 블록체인 1문단: 합의 알고리즘 사용과 작업증명 예시를 중심 구조에 복원
- 블록체인 2문단: ‘따라서’가 명시한 합의 속도→승인 시간 관계 복원
- 블록체인 4문단: 승인 시간→보안성 관계와 ‘아직까지’ 시간 양상 복원
- 기존 자동 산출물은 변경하지 않고 각각 별도 자식 Bundle로 저장
- 스키마, 원문 보존, ID 참조, 사례별 의미 조건 검사

## 4. 작업 결과

6개 협업 수리 후보 모두 정적 검사와 사례별 의미 검사를 통과했다. 이번 수리에는 유료 API를
추가로 호출하지 않았다. 결과 승인 전이므로 상태는
\`SEMIAUTOMATIC_REPAIR_PENDING_USER_APPROVAL\`이고 생산 자격은 아직 부여하지 않았다.

| 경로 | 문단 수 | 현재 상태 |
|---|---:|---|
| 기존 자동 감사 통과 | 10 | 생산 가능 |
| 반자동 협업 수리 | 6 | 결과 승인 대기 |

## 5. 결과 해석

여섯 문단의 문제는 여덟 사례로 분해됐다. 그중 대부분은 완전히 새로운 문제가 아니라 기존에
관찰한 간선 근거, 조건·범위 보존, 진단 coverage, 수리 후 인접 필드 점검 문제의 재발이다.
반면 블록체인 2문단의 명시적 접속 관계 삭제는 현재 직접 사례가 하나뿐이므로 독립 일반 규칙으로
승격하지 않고 회귀 사례로만 보존했다.
`);

process.stdout.write(
  `배치 003 협업 수리 완료: 자동 10, 반자동 승인 대기 6\n${outputRoot}\n`,
);
