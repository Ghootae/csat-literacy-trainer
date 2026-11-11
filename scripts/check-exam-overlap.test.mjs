import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dice2, TARGETS_PATH } from './run-principle-pilot.mjs';
import { loadQuestions } from './run-choice-link.mjs';
import { overlapFor, main } from './check-exam-overlap.mjs';

const seg = text => ({ id: 'S1', kind: 'TEXT', text, marks: [] });
const EXAM = [{ number: 10, stem: '윗글의 내용으로 적절한 것은?', supplementSegments: [], choices: [{ number: 1, text: '법인은 독립된 권리 주체이다.' }, { number: 2, text: '재단 법인은 허가를 받아야 한다.' }] },
  { number: 13, stem: '윗글을 바탕으로 〈보기〉를 이해한 내용으로 적절하지 않은 것은?', supplementSegments: [seg('주식회사 A는 적자가 누적되어 재원이 줄었다.')], choices: [{ number: 1, text: '갑의 기부는 출연이다.' }] }];
const gen = (texts, desc = '전혀 다른 예시 상황이다', bogi = null) => [{ choices: texts.map((text, i) => ({ number: i + 1, text })) }, { situation: { description: desc, bogiText: bogi } }];

test('dice2: identical sentence gives 1.0; unrelated sentence is low', () => {
  assert.equal(dice2('법인은 독립된 권리 주체이다.', '법인은 독립된 권리 주체이다.'), 1);
  assert.ok(dice2('법인은 독립된 권리 주체이다.', '기포의 압력은 반지름에 반비례한다') < 0.2);
});

test('choices: same text as an exam choice is flagged with its exam number; unrelated choices are not', () => {
  const r = overlapFor(...gen(['법인은 독립된 권리 주체이다.', '진자의 주기는 줄 길이에 비례한다는 설명']), EXAM);
  assert.equal(r.choiceMax[0].max, 1); assert.equal(r.choiceMax[0].examNumber, 10); assert.equal(r.choiceMax[0].examWhere, 'choice 1');
  assert.ok(r.choiceMax[1].max < 0.6);
  assert.deepEqual(r.flags.map(f => [f.flag, f.choice]), [['CHOICE_OVERLAP', 1]]);
});

test('situation: a description or bogi text close to an exam stem or bogi is flagged; threshold 0.5', () => {
  let r = overlapFor(...gen(['전혀 다른 선지 문장입니다'], '윗글을 바탕으로 〈보기〉를 이해한 내용으로 적절하지 않은 것은?'), EXAM);
  assert.deepEqual(r.flags.map(f => [f.flag, f.field, f.examNumber, f.examWhere]), [['SITUATION_OVERLAP', 'description', 13, 'stem']]);
  r = overlapFor(...gen(['전혀 다른 선지 문장입니다'], '무관한 상황', '주식회사 A는 적자가 누적되어 재원이 줄었다.'), EXAM);
  assert.deepEqual(r.flags.map(f => [f.flag, f.field, f.examWhere]), [['SITUATION_OVERLAP', 'bogiText', 'bogi']]);
  r = overlapFor(...gen(['전혀 다른 선지 문장입니다'], '무관한 상황'), EXAM);
  assert.deepEqual(r.flags, []);
});

test('main: reads runs/<passage>/item-<k>.json and situation-<k>.json, writes quality/exam-overlap.json; a missing item is marked, not an error (real exam files)', () => {
  const targets = JSON.parse(readFileSync(TARGETS_PATH, 'utf8')), t = targets[0];
  if (!existsSync(t.questionsPath)) return;
  const dir = mkdtempSync(join(tmpdir(), 'overlap-'));
  try {
    const exam = loadQuestions(t.questionsPath, t.answersPath, t.assetsDir).questions, q = exam.find(x => x.number === 10);
    mkdirSync(`${dir}/runs/${t.passageId}`, { recursive: true });
    const item = { passageId: t.passageId, itemKey: 'a', choices: q.choices.map(c => ({ number: c.number, text: c.text })) };
    writeFileSync(`${dir}/runs/${t.passageId}/item-a.json`, JSON.stringify(item));
    writeFileSync(`${dir}/runs/${t.passageId}/situation-a.json`, JSON.stringify({ situation: { description: '무관한 예시 상황이다', slotRef: null, bogiText: null } }));
    const r = main({ targetsPath: TARGETS_PATH, runsDir: `${dir}/runs`, out: `${dir}/quality/exam-overlap.json` });
    assert.equal(r.items.length, 8); assert.equal(r.items.filter(i => i.missing).length, 7);
    const a = r.items.find(i => i.passageId === t.passageId && i.itemKey === 'a');
    assert.ok(a.choiceMax.every(c => c.max === 1 && c.examNumber === 10)); assert.equal(a.flags.filter(f => f.flag === 'CHOICE_OVERLAP').length, 5);
    assert.deepEqual(r.flagged, [`${t.passageId}/a`]);
    assert.deepEqual(JSON.parse(readFileSync(`${dir}/quality/exam-overlap.json`, 'utf8')).flagged, r.flagged);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
