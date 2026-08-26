import { describe, expect, it } from 'vitest';

import { loadDiagnosticRolesPrompt, validateDiagnosticRolesResult } from './evaluator.js';
import type { DiagnosticRolesInput, DiagnosticRolesResult } from './schema.js';

const input: DiagnosticRolesInput = {
  paragraphId: 'p1',
  centralStory: 'A 때문에 B가 되고 C가 이를 반복한다.',
  coreRelations: [
    { id: 'MR1', description: 'A 때문에 B가 된다.' },
    { id: 'MR2', description: 'C는 같은 원리를 반복한다.' },
  ],
  centralAxes: [{
    id: 'AX1',
    description: 'A 때문에 B가 되고 C가 이를 반복한다.',
    relationIds: ['MR1', 'MR2'],
  }],
};

function result(): DiagnosticRolesResult {
  return {
    schemaVersion: 'diagnostic-roles-openai-v1',
    paragraphId: 'p1',
    verdict: 'READY',
    axisAudits: [{
      axisId: 'AX1',
      assignments: [
        { relationId: 'MR1', diagnosticRole: 'required', counterfactualReason: 'MR1이 없으면 인과 방향을 판단할 수 없다.' },
        { relationId: 'MR2', diagnosticRole: 'error_only', counterfactualReason: 'MR1만으로 중심 인과를 판단할 수 있다.' },
      ],
    }],
    relationRoles: [
      { relationId: 'MR1', diagnosticRole: 'required' },
      { relationId: 'MR2', diagnosticRole: 'error_only' },
    ],
    issues: [],
  };
}

describe('diagnostic roles API stage', () => {
  it('loads an axis-scoped counterfactual prompt', () => {
    const prompt = loadDiagnosticRolesPrompt();
    expect(prompt).toContain('같은 축의 다른 관계가 모두 정확히 확인됐다고 가정한다');
    expect(prompt).toContain('PASS 체크리스트가 아니며');
  });

  it('accepts a minimal READY assignment', () => {
    expect(validateDiagnosticRolesResult(result(), input).verdict).toBe('READY');
  });

  it('rejects an axis without a required anchor', () => {
    const value = result();
    value.axisAudits[0]!.assignments[0]!.diagnosticRole = 'error_only';
    value.relationRoles[0]!.diagnosticRole = 'error_only';
    expect(() => validateDiagnosticRolesResult(value, input)).toThrow(/probe anchor/);
  });

  it('rejects a global role inconsistent with an axis role', () => {
    const value = result();
    value.relationRoles[0]!.diagnosticRole = 'error_only';
    expect(() => validateDiagnosticRolesResult(value, input)).toThrow(/global role mismatch/);
  });
});
