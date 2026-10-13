import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { zodTextFormat } from 'openai/helpers/zod';
import { sha, casesFromRecord } from './natural-response-disagreement.mjs';
import { ShadowSchema, AttributionSchema, summarizeV4 } from './holistic-verdict-shadow-contract.mjs';

export const ROOT = 'docs/experiments/holistic-verdict-shadow-2026-10-08';
export const A_ROOT = 'docs/experiments/natural-response-disagreement-v1-2026-09-21';
export const LOG = '.omc/logs/dialogue-experiment/sessions.jsonl';
export const read = path => JSON.parse(readFileSync(path, 'utf8'));
export const jsonLines = path => existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
export const PARAMETERS = ['model', 'reasoning', 'service_tier', 'max_output_tokens', 'store'];
const PROBE_HASHES = { 'PROBE-REVIEW.md': '633f97c4805e25692c033981c7540092409cf53b4ca38591df4e7c3f0bf70714',
  'PROBE-KEY.md': '23a9388fa28ae85e76b3685c6b46562a1c9fae1bee9859e80c35d4a1ae9956ef' };
const PARAGRAPHS = { A: 'gongsun-long-later-mohists-p2', B: 'corporate-law-p2', C: 'dopamine-motor-control-p2',
  D: 'information-asymmetry-free-marketplace-p1', E: 'surface-tension-laplace-p5' };
export function parseProbes(text) {
  let paragraphId; const probes = [];
  for (const section of text.split(/(?=^## 문단 [A-E] —)/mu).slice(1)) {
    paragraphId = PARAGRAPHS[section.match(/^## 문단 ([A-E]) —/u)[1]];
    for (const block of section.split(/(?=^### T\d{2}$)/mu).slice(1)) {
      const pointId = block.match(/^### (T\d{2})$/mu)[1];
      const text = block.match(/^> (.*)$/mu)?.[1];
      // Do not let an empty value consume the following line.
      const exactField = label => block.match(new RegExp(`^- ${label}:[ \\t]*([^\\n]*)$`, 'mu'))?.[1]?.trim() ?? '';
      const verdict = exactField('판정'), question = exactField('질문 필요');
      assert.ok(text && ['충분','미확인','오류'].includes(verdict), pointId);
      assert.ok(['예','아니오'].includes(question), pointId);
      probes.push({ pointId, paragraphId, response: text, human: { verdict, questionWorthy: question === '예',
        errorQuote: exactField('오류 인용'), question: exactField('질문한다면 무엇을'),
        reason: exactField('판정 근거'), unnatural: exactField('부자연스러움') } });
    }
  }
  assert.deepEqual(probes.map(p => p.pointId), Array.from({length:13}, (_,i) => `T${String(i+1).padStart(2,'0')}`));
  assert.deepEqual(probes.filter(p=>p.human.verdict==='충분'&&!p.human.questionWorthy).map(p=>p.pointId), ['T03','T05','T07','T09','T10','T11','T12']);
  assert.deepEqual(probes.filter(p=>p.human.verdict==='오류').map(p=>p.pointId), ['T01','T06','T13']);
  return probes;
}
const student = text => ({ role: 'student', text });
export function dialogueFor(initialResponse, history) {
  return [student(initialResponse), ...history.flatMap(h => [
    { role:'tutor_question', text:h.question.text, note:'대화 맥락, 판정 기준 아님' }, student(h.answer) ])];
}
const slimAxes = axes => axes?.map(({axisId,status,reason})=>({axisId,status,reason})) ?? null;
const errorClaims = raw => raw?.errorClaims ?? [];
export function loadInputs() {
  const hashes = {}, freeze = path => { hashes[path] = sha(readFileSync(path)); return hashes[path]; };
  for (const [name, hash] of Object.entries(PROBE_HASHES)) assert.equal(freeze(`${ROOT}/${name}`), hash, `${name} hash mismatch`);
  // PLAN은 결과 기록으로 계속 고쳐지므로 고정하지 않는다.
  for (const name of ['shadow-instructions.md','attribution-instructions.md']) freeze(`${ROOT}/${name}`);
  // Freeze the existing evidence folder, not the current V4 runtime.
  for (const name of readdirSync(A_ROOT).sort()) if (!name.startsWith('.')) {
    // The evidence folder contains regular files only.
    freeze(`${A_ROOT}/${name}`);
  }
  // 운영 로그는 계속 덧붙여지므로 파일 전체가 아니라 선택한 줄의 해시(points.sourceLineHash)로 고정한다.
  const records = read(`${A_ROOT}/records.json`), cases = read(`${A_ROOT}/cases.json`);
  assert.equal(records.length,31);
  assert.deepEqual(records.flatMap(casesFromRecord).map((c,i)=>({id:`N${String(i+1).padStart(2,'0')}`,...c})),cases);
  assert.equal(cases.length,45); assert.equal(cases.filter(c=>c.stratum==='initial').length,31);
  const aRequests = jsonLines(`${A_ROOT}/requests.jsonl`).filter(q=>q.arm==='v4');
  const aResults = jsonLines(`${A_ROOT}/results.jsonl`).filter(r=>r.arm==='v4');
  const aResponses = jsonLines(`${A_ROOT}/responses.jsonl`).filter(r=>r.arm==='v4');
  assert.equal(aRequests.length,45); assert.equal(aResults.length,45);
  const parameters = Object.fromEntries(PARAMETERS.map(k=>[k,aRequests[0].request[k]]));
  for (const q of aRequests) assert.deepEqual(Object.fromEntries(PARAMETERS.map(k=>[k,q.request[k]])), parameters);
  const aIds = new Set(records.map(r=>r.row.sessionId));
  const selectedB = readFileSync(LOG,'utf8').split('\n').map((line,i)=>({line,sourceLine:i+1})).filter(x=>x.line).map(x=>({...x,row:JSON.parse(x.line)}))
    .filter(x=>JSON.stringify(x.row).includes('axis-dialogue-selective-v4')&&!aIds.has(x.row.sessionId));
  assert.equal(selectedB.length,14); assert.equal(new Set(selectedB.map(x=>x.row.sessionId)).size,14);
  const probes = parseProbes(readFileSync(`${ROOT}/PROBE-REVIEW.md`,'utf8'));
  const sources = {};
  for (const paragraphId of new Set([...cases, ...selectedB.map(x=>x.row), ...probes].map(x=>x.paragraphId))) {
    const goldPath=`packages/pipeline/fixtures/experiments/dialogue/gold-v2/${paragraphId}.json`;
    const passagePath=`packages/pipeline/fixtures/experiments/dialogue/passages/${paragraphId.replace(/-p\d+$/u,'')}.json`;
    const gold=read(goldPath), passage=read(passagePath);
    assert.equal(gold.paragraphText,passage.paragraphs.find(p=>p.paragraphId===paragraphId).text);
    const goldHash=freeze(goldPath); freeze(passagePath);
    sources[paragraphId]={gold,passage,goldHash,goldPath,passagePath};
  }
  const points = cases.map(c=>{
    const r=aResults.find(r=>r.caseId===c.id), q=aRequests.find(q=>q.caseId===c.id), call=aResponses.find(r=>r.caseId===c.id);
    assert.ok(r&&q); assert.equal(JSON.parse(q.request.input).paragraphText,sources[c.paragraphId].gold.paragraphText);
    assert.deepEqual(JSON.parse(q.request.input).centralAxes,sources[c.paragraphId].gold.centralAxes.map(({id,description})=>({id,description})));
    return {pointId:`A-${c.id}`,source:'A',paragraphId:c.paragraphId,sessionId:c.sessionId,turn:c.turn,stratum:c.stratum,
      dialogue:dialogueFor(c.initialResponse,c.history),sourceLine:c.sourceLine,sourceLineHash:c.sourceLineHash,
      requestFormatName:q.request.text.format.name, v4:{overall:summarizeV4(r.validatedAxes,r.contractError),axes:slimAxes(r.validatedAxes),
        errorClaims:errorClaims(r.validatedResult),contractError:r.contractError,recordedCalls:[call ? {id:call.id,durationMs:call.durationMs,costUsd:call.costUsd,usage:call.response?.usage ?? null} : {id:q.id}]}};
  });
  for (const record of selectedB) {
    const {row}=record, history=[]; let count=0;
    for (const [i,t] of row.turns.entries()) {
      if (t.evaluation) {
        assert.equal(t.call.goldHash,`sha256:${sources[row.paragraphId].goldHash}`,`B gold hash: ${row.sessionId}, ${i+1}`);
        assert.ok(t.call.schemaVersion); count++;
        const axes=slimAxes(t.evaluation.snapshot.axisFeedback);
        points.push({pointId:`B-${row.sessionId}-t${i+1}`,source:'B',paragraphId:row.paragraphId,sessionId:row.sessionId,
          turn:count,stratum:count===1?'initial':'followup',dialogue:dialogueFor(row.initialResponse,history),
          sourceLine:record.sourceLine,sourceLineHash:sha(record.line),schemaVersion:t.call.schemaVersion,
          v4:{overall:summarizeV4(axes),axes,errorClaims:errorClaims(t.call.decisionAudit?.validatedResult ?? t.call.decisionAudit?.rawResult),
            contractError:null,recordedCalls:[{durationMs:t.call.durationMs,usage:t.call.usage,stages:t.call.stages?.map(({stage,durationMs,usage})=>({stage,durationMs,usage}))}]}});
      }
      if (i+1<row.turns.length) {
        assert.ok(t.questionShown?.trim()&&typeof t.studentAnswer==='string',`B dialogue gap: ${row.sessionId}, ${i+1}`);
        history.push({question:{text:t.questionShown},answer:t.studentAnswer});
      }
    }
  }
  assert.equal(points.filter(p=>p.source==='B').length,27);
  assert.equal(points.filter(p=>p.source==='B'&&p.stratum==='initial').length,14);
  points.push(...probes.map(p=>({pointId:p.pointId,source:'probe',paragraphId:p.paragraphId,sessionId:`probe-${p.pointId}`,
    turn:1,stratum:'initial',dialogue:[student(p.response)],v4:null})));
  assert.equal(points.length,85); assert.equal(new Set(points.map(p=>p.pointId)).size,85);
  return {points,sources,probes,parameters,aRequests,cases,hashes,
    instructions:readFileSync(`${ROOT}/shadow-instructions.md`,'utf8'), attributionInstructions:readFileSync(`${ROOT}/attribution-instructions.md`,'utf8')};
}
export function shadowInput(point, source, variant) {
  const input = {passage:{title:source.passage.title,paragraphs:source.passage.paragraphs.map(({paragraphId,text})=>({paragraphId,text}))},
    targetParagraphId:point.paragraphId,targetParagraphText:source.gold.paragraphText,dialogue:point.dialogue};
  if (variant==='H1') input.referenceInterpretation=source.gold.centralAxes.map(a=>a.description).join(' ');
  return input;
}
export function buildJobs(bundle) {
  const {points,sources,parameters,aRequests,cases}=bundle;
  const jobs=points.flatMap(p=>['H0','H1'].map(arm=>({id:`${p.pointId}-${arm}`,pointId:p.pointId,kind:'shadow',arm,
    request:{...parameters,instructions:bundle.instructions,input:JSON.stringify(shadowInput(p,sources[p.paragraphId],arm)),
      text:{format:zodTextFormat(ShadowSchema,'holistic_verdict_shadow')}}})));
  for (const p of points) {
    const h0=jobs.find(j=>j.id===`${p.pointId}-H0`),h1=jobs.find(j=>j.id===`${p.pointId}-H1`);
    const input=JSON.parse(h1.request.input); delete input.referenceInterpretation;
    assert.deepEqual({...h1.request,input:JSON.stringify(input)},h0.request);
  }
  for (const p of points.filter(p=>p.source==='probe')) {
    const template=aRequests.find(q=>cases.some(c=>c.id===q.caseId&&c.paragraphId===p.paragraphId&&c.turn===1));
    assert.ok(template,`missing V4 template: ${p.paragraphId}`);
    const request=structuredClone(template.request),before=JSON.parse(request.input),input=structuredClone(before);
    assert.deepEqual(input.evidence.followUpExchanges,[]); assert.equal(input.evidence.previousAxisStates,null);
    input.evidence.initialResponse=p.dialogue[0].text;
    request.input=JSON.stringify(input,null,2);
    const stripped=structuredClone(input); stripped.evidence.initialResponse=before.evidence.initialResponse;
    assert.deepEqual(stripped,before); assert.equal(request.instructions,template.request.instructions);
    assert.equal(JSON.stringify(request.text.format),JSON.stringify(template.request.text.format));
    jobs.push({id:`${p.pointId}-V4`,pointId:p.pointId,kind:'v4',arm:'V4',templateId:template.id,request});
  }
  assert.equal(jobs.length,183); return jobs;
}
export function attributionJob(bundle, point, arm, shadow) {
  const gold=bundle.sources[point.paragraphId].gold;
  return {id:`${point.pointId}-${arm}-attribution`,pointId:point.pointId,arm,kind:'attribution',request:{...bundle.parameters,
    instructions:bundle.attributionInstructions,input:JSON.stringify({targetParagraphText:gold.paragraphText,
      centralAxes:gold.centralAxes.map(({id,description})=>({id,description})),brokenRelation:shadow.brokenRelation,unconfirmed:shadow.unconfirmed}),
    text:{format:zodTextFormat(AttributionSchema,'holistic_axis_attribution')}}};
}
export function checkApproval(id, directory='memory/decisions') {
  assert.match(id??'',/^D-\d{4}$/u,'run requires a transfer approval decision ID');
  assert.ok(Number(id.slice(2))>101,'D-0101 is design approval, not transfer approval');
  const names=readdirSync(directory).filter(n=>n.startsWith(`${id}-`)&&n.endsWith('.md'));
  assert.equal(names.length,1,'transfer approval decision not found or ambiguous');
  const text=readFileSync(`${directory}/${names[0]}`,'utf8'),frontmatter=text.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1];
  assert.ok(frontmatter,'approval frontmatter missing');
  const field=k=>frontmatter.match(new RegExp(`^${k}:[ \\t]*([^\\r\\n]+)$`,'mu'))?.[1]?.trim().replace(/^['"]|['"]$/gu,'');
  assert.equal(field('id'),id); assert.equal(field('status'),'accepted','transfer approval must be accepted');
  const scope=field('scope'); assert.ok(scope?.startsWith('holistic-verdict-shadow-')&&scope.includes('transfer'),'transfer scope mismatch');
  return {id,path:`${directory}/${names[0]}`,sha256:sha(text),scope};
}
