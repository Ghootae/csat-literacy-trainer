import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractAxisArchitectureCandidate } from './axis-architecture-experiment.js';

describe('axis architecture experiment input', () => {
  it('reuses the analysis stage but not prior axes or roles', () => {
    const path = resolve(
      process.cwd(),
      '.omc/adhoc/paragraph-analysis-v3-1-six-3x-2026-08-26/run-1/' +
        'hegel-aesthetics-absolute-spirit-p1.json',
    );
    const value = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    const candidate = extractAxisArchitectureCandidate(value);
    expect(candidate.axisInput.paragraphId).toBe('hegel-aesthetics-absolute-spirit-p1');
    expect(candidate.axisInput.centralStory).toContain('절대정신');
    expect(candidate.axisInput).not.toHaveProperty('coreRelations');
    expect(candidate.coreRelations.length).toBeGreaterThan(1);
    expect(JSON.stringify(candidate)).not.toContain('diagnosticRole');
  });
});
