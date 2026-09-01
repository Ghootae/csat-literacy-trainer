import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ProblemQuestionGoldSchema } from '../problem-solving/gold.js';

type ChoiceConfig = { rationale: string; inference: string; wrongPath: string };
type Proposition = { paragraph: number; description: string; evidence: string };
type Config = {
  questionId: string; passageId: string; questionNumber: number; sourceId: string;
  answer: number; propositions: Proposition[]; facts: string[];
  choices: ChoiceConfig[]; decisive: string; finalExplanation: string;
};

const DATA_ROOT = '/Users/mac/Projects/csat-literacy-trainer/data';
const ROOT = resolve(process.cwd(), 'packages/pipeline/fixtures/experiments');

const configs: Config[] = [
  {
    questionId: 'corporate-law-q13', passageId: 'corporate-law', questionNumber: 13,
    sourceId: '69bbf88d8937cf14551903ca', answer: 2,
    propositions: [
      { paragraph: 1, description: '주식회사의 자산 소유권은 출자한 개인이 아니라 법인에 귀속된다.', evidence: '자산의 소유권은 특정 개인이 아닌 법인에게 귀속된다.' },
      { paragraph: 1, description: '법인의 실제 자산 운용은 정관이나 법령에서 권한을 받은 사람이 수행하며 절차를 어기면 법적 책임이 생길 수 있다.', evidence: '정관이나 법령에서 권한을 부여한 사람에 의해 이루어진다.' },
      { paragraph: 3, description: '주식회사는 구성원 단체에 법인격이 부여되는 사단 법인이자 영리 법인이다.', evidence: '주식회사는 사단 법인이면서 영리 법인으로, 법인격은 주식회사의 구성원 단체에 부여된다.' },
      { paragraph: 3, description: '주식회사의 자산 운용 권한은 이사회·주주 총회·특정 개인에게 법령에 따라 주어진다.', evidence: '자산 운용의 권한은 이사회나 주주 총회, 특정 개인에게 주어진다.' },
      { paragraph: 4, description: '이익 잉여금은 배당·투자·손실 보전에 활용될 수 있다.', evidence: '배당금으로 지급되거나 사업 투자, 손실 보전 등을 목적으로 비교적 자유롭게 활용될 수 있다.' },
      { paragraph: 4, description: '자본 잉여금은 자본 거래 이익이며 제한된 목적에 사용된다.', evidence: '자본 잉여금은 주식 등 자본을 거래하여 얻은 이익이다.' },
      { paragraph: 4, description: '누적 적자를 잉여금으로 보전할 수 없으면 자본금을 사용하며 이는 회사 존립을 위태롭게 할 수 있다.', evidence: '자본금의 감소는 회사의 존립을 위태롭게 한다.' },
    ],
    facts: ['A는 주식회사이다.', 'A는 누적 적자로 투자·배당 재원이 크게 줄었다.', 'A는 신용도와 주가가 하락했다.', '갑은 A의 설립자이자 현재 대표 이사이다.', '갑은 설립 당시 출연했던 부동산을 A에 기부했다.'],
    choices: [
      { rationale: '영업 이익을 분배할 재원이 부족하다는 보기는 배당 재원인 이익 잉여금이 충분하지 않음을 뜻한다.', inference: '배당 보류와 이익 잉여금 부족을 연결한다.', wrongPath: '배당 재원과 이익 잉여금의 관계를 놓친다.' },
      { rationale: '갑의 권한은 정관·법령상 지위에서 생기며, 개인 재산 출연이나 주주가 갑에게 법인격을 주었다는 데서 생기지 않는다.', inference: '출자·법인격 귀속과 대표 이사의 자산 운용 권한 근거를 구분한다.', wrongPath: '설립자의 출자 사실을 개인의 법인격 또는 자산 운용 권한의 직접 근거로 오해한다.' },
      { rationale: '자본 거래를 통한 자본 잉여금 조달은 손실 보전 등 회사 목적을 위한 자산 운용 방안이 될 수 있다.', inference: '신용 하락 상황에서 자본 거래 이익의 활용 가능성을 적용한다.', wrongPath: '자본 잉여금을 배당에만 쓰는 재원으로 오해한다.' },
      { rationale: '잉여금으로 누적 적자를 보전하지 못하면 자본금이 감소하고 회사 존립이 위태로울 수 있다.', inference: '누적 적자에서 자본금 감소까지의 순서를 적용한다.', wrongPath: '자본금은 어떤 경우에도 감소하지 않는다고 오해한다.' },
      { rationale: '대표 이사도 정관·법령과 의사 결정 절차를 어긴 자산 운용에는 법적 책임을 질 수 있다.', inference: '대표 이사의 독립적 권리와 법정 절차 준수 의무를 구분한다.', wrongPath: '대표 이사는 설립자이므로 절차 없이 회사 자산을 운용할 수 있다고 오해한다.' },
    ],
    decisive: '갑의 출자 사실이 아니라 정관·법령상 지위와 절차가 자산 운용 권한의 근거임을 적용한다.',
    finalExplanation: '정답은 ②입니다. 주식회사의 법인격은 구성원 단체에 부여되고 자산은 법인에 귀속됩니다. 갑의 자산 운용 권한은 설립 당시의 개인 재산 출연 때문이 아니라 대표 이사에게 정관이나 법령으로 부여된 권한에서 생깁니다.',
  },
  {
    questionId: 'information-asymmetry-free-marketplace-q13', passageId: 'information-asymmetry-free-marketplace', questionNumber: 13,
    sourceId: '6a213e9386fd308968e100b3', answer: 5,
    propositions: [
      { paragraph: 2, description: '생성물 표시 의무는 생성형 AI 제품·서비스 제공 사업자에게 부과되어 있다.', evidence: '인공 지능을 활용한 제품 또는 서비스를 제공하는 사업자에게 생성형 인공 지능 사용 여부를 표시하도록 한다.' },
      { paragraph: 2, description: '정보 제공자와 플랫폼 사업자에게도 같은 의무를 부과해야 한다는 것은 현재 규정이 아니라 제기된 주장이다.', evidence: '정보 제공자와 ... 플랫폼 사업자에게도 그와 같은 의무를 부과해야 한다는 주장이 제기되고 있다.' },
      { paragraph: 3, description: '사상의 자유 시장 이론과 헌법 재판소 입장은 표현의 진위·가치를 의견 경쟁으로 해결해야 한다고 본다.', evidence: '사상과 의견의 경쟁으로 해결되어야 한다는 입장을 유지하고 있다.' },
      { paragraph: 4, description: '비판론은 허위·왜곡 정보가 민주적 의사 결정을 왜곡할 수 있어 공동 규제가 필요하다고 본다.', evidence: '민주주의 의사 결정의 왜곡을 막기 위해 플랫폼과 정부의 공동 규제가 강화되어야 한다.' },
      { paragraph: 5, description: '실명 확인 의무 위반 언론사를 제재하는 규정에 대해 헌법 재판소 다수 의견은 위헌이라고 결정했다.', evidence: '다수 의견은 해당 규정이 위헌이라고 결정하였다.' },
    ],
    facts: ['갑은 생성형 AI로 과장 글과 가상 의료인 동영상을 제작했다.', '갑의 게시물에는 AI 사용 표시가 없다.', '플랫폼 A와 B는 인터넷 언론사이다.', '을은 특정 주장을 처벌하는 법 제정을 주장했다.', '을은 B에 실명 게시 후 다른 이름으로 같은 취지의 글을 반복 게시했다.'],
    choices: [
      { rationale: '현행 생성물 표시 의무의 직접 대상은 AI 제품·서비스 제공 사업자이며 플랫폼 제재는 아직 제기된 주장에 머문다.', inference: '현행 의무 대상과 확대 주장을 구분한다.', wrongPath: '플랫폼에도 이미 동일한 표시 의무가 시행 중이라고 오해한다.' },
      { rationale: '광고 정보 제공자인 갑에게 표시 의무를 확대해야 한다는 것은 주장일 뿐 현재 규정상 직접 제재 근거가 아니다.', inference: '정보 제공자에 대한 현재 의무와 제안된 의무를 구분한다.', wrongPath: 'AI를 사용한 모든 제작자에게 현행 표시 의무가 있다고 오해한다.' },
      { rationale: '표현을 처벌하는 법은 의견 경쟁을 중시하고 정부 개입을 경계한 다수 의견 취지와 부합하지 않는다.', inference: '을의 처벌 법안과 사상의 자유 시장 입장을 대조한다.', wrongPath: '위험하다고 주장한 표현은 다수 의견도 처벌해야 한다고 본다고 오해한다.' },
      { rationale: '다른 이름의 반복 글이 정책 결정에 영향을 주면 실제 시민 의견을 왜곡할 수 있다는 소수 의견의 우려를 뒷받침한다.', inference: '반복 익명성에 의한 여론 왜곡과 소수 의견을 연결한다.', wrongPath: '소수 의견도 실명 확인 제재에 반대했다고 오해한다.' },
      { rationale: '다수 의견은 실명 확인을 하지 않은 언론사를 제재하는 규정이 위헌이라고 보았으므로 B가 제재받는다는 결론은 반대다.', inference: '위헌 결론의 법적 효과를 플랫폼 B 사례에 적용한다.', wrongPath: '위헌 결정이 오히려 실명 확인 위반 제재를 허용한다거나, 소수 의견을 최종 결론으로 오해한다.' },
    ],
    decisive: '헌법 재판소 다수 의견의 위헌 결론은 실명 확인을 하지 않은 플랫폼을 해당 규정으로 제재할 수 없다는 방향임을 적용한다.',
    finalExplanation: '정답은 ⑤입니다. 헌법 재판소 다수 의견은 선거 운동 기간의 실명 확인 의무 위반 언론사를 제재하는 규정이 위헌이라고 결정했습니다. 따라서 실명 확인을 하지 않은 플랫폼 B가 그 규정에 따라 제재받는다는 ⑤는 결론의 방향이 반대입니다.',
  },
  {
    questionId: 'surface-tension-laplace-q16', passageId: 'surface-tension-laplace', questionNumber: 16,
    sourceId: '6a213ea086fd308968e101df', answer: 3,
    propositions: [
      { paragraph: 5, description: '오네소르게 수는 점도가 클수록 커진다.', evidence: '오네소르게 수는 잉크의 점도가 클수록 크다.' },
      { paragraph: 5, description: '오네소르게 수는 표면 장력·밀도·노즐 지름의 곱이 클수록 작다.', evidence: '표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다.' },
      { paragraph: 6, description: '오네소르게 수가 대략 0.1~1.0이면 안정적 인쇄가 가능하다.', evidence: '오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다.' },
      { paragraph: 6, description: '수가 적정 범위보다 크면 잉크가 노즐 밖으로 나오지 못한다.', evidence: '점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다.' },
      { paragraph: 6, description: '수가 적정 범위보다 작으면 위성 잉크 방울로 오염이 생긴다.', evidence: '이와 반대의 경우, 수많은 위성 잉크 방울이 생긴다.' },
    ],
    facts: ['구입 직후 빨간색과 파란색 잉크 모두 안정적으로 출력됐다.', '두 달 뒤 빨간색 잉크는 더 끈적해져 노즐에서 나오지 않았다.', '첨가제로 빨간색 잉크의 끈적거림을 조절해 다시 인쇄했다.', '두 달 뒤 파란색 잉크는 구입 당시와 차이가 없었다.', '두 잉크의 노즐 모양과 크기는 동일하다.'],
    choices: [
      { rationale: '구입 당시 두 잉크 모두 안정적으로 출력됐으므로 두 수 모두 적정 범위에 있었다.', inference: '안정 출력 사실을 두 잉크 모두에 적용한다.', wrongPath: '빨간색은 나중에 막혔으므로 구입 당시에도 적정 범위가 아니었다고 소급한다.' },
      { rationale: '두 달 뒤 빨간색은 점도 증가로 수가 너무 커져 막혔으므로 정상화하려면 수를 더 키우는 것이 아니라 낮춰야 한다.', inference: '점도 증가와 노즐 막힘, 첨가제 조절 방향을 연결한다.', wrongPath: '문제없이 인쇄되려면 오네소르게 수는 무조건 커져야 한다고 오해한다.' },
      { rationale: '밀도 두 배와 노즐 지름 절반은 두 값의 곱을 그대로 유지하므로 다른 값이 같다면 오네소르게 수도 변하지 않는다.', inference: '분모 역할을 하는 밀도와 노즐 지름의 곱이 상쇄됨을 계산한다.', wrongPath: '밀도 증가와 지름 감소를 각각 따로 보고 어느 한 변화만 적용한다.' },
      { rationale: '파란색 잉크는 두 달 뒤에도 구입 때와 차이가 없으므로 적정 범위를 벗어났다고 볼 수 없다.', inference: '변화 없음과 최초 안정 출력을 결합한다.', wrongPath: '시간이 지났다는 이유만으로 파란색도 범위를 벗어났다고 추정한다.' },
      { rationale: '더 끈적해지면 점도와 수가 커지므로 작은 수에서 생기는 위성 방울 방향과 반대다.', inference: '점도 증가와 적정 범위 양쪽 이탈 결과를 구분한다.', wrongPath: '점도가 커지면 잉크가 작은 위성 방울로 쪼개진다고 일상적으로 추측한다.' },
    ],
    decisive: '밀도를 두 배로 하고 노즐 지름을 반으로 하면 두 값의 곱이 유지되어 오네소르게 수가 변하지 않음을 계산한다.',
    finalExplanation: '정답은 ③입니다. 오네소르게 수는 밀도와 노즐 지름의 곱이 클수록 작아집니다. 밀도를 두 배로 하고 지름을 반으로 하면 두 값의 곱은 그대로이므로, 점도와 표면 장력이 같을 때 오네소르게 수도 변하지 않습니다.',
  },
  {
    questionId: 'dopamine-motor-control-q13', passageId: 'dopamine-motor-control', questionNumber: 13,
    sourceId: '69c28579d58cf540a9bc25eb', answer: 2,
    propositions: [
      { paragraph: 1, description: '체외에서 투여한 도파민은 혈액-뇌 장벽을 통과하지 못한다.', evidence: '체내로 유입된 도파민은 혈액-뇌 장벽을 통과할 수 없다.' },
      { paragraph: 1, description: '티로신은 레보도파를 거쳐 도파민으로 합성된다.', evidence: '티로신은 효소에 의해 레보도파로 합성되고, 레보도파는 또 다른 효소에 의해 도파민으로 합성된다.' },
      { paragraph: 4, description: '선조체의 도파민은 직접 경로를 활성화하고 간접 경로를 억제하여 운동을 촉진한다.', evidence: '직접 경로를 활성화하고 간접 경로는 억제하여 ... 운동을 촉진한다.' },
    ],
    facts: ['파킨슨병은 흑질 도파민성 뉴런 파괴로 선조체 도파민이 감소한다.', '레보도파는 뇌로 전달되기 전 상당량이 말초에서 도파민으로 합성된다.', '카르비도파는 레보도파→도파민 효소를 억제하고 혈액-뇌 장벽을 통과하지 못한다.', '프라미펙솔은 선조체 도파민 수용체에 결합해 도파민처럼 기능한다.'],
    choices: [
      { rationale: '경구 레보도파는 일부가 뇌로 전달된다고 제시되어 도파민과 달리 혈액-뇌 장벽을 통과할 수 있다.', inference: '투여 도파민과 레보도파의 장벽 통과 여부를 구분한다.', wrongPath: '도파민 합성 전구체인 레보도파도 도파민처럼 장벽을 통과하지 못한다고 오해한다.' },
      { rationale: '카르비도파는 장벽을 통과하지 못해 말초에서만 작용하므로 흑질에서 이미 합성된 뇌 도파민의 작용 기간을 늘리지 않는다.', inference: '카르비도파의 작용 장소와 기질을 흑질 도파민 작용 기간과 구분한다.', wrongPath: '도파민 합성 효소 억제를 도파민 분해 억제와 혼동하거나 말초 작용을 흑질에 적용한다.' },
      { rationale: '프라미펙솔은 선조체 수용체에 작용하므로 흑질 도파민성 뉴런의 도파민 합성 과정에는 직접 영향을 주지 않는다.', inference: '약물의 작용 위치를 합성 과정과 구분한다.', wrongPath: '도파민처럼 기능한다는 말을 도파민 합성을 늘린다는 뜻으로 오해한다.' },
      { rationale: '카르비도파가 말초 합성을 막으면 더 많은 레보도파가 도파민으로 바뀌기 전에 뇌로 전달될 수 있다.', inference: '말초 전환 억제와 뇌 전달 레보도파 증가를 연결한다.', wrongPath: '카르비도파가 레보도파 자체의 뇌 진입도 막는다고 오해한다.' },
      { rationale: '도파민 감소가 심해질 때 합성 전구체를 늘리거나 수용체 작용제를 병용하면 운동 증상 완화를 기대할 수 있다.', inference: '질병 진행에 따른 도파민 기능 보완 수단을 결합한다.', wrongPath: '병용 가능 조건이나 두 약물의 서로 다른 보완 방식을 놓친다.' },
    ],
    decisive: '카르비도파는 말초에서 레보도파 전환을 막는 약이지 뇌의 흑질 도파민 작용 기간을 연장하는 약이 아님을 구분한다.',
    finalExplanation: '정답은 ②입니다. 카르비도파는 혈액-뇌 장벽을 통과하지 못해 말초 조직에서 레보도파가 도파민으로 바뀌는 것을 억제합니다. 따라서 흑질에서 이미 합성된 도파민의 작용 기간을 연장한다는 설명은 맞지 않습니다.',
  },
];

function ref(passageId: string, propositionId: string) {
  const proposition = configs.find((c) => c.passageId === passageId)?.propositions[Number(propositionId.slice(2)) - 1];
  return [{ paragraphId: `${passageId}-p${proposition?.paragraph ?? 1}`, propositionIds: [propositionId], relationIds: [] }];
}

for (const config of configs) {
  const sourcePath = resolve(DATA_ROOT, `${config.sourceId}_result.json`);
  const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as any;
  const question = source.questions.find((item: any) => item.question_number === config.questionNumber);
  if (!question) throw new Error(`문항 없음: ${config.questionId}`);
  const manifestPath = resolve(ROOT, 'dialogue/passages', `${config.passageId}.json`);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as any;
  const choices = question.choices.map((choice: any, index: number) => ({
    choiceId: `C${choice.choice_number}`, position: choice.choice_number, text: choice.text,
    judgment: choice.choice_number === config.answer
      ? (question.stem.includes('적절하지 않은') ? 'FALSE' : 'TRUE')
      : (question.stem.includes('적절하지 않은') ? 'TRUE' : 'FALSE'),
    rationale: config.choices[index]!.rationale,
    requiredReferences: ref(config.passageId, `MP${Math.min(index + 1, config.propositions.length)}`),
    scenarioFactIds: config.facts.map((_, factIndex) => `SF${factIndex + 1}`), visualAssertionIds: [], claimIds: [`OC${index + 1}-1`],
  }));
  const answerId = `C${config.answer}`;
  const polarity = question.stem.includes('적절하지 않은') ? 'SELECT_INCORRECT' : 'SELECT_CORRECT';
  const gold = {
    schemaVersion: 'problem-solving-gold-v1', reviewStatus: 'human_reviewed',
    source: { sourceId: config.sourceId, exam: source.exam, questionNumber: config.questionNumber, sourcePath, sourceUrl: source.url },
    questionId: config.questionId, passageId: config.passageId, stem: question.stem, stemPolarity: polarity,
    scenario: { text: question.supplements[0].text, facts: config.facts.map((description, i) => ({ id: `SF${i + 1}`, description })) },
    mediaAssets: [], visualAssertions: [],
    passageDetailGold: { passageId: config.passageId, propositions: config.propositions.map((p, i) => ({
      id: `MP${i + 1}`, paragraphId: `${config.passageId}-p${p.paragraph}`, description: p.description,
      polarity: 'positive', conditions: [], exceptions: [], scope: p.description, evidence: p.evidence, basis: 'PASSAGE_EXPLICIT',
    })) },
    itemInferences: config.choices.map((choice, i) => {
      const references = ref(config.passageId, `MP${Math.min(i + 1, config.propositions.length)}`);
      const scenarioFactIds = config.facts.map((_, j) => `SF${j + 1}`);
      const accepted = polarity === 'SELECT_CORRECT'
        ? i + 1 === config.answer
        : i + 1 !== config.answer;
      return {
        inferenceId: `II${i + 1}`,
        description: choice.rationale,
        premiseRefs: [
          ...references.flatMap((reference) => reference.propositionIds),
          ...scenarioFactIds,
        ],
        operation: 'APPLY_RULE',
        conclusion: choice.rationale,
        targetClaimEffect: accepted ? 'SUPPORTS' : 'CONTRADICTS',
        targetClaimIds: [`OC${i + 1}-1`],
        grounding: 'SOURCE_ENTAILED',
        necessity: i + 1 === config.answer ? 'REQUIRED' : 'SUPPORTING',
        references,
        scenarioFactIds,
        visualAssertionIds: [],
      };
    }),
    supplementalExplanationInferences: [],
    optionClaims: choices.map((choice: any, i: number) => {
      const accepted = polarity === 'SELECT_CORRECT'
        ? i + 1 === config.answer
        : i + 1 !== config.answer;
      return {
        claimId: `OC${i + 1}-1`, choiceId: choice.choiceId, order: 1, description: config.choices[i]!.inference,
        assessment: accepted ? 'SUPPORTED' : 'CONTRADICTED', supportStrength: 'ENTAILED',
        decision: accepted ? 'ACCEPTED' : 'REJECTED', decisionBasis: 'SOURCE_GROUNDED', decisionCritical: i + 1 === config.answer,
        dependsOnClaimIds: [], itemInferenceIds: [`II${i + 1}`], fallbackSupplementalInferenceIds: [], supplementalUsePolicy: [],
        references: choice.requiredReferences, scenarioFactIds: choice.scenarioFactIds, visualAssertionIds: [],
      };
    }),
    choices, answerChoiceId: answerId,
    referencePath: [
      { stepId: 'RP1', description: `발문의 ${polarity === 'SELECT_INCORRECT' ? '부정' : '긍정'} 극성을 확인한다.`, references: [], scenarioFactIds: [], visualAssertionIds: [], optionClaimIds: [], itemInferenceIds: [] },
      { stepId: 'RP2', description: '지문의 판단 기준과 보기의 조건을 대응한다.', references: choices[config.answer - 1]!.requiredReferences, scenarioFactIds: choices[config.answer - 1]!.scenarioFactIds, visualAssertionIds: [], optionClaimIds: [], itemInferenceIds: [] },
      { stepId: 'RP3', description: config.decisive, references: choices[config.answer - 1]!.requiredReferences, scenarioFactIds: choices[config.answer - 1]!.scenarioFactIds, visualAssertionIds: [], optionClaimIds: [`OC${config.answer}-1`], itemInferenceIds: [`II${config.answer}`] },
      { stepId: 'RP4', description: `${answerId}를 정답으로 선택한다.`, references: [], scenarioFactIds: [], visualAssertionIds: [], optionClaimIds: [`OC${config.answer}-1`], itemInferenceIds: [] },
    ],
    requiredPathStepIds: ['RP1', 'RP2', 'RP3', 'RP4'], decisivePathStepIds: ['RP3'], conclusionStepIds: ['RP4'],
    finalAnswerExplanation: { answerChoiceId: answerId, message: config.finalExplanation, referencePathStepIds: ['RP2', 'RP3', 'RP4'] },
    representativeWrongPaths: choices.filter((choice: any) => choice.choiceId !== answerId).map((choice: any, i: number) => ({
      id: `WP-${choice.choiceId}`, scope: 'SELECTED_WRONG_CHOICE', selectedChoiceIds: [choice.choiceId], missedAnswerChoiceId: null,
      description: config.choices[choice.position - 1]!.wrongPath, candidateDivergenceLayers: ['CONDITION_APPLICATION'],
    })).concat([{
      id: `WP-MISSED-${answerId}`, scope: 'MISSED_ANSWER', selectedChoiceIds: choices.filter((choice: any) => choice.choiceId !== answerId).map((choice: any) => choice.choiceId),
      missedAnswerChoiceId: answerId, description: `정답 선지의 결정적 관계를 검토하지 못해 ${answerId}를 놓친다.`, candidateDivergenceLayers: ['INFERENCE_TRANSFORMATION'],
    }]),
    reviewNotes: [{ noteId: 'RN1', targetType: 'CHOICE', targetId: answerId, text: '기본 골드와 보기만으로 결정적 오류를 판정하며 공식 해설의 추가 설명은 역수입하지 않는다.' }],
  };
  const parsedGold = ProblemQuestionGoldSchema.parse(gold);
  const publicFixture = {
    questionId: config.questionId, questionNumber: config.questionNumber, passageId: config.passageId,
    title: manifest.title, exam: manifest.exam, passage: manifest.paragraphs.map((p: any) => p.text).join('\n\n'),
    stem: question.stem, scenario: question.supplements[0].text, image: null,
    choices: choices.map(({ choiceId, position, text }: any) => ({ choiceId, position, text })),
  };
  writeFileSync(resolve(ROOT, 'problem-solving', `${config.questionId}.json`), `${JSON.stringify(parsedGold, null, 2)}\n`);
  writeFileSync(resolve(ROOT, 'problem-solving/public', `${config.questionId}.json`), `${JSON.stringify(publicFixture, null, 2)}\n`);
}
