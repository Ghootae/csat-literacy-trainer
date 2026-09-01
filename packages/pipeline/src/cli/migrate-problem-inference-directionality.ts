import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  ProblemQuestionGoldSchema,
  auditProblemGoldWarnings,
  type ProblemQuestionGold,
} from '../problem-solving/gold.js';

type Operation = ProblemQuestionGold['itemInferences'][number]['operation'];
type ClaimEffect = ProblemQuestionGold['itemInferences'][number]['targetClaimEffect'];

interface InferenceMigration {
  readonly premiseRefs: readonly string[];
  readonly operation: Operation;
  readonly conclusion: string;
  readonly targetClaimEffect: ClaimEffect;
  readonly targetClaimIds: readonly string[];
}

const migrations: Readonly<Record<string, Readonly<Record<string, InferenceMigration>>>> = {
  'mrna-vaccine-lipid-nanoparticle-q19': {
    II1: {
      premiseRefs: ['SF3', 'SF5', 'VA3', 'VA4'], operation: 'CHECK_CONDITION',
      conclusion: '두 용액의 투입 속도로 투입량과 혼합 비율을 일정하게 통제하면 복합체가 형성되는 조건을 일정하게 유지할 수 있으므로 균일도 유지 판단을 지지한다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC2-1'],
    },
    II2: {
      premiseRefs: ['MP3', 'MP5', 'SF1', 'SF2', 'SF3'], operation: 'APPLY_RULE',
      conclusion: '산성 mRNA 용액과 이온화 지질 용액이 혼합되면 낮은 pH에서 이온화 지질이 양이온화되어 음전하 mRNA와 결합할 수 있다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC3-1'],
    },
    II3: {
      premiseRefs: ['MP4', 'MP5', 'SF4'], operation: 'FOLLOW_CAUSAL_CHAIN',
      conclusion: '완충 용액 투석으로 pH가 높아지면 수소 이온 농도가 낮아지고 이온화 지질은 전기적으로 중성이 된다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC4-1', 'OC5-1'],
    },
    II4: {
      premiseRefs: ['MP1', 'MP4', 'SF4'], operation: 'CHECK_JUSTIFICATION',
      conclusion: 'pH 상승으로 이온화 지질이 중성화된다는 사실만으로 이 지질의 소수성이 약해진다는 변환은 기본 골드에서 정당화되지 않으므로 해당 주장을 기각한다.',
      targetClaimEffect: 'CONTRADICTS', targetClaimIds: ['OC5-2'],
    },
  },
  'gongsun-long-later-mohists-q12': {
    II1: {
      premiseRefs: ['MP2', 'MP3', 'SF1', 'SF2'], operation: 'APPLY_RULE',
      conclusion: '같은 ‘옷’이라는 명인 ⓐ와 ⓑ가 서로 다른 실을 지시하므로 공손룡의 엄격한 명·실 일대일 대응을 위반한다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC1-1', 'OC1-2'],
    },
    II2: {
      premiseRefs: ['MP6', 'SF1', 'SF4'], operation: 'APPLY_RULE',
      conclusion: '같은 ‘옷’이라는 명인 ⓐ와 ⓓ가 서로 다른 지시 범위를 갖는 사례는 하나의 명이 여러 실을 지시할 수 있다는 후기 묵가의 견해에 부합한다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC2-1', 'OC2-2'],
    },
    II3: {
      premiseRefs: ['MP7', 'MP8', 'SF2'], operation: 'CLASSIFY',
      conclusion: '여러 옷에 적용 가능한 유명인 ⓑ의 ‘옷’을 손에 든 한 벌에만 대응했으므로 이 상황에서는 사명으로 사용되었다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC3-1', 'OC3-2'],
    },
    II4: {
      premiseRefs: ['MP4', 'SF4', 'SF5'], operation: 'COMPARE',
      conclusion: 'ⓓ는 일반적인 옷을, ⓔ는 빨간색 속성이 지정된 옷을 뜻하므로 둘이 같은 대상을 지시한다는 전제는 보기의 발화 구분과 맞지 않는다.',
      targetClaimEffect: 'CONTRADICTS', targetClaimIds: ['OC4-1'],
    },
    II5: {
      premiseRefs: ['MP4', 'SF3', 'SF5'], operation: 'APPLY_RULE',
      conclusion: 'ⓔ ‘빨간 옷’은 ⓒ ‘옷’에 빨갛다는 속성이 더해진 명이므로 공손룡은 두 명의 용법을 구분해야 한다고 본다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC5-1', 'OC5-2'],
    },
  },
  'corporate-law-q13': {
    II1: {
      premiseRefs: ['MP5', 'SF2'], operation: 'APPLY_RULE',
      conclusion: 'A의 투자·배당 재원이 크게 줄어 배당을 보류한 상황은 배당에 사용할 이익 잉여금이 충분하지 않다는 판단을 지지한다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC1-1'],
    },
    II2: {
      premiseRefs: ['MP1', 'MP2', 'MP3', 'SF4', 'SF5'], operation: 'MAP_CONCEPT',
      conclusion: '갑의 자산 운용 권한은 대표 이사에게 정관·법령으로 부여된 것이며 개인 재산 출연이나 갑 개인에게 법인격이 부여된 데서 생기지 않으므로 해당 권한 근거 주장은 성립하지 않는다.',
      targetClaimEffect: 'CONTRADICTS', targetClaimIds: ['OC2-1'],
    },
    II3: {
      premiseRefs: ['MP6', 'SF3'], operation: 'APPLY_RULE',
      conclusion: '신용도와 주가가 하락한 A는 회사 목적 달성을 위해 자본 거래로 자본 잉여금을 얻는 방안을 고려할 수 있다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC3-1'],
    },
    II4: {
      premiseRefs: ['MP7', 'SF2'], operation: 'FOLLOW_CAUSAL_CHAIN',
      conclusion: '잉여금으로 누적 적자를 보전하지 못하면 자본금 감소로 이어져 회사 존립이 위태로워질 수 있다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC4-1'],
    },
    II5: {
      premiseRefs: ['MP2', 'SF4', 'SF5'], operation: 'CHECK_CONDITION',
      conclusion: '대표 이사에게 자산 운용 권한이 있더라도 정관·법령상 절차를 거치지 않은 법인 자산 운용에는 법적 책임이 발생할 수 있다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC5-1'],
    },
  },
  'information-asymmetry-free-marketplace-q13': {
    II1: {
      premiseRefs: ['MP1', 'MP2', 'SF1', 'SF2', 'SF3'], operation: 'CHECK_CONDITION',
      conclusion: '플랫폼 사업자에 대한 생성형 AI 사용 표시 의무는 아직 확대 주장 단계이므로 플랫폼 A를 현행 표시 의무 위반으로 제재할 수 없다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC1-1'],
    },
    II2: {
      premiseRefs: ['MP1', 'MP2', 'SF1', 'SF2'], operation: 'CHECK_CONDITION',
      conclusion: '정보 제공자인 갑에게 표시 의무를 부과해야 한다는 것은 제안일 뿐 현행 의무가 아니므로 갑을 현행 표시 의무 위반으로 제재할 수 없다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC2-1'],
    },
    II3: {
      premiseRefs: ['MP3', 'SF4'], operation: 'COMPARE',
      conclusion: '특정 주장을 하는 사람을 처벌하는 법은 표현을 의견 경쟁에 맡겨야 한다는 다수 의견의 취지에 부합하지 않는다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC3-1'],
    },
    II4: {
      premiseRefs: ['MP4', 'SF5'], operation: 'APPLY_RULE',
      conclusion: '여러 이름으로 같은 취지의 글을 반복 게시해 여론과 의사 결정이 왜곡될 수 있다는 사례는 공동 규제를 강조한 소수 의견을 뒷받침할 수 있다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC4-1'],
    },
    II5: {
      premiseRefs: ['MP5', 'SF3', 'SF5'], operation: 'APPLY_RULE',
      conclusion: '다수 의견이 실명 확인 의무 위반 언론사를 제재하는 규정을 위헌으로 판단했으므로 플랫폼 B를 실명 확인 미실시를 이유로 해당 규정에 따라 제재할 수 있다는 결론은 성립하지 않는다.',
      targetClaimEffect: 'CONTRADICTS', targetClaimIds: ['OC5-1'],
    },
  },
  'surface-tension-laplace-q16': {
    II1: {
      premiseRefs: ['MP3', 'SF1'], operation: 'APPLY_RULE',
      conclusion: '구입 직후 빨간색과 파란색 잉크가 모두 안정적으로 출력됐으므로 두 잉크의 오네소르게 수 모두 적정 범위에 있었다.',
      targetClaimEffect: 'CONTRADICTS', targetClaimIds: ['OC1-1'],
    },
    II2: {
      premiseRefs: ['MP1', 'MP4', 'SF2', 'SF3'], operation: 'FOLLOW_CAUSAL_CHAIN',
      conclusion: '점도 증가로 오네소르게 수가 너무 커져 노즐이 막혔다면 정상 출력을 위한 첨가제는 그 수를 더 키우는 것이 아니라 적정 범위 쪽으로 낮춰야 한다.',
      targetClaimEffect: 'CONTRADICTS', targetClaimIds: ['OC2-1'],
    },
    II3: {
      premiseRefs: ['MP2'], operation: 'CALCULATE',
      conclusion: '밀도를 두 배로 하고 노즐 지름을 절반으로 하면 두 값의 곱이 유지되므로 점도와 표면 장력이 같을 때 오네소르게 수는 변하지 않는다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC3-1'],
    },
    II4: {
      premiseRefs: ['MP3', 'SF1', 'SF4'], operation: 'FOLLOW_CAUSAL_CHAIN',
      conclusion: '파란색 잉크가 최초에 안정적으로 출력됐고 두 달 뒤에도 성질 변화가 없으므로 오네소르게 수가 적정 범위를 벗어났다고 볼 수 없다.',
      targetClaimEffect: 'CONTRADICTS', targetClaimIds: ['OC4-1'],
    },
    II5: {
      premiseRefs: ['MP1', 'MP4', 'MP5'], operation: 'COMPARE',
      conclusion: '잉크가 더 끈적거리면 점도와 오네소르게 수가 커지는 방향이므로 수가 너무 작을 때 생기는 위성 잉크 방울의 조건과 반대다.',
      targetClaimEffect: 'CONTRADICTS', targetClaimIds: ['OC5-1'],
    },
  },
  'dopamine-motor-control-q13': {
    II1: {
      premiseRefs: ['MP1', 'SF2'], operation: 'COMPARE',
      conclusion: '도파민은 혈액-뇌 장벽을 통과하지 못하지만 말초에서 전환되지 않은 레보도파는 뇌로 전달될 수 있으므로 두 물질의 장벽 통과 여부는 다르다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC1-1'],
    },
    II2: {
      premiseRefs: ['MP2', 'SF3'], operation: 'MAP_CONCEPT',
      conclusion: '카르비도파는 장벽을 통과하지 못하고 말초의 레보도파→도파민 전환을 억제하므로 흑질에서 이미 합성된 도파민의 작용 기간을 연장하지 않는다.',
      targetClaimEffect: 'CONTRADICTS', targetClaimIds: ['OC2-1'],
    },
    II3: {
      premiseRefs: ['MP2', 'SF4'], operation: 'MAP_CONCEPT',
      conclusion: '프라미펙솔은 선조체 수용체에 결합해 기능하므로 흑질 도파민성 뉴런의 도파민 합성 과정에는 직접 영향을 주지 않는다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC3-1'],
    },
    II4: {
      premiseRefs: ['MP2', 'SF2', 'SF3'], operation: 'FOLLOW_CAUSAL_CHAIN',
      conclusion: '카르비도파가 말초에서 레보도파의 도파민 전환을 억제하면 전환되지 않고 뇌로 전달되는 레보도파의 양이 증가한다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC4-1'],
    },
    II5: {
      premiseRefs: ['MP3', 'SF1', 'SF2', 'SF4'], operation: 'APPLY_RULE',
      conclusion: '파킨슨병 진행으로 도파민 기능이 부족해질 때 레보도파 양을 늘리거나 도파민처럼 기능하는 프라미펙솔을 병용하면 운동 증상 완화를 기대할 수 있다.',
      targetClaimEffect: 'SUPPORTS', targetClaimIds: ['OC5-1'],
    },
  },
};

const root = resolve(process.cwd(), 'packages/pipeline/fixtures/experiments/problem-solving');

function evidenceFromRefs(gold: any, premiseRefs: readonly string[]) {
  const propositionById = new Map(
    gold.passageDetailGold.propositions.map((item: any) => [item.id, item]),
  );
  const byParagraph = new Map<string, string[]>();
  for (const id of premiseRefs) {
    const proposition: any = propositionById.get(id);
    if (proposition === undefined) continue;
    const ids = byParagraph.get(proposition.paragraphId) ?? [];
    ids.push(id);
    byParagraph.set(proposition.paragraphId, ids);
  }
  return {
    references: [...byParagraph.entries()].map(([paragraphId, propositionIds]) => ({
      paragraphId, propositionIds, relationIds: [],
    })),
    scenarioFactIds: premiseRefs.filter((id) => id.startsWith('SF')),
    visualAssertionIds: premiseRefs.filter((id) => id.startsWith('VA')),
  };
}

for (const [questionId, questionMigrations] of Object.entries(migrations)) {
  const path = resolve(root, `${questionId}.json`);
  const gold: any = JSON.parse(readFileSync(path, 'utf8'));
  for (const inference of gold.itemInferences) {
    const migration = questionMigrations[inference.inferenceId];
    if (migration === undefined) throw new Error(`${questionId}/${inference.inferenceId} migration 누락`);
    const evidence = evidenceFromRefs(gold, migration.premiseRefs);
    Object.assign(inference, evidence, {
      description: migration.conclusion,
      premiseRefs: [...migration.premiseRefs],
      operation: migration.operation,
      conclusion: migration.conclusion,
      targetClaimEffect: migration.targetClaimEffect,
      targetClaimIds: [...migration.targetClaimIds],
    });
  }
  if (gold.itemInferences.length !== Object.keys(questionMigrations).length) {
    throw new Error(`${questionId} migration 수와 itemInference 수가 다르다.`);
  }

  const inferencesById = new Map(gold.itemInferences.map((item: any) => [item.inferenceId, item]));
  for (const claim of gold.optionClaims) {
    if (claim.itemInferenceIds.length === 0) continue;
    const refs = claim.itemInferenceIds.flatMap((id: string) => {
      const inference: any = inferencesById.get(id);
      if (inference === undefined) throw new Error(`${questionId}/${claim.claimId}: ${id} 누락`);
      return inference.premiseRefs;
    });
    Object.assign(claim, evidenceFromRefs(gold, [...new Set<string>(refs as string[])]));
  }
  for (const choice of gold.choices) {
    const claims = gold.optionClaims.filter((claim: any) => claim.choiceId === choice.choiceId);
    const refs = claims.flatMap((claim: any) => [
      ...claim.references.flatMap((reference: any) => [
        ...reference.propositionIds,
        ...reference.relationIds,
      ]),
      ...claim.scenarioFactIds,
      ...claim.visualAssertionIds,
    ]);
    if (refs.length === 0) continue;
    const evidence = evidenceFromRefs(gold, [...new Set<string>(refs as string[])]);
    choice.requiredReferences = evidence.references;
    choice.scenarioFactIds = evidence.scenarioFactIds;
    choice.visualAssertionIds = evidence.visualAssertionIds;
  }

  const answerChoice = gold.choices.find((choice: any) => choice.choiceId === gold.answerChoiceId);
  for (const step of gold.referencePath) {
    const refs = step.itemInferenceIds.flatMap((id: string) => {
      const inference: any = inferencesById.get(id);
      return inference?.premiseRefs ?? [];
    });
    if (refs.length > 0) {
      Object.assign(step, evidenceFromRefs(gold, [...new Set<string>(refs as string[])]));
    }
    else if (
      step.references.length + step.scenarioFactIds.length + step.visualAssertionIds.length > 0 &&
      step.optionClaimIds.length === 0 &&
      answerChoice !== undefined
    ) {
      step.references = answerChoice.requiredReferences;
      step.scenarioFactIds = answerChoice.scenarioFactIds;
      step.visualAssertionIds = answerChoice.visualAssertionIds;
    }
  }

  const parsed = ProblemQuestionGoldSchema.parse(gold);
  const warnings = auditProblemGoldWarnings(parsed);
  writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`);
  process.stdout.write(`${questionId}: ${parsed.itemInferences.length} migrated, ${warnings.length} warnings\n`);
}
