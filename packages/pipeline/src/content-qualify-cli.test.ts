import { describe, expect, it, vi } from 'vitest';

import { runContentQualificationCli } from './cli/content-qualify.js';

describe('content:qualify dry-run', () => {
  it('법인 p1을 파일 쓰기나 API 호출 없이 계획한다', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const result = await runContentQualificationCli([
      '--candidate-dir', 'content/corporate-law-p1',
      '--source-fixture', 'packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json',
      '--paragraph-id', 'corporate-law-p1',
      '--source-paragraph-id', 'p1',
      '--asset-type', 'all',
      '--regression-probes', '4',
      '--legacy-requalification',
      '--dry-run',
    ]) as {
      dryRun: boolean;
      source: { ignoredFootnoteCount: number };
      estimate: { logicalLlmInvocations: { minimum: number; maximum: number } };
      promotionBlockers: string[];
    };

    expect(result.dryRun).toBe(true);
    expect(result.source.ignoredFootnoteCount).toBe(1);
    expect(result.estimate.logicalLlmInvocations).toEqual({ minimum: 10, maximum: 28 });
    expect(result.promotionBlockers.some((reason) => reason.startsWith('tracked source mismatch:'))).toBe(false);
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });
});
