// SNS 진단평가 세트 E 목록 파일을 만든다(인계 A (1)). 외부 전송 없음. 손으로 쓰지 않고 이 스크립트로만 만든다.
// 실행: node scripts/build-diagnostic-set.mjs [--check]   (--check: 파일을 쓰지 않고 현재 파일과 같은지만 확인)
// 검사: 4지문 16문항·순서, grade-cuts setEItems의 megastudySeq·문항 번호, 정답 위치(runtime-reference·candidates),
//       정답률(candidates·megastudy-items), 지도 단위 수(인계 문서 표).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const SNS = 'packages/pipeline/fixtures/experiments/sns-diagnostic';
export const OUT_PATH = `${SNS}/diagnostic-set-e.json`;
const CAL = 'docs/experiments/sns-diagnostic-calibration-2026-11-06';
const GOLD = 'docs/experiments/sns-diagnostic-gold-2026-11-05';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const sha256 = p => createHash('sha256').update(readFileSync(p)).digest('hex');

// 지문 순서는 D-0201 표 순서(의식과 인지 → 경마식 보도 → 플라스틱 → 오디오)다.
const PASSAGES = [
  { passageId: 'consciousness-cognition', seq: '311', maps: [`${GOLD}/consciousness-cognition-ga`, `${GOLD}/consciousness-cognition-na`], units: [[21, 32], [16, 22]] },
  { passageId: 'horse-race-reporting', seq: '319', maps: ['docs/experiments/analysis-gold-calibration-2026-10-20/horse-race-reporting'], units: [[21, 28]] },
  { passageId: 'plastic-polymerization', seq: '326', maps: [`${GOLD}/plastic-polymerization`], units: [[28, 29]] },
  { passageId: 'audio-perceptual-coding', seq: '345', maps: [`${GOLD}/audio-perceptual-coding`], units: [[25, 37]] },
];
const SUBJECTS = ['1004', '1005'];

export function buildSet() {
  const cuts = read(`${CAL}/grade-cuts.json`), megastudy = read(`${CAL}/megastudy-items.json`);
  const candidates = read('docs/experiments/sns-diagnostic-candidates-2026-11-05/candidates.json');
  const reference = read(`${SNS}/runtime-reference.json`).questions;
  const passages = [], items = {};
  for (const def of PASSAGES) {
    const expected = cuts.setEItems[def.seq];
    assert.ok(expected, `grade-cuts setEItems에 ${def.seq}가 없습니다`);
    const questionIds = expected.map(n => `${def.passageId}-q${n}`);
    for (const id of questionIds) assert.ok(existsSync(`${SNS}/public/${id}.json`), `문항 파일 없음: ${id}`);
    const exam = megastudy.exams[def.seq];
    assert.ok(exam, `megastudy-items에 ${def.seq}가 없습니다`);
    for (const n of expected) for (const sub of SUBJECTS) assert.ok(exam.bySubject[sub]?.[String(n)], `megastudy-items에 ${def.seq}/${sub}/${n}이 없습니다`);
    const analysisMaps = def.maps.map((dir, i) => {
      const mapPath = `${dir}/frozen-map.json`, stancePath = `${dir}/stance/stance-final.json`;
      assert.ok(existsSync(mapPath) && existsSync(stancePath), `지도 또는 입장 파일 없음: ${dir}`);
      const map = read(mapPath);
      const nodes = map.nodes.length; // 인계 문서 표의 "노드"는 map.nodes(합성·문단 요지·교차·최상위)다
      assert.deepEqual([nodes, map.relations.length], def.units[i], `지도 단위 수가 인계 문서 표와 다릅니다: ${dir}`);
      return { mapPath, stancePath, mapSha256: sha256(mapPath) };
    });
    const choiceLinkPath = `${GOLD}/choice-link/frozen/${def.passageId}.json`;
    assert.ok(existsSync(choiceLinkPath), `선지 연결 동결본 없음: ${choiceLinkPath}`);
    passages.push({ passageId: def.passageId, questionIds, exam: { label: exam.label, megastudySeq: Number(def.seq) }, analysisMaps, choiceLinkPath });
    for (const n of expected) {
      const questionId = `${def.passageId}-q${n}`;
      const pub = read(`${SNS}/public/${questionId}.json`);
      assert.equal(pub.passageId, def.passageId, `${questionId}: passageId`);
      assert.equal(pub.questionNumber, n, `${questionId}: questionNumber`);
      const ref = reference.find(q => q.questionId === questionId);
      assert.ok(ref, `runtime-reference에 ${questionId}가 없습니다`);
      const answerChoice = pub.choices.find(c => c.choiceId === ref.answerChoiceId);
      assert.ok(answerChoice, `${questionId}: 정답 선지가 문항에 없습니다`);
      const sets = candidates.filter(s => s.seq === Number(def.seq) && s.items.some(it => it.number === n));
      assert.equal(sets.length, 1, `${questionId}: candidates에서 (seq, 번호) 묶음이 하나여야 합니다(${sets.length})`);
      const cand = sets[0].items.find(it => it.number === n);
      assert.equal(cand.answer, answerChoice.position, `${questionId}: candidates 정답 ${cand.answer} != runtime-reference 정답 위치 ${answerChoice.position}`);
      assert.equal(cand.keyMatch, true, `${questionId}: candidates keyMatch`);
      assert.deepEqual(cand.correctRate, SUBJECTS.map(sub => exam.bySubject[sub][String(n)].correctRate), `${questionId}: 정답률이 candidates와 megastudy-items에서 다릅니다`);
      for (const sub of SUBJECTS) assert.equal(exam.bySubject[sub][String(n)].answer, answerChoice.position, `${questionId}: megastudy-items(${sub}) 정답이 다릅니다`);
      assert.equal(cand.choicePercents.length, 2);
      cand.choicePercents.forEach((row, i) => assert.equal(row[answerChoice.position - 1], cand.correctRate[i], `${questionId}: 정답 선지 비율과 정답률이 다릅니다`));
      items[questionId] = { passageId: def.passageId, questionNumber: n, answerPosition: answerChoice.position,
        megastudy: { correctRate: cand.correctRate, choicePercents: cand.choicePercents,
          subjects: SUBJECTS.map(sub => megastudy.subjects[sub]), source: '메가스터디 이용자 기준' } };
    }
  }
  assert.equal(passages.length, 4); assert.equal(Object.keys(items).length, 16);
  assert.equal(cuts.exams['349'].label, '2026학년도 수능');
  return { schemaVersion: 'sns-diagnostic-set-v1', setId: 'set-e', referenceExam: { megastudySeq: 349, label: cuts.exams['349'].label }, passages, items };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const text = JSON.stringify(buildSet(), null, 2) + '\n';
  if (process.argv.includes('--check')) { assert.equal(readFileSync(OUT_PATH, 'utf8'), text, 'diagnostic-set-e.json이 생성 결과와 다릅니다'); console.log('OK'); }
  else { writeFileSync(OUT_PATH, text); console.log(`wrote ${OUT_PATH}`); }
}
