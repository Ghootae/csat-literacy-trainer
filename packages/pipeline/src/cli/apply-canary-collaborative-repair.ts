import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  ParagraphGoldAuditOutputSchema,
  ParagraphPropositionBundleSchema,
  artifactHash,
  type ParagraphPropositionBundle,
} from '../paragraph-analysis/production.js';

const experimentRoot = resolve(
  process.cwd(),
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04',
);
const artifactRoot = resolve(experimentRoot, 'artifacts');
const outputRoot = resolve(experimentRoot, 'canary-review', 'collaborative-repair');
const batchId = 'canary-16-batch-001';

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

interface RepairTarget {
  readonly sourceId: string;
  readonly paragraphId: string;
  readonly title: string;
  readonly repairSummary: string;
  readonly operations: readonly Record<string, unknown>[];
  readonly revise: (options: {
    readonly diagnosticGold: ReturnType<typeof ParagraphDiagnosticGoldSchema.parse>;
    readonly propositionBundle: ParagraphPropositionBundle;
  }) => {
    readonly diagnosticGold: ReturnType<typeof ParagraphDiagnosticGoldSchema.parse>;
    readonly propositions: ParagraphPropositionBundle['propositions'];
    readonly propositionEdges: ParagraphPropositionBundle['propositionEdges'];
  };
  readonly semanticChecks: (options: {
    readonly diagnosticGold: ReturnType<typeof ParagraphDiagnosticGoldSchema.parse>;
    readonly propositionBundle: ParagraphPropositionBundle;
  }) => readonly { readonly name: string; readonly passed: boolean; readonly explanation: string }[];
}

const targets: readonly RepairTarget[] = [
  {
    sourceId: '69fd388386fd308968e0b9f4',
    paragraphId: '69fd388386fd308968e0b9f4-p3',
    title: '볼록 렌즈와 비점 수차 · 3문단',
    repairSummary: '병렬적으로 제시된 자오면의 두 속성 사이에 남아 있던 단방향 E3 간선을 삭제했다.',
    operations: [{ operation: 'DELETE_EDGE', edgeId: 'E3' }],
    revise: ({ diagnosticGold, propositionBundle }) => ({
      diagnosticGold,
      propositions: propositionBundle.propositions,
      propositionEdges: propositionBundle.propositionEdges.filter((edge) => edge.id !== 'E3'),
    }),
    semanticChecks: ({ propositionBundle }) => [
      {
        name: 'E3 간선 삭제',
        passed: !propositionBundle.propositionEdges.some((edge) => edge.id === 'E3'),
        explanation: '자오면의 기하학적 성질과 기능은 각각 P4·P5로 보존하되 방향 간선을 두지 않는다.',
      },
      {
        name: '두 원문 명제 보존',
        passed: ['P4', 'P5'].every((id) =>
          propositionBundle.propositions.some((proposition) => proposition.id === id)),
        explanation: '간선만 삭제하고 자오면의 두 속성은 삭제하지 않는다.',
      },
    ],
  },
  {
    sourceId: '69c09163fa5063deffe1c180',
    paragraphId: '69c09163fa5063deffe1c180-p5',
    title: '준거가격과 거래효용 · 5문단',
    repairSummary: '조건절을 존재·가능 진술로 바꾼 P6과 이를 출발점으로 삼은 E4를 삭제했다.',
    operations: [
      { operation: 'DELETE_PROPOSITION', propositionId: 'P6' },
      { operation: 'DELETE_EDGE', edgeId: 'E4' },
    ],
    revise: ({ diagnosticGold, propositionBundle }) => ({
      diagnosticGold,
      propositions: propositionBundle.propositions.filter((proposition) => proposition.id !== 'P6'),
      propositionEdges: propositionBundle.propositionEdges.filter((edge) => edge.id !== 'E4'),
    }),
    semanticChecks: ({ diagnosticGold, propositionBundle }) => [
      {
        name: '조건의 존재 명제 제거',
        passed: !propositionBundle.propositions.some((proposition) => proposition.id === 'P6'),
        explanation: '원문은 신뢰 사례가 존재한다고 진술하지 않고 신뢰할 경우의 결과만 제시한다.',
      },
      {
        name: '조건부 결과 보존',
        passed: propositionBundle.propositions.some((proposition) =>
          proposition.id === 'P7' && proposition.description.includes('신뢰할 경우')),
        explanation: 'P7에 원문의 조건과 가치 인식 결과가 함께 남아 있어 의미가 누락되지 않는다.',
      },
      {
        name: '거래효용 발생·상승 구별 보존',
        passed: diagnosticGold.centralAxes.some((axis) =>
          axis.id === 'AX1' && axis.description.includes('거래효용이 발생')) &&
          diagnosticGold.centralAxes.some((axis) =>
            axis.id === 'AX2' && axis.description.includes('거래효용이 높아지도록 유도')),
        explanation: '희소성 경로의 발생과 외부준거가격 전략의 상승 유도를 구별한다.',
      },
    ],
  },
  {
    sourceId: '69c0961c78128b2a9bee0717',
    paragraphId: '69c0961c78128b2a9bee0717-p2',
    title: '지진파의 특성과 내진설계 · 2문단',
    repairSummary: 'PS시의 정의를 피해 저감 수단으로 연결한 E8을 삭제하고 원문에 없는 구체적 활용 방식 보조 개념을 제거했다.',
    operations: [
      { operation: 'DELETE_EDGE', edgeId: 'E8' },
      {
        operation: 'DELETE_SUPPORTING_CONCEPT',
        value: 'PS시를 피해 저감에 활용하는 구체적 방식',
      },
    ],
    revise: ({ diagnosticGold, propositionBundle }) => ({
      diagnosticGold: ParagraphDiagnosticGoldSchema.parse({
        ...diagnosticGold,
        supportingConcepts: diagnosticGold.supportingConcepts?.filter((concept) =>
          concept !== 'PS시를 피해 저감에 활용하는 구체적 방식'),
      }),
      propositions: propositionBundle.propositions,
      propositionEdges: propositionBundle.propositionEdges.filter((edge) => edge.id !== 'E8'),
    }),
    semanticChecks: ({ diagnosticGold, propositionBundle }) => [
      {
        name: '정의를 수단으로 사용한 간선 제거',
        passed: !propositionBundle.propositionEdges.some((edge) => edge.id === 'E8'),
        explanation: 'PS시 정의 P12 자체를 피해 저감의 수단으로 연결하지 않는다.',
      },
      {
        name: '근거 없는 구체적 방식 제거',
        passed: !(diagnosticGold.supportingConcepts ?? []).some((concept) =>
          concept.includes('구체적 방식')),
        explanation: '원문은 활용 가능성만 말하고 구체적인 방법은 설명하지 않는다.',
      },
      {
        name: '원문의 활용 가능성 보존',
        passed: propositionBundle.propositions.some((proposition) =>
          proposition.id === 'P14' && proposition.description.includes('피해를 조금이나마 줄일 수 있다')),
        explanation: '간선을 삭제해도 P14와 핵심 관계 MR5에 원문 의미가 남아 있다.',
      },
    ],
  },
];

const results: Array<Record<string, unknown>> = [];

for (const target of targets) {
  const sourceDir = resolve(artifactRoot, target.sourceId, target.paragraphId);
  const source = readJson(resolve(sourceDir, '00-source.json')) as {
    readonly paragraph?: { readonly text?: unknown };
  };
  const priorDiagnostic = ParagraphDiagnosticGoldSchema.parse(
    readJson(resolve(sourceDir, 'diagnostic-gold-repaired-2.json')),
  );
  const priorBundle = ParagraphPropositionBundleSchema.parse(
    readJson(resolve(sourceDir, 'proposition-bundle-repaired-2.json')),
  );
  const priorAuditArtifact = readJson(resolve(sourceDir, '08-reaudit-2.json')) as {
    readonly result?: unknown;
  };
  const priorAudit = ParagraphGoldAuditOutputSchema.parse(priorAuditArtifact.result);
  if (priorAudit.decision !== 'REPAIR_REQUIRED') {
    throw new Error(`${target.paragraphId}: 2차 재감사 결과가 REPAIR_REQUIRED가 아니다.`);
  }
  if (source.paragraph?.text !== priorDiagnostic.paragraphText) {
    throw new Error(`${target.paragraphId}: 원문과 2차 수리 진단 골드의 문단 텍스트가 다르다.`);
  }

  const revised = target.revise({
    diagnosticGold: priorDiagnostic,
    propositionBundle: priorBundle,
  });
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse(revised.diagnosticGold);
  const propositionBundle = ParagraphPropositionBundleSchema.parse({
    ...priorBundle,
    derivation: 'AUDIT_REPAIR',
    parentBundleHash: artifactHash(priorBundle),
    repairRunId: `collaborative-${batchId}-${target.paragraphId}`,
    propositions: revised.propositions,
    propositionEdges: revised.propositionEdges,
    auditStatus: 'NOT_AUDITED',
    productionEligible: false,
  });
  const checks = target.semanticChecks({ diagnosticGold, propositionBundle });
  if (checks.some((check) => !check.passed)) {
    throw new Error(`${target.paragraphId}: 협업 수리 의미 점검에 실패했다.`);
  }

  const targetDir = resolve(outputRoot, target.paragraphId);
  const repairRecord = {
    artifactType: 'paragraph-gold-collaborative-repair-v1',
    batchId,
    sourceId: target.sourceId,
    paragraphId: target.paragraphId,
    title: target.title,
    priorDiagnosticGoldHash: artifactHash(priorDiagnostic),
    priorPropositionBundleHash: artifactHash(priorBundle),
    priorAuditHash: artifactHash(priorAudit),
    priorAuditIssues: priorAudit.issues,
    repairSummary: target.repairSummary,
    operations: target.operations,
    diagnosticGold,
    propositionBundle,
    semanticChecks: checks,
    status: 'COLLABORATIVELY_REPAIRED_PENDING_INDEPENDENT_AUDIT',
    productionEligible: false,
  };
  writeJson(resolve(targetDir, 'repair.json'), repairRecord);
  writeJson(resolve(targetDir, 'diagnostic-gold.json'), diagnosticGold);
  writeJson(resolve(targetDir, 'proposition-bundle.json'), propositionBundle);
  writeJson(resolve(targetDir, 'validation.json'), {
    artifactType: 'paragraph-gold-collaborative-repair-validation-v1',
    batchId,
    paragraphId: target.paragraphId,
    schemaValidation: 'PASS',
    sourceTextPreserved: true,
    semanticChecks: checks,
    outputHashes: {
      diagnosticGold: artifactHash(diagnosticGold),
      propositionBundle: artifactHash(propositionBundle),
    },
    productionEligible: false,
    reason: '독립 의미 재감사를 아직 수행하지 않은 협업 수리 후보이다.',
  });
  results.push({
    paragraphId: target.paragraphId,
    title: target.title,
    repairSummary: target.repairSummary,
    semanticChecks: checks,
    status: 'COLLABORATIVELY_REPAIRED_PENDING_INDEPENDENT_AUDIT',
  });
}

const casebook = {
  artifactType: 'paragraph-gold-repair-casebook-v1',
  batchId,
  scope: {
    canaryParagraphCount: 16,
    collaborativeRepairParagraphCount: 3,
  },
  cases: [
    {
      caseId: 'PGC-001',
      category: 'FORCED_DIRECTIONAL_EDGE',
      sourceParagraphId: '69fd388386fd308968e0b9f4-p3',
      sourceExcerpt: '자오면은 광축과 주광선을 포함하는 단 하나의 평면이며, 광축을 중심으로 물체점이 어느 방향에 있는지를 드러낸다.',
      failureHistory: [
        '최초 생성은 P4→P5를 근거-주장으로 연결했다.',
        '1차 수리는 다른 간선만 고쳐 E3을 남겼다.',
        '2차 수리는 유형을 구체화로 바꿨지만 단방향 간선을 유지했다.',
      ],
      finalCorrection: 'P4와 P5를 모두 보존하고 E3은 삭제한다.',
      generalRule: '병렬적으로 제시된 두 속성 사이에 명시적 방향성이 없으면 방향 간선을 만들지 않는다.',
      targetStages: ['GENERATION', 'REPAIR', 'AUDIT'],
      proposedPromotion: 'PROMOTE_NOW',
      downstreamRisk: 'LOW',
    },
    {
      caseId: 'PGC-002',
      category: 'CONDITIONAL_CLAUSE_REIFICATION',
      sourceParagraphId: '69c09163fa5063deffe1c180-p5',
      sourceExcerpt: '제품에 대한 정보가 부족한 소비자가 기업이 제공하는 정보에 담긴 제한된 공급 상황을 신뢰할 경우',
      failureHistory: [
        '최초 생성은 신뢰할 수 있다는 가능성 명제 P6을 만들었다.',
        '1차 수리는 이를 신뢰하는 경우가 있다는 존재 진술로 바꿨다.',
        '2차 수리는 다른 조건 명제 P15는 제거했지만 P6은 남겼다.',
      ],
      finalCorrection: 'P6과 P6을 출발점으로 삼은 E4를 삭제하고 조건과 결과가 함께 있는 P7을 유지한다.',
      generalRule: '조건절을 독립적인 가능성·존재 명제로 바꾸지 말고 해당 결과의 조건으로만 보존한다.',
      targetStages: ['GENERATION', 'REPAIR', 'AUDIT'],
      proposedPromotion: 'PROMOTE_NOW',
      downstreamRisk: 'MEDIUM',
    },
    {
      caseId: 'PGC-003',
      category: 'DEFINITION_USED_AS_MEANS',
      sourceParagraphId: '69c0961c78128b2a9bee0717-p2',
      sourceExcerpt: 'PS시를 활용하면 지진 발생 시 다른 지역의 지진 피해를 조금이나마 줄일 수 있다.',
      failureHistory: [
        '최초 생성은 PS시 정의와 거리 관계를 함께 피해 저감의 수단으로 연결했다.',
        '1차 수리는 정의 간선만 고치고 해당 수단 간선을 남겼다.',
        '2차 수리는 거리 관계만 제거하고 PS시 정의 P12를 수단의 출발점으로 남겼다.',
      ],
      finalCorrection: '정의 P12를 수단으로 사용하는 E8을 삭제하고 활용 가능성은 P14와 MR5에 보존한다.',
      generalRule: '정의 명제를 사용·작동 명제처럼 취급하지 않는다. 별도의 사용 명제가 없으면 효과 간선을 강제로 만들지 않는다.',
      targetStages: ['GENERATION', 'REPAIR', 'AUDIT'],
      proposedPromotion: 'PROMOTE_NOW_WITH_QUALIFIER',
      downstreamRisk: 'MEDIUM',
    },
    {
      caseId: 'PGC-004',
      category: 'UNSUPPORTED_DETAIL_LABEL',
      sourceParagraphId: '69c0961c78128b2a9bee0717-p2',
      sourceExcerpt: 'PS시를 활용하면 지진 발생 시 다른 지역의 지진 피해를 조금이나마 줄일 수 있다.',
      failureHistory: [
        '최초 생성부터 supportingConcepts에 구체적 활용 방식이라는 항목을 넣었다.',
        '원문에는 활용 가능성만 있고 구체적인 방법은 없다.',
        '1·2차 수리 모두 이 항목을 그대로 유지했다.',
      ],
      finalCorrection: '근거 없는 supportingConcept 항목을 삭제한다.',
      generalRule: '원문이 존재만 언급한 내용에 방법·기제·구체적 방식이라는 상세 수준을 추가하지 않는다.',
      targetStages: ['GENERATION', 'REPAIR', 'AUDIT'],
      proposedPromotion: 'PROMOTE_NOW',
      downstreamRisk: 'LOW',
    },
  ],
};
writeJson(resolve(outputRoot, 'casebook.json'), casebook);
writeJson(resolve(outputRoot, 'summary.json'), {
  artifactType: 'paragraph-gold-collaborative-repair-summary-v1',
  batchId,
  inputParagraphCount: 16,
  repairedParagraphCount: results.length,
  results,
  productionEligibleCount: 0,
  reason: '새 협업 수리 후보는 독립 의미 재감사 전이므로 생산 자격을 부여하지 않는다.',
});

const report = `# 1차 생산 단위 협업 수리 및 규칙 승격 검토

## 1. 전체 맥락

카나리 16개 문단을 첫 생산 단위로 보고, 2차 자동 수리 후에도 남은 3개 문단만 협업 방식으로
표적 수리했다. 기존 최초 생성·1차 수리·2차 수리 산출물은 변경하지 않았다.

## 2. 수행한 작업에 대한 목적

자동 수리가 반복해서 놓친 문제를 최소 변경으로 해결하고, 실패 과정을 재사용 가능한 사례와
일반 규칙 후보로 바꾸는 것이 목적이다.

## 3. 작업 과정

- 볼록렌즈 3문단: 병렬 속성 사이의 E3 삭제
- 준거가격 5문단: 조건절을 존재 진술로 만든 P6과 E4 삭제
- 지진파 2문단: 정의를 수단으로 연결한 E8과 근거 없는 보조 개념 삭제
- 각 결과를 기존 2차 수리 Bundle의 자식으로 저장
- 스키마, ID 참조, 원문 보존 및 사례별 의미 조건 검사
- 네 개의 실패 사례와 일반화 규칙 후보 기록

## 4. 작업 결과

세 문단 모두 정적·의미 조건 검사를 통과했다. 다만 독립 의미 재감사를 실행하지 않았으므로
상태는 \`COLLABORATIVELY_REPAIRED_PENDING_INDEPENDENT_AUDIT\`이고 생산 사용은 허용하지 않는다.

| 사례 | 규칙 후보 | 승격 판단 |
|---|---|---|
| 방향 없는 병렬 속성에 강제 간선 생성 | 명시적 방향이 없으면 간선을 만들지 않음 | 즉시 승격 권고 |
| 조건절을 가능·존재 명제로 독립시킴 | 조건은 결과의 적용 범위로만 보존 | 즉시 승격 권고 |
| 정의 명제를 사용·효과의 출발점으로 삼음 | 별도 사용 명제가 없으면 효과 간선을 강제하지 않음 | 단서와 함께 승격 권고 |
| 원문에 없는 ‘구체적 방식’ 추가 | 원문의 상세 수준을 넘는 방법·기제를 추가하지 않음 | 즉시 승격 권고 |

## 5. 결과 해석

세 실패는 특정 교과 지식이 아니라 일반적인 구조 오류다. 다음 배치의 1차 수리에는 사례 전체를
무제한으로 넣기보다 위 네 규칙과 대표 예시만 전달하는 것이 적절하다. 다만 규칙을 실제 프롬프트에
반영하기 전에는 현재 16개 결과를 회귀 기준으로 삼아 정상 문단을 훼손하지 않는지 확인해야 한다.
`;
writeText(resolve(outputRoot, 'RULE-PROMOTION-REVIEW.md'), report);

process.stdout.write(
  `협업 수리 완료: ${targets.length}개 문단\n` +
  `사례 기록: ${casebook.cases.length}개\n` +
  `출력: ${outputRoot}\n`,
);
