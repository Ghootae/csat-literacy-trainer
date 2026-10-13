import { describe, expect, it } from 'vitest';

import { ParagraphGoldAuditV2V4OutputSchema } from './audit-v2-v4.js';

describe('paragraph gold audit v2+v4 schema', () => {
  it('keeps the v4 evidence inside one integrated audit output', () => {
    const shape = ParagraphGoldAuditV2V4OutputSchema.shape;
    expect(shape.integrationVersion).toBeDefined();
    expect(shape.principleExceptionEvidence).toBeDefined();
    expect(shape.regressionChecks).toBeDefined();
  });
});
