// Converts one suneung_db set (read-only) into a dialogue-passage-v1 file. No external requests.
// Handoff: docs/handoffs/2026-10-19-relation-sample-expansion.md
// Usage: node scripts/import-suneung-passage.mjs --set <set_id> --passage-id <id> --out-dir <dir> [--db-dir <dir>] [--section <label> [--pair-passage-id <id>]]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const DB_DIR = '/Users/mac/Projects/suneung_db/output/passages';

export function convertSet({ setId, passageId, dbDir = DB_DIR, section, pairPassageId }) {
  const sourcePath = resolve(dbDir, `${setId}.json`), bytes = readFileSync(sourcePath), set = JSON.parse(bytes.toString('utf8'));
  if (!Array.isArray(set.sections) || set.sections.length === 0) throw new Error('DB_STRUCTURE: sections missing');
  if (Array.isArray(set.images) && set.images.length > 0) throw new Error('HAS_IMAGES: set contains images');
  const multi = set.sections.length > 1, paragraphs = [], notes = [];
  if (section !== undefined) {
    if (!multi) throw new Error('SECTION_NOT_COMPOSITE');
    if (!set.sections.some(s => s.label === section)) throw new Error('SECTION_NOT_FOUND');
  }
  for (const sec of [...set.sections].sort((a, b) => a.order - b.order)) {
    if (multi && !sec.label) throw new Error('SECTION_LABEL_MISSING');
    if (section !== undefined && sec.label !== section) continue;
    if (!Array.isArray(sec.paragraphs)) throw new Error('DB_STRUCTURE: paragraphs missing');
    for (const para of [...sec.paragraphs].sort((a, b) => a.order - b.order)) {
      // The DB stores glossary footnotes ("* 세수: ...") as paragraphs; keep them as notes, like the existing fixtures.
      if (/^\s*\*/u.test(para.text)) { notes.push(para.text.trim()); continue; }
      const position = paragraphs.length + 1;
      paragraphs.push({ paragraphId: `${passageId}-p${position}`, position, ...(multi && section === undefined ? { section: sec.label } : {}), text: para.text });
    }
  }
  return { schemaVersion: 'dialogue-passage-v1', passageId, title: section === undefined ? set.exam.title : `${set.exam.title} ${section}`, exam: set.exam.label, questionRange: set.exam.question_range,
    source: { status: 'suneung-db', sourceId: setId, sourcePath, sourceFileHash: createHash('sha256').update(bytes).digest('hex') }, notes, paragraphs,
    ...(section === undefined ? {} : { composite: { setId, section, pairPassageId: pairPassageId ?? null } }) };
}

export function importPassage({ setId, passageId, outDir, dbDir, section, pairPassageId }) {
  const out = convertSet({ setId, passageId, dbDir, section, pairPassageId });
  mkdirSync(outDir, { recursive: true });
  const file = `${outDir}/${passageId}.json`;
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n', { flag: 'wx' });
  return { file, paragraphs: out.paragraphs.length };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  console.log(JSON.stringify(importPassage({ setId: opt('--set'), passageId: opt('--passage-id'), outDir: opt('--out-dir'), dbDir: opt('--db-dir'), section: opt('--section'), pairPassageId: opt('--pair-passage-id') }), null, 2));
}
