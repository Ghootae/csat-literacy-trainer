import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnnotatedText } from './annotated-text.js';

const render = (text: string, annotations: Parameters<typeof AnnotatedText>[0]['annotations']) =>
  renderToStaticMarkup(createElement(AnnotatedText, { text, annotations }));
const a = (marker: string, start: number, text: string, style: 'underline' | 'box' | 'label' = 'underline') =>
  ({ location: 'PASSAGE' as const, marker, style, start, end: start + text.length, text });

describe('annotated source text', () => {
  it('inserts a missing marker before an underlined range', () => {
    const t = '정부는 관련 법률 조항을 통해 강제했다.';
    expect(render(t, [a('ⓐ', 4, '관련 법률 조항을 통해')])).toBe('<p class="lab-annotated">정부는 <span class="lab-marker">ⓐ</span><u>관련 법률 조항을 통해</u> 강제했다.</p>');
  });
  it('does not duplicate a marker the source already prints', () => {
    const t = '보기의 ⓐ옷이 빨갛다.';
    expect(render(t, [a('ⓐ', 5, '옷이')])).toBe('<p class="lab-annotated">보기의 ⓐ<u>옷이</u> 빨갛다.</p>');
  });
  it('leaves labels plain, draws boxes, and ignores ranges that do not match the text', () => {
    const t = '(가) 레보도파: 흡수됨. 핵심 문장.';
    expect(render(t, [a('(가)', 0, '(가) 레보도파', 'label'), a('㉠', 15, '핵심 문장', 'box'), a('㉡', 0, '다른 글')]))
      .toBe('<p class="lab-annotated">(가) 레보도파: 흡수됨. <span class="lab-marker">㉠</span><span class="lab-box">핵심 문장</span>.</p>');
  });
});

it('renders highlights alone and preserves overlapping underline, box and marker', () => {
  const text = '앞 핵심 구절 뒤';
  const highlights = [{ location: 'PASSAGE' as const, start: 2, end: 7, text: '핵심 구절' }];
  const plain = renderToStaticMarkup(createElement(AnnotatedText, { text, annotations: [], highlights }));
  expect(plain).toContain('<span class="lab-highlight">핵심 구절</span>');
  const marked = renderToStaticMarkup(createElement(AnnotatedText, { text, annotations: [a('ⓐ', 2, '핵심', 'underline'), a('㉠', 3, '심 구절', 'box')], highlights }));
  expect(marked).toContain('lab-highlight'); expect(marked).toContain('<u>');
  expect(marked).toContain('lab-box'); expect(marked).toContain('ⓐ'); expect(marked).toContain('㉠');
});
