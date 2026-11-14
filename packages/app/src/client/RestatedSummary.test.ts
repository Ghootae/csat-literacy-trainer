import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RestatedSummary } from './RestatedSummary.js';

const html = (restatedSummary: string | null, restatedCorrections: { studentQuote: string; correction: string }[]) =>
  renderToStaticMarkup(createElement(RestatedSummary, { current: { restatedSummary, restatedCorrections } }));

describe('RestatedSummary (Q-0050)', () => {
  it('오류가 없으면 기존 제목과 문구를 쓴다', () => {
    expect(html('빛이 변한다', [])).toContain('지금까지 내 요약');
    expect(html(null, [])).toContain('첫 요약을 보내면');
    expect(html('', [])).toContain('아직 이 문단에');
  });
  it('오류가 남으면 제목을 바꾸고 틀린 구절에 취소선, 교정을 붙인다', () => {
    const h = html('개시제가 반응하면 중합이 멈춘다', [{ studentQuote: '중합이 멈춘다', correction: '사슬이 자라기 시작한다' }]);
    expect(h).toContain('피드백을 반영한 정리');
    expect(h).not.toContain('지금까지 내 요약');
    expect(h).toContain('<del>중합이 멈춘다</del>');
    expect(h).toContain('사슬이 자라기 시작한다');
  });
  it('인용이 요약에 없어도 교정 목록은 보인다', () => {
    const h = html('요약 문장', [{ studentQuote: '다른 말', correction: '바른 내용' }]);
    expect(h).toContain('<del>다른 말</del> → 바른 내용');
    expect(h).toContain('<p>요약 문장</p>');
  });
});
