import OpenAI from 'openai';
import type { FeedbackTransport } from '../problem-solving/feedback-evaluator.js';

/** 실제 모델 호출용 transport. 첫 호출 때에만 클라이언트를 만든다(만드는 것만으로는 키를 읽거나 전송하지 않는다). */
export function createOpenAiTransport(): FeedbackTransport {
  let client: OpenAI | undefined;
  return { create: (request, options) => (client ??= new OpenAI({ maxRetries: 0 })).responses.create(request, options) as ReturnType<FeedbackTransport['create']> };
}
