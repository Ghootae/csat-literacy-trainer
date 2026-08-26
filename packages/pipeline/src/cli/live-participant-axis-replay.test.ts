import { describe, expect, it } from 'vitest';

import { parseSourceSession } from './live-participant-axis-replay.js';

describe('live participant axis replay input', () => {
  it('preserves the actual initial response and question-answer history', () => {
    const session = parseSourceSession({
      sessionId: 's1',
      paragraphId: 'p1',
      initialResponse: '최초 응답',
      history: [{
        question: { type: 'DIAGNOSTIC', text: '질문' },
        answer: '후속 응답',
      }],
    });
    expect(session.initialResponse).toBe('최초 응답');
    expect(session.history[0]?.answer).toBe('후속 응답');
  });

  it('rejects aggregate result files as sessions', () => {
    expect(() => parseSourceSession({ results: [] })).toThrow(/malformed/);
  });
});
