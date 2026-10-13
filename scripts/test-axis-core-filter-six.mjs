import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { OpenAIAxisCoreFilter, hashFilterValue } from '../packages/pipeline/dist/dialogue-experiment/axis-core-filter.js';
import { OpenAICentralStoryGateEvaluator } from '../packages/pipeline/dist/dialogue-experiment/gate.js';
import { OpenAISelectiveFeedbackEvaluator } from '../packages/pipeline/dist/dialogue-experiment/selective-feedback.js';
import { TwoStageDialogueEvaluator } from '../packages/pipeline/dist/dialogue-experiment/two-stage-evaluator.js';

const root = 'docs/experiments/axis-core-filter-six-2026-09-20';
const phase = process.argv.find(s => s.startsWith('--phase='))?.slice(8) ?? 'prepare';
if (!['prepare', 'filter', 'evaluate', 'report'].includes(phase)) throw new Error('Invalid phase');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const sha = value => createHash('sha256').update(value).digest('hex');
const write = (file, value) => writeFileSync(`${root}/${file}`, JSON.stringify(value, null, 2) + '\n');
const append = (file, value) => appendFileSync(`${root}/${file}`, JSON.stringify(value) + '\n');
const rows = file => existsSync(`${root}/${file}`) ? readFileSync(`${root}/${file}`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const goldRoot = 'packages/pipeline/fixtures/experiments/dialogue/gold-v2';
const promptRoot = 'packages/pipeline/experiments/dialogue';
const oldSuite = read('docs/experiments/dialogue-v4-sensitive-2026-09-19/cases.json');
const specs = [{ gold: 'gongsun-long-later-mohists-p1', title: '공손룡 1문단',
  sufficient: '명실 문제는 정치·윤리 차원에서 독립적인 철학 주제로 바뀌었고, 공손룡과 후기 묵가가 이를 전문적으로 다룬 대표 주체로 논쟁했다.',
  minor: '명실문제는 전국시대 이후에 철학적 주제 정립. 공손룡과 후기 묵가 사이의 논쟁.',
  topic: '명실 문제, 정치, 윤리, 철학, 공손룡, 후기 묵가.',
  error: '명실 문제는 정치·윤리에서 독립 철학 주제가 되었지만, 공손룡과 후기 묵가는 이 문제로 논쟁한 적이 없다.',
}, ...oldSuite.specs.filter(s => s.gold !== 'gongsun-long-later-mohists-p3')];
const cases = specs.flatMap(s => ['sufficient', 'minor', 'topic', 'error'].map(kind => ({
  id: `${s.gold}--${kind}`, paragraphId: s.gold, title: s.title, kind, initial: s[kind], history: [],
  source: s.gold === 'gongsun-long-later-mohists-p1' ? (kind === 'minor' ? 'actual-user-session:8e2ead22-27ef-44d5-af37-115b9083f238' : 'prewritten-synthetic') : 'docs/experiments/dialogue-v4-sensitive-2026-09-19/cases.json',
  expected: { sufficient: 'PASS', minor: 'REVIEW', topic: 'SERIOUS', error: 'ERROR' }[kind],
}))).concat([{ id: 'gongsun-p1-real-fixed-followup', paragraphId: 'gongsun-long-later-mohists-p1', title: '공손룡 1문단 실제 보완',
  kind: 'natural-followup', expected: 'PASS', initial: specs[0].minor,
  history: [{ question: { type: 'DIAGNOSTIC', text: '명실 문제는 철학적 주제로 정립되기 전에는 주로 어떤 차원에서 다루어졌고, 이후에는 어떻게 달라졌나요?' }, answer: '전국시대 이전엔 정치 윤리적 이슈' }],
  source: 'actual-user-session:8e2ead22-27ef-44d5-af37-115b9083f238; fixed cumulative evidence, no prior states',
}]);
const sources = Object.fromEntries(specs.map(s => { const path = `${goldRoot}/${s.gold}.json`; return [s.gold, { path, originalFileHash: sha(readFileSync(path)), gold: read(path) }]; }));
const protectedPaths = [...readdirSync(promptRoot).filter(f => f.endsWith('.md')).map(f => `${promptRoot}/${f}`),
  ...['gate.ts', 'schema.ts', 'claim-recording.ts', 'error-recording.ts', 'selective-feedback.ts', 'two-stage-evaluator.ts', 'axis-core-filter.ts'].map(f => `packages/pipeline/src/dialogue-experiment/${f}`),
  'scripts/test-axis-core-filter-six.mjs'];
const fingerprint = { casesHash: hashFilterValue(cases), goldHashes: Object.fromEntries(Object.entries(sources).map(([id, s]) => [id, s.originalFileHash])),
  protectedHashes: Object.fromEntries(protectedPaths.map(p => [p, sha(readFileSync(p))])) };
mkdirSync(root, { recursive: true });
if (!existsSync(`${root}/manifest.json`)) {
  if (phase !== 'prepare') throw new Error('Prepare first');
  write('manifest.json', { preparedAt: new Date().toISOString(), ...fingerprint, model: 'gpt-5.6-terra', effort: 'medium', serviceTier: 'default',
    repeats: 1, paragraphCount: 6, caseCount: cases.length, expectedGateCalls: cases.length * 2, expectedFilterCalls: 6,
    maxPhysicalCalls: 120, maxEstimatedUsd: 2, pricesPerMillion: { input: 2, cachedInput: 0.2, cacheWrite: 2.5, output: 12 },
    pricingSource: 'https://developers.openai.com/api/docs/pricing', pricingCheckedOn: '2026-09-20',
    sourceMode: 'reuse existing gold-v2 artifacts; do not regenerate first-stage gold',
    comparison: 'only centralAxes descriptions change; same V4 gate/questions/code/model/effort; no opt-in or adaptive followup calls',
    authorization: 'user requested implementation and six-paragraph comparison; agent-imposed USD2 local estimate cap',
  });
  write('sources.json', sources); write('cases.json', cases);
}
const manifest = read(`${root}/manifest.json`);
for (const [key, value] of Object.entries(fingerprint)) if (JSON.stringify(value) !== JSON.stringify(manifest[key])) throw new Error(`Frozen ${key} changed`);
if (phase === 'prepare') { console.log(JSON.stringify({ phase, paragraphs: specs.length, cases: cases.length, cap: manifest.maxEstimatedUsd })); process.exit(0); }

function summary() {
  const results = rows('results.jsonl'); const responses = rows('responses.jsonl');
  const cost = responses.reduce((s, r) => s + (r.estimatedCostUsd ?? 0), 0);
  const sides = Object.fromEntries(['original', 'filtered'].map(arm => {
    const rs = results.filter(r => r.arm === arm);
    const count = (kind, predicate) => rs.filter(r => r.kind === kind && predicate(r)).length;
    return [arm, { completed: rs.filter(r => r.result).length, failures: rs.filter(r => !r.result).length,
      sufficientPass: count('sufficient', r => r.result?.status === 'PASS'),
      minorPass: count('minor', r => r.result?.status === 'PASS'),
      minorAutomaticQuestions: count('minor', r => !!r.result?.nextQuestion),
      topicSerious: count('topic', r => r.result?.snapshot.axisFeedback.some(a => a.status === 'UNCLEAR_SERIOUS')),
      topicPass: count('topic', r => r.result?.status === 'PASS'),
      explicitErrorDetected: count('error', r => r.result?.status === 'ERROR'),
      naturalFollowupPass: count('natural-followup', r => r.result?.status === 'PASS'),
      automaticQuestions: rs.filter(r => r.result?.nextQuestion).length,
      retries: rs.reduce((s, r) => s + (r.call?.decisionAudit?.contractFailures?.length ?? 0), 0),
    }];
  }));
  const pairs = cases.map(c => ({ id: c.id, kind: c.kind, original: results.find(r => r.id === `${c.id}--original`), filtered: results.find(r => r.id === `${c.id}--filtered`) }));
  const compact = r => r?.result ? { status: r.result.status, axes: r.result.snapshot.axisFeedback.map(a => `${a.axisId}:${a.status}`), question: r.result.nextQuestion?.text ?? null } : { error: r?.error ?? 'not run' };
  const output = { updatedAt: new Date().toISOString(), arms: sides, calls: rows('requests.jsonl').length, estimatedCostUsd: cost,
    unknownCostCalls: responses.filter(r => r.estimatedCostUsd === null).length,
    pairs: pairs.map(p => ({ id: p.id, kind: p.kind, original: compact(p.original), filtered: compact(p.filtered) })) };
  write('summary.json', output);
  let doc = '# 원문·골드 필터·동일 응답 비교\n\n조건별 1회. 합성 답과 실제 발화를 구분한다. 후속 고정 입력은 새 질문의 학습 효과 검증이 아니다.\n\n';
  for (const s of specs) {
    const original = sources[s.gold].gold; const filtered = rows('filters.jsonl').find(r => r.paragraphId === s.gold);
    doc += `## ${s.title}\n\n### 원문\n\n> ${original.paragraphText}\n\n### 중심축 비교\n\n`;
    for (const axis of original.centralAxes) {
      const f = filtered?.result?.axes.find(a => a.axisId === axis.id);
      doc += `- ${axis.id} 원본: ${axis.description}\n- 정제: ${f?.filteredDescription ?? '실패'}\n- 이유: ${f?.rationale ?? filtered?.error}\n- 제외: ${f?.excluded.map(e => `${e.originalQuote} (${e.reason})`).join('; ') || '없음'}\n\n`;
    }
    for (const c of cases.filter(c => c.paragraphId === s.gold)) {
      doc += `### ${c.kind}: ${c.id}\n\n출처: ${c.source}\n\n학생 응답:\n\n> ${c.initial}\n\n`;
      for (const h of c.history) doc += `고정 질문: ${h.question.text}\n\n고정 학생 보완: ${h.answer}\n\n`;
      for (const arm of ['original', 'filtered']) {
        const r = results.find(r => r.id === `${c.id}--${arm}`);
        doc += `#### ${arm}\n\n`;
        if (!r?.result) { doc += `${r?.error ?? '미실행'}\n\n`; continue; }
        doc += `- 판정: ${r.result.status}\n- 요약: ${r.result.decisionSummary}\n- 누적 응답: ${r.result.snapshot.effectiveResponse}\n- 피드백: ${r.result.studentFeedback}\n- 질문: ${r.result.nextQuestion?.text ?? '없음'}\n\n`;
        for (const a of r.result.snapshot.axisFeedback) doc += `- ${a.axisId} ${a.status}: ${a.reason}\n`;
        doc += '\n';
      }
    }
  }
  writeFileSync(`${root}/REVIEW-PACKET.md`, doc);
  console.log(JSON.stringify(output, null, 2));
}
if (phase === 'report') { summary(); process.exit(0); }
if (!process.argv.includes('--approved-live')) throw new Error('Live execution requires --approved-live');
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY unavailable');
const lockPath = `${root}/live.lock`;
const lock = openSync(lockPath, 'wx'); closeSync(lock);
const api = new OpenAI({ maxRetries: 0 });
const requests = rows('requests.jsonl'); const responses = rows('responses.jsonl');
let calls = requests.length;
let accounted = requests.reduce((s, r) => s + (responses.find(x => x.index === r.index)?.estimatedCostUsd ?? r.reserveUsd), 0);
function client(tag) {
  return { responses: { parse: async (request, options) => {
    const bytes = Buffer.byteLength(JSON.stringify(request));
    if (request.model !== manifest.model || bytes > 100_000 || request.max_output_tokens > 4000) throw new Error('Request limit violation');
    const reserveUsd = ((bytes + 4000) * 2.5 + request.max_output_tokens * 12) / 1e6;
    if (calls >= manifest.maxPhysicalCalls || accounted + reserveUsd > manifest.maxEstimatedUsd) throw new Error('LOCAL_BUDGET_STOP');
    const index = ++calls; accounted += reserveUsd; const startedAt = new Date().toISOString();
    append('requests.jsonl', { index, tag, startedAt, reserveUsd, request: { ...request, service_tier: 'default' } });
    try {
      const response = await api.responses.parse({ ...request, service_tier: 'default' }, options);
      const u = response.usage, cached = u?.input_tokens_details?.cached_tokens ?? 0, writes = u?.input_tokens_details?.cache_write_tokens ?? 0;
      const estimatedCostUsd = u ? (Math.max(0, u.input_tokens - cached - writes) * 2 + cached * 0.2 + writes * 2.5 + u.output_tokens * 12) / 1e6 : null;
      if (estimatedCostUsd !== null) accounted += estimatedCostUsd - reserveUsd;
      append('responses.jsonl', { index, tag, startedAt, completedAt: new Date().toISOString(), estimatedCostUsd, response });
      return response;
    } catch (e) { append('responses.jsonl', { index, tag, error: String(e), estimatedCostUsd: null, retainedReserveUsd: reserveUsd }); throw e; }
  } } };
}
async function pool(items, work) { let cursor = 0; await Promise.all([0, 1].map(async () => { while (cursor < items.length) await work(items[cursor++]); })); }
try {
  if (phase === 'filter') {
    const prior = rows('filters.jsonl');
    await pool(specs.filter(s => !prior.some(p => p.paragraphId === s.gold)), async s => {
      try {
        const out = await new OpenAIAxisCoreFilter({ client: client({ phase, paragraphId: s.gold }), model: manifest.model, effort: manifest.effort }).filter(sources[s.gold].gold);
        append('filters.jsonl', { paragraphId: s.gold, ...out });
        console.log(JSON.stringify({ filtered: s.gold, axes: out.result.axes.map(a => ({ id: a.axisId, description: a.filteredDescription })), calls, accounted }));
      } catch (e) { append('filters.jsonl', { paragraphId: s.gold, error: String(e) }); throw e; }
    });
  } else {
    const filters = rows('filters.jsonl');
    if (specs.some(s => !filters.find(f => f.paragraphId === s.gold)?.filteredGold)) throw new Error('All six frozen filters must be valid before evaluation');
    const filterHash = sha(readFileSync(`${root}/filters.jsonl`));
    if (!existsSync(`${root}/evaluation-freeze.json`)) write('evaluation-freeze.json', { filterHash, frozenAt: new Date().toISOString() });
    if (read(`${root}/evaluation-freeze.json`).filterHash !== filterHash) throw new Error('Frozen filters changed');
    const prior = rows('results.jsonl');
    const jobs = cases.flatMap((c, i) => (i % 2 ? ['filtered', 'original'] : ['original', 'filtered']).map(arm => ({ c, arm, id: `${c.id}--${arm}` }))).filter(j => !prior.some(r => r.id === j.id));
    await pool(jobs, async ({ c, arm, id }) => {
      const gold = arm === 'original' ? sources[c.paragraphId].gold : filters.find(f => f.paragraphId === c.paragraphId).filteredGold;
      const transport = client({ phase, id, arm });
      const evaluator = new TwoStageDialogueEvaluator({
        gateEvaluator: new OpenAICentralStoryGateEvaluator({ client: transport, promptRevision: 'v4', model: manifest.model, effort: manifest.effort, maxTransportRetries: 0, maxContractRetries: 1 }),
        feedbackEvaluator: new OpenAISelectiveFeedbackEvaluator({ client: transport, promptRevision: 'v4', model: manifest.model, effort: manifest.effort, maxTransportRetries: 0 }),
      });
      const input = { gold, goldVersion: arm === 'original' ? 'paragraph-diagnostic-gold-v2-reviewed-candidate' : 'axis-core-filter-v1-candidate', goldHash: hashFilterValue(gold),
        initialResponse: c.initial, history: c.history, turn: c.history.length + 1, questionsAsked: c.history.length, maxQuestions: 3 };
      try {
        const out = await evaluator.evaluate(input);
        append('results.jsonl', { ...c, id, caseId: c.id, arm, input, ...out });
        console.log(JSON.stringify({ id, status: out.result.status, axes: out.result.snapshot.axisFeedback.map(a => a.status), question: out.result.nextQuestion?.text ?? null, calls, accounted }));
      } catch (e) { append('results.jsonl', { ...c, id, caseId: c.id, arm, input, error: String(e) }); console.log(JSON.stringify({ id, error: String(e) })); }
    });
  }
} finally { unlinkSync(lockPath); summary(); }
