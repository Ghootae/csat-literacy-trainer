// 시뮬레이션 사례를 UI 없이 실제 모델로 실행한다. 서버와 같은 판정 경로(evaluateSimple: 검증 실패 시 1회 재요청)와 상태 전이(applySimpleAction)를 쓴다.
// node --env-file=.env docs/experiments/simple-holistic-path-simulation-2026-10-17/run.mjs [runs=3] [model=gpt-6-luna] [usdCap=1] [label] [previousResults]
// previousResults를 주면 그 실행에서 3회 모두 구조 일치한 사례는 1회만(회귀 확인), 나머지는 runs회 돌린다.
// 저장소 루트에서 실행한다(프롬프트 경로가 cwd 기준). 출력: runs/<날짜>/calls.jsonl, results.json, REVIEW.md
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpenAISimpleEvaluator, PARAGRAPH_SIMPLE_PROMPT_VERSION as PV, SimpleEvaluationError, applySimpleAction, evaluateSimple, initialSimpleState } from '../../../packages/pipeline/dist/index.js';
const PARAGRAPH_SIMPLE_PROMPT_VERSION = PV;
import { loadDialoguePassages } from '../../../packages/app/dist/server/content.js';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const runs = Number(argv[0] ?? 3), model = argv[1] ?? 'gpt-6-luna', usdCap = Number(argv[2] ?? 1), label = argv[3], previous = argv[4];
const PRICE = { input: 0.10, output: 0.50 }; // 백만 토큰당 USD(저장소 기존 스크립트 단가, 캐시 입력도 정가로 보수 계산)
// CASE_FILTER=gongsun,dopamine 처럼 문단 키로 사례를 고른다(없으면 전체).
const { meta, cases: allCases } = JSON.parse(readFileSync(join(here, 'cases.json'), 'utf8'));
const filter = process.env.CASE_FILTER?.split(',').map(x => x.trim()).filter(Boolean);
const cases = filter ? allCases.filter(c => filter.includes(c.paragraphKey)) : allCases;
const passages = loadDialoguePassages();
const outDir = join(here, 'runs', label ?? `${new Date().toISOString().slice(0, 10)}-${PARAGRAPH_SIMPLE_PROMPT_VERSION.replace('paragraph-simple-holistic-', '')}`);
mkdirSync(outDir, { recursive: true });
const callsPath = join(outDir, 'calls.jsonl');
const evaluator = new OpenAISimpleEvaluator({ model, timeoutMs: 120_000 });
let usd = 0, calls = 0, stopped = false;

// 키 끝의 _alt는 같은 부분의 다른 근거 문장(예: 표면 장력 B의 결과 문장)이다.
const sentenceKey = (p, quote) => (Object.entries(meta.paragraphs[p].sentences).find(([, s]) => s === quote)?.[0] ?? '기타').replace(/_alt\d*$/, '');
// 서버와 같게: 모델 입력 대화의 튜터 발화는 message(+번호 질문). 마무리 뒤에는 더 판정하지 않으므로 질문형 행동만 이어 붙인다.
const tutorText = o => o.action === 'GAP_QUESTION' ? `${o.message}\n${o.gaps.map((g, i) => `${i + 1}. ${g.question}`).join('\n')}` : o.message;
const bubblesOf = (o, stage) => {
  const after = stage === 'AFTER_CORRECTION' || stage === 'AFTER_GAP';
  if (o.action === 'GAP_QUESTION') return [`생각해 보기(번호 질문 ${o.gaps.length})`];
  if (o.action === 'PRAISE') return after ? ['문단 핵심', '피드백'] : ['피드백'];
  if (o.action === 'CLOSE_GAP') return ['문단 핵심', '빠진 내용'];
  if (o.action === 'CLOSE_NO_RESPONSE') return ['문단 핵심(도입+상자)'];
  if (o.action === 'CLOSE_ERRORS') return ['바로잡기(도입)', ...o.errors.map(() => '바로잡기'), ...(o.missingNote ? ['빠진 내용'] : []), '문단 핵심'];
  return [{ RETRY_PROMPT: '다시 써 보기', CORRECTION_QUESTION: '확인하기' }[o.action]];
};

async function runCase(c, run) {
  const passage = passages.find(p => p.passageId === c.passageId);
  const paragraph = passage.paragraphs.find(p => p.paragraphId === c.paragraphId);
  let state = initialSimpleState();
  const dialogue = [], steps = [];
  for (const [i, s] of c.steps.entries()) {
    if (stopped) return { caseId: c.caseId, run, steps, status: 'COST_CAP' };
    dialogue.push({ role: 'student', text: s.student });
    const input = {
      passage: { title: passage.title, paragraphs: passage.paragraphs.map(({ paragraphId, text }) => ({ paragraphId, text })) },
      targetParagraph: { paragraphId: paragraph.paragraphId, text: paragraph.text },
      stage: state.stage, dialogue: structuredClone(dialogue), targetError: state.targetError,
      targetGaps: state.stage === 'AFTER_GAP' ? state.targetGaps : null,
      ...('coreParts' in state ? { coreParts: state.stage === 'INITIAL' ? null : state.coreParts } : {}),
    };
    let result;
    try { result = await evaluateSimple(evaluator, input); }
    catch (error) {
      const failures = error instanceof SimpleEvaluationError ? error.validationFailures : [];
      appendFileSync(callsPath, JSON.stringify({ caseId: c.caseId, run, step: i, input, error: String(error), failures }) + '\n');
      steps.push({ step: i, stage: input.stage, error: String(error) });
      return { caseId: c.caseId, run, steps, status: 'EVALUATION_FAILED' };
    }
    calls += result.call.attempts;
    usd += (result.call.inputTokens * PRICE.input + result.call.outputTokens * PRICE.output) / 1e6;
    if (usd > usdCap) stopped = true;
    const o = result.output;
    // 서버와 같게: 원문 옮겨 적기로 판정된 발화는 이후 판정 입력에서 copied로 표시(v4.3).
    if (o.category === 'COPY') dialogue.at(-1).copied = true;
    const next = applySimpleAction(state, o);
    appendFileSync(callsPath, JSON.stringify({ caseId: c.caseId, run, step: i, input, output: o, call: result.call, validationFailures: result.validationFailures }) + '\n');
    const e = s.expect;
    const actual = {
      category: o.category, action: o.action, targetErrorResolved: o.targetErrorResolved,
      gaps: o.gaps.map(g => ({ question: g.question, sentence: sentenceKey(c.paragraphKey, g.sourceQuote) })),
      targetGapReadings: o.targetGapReadings, targetGapsFilled: o.targetGapsFilled,
      errors: o.errors.map(x => ({ studentQuote: x.studentQuote, gapIndex: x.gapIndex, sentence: sentenceKey(c.paragraphKey, x.sourceQuote), feedback: x.feedback })),
      coreParts: o.coreParts?.map(x => ({ description: x.description, sentence: sentenceKey(c.paragraphKey, x.sourceQuote) })), corePartsCovered: o.corePartsCovered,
      missingNote: o.missingNote, bubbles: bubblesOf(o, input.stage), highlights: next.revealQuotes.map(q => sentenceKey(c.paragraphKey, q)),
      message: o.message, coreIntro: o.coreIntro, coreSummary: o.coreSummary, restatedSummary: o.restatedSummary, reason: o.reason, retries: result.call.attempts - 1,
    };
    // 자동 대조(구조). 내용 방향은 REVIEW.md에서 사람이 본다.
    const check = {
      action: o.action === e.action,
      category: o.category === e.category,
      targetErrorResolved: e.targetErrorResolved === undefined || o.targetErrorResolved === e.targetErrorResolved,
      gapsCount: !e.gaps || o.gaps.length === e.gaps.length,
      targetGapsFilled: !e.targetGapsFilled || JSON.stringify(o.targetGapsFilled) === JSON.stringify(e.targetGapsFilled),
      errorsCount: !e.errors || o.errors.length === e.errors.length,
      gapIndex: !e.errors || JSON.stringify(o.errors.map(x => x.gapIndex).sort()) === JSON.stringify(e.errors.map(x => x.gapIndex).sort()),
      missingNote: e.missingNote === undefined || (o.missingNote !== null) === e.missingNote,
      bubbles: JSON.stringify(actual.bubbles) === JSON.stringify(e.bubbles),
      highlights: JSON.stringify([...actual.highlights].sort()) === JSON.stringify(e.highlights.map(h => h.part).sort()),
    };
    steps.push({ step: i, stage: input.stage, student: s.student, actual, check });
    if (!check.action) return { caseId: c.caseId, run, steps, status: 'DIVERGED', divergedAt: i };
    // 구멍 질문이 기대와 다른 빈 곳(근거 문장 기준)을 물으면, 미리 써 둔 답으로는 이후를 비교할 수 없다.
    if (o.action === 'GAP_QUESTION' && e.gaps && JSON.stringify(actual.gaps.map(g => g.sentence).sort()) !== JSON.stringify([...e.gaps].sort()))
      return { caseId: c.caseId, run, steps, status: 'QUESTION_MISMATCH', divergedAt: i };
    state = next;
    if (state.done) break;
    dialogue.push({ role: 'tutor', text: tutorText(o) });
  }
  return { caseId: c.caseId, run, steps, status: 'COMPLETED' };
}

// 동시 실행 6개
const jobs = [];
const prevOk = new Set();
if (previous) {
  const prev = JSON.parse(readFileSync(previous, 'utf8')).results;
  for (const c of cases) { const rs = prev.filter(r => r.caseId === c.caseId); if (rs.length && rs.every(r => r.status === 'COMPLETED' && r.steps.every(s => s.check && Object.values(s.check).every(Boolean)))) prevOk.add(c.caseId); }
}
for (let run = 1; run <= runs; run++) for (const c of cases) if (run === 1 || !prevOk.has(c.caseId)) jobs.push([c, run]);
console.error(`jobs ${jobs.length} (회귀 확인 1회 ${prevOk.size}사례)`);
const results = [];
let cursor = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < jobs.length && !stopped) { const [c, run] = jobs[cursor++]; results.push(await runCase(c, run)); }
}));
results.sort((a, b) => a.caseId.localeCompare(b.caseId) || a.run - b.run);
const summary = {
  model, promptVersion: PARAGRAPH_SIMPLE_PROMPT_VERSION, runs, calls, usdEstimate: Number(usd.toFixed(4)), stoppedByCap: stopped,
  conversations: results.length,
  status: results.reduce((m, r) => (m[r.status] = (m[r.status] ?? 0) + 1, m), {}),
  allChecksPass: results.filter(r => r.status === 'COMPLETED' && r.steps.every(s => s.check && Object.values(s.check).every(Boolean))).length,
};
writeFileSync(join(outDir, 'results.json'), JSON.stringify({ summary, results }, null, 2) + '\n');

// 읽기용 리뷰: 사례마다 기대와 3회 실제를 나란히
const mark = ok => (ok ? '✓' : '✗');
const lines = [`# 전체 경로 시뮬레이션 실행 결과 (${outDir.split('/').at(-1)})`, '',
  `- 모델 ${model} · 프롬프트 ${PARAGRAPH_SIMPLE_PROMPT_VERSION} · 사례당 ${runs}회 · 호출 ${calls} · 추정 비용 $${summary.usdEstimate}${stopped ? ' · 비용 상한으로 중단' : ''}`,
  `- 대화 ${results.length}: ${Object.entries(summary.status).map(([k, v]) => `${k} ${v}`).join(', ')} · 구조 대조 전부 일치 ${summary.allChecksPass}`,
  '- ✓/✗는 구조 대조(행동·분류·고침·빈 곳 수·채움·오류 수·질문 번호·빠진 내용·말풍선·지문 표시). 내용 방향은 아래 문구로 직접 판단한다.', ''];
const keys = ['action', 'category', 'targetErrorResolved', 'gapsCount', 'targetGapsFilled', 'errorsCount', 'gapIndex', 'missingNote', 'bubbles', 'highlights'];
for (const c of cases) {
  const rs = results.filter(r => r.caseId === c.caseId);
  const verdict = rs.map(r => r.status === 'COMPLETED' && r.steps.every(s => s.check && Object.values(s.check).every(Boolean)) ? '일치' : r.status === 'COMPLETED' ? '부분' : r.status === 'DIVERGED' ? `갈라짐@${r.divergedAt + 1}` : r.status === 'QUESTION_MISMATCH' ? `질문 다름@${r.divergedAt + 1}` : r.status).join(' / ');
  lines.push(`## ${c.caseId} · ${c.name}`, '', `회차별: ${verdict}`, '');
  c.steps.forEach((s, i) => {
    const e = s.expect;
    lines.push(`### ${i + 1}. ${s.stage} 학생: “${s.student.replace(/\n/g, ' / ')}”`, '',
      `- 기대: ${e.category} → ${e.action}${e.targetGapsFilled ? ` · 채움 ${JSON.stringify(e.targetGapsFilled)}` : ''}${e.errors?.length ? ` · 오류 ${e.errors.map(x => `${x.part}(${x.gapIndex ?? '-'})`).join(',')}` : ''} · 말풍선 ${e.bubbles.join('→')} · 표시 ${e.highlights.map(h => h.part).join('·') || '없음'}`,
      `- 방향: ${e.points.join('; ')}`);
    for (const r of rs) {
      const st = r.steps[i];
      if (!st) { lines.push(`- **${r.run}회**: (도달 안 함)`); continue; }
      if (st.error) { lines.push(`- **${r.run}회**: 판정 실패 ${st.error}`); continue; }
      const a = st.actual;
      const bad = keys.filter(k => !st.check[k]);
      lines.push(`- **${r.run}회** ${bad.length ? `✗ ${bad.join(',')}` : '✓'}: ${a.category} → ${a.action}${a.targetGapsFilled ? ` · 채움 ${JSON.stringify(a.targetGapsFilled)}` : ''}${a.errors.length ? ` · 오류 ${a.errors.map(x => `“${x.studentQuote}”(${x.gapIndex ?? '-'})`).join(',')}` : ''} · 말풍선 ${a.bubbles.join('→')} · 표시 ${a.highlights.join('·') || '없음'}${a.retries ? ` · 재요청 ${a.retries}` : ''}`);
      if (a.targetGapReadings) lines.push(`  - 읽기: ${a.targetGapReadings.map(x => `“${x}”`).join(' / ')}`);
      if (a.coreParts?.length) lines.push(`  - 핵심 부분: ${a.coreParts.map((x, j) => `${j}. ${x.description}(${x.sentence})`).join(' ')}`);
      if (a.corePartsCovered) lines.push(`  - 부분 담음: ${JSON.stringify(a.corePartsCovered)}`);
      if (a.gaps.length) lines.push(`  - 질문: ${a.gaps.map((g, j) => `${j + 1}. ${g.question}(${g.sentence})`).join(' ')}`);
      lines.push(`  - 말: ${a.message.replace(/\n/g, ' ')}`);
      for (const x of a.errors) if (x.feedback) lines.push(`  - 바로잡기: (“${x.studentQuote}”) ${x.feedback}`);
      if (a.missingNote) lines.push(`  - 빠진 내용: ${a.missingNote}`);
      if (a.coreSummary) lines.push(`  - 핵심: ${a.coreIntro ?? ''} ［${a.coreSummary}］`);
      lines.push(`  - 이유: ${a.reason}`);
    }
    lines.push('');
  });
}
writeFileSync(join(outDir, 'REVIEW.md'), lines.join('\n'));
console.log(JSON.stringify(summary));
