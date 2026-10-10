// 기호 해석본(marker-gloss-v1)의 구조 검사. 의미의 옳고 그름은 검사하지 않는다.
// 확인하는 것: 원문 결속 해시, 기호 위치·표시 문자열, 원문 근거 인용, 선지 대조의 정답 패턴.
import { createHash } from 'node:crypto';

export function sourceBindingSha256(source) {
  const lines = [
    source.passage,
    source.stem,
    source.scenario,
    ...source.choices.map((c) => `${c.choiceId}\t${c.text}`),
    ...source.textAnnotations.map((a) => `${a.location}\t${a.marker}\t${a.start}\t${a.end}\t${a.text}`),
  ];
  return createHash('sha256').update(lines.join('\n')).digest('hex');
}

/** 문제가 있으면 사유 목록을, 없으면 빈 배열을 돌려준다. */
export function validateMarkerGloss(gloss, source, answerKey) {
  const problems = [];
  if (gloss.schemaVersion !== 'marker-gloss-v1') problems.push('UNKNOWN_SCHEMA');
  if (gloss.questionId !== source.questionId) problems.push('QUESTION_MISMATCH');
  if (gloss.sourceBinding?.sha256 !== sourceBindingSha256(source)) problems.push('SOURCE_CHANGED');
  if (gloss.answerKey?.answerChoiceId !== answerKey.answerChoiceId || gloss.answerKey?.stemPolarity !== answerKey.stemPolarity) {
    problems.push('ANSWER_KEY_MISMATCH');
  }
  const textOf = (location) => (location === 'PASSAGE' ? source.passage : source.scenario);
  const seen = new Set();
  for (const m of gloss.markers ?? []) {
    const a = source.textAnnotations.find((x) => x.marker === m.marker && x.location === m.location);
    if (!a) { problems.push(`UNKNOWN_MARKER:${m.marker}`); continue; }
    if (seen.has(m.marker)) problems.push(`DUPLICATE_MARKER:${m.marker}`);
    seen.add(m.marker);
    if (m.start !== a.start || m.end !== a.end || m.markedText !== a.text) problems.push(`MARKER_SPAN_MISMATCH:${m.marker}`);
    if (!m.name?.trim() || !m.referentHere?.trim() || !m.speaker?.trim()) problems.push(`EMPTY_READING:${m.marker}`);
    if (!Array.isArray(m.allowedReadings) || m.allowedReadings.length === 0 || !Array.isArray(m.conflictingReadings) || m.conflictingReadings.length === 0) {
      problems.push(`NO_READING_BOUNDARY:${m.marker}`);
    }
    if (!Array.isArray(m.sourceBasis) || m.sourceBasis.length === 0) problems.push(`NO_SOURCE_BASIS:${m.marker}`);
    for (const q of m.sourceBasis ?? []) if (!q.trim() || !textOf(m.location).includes(q)) problems.push(`BASIS_NOT_IN_SOURCE:${m.marker}`);
    // 가리키는 대상 자리에 문장의 뜻(부재·존재 서술)이 들어가는 것을 막는 문자열 신호. 의미 판단을 대신하지 않는다.
    if (/(부재|없다|없음|않다)$|의 부재/u.test(m.referentHere)) problems.push(`REFERENT_LOOKS_LIKE_PROPOSITION:${m.marker}`);
  }
  const choiceIds = source.choices.map((c) => c.choiceId);
  const readings = gloss.choiceReadings ?? [];
  if (JSON.stringify(readings.map((r) => r.choiceId).sort()) !== JSON.stringify([...choiceIds].sort())) problems.push('CHOICE_READINGS_INCOMPLETE');
  for (const r of readings) {
    const isAnswer = r.choiceId === answerKey.answerChoiceId;
    const expectedTrue = answerKey.stemPolarity === 'SELECT_INCORRECT' ? !isAnswer : isAnswer;
    if (r.choiceAppropriateUnderGloss !== expectedTrue) problems.push(`ANSWER_PATTERN_MISMATCH:${r.choiceId}`);
    if (!['REFERENT', 'NAME'].includes(r.level)) problems.push(`UNKNOWN_LEVEL:${r.choiceId}`);
  }
  return problems;
}
