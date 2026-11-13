// out/<지문>-<A|B>/ 결과를 모아 정답 공개판 판정지 REVIEW-open.md 를 만든다.
// 실행: 저장소 루트에서  node docs/experiments/deep-item-v3-tech-2026-11-12/make-review.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_NAME = process.env.OUT_NAME || 'out';
const OUTROOT = path.join(DIR, OUT_NAME);
const REVIEW = OUT_NAME === 'out' ? 'REVIEW-open.md' : `REVIEW-open-${OUT_NAME}.md`;
const NUM = ['①', '②', '③', '④', '⑤'];
const MODE_NAME = { A: '개념 연결(부정 발문)', B: '계산·절차(긍정 발문)' };
const runs = fs.existsSync(OUTROOT) ? fs.readdirSync(OUTROOT).filter(d => fs.existsSync(path.join(OUTROOT, d, 'items.json'))).sort() : [];
if (!runs.length) throw new Error('out/ 아래에 items.json 이 있는 결과가 없습니다. run.mjs 를 먼저 실행하세요.');

const lines = [];
const summaryRows = [];
let totalIn = 0, totalOut = 0;
const byPassage = {};
for (const run of runs) {
  const { passage: pid, mode, items } = JSON.parse(fs.readFileSync(path.join(OUTROOT, run, 'items.json'), 'utf8'));
  (byPassage[pid] ??= []).push({ run, mode, items });
}

for (const [pid, group] of Object.entries(byPassage)) {
  const pdir = path.join(DIR, 'passages', pid);
  const meta = fs.existsSync(path.join(pdir, 'meta.json')) ? JSON.parse(fs.readFileSync(path.join(pdir, 'meta.json'), 'utf8')) : { title: pid, exam: '' };
  const passage = fs.readFileSync(path.join(pdir, 'passage.txt'), 'utf8').trim();
  lines.push(`---\n\n# ${meta.title} (${meta.exam})\n`);
  lines.push(`<details open><summary>지문</summary>\n\n${passage}\n\n</details>\n`);
  for (const { run, mode, items } of group) {
    const solve = fs.existsSync(path.join(OUTROOT, run, 'solve.json')) ? JSON.parse(fs.readFileSync(path.join(OUTROOT, run, 'solve.json'), 'utf8')) : {};
    const usage = fs.existsSync(path.join(OUTROOT, run, 'usage.json')) ? JSON.parse(fs.readFileSync(path.join(OUTROOT, run, 'usage.json'), 'utf8')) : [];
    const design = fs.existsSync(path.join(OUTROOT, run, 'design-check.json')) ? JSON.parse(fs.readFileSync(path.join(OUTROOT, run, 'design-check.json'), 'utf8')) : {};
    const scene = fs.existsSync(path.join(OUTROOT, run, 'scene-check.json')) ? JSON.parse(fs.readFileSync(path.join(OUTROOT, run, 'scene-check.json'), 'utf8')) : {};
    const hard = fs.existsSync(path.join(OUTROOT, run, 'hard-sentences.json')) ? JSON.parse(fs.readFileSync(path.join(OUTROOT, run, 'hard-sentences.json'), 'utf8')) : {};
    for (const u of usage) { totalIn += u.usage?.input_tokens ?? 0; totalOut += u.usage?.output_tokens ?? 0; }
    for (const it of items) {
      const chars = it.bogi.replace(/\s/g, '').length;
      const solved = solve[it.version];
      summaryRows.push(`| ${meta.title} | ${mode} ${MODE_NAME[mode] ?? ''} | ${it.version} | ${NUM[it.answer - 1] ?? it.answer} | ${solved ?? '?'}${String(solved) === String(it.answer) ? ' 일치' : ' 불일치'} | ${chars}자 | ${it.edits ?? '?'} |`);
      lines.push(`## ${meta.title} — ${mode}-${it.version}  (정답 ${NUM[it.answer - 1] ?? it.answer})\n`);
      lines.push(`- 양식: ${MODE_NAME[mode] ?? mode} · 〈보기〉 ${chars}자 · 독립 풀이 답 ${solved ?? '?'} · 다듬기 수정 ${it.edits ?? '?'}곳`);
      if (it.answerIntent) lines.push(`- 정답이 노리는 착각: ${it.answerIntent}`);
      lines.push(`\n**${it.stem}**\n\n〈보기〉\n> ${it.bogi.replace(/\n+/g, '\n> ')}\n`);
      it.choices.forEach((c, i) => {
        const t = it.truth?.[i];
        const mark = t === 'O' ? '⭕' : t === 'X' ? '❌' : '?';
        const isAns = i + 1 === Number(it.answer);
        lines.push(`${c.trim()}  ${mark}${isAns ? ' **← 정답**' : ''}  `);
        if (it.intent?.[i]) lines.push(`&nbsp;&nbsp;↳ ${it.intent[i]}  `);
        lines.push('');
      });
      if (it.hidden?.length) lines.push(`- 숨긴 핵심 개념: ${it.hidden.join(', ')} · 교정 수정 ${it.readabilityEdits ?? '?'}곳\n`);
      if (design[it.version]) {
        const dc = design[it.version];
        lines.push(`- 풀이 모델의 설계 검사(〈보기〉만으로 풀림·결과 없는 관찰·버전 간 함정 중복): ${dc.length ? '' : '문제 없음'}`);
        dc.forEach(d => lines.push(`  - ${d.where}: ${d.issue}`));
        lines.push('');
      }
      if (scene[it.version]) {
        const sc = scene[it.version];
        lines.push(`- 풀이 모델의 장면-정의 대응 검사: ${sc.length ? '' : '문제 없음'}`);
        sc.forEach(s => lines.push(`  - ${s.where} (${s.concept}): ${s.issue}`));
        lines.push('');
      }
      if (hard[it.version]) {
        const hs = hard[it.version];
        lines.push(`- 풀이 모델이 본 실제로 막히는 문장: ${hs.length ? '' : '없음'}`);
        hs.forEach(h => lines.push(`  - ${h.where}: "${h.text}" — ${h.why}`));
        lines.push('');
      }
      if (it.before) {
        lines.push('<details><summary>교정 전(다듬기 결과)</summary>\n');
        lines.push(`〈보기〉\n> ${it.before.bogi.replace(/\n+/g, '\n> ')}\n`);
        it.before.choices.forEach(c => lines.push(`${c.trim()}  `));
        lines.push('\n</details>\n');
      }
      lines.push('| 선지 | 논리 연결 (깊이 n단계 / 매력도 상·중·하) | 표현 (어색한 곳·수정안) |');
      lines.push('|---|---|---|');
      NUM.forEach(n => lines.push(`| ${n} |  |  |`));
      lines.push('| 〈보기〉 |  |  |');
      lines.push('\n총평(쓸 수 있음 / 고치면 씀 / 버림):\n');
    }
  }
}

const head = [
  `# 깊은 〈보기〉 문항 v4.1 판정지 — 새 지문 생성 전체 (정답 공개판${OUT_NAME === 'out' ? '' : ', ' + OUT_NAME})\n`,
  `- 생성: run.mjs v4 (탐색 → 선별 → 조립(규칙 v4 + 가독성 기준) → 다듬기 → 가독성 교정 → 독립 풀이·장면-정의 검사). 문항마다 '교정 전(다듬기 결과)'을 펼쳐 비교, 사람 개입 없음. ${new Date().toISOString().slice(0, 10)} 취합.`,
  '- 선지 옆 표시: ⭕ 적절 / ❌ 적절하지 않음. 각 선지 아래 ↳ 는 출제 의도. A형(부정 발문)은 ❌가 정답, B형(긍정 발문)은 ⭕가 정답.',
  '- 판정은 **논리 연결**과 **표현**을 따로 적는다(인문 배치에서 둘을 섞어 어긋난 교훈).',
  `- 토큰 합계: 입력 ${totalIn.toLocaleString()} / 출력 ${totalOut.toLocaleString()} (usage.json, 요금은 단가표로 따로 계산)\n`,
  '| 지문 | 양식 | 버전 | 출제 정답 | 독립 풀이 | 〈보기〉 | 다듬기 수정 |',
  '|---|---|---|---|---|---|---|',
  ...summaryRows,
  '\n순위(논리 기준, 8문항): \n',
];
fs.writeFileSync(path.join(DIR, REVIEW), head.join('\n') + '\n' + lines.join('\n') + '\n');
console.log(`${REVIEW} 작성: ${runs.length}개 실행, ${summaryRows.length}문항`);
