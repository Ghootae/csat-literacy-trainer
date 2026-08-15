import { describe, expect, it } from 'vitest';

import { materializeQualifiedProbeFixture } from './cli/content-materialize-probes.js';
import type { SourceBundle } from './candidate-qualification.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import { GeneratedProbeCandidatesSchema, probeGeneratorModelInput } from './regression-probe-generation.js';

const bundle = { segments: [{ sourceSegmentId: 'S1', text: '원문' }] } as unknown as SourceBundle;
const querySet = { paragraphId: 'p', regions: [{ regionId: 'r', label: '영역', sourceSentenceIds: ['S1'], propositionIds: ['p1'], relationEdgeIds: [], queries: [{ id: 'q', level: 'relation', question: '관계?', expectedAnswer: '답', sourceSentenceIds: ['S1'], propositionIds: ['p1'], relationEdgeIds: [], criticalForRelation: true, requiredForFullArgumentCoverage: false, acceptanceCriteria: ['기준'], contradictionCriteria: [] }] }] } as GeneratedQuerySet;

describe('regression probe generation', () => {
  it('생성 모델 입력에는 expected verdict가 없다', () => {
    const input = probeGeneratorModelInput(bundle, querySet, 8);
    expect(Object.keys(input).sort()).toEqual(['primaryTextSegments', 'regions', 'requestedProbeCount']);
    expect(JSON.stringify(input)).not.toContain('expectFocal');
    expect(JSON.stringify(input)).not.toContain('expectedCeiling');
  });

  it('생성 structured output에서 focal region을 필수로 요구한다', () => {
    const withoutFocal = {
      schemaVersion: 'regression-probe-candidates-v2-required-focal',
      probes: [{
        id: 'probe', text: '응답',
        mutationSpec: { targetQueryIds: ['q'], mutation: 'omit_relation', preservedElements: [], omittedElements: ['관계'], contradictedElements: [], rationale: '관계 누락' },
      }],
    };
    expect(GeneratedProbeCandidatesSchema.safeParse(withoutFocal).success).toBe(false);
    expect(GeneratedProbeCandidatesSchema.parse({
      ...withoutFocal,
      probes: [{ ...withoutFocal.probes[0], focal: 'r' }],
    }).probes[0]?.focal).toBe('r');
  });

  it('독립 qualification 결과로만 expected verdict를 materialize한다', () => {
    const candidate = { name: '후보', gold: 'g.json', querySet: 'q.json', focal: 'r', probes: [{ id: 'probe', focal: 'r', text: '응답', mutationSpec: { targetQueryIds: ['q'], mutation: 'omit_relation', preservedElements: [], omittedElements: ['관계'], contradictedElements: [], rationale: '관계 누락' } }] };
    const result = materializeQualifiedProbeFixture({
      candidate,
      loadRecord: () => ({
        schemaVersion: 'regression-probe-qualification-v4-contradiction-evidence', runId: 'run', paragraphId: 'p', probeId: 'probe', focalRegionId: 'r',
        verifierFingerprint: `sha256:${'1'.repeat(64)}`, queryCandidateHash: `sha256:${'2'.repeat(64)}`, sourceBundleHash: `sha256:${'3'.repeat(64)}`,
        executionStatus: 'completed', qualificationOutcome: 'auto_qualified', derivedExpectedVerdict: 'topic_only', passes: [], disagreementReasons: [], completedAt: '2026-08-16T00:00:00.000Z',
      }),
    });
    expect(result.probes[0]?.expectFocal).toBe('topic_only');
    expect(result.probes[0]?.mutationSpec.expectedCeiling).toBe('topic_only');
  });
});
