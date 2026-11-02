import { describe, expect, it } from 'vitest';
import { arrangeEndParagraphs, expandToSentence } from './end-paragraphs.js';

const passage = '법인은 법적 인격체로, 권리의 주체다. 범위는 0.1에서 1.0 사이다. 자산은 법인에게 귀속된다.';

describe('expandToSentence', () => {
  it('widens a clause to its whole sentence without stopping at decimal points', () => {
    const at = passage.indexOf('법적 인격체로');
    expect(passage.slice(...Object.values(expandToSentence(passage, at, at + 7)) as [number, number])).toBe('법인은 법적 인격체로, 권리의 주체다.');
    const mid = passage.indexOf('1.0');
    expect(passage.slice(...Object.values(expandToSentence(passage, mid, mid + 3)) as [number, number])).toBe('범위는 0.1에서 1.0 사이다.');
  });
});

describe('arrangeEndParagraphs', () => {
  const mark = (quote: string) => ({ location: 'PASSAGE' as const, quote });
  it('merges a short last paragraph into the one before and keeps that mark', () => {
    const out = arrangeEndParagraphs([{ text: '자산은 법인의 것이야.', mark: mark('자산은 법인에게 귀속된다') }, { text: '그러므로 ②가 정답이야.', mark: null }], { passage });
    expect(out).toHaveLength(1);
    expect(out[0]!.text).toBe('자산은 법인의 것이야. 그러므로 ②가 정답이야.');
    expect(out[0]!.highlights[0]!.text).toBe('자산은 법인에게 귀속된다.');
  });
  it('drops a highlight that overlaps any earlier highlight in the section, even with a paragraph between', () => {
    const long = '이 문단은 마흔 자를 넘기려고 일부러 길게 쓴 마지막 문단이야. 그래서 앞 문단에 합쳐지지 않아.';
    const out = arrangeEndParagraphs([
      { text: '첫 문단', mark: mark('법적 인격체로') },
      { text: '둘째 문단', mark: mark('권리의 주체다') },
      { text: '셋째 문단', mark: mark('자산은 법인에게') },
      { text: long, mark: mark('법인은 법적') },
    ], { passage });
    expect(out.map(p => p.highlights.length)).toEqual([1, 0, 1, 0]);
  });
  it('leaves an unfound or repeated quote unmarked and reads scenario marks from the scenario', () => {
    const out = arrangeEndParagraphs([{ text: '없는 곳', mark: mark('없는 말') }, { text: '보기 문단은 마흔 자를 넘기려고 이렇게 길게 써서 합쳐지지 않게 한 문단이야.', mark: { location: 'SCENARIO', quote: '갑은 대표 이사' } }],
      { passage, scenario: '한편 갑은 대표 이사이다. 을은 주주다.' });
    expect(out[0]!.highlights).toEqual([]);
    expect(out[1]!.highlights[0]).toMatchObject({ location: 'SCENARIO', text: '한편 갑은 대표 이사이다.' });
  });
});
