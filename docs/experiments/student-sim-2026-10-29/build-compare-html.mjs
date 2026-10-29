// 1단계(v4.8·v5.6) 기록과 재실행(v4.9·v5.7) 기록을 세션별로 나란히 놓은 비교 HTML을 만든다.
// 사용: node docs/experiments/student-sim-2026-10-29/build-compare-html.mjs
// 입력은 각 run 폴더의 run.json과 logs/*.jsonl뿐이다(외부 호출 없음).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(DIR, 'compare-v49-v57.html');
const runs = {
  paraOld: resolve(DIR, 'mrna-para'), paraNew: resolve(DIR, 'v49-para'),
  probOld: resolve(DIR, 'mrna-prob'), probNew: resolve(DIR, 'v57-prob'),
};
const json = p => JSON.parse(readFileSync(p, 'utf8'));
const jsonl = p => existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
const CIRCLED = '①②③④⑤';

// ---------- 문단 ----------
function paraSessions(dir) {
  if (!existsSync(resolve(dir, 'run.json'))) return {};
  const run = json(resolve(dir, 'run.json'));
  const recs = jsonl(resolve(dir, 'logs/dialogue/sessions.jsonl'));
  const out = {};
  for (const [key, s] of Object.entries(run.sessions)) {
    if (s.kind !== 'para') continue;
    const mine = recs.filter(r => r.sessionId === s.sessionId && r.paragraphIndex === s.paragraphIndex);
    const last = mine.at(-1);
    out[key] = { key, label: s.label, paragraphIndex: s.paragraphIndex, transcript: last?.transcript ?? [],
      steps: mine.filter(r => r.step).map(r => r.step), failures: mine.filter(r => r.event !== 'STEP').map(r => r.error).filter(Boolean) };
  }
  return out;
}
function paraBubble(m, hl = false) {
  if (m.kind === 'WAIT_DONE') return '';
  if (m.role === 'student') return `<div class="b stu${hl ? ' hl' : ''}"><div class="lab">${esc(m.label)}</div>${rich(m.text)}</div>`;
  let h = `<div class="b tut${hl ? ' hl' : ''}"><div class="lab">${esc(m.label)}</div>`;
  if (m.quote) h += `<blockquote>${esc(m.quote)}</blockquote>`;
  if (m.text) h += `<p>${rich(m.text)}</p>`;
  if (m.items?.length) h += `<ol class="q">${m.items.map(q => `<li>${esc(q)}</li>`).join('')}</ol>`;
  if (m.parts?.length) h += `<div class="box"><div class="boxt">${esc(m.partsTitle ?? '문단 핵심')}</div><ol>${m.parts.map((p, i) => `<li>${esc(p)}${m.partTags?.[i] ? ` <span class="tag">${esc(m.partTags[i])}</span>` : ''}</li>`).join('')}</ol></div>`;
  return h + '</div>';
}
function paraSteps(steps) {
  return `<details class="dev"><summary>판정 기록(개발자용)</summary><table><tr><th>단계</th><th>action</th><th>category</th><th>담음</th><th>질문 점검</th><th>재요청</th></tr>${steps.map(st => {
    const o = st.output; const gr = o.gaps?.length ? o.gaps.map((g, i) => `${i + 1}:${g.givesRelation === undefined ? '-' : g.givesRelation ? '관계 줌' : '안 줌'}`).join(' ') : '';
    const read = o.targetGapReadings?.length ? `<div class="read">합쳐 읽기: ${o.targetGapReadings.map(esc).join(' / ')}</div>` : '';
    return `<tr><td>${esc(st.stage)}</td><td>${esc(st.action)}</td><td>${esc(o.category)}</td><td>${esc(JSON.stringify(o.corePartsCovered))}</td><td>${gr}</td><td>${st.validationFailures?.length ?? 0}</td></tr>${read ? `<tr><td colspan="6">${read}</td></tr>` : ''}`;
  }).join('')}</table></details>`;
}
function flow(title, cls, bubbles, dev) {
  return `<div class="col ${cls}"><h4>${title}</h4>${bubbles || '<p class="none">기록 없음(아직 실행 전)</p>'}${dev}</div>`;
}

// ---------- 문제 ----------
function probSessions(dir) {
  if (!existsSync(resolve(dir, 'run.json'))) return { sessions: {}, source: null };
  const run = json(resolve(dir, 'run.json'));
  const recs = jsonl(resolve(dir, 'logs/problem-feedback/events.jsonl'));
  const out = {}; let source = null;
  for (const [key, s] of Object.entries(run.sessions)) {
    if (s.kind !== 'prob') continue;
    const mine = recs.filter(r => r.session?.sessionId === s.sessionId);
    const last = mine.at(-1); if (!last) continue;
    source ??= last.session.source;
    out[key] = { key, label: s.label, transcript: last.transcript, session: last.session };
  }
  return { sessions: out, source };
}
function probBubble(m, s, hl = false) {
  if (m.kind === 'WAIT_DONE') return '';
  if (m.role === 'STUDENT') return `<div class="b stu${hl ? ' hl' : ''}"><div class="lab">학생</div>${rich(m.text)}</div>`;
  // A correction question shows the passage/scenario span the screen highlights for it.
  const err = [...s.errors, ...s.additionalErrors].find(e => e.question && m.text.includes(e.question));
  const mark = err ? `<div class="mark"><span class="lab">지문 표시</span> ${err.sourceEvidence.filter(x => x.location !== 'CHOICE' && !String(x.location).startsWith('CHOICE')).map(x => esc(x.quote)).join(' / ')}</div>` : '';
  return `<div class="b tut${m.sequence === 'GATE' ? ' gate' : ''}${err ? ' cq' : ''}${hl ? ' hl' : ''}">${rich(m.text)}${mark}</div>`;
}
function probDev(s) {
  const errs = [...s.errors, ...s.additionalErrors];
  const sel = s.assessments.filter(a => a.mode === 'SELECTION');
  const rep = s.assessments.filter(a => a.mode === 'REPAIR');
  return `<details class="dev"><summary>판정 기록(개발자용)</summary><ul>
    ${sel.map((a, i) => `<li>선택 판정 ${i + 1}: ${esc(a.reconstructability)} · ${esc(a.contentAssessment)}${a.insufficiencyKind !== 'NONE' ? '/' + esc(a.insufficiencyKind) : ''} · 오류 ${a.errors.length}개</li>`).join('')}
    ${errs.map(e => `<li>오류 ${esc(e.errorId)} (${esc(e.errorType)}${e.basis ? '·' + esc(e.basis) : ''}) → 최종 ${esc(e.status)}</li>`).join('')}
    ${rep.map((a, i) => `<li>교정 판정 ${i + 1}: ${a.repairs.map(r => `${esc(r.errorId)}=${esc(r.status)}`).join(', ')}</li>`).join('')}
    <li>결과: ${esc(s.result?.outcome ?? s.phase)}</li></ul></details>`;
}

// ---------- 조립 ----------
const pOld = paraSessions(runs.paraOld), pNew = paraSessions(runs.paraNew);
const { sessions: qOld, source: src1 } = probSessions(runs.probOld);
const { sessions: qNew, source: src2 } = probSessions(runs.probNew);
const source = src1 ?? src2;
const paragraphs = source.passage.split(/\n+/);
const newByOld = (news, oldKey) => Object.values(news).find(n => n.label === `${oldKey}-v49` || n.label === `${oldKey}-v57`);

// 판단 필요 표시: 세션 → 판단 번호, 카드 설명, 새 버전 칸에서 테두리를 칠 말풍선.
const JUDGE = {
  'para-29': { j: 1, note: '학생이 1번에 배열을 자기 말로 쓴 뒤 2번에 "차단". 이 부분의 핵심은 \'막는다\'라는 결과이고 학생이 그 술어를 말했으므로 담음이 맞다(결정).' },
  'para-31': { j: 1, note: '2번 "차단"은 담음으로 본다(결정). 1번이 비어 빈 곳 마무리로 끝난 흐름도 맞다.' },
  'para-33': { j: 1, note: '2번 "막음?"은 담음으로 본다(결정). 1번 "잘 모르겠음"이라 빈 곳 마무리로 끝났다.' },
  'para-36': { j: 1, note: '학생이 첫 요약에서 배열까지 말한 뒤 "차단". 담음으로 본다(결정).' },
  'para-6': { j: 2, note: '핵심 부분을 1개로 잡아, 주체를 바꾼 첫 요약("바이러스가 … 항원으로 인식")이 질문 없이 칭찬으로 끝남.', hl: (m, i, all) => i === all.length - 1 },
  'para-50': { j: 2, note: '"낮은 산도에서 … 산도를 높여"(원문은 pH 기준, 방향 반대)가 질문 없이 칭찬. 1단계는 교정 질문.', hl: (m, i, all) => i === all.length - 1 },
  'para-51': { j: 2, note: 'para-50과 같은 첫 요약, 같은 결과.', hl: (m, i, all) => i === all.length - 1 },
  'prob-5': { j: 3, note: '표시 문장을 옮겨 쓰면 답이 되고 질문이 두 가지를 물음 → 수용 가능(사용자 판정).' },
  'prob-6': { j: 3, note: '표시 문장을 옮겨 쓰면 답이 됨 → 문제 없음(사용자 판정).' },
  'prob-8': { j: 3, note: '표시 문장(낮은 pH → 양이온화)을 이어야 답, 학생은 고집 → 문제 없음(사용자 판정).' },
  'prob-9': { j: 3, note: '표시는 낮은 pH 문장이라 뒤집어 생각해야 답, 학생 "모르겠음" → 미확인 → 문제 없음(사용자 판정).' },
  'prob-10': { j: 3, note: '추측 답 "중성 되나 봄"이 "고쳤어"로 인정됨 → 수용(사용자 판정: 추측을 미확인으로 몰아세우는 것이 더 위험).', },
};
const JUDGE_TITLE = { 1: '판단 1 · 결정됨(문제 아님)', 2: '판단 2 · 질문 없이 끝난 세션의 원인', 3: '판단 3 · 결정됨(그대로 둠)' };
const badge = k => JUDGE[k] ? `<div class="jnote"><b>${JUDGE_TITLE[JUDGE[k].j]}</b> — ${esc(JUDGE[k].note)}</div>` : '';

const PARA_TARGETS = ['para-5', 'para-6', 'para-7', 'para-8', 'para-9', 'para-12', 'para-15', 'para-16', 'para-17', 'para-18', 'para-19', 'para-20', 'para-21', 'para-22', 'para-23', 'para-27', 'para-28', 'para-29', 'para-30', 'para-31', 'para-33', 'para-35', 'para-36', 'para-41', 'para-42', 'para-43', 'para-45', 'para-46', 'para-47', 'para-48', 'para-50', 'para-51', 'para-53', 'para-54', 'para-55', 'para-57', 'para-59', 'para-60'];
const PROB_TARGETS = ['prob-5', 'prob-6', 'prob-8', 'prob-9', 'prob-10'];

let paraHtml = '', toc = '';
for (let pi = 0; pi < 5; pi++) {
  const keys = PARA_TARGETS.filter(k => pOld[k]?.paragraphIndex === pi);
  if (!keys.length) continue;
  toc += `<a href="#p${pi + 1}">문단 ${pi + 1}</a>`;
  paraHtml += `<section id="p${pi + 1}"><h2>문단 ${pi + 1}</h2><div class="src"><div class="lab">원문</div>${esc(paragraphs[pi])}</div>`;
  for (const k of keys) {
    const o = pOld[k], n = newByOld(pNew, k);
    const nv = n ? n.transcript.filter(m => m.kind !== 'WAIT_DONE') : [];
    paraHtml += `<article id="${k}"${JUDGE[k] ? ` class="judge j${JUDGE[k].j}"` : ''}><h3>${esc(k)} <span class="meta">${esc(o.label)}</span></h3>${badge(k)}<div class="cols">
      ${flow('기존 v4.8', 'old', o.transcript.map(m => paraBubble(m)).join(''), paraSteps(o.steps))}
      ${flow('v4.9', 'new', nv.map((m, i) => paraBubble(m, !!JUDGE[k]?.hl?.(m, i, nv))).join(''), n ? paraSteps(n.steps) : '')}</div></article>`;
  }
  paraHtml += '</section>';
}
toc += '<a href="#q19">문제 19번</a>';
toc = '<a href="#judge">판단 필요</a>' + toc;
const answerPos = source.choices.find(c => c.choiceId === source.answerChoiceId).position;
let probHtml = `<section id="q19"><h2>문제 ${esc(source.questionNumber)}번</h2><div class="src">
  <div class="lab">발문</div><p>${esc(source.stem)}</p>
  <div class="lab">&lt;보기&gt;</div><p>${esc(source.scenario)}</p>
  ${source.media.map(m => `<img src="${esc(m.url)}" alt="&lt;보기&gt; 그림" loading="lazy">`).join('')}
  <div class="lab">선지</div><ol class="choices">${source.choices.map(c => `<li${c.choiceId === source.answerChoiceId ? ' class="ans"' : ''}><b>${CIRCLED[c.position - 1]}</b> ${esc(c.text)}</li>`).join('')}</ol>
  <p class="ansline">정답: ${CIRCLED[answerPos - 1]}</p>
  <details><summary>지문 전체</summary><p>${paragraphs.map(esc).join('</p><p>')}</p></details></div>`;
for (const k of PROB_TARGETS) {
  const o = qOld[k], n = newByOld(qNew, k); if (!o) continue;
  probHtml += `<article id="${k}"${JUDGE[k] ? ` class="judge j${JUDGE[k].j}"` : ''}><h3>${esc(k)} <span class="meta">${esc(o.label)}</span></h3>${badge(k)}<div class="cols">
    ${flow('기존 v5.6', 'old', o.transcript.map(m => probBubble(m, o.session)).join(''), probDev(o.session))}
    ${flow('v5.7', 'new', n ? n.transcript.map(m => probBubble(m, n.session, !!JUDGE[k]?.hl?.(m))).join('') : '', n ? probDev(n.session) : '')}</div></article>`;
}
probHtml += '</section>';

const css = `
:root{--bg:#fafaf8;--fg:#1d1d1b;--muted:#6b6b66;--card:#fff;--line:#e3e2dc;--stu:#e8f0fb;--tut:#f3f2ee;--old:#9a6b2f;--new:#2f7a55;--box:#fffbe8;--gate:#fdf1e7}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#171716;--fg:#e9e8e3;--muted:#a3a29b;--card:#22221f;--line:#3a3a35;--stu:#1f2c3d;--tut:#2a2a26;--old:#d6a35e;--new:#6cc79a;--box:#33301f;--gate:#3a2c20}}
:root[data-theme="dark"]{--bg:#171716;--fg:#e9e8e3;--muted:#a3a29b;--card:#22221f;--line:#3a3a35;--stu:#1f2c3d;--tut:#2a2a26;--old:#d6a35e;--new:#6cc79a;--box:#33301f;--gate:#3a2c20}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 -apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}
main{max-width:1200px;margin:0 auto;padding:16px}h1{font-size:22px;margin:8px 0}h2{font-size:19px;border-bottom:2px solid var(--line);padding-bottom:4px;margin-top:40px}h3{font-size:16px;margin:0 0 8px}h4{margin:0 0 8px;font-size:14px}
.intro{color:var(--muted);font-size:14px}nav{position:sticky;top:0;background:var(--bg);padding:8px 0;display:flex;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--line);z-index:1}nav a{color:var(--fg)}
.src{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;margin:12px 0}.src img{max-width:100%;height:auto;display:block;margin:8px 0}
.lab{font-size:12px;color:var(--muted);font-weight:600}.meta{font-weight:400;color:var(--muted);font-size:13px}
article{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;margin:14px 0}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media (max-width:760px){.cols{grid-template-columns:1fr}}
.col{min-width:0}.col.old h4{color:var(--old)}.col.new h4{color:var(--new)}
.b{border-radius:10px;padding:8px 10px;margin:6px 0;overflow-wrap:anywhere}.b p{margin:2px 0}.stu{background:var(--stu);margin-left:12%}.tut{background:var(--tut);margin-right:6%}.gate{background:var(--gate)}
.q{margin:4px 0 0;padding-left:20px;font-weight:600}.box{background:var(--box);border-radius:6px;padding:6px 8px;margin-top:6px;font-size:14px}.box ol{margin:4px 0;padding-left:20px}.boxt{font-size:12px;font-weight:600}
.tag{color:var(--muted);font-size:12px}blockquote{margin:4px 0;padding-left:8px;border-left:3px solid var(--line);color:var(--muted)}
.dev{font-size:12px;color:var(--muted);margin-top:6px}.dev table{border-collapse:collapse;width:100%;display:block;overflow-x:auto}.dev td,.dev th{border:1px solid var(--line);padding:2px 4px;text-align:left;white-space:nowrap}.read{white-space:normal}
.sum{border-collapse:collapse;font-size:14px;margin-top:6px;display:block;overflow-x:auto}.sum td,.sum th{border:1px solid var(--line);padding:3px 8px;text-align:left}
.jbox{border-radius:8px;padding:10px 12px;margin:12px 0;border-left:5px solid}.jbox h3{margin-bottom:4px}
.j1{--jc:#8a8a82}.j2{--jc:#7d3c98}.j3{--jc:#8a8a82}.jbox,.judge{border-color:var(--jc)}.jbox{background:var(--card);border-top:1px solid var(--line);border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
article.judge{border-left:5px solid var(--jc)}.jnote{font-size:14px;margin:0 0 8px;padding:6px 8px;border-radius:6px;background:var(--box)}.jnote b{color:var(--jc)}
.hl{outline:2px solid var(--jc);outline-offset:1px}.cq .mark{font-size:12px;margin-top:6px;padding-top:4px;border-top:1px dashed var(--line);color:var(--muted)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .j1{--jc:#9c9b94}:root:not([data-theme="light"]) .j2{--jc:#c79bdf}:root:not([data-theme="light"]) .j3{--jc:#9c9b94}}
.none{color:var(--muted);font-style:italic}.choices{padding-left:4px;list-style:none}.choices li{margin:3px 0}.ans{font-weight:600}.ansline{font-weight:600}`;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>질문 흘림 전후 비교</title><style>${css}</style></head><body><main>
<h1>질문 흘림 전후 비교: 문단 v4.8→v4.9 · 문제 v5.6→v5.7</h1>
<p class="intro">mRNA 지문(학생 역할 시뮬레이션 1단계, 2026-10-29). 왼쪽은 1단계 기록, 오른쪽은 같은 첫 응답을 새 지시문으로 다시 돌린 기록입니다. 첫 응답은 글자 그대로 같고, 새 질문에는 시뮬레이션 학생이 1단계와 같은 답하기 유형(예: 이름만)으로 답했습니다. 판정 모델: 문단 luna, 문제 정답 luna·오답 sol. 대기 말풍선("생각이 끝났어" 등)은 뺐습니다. 생성: build-compare-html.mjs</p>
<div class="src"><div class="lab">요약 (검토 에이전트 판정, 코드: C1 질문이 답을 흘림 · C2 개념 이름만 대도 답처럼 보임 · A1 판정이 원문과 어긋남)</div>
<table class="sum"><tr><th></th><th>기존</th><th>새 버전</th></tr>
<tr><td>문단 C1 (38세션)</td><td>13</td><td>10 (확신 낮음 6 포함)</td></tr>
<tr><td>문단 C2</td><td>10</td><td>5 (그중 4는 판단 1 결정으로 문제 아님 → 1)</td></tr>
<tr><td>문단 A1</td><td>8</td><td>4</td></tr>
<tr><td>문단: 낱말 하나로 통과하던 세션</td><td>10</td><td>3 (나머지 7은 빈 곳 마무리·바로잡기)</td></tr>
<tr><td>문단: 질문 없이 끝난 세션</td><td>0</td><td>3 (para-6·50·51)</td></tr>
<tr><td>문제: 원문 답 표현을 보기로 준 교정 질문</td><td>6/6</td><td>0/6</td></tr>
<tr><td>문제: 교정 결과(고침/남음/미확인)</td><td>4/1/1</td><td>4/1/1</td></tr>
<tr><td>재요청(검증 실패)</td><td>-</td><td>0</td></tr>
<tr><td>비용</td><td>-</td><td>문단 $0.12 · 문제 $0.33</td></tr></table></div>
<section id="judge"><h2>판단 필요</h2>
<div class="jbox j1"><h3>판단 1 · 결정됨: 이분 관계의 낱말 하나 답은 담음으로 본다</h3>
<p>3문단 2번 질문("세포막 구조는 친수성 물질이 지나는 데 어떤 영향을 줘?")은 답이 막는다/통과시킨다 둘 중 하나라 "차단" 한 단어로 답이 됩니다. 이 부분의 핵심은 '막는다'라는 결과 자체이고, 왜 막는지는 배열 부분이 따로 확인합니다. 그래서 낱말 하나로 그 결과를 말한 답은 담은 것으로 봅니다(사용자 결정, 2026-10-29). 처음에 이 4세션을 문제 사례로 표시한 것은 정정합니다.</p>
<p>세션: <a href="#para-29">para-29</a> · <a href="#para-31">para-31</a> · <a href="#para-33">para-33</a> · <a href="#para-36">para-36</a></p>
<p><b>따라 나오는 정리:</b> 별도 점검 호출은 두지 않습니다. 효과가 없던 givesRelation 칸(38개 질문 모두 false)은 v4.10에서 빼거나 기록용으로만 둡니다. 남은 질문 흘림 대응은 v4.9가 이미 줄인 '원인·조건을 질문이 주는' 경우입니다.</p></div>
<div class="jbox j2"><h3>판단 2 · 질문 없이 끝난 세션의 원인</h3>
<p>1단계에서는 질문이 나갔던 첫 요약 3개가 v4.9에서 첫 판정만으로 칭찬받고 끝났습니다. v4.9가 바꾼 것은 질문과 질문 뒤 판정이라, 판정 흔들림으로 보이지만 확신은 낮습니다.</p>
<p>세션: <a href="#para-6">para-6</a> · <a href="#para-50">para-50</a> · <a href="#para-51">para-51</a></p>
<p><b>추천:</b> 같은 첫 요약 3개 × v4.8·v4.9 × 5회 재판정(외부 전송 약 $0.02)으로 원인을 가릅니다.</p></div>
<div class="jbox j3"><h3>판단 3 · 결정됨: 표시 구절과 추측 답 인정은 그대로 둔다</h3>
<p>(가) 지문 표시가 답이 든 문장을 칠해 옮겨 쓰면 답이 되는 질문이 있지만, 다섯 세션 모두 수용 가능하거나 문제 없음으로 판정했습니다. (나) prob-10의 추측 답("중성 되나 봄")을 '고쳤어'로 인정하는 것은 유지합니다. 확신 없는 답을 '미확인'으로 돌려 다시 묻는 것은 학생을 몰아세우는 위험이 더 큽니다(사용자 판정, 2026-10-29).</p>
<p>세션: <a href="#prob-5">prob-5</a> · <a href="#prob-6">prob-6</a> · <a href="#prob-8">prob-8</a> · <a href="#prob-9">prob-9</a> · <a href="#prob-10">prob-10</a></p></div>
<p class="intro">아래 세션 카드에서 판단 대상은 색 띠로, 문제가 된 말풍선은 테두리로 표시했습니다.</p></section>
<nav>${toc}</nav>${paraHtml}${probHtml}</main></body></html>`;
writeFileSync(OUT, html);
console.log(`wrote ${OUT} (${(html.length / 1024).toFixed(0)} KB) para old ${Object.keys(pOld).length} new ${Object.keys(pNew).length}, prob old ${Object.keys(qOld).length} new ${Object.keys(qNew).length}`);
