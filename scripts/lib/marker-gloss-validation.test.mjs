import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateMarkerGloss } from './marker-gloss-validation.mjs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const DIR = 'packages/pipeline/fixtures/experiments/problem-solving';
const gloss = read(`${DIR}/marker-glosses/gongsun-long-later-mohists-q12.json`);
const source = read(`${DIR}/public/gongsun-long-later-mohists-q12.json`);
const key = read(`${DIR}/gongsun-long-later-mohists-q12.json`);
const answerKey = { answerChoiceId: key.answerChoiceId, stemPolarity: key.stemPolarity };
const clone = (x) => structuredClone(x);

test('공손룡 12번 해석본은 원문·기호·정답 패턴과 맞는다', () => {
  assert.deepEqual(validateMarkerGloss(gloss, source, answerKey), []);
});

test('원문이 바뀌면 해석본을 쓰지 못하게 한다', () => {
  const changed = clone(source);
  changed.scenario = changed.scenario.replace('빨간 옷', '파란 옷');
  assert.ok(validateMarkerGloss(gloss, changed, answerKey).includes('SOURCE_CHANGED'));
  const passageChanged = clone(source);
  passageChanged.passage = passageChanged.passage.replace('흰 말', '검은 말');
  assert.ok(validateMarkerGloss(gloss, passageChanged, answerKey).includes('SOURCE_CHANGED'));
});

test('원문에 없는 근거, 어긋난 기호 위치, 정답 패턴 불일치를 잡는다', () => {
  const g = clone(gloss);
  g.markers[3].sourceBasis = ['원문에 없는 문장'];
  g.markers[4].start += 1;
  g.choiceReadings[3].choiceAppropriateUnderGloss = true;
  const problems = validateMarkerGloss(g, source, answerKey);
  assert.ok(problems.includes('BASIS_NOT_IN_SOURCE:ⓓ'));
  assert.ok(problems.includes('MARKER_SPAN_MISMATCH:ⓔ'));
  assert.ok(problems.includes('ANSWER_PATTERN_MISMATCH:C4'));
});

test('허용·오류 읽기 경계가 비어 있으면 잡는다', () => {
  const g = clone(gloss);
  g.markers[3].allowedReadings = [];
  assert.ok(validateMarkerGloss(g, source, answerKey).includes('NO_READING_BOUNDARY:ⓓ'));
});

test('가리키는 대상 자리에 문장의 뜻을 쓰면 신호를 낸다', () => {
  const g = clone(gloss);
  g.markers[4].referentHere = '필요한 빨간 옷의 부재';
  assert.ok(validateMarkerGloss(g, source, answerKey).includes('REFERENT_LOOKS_LIKE_PROPOSITION:ⓔ'));
});
