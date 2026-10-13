// 시험용 직접 표시 태그(〈ⓓ〉…〈/ⓓ〉)가 삽입된 원문에 대한 인용 검사.
// 태그는 시험지 원래 문자가 아니므로 인용 일치 판단에서 제외하고, 위치는 태그 포함 원문 좌표로 돌려준다.
// 의미 정확성이나 학생 귀속은 검사하지 않는다.

const MARKER_TAG = /〈\/?[ⓐ-ⓩ㉠-㉻]〉/gu;
// 제품 recoverExactSourceQuote(source-direct-evaluator.ts)와 같은 무시 문자: 공백·인용부호.
const IGNORABLE = /[\s"'‘’“”]/u;

/** 태그·무시 문자를 뺀 문자열과, 그 각 문자의 원문 위치(UTF-16 offset)를 만든다. */
function normalizeWithOffsets(text) {
  const tagRanges = [...text.matchAll(MARKER_TAG)].map((m) => [m.index, m.index + m[0].length]);
  let normalized = '';
  const offsets = [];
  let tag = 0;
  for (let offset = 0; offset < text.length;) {
    while (tag < tagRanges.length && tagRanges[tag][1] <= offset) tag += 1;
    if (tag < tagRanges.length && tagRanges[tag][0] <= offset) {
      offset = tagRanges[tag][1];
      continue;
    }
    const character = String.fromCodePoint(text.codePointAt(offset));
    if (!IGNORABLE.test(character)) {
      normalized += character;
      // normalized의 UTF-16 위치와 맞추기 위해 대리쌍 문자는 두 칸 모두 같은 원문 위치를 가리킨다.
      for (let unit = 0; unit < character.length; unit += 1) offsets.push(offset);
    }
    offset += character.length;
  }
  return { normalized, offsets };
}

export function stripMarkerTags(text) {
  return text.replace(MARKER_TAG, '');
}

/**
 * 인용을 원문에서 찾는다. 태그·공백·인용부호 차이만 허용하고 유일한 위치여야 한다.
 * 반환: { start, end } (태그 포함 원문 좌표, end 미포함) 또는 실패 사유.
 */
export function locateQuote(source, quote) {
  const target = normalizeWithOffsets(quote).normalized;
  if (target.length === 0) return { ok: false, reason: 'EMPTY_QUOTE' };
  const { normalized, offsets } = normalizeWithOffsets(source);
  const first = normalized.indexOf(target);
  if (first < 0) return { ok: false, reason: 'NOT_FOUND' };
  if (normalized.indexOf(target, first + 1) >= 0) return { ok: false, reason: 'AMBIGUOUS' };
  const lastOffset = offsets[first + target.length - 1];
  const lastLength = String.fromCodePoint(source.codePointAt(lastOffset)).length;
  return { ok: true, start: offsets[first], end: lastOffset + lastLength };
}

/** 해석표 행의 clauseQuote가 원문에 유일하게 있고, 해당 기호의 표시 구간을 실제로 덮는지 검사한다. */
export function validateClauseQuote(source, row) {
  const annotation = source.textAnnotations.find((a) => a.marker === row.marker && a.location === row.location);
  if (!annotation) return { ok: false, reason: 'UNKNOWN_MARKER' };
  const text = row.location === 'PASSAGE' ? source.passage : source.scenario;
  const located = locateQuote(text, row.clauseQuote ?? '');
  if (!located.ok) return located;
  if (located.start > annotation.start || located.end < annotation.end) {
    return { ok: false, reason: 'MARKER_NOT_COVERED', start: located.start, end: located.end };
  }
  return located;
}
