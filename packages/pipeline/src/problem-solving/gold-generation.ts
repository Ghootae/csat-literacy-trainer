import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const PROBLEM_GOLD_GENERATION_PROMPT_VERSION =
  'problem-gold-generation-prompt-v2' as const;

export function loadProblemGoldGenerationPrompt(): string {
  return readFileSync(resolve(
    process.cwd(),
    'packages/pipeline/experiments/problem-solving/problem-gold-generation-prompt-v2.md',
  ), 'utf8').trim();
}
