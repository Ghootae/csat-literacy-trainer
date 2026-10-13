import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const sourceDir = path.join(root, 'docs/experiments/v4-light-output-v1-2026-09-22');
const outDir = path.join(root, 'docs/experiments/jev-v4-natural-agreement-v1-2026-09-29');

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(sourceDir, name), 'utf8'));
const cases = readJson('cases.json');
const sources = readJson('sources.json');
const human = readJson('HUMAN-ADJUDICATION.json');
const v4Rows = fs.readFileSync(path.join(sourceDir, 'results.jsonl'), 'utf8')
  .trim().split('\n').map(JSON.parse).filter((row) => row.arm === 'v4');

const v4ByCase = new Map(v4Rows.map((row) => [row.caseId, row]));
const humanByCase = new Map(human.cases.map((row) => [row.caseId, row]));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function studentState(item) {
  const lines = [
    '다음은 학생이 실제로 한 발화만을 근거로 의미 관계를 측정하는 과업이다.',
    'INITIAL_STUDENT_UTTERANCE:',
    item.initialResponse,
  ];
  if (item.history.length) {
    lines.push('', 'FOLLOW_UP_EXCHANGES:');
    item.history.forEach((exchange, index) => {
      lines.push(
        `EXCHANGE_${index + 1}_QUESTION_CONTEXT: ${exchange.question.text}`,
        `EXCHANGE_${index + 1}_STUDENT_ANSWER: ${exchange.answer}`,
      );
    });
    lines.push(
      '',
      'QUESTION_CONTEXT는 학생 지식의 독립 근거가 아니다. 짧은 STUDENT_ANSWER의 지시 대상·주어·서술어를 해석하는 데만 사용하고, 질문에만 있으며 학생이 답하거나 확인하지 않은 내용은 학생이 표현한 것으로 간주하지 마라.',
    );
  }
  lines.push('', 'REFERENCE_TEXT와 AXIS는 제공되지 않았다. 학생이 실제로 표현한 내용만 평가하라.');
  return lines.join('\n');
}

function coveragePrompt(relation) {
  return `오직 학생이 실제로 한 INITIAL_STUDENT_UTTERANCE와 STUDENT_ANSWER만 근거로 판단하라. 학생의 누적 응답이 TARGET_MR(${relation.id}: ${relation.description})의 의미 관계를 올바른 방향과 범위로 표현했는가? TARGET_MR에 적힌 내용을 학생이 말했다고 추론하거나 누락된 내용을 보충하지 마라. 관련 단어만 언급했거나 관계의 필수적인 원인·결과·대조·조건 중 한쪽만 표현했다면 완전한 표현으로 간주하지 마라. QUESTION_CONTEXT는 짧은 답변의 지시 대상을 해석하는 문맥일 뿐 독립 근거가 아니다.`;
}

function collisionPrompt(relation) {
  return `오직 학생이 실제로 한 INITIAL_STUDENT_UTTERANCE와 STUDENT_ANSWER만 근거로 판단하라. 학생의 현재 누적 응답이 TARGET_MR(${relation.id}: ${relation.description})의 명시적인 부정, 논리적 반대, 사실·관계 방향의 역전을 주장하는가? TARGET_MR을 지지하지 않는 것만으로는 충돌이 아니다. 무관한 주장, 단순한 생략, 짧은 답변, 정보 부족은 반드시 false로 판단하라. QUESTION_CONTEXT에만 있는 내용은 학생의 주장으로 간주하지 마라.`;
}

const included = [];
const excluded = [];
const requests = [];

for (const item of cases) {
  const source = sources[item.paragraphId];
  const gold = source.gold;
  const relationById = new Map(gold.coreRelations.map((relation) => [relation.id, relation]));
  const usedRelationIds = [...new Set(gold.centralAxes.flatMap((axis) => axis.relationIds))];
  const missingRoleIds = usedRelationIds.filter((id) => !relationById.get(id)?.diagnosticRole);
  const v4 = v4ByCase.get(item.id);
  const humanRow = humanByCase.get(item.id);

  const shared = {
    caseId: item.id,
    paragraphId: item.paragraphId,
    title: source.title,
    responseStage: item.stratum,
    turn: item.turn,
    v4ContractValid: v4?.contractError == null,
    v4ContractError: v4?.contractError ?? null,
  };

  if (missingRoleIds.length) {
    excluded.push({
      ...shared,
      reason: 'connected_mr_missing_diagnostic_role',
      missingRoleIds,
      axisIds: gold.centralAxes.map((axis) => axis.id),
    });
    continue;
  }

  const state = studentState(item);
  const sensorQuestions = [];
  for (const relationId of usedRelationIds) {
    const relation = relationById.get(relationId);
    if (relation.diagnosticRole === 'required') {
      sensorQuestions.push({
        id: `${relation.id}_coverage`,
        relationId: relation.id,
        sensor: 'coverage',
        prompt: coveragePrompt(relation),
      });
    }
    sensorQuestions.push({
      id: `${relation.id}_collision`,
      relationId: relation.id,
      sensor: 'collision',
      prompt: collisionPrompt(relation),
    });
  }

  const axes = gold.centralAxes.map((axis) => ({
    axisId: axis.id,
    description: axis.description,
    relations: axis.relationIds.map((relationId) => {
      const relation = relationById.get(relationId);
      return {
        relationId,
        description: relation.description,
        diagnosticRole: relation.diagnosticRole,
      };
    }),
    v4: v4?.axes?.find((entry) => entry.axisId === axis.id) ?? null,
    humanApproved: humanRow?.approvedAxes?.find((entry) => entry.axisId === axis.id) ?? null,
  }));

  const requestIds = [];
  for (let offset = 0; offset < sensorQuestions.length; offset += 5) {
    const batch = sensorQuestions.slice(offset, offset + 5);
    const requestId = `${item.id}-jev-${String(offset / 5 + 1).padStart(2, '0')}`;
    const questions = Object.fromEntries(batch.map((question) => [question.id, {
      instructions: question.prompt,
      type: 'boolean',
    }]));
    const payload = { state, questions };
    requests.push({
      requestId,
      caseId: item.id,
      paragraphId: item.paragraphId,
      responseStage: item.stratum,
      sensors: batch.map(({ id, relationId, sensor }) => ({ id, relationId, sensor })),
      payload,
      payloadHash: sha256(JSON.stringify(payload)),
    });
    requestIds.push(requestId);
  }

  included.push({
    ...shared,
    studentEvidence: {
      initialResponse: item.initialResponse,
      history: item.history,
      state,
    },
    axes,
    sensors: sensorQuestions.map(({ prompt, ...sensor }) => sensor),
    requestIds,
  });
}

const manifest = {
  experimentId: 'jev-v4-natural-agreement-v1-2026-09-29',
  createdAt: new Date().toISOString(),
  sourceExperiment: 'docs/experiments/v4-light-output-v1-2026-09-22',
  endpoint: 'https://jevplayground.com/api/evaluate',
  inputPolicy: 'TARGET_MR + raw student evidence; no paragraph text or axis description',
  followUpPolicy: 'question text is referent context only and is explicitly barred as independent evidence',
  inclusionPolicy: 'all connected MRs must have explicit required/error_only diagnosticRole',
  counts: {
    sourceCases: cases.length,
    includedCases: included.length,
    excludedCases: excluded.length,
    includedAxes: included.reduce((sum, item) => sum + item.axes.length, 0),
    excludedAxes: excluded.reduce((sum, item) => sum + item.axisIds.length, 0),
    sensors: included.reduce((sum, item) => sum + item.sensors.length, 0),
    requests: requests.length,
    initialCases: included.filter((item) => item.responseStage === 'initial').length,
    followUpCases: included.filter((item) => item.responseStage === 'followup').length,
  },
  included,
  excluded,
  requests,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'requests.jsonl'), `${requests.map((row) => JSON.stringify(row)).join('\n')}\n`);
console.log(JSON.stringify(manifest.counts, null, 2));

