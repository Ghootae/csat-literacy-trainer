import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as script from '../../../../scripts/run-analysis-judge-gongsun.mjs';
import {
  ANALYSIS_JUDGE_JSON_SCHEMA, buildJudgeInput, buildJudgeRequest, checkQuotes, combineRound, judgeUnit, loadJudgePrompts, loadStanceLabels,
  deriveNodeStances, parseJudgePrompt, unitsForParagraph, type AnalysisMap,
} from './judge.js';

const map = JSON.parse(readFileSync(script.MAP_PATH, 'utf8')) as AnalysisMap;
const rounds = readFileSync(script.FIXED_ROUNDS_PATH, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const md = readFileSync(script.JUDGE_PROMPT_V3_PATH, 'utf8');
const prompts = loadJudgePrompts(); const stances = loadStanceLabels(script.STANCE_PATH, map);
// 노드·관계가 모두 있는 문단의 라운드를 문단별로 하나씩 고른다.
const picked = [...new Map(rounds.map(r => [r.paragraphId, r])).values()].slice(0, 3);

describe('문단 판정 v3 모듈', () => {
  it('지시문·스키마가 스크립트와 같다', () => {
    expect(prompts.node).toBe(script.parseJudgePrompt(md).node); expect(prompts.relation).toBe(script.parseJudgePrompt(md).relation);
    expect(parseJudgePrompt(md)).toEqual(script.parseJudgePrompt(md));
    expect(ANALYSIS_JUDGE_JSON_SCHEMA).toEqual(script.JSON_SCHEMA);
    expect([...stances.entries()]).toEqual([...script.loadStanceLabels().entries()]);
  });
  it('확정본에 nodeStances가 없으면 확정 명제 입장에서 합성 노드 입장을 다시 만들고, 있는 지도에서는 내장값과 같다', () => {
    const HORSE = 'docs/experiments/analysis-gold-calibration-2026-10-20/horse-race-reporting';
    const horseMap = JSON.parse(readFileSync(`${HORSE}/frozen-map.json`, 'utf8')) as AnalysisMap;
    const embedded = JSON.parse(readFileSync(`${HORSE}/stance/stance-final.json`, 'utf8'));
    expect(deriveNodeStances(horseMap, embedded.stances)).toEqual(embedded.nodeStances);
    expect(deriveNodeStances(map, JSON.parse(readFileSync(script.STANCE_PATH, 'utf8')).stances)).toEqual(JSON.parse(readFileSync(script.STANCE_PATH, 'utf8')).nodeStances);
    const GOLD = 'docs/experiments/sns-diagnostic-gold-2026-11-05/consciousness-cognition-ga';
    const gaMap = JSON.parse(readFileSync(`${GOLD}/frozen-map.json`, 'utf8')) as AnalysisMap;
    expect(() => loadStanceLabels(`${GOLD}/stance/stance-final.json`)).toThrow('STANCE_NODE_STANCES');
    const labels = loadStanceLabels(`${GOLD}/stance/stance-final.json`, gaMap);
    for (const unit of [...unitsForParagraph(gaMap, 'consciousness-cognition-ga-p4').nodes]) expect(labels.has(unit.id)).toBe(true);
  });
  it('단위와 요청 본문이 스크립트와 깊은 비교로 같다(노드·관계 모두, 라운드 2개 이상)', () => {
    expect(picked.length).toBeGreaterThanOrEqual(2);
    let nodeChecks = 0; let relationChecks = 0;
    for (const round of picked) {
      const mine = unitsForParagraph(map, round.paragraphId); const theirs = script.unitsForParagraph(map, round.paragraphId);
      expect(mine).toEqual(theirs);
      for (const unit of mine.nodes) {
        expect(buildJudgeRequest(prompts.node, buildJudgeInput(round, 'node', unit, stances))).toEqual(script.buildJudgeRequest(prompts.node, script.buildJudgeInput(round, 'node', unit, stances), 'analysis_judgment_v3')); nodeChecks++;
      }
      for (const unit of mine.relations) {
        expect(buildJudgeRequest(prompts.relation, buildJudgeInput(round, 'relation', unit, stances))).toEqual(script.buildJudgeRequest(prompts.relation, script.buildJudgeInput(round, 'relation', unit, stances), 'analysis_judgment_v3')); relationChecks++;
      }
    }
    expect(nodeChecks).toBeGreaterThan(0); expect(relationChecks).toBeGreaterThan(0);
  });
  it('인용 확인과 묶기가 스크립트와 같다', () => {
    for (const round of picked) {
      const student = round.dialogue.find((t: { role: string }) => t.role === 'student').text as string;
      for (const judgment of [{ label: 'DIRECT', quotes: [student.slice(0, 5)], reason: 'r' }, { label: 'DIRECT', quotes: ['없는 인용'], reason: 'r' }, { label: 'CONTRADICTS', quotes: [], reason: 'r' }] as const) {
        expect(checkQuotes(round, judgment)).toEqual(script.checkQuotes(round, judgment));
      }
      const { nodes, relations } = unitsForParagraph(map, round.paragraphId);
      const judgments = Object.fromEntries([...nodes, ...relations].map((u, i) => [u.id, { finalLabel: ['DIRECT', 'PARTIAL', 'ABSENT', 'CONTRADICTS', null][i % 5] ?? null }]));
      expect(combineRound(map, round.paragraphId, judgments)).toEqual(script.combineRound(map, round.paragraphId, judgments));
    }
  });
  it('가짜 transport로 단위를 판정한다', async () => {
    const round = picked[0]!; const unit = unitsForParagraph(map, round.paragraphId).nodes[0]!;
    const student = round.dialogue.find((t: { role: string }) => t.role === 'student').text as string;
    const transport = { async create() { return { status: 'completed', output_text: JSON.stringify({ label: 'DIRECT', quotes: [student.slice(0, 4)], reason: '근거' }), usage: { input_tokens: 5, output_tokens: 6 } }; } };
    const result = await judgeUnit(transport as never, prompts, round, 'node', unit, stances);
    expect(result.checked.finalLabel).toBe('DIRECT'); expect(result.metadata.inputTokens).toBe(5);
  });
});
