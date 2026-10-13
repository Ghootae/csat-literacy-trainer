import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { StudentEvidenceEventSchema } from '@csat/pipeline';
import { JsonlStudentEvidenceStore } from './student-state.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('student evidence store', () => {
  it('증거를 영속화하고 중복 ID를 프로필 집계에서 한 번만 센다', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'student-state-'));
    roots.push(root);
    const store = new JsonlStudentEvidenceStore(resolve(root, 'evidence.jsonl'));
    const event = StudentEvidenceEventSchema.parse({
      schemaVersion: 'student-evidence-v1', eventId: 'e1', studentId: 'student', learningSessionId: 'learning',
      context: 'STUDENT',
      observedAt: '2026-10-01T00:00:00.000Z', dimension: 'CORE_COMPREHENSION', judgment: 'POSITIVE', assistance: 'INDEPENDENT',
      source: { kind: 'PARAGRAPH', passageId: 'passage', contentId: 'p1', evidenceKey: 'axis:AX1', evaluatorVersion: 'v1' },
      observation: { kind: 'PARAGRAPH_INITIAL_AXIS', axisId: 'AX1', initialState: 'captured' },
    });
    store.save([event]);
    store.save([event]);
    store.save([{ ...event, eventId: 'e2', context: 'DEVELOPER', judgment: 'NEGATIVE' }]);
    expect(store.list('student')).toHaveLength(3);
    const report = store.report('student', '2026-10-01T01:00:00.000Z');
    expect(report.profile.dimensions.find((item) => item.dimension === 'CORE_COMPREHENSION')?.positive).toBe(1);
    expect(report.profile.dimensions.find((item) => item.dimension === 'CORE_COMPREHENSION')?.negative).toBe(0);
    expect(report.profile.context).toBe('STUDENT');
    expect(report.profile.requestedWindow).toEqual({ from: '2026-09-01T01:00:00.000Z', to: '2026-10-01T01:00:00.000Z' });
    expect(report.feedback.strengths).toEqual([]);
    expect(store.report('student', '2026-11-01T01:00:00.000Z').profile.dimensions.find((item) => item.dimension === 'CORE_COMPREHENSION')?.positive).toBe(0);
    expect(() => store.report('student', '2026-10-01T01:00:00.000Z', 'STUDENT', 0)).toThrow(/1~365일/);
  });
});
