import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { planCandidateGeneration } from './cli/content-generate-candidate.js';

const SOURCE = 'packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json';

describe('source-bound candidate generation plan', () => {
  it('dry-run은 신규 candidate의 정확한 단계와 논리 API 호출 수를 보여 준다', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'candidate-plan-'));
    const plan = planCandidateGeneration([
      '--source-fixture', SOURCE,
      '--source-paragraph-id', 'p2',
      '--paragraph-id', 'corporate-law-p2',
      '--candidate-dir', dir,
      '--dry-run',
    ]);

    expect(plan.dryRun).toBe(true);
    expect(plan.pendingLogicalApiCalls).toBe(6);
    expect(plan.stages).toEqual([
      { asset: 'gold', status: 'pending', logicalApiCallsIfPending: 4 },
      { asset: 'query', status: 'pending', logicalApiCallsIfPending: 1 },
      { asset: 'title-query', status: 'pending', logicalApiCallsIfPending: 1 },
    ]);
  });

  it('완료된 단계는 재실행 계획에서 제외한다', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'candidate-resume-'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'gold.json'), '{}\n', 'utf8');
    const plan = planCandidateGeneration([
      '--source-fixture', SOURCE,
      '--source-paragraph-id', 'p2',
      '--paragraph-id', 'corporate-law-p2',
      '--candidate-dir', dir,
      '--dry-run',
    ]);

    expect(plan.pendingLogicalApiCalls).toBe(2);
    expect(plan.stages[0]?.status).toBe('existing');
  });
});
