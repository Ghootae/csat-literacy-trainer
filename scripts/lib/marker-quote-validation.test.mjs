import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { locateQuote, stripMarkerTags, validateClauseQuote } from './marker-quote-validation.mjs';

const source = JSON.parse(readFileSync('docs/experiments/gongsun-interpretation-modes-2026-10-03/source.json', 'utf8'));
const tagged = '내 말은 〈ⓓ〉옷〈/ⓓ〉이 정말 없다는 게 아니라, 〈ⓔ〉빨간 옷〈/ⓔ〉이 필요한데 없다는 말이었어.';
const row = (marker, clauseQuote) => ({ marker, location: 'SCENARIO', clauseQuote });

test('태그를 그대로 복제한 인용과 태그를 뺀 인용은 같은 위치로 찾는다', () => {
  const a = locateQuote(source.scenario, tagged);
  const b = locateQuote(source.scenario, stripMarkerTags(tagged));
  assert.equal(a.ok, true);
  assert.deepEqual(b, a);
  assert.equal(source.scenario.slice(a.start, a.end), tagged);
});

test('공백·인용부호 차이는 허용하고 단어 차이는 거부한다', () => {
  assert.equal(locateQuote(source.scenario, '내 말은  옷이 정말 없다는 게 아니라').ok, true);
  assert.equal(locateQuote(source.scenario, '내 말은 옷이 전혀 없다는 게 아니라').reason, 'NOT_FOUND');
});

test('여러 곳에 있는 짧은 인용과 빈 인용은 거부한다', () => {
  assert.equal(locateQuote(source.scenario, '옷').reason, 'AMBIGUOUS');
  assert.equal(locateQuote(source.scenario, '〈ⓓ〉〈/ⓓ〉').reason, 'EMPTY_QUOTE');
});

test('대리쌍 문자가 앞에 있어도 원문 위치를 정확히 돌려준다', () => {
  const text = '앞 𝐀 〈ⓓ〉옷〈/ⓓ〉이 정말 없다';
  const found = locateQuote(text, '𝐀 옷이 정말 없다');
  assert.equal(found.ok, true);
  assert.equal(text.slice(found.start, found.end), '𝐀 〈ⓓ〉옷〈/ⓓ〉이 정말 없다');
});

test('clauseQuote는 해당 기호의 표시 구간을 덮어야 한다', () => {
  assert.equal(validateClauseQuote(source, row('ⓓ', tagged)).ok, true);
  assert.equal(validateClauseQuote(source, row('ⓔ', stripMarkerTags(tagged))).ok, true);
  assert.equal(validateClauseQuote(source, row('ⓓ', '빨간 옷이 필요한데 없다는 말이었어')).reason, 'MARKER_NOT_COVERED');
  assert.equal(validateClauseQuote(source, row('ⓒ', tagged)).reason, 'MARKER_NOT_COVERED');
  assert.equal(validateClauseQuote(source, row('ⓩ', tagged)).reason, 'UNKNOWN_MARKER');
});
