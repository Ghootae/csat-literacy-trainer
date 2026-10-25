import { resolve } from 'node:path';
import { readExaminerStrategyFile } from './session.js';
import type { ExaminerStrategyView, FeedbackWorkbenchView } from '../shared/problem-feedback.js';

export type ExaminerStrategyMap = Map<string, { position: number; paragraphs: string[] }[]>;
const DEFAULT_PATH = 'docs/experiments/examiner-strategy-2026-10-23/FINAL.json';

export const splitParagraphs = (text: string): string[] => text.split(/\n{2,}/u).map(p => p.trim()).filter(Boolean);

/** 파일이 없거나 형식이 틀리면 빈 맵(기능 끔)을 돌려주고 경고를 한 번만 남긴다. */
export function loadExaminerStrategies(path = process.env['EXAMINER_STRATEGY_PATH'] ?? resolve(process.cwd(), DEFAULT_PATH)): ExaminerStrategyMap {
  const map: ExaminerStrategyMap = new Map();
  try {
    const parsed = JSON.parse(readExaminerStrategyFile(path)) as { items?: unknown };
    if (!Array.isArray(parsed.items)) throw new Error('items 배열이 없습니다.');
    for (const item of parsed.items as Record<string, unknown>[]) {
      const { passageId, question, choice, text } = item;
      if (typeof passageId !== 'string' || !Number.isInteger(question) || !Number.isInteger(choice) || typeof text !== 'string') throw new Error('항목 형식이 틀립니다.');
      const paragraphs = splitParagraphs(text);
      if (!paragraphs.length) continue;
      const id = `${passageId}-q${question as number}`;
      map.set(id, [...(map.get(id) ?? []), { position: choice as number, paragraphs }].sort((a, b) => a.position - b.position));
    }
  } catch (reason) {
    console.warn(`출제자 전략 기능을 끕니다(${path}): ${reason instanceof Error ? reason.message : String(reason)}`);
    map.clear();
  }
  return map;
}

/** 발문 극성: '적절하지 않은 것'처럼 틀린 것을 고르면 SELECT_INCORRECT(run-choice-link.mjs의 stemPolarity와 같은 규칙). */
export const stemPolarity = (stem: string): 'SELECT_INCORRECT' | 'SELECT_CORRECT' => /않은 것|않는 것/u.test(stem) ? 'SELECT_INCORRECT' : 'SELECT_CORRECT';

export function strategyFor(view: FeedbackWorkbenchView, strategies: ExaminerStrategyMap): ExaminerStrategyView {
  const choices = view.phase === 'COMPLETED' ? strategies.get(view.question.questionId) : undefined;
  if (!choices?.length) return { available: false };
  const selectedId = view.result?.selectedChoiceId ?? view.selectedChoiceId;
  const selected = view.question.choices.find(c => c.choiceId === selectedId)?.position;
  const firstPosition = choices.find(c => c.position === selected)?.position ?? choices[0]!.position;
  return { available: true, stemPolarity: stemPolarity(view.question.stem ?? ''), firstPosition, choices: choices.map(c => ({ position: c.position, paragraphs: [...c.paragraphs] })) };
}
