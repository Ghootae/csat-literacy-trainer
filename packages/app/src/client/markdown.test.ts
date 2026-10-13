import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Markdown } from './markdown.js';

const render = (text: string) => renderToStaticMarkup(createElement(Markdown, { text }));
describe('coach markdown', () => {
  it('renders bold, paragraphs and hard line breaks', () => {
    expect(render('**핵심**과 근거\n다음 줄\n\n다음 문단')).toBe('<div><p><strong>핵심</strong>과 근거<br/>다음 줄</p><p>다음 문단</p></div>');
  });
  it('keeps single asterisks literal for quoted source footnote marks', () => {
    expect(render('“법인의 정관*이나 법령*에서”라고 했어요.')).toBe('<div><p>“법인의 정관*이나 법령*에서”라고 했어요.</p></div>');
  });
  it('renders bullet and numbered lists while preserving the first number', () => {
    expect(render('- 첫째\n- **둘째**\n\n3. 셋째\n4. 넷째')).toBe('<div><ul><li>첫째</li><li><strong>둘째</strong></li></ul><ol start="3"><li>셋째</li><li>넷째</li></ol></div>');
  });
  it('renders raw HTML as text without creating elements', () => {
    const html = render('<script>alert(1)</script>\n<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img'); expect(html).not.toContain('<script'); expect(html).not.toContain('<img');
  });
  it('keeps unsupported syntax and unmatched markers literal', () => {
    expect(render('# 제목\n[링크](https://example.invalid)\n`코드`\n***강조***\n*미완성')).toBe('<div><p># 제목<br/>[링크](https://example.invalid)<br/>`코드`<br/>***강조***<br/>*미완성</p></div>');
  });
});
