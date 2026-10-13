import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';
import { buildSelectiveFeedbackPayload, SelectiveFeedbackGuidedOutputSchema, selectDialogueFeedbackRoute, validateSelectiveFeedbackOutput } from '../packages/pipeline/dist/dialogue-experiment/selective-feedback.js';

const root = 'docs/experiments/question-actionability-corporate-p2-2026-09-29';
const phase = process.argv[2] ?? 'prepare';
const read = name => JSON.parse(readFileSync(`${root}/${name}`, 'utf8'));
const write = (name, value) => writeFileSync(`${root}/${name}`, JSON.stringify(value, null, 2) + '\n');
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const reviewSchema = z.object({ unresolvedGap: z.string().nullable(), minimalSufficientAnswer: z.string().nullable(), diagnosticValue: z.string().min(1), decision: z.enum(['ASK', 'NO_ACTIONABLE_GAP']) });
const candidateSchema = SelectiveFeedbackGuidedOutputSchema.extend({ questionReview: reviewSchema });
const noAskFeedback = '추가 확인 질문 없이 다음 문단으로 진행할 수 있어요.';
mkdirSync(root, { recursive: true });

if (phase === 'prepare') {
  assert.ok(!existsSync(`${root}/requests.json`), 'Frozen requests already exist');
  const response = await fetch('http://127.0.0.1:5174/api/developer/inspect?sessionId=126037eb-1619-49b9-a490-ba5bc6795e0f');
  assert.ok(response.ok);
  const snapshot = await response.json();
  assert.equal(snapshot.gold.paragraphId, 'corporate-law-p2');
  assert.equal(snapshot.turns[1].answer, '재산');
  write('source-snapshot.json', snapshot);
  const baseline = readFileSync('packages/pipeline/experiments/dialogue/selective-feedback-prompt-v4.md', 'utf8') + '\n\n' + readFileSync('packages/pipeline/experiments/dialogue/source-guide-v1.md', 'utf8');
  const candidate = baseline + '\n\n' + readFileSync(`${root}/actionability-instructions.md`, 'utf8');
  writeFileSync(`${root}/baseline-instructions.md`, baseline);
  writeFileSync(`${root}/candidate-instructions.md`, candidate);
  const cases = [0, 1].map(index => {
    const turn = snapshot.turns[index];
    const gate = turn.call.decisionAudit.validatedResult;
    const visibleTurns = snapshot.turns.slice(0, index + 1);
    const dialogue = {
      gold: snapshot.gold, goldVersion: snapshot.goldRef.version, goldHash: snapshot.goldRef.hash,
      initialResponse: snapshot.turns[0].answer,
      history: snapshot.turns.slice(0, index).map((t, i) => ({ question: t.evaluation.nextQuestion, answer: snapshot.turns[i + 1].answer })),
      turn: index + 1, questionsAsked: index, maxQuestions: 3,
      revealedAxisContent: visibleTurns.flatMap((t, i) => (t.evaluationBeforeQuestion ?? t.evaluation).snapshot.axisFeedback.flatMap(a => a.revealedText === null ? [] : [{ axisId: a.axisId, text: a.revealedText, turn: i + 1 }])),
      shownSourceGuides: visibleTurns.flatMap((t, i) => (t.evaluationBeforeQuestion ?? t.evaluation).sourceGuide ? [{ axisId: t.evaluation.sourceGuide.axisId, quote: t.evaluation.sourceGuide.quote, turn: i + 1 }] : []),
    };
    const input = { dialogue, gateDecision: gate, route: selectDialogueFeedbackRoute(gate), selectedDetailedRelation: null };
    assert.equal(input.route, 'TARGETED_GAP');
    assert.equal(gate.targetAxisId, index === 0 ? 'AX1' : 'AX3');
    assert.ok(turn.questionCall);
    return { id: `G${index + 1}`, input, payload: buildSelectiveFeedbackPayload(input), historicalQuestion: turn.evaluation.nextQuestion, model: turn.questionCall.model, effort: turn.questionCall.effort };
  });
  write('cases.json', cases);
  const jobs = [];
  for (let repeat = 1; repeat <= 3; repeat++) for (const c of cases) for (const arm of (repeat % 2 ? ['baseline', 'candidate'] : ['candidate', 'baseline'])) {
    const request = { model: c.model, instructions: arm === 'baseline' ? baseline : candidate, input: c.payload, reasoning: { effort: c.effort }, max_output_tokens: 3000, store: false, text: { format: zodTextFormat(arm === 'baseline' ? SelectiveFeedbackGuidedOutputSchema : candidateSchema, 'selective_dialogue_feedback') } };
    jobs.push({ id: `${c.id}-${arm}-${repeat}`, caseId: c.id, arm, repeat, request, requestHash: hash(request) });
  }
  write('requests.json', jobs);
  write('manifest.json', { preparedAt: new Date().toISOString(), totalCalls: jobs.length, sourceSessionId: '126037eb-1619-49b9-a490-ba5bc6795e0f', casesHash: hash(cases), requestsHash: hash(jobs), baselineHash: hash(baseline), candidateHash: hash(candidate), models: cases.map(c => ({ id: c.id, model: c.model, effort: c.effort })), concurrency: 2, maxRetries: 0 });
  console.log(JSON.stringify({ prepared: true, calls: jobs.length, models: read('manifest.json').models }));
} else if (phase === 'audit') {
  const jobs = read('requests.json'); const cases = read('cases.json'); const manifest = read('manifest.json');
  assert.equal(hash(jobs), manifest.requestsHash); assert.equal(hash(cases), manifest.casesHash);
  assert.equal(hash(readFileSync(`${root}/baseline-instructions.md`, 'utf8')), manifest.baselineHash);
  assert.equal(hash(readFileSync(`${root}/candidate-instructions.md`, 'utf8')), manifest.candidateHash);
  assert.equal(jobs.length, 12); assert.equal(new Set(jobs.map(j => j.id)).size, 12);
  for (const c of cases) {
    const payload = JSON.parse(c.payload);
    assert.deepEqual(payload.evidence.followUpExchanges.map(e => e.answer), c.id === 'G1' ? [] : ['재산']);
    assert.ok(!payload.evidence.initialResponse.includes('일정 범위'));
    assert.equal(payload.decision.targetFeedbackStatus, 'UNCLEAR_OK');
    assert.equal(jobs.filter(j => j.caseId === c.id).length, 6);
    for (const job of jobs.filter(j => j.caseId === c.id)) {
      assert.equal(job.request.input, c.payload); assert.equal(job.requestHash, hash(job.request));
      assert.equal(job.request.model, c.model); assert.equal(job.request.reasoning.effort, c.effort);
      assert.equal(job.request.store, false);
    }
  }
  const audit = { auditedAt: new Date().toISOString(), frozenRequestsValid: true, historicalInputsOnly: true, callsPrepared: 12, resultFileExists: existsSync(`${root}/results.jsonl`) };
  write('offline-audit.json', audit); console.log(JSON.stringify(audit));
} else if (phase === 'run') {
  const jobs = read('requests.json'); const cases = read('cases.json'); const manifest = read('manifest.json');
  assert.equal(hash(jobs), manifest.requestsHash); assert.equal(hash(cases), manifest.casesHash);
  assert.equal(jobs.length, 12); assert.ok(!existsSync(`${root}/started.json`), 'Run already started; no automatic paid reruns');
  write('started.json', { startedAt: new Date().toISOString() });
  const client = new OpenAI({ maxRetries: 0, timeout: 90000 });
  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++]; const start = performance.now(); const calledAt = new Date().toISOString();
      let response = null, raw = null, contractError = null, apiError = null;
      try {
        response = await client.responses.create(job.request);
        try {
          assert.equal(response.status, 'completed');
          raw = JSON.parse(response.output_text);
          const c = cases.find(c => c.id === job.caseId);
          if (job.arm === 'baseline') validateSelectiveFeedbackOutput(SelectiveFeedbackGuidedOutputSchema.parse(raw), c.input);
          else {
            candidateSchema.parse(raw);
            if (raw.questionReview.decision === 'ASK') {
              assert.ok(raw.questionReview.unresolvedGap?.trim()); assert.ok(raw.questionReview.minimalSufficientAnswer?.trim());
              validateSelectiveFeedbackOutput(raw, c.input);
            } else {
              assert.equal(raw.nextQuestion, null); assert.equal(raw.sourceQuote, null); assert.equal(raw.studentFeedback, noAskFeedback);
              assert.equal(raw.route, c.input.route); assert.equal(raw.targetAxisId, c.input.gateDecision.targetAxisId); assert.equal(raw.selectedRelationId, null);
            }
          }
        } catch (error) { contractError = error.message; }
      } catch (error) { apiError = { name: error.name, status: error.status ?? null, message: error.message }; }
      const result = { id: job.id, caseId: job.caseId, arm: job.arm, repeat: job.repeat, calledAt, durationMs: Math.round(performance.now() - start), requestHash: job.requestHash, raw, contractError, apiError, response };
      appendFileSync(`${root}/results.jsonl`, JSON.stringify(result) + '\n');
      console.log(JSON.stringify({ id: job.id, decision: raw?.questionReview?.decision ?? (raw?.nextQuestion ? 'ASK' : null), durationMs: result.durationMs, contractError, apiError }));
    }
  }
  await Promise.all([worker(), worker()]);
} else if (phase === 'summarize') {
  const rows = readFileSync(`${root}/results.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  const median = a => { a.sort((x,y) => x-y); return a.length % 2 ? a[(a.length-1)/2] : (a[a.length/2-1]+a[a.length/2])/2; };
  const summary = { calls: rows.length, valid: rows.filter(r => !r.apiError && !r.contractError).length, inputTokens: rows.reduce((s,r) => s+(r.response?.usage?.input_tokens??0),0), outputTokens: rows.reduce((s,r) => s+(r.response?.usage?.output_tokens??0),0), groups: ['G1','G2'].flatMap(caseId => ['baseline','candidate'].map(arm => { const group=rows.filter(r => r.caseId===caseId && r.arm===arm); return { caseId, arm, decisions: group.map(r => r.raw?.questionReview?.decision ?? (r.raw?.nextQuestion ? 'ASK' : null)), medianMs: median(group.map(r=>r.durationMs)), outputs: group.map(r => ({ id:r.id, question:r.raw?.nextQuestion?.text??null, review:r.raw?.questionReview??null, contractError:r.contractError, apiError:r.apiError })) }; })) };
  write('summary.json', summary); console.log(JSON.stringify(summary,null,2));
} else throw new Error('Unknown phase');
