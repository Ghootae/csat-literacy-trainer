import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { zodTextFormat } from 'openai/helpers/zod';
import { Stage1, Gen, ROLES, norm, splitSentences, effectiveRole, minimumAxes, stage2InputFor, validateStage1, validateStage2 } from './lib/central-story-two-stage-contract.mjs';
import { sentenceCount } from './lib/axis-audit-v2-contract.mjs';

const root = 'docs/experiments/central-story-two-stage-2026-10-07';
const fixture = 'packages/pipeline/fixtures/experiments/dialogue';
const v3 = 'docs/experiments/axis-audit-v3-substantive-min-two-2026-10-07';
const candidatePath = 'docs/experiments/meta-axis-generation-corporate-p4-2026-09-29/requests.json';
const humanPath = 'docs/experiments/axis-audit-v2-min-two-2026-10-06/HUMAN-REVIEW.md';
const passageIds = ['corporate-law', 'dopamine-motor-control', 'gongsun-long-later-mohists', 'information-asymmetry-free-marketplace', 'surface-tension-laplace'];
const human = { 'surface-tension-laplace-p3': '1축 적당', 'information-asymmetry-free-marketplace-p2': '1축 적당', 'gongsun-long-later-mohists-p3': '경계' };
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const bytesHash = value => createHash('sha256').update(value).digest('hex');
const objectHash = value => bytesHash(JSON.stringify(value));
const fileHash = path => existsSync(path) ? bytesHash(readFileSync(path)) : null;
const save = (name, value) => writeFileSync(`${root}/${name}`, JSON.stringify(value, null, 2) + '\n');
const stage1Prompt = "당신은 사람이 검토해 확정한 문단의 centralStory를 원문과 대조해, 빠진 핵심 의미만 보충한다. 또한 문단의 기능을 판정하고 원문 문장을 설명 단위에 배정한다.\n\n## 중심 이야기 보강\n- centralStory는 이 문단에서 학생이 이해해야 할 핵심 관계를 담은 기준 문서다. 원문을 대조해, 문단의 중심 설명을 성립시키는 핵심 관계·정의·조건·적용 범위가 centralStory에서 빠졌을 때만 보충한다.\n- 부수 세부(예시의 세부 수치, 구성 성분, 사례 묘사, 반복 표현)는 보충하지 않는다. 원문의 모든 세부를 넣는 작업이 아니다.\n- 기존 centralStory의 문자를 지우거나 바꾸지 않는다. 필요한 위치에 단어·구·문장을 덧붙이는 방식으로만 보충한다. 보충할 것이 없으면 revisedCentralStory는 centralStory와 똑같아야 한다.\n- additions에는 덧붙인 각 문자열을 revisedCentralStory에 들어간 그대로 적고(content), 근거가 된 원문 구절을 sentences의 텍스트에서 정확히 인용하며(sourceQuote), 왜 핵심 의미인지 쓴다(reason).\n- 다른 문단 내용이나 외부 지식을 넣지 않는다. 원문에 없는 대비·목적·원인·평가를 만들지 않는다.\n\n## 문단 기능\n- passageContext로 지문 전체 흐름을 보고 대상 문단이 지문 전체의 화제를 소개하는 도입 문단(introduction)인지, 앞의 논의를 정리·마무리하는 정리 문단(conclusion)인지, 그 밖의 일반 문단(general)인지 판정한다.\n- introduction·conclusion은 그 기능이 분명할 때만 고르고, evidenceQuote에 그 기능을 보여 주는 원문 구절을 한 구절 그대로 인용한다(생략 부호로 잇지 않는다). 확실하지 않으면 uncertain을 true로 한다. 이때는 일반 문단으로 처리된다.\n\n## 설명 단위와 문장 배정\n- 문단 안에서 학생이 따로 답해야 할 서로 다른 핵심 질문(무엇의 어떤 관계인가)마다 설명 단위를 만든다(E1, E2, ...). 공통 소재나 서술이 이어진다는 사실만으로 같은 단위로 보지 않는다. 주장과 그 이유·예시·구체화가 같은 관계를 설명하면 같은 단위다.\n- sentences의 모든 문장을 순서대로 하나씩 설명 단위나 CONNECTIVE에 배정한다.\n- CONNECTIVE는 이 문단에서 학생이 따로 답해야 할 관계를 제시하지 않고, 뒤 설명의 화제를 예고·도입하거나 다른 문단의 논의로 연결만 하는 문장이다. 관계·주장·근거·사례 적용·정의를 담은 문장은 CONNECTIVE가 아니다. 확실하지 않으면 설명 단위에 배정한다.\n- explanationUnits의 summary는 그 단위가 답하는 핵심 질문과 답을 한 문장으로 쓴다.\n\n## 출력\nStructured Outputs JSON Schema를 정확히 따른다. paragraphId와 centralStory는 입력 그대로 둔다.";
const oldSentence = '입력에는 paragraphId와 centralStory만 있다. 문단 원문, coreRelations, diagnosticRole은 제공되지 않으며 추측해서도 안 된다.';
const newSentence = '입력에는 paragraphId, centralStory, minimumAxes, explanationUnits가 있다. 문단 원문, coreRelations, diagnosticRole은 제공되지 않으며 추측해서도 안 된다.';
const minimumPrompt = "## 최소 축 수\n\n- minimumAxes는 이 문단에 학생이 따로 답해야 할 서로 다른 핵심 질문이 몇 개 이상인지에 따라 앞 단계에서 정해진 값이다. explanationUnits는 그 질문들의 요약이며 축 경계의 참고 자료다. 축 문구는 centralStory에서만 가져온다.\n- centralAxes의 개수는 minimumAxes 이상이어야 한다. 이 조건은 위의 묶음 규칙(인과사슬, 대조, 분류, 원리와 적용, 종합)보다 우선한다.\n- minimumAxes가 2 이상이면, 서로 다른 explanationUnits에 해당하는 의미가 한 축 안에서만 함께 요구되지 않도록 나눈다. 같은 질문의 주장·이유·예시는 한 축에 둔다.\n- minimumAxes 때문에 의미를 새로 만들거나 centralStory에 없는 내용을 축에 넣지 않는다. centralStory의 의미만으로 minimumAxes를 채울 수 없으면 NEEDS_REVIEW와 AXIS_BOUNDARY_AMBIGUOUS로 보고한다.";

function template() {
  const matches = read(candidatePath).filter(j => j.id === 'candidate-2');
  assert.equal(matches.length, 1, 'candidate-2가 정확히 하나여야 함');
  return matches[0].request;
}
function stage2PromptFor(t) {
  assert.equal(t.instructions.split(oldSentence).length - 1, 1, 'candidate-2 지침 교체 문장이 정확히 하나여야 함');
  return t.instructions.replace(oldSentence, newSentence) + '\n\n' + minimumPrompt;
}
const stage1RequestFor = input => ({ model: 'gpt-5.6-terra', reasoning: { effort: 'medium' }, service_tier: 'default', store: false, max_output_tokens: 8000, instructions: stage1Prompt, input: JSON.stringify(input, null, 2), text: { format: zodTextFormat(Stage1, 'central_story_stage1') } });
const stage2RequestFor = (input, t) => ({ ...structuredClone(t), instructions: stage2PromptFor(t), input: JSON.stringify(input, null, 2) });
const withoutInstructionsInput = ({ instructions, input, ...rest }) => rest;
const syntheticStage1 = input => ({ paragraphId: input.paragraphId, centralStory: input.centralStory, revisedCentralStory: input.centralStory, additions: [], paragraphFunction: { role: 'general', uncertain: false, evidenceQuote: '', reason: 'API 없는 합성 자기 검사' }, explanationUnits: [{ id: 'E1', summary: input.centralStory }], sentenceAssignments: input.sentences.map(s => ({ sentenceId: s.id, unit: 'E1', reason: '합성 배정' })) });
const syntheticStage2 = input => ({ schemaVersion: 'central-axis-meta-openai-v1', paragraphId: input.paragraphId, centralStory: input.centralStory, verdict: 'READY', centralStoryMeanings: [{ id: 'CSM1', description: input.centralStory, axisIds: ['AX1'] }], centralAxes: [{ id: 'AX1', description: input.centralStory, metaAxis: 'API 없는 합성 검사.' }], issues: [] });

function checkSourceHashes(manifest) {
  for (const f of manifest.sourceFiles) assert.equal(fileHash(f.path), f.sha256, `입력 파일 변경: ${f.path}`);
}
function verifyFrozen() {
  const manifest = read(`${root}/manifest.json`);
  checkSourceHashes(manifest);
  for (const f of manifest.artifacts) assert.equal(fileHash(`${root}/${f.name}`), f.sha256, `prepare 산출물 변경: ${f.name}`);
  const inputs = read(`${root}/inputs.json`);
  assert.equal(objectHash(inputs), manifest.inputsHash, '동결 입력 해시 불일치');
  const t = template();
  assert.equal(readFileSync(`${root}/stage1-prompt.md`, 'utf8'), stage1Prompt + '\n', '현재 1단계 지침과 동결 지침 불일치');
  assert.equal(readFileSync(`${root}/stage2-prompt.md`, 'utf8'), stage2PromptFor(t) + '\n', '현재 2단계 지침과 동결 지침 불일치');
  for (const x of inputs) assert.deepEqual(x.stage1Request, stage1RequestFor(x.stage1Input), `${x.paragraphId}: 동결 1단계 요청 불일치`);
  return { manifest, inputs, t };
}

function prepare() {
  const paths = [candidatePath, humanPath], inputs = [], t = template();
  for (const passageId of passageIds) {
    const passagePath = `${fixture}/passages/${passageId}.json`, p = read(passagePath);
    paths.push(passagePath);
    const context = p.paragraphs.map(q => ({ paragraphId: q.paragraphId, position: q.position, text: read(q.goldPath).paragraphText }));
    for (const q of p.paragraphs) {
      const g = read(q.goldPath), stage1Input = { paragraphId: q.paragraphId, centralStory: g.centralStory, sentences: splitSentences(g.paragraphText).map((text, i) => ({ id: `S${i + 1}`, text })), passageContext: context };
      paths.push(q.goldPath, `${fixture}/conditional-meta-v1/${q.paragraphId}.json`, `${v3}/${q.paragraphId}--final.json`);
      assert.equal(norm(stage1Input.sentences.map(s => s.text).join(' ')), norm(g.paragraphText), `${q.paragraphId}: 문장 분할 복원 실패`);
      assert.equal(stage1Input.sentences.length, sentenceCount(g.paragraphText), `${q.paragraphId}: sentenceCount 불일치`);
      const stage1Request = stage1RequestFor(stage1Input);
      assert.deepEqual(stage1Request, stage1RequestFor(stage1Input), '1단계 요청 비결정적 생성');
      const out = syntheticStage1(stage1Input);
      assert.deepEqual(validateStage1(stage1Input, out), [], q.paragraphId);
      const stage2Input = stage2InputFor(out), stage2Request = stage2RequestFor(stage2Input, t);
      assert.deepEqual(stage2Request, stage2RequestFor(stage2Input, t), '2단계 요청 비결정적 생성');
      assert.deepEqual(withoutInstructionsInput(stage2Request), withoutInstructionsInput(t), 'candidate-2 요청 필드 변경');
      assert.deepEqual(validateStage2(stage2Input, syntheticStage2(stage2Input)), [], '기존 2단계 검증기 자기 검사');
      inputs.push({ paragraphId: q.paragraphId, passageId, title: p.title, position: q.position, sourceGoldPath: q.goldPath, paragraphText: g.paragraphText, stage1Input, stage1Request });
    }
  }
  assert.equal(inputs.length, 25);
  const two = { ...stage2InputFor(syntheticStage1(inputs[0].stage1Input)), minimumAxes: 2 };
  const minimumErrors = validateStage2(two, syntheticStage2(two));
  assert.ok(minimumErrors.some(e => e.includes('minimumAxes=2')));
  const preflight = { paragraphs: inputs.length, sentenceSplitRestorationPassed: inputs.length, sentenceCountMatched: inputs.length, stage1RequestsGenerated: inputs.length, deterministicStage1Requests: inputs.length, syntheticStage1ContractPassed: inputs.length, stage2OnlyInstructionsAndInputDiffer: inputs.length, deterministicStage2Requests: inputs.length, syntheticStage2ContractPassed: inputs.length, minimumAxesTwoRejectsOneAxis: true, minimumAxesViolationErrors: minimumErrors, apiCalls: 0 };
  const artifacts = { 'inputs.json': JSON.stringify(inputs, null, 2) + '\n', 'stage1-prompt.md': stage1Prompt + '\n', 'stage2-prompt.md': stage2PromptFor(t) + '\n', 'preflight-validation.json': JSON.stringify(preflight, null, 2) + '\n' };
  const sourceFiles = [...new Set(paths)].map(path => ({ path, sha256: fileHash(path) }));
  // 없는 v3 결과도 null 해시로 동결한다. 비교 보고서는 이를 실패로 표시한다.
  for (const s of sourceFiles) assert.ok(s.sha256 !== null || s.path.startsWith(v3 + '/'), `필수 입력 없음: ${s.path}`);
  const manifest = { sourceFiles, inputsHash: objectHash(inputs), stage1RequestHashes: inputs.map(x => ({ paragraphId: x.paragraphId, sha256: objectHash(x.stage1Request) })), artifacts: Object.entries(artifacts).map(([name, text]) => ({ name, sha256: bytesHash(text) })), passages: passageIds.length, paragraphs: inputs.length, maximumCalls: 50, concurrency: 3, retries: 0, productionEligible: false };
  if (existsSync(`${root}/manifest.json`)) {
    verifyFrozen();
    assert.deepEqual(read(`${root}/manifest.json`), manifest, 'manifest 재생성 불일치');
    for (const [name, content] of Object.entries(artifacts)) assert.equal(readFileSync(`${root}/${name}`, 'utf8'), content, `${name} 재생성 불일치`);
  } else {
    assert.ok(!existsSync(root) || readdirSync(root).length === 0, '미완료 prepare 폴더 검토 필요');
    mkdirSync(root, { recursive: true });
    for (const [name, content] of Object.entries(artifacts)) writeFileSync(`${root}/${name}`, content);
    save('manifest.json', manifest);
  }
  console.log(JSON.stringify({ paragraphs: inputs.length, sourceFiles: sourceFiles.length, missingV3: sourceFiles.filter(f => f.sha256 === null).map(f => f.path), inputsHash: manifest.inputsHash, preflight }));
}

function approvalFor(id) {
  assert.ok(/^D-\d{4}$/u.test(id ?? '') && Number(id.slice(2)) > 95, 'run <D-0095 이후 전송 승인 결정 ID> 필요');
  const matches = readdirSync('memory/decisions').filter(n => n.startsWith(id + '-') && n.endsWith('.md'));
  assert.equal(matches.length, 1, `결정 기록 없음 또는 중복: ${id}`);
  const decision = `memory/decisions/${matches[0]}`, text = readFileSync(decision, 'utf8');
  const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u)?.[1] ?? '';
  const field = key => front.match(new RegExp(`^${key}:\\s*([^\\r\\n]+)$`, 'mu'))?.[1].trim().replace(/^(['"])(.*)\1$/u, '$2');
  assert.ok(field('status') === 'accepted' && (field('scope') ?? '').startsWith('central-story-two-stage-') && field('scope').includes('transfer'), '결정 기록이 이 실험의 accepted 전송 승인이 아님: ' + decision);
  return { decision, sha256: fileHash(decision) };
}
function verifyWire(name, request) {
  assert.deepEqual(read(`${root}/${name}-request.json`), request, `${name}: 저장 요청 불일치`);
  assert.deepEqual(JSON.parse(read(`${root}/${name}-wire.json`).body), request, `${name}: wire 불일치`);
}
const paragraphErrors = id => readdirSync(root).filter(n => n.startsWith(`${id}--`) && n.endsWith('-error.json'));

async function run(id) {
  // 모든 파일 쓰기·환경변수 로드·클라이언트 생성보다 승인 검사를 먼저 한다.
  const approval = approvalFor(id);
  const { manifest, inputs, t } = verifyFrozen();
  if (existsSync(`${root}/run-approval.json`)) assert.deepEqual(read(`${root}/run-approval.json`).approval, approval);
  else save('run-approval.json', { approval, startedAt: new Date().toISOString() });
  process.loadEnvFile('.env');
  const { default: OpenAI } = await import('openai');
  let calls = readdirSync(root).filter(n => /--stage[12]-wire\.json$/u.test(n)).length, cursor = 0, failed = 0;
  assert.ok(calls <= manifest.maximumCalls);
  async function call(x, stage, request, schema) {
    const name = `${x.paragraphId}--stage${stage}`;
    if (existsSync(`${root}/${name}-request.json`)) assert.deepEqual(read(`${root}/${name}-request.json`), request);
    if (existsSync(`${root}/${name}-result.json`)) { verifyWire(name, request); return schema.parse(read(`${root}/${name}-result.json`)); }
    try {
      if (existsSync(`${root}/${name}-response.json`)) {
        verifyWire(name, request);
        const response = read(`${root}/${name}-response.json`); assert.equal(response.status, 'completed', name);
        const out = schema.parse(JSON.parse(response.output_text)); save(`${name}-result.json`, out); return out;
      }
      assert.ok(!existsSync(`${root}/${name}-wire.json`), 'wire만 남은 요청은 재호출하지 않음: ' + name);
      checkSourceHashes(manifest);
      assert.ok(calls < manifest.maximumCalls, '최대 50회 호출 초과');
      save(`${name}-request.json`, request);
      const client = new OpenAI({ maxRetries: 0, timeout: 240000, fetch: async (url, options) => {
        assert.deepEqual(JSON.parse(options.body), request);
        assert.ok(!existsSync(`${root}/${name}-wire.json`), '같은 단계 재전송 금지');
        assert.ok(calls < manifest.maximumCalls, '최대 50회 호출 초과'); calls++;
        save(`${name}-wire.json`, { url: String(url), body: options.body });
        return globalThis.fetch(url, options);
      } });
      const response = await client.responses.create(request); save(`${name}-response.json`, response);
      assert.equal(response.status, 'completed', name);
      const out = schema.parse(JSON.parse(response.output_text)); save(`${name}-result.json`, out); return out;
    } catch (error) { save(`${name}-error.json`, { message: error.message, status: error.status ?? null }); throw error; }
  }
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (cursor < inputs.length) {
      const x = inputs[cursor++], paragraphId = x.paragraphId;
      try {
        assert.deepEqual(paragraphErrors(paragraphId), [], '오류 파일이 있는 문단은 재호출하지 않음');
        if (existsSync(`${root}/${paragraphId}--final.json`)) continue;
        const stage1 = await call(x, 1, x.stage1Request, Stage1), errors1 = validateStage1(x.stage1Input, stage1);
        if (errors1.length) { save(`${paragraphId}--stage1-contract-error.json`, { errors: errors1 }); throw new Error(errors1.join('; ')); }
        const stage2Input = stage2InputFor(stage1), request2 = stage2RequestFor(stage2Input, t);
        const stage2 = await call(x, 2, request2, Gen), errors2 = validateStage2(stage2Input, stage2);
        if (errors2.length) { save(`${paragraphId}--stage2-contract-error.json`, { errors: errors2 }); throw new Error(errors2.join('; ')); }
        save(`${paragraphId}--final.json`, { paragraphId, passageId: x.passageId, title: x.title, position: x.position, originalCentralStory: x.stage1Input.centralStory, stage1, minimumAxes: minimumAxes(stage1), axes: stage2.centralAxes, stage2Verdict: stage2.verdict, productionEligible: false });
        console.log(JSON.stringify({ paragraphId, minimumAxes: stage2Input.minimumAxes, axes: stage2.centralAxes.length }));
      } catch (error) {
        failed++;
        if (!paragraphErrors(paragraphId).length) save(`${paragraphId}--pipeline-error.json`, { message: error.message });
        console.log(JSON.stringify({ paragraphId, error: error.message }));
      }
    }
  }));
  if (failed) process.exitCode = 1;
}

function verifyFinal(x, final, t) {
  assert.equal(final.paragraphId, x.paragraphId); assert.equal(final.passageId, x.passageId);
  assert.equal(final.title, x.title); assert.equal(final.position, x.position);
  assert.equal(final.originalCentralStory, x.stage1Input.centralStory); assert.equal(final.productionEligible, false);
  assert.deepEqual(validateStage1(x.stage1Input, final.stage1), []);
  assert.equal(final.minimumAxes, minimumAxes(final.stage1));
  const input2 = stage2InputFor(final.stage1), out2 = read(`${root}/${x.paragraphId}--stage2-result.json`);
  assert.deepEqual(read(`${root}/${x.paragraphId}--stage1-result.json`), final.stage1);
  assert.deepEqual(validateStage2(input2, out2), []);
  assert.deepEqual(final.axes, out2.centralAxes); assert.equal(final.stage2Verdict, out2.verdict);
  for (const [stage, request, out] of [[1, x.stage1Request, final.stage1], [2, stage2RequestFor(input2, t), out2]]) {
    const name = `${x.paragraphId}--stage${stage}`; verifyWire(name, request);
    const response = read(`${root}/${name}-response.json`); assert.equal(response.status, 'completed');
    assert.deepEqual(JSON.parse(response.output_text), out, `${name}: 응답과 결과 불일치`);
  }
}

function report() {
  let inputs = [], t, globalErrors = [];
  try { ({ inputs, t } = verifyFrozen()); } catch (error) {
    globalErrors.push(error.message);
    try { inputs = read(`${root}/inputs.json`); } catch (inputError) { globalErrors.push(inputError.message); }
  }
  if (!Array.isArray(inputs)) { globalErrors.push('inputs.json이 문단 배열이 아님'); inputs = []; }
  inputs = inputs.filter(x => {
    if (x?.paragraphId && Array.isArray(x.stage1Input?.sentences)) return true;
    globalErrors.push('inputs.json의 문단 입력 형식 손상'); return false;
  });
  const results = [], failed = [], comparisons = new Map(), usage = { input: 0, output: 0, reasoning: 0, cachedInput: 0 }, wireErrors = [];
  let openaiCalls = 0;
  for (const x of inputs) {
    const errors = [...globalErrors], id = x.paragraphId;
    try {
      for (const name of paragraphErrors(id)) errors.push(`${name}: ${JSON.stringify(read(`${root}/${name}`))}`);
      for (const stage of [1, 2]) {
        const name = `${id}--stage${stage}`;
        if (existsSync(`${root}/${name}-wire.json`)) {
          openaiCalls++;
          try { verifyWire(name, read(`${root}/${name}-request.json`)); } catch (error) { errors.push(error.message); wireErrors.push({ paragraphId: id, stage, error: error.message }); }
        }
        if (existsSync(`${root}/${name}-response.json`)) {
          verifyWire(name, read(`${root}/${name}-request.json`));
          const response = read(`${root}/${name}-response.json`), u = response.usage;
          usage.input += u?.input_tokens ?? 0; usage.output += u?.output_tokens ?? 0;
          usage.reasoning += u?.output_tokens_details?.reasoning_tokens ?? 0; usage.cachedInput += u?.input_tokens_details?.cached_tokens ?? 0;
        }
      }
      const operational = read(`${fixture}/conditional-meta-v1/${id}.json`).axes;
      const v3Path = `${v3}/${id}--final.json`, previous = existsSync(v3Path) ? read(v3Path).afterAudit : null;
      comparisons.set(id, { operational, previous });
      if (!existsSync(`${root}/${id}--final.json`)) errors.push('final.json 없음');
      else if (!globalErrors.length) {
        const final = read(`${root}/${id}--final.json`); verifyFinal(x, final, t);
        if (!errors.length) results.push(final);
      }
    } catch (error) { errors.push(error.message); }
    if (errors.length) failed.push({ paragraphId: id, errors });
  }
  const sum = (xs, fn) => xs.reduce((n, x) => n + fn(x), 0), newAxes = results.flatMap(r => r.axes);
  const operationalAxes = results.flatMap(r => comparisons.get(r.paragraphId).operational);
  const v3Axes = results.flatMap(r => comparisons.get(r.paragraphId).previous ?? []);
  const mean = axes => axes.length ? Math.round(sum(axes, a => a.description.length) / axes.length) : null;
  const summary = { paragraphs: inputs.length, succeeded: results.length, failed, globalErrors,
    // 비교 축 수와 평균은 새 결과가 성공한 같은 문단 집합으로 계산한다. 없는 v3는 별도 표시한다.
    comparisonScope: 'successful-new-paragraphs', axes: { new: newAxes.length, operational: operationalAxes.length, v3: v3Axes.length },
    singleAxisParagraphs: { new: results.filter(r => r.axes.length === 1).length, operational: results.filter(r => comparisons.get(r.paragraphId).operational.length === 1).length, v3: results.filter(r => comparisons.get(r.paragraphId).previous?.length === 1).length },
    v3Failed: inputs.filter(x => !comparisons.get(x.paragraphId)?.previous).map(x => x.paragraphId),
    augmentedParagraphs: results.filter(r => r.stage1.additions.length).length, additions: sum(results, r => r.stage1.additions.length), minimumAxesTwoParagraphs: results.filter(r => r.minimumAxes === 2).length,
    operationalSingleAxisMinimumTwo: results.filter(r => r.minimumAxes === 2 && comparisons.get(r.paragraphId).operational.length === 1).map(r => r.paragraphId),
    connectiveSentences: sum(results, r => r.stage1.sentenceAssignments.filter(a => a.unit === 'CONNECTIVE').length),
    roles: Object.fromEntries(ROLES.map(role => [role, results.filter(r => effectiveRole(r.stage1.paragraphFunction) === role).length])),
    reportedRoles: Object.fromEntries(ROLES.map(role => [role, results.filter(r => r.stage1.paragraphFunction.role === role).length])),
    uncertainRole: results.filter(r => r.stage1.paragraphFunction.uncertain).length, meanL1Length: { new: mean(newAxes), operational: mean(operationalAxes) }, openaiCalls, usage, wireErrors, productionEligible: false };
  mkdirSync(root, { recursive: true }); save('summary.json', summary);
  const axesMd = axes => axes ? axes.map(a => `- **${a.id} L1:** ${a.description}\n  - **L2:** ${a.metaAxis}\n`).join('') : '실패: 결과 없음\n';
  let md = '# 중심 이야기 두 단계 생성 — 사람 검토 자료\n\n구조 계약 통과는 의미 품질 검증이 아니다. 집계는 새 결과 성공 문단 기준이며 없는 v3 결과는 실패로 표시한다.\n\n';
  for (const x of inputs) {
    const r = results.find(r => r.paragraphId === x.paragraphId), comparison = comparisons.get(x.paragraphId), f = failed.find(f => f.paragraphId === x.paragraphId);
    md += `## ${x.title} (${x.paragraphId}, ${x.position}문단)\n\n`;
    if (human[x.paragraphId]) md += `**사람 판정:** ${human[x.paragraphId]} (${humanPath})\n\n`;
    md += '**원문**\n\n' + x.stage1Input.sentences.map(s => `- ${s.id}: ${s.text}\n`).join('') + `\n**원래 중심 이야기**\n\n${x.stage1Input.centralStory}\n\n`;
    let s = r?.stage1;
    if (!s && !globalErrors.length && existsSync(`${root}/${x.paragraphId}--stage1-result.json`)) {
      try {
        const candidate = read(`${root}/${x.paragraphId}--stage1-result.json`);
        if (!validateStage1(x.stage1Input, candidate).length) s = candidate;
      } catch { /* 실패 문단의 읽을 수 없는 중간 산출물은 실패 사유로 보존한다. */ }
    }
    if (s) {
      const pf = s.paragraphFunction;
      md += `**보강본**\n\n${s.revisedCentralStory}\n\n**추가 항목·근거 인용**\n\n`;
      md += s.additions.length ? s.additions.map(a => `- ${a.content}\n  - 원문: “${a.sourceQuote}”\n  - 이유: ${a.reason}\n`).join('') : '보충 없음\n';
      md += `\n**문단 기능:** ${pf.role}, uncertain=${pf.uncertain}, 실제=${effectiveRole(pf)}\n\n근거: “${pf.evidenceQuote}” — ${pf.reason}\n\n**설명 단위**\n\n` + s.explanationUnits.map(u => `- ${u.id}: ${u.summary}\n`).join('');
      md += '\n**문장 배정**\n\n' + s.sentenceAssignments.map(a => `- ${a.sentenceId} → ${a.unit}: ${a.reason}\n`).join('') + `\n**minimumAxes:** ${minimumAxes(s)}\n\n`;
    } else md += '**보강본:** 유효한 1단계 결과 없음\n\n';
    if (!r) md += `**실패:** ${JSON.stringify(f?.errors ?? globalErrors)}\n\n`;
    md += `### 운영 골드\n\n${axesMd(comparison?.operational)}\n### v3\n\n${axesMd(comparison?.previous)}\n### 새 축\n\n${axesMd(r?.axes)}\n`;
  }
  writeFileSync(`${root}/REVIEW.md`, md);
  console.log(JSON.stringify(summary));
  if (globalErrors.length || failed.length) process.exitCode = 1;
}

try {
  const phase = process.argv[2];
  if (phase === 'prepare') prepare();
  else if (phase === 'run') await run(process.argv[3]);
  else if (phase === 'report') report();
  else throw new Error('prepare | run <승인 결정 ID> | report');
} catch (error) { console.error(error.message); process.exitCode = 1; }
