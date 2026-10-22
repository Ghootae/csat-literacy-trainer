import { describe, expect, it } from 'vitest';
import { simpleWaitingText } from './simple-waiting.js';

const long = '조금 오래 걸리고 있어. 조금만 더 기다려 줘';
describe('simpleWaitingText', () => {
  const times = [0, 5999, 6000, 15000, 25000];
  it.each([
    ['INITIAL', ['네 요약을 읽고 있어', '네 요약을 읽고 있어', '문단이랑 하나씩 맞춰 보고 있어', '어떤 내용을 잡았는지 정리하고 있어', long]],
    ['RETRY', ['네 요약을 읽고 있어', '네 요약을 읽고 있어', '문단이랑 하나씩 맞춰 보고 있어', '어떤 내용을 잡았는지 정리하고 있어', long]],
    ['AFTER_CORRECTION', ['네 답을 읽고 있어', '네 답을 읽고 있어', '아까 질문이랑 맞춰 보고 있어', '아까 질문이랑 맞춰 보고 있어', long]],
    ['AFTER_GAP', ['네 답을 읽고 있어', '네 답을 읽고 있어', '물어본 내용이 채워졌는지 보고 있어', '물어본 내용이 채워졌는지 보고 있어', long]],
  ] as const)('%s', (stage, texts) => { expect(times.map(t => simpleWaitingText(stage, t))).toEqual(texts); });
});
