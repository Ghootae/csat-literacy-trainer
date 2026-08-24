import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  DIALOGUE_GOLD_VERSION,
  ParagraphDiagnosticGoldSchema,
  type ParagraphDiagnosticGold,
} from './schema.js';

export const DEFAULT_DIALOGUE_PARAGRAPH_ID = 'hegel-aesthetics-absolute-spirit-p1';
export const DOPAMINE_PASSAGE_ID = 'dopamine-motor-control';
export const DOPAMINE_PARAGRAPH_IDS = [
  'dopamine-motor-control-p1',
  'dopamine-motor-control-p2',
  'dopamine-motor-control-p3',
  'dopamine-motor-control-p4',
] as const;
export const AVAILABLE_DIALOGUE_PARAGRAPH_IDS = [
  DEFAULT_DIALOGUE_PARAGRAPH_ID,
  ...DOPAMINE_PARAGRAPH_IDS,
] as const;
export const AVAILABLE_DIALOGUE_PASSAGE_IDS = [DOPAMINE_PASSAGE_ID] as const;

export function paragraphIdsForPassage(passageId: string): readonly string[] {
  if (passageId === DOPAMINE_PASSAGE_ID) return DOPAMINE_PARAGRAPH_IDS;
  throw new Error(
    `지원하지 않는 실험 지문입니다: ${passageId}. 사용 가능: ${AVAILABLE_DIALOGUE_PASSAGE_IDS.join(', ')}`,
  );
}

export interface LoadedDiagnosticGold {
  readonly gold: ParagraphDiagnosticGold;
  readonly version: string;
  readonly hash: string;
  readonly path: string;
}

function goldPath(paragraphId: string): string {
  if (!(AVAILABLE_DIALOGUE_PARAGRAPH_IDS as readonly string[]).includes(paragraphId)) {
    throw new Error(
      `지원하지 않는 실험 문단입니다: ${paragraphId}. 사용 가능: ${AVAILABLE_DIALOGUE_PARAGRAPH_IDS.join(', ')}`,
    );
  }
  return resolve(
    process.cwd(),
    'packages/pipeline/fixtures/experiments/dialogue/gold',
    `${paragraphId}.json`,
  );
}

export function loadDiagnosticGold(
  paragraphId: string = DEFAULT_DIALOGUE_PARAGRAPH_ID,
): LoadedDiagnosticGold {
  const path = goldPath(paragraphId);
  const source = readFileSync(path, 'utf8');
  const gold = ParagraphDiagnosticGoldSchema.parse(JSON.parse(source));
  if (gold.paragraphId !== paragraphId) {
    throw new Error(`진단 골드 paragraphId 불일치: ${gold.paragraphId} !== ${paragraphId}`);
  }
  return {
    gold,
    version: DIALOGUE_GOLD_VERSION,
    hash: `sha256:${createHash('sha256').update(source, 'utf8').digest('hex')}`,
    path,
  };
}
