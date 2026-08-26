import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractCentralAxesInput } from './central-axes-batch.js';

describe('central axes batch input', () => {
  it('accepts a current dialogue gold while ignoring its old axes', () => {
    const value = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'packages/pipeline/fixtures/experiments/dialogue/gold-v2/information-asymmetry-free-marketplace-p3.json',
    ), 'utf8')) as unknown;

    const input = extractCentralAxesInput(value);
    expect(input.paragraphId).toBe('information-asymmetry-free-marketplace-p3');
    expect(input.centralStory).toContain('미국 연방 대법원');
    expect(input.coreRelations.map((relation) => relation.id)).toEqual([
      'MR1', 'MR2', 'MR3', 'MR4', 'MR5',
    ]);
    expect(input).not.toHaveProperty('centralAxes');
  });

  it('accepts a paragraph-analysis artifact wrapper', () => {
    const input = extractCentralAxesInput({
      result: {
        diagnosticGold: {
          paragraphId: 'p1',
          centralObject: '대상',
          centralStory: 'A와 B가 대조된다.',
          coreRelations: [
            { id: 'MR1', description: 'A와 B가 대조된다.' },
          ],
        },
      },
    });
    expect(input.paragraphId).toBe('p1');
  });
});
