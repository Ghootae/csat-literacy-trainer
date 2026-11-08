// 모델 x 해설 실험 블라인드 묶음: 같은 판정끼리 묶어 질문·마지막 설명을 모델·조건 이름 없이 나란히 보인다. 외부 호출 없음.
// Usage: node scripts/build-judge-model-explanation-blind.mjs [runsDir] [outDir]
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { DIR, PARTICIPANT, CASES, CIRCLED } from './run-judge-model-explanation.mjs';

const SEED = 20261108, LABELS = '가나다라마바사아자차카타파하'.split('');
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffle = (arr, rand) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const SECTIONS = ['firstChoice', 'reselection', 'answer'];
const endText = e => SECTIONS.flatMap(k => { const v = e?.[k]; return v == null ? [] : typeof v === 'string' ? [v] : v.map(p => p.text); });
const CRITERIA = ['무엇을 묻는지 바로 알겠나', '판정 이유가 납득되나', '꼭 필요한 만큼만 묻나', '문체가 자연스러운가'];

/** 같은 판정 묶음 중 서로 다른 조건이 2개 이상인 것에서, 조건마다 반복 번호가 가장 작은 칸을 고른다. */
function pick(cells, usable) {
  const groups = {};
  for (const c of cells.filter(usable)) (groups[c.judge.contentAssessment] ??= []).push(c);
  const out = [];
  for (const [verdict, list] of Object.entries(groups)) {
    const byCond = {};
    for (const c of list) if (!byCond[c.condition] || c.replicate < byCond[c.condition].replicate) byCond[c.condition] = c;
    if (Object.keys(byCond).length >= 2) out.push({ verdict, cells: Object.values(byCond) });
  }
  return out;
}

export function buildBlind(runsDir, participantPath = PARTICIPANT) {
  const all = readdirSync(runsDir).filter(f => f.endsWith('.json') && f !== 'META.json' && f !== 'SUMMARY.json').map(f => JSON.parse(readFileSync(`${runsDir}/${f}`, 'utf8')))
    .filter(c => c.status === 'VALID');
  const participant = JSON.parse(readFileSync(participantPath, 'utf8')), rand = rng(SEED);
  const key = { seed: SEED, questions: {}, explanations: {} };
  const out = { questions: ['# 질문 비교 (블라인드)', ''], explanations: ['# 마지막 설명 비교 (블라인드)', ''] };
  for (const c of CASES) {
    const cells = all.filter(x => x.caseId === c.id);
    const src = participant.items[c.q].session.source;
    const head = [`## ${c.id}`, '', `발문: ${src.stem}`, '', ...src.choices.map(x => `- ${CIRCLED[x.position - 1]} ${x.text}${x.choiceId === cells[0]?.choiceId || x.choiceId === src.answerChoiceId ? ' (학생이 고른 선지)' : ''}`),
      '', `학생 근거: ${cells[0]?.rationaleText ?? c.text ?? ''}`, ''];
    for (const [file, kind, usable, render] of [
      ['questions', 'questions', x => x.judge.contentAssessment === 'ERROR' && x.errors.length, x => x.errors.map(e => e.question)],
      ['explanations', 'explanations', x => x.endStatus === 'OK' && endText(x.endExplanation).length, x => endText(x.endExplanation)],
    ]) {
      out[file].push(...head);
      const groups = pick(cells, usable);
      if (!groups.length) {
        const why = !cells.length ? '실행 칸 없음' : kind === 'questions' ? '오류 판정이면서 서로 다른 조건 2개 이상인 묶음 없음' : '마지막 설명이 있으면서 서로 다른 조건 2개 이상인 묶음 없음';
        out[file].push(`비교 불가(${why})`, ''); continue;
      }
      for (const g of groups) {
        const items = shuffle(g.cells, rand), keyed = (key[kind][c.id] ??= {});
        out[file].push(`### ${c.id} 묶음 ${Object.keys(keyed).length ? '(추가)' : ''}`.trim(), '');
        items.forEach((cell, i) => {
          const label = LABELS[Object.keys(keyed).length]; keyed[label] = { caseId: cell.caseId, condition: cell.condition, replicate: cell.replicate };
          out[file].push(`#### ${label}`, '', ...render(cell).map(t => `> ${t}`), '', ...CRITERIA.map(k => `- ${k}: 좋음 / 보통 / 나쁨`), '- 메모: ', '');
        });
      }
    }
  }
  return { questions: out.questions.join('\n') + '\n', explanations: out.explanations.join('\n') + '\n', key };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const runsDir = process.argv[2] ?? `${DIR}/runs`, outDir = process.argv[3] ?? `${DIR}/blind`, b = buildBlind(runsDir);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/QUESTIONS.md`, b.questions); writeFileSync(`${outDir}/EXPLANATIONS.md`, b.explanations);
  writeFileSync(`${outDir}/KEY.json`, JSON.stringify(b.key, null, 2) + '\n');
  console.log(JSON.stringify({ blind: 'written', outDir }));
}
