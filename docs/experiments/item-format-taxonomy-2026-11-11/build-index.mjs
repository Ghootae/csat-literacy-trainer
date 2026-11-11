// 기출 DB(suneung_db/output) 세트별 인덱스 생성. 파일 읽기만, API 호출 없음.
// 실행: 저장소 루트에서  node docs/experiments/item-format-taxonomy-2026-11-11/build-index.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DB = '/Users/mac/Projects/suneung_db/output';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const hasBogi = s => /[<〈]\s*보\s*기\s*[>〉]/.test(s || '');

const sets = [];
for (const f of fs.readdirSync(path.join(DB, 'passages')).filter(f => f.endsWith('.json')).sort()) {
  const p = read(path.join(DB, 'passages', f));
  const qPath = path.join(DB, 'questions', f);
  const q = fs.existsSync(qPath) ? read(qPath) : null;
  const qs = q?.questions ?? [];
  const nums = qs.map(x => x.number).filter(n => Number.isFinite(n));
  const bogiCount = qs.filter(x => x.prompt_blocks.some(b => hasBogi(b.text) || b.type === 'supplement')).length;
  const qImages = (q?.images?.length ?? 0)
    + qs.reduce((n, x) => n + x.prompt_blocks.reduce((m, b) => m + (b.images?.length ?? 0), 0)
      + (x.choices ?? []).reduce((m, c) => m + (c.images?.length ?? 0), 0), 0);
  sets.push({
    setId: p.set_id,
    exam: p.exam.label,
    year: p.exam.year,
    month: p.exam.month,
    provider: p.exam.provider,
    subject: p.exam.subject,
    category: p.exam.category ?? null,
    title: p.exam.title,
    tags: p.tags ?? [],
    sectionCount: p.sections?.length ?? 0,
    questionRangeLabel: p.exam.question_range,
    questionRange: nums.length ? `${Math.min(...nums)}~${Math.max(...nums)}` : null,
    questionCount: qs.length,
    bogiQuestionCount: bogiCount,
    hasImages: (p.images?.length ?? 0) + qImages > 0,
    passageImageCount: p.images?.length ?? 0,
    questionImageCount: qImages,
    hasQuestionsFile: !!q,
  });
}

const count = key => sets.reduce((o, s) => ((o[s[key] ?? 'null'] = (o[s[key] ?? 'null'] || 0) + 1), o), {});
const out = {
  source: DB,
  generatedAt: new Date().toISOString(),
  notes: '문항 발문·선지는 questions/{setId}.json, 정답은 DB에 없음. bogiQuestionCount = 발문·본문에 <보기>가 있거나 supplement 블록이 있는 문항 수.',
  totals: { sets: sets.length, bySubject: count('subject'), byCategory: count('category'), byProvider: count('provider'), byYear: count('year') },
  sets,
};
fs.writeFileSync(path.join(DIR, 'db-index.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out.totals, null, 2));
