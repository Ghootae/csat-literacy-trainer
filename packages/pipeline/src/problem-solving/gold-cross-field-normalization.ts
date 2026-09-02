import { targetClaimEffectForAssessment } from './gold.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 문항 지식 없이 교정할 수 있는 반복적 교차 필드 계약만 정규화한다. */
export function normalizeProblemGoldCrossFieldContracts(input: unknown): {
  readonly value: unknown;
  readonly changes: readonly string[];
} {
  if (!isRecord(input)) return { value: input, changes: [] };
  const output = structuredClone(input);
  const changes: string[] = [];
  const answerChoiceId = typeof output['answerChoiceId'] === 'string'
    ? output['answerChoiceId']
    : '';
  const conclusionIds = new Set(
    Array.isArray(output['conclusionStepIds']) ? output['conclusionStepIds'] : [],
  );
  if (Array.isArray(output['decisivePathStepIds'])) {
    const original = output['decisivePathStepIds'];
    const filtered = original.filter((id) => typeof id === 'string' && !conclusionIds.has(id));
    const normalized = filtered.length > 0
      ? filtered
      : (Array.isArray(output['requiredPathStepIds'])
          ? output['requiredPathStepIds']
            .filter((id) => typeof id === 'string' && !conclusionIds.has(id))
            .slice(-1)
          : []);
    if (JSON.stringify(original) !== JSON.stringify(normalized)) {
      output['decisivePathStepIds'] = normalized;
      changes.push('SEPARATE_DECISIVE_AND_CONCLUSION_STEPS');
    }
  }

  if (Array.isArray(output['optionClaims'])) {
    for (const claim of output['optionClaims']) {
      if (!isRecord(claim)) continue;
      const supplementalIds = Array.isArray(claim['fallbackSupplementalInferenceIds'])
        ? claim['fallbackSupplementalInferenceIds']
        : [];
      if (supplementalIds.length === 0 &&
        Array.isArray(claim['supplementalUsePolicy']) &&
        claim['supplementalUsePolicy'].length > 0) {
        claim['supplementalUsePolicy'] = [];
        changes.push('CLEAR_UNUSED_SUPPLEMENTAL_POLICY');
      }
      if (
        claim['assessment'] === 'NOT_JUSTIFIED' &&
        claim['decision'] === 'REJECTED' &&
        claim['decisionBasis'] !== 'ANSWER_KEY_CONSTRAINED'
      ) {
        claim['decisionBasis'] = 'ANSWER_KEY_CONSTRAINED';
        changes.push('ALIGN_NOT_JUSTIFIED_DECISION_BASIS');
      }
    }
  }

  if (Array.isArray(output['itemInferences'])) {
    const targetEffects = new Map(
      Array.isArray(output['optionClaims'])
        ? output['optionClaims'].flatMap((claim) => (
            isRecord(claim) && typeof claim['claimId'] === 'string'
              ? [[claim['claimId'], targetClaimEffectForAssessment(claim['assessment'])] as const]
              : []
          ))
        : [],
    );
    for (const inference of output['itemInferences']) {
      if (!isRecord(inference)) continue;
      const propositionRefs = Array.isArray(inference['references'])
        ? inference['references'].flatMap((reference) => (
            isRecord(reference)
              ? [
                  ...(Array.isArray(reference['propositionIds']) ? reference['propositionIds'] : []),
                  ...(Array.isArray(reference['relationIds']) ? reference['relationIds'] : []),
                ]
              : []
          ))
        : [];
      const expectedPremiseRefs = [...new Set([
        ...propositionRefs,
        ...(Array.isArray(inference['scenarioFactIds']) ? inference['scenarioFactIds'] : []),
        ...(Array.isArray(inference['visualAssertionIds']) ? inference['visualAssertionIds'] : []),
        ...(inference['grounding'] === 'ANSWER_KEY_CONSTRAINED' ? ['ANSWER_KEY'] : []),
      ].filter((id): id is string => typeof id === 'string'))];
      if (JSON.stringify(inference['premiseRefs']) !== JSON.stringify(expectedPremiseRefs)) {
        inference['premiseRefs'] = expectedPremiseRefs;
        changes.push('REBUILD_INFERENCE_PREMISE_REFS');
      }
      const effects = new Set(
        Array.isArray(inference['targetClaimIds'])
          ? inference['targetClaimIds'].flatMap((claimId) => {
              const effect = typeof claimId === 'string' ? targetEffects.get(claimId) : null;
              return effect === null || effect === undefined ? [] : [effect];
            })
          : [],
      );
      if (effects.size === 1) {
        const expectedEffect = [...effects][0];
        if (inference['targetClaimEffect'] !== expectedEffect) {
          inference['targetClaimEffect'] = expectedEffect;
          changes.push('ALIGN_INFERENCE_TARGET_EFFECT');
        }
      }
    }
  }

  if (Array.isArray(output['representativeWrongPaths'])) {
    output['representativeWrongPaths'] = output['representativeWrongPaths']
      .filter(isRecord)
      .map((path) => {
        const normalized = structuredClone(path);
        const selectedChoiceIds = Array.isArray(normalized['selectedChoiceIds'])
          ? normalized['selectedChoiceIds'].filter(
              (id) => typeof id === 'string' && id !== answerChoiceId,
            )
          : [];
        if (JSON.stringify(normalized['selectedChoiceIds']) !== JSON.stringify(selectedChoiceIds)) {
          normalized['selectedChoiceIds'] = selectedChoiceIds;
          changes.push('REMOVE_ANSWER_FROM_WRONG_PATH_SELECTIONS');
        }
        const expectedMissedAnswer = normalized['scope'] === 'SELECTED_WRONG_CHOICE'
          ? null
          : answerChoiceId;
        if (normalized['missedAnswerChoiceId'] !== expectedMissedAnswer) {
          normalized['missedAnswerChoiceId'] = expectedMissedAnswer;
          changes.push('ALIGN_WRONG_PATH_MISSED_ANSWER');
        }
        return normalized;
      })
      .filter((path) => (
        Array.isArray(path['selectedChoiceIds']) && path['selectedChoiceIds'].length > 0
      ));
  }
  return { value: output, changes };
}
