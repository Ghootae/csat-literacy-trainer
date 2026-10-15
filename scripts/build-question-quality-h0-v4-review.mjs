// Local presentation of existing evidence only; no API calls or new judgments.
// Pairs the H0 shadow question with the V4 question the student actually received
// at the same point, blinds the source, and writes a review form plus a separate key.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const src = 'docs/experiments/holistic-verdict-shadow-2026-10-08';
const out = 'docs/experiments/question-quality-h0-vs-v4-2026-10-15';
const read = name => JSON.parse(readFileSync(`${src}/${name}`, 'utf8'));
const points = read('points.json'), comparisons = read('comparisons.json'), sources = read('sources.json');
const hash = text => createHash('sha256').update(text).digest('hex');

const pairs = [];
for (const c of comparisons) {
  const h0 = c.variants.H0.raw?.question;
  const next = points.find(p => p.sessionId && p.sessionId === c.sessionId && p.turn === c.turn + 1);
  const v4 = next?.dialogue.filter(t => t.role === 'tutor_question').at(-1)?.text;
  if (!h0 || !v4) continue;
  const point = points.find(p => p.pointId === c.pointId);
  pairs.push({ pointId: c.pointId, sessionId: c.sessionId, turn: c.turn, paragraphId: point.paragraphId,
    stratum: c.stratum, dialogue: point.dialogue, h0, v4 });
}
assert.equal(pairs.length, 10, 'expected the 10 pairs identified on 2026-10-15');

// Sessions in hash order; turns in order within a session, so an initial point is judged
// before the follow-up whose dialogue reveals the question actually asked there.
const sessionRank = id => hash(`session:${id}`);
pairs.sort((a, b) => sessionRank(a.sessionId).localeCompare(sessionRank(b.sessionId)) || a.turn - b.turn);
// Balanced blind order: rank by hash, H0 shown as A for the first half.
const h0First = new Set([...pairs].sort((a, b) => hash(`ab:${a.pointId}`).localeCompare(hash(`ab:${b.pointId}`)))
  .slice(0, pairs.length / 2).map(p => p.pointId));

const reviewPath = `${out}/REVIEW.md`;
assert.ok(!existsSync(reviewPath), 'Preserve existing reviewer notes; do not overwrite');
mkdirSync(out, { recursive: true });

const quote = text => String(text).split('\n').map(line => `> ${line}`).join('\n');
const key = [];
let doc = `# 질문 비교 묶음 (H0 대 V4, 블라인드)

같은 학생 응답 뒤에 나올 수 있었던 질문 두 개를 나란히 놓았습니다. 하나는 실제로 학생이 받은 질문이고, 다른 하나는 다른 방식이 만든 질문입니다. 어느 쪽이 어느 방식인지는 \`KEY.json\`에 있으니 판정을 마칠 때까지 열지 마세요.

- 사례는 위에서부터 순서대로 판정하고, 앞 사례로 돌아가 고치지 마세요. 후속 사례의 대화에는 앞 사례에서 실제로 던진 질문이 보입니다.
- 질문 하나마다 세 칸을 채우고, 마지막에 둘 중 어느 쪽을 학생에게 주고 싶은지 고릅니다.
  - 구멍: 이 응답의 가장 큰 구멍을 짚었는가 (예 / 부분 / 아니오)
  - 누출: 질문이 답을 흘렸는가 (예 / 아니오)
  - 답 가능: 학생이 이 질문만 보고 무엇을 답해야 할지 아는가 (예 / 아니오)
- 선택: A / B / 비슷

`;

pairs.forEach((pair, index) => {
  const id = `Q${String(index + 1).padStart(2, '0')}`;
  const aIsH0 = h0First.has(pair.pointId);
  key.push({ caseId: id, pointId: pair.pointId, A: aIsH0 ? 'H0' : 'V4', B: aIsH0 ? 'V4' : 'H0' });
  const paragraph = sources[pair.paragraphId].gold.paragraphText;
  const dialogue = pair.dialogue.map(t => t.role === 'student'
    ? `학생 발화\n\n${quote(t.text)}`
    : `받은 질문\n\n${quote(t.text)}`).join('\n\n');
  const block = label => `### 질문 ${label}

${quote(label === 'A' ? (aIsH0 ? pair.h0 : pair.v4) : (aIsH0 ? pair.v4 : pair.h0))}

- 구멍:
- 누출:
- 답 가능:
`;
  doc += `---

## ${id}

문단

${quote(paragraph)}

${dialogue}

${block('A')}
${block('B')}
- 선택:
- 메모:

`;
});

writeFileSync(reviewPath, doc);
writeFileSync(`${out}/KEY.json`, `${JSON.stringify(key, null, 2)}\n`);
console.log(`wrote ${reviewPath} and ${out}/KEY.json (${pairs.length} cases, H0 as A in ${h0First.size})`);
