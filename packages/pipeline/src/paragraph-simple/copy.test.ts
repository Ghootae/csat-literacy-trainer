import { describe, expect, it } from 'vitest';
import { detectSourceCopy } from './copy.js';

const paragraph = '폐포는 공기가 드나드는 작은 주머니이다. 폐포를 둘러싸고 있는 액체층의 표면 장력은 폐포를 수축하게 하는 압력으로 작용한다. 그런데 계면 활성제가 분비되어 액체층의 표면 장력을 낮춘다.';

describe('detectSourceCopy', () => {
  it('원문 문장 하나를 통째로 옮기면 복사', () => {
    expect(detectSourceCopy('폐포를 둘러싸고 있는 액체층의 표면 장력은 폐포를 수축하게 하는 압력으로 작용한다.', [paragraph])).toBe(true);
    expect(detectSourceCopy('폐포를 둘러싸고 있는 액체층의 표면 장력은 폐포를 수축하게 하는 압력으로 작용한다 그런데 계면 활성제가 분비되어 액체층의 표면 장력을 낮춘다', [paragraph])).toBe(true);
  });
  it('문장을 줄이거나 고쳐 쓰면 복사가 아니다', () => {
    expect(detectSourceCopy('표면 장력은 폐포를 수축시키는 압력으로 작용해.', [paragraph])).toBe(false);
    expect(detectSourceCopy('폐포를 둘러싼 액체층의 표면 장력은 폐포를 수축시키는 압력으로 작용한다.', [paragraph])).toBe(false);
  });
  it('옮긴 문장이 응답의 일부일 뿐이면 복사가 아니다', () => {
    expect(detectSourceCopy('폐포는 공기가 드나드는 작은 주머니이다. 그런데 표면 장력이 폐포를 오므라들게 하고, 계면 활성제가 그 힘을 줄여 줘서 폐포가 쉽게 부푼다.', [paragraph])).toBe(false);
  });
  it('짧은 답은 복사가 아니다', () => expect(detectSourceCopy('모르겠어.', [paragraph])).toBe(false));
});
