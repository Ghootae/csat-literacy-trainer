import { PROBLEM_GOLD_VERSION } from './gold.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sourceRecord(sourceInput: unknown): Record<string, unknown> | null {
  if (!isRecord(sourceInput)) return null;
  return isRecord(sourceInput['source']) ? sourceInput['source'] : sourceInput;
}

function remapChoiceId(value: unknown, mapping: ReadonlyMap<string, string>): unknown {
  return typeof value === 'string' ? (mapping.get(value) ?? value) : value;
}

/**
 * 모델이 판단할 수 없는 정본 식별자와 미디어 메타데이터를 sourceInput에서 주입한다.
 * 교육적 필드(kind, role, requiredForSolving, altText)는 모델 출력을 유지한다.
 */
export function injectProblemGoldSourceFidelity(
  goldInput: unknown,
  sourceInput: unknown,
): unknown {
  if (!isRecord(goldInput)) return goldInput;
  const source = sourceRecord(sourceInput);
  if (source === null) return structuredClone(goldInput);
  const output = structuredClone(goldInput);
  output['schemaVersion'] = PROBLEM_GOLD_VERSION;

  const generatedSource = isRecord(output['source']) ? output['source'] : {};
  const authoritativeSource: Record<string, unknown> = { ...generatedSource };
  for (const key of ['sourceId', 'exam', 'questionNumber'] as const) {
    if (source[key] !== undefined) authoritativeSource[key] = source[key];
  }
  for (const key of ['sourcePath', 'sourceUrl'] as const) {
    if (typeof source[key] === 'string') authoritativeSource[key] = source[key];
    else delete authoritativeSource[key];
  }
  output['source'] = authoritativeSource;

  const choiceIdMapping = new Map<string, string>();
  if (Array.isArray(output['choices'])) {
    for (const [index, choice] of output['choices'].entries()) {
      if (!isRecord(choice)) continue;
      const canonicalId = `C${index + 1}`;
      if (typeof choice['choiceId'] === 'string') {
        choiceIdMapping.set(choice['choiceId'], canonicalId);
      }
      choice['choiceId'] = canonicalId;
      choice['position'] = index + 1;
    }
  }
  if (Array.isArray(output['optionClaims'])) {
    for (const claim of output['optionClaims']) {
      if (!isRecord(claim)) continue;
      claim['choiceId'] = remapChoiceId(claim['choiceId'], choiceIdMapping);
    }
  }
  if (Array.isArray(output['representativeWrongPaths'])) {
    for (const path of output['representativeWrongPaths']) {
      if (!isRecord(path)) continue;
      if (Array.isArray(path['selectedChoiceIds'])) {
        path['selectedChoiceIds'] = path['selectedChoiceIds'].map(
          (id) => remapChoiceId(id, choiceIdMapping),
        );
      }
      path['missedAnswerChoiceId'] = remapChoiceId(
        path['missedAnswerChoiceId'],
        choiceIdMapping,
      );
    }
  }
  const correctChoice = isRecord(source['answerKey'])
    ? source['answerKey']['correctChoice']
    : null;
  output['answerChoiceId'] = typeof correctChoice === 'number' && Number.isInteger(correctChoice)
    ? `C${correctChoice}`
    : remapChoiceId(output['answerChoiceId'], choiceIdMapping);
  if (isRecord(output['finalAnswerExplanation'])) {
    output['finalAnswerExplanation']['answerChoiceId'] = output['answerChoiceId'];
  }

  const sourceMedia = Array.isArray(source['media'])
    ? source['media'].filter(isRecord)
    : [];
  const generatedMedia = Array.isArray(output['mediaAssets'])
    ? output['mediaAssets'].filter(isRecord)
    : [];
  const mediaIdMapping = new Map<string, string>();
  output['mediaAssets'] = sourceMedia.flatMap((expected, index) => {
    const expectedId = expected['mediaId'];
    if (typeof expectedId !== 'string') return [];
    const actual = generatedMedia.find((media) => media['mediaId'] === expectedId)
      ?? generatedMedia[index];
    if (actual === undefined) return [];
    if (typeof actual['mediaId'] === 'string') {
      mediaIdMapping.set(actual['mediaId'], expectedId);
    }
    return [{
      ...actual,
      mediaId: expectedId,
      sourceUrl: expected['sourceUrl'],
      mimeType: expected['mimeType'],
      contentHash: expected['contentHash'],
      width: expected['width'],
      height: expected['height'],
      placement: structuredClone(expected['placement']),
    }];
  });
  if (Array.isArray(output['visualAssertions'])) {
    for (const assertion of output['visualAssertions']) {
      if (!isRecord(assertion)) continue;
      const mediaId = assertion['mediaId'];
      if (typeof mediaId === 'string') {
        assertion['mediaId'] = mediaIdMapping.get(mediaId) ?? mediaId;
      }
    }
  }
  return output;
}
