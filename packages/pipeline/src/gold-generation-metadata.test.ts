import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  GOLD_GENERATION_CONFIG,
  createGoldGenerationMetadata,
  goldGenerationStatus,
  goldGeneratorFingerprint,
} from './gold-generation-metadata.js';

describe('골드 생성 provenance', () => {
  it('새 골드는 재현에 필요한 설정과 미검수 초기 상태를 기록한다', () => {
    const metadata = createGoldGenerationMetadata('문단 원문', '2026-08-13T00:00:00.000Z');
    expect(metadata).toMatchObject({
      provider: 'anthropic',
      model: 'claude-opus-4-8',
      effort: 'medium',
      generatedAt: '2026-08-13T00:00:00.000Z',
      review: { status: 'unreviewed' },
      revisions: [],
    });
    expect(metadata.promptVersion).not.toBe('');
    expect(metadata.schemaVersion).not.toBe('');
    expect(metadata.sourceHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(metadata.generatorFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('같은 원문·설정은 안정적이고 원문 또는 생성 계약이 달라지면 해당 지문이 달라진다', () => {
    const first = createGoldGenerationMetadata('원문\r\n', '2026-08-13T00:00:01.000Z');
    const same = createGoldGenerationMetadata('원문\n', '2026-08-13T00:00:02.000Z');
    expect(first.sourceHash).toBe(same.sourceHash);
    expect(first.generatorFingerprint).toBe(same.generatorFingerprint);

    const changedSource = createGoldGenerationMetadata('다른 원문', '2026-08-13T00:00:03.000Z');
    expect(changedSource.sourceHash).not.toBe(first.sourceHash);
    expect(changedSource.generatorFingerprint).toBe(first.generatorFingerprint);

    const changedEffort = { ...GOLD_GENERATION_CONFIG, effort: 'high' };
    expect(goldGeneratorFingerprint(changedEffort)).not.toBe(first.generatorFingerprint);
    expect(
      goldGeneratorFingerprint({ ...GOLD_GENERATION_CONFIG, promptVersion: 'next-prompt' }),
    ).not.toBe(first.generatorFingerprint);
  });

  it('기존 content 골드는 legacy로, 새 provenance 골드는 recorded로 식별된다', () => {
    const contentRoot = resolve(process.cwd(), 'content');
    const golds = readdirSync(contentRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve(contentRoot, entry.name, 'gold.json'))
      .filter((path) => existsSync(path));
    expect(golds).toHaveLength(11);
    const statuses: string[] = [];
    for (const path of golds) {
      const gold = JSON.parse(readFileSync(path, 'utf8')) as { generationMetadata?: unknown };
      statuses.push(goldGenerationStatus(gold));
    }
    expect(statuses.filter((status) => status === 'legacy/no-fingerprint')).toHaveLength(8);
    expect(statuses.filter((status) => status === 'recorded')).toHaveLength(3);
    expect(
      goldGenerationStatus({
        generationMetadata: createGoldGenerationMetadata('새 원문', '2026-08-13T00:00:00.000Z'),
      }),
    ).toBe('recorded');
  });

  it('metadata가 있는데 계약이 깨졌으면 recorded로 가장하지 않는다', () => {
    expect(() => goldGenerationStatus({ generationMetadata: { provider: 'anthropic' } })).toThrow();
  });

  it('buildGold 반환 경로가 metadata를 자동 부착한다', () => {
    const source = readFileSync(resolve(process.cwd(), 'packages/pipeline/src/gold.ts'), 'utf8');
    expect(source).toContain('generationMetadata: createGoldGenerationMetadata(paragraphText)');
  });

  it('content import는 새 metadata를 객체 전개로 보존한다', () => {
    const source = readFileSync(resolve(process.cwd(), 'packages/pipeline/src/cli/content-import.ts'), 'utf8');
    expect(source).toContain('const outGold = { ...gold, paragraphId: s.id }');
  });
});
