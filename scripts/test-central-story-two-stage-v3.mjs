import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Gen, minimumAxes, minimumAxesV3, stage2InputFor, stage2InputForV3, validateStage1V2, validateStage2 } from './lib/central-story-two-stage-contract.mjs';

const root = 'docs/experiments/central-story-two-stage-v3-2026-10-07';
const v2 = 'docs/experiments/central-story-two-stage-v2-2026-10-07';
const fixture = 'packages/pipeline/fixtures/experiments/dialogue';
const v1 = 'docs/experiments/central-story-two-stage-2026-10-07';
const v1HumanPath = `${v1}/HUMAN-REVIEW.md`;
const candidatePath = 'docs/experiments/meta-axis-generation-corporate-p4-2026-09-29/requests.json';
const humanPath = 'docs/experiments/axis-audit-v2-min-two-2026-10-06/HUMAN-REVIEW.md';
const human = { 'surface-tension-laplace-p3': '1축 적당', 'information-asymmetry-free-marketplace-p2': '1축 적당', 'gongsun-long-later-mohists-p3': '경계', 'dopamine-motor-control-p4': 'v1 AX1(개관 문장) 잉여 → 1축 적당', 'surface-tension-laplace-p6': 'v1 AX2(요약 문장) 잉여 → 1축 적당' };
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const bytesHash = value => createHash('sha256').update(value).digest('hex');
const objectHash = value => bytesHash(JSON.stringify(value));
const fileHash = path => existsSync(path) ? bytesHash(readFileSync(path)) : null;
const save = (name, value) => writeFileSync(`${root}/${name}`, JSON.stringify(value, null, 2) + '\n');
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
const stage2RequestFor = (input, t) => ({ ...structuredClone(t), instructions: stage2PromptFor(t), input: JSON.stringify(input, null, 2) });
const syntheticStage2 = input => ({ schemaVersion: 'central-axis-meta-openai-v1', paragraphId: input.paragraphId, centralStory: input.centralStory, verdict: 'READY', centralStoryMeanings: [{ id: 'CSM1', description: input.centralStory, axisIds: ['AX1'] }], centralAxes: [{ id: 'AX1', description: input.centralStory, metaAxis: 'API 없는 합성 검사.' }], issues: [] });

const expectedTargets = ['corporate-law-p1', 'dopamine-motor-control-p1', 'information-asymmetry-free-marketplace-p1', 'surface-tension-laplace-p1'];
const jsonText = value => JSON.stringify(value, null, 2) + '\n';

function checkSourceHashes(manifest) {
  for (const f of manifest.sourceFiles) assert.equal(fileHash(f.path), f.sha256, `입력 파일 변경: ${f.path}`);
}
function verifyWireAt(folder, name, request) {
  assert.deepEqual(read(`${folder}/${name}-request.json`), request, `${name}: 저장 요청 불일치`);
  assert.deepEqual(JSON.parse(read(`${folder}/${name}-wire.json`).body), request, `${name}: wire 불일치`);
}
function verifyV2(x, final, t) {
  assert.deepEqual(validateStage1V2(x.stage1Input, final.stage1), [], `${x.paragraphId}: v2 1단계 재검사 실패`);
  assert.deepEqual(read(`${v2}/${x.paragraphId}--stage1-result.json`), final.stage1);
  assert.equal(final.minimumAxes, minimumAxes(final.stage1));
  const input2 = stage2InputFor(final.stage1), out2 = read(`${v2}/${x.paragraphId}--stage2-result.json`);
  assert.deepEqual(validateStage2(input2, out2), []);
  assert.deepEqual(final.axes, out2.centralAxes); assert.equal(final.stage2Verdict, out2.verdict);
  for (const [stage, request, out] of [[1, x.stage1Request, final.stage1], [2, stage2RequestFor(input2, t), out2]]) {
    const name = `${x.paragraphId}--stage${stage}`;
    verifyWireAt(v2, name, request);
    const response = read(`${v2}/${name}-response.json`);
    assert.equal(response.status, 'completed');
    assert.deepEqual(JSON.parse(response.output_text), out, `${name}: 응답과 결과 불일치`);
  }
}
function buildPrepared() {
  const t = template(), previousInputs = read(`${v2}/inputs.json`);
  assert.equal(previousInputs.length, 25, 'v2 입력은 25문단이어야 함');
  const prompt = stage2PromptFor(t) + '\n';
  assert.equal(prompt, readFileSync(`${v2}/stage2-prompt.md`, 'utf8'), '2단계 지침이 v2 동결본과 다름');
  const paths = [candidatePath, `${v2}/inputs.json`, `${v2}/stage2-prompt.md`, humanPath, v1HumanPath];
  const inputs = [], targets = [], failed = [];
  let revalidated = 0, nonTargetMatched = 0, deterministicRequests = 0;
  for (const x of previousInputs) {
    const id = x.paragraphId, finalPath = `${v2}/${id}--final.json`, stage1Path = `${v2}/${id}--stage1-result.json`, errorPath = `${v2}/${id}--stage1-contract-error.json`;
    paths.push(finalPath, stage1Path, errorPath, `${fixture}/conditional-meta-v1/${id}.json`, `${v1}/${id}--final.json`);
    // 1단계 요청은 v3에서 만들거나 저장하지 않는다. 동결된 v2 입력만 재사용한다.
    const { stage1Request, ...base } = x;
    if (!existsSync(finalPath)) {
      assert.equal(id, 'corporate-law-p2', '예상하지 않은 v2 실패 문단');
      assert.ok(existsSync(errorPath), '법인2의 v2 실패 기록 없음');
      failed.push(id);
      inputs.push({ ...base, status: 'v2-failed', target: false, stage1: null, v2MinimumAxes: null, stage2Input: null });
      continue;
    }
    assert.ok(!existsSync(errorPath), `${id}: 성공 final과 계약 오류 충돌`);
    const final = read(finalPath), stage1 = read(stage1Path);
    assert.deepEqual(validateStage1V2(x.stage1Input, stage1), [], `${id}: v2 1단계 재검사 실패`);
    verifyV2(x, final, t); revalidated++;
    for (const stage of [1, 2]) for (const suffix of ['request', 'wire', 'response', 'result']) paths.push(`${v2}/${id}--stage${stage}-${suffix}.json`);
    const stage2Input = stage2InputForV3(stage1), oldInput = stage2InputFor(stage1);
    const target = stage2Input.minimumAxes !== final.minimumAxes;
    if (target) {
      const request = stage2RequestFor(stage2Input, t), previous = read(`${v2}/${id}--stage2-request.json`);
      assert.deepEqual(request, stage2RequestFor(stage2Input, t), `${id}: 요청 비결정적 생성`);
      assert.equal(request.instructions + '\n', readFileSync(`${v2}/stage2-prompt.md`, 'utf8'));
      assert.deepEqual({ ...request, input: previous.input }, previous, `${id}: input 외 요청 필드 변경`);
      assert.deepEqual({ ...JSON.parse(request.input), minimumAxes: oldInput.minimumAxes }, JSON.parse(previous.input), `${id}: minimumAxes 외 입력 변경`);
      assert.notEqual(stage2Input.minimumAxes, oldInput.minimumAxes);
      deterministicRequests++;
      targets.push({ paragraphId: id, v2MinimumAxes: final.minimumAxes, v3MinimumAxes: stage2Input.minimumAxes });
      inputs.push({ ...base, status: 'v2-success', target, stage1, v2MinimumAxes: final.minimumAxes, stage2Input, stage2Request: request });
    } else {
      assert.deepEqual(stage2Input, oldInput, `${id}: 비대상 입력 불일치`);
      assert.deepEqual(stage2Input, JSON.parse(read(`${v2}/${id}--stage2-request.json`).input));
      nonTargetMatched++;
      inputs.push({ ...base, status: 'v2-success', target, stage1, v2MinimumAxes: final.minimumAxes, stage2Input });
    }
  }
  assert.deepEqual(targets.map(x => x.paragraphId), expectedTargets, '재실행 대상이 기대 4문단과 다름');
  assert.equal(revalidated, 24); assert.equal(nonTargetMatched, 20); assert.deepEqual(failed, ['corporate-law-p2']);
  const two = inputs.find(x => x.target).stage2Input, one = syntheticStage2(two);
  const minimumErrors = validateStage2(two, one);
  assert.deepEqual(validateStage2({ ...two, minimumAxes: 1 }, one), [], '합성 1축 기본 계약 실패');
  assert.deepEqual(minimumErrors, ['minimumAxes=2: 축 수 1 미달']);
  const preflight = { targets, targetParagraphs: targets.map(x => x.paragraphId), targetCount: targets.length,
    paragraphs: inputs.length, v2Stage1RevalidationPassed: revalidated, v2FailedParagraphs: failed,
    nonTargetInputsMatched: nonTargetMatched, stage1RequestsGenerated: 0, stage2RequestsGenerated: deterministicRequests,
    stage2PromptByteIdenticalToV2: true, targetRequestsOnlyMinimumAxesDifferFromV2: deterministicRequests,
    deterministicStage2Requests: deterministicRequests, minimumAxesTwoRejectsOneAxis: true, minimumAxesViolationErrors: minimumErrors, apiCalls: 0 };
  const artifacts = { 'inputs.json': jsonText(inputs), 'stage2-prompt.md': prompt, 'preflight-validation.json': jsonText(preflight) };
  const sourceFiles = [...new Set(paths)].map(path => ({ path, sha256: fileHash(path) }));
  // 없는 결과·오류 기록도 null 해시로 동결해 이후 생성·삭제를 감지한다.
  for (const f of sourceFiles) assert.ok(f.sha256 !== null || /--(?:final|stage1-contract-error)\.json$/u.test(f.path), `필수 입력 없음: ${f.path}`);
  const manifest = { sourceFiles, inputsHash: objectHash(inputs), stage2RequestHashes: inputs.filter(x => x.target).map(x => ({ paragraphId: x.paragraphId, sha256: objectHash(x.stage2Request) })),
    artifacts: Object.entries(artifacts).map(([name, text]) => ({ name, sha256: bytesHash(text) })), paragraphs: inputs.length, targetParagraphs: expectedTargets,
    maximumCalls: 4, concurrency: 3, retries: 0, productionEligible: false };
  return { manifest, inputs, t, artifacts, preflight };
}
function verifyFrozen() {
  const manifest = read(`${root}/manifest.json`); checkSourceHashes(manifest);
  for (const f of manifest.artifacts) assert.equal(fileHash(`${root}/${f.name}`), f.sha256, `prepare 산출물 변경: ${f.name}`);
  const prepared = buildPrepared();
  assert.deepEqual(manifest, prepared.manifest, 'manifest 재생성 불일치');
  for (const [name, content] of Object.entries(prepared.artifacts)) assert.equal(readFileSync(`${root}/${name}`, 'utf8'), content, `${name} 재생성 불일치`);
  return prepared;
}
function prepare() {
  const prepared = buildPrepared();
  if (existsSync(`${root}/manifest.json`)) verifyFrozen();
  else {
    assert.ok(!existsSync(root) || readdirSync(root).length === 0, '미완료 prepare 폴더 검토 필요');
    mkdirSync(root, { recursive: true });
    for (const [name, content] of Object.entries(prepared.artifacts)) writeFileSync(`${root}/${name}`, content);
    save('manifest.json', prepared.manifest);
  }
  console.log(JSON.stringify({ sourceFiles: prepared.manifest.sourceFiles.length, inputsHash: prepared.manifest.inputsHash, preflight: prepared.preflight }));
}
function approvalFor(id) {
  assert.ok(/^D-\d{4}$/u.test(id ?? '') && Number(id.slice(2)) > 99, 'run <D-0099 이후 전송 승인 결정 ID> 필요');
  const matches = readdirSync('memory/decisions').filter(n => n.startsWith(id + '-') && n.endsWith('.md'));
  assert.equal(matches.length, 1, `결정 기록 없음 또는 중복: ${id}`);
  const decision = `memory/decisions/${matches[0]}`, text = readFileSync(decision, 'utf8');
  const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u)?.[1] ?? '';
  const field = key => front.match(new RegExp(`^${key}:\\s*([^\\r\\n]+)$`, 'mu'))?.[1].trim().replace(/^(['"])(.*)\1$/u, '$2');
  assert.ok(field('status') === 'accepted' && (field('scope') ?? '').startsWith('central-story-two-stage-v3-') && field('scope').includes('transfer'), '결정 기록이 이 실험의 accepted 전송 승인이 아님: ' + decision);
  return { decision, sha256: fileHash(decision) };
}
function verifyWire(name, request) {
  assert.deepEqual(read(`${root}/${name}-request.json`), request, `${name}: 저장 요청 불일치`);
  assert.deepEqual(JSON.parse(read(`${root}/${name}-wire.json`).body), request, `${name}: wire 불일치`);
}
const paragraphErrors = id => readdirSync(root).filter(n => n.startsWith(`${id}--`) && n.endsWith('-error.json'));

async function run(id) {
  // 승인 검사는 쓰기·환경변수 로드·클라이언트 생성보다 먼저 실행한다.
  const approval = approvalFor(id);
  const { manifest, inputs } = verifyFrozen(), targets = inputs.filter(x => x.target);
  assert.deepEqual(targets.map(x => x.paragraphId), expectedTargets);
  assert.ok(!readdirSync(root).some(n => /--stage1-/u.test(n)), 'v3 1단계 산출물은 허용하지 않음');
  if (existsSync(`${root}/run-approval.json`)) assert.deepEqual(read(`${root}/run-approval.json`).approval, approval);
  else save('run-approval.json', { approval, startedAt: new Date().toISOString() });
  process.loadEnvFile('.env');
  const { default: OpenAI } = await import('openai');
  let calls = readdirSync(root).filter(n => /--stage2-wire\.json$/u.test(n)).length, cursor = 0, failed = 0;
  assert.ok(calls <= manifest.maximumCalls);
  async function call(x) {
    const name = `${x.paragraphId}--stage2`, request = x.stage2Request;
    if (existsSync(`${root}/${name}-request.json`)) assert.deepEqual(read(`${root}/${name}-request.json`), request);
    if (existsSync(`${root}/${name}-result.json`)) { verifyWire(name, request); return read(`${root}/${name}-result.json`); }
    try {
      if (existsSync(`${root}/${name}-response.json`)) {
        verifyWire(name, request);
        const response = read(`${root}/${name}-response.json`); assert.equal(response.status, 'completed', name);
        const out = JSON.parse(response.output_text); save(`${name}-result.json`, out); return out;
      }
      assert.ok(!existsSync(`${root}/${name}-wire.json`), 'wire만 남은 요청은 재호출하지 않음: ' + name);
      checkSourceHashes(manifest);
      assert.ok(calls < manifest.maximumCalls, '최대 4회 호출 초과');
      save(`${name}-request.json`, request);
      const client = new OpenAI({ maxRetries: 0, timeout: 240000, fetch: async (url, options) => {
        assert.deepEqual(JSON.parse(options.body), request);
        assert.ok(!existsSync(`${root}/${name}-wire.json`), '같은 단계 재전송 금지');
        assert.ok(calls < manifest.maximumCalls, '최대 4회 호출 초과'); calls++;
        save(`${name}-wire.json`, { url: String(url), body: options.body });
        return globalThis.fetch(url, options);
      } });
      const response = await client.responses.create(request); save(`${name}-response.json`, response);
      assert.equal(response.status, 'completed', name);
      const out = JSON.parse(response.output_text); save(`${name}-result.json`, out); return out;
    } catch (error) { save(`${name}-error.json`, { message: error.message, status: error.status ?? null }); throw error; }
  }
  await Promise.all(Array.from({ length: manifest.concurrency }, async () => {
    while (cursor < targets.length) {
      const x = targets[cursor++], paragraphId = x.paragraphId;
      try {
        assert.deepEqual(paragraphErrors(paragraphId), [], '오류 파일이 있는 문단은 재호출하지 않음');
        if (existsSync(`${root}/${paragraphId}--final.json`)) { verifyFinal(x, read(`${root}/${paragraphId}--final.json`)); continue; }
        const raw = await call(x), errors = validateStage2(x.stage2Input, raw);
        if (errors.length) { save(`${paragraphId}--stage2-contract-error.json`, { errors }); throw new Error(errors.join('; ')); }
        const stage2 = Gen.parse(raw), previous = read(`${v2}/${paragraphId}--final.json`);
        save(`${paragraphId}--final.json`, { ...previous, stage1: x.stage1, minimumAxes: minimumAxesV3(x.stage1), axes: stage2.centralAxes, stage2Verdict: stage2.verdict });
        console.log(JSON.stringify({ paragraphId, minimumAxes: x.stage2Input.minimumAxes, axes: stage2.centralAxes.length }));
      } catch (error) {
        failed++;
        if (!paragraphErrors(paragraphId).length) save(`${paragraphId}--pipeline-error.json`, { message: error.message });
        console.log(JSON.stringify({ paragraphId, error: error.message }));
      }
    }
  }));
  if (failed) process.exitCode = 1;
}
function verifyFinal(x, final) {
  const previous = read(`${v2}/${x.paragraphId}--final.json`), out = read(`${root}/${x.paragraphId}--stage2-result.json`);
  assert.deepEqual(validateStage2(x.stage2Input, out), []);
  assert.deepEqual(final, { ...previous, stage1: x.stage1, minimumAxes: minimumAxesV3(x.stage1), axes: out.centralAxes, stage2Verdict: out.verdict });
  const name = `${x.paragraphId}--stage2`; verifyWire(name, x.stage2Request);
  const response = read(`${root}/${name}-response.json`); assert.equal(response.status, 'completed');
  assert.deepEqual(JSON.parse(response.output_text), out, `${name}: 응답과 결과 불일치`);
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
  const results = [], failed = [], comparisons = new Map(), wireErrors = [];
  const usage = { input: 0, output: 0, reasoning: 0, cachedInput: 0 };
  let openaiCalls = 0;
  for (const x of inputs) {
    const id = x.paragraphId, errors = [...globalErrors];
    // 비교 자료 하나의 손상이 나머지 비교·오류 보고를 막지 않는다.
    const comparison = {};
    for (const [key, path] of [['operational', `${fixture}/conditional-meta-v1/${id}.json`], ['v1', `${v1}/${id}--final.json`], ['v2', `${v2}/${id}--final.json`]]) {
      try { comparison[key] = existsSync(path) ? read(path).axes : null; }
      catch (error) { errors.push(`${key}: ${error.message}`); comparison[key] = null; }
    }
    comparisons.set(id, comparison);
    try {
      for (const name of paragraphErrors(id)) errors.push(`${name}: ${JSON.stringify(read(`${root}/${name}`))}`);
      if (x.target) {
        const name = `${id}--stage2`;
        if (existsSync(`${root}/${name}-wire.json`)) {
          openaiCalls++;
          try { verifyWire(name, x.stage2Request); } catch (error) { errors.push(error.message); wireErrors.push({ paragraphId: id, stage: 2, error: error.message }); }
        }
        if (existsSync(`${root}/${name}-response.json`)) {
          verifyWire(name, x.stage2Request);
          const u = read(`${root}/${name}-response.json`).usage;
          usage.input += u?.input_tokens ?? 0; usage.output += u?.output_tokens ?? 0;
          usage.reasoning += u?.output_tokens_details?.reasoning_tokens ?? 0; usage.cachedInput += u?.input_tokens_details?.cached_tokens ?? 0;
        }
      }
      if (x.status === 'v2-failed') errors.push(`v2 1단계 실패 유지: ${JSON.stringify(read(`${v2}/${id}--stage1-contract-error.json`))}`);
      else if (x.target) {
        if (!existsSync(`${root}/${id}--final.json`)) errors.push('v3 final.json 없음');
        else if (!globalErrors.length) {
          const final = read(`${root}/${id}--final.json`); verifyFinal(x, final);
          if (!errors.length) results.push(final);
        }
      } else if (!globalErrors.length) {
        const final = read(`${v2}/${id}--final.json`), previousInput = read(`${v2}/inputs.json`).find(p => p.paragraphId === id);
        assert.deepEqual(x.stage2Input, stage2InputFor(final.stage1));
        verifyV2(previousInput, final, t);
        if (!errors.length) results.push(final);
      }
    } catch (error) { errors.push(error.message); }
    if (errors.length) failed.push({ paragraphId: id, errors });
  }
  const versions = ['operational', 'v1', 'v2', 'v3'];
  const axesFor = (id, version) => version === 'v3' ? results.find(r => r.paragraphId === id)?.axes : comparisons.get(id)?.[version];
  const successfulIds = results.map(r => r.paragraphId);
  const counts = ids => Object.fromEntries(versions.map(version => [version, ids.reduce((n, id) => n + (axesFor(id, version)?.length ?? 0), 0)]));
  const singleLists = Object.fromEntries(versions.map(version => [version, successfulIds.filter(id => axesFor(id, version)?.length === 1)]));
  const paragraphAxisCounts = inputs.map(x => ({ paragraphId: x.paragraphId, ...Object.fromEntries(versions.map(version => [version, axesFor(x.paragraphId, version)?.length ?? null])) }));
  const summary = { paragraphs: inputs.length, succeeded: results.length, failed, globalErrors,
    comparisonScope: 'successful-new-paragraphs', axes: counts(successfulIds), allAvailableAxes: counts(inputs.map(x => x.paragraphId)),
    paragraphAxisCounts, singleAxisParagraphs: Object.fromEntries(versions.map(version => [version, singleLists[version].length])), singleAxisParagraphLists: singleLists,
    v2ToV3TargetAxisChanges: paragraphAxisCounts.filter(x => expectedTargets.includes(x.paragraphId)).map(x => ({ paragraphId: x.paragraphId, v2: x.v2, v3: x.v3, delta: x.v2 !== null && x.v3 !== null ? x.v3 - x.v2 : null })),
    humanJudgments: Object.entries(human).map(([paragraphId, judgment]) => {
      const axes = axesFor(paragraphId, 'v3');
      return { paragraphId, judgment, v3Axes: axes?.length ?? null, matches: judgment === '경계' || !axes ? null : axes.length === 1 };
    }),
    reusedV2Paragraphs: results.filter(r => !expectedTargets.includes(r.paragraphId)).length,
    openaiCalls, usage, usageScope: 'v3-target-stage2-only; reused v2 usage excluded', wireErrors, productionEligible: false };
  mkdirSync(root, { recursive: true }); save('summary.json', summary);
  const axesMd = axes => axes ? axes.map(a => `- **${a.id} L1:** ${a.description}\n  - **L2:** ${a.metaAxis}\n`).join('') : '실패 또는 결과 미생성\n';
  let md = '# 중심 이야기 두 단계 생성 v3 — 사람 검토 자료\n\n구조 계약 통과는 의미 품질 검증이 아니다. 대상 4문단만 새 결과를 쓰고 비대상 20문단은 v2 결과를 재사용하며 법인2는 실패로 유지한다. 집계는 v3 성공 문단 기준이다. 사용량은 새 2단계 호출만 포함한다.\n\n';
  if (globalErrors.length) md += `**전체 검증 오류:** ${JSON.stringify(globalErrors)}\n\n`;
  for (const x of inputs.filter(x => expectedTargets.includes(x.paragraphId))) {
    const r = results.find(r => r.paragraphId === x.paragraphId), f = failed.find(f => f.paragraphId === x.paragraphId), s = x.stage1;
    md += `## ${x.title} (${x.paragraphId}, ${x.position}문단)\n\n**원문**\n\n`;
    md += x.stage1Input.sentences.map(s => `- ${s.id}: ${s.text}\n`).join('');
    if (s && Array.isArray(s.explanationUnits) && Array.isArray(s.sentenceAssignments)) {
      md += `\n**보강본**\n\n${s.revisedCentralStory}\n\n**설명 단위**\n\n` + s.explanationUnits.map(u => `- ${u.id}: ${u.summary}\n`).join('');
      md += '\n**문장 배정**\n\n' + s.sentenceAssignments.map(a => `- ${a.sentenceId} → ${a.unit}: ${a.reason}\n`).join('');
      md += `\n**minimumAxes:** v2 ${x.v2MinimumAxes} → v3 ${x.stage2Input?.minimumAxes}\n\n`;
    }
    if (!r) md += `\n**실패:** ${JSON.stringify(f?.errors ?? globalErrors)}\n\n`;
    md += `### v2\n\n${axesMd(comparisons.get(x.paragraphId)?.v2)}\n### v3\n\n${axesMd(r?.axes)}\n`;
  }
  md += '## 25문단 축 수\n\n| 문단 | 운영 골드 | v1 | v2 | v3 |\n|---|---:|---:|---:|---:|\n';
  for (const row of paragraphAxisCounts) md += `| ${row.paragraphId} | ${versions.map(v => row[v] ?? '실패/미생성').join(' | ')} |\n`;
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
