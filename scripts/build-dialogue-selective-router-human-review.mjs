import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const experimentArgument = process.argv.find((item) => item.startsWith('--experiment-dir='));
const experimentDir = experimentArgument === undefined
  ? path.join(root, 'docs/experiments/dialogue-selective-router-regression-42-2026-09-09')
  : path.resolve(root, experimentArgument.slice('--experiment-dir='.length));
const isV2 = path.basename(experimentDir).includes('v2');
const outputPath = path.join(
  experimentDir,
  isV2
    ? 'HUMAN-REVIEW-V2-15-PARAGRAPHS-42-THREADS.md'
    : 'HUMAN-REVIEW-15-PARAGRAPHS-42-THREADS.md',
);
const passageDir = path.join(
  root,
  'packages/pipeline/fixtures/experiments/dialogue/passages',
);

const passageFiles = [
  'gongsun-long-later-mohists.json',
  'mrna-vaccine-lipid-nanoparticle.json',
  'information-asymmetry-free-marketplace.json',
];

const trajectoriesArgument = process.argv.find((item) => item.startsWith('--trajectories='));
const trajectoriesPath = trajectoriesArgument === undefined
  ? path.join(experimentDir, 'artifacts/trajectories.json')
  : path.resolve(root, trajectoriesArgument.slice('--trajectories='.length));
const trajectories = JSON.parse(fs.readFileSync(trajectoriesPath, 'utf8'));
const repairPath = path.join(experimentDir, 'repair-1/results.json');
const repairResults = fs.existsSync(repairPath)
  ? JSON.parse(fs.readFileSync(repairPath, 'utf8'))
  : [];

const categoryOrder = new Map([
  ['PARTIAL', 0],
  ['EXPLICIT_ERROR', 1],
  ['TOPIC_ONLY', 2],
]);
const domainLabels = {
  HUMANITIES: '인문',
  SCIENCE: '과학',
  SOCIAL: '사회',
};
const statusLabels = {
  PASS: '통과',
  ERROR: '명시적 오류',
  UNCLEAR: '불충분/불명확',
};
const routeLabels = {
  ERROR: 'ERROR · 교정',
  TARGETED_GAP: 'TARGETED_GAP · 간결 진단',
  SPARSE_GAP: 'SPARSE_GAP · 상세 관계 선택 진단',
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function text(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function yesNo(value) {
  if (value === true) return '예';
  if (value === false) return '아니오';
  return '—';
}

function tableText(value) {
  return text(value).replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

function quote(value) {
  return text(value)
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

function judgeOutput(trajectory) {
  return trajectory.judge?.output ?? trajectory.judge ?? {};
}

function caseFlags(trajectory) {
  const judge = judgeOutput(trajectory);
  const flags = [];
  if ((judge.solutionLeakageCount ?? 0) > 0) {
    flags.push(`⚠️ 정답 누출 ${judge.solutionLeakageCount}회`);
  }
  if (judge.prematurePass) flags.push('⚠️ 조기 PASS');
  if (judge.overHeld) flags.push('⚠️ 과도 보류');
  if ((judge.redundantQuestionCount ?? 0) > 0) {
    flags.push(`⚠️ 중복 질문 ${judge.redundantQuestionCount}회`);
  }
  if (judge.finalDecisionAppropriate === false) flags.push('⚠️ 최종 판정 부적절');
  if (judge.studentOutcome && judge.studentOutcome !== 'COMPLETE') {
    flags.push(`⚠️ 학생 결과 ${judge.studentOutcome}`);
  }
  return flags.length > 0 ? flags.join(' · ') : '특이사항 없음';
}

function renderTurn(trajectory, evaluation, index) {
  const result = evaluation.result;
  const route = result.snapshot?.diagnosticRoute;
  const student = trajectory.students?.[index];
  const lines = [];

  lines.push(`#### 턴 ${evaluation.turn}`);
  lines.push('');
  if (index === 0) {
    lines.push('**학생 응답(최초)**');
    lines.push('');
    lines.push(quote(trajectory.initialStudentSummary));
    lines.push('');
  }
  lines.push(
    `- 판정: **${statusLabels[result.status] ?? result.status}**${
      route ? ` / 라우트: **${routeLabels[route] ?? route}**` : ''
    }`,
  );
  lines.push(`- 모델 판정 요약: ${text(result.decisionSummary)}`);
  const normalizationEvents = evaluation.call?.decisionAudit?.normalizationEvents ?? [];
  if (normalizationEvents.length > 0) {
    lines.push(`- 코드 보정: ${normalizationEvents.map((event) => text(event.reason)).join(' / ')}`);
  }
  lines.push(`- 학생에게 준 피드백: ${text(result.studentFeedback)}`);
  if (result.nextQuestion) {
    lines.push(
      `- 후속 질문(${result.nextQuestion.type}): **${text(result.nextQuestion.text)}**`,
    );
  } else {
    lines.push('- 후속 질문: 없음');
  }
  if (student?.output?.answer) {
    lines.push('');
    lines.push(`**가상 학생의 다음 응답(${text(student.output.responseMode)})**`);
    lines.push('');
    lines.push(quote(student.output.answer));
  }
  lines.push('');
  return lines.join('\n');
}

function renderRepair(repair) {
  if (!repair) return '';
  const judge = repair.judge ?? {};
  const flags = [];
  if (!judge.routeAppropriate) flags.push('라우트 부적절');
  if (!judge.targetAppropriate) flags.push('목표 부적절/과도하게 넓음');
  if (!judge.questionNonLeading) flags.push('유도적 질문');
  if (judge.solutionLeakage) flags.push('정답 누출');

  return [
    '#### 수정 후 최초 질문 canary',
    '',
    '> 아래 결과는 수정된 현재 계약으로 다시 만든 **첫 판정과 첫 질문**이다. 이후 학생 응답과',
    '> 2·3턴은 재실행하지 않았다.',
    '',
    `- 기대 라우트: **${routeLabels[repair.expectedRoute] ?? repair.expectedRoute}**`,
    `- 실제 라우트: **${routeLabels[repair.observedRoute] ?? repair.observedRoute}**`,
    `- 학생 피드백: ${text(repair.feedback)}`,
    `- 수정 후 질문: **${text(repair.question?.text)}**`,
    `- 사람 검토 우선 표시: ${flags.length > 0 ? `⚠️ ${flags.join(' · ')}` : '특이사항 없음'}`,
    `- 심사 메모: ${text(judge.note)}`,
    '',
  ].join('\n');
}

function renderCase(trajectory, repair) {
  const judge = judgeOutput(trajectory);
  const lines = [];

  lines.push(`### 응답 유형: ${trajectory.category}`);
  lines.push('');
  lines.push(`**검토 우선 표시:** ${caseFlags(trajectory)}`);
  lines.push('');
  lines.push(`| 항목 | ${isV2 ? 'V2 42사례 전체 회귀 결과' : '기존 42사례 전체 회귀 결과'} |`);
  lines.push('|---|---|');
  lines.push(`| 가상 학생 프로필 | ${tableText(trajectory.studentProfile)} |`);
  lines.push(`| 최종 런타임 상태 | ${tableText(trajectory.finalStatus)} |`);
  lines.push(`| 심사상 학생 결과 | ${tableText(judge.studentOutcome)} |`);
  lines.push(`| 최종 판정 적절 | ${yesNo(judge.finalDecisionAppropriate)} |`);
  lines.push(`| 조기 PASS | ${yesNo(judge.prematurePass)} |`);
  lines.push(`| 과도 보류 | ${yesNo(judge.overHeld)} |`);
  lines.push(`| 질문 누출 횟수 | ${tableText(judge.solutionLeakageCount ?? 0)} |`);
  lines.push(`| 중복 질문 횟수 | ${tableText(judge.redundantQuestionCount ?? 0)} |`);
  lines.push(`| ${isV2 ? '독립 심사 종합 점수(앵커 적용)' : '보조 종합 점수(앵커 없는 1~5)'} | ${tableText(judge.overallScore)} / 5 |`);
  lines.push('');
  lines.push(isV2
    ? '> 최초 학생 응답은 V1과 동일하며, 후속 응답은 V2가 새로 만든 질문에 맞춰 같은 학생 프로필·응답 계획으로 생성했다.'
    : '> 다음 전체 대화는 라우팅·질문 계약을 최종 수정하기 전에 실행한 42사례 회귀 결과다.');
  lines.push('');

  trajectory.evaluations.forEach((evaluation, index) => {
    lines.push(renderTurn(trajectory, evaluation, index));
  });

  lines.push('#### 독립 심사 메모');
  lines.push('');
  lines.push(quote(judge.note));
  lines.push('');
  lines.push(renderRepair(repair));
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

const passages = passageFiles.map((file) => readJson(path.join(passageDir, file)));
const trajectoriesByParagraph = Map.groupBy(trajectories, (item) => item.paragraphId);
const repairByKey = new Map(repairResults.map((item) => [item.targetKey, item]));

const output = [];
output.push(isV2
  ? '# 문단 요약 선택적 라우터 V2 사람 검토본'
  : '# 문단 요약 선택적 라우터 사람 검토본');
output.push('');
output.push('작성일: 2026-09-09 KST  ');
output.push('범위: 3개 지문, 15개 문단, 42개 다중 턴 응답 사례  ');
if (!isV2) output.push('V1 보정 재검사: 취약 사례 20개의 최초 판정·질문');
output.push('');
output.push(isV2
  ? '> 이 문서는 `axis-dialogue-selective-v2`를 기존 42개 최초 학생 응답에 적용한 새 전체 대화 결과다.'
  : '> 이 문서는 `axis-dialogue-selective-v1`의 역사적 결과다. 현재 V2의 실행 결과가 아니다.');
output.push('');
output.push('## 이 문서의 읽는 법');
output.push('');
output.push('- 각 문단은 `원문 → 간결 골드 기준 → 응답 유형별 전체 대화 → 독립 심사` 순서다.');
output.push('- `PARTIAL`은 중심 관계 일부만 말한 응답, `EXPLICIT_ERROR`는 관계를 명시적으로 뒤집은 응답, `TOPIC_ONLY`는 소재만 언급한 응답이다.');
output.push(isV2
  ? '- 42개 최초 응답은 V1과 동일하다. 후속 응답은 수정된 질문에 맞춰 새로 생성했으므로 V1 후속 응답과 문장 단위로 같지 않다.'
  : '- 42개 전체 대화는 최초 구현판의 최대 3턴 결과다. 이 실행에서 소재형 라우팅과 질문 누출 문제가 발견됐다.');
if (!isV2) output.push('- 사례 끝에 `수정 후 최초 질문 canary`가 있으면 V1 보정판으로 그 사례의 첫 질문만 다시 검사한 것이다. 현재 V2 결과가 아니다.');
output.push('- ⚠️ 표시는 직접 검토 우선순위다. 심사 라벨이 맞는지도 원문과 대조해 판단해야 한다.');
output.push(isV2
  ? '- 독립 심사는 1~5점 앵커를 사용했지만 절대적 정답표는 아니다. 원문·학생 발화와 함께 검토해야 한다.'
  : '- `보조 종합 점수`는 출력 범위만 1~5로 정했고 점수별 판단 앵커를 프롬프트에 정의하지 않았다. 메모와 개별 판정 플래그보다 신뢰도가 낮으므로 품질 판단의 주 근거로 사용하지 않는다.');
output.push('');
output.push('### 직접 검토할 때 볼 항목');
output.push('');
output.push('1. 최초 판정이 학생이 실제로 말한 내용만 근거로 했는가?');
output.push('2. `ERROR`라면 학생 발화에 명시적 충돌이 실제로 존재하는가?');
output.push('3. 질문이 아직 확인되지 않은 중심 관계 하나만 겨냥하는가?');
output.push('4. 질문이나 피드백이 정답의 방향·원인·결과를 먼저 알려 주지 않는가?');
output.push('5. 가상 학생의 후속 답변이 질문에 비해 지나치게 모범적이지 않은가?');
output.push('6. 누적 학생 응답만으로 최종 PASS 또는 보류가 타당한가?');
output.push('');
output.push('## 빠른 목차');
output.push('');

for (const passage of passages) {
  output.push(`- ${passage.title}`);
  for (const paragraph of passage.paragraphs) {
    output.push(`  - ${paragraph.position}문단 · ${paragraph.paragraphId}`);
  }
}
output.push('');

for (const passage of passages) {
  const passageTrajectories = trajectories.filter((item) =>
    item.paragraphId.startsWith(`${passage.passageId}-p`),
  );
  const domain = domainLabels[passageTrajectories[0]?.domain] ?? passageTrajectories[0]?.domain ?? '—';
  output.push(`# ${domain} · ${passage.title}`);
  output.push('');
  output.push(`- 출전: ${text(passage.exam)}`);
  output.push(`- 대상 문항 범위: ${text(passage.questionRange)}`);
  output.push('');

  for (const paragraph of passage.paragraphs) {
    const gold = readJson(path.join(root, paragraph.goldPath));
    const paragraphTrajectories = [...(trajectoriesByParagraph.get(paragraph.paragraphId) ?? [])].sort(
      (a, b) => (categoryOrder.get(a.category) ?? 99) - (categoryOrder.get(b.category) ?? 99),
    );

    output.push(`## ${paragraph.position}문단 · ${paragraph.paragraphId}`);
    output.push('');
    output.push('### 원문');
    output.push('');
    output.push(quote(paragraph.text));
    output.push('');
    output.push('<details>');
    output.push('<summary><strong>판정 참고 기준: 간결 골드</strong></summary>');
    output.push('');
    output.push(`- 중심 대상: ${text(gold.centralObject)}`);
    output.push(`- 중심 이야기: ${text(gold.centralStory)}`);
    output.push('- 중심축:');
    for (const axis of gold.centralAxes ?? []) {
      output.push(`  - ${axis.id}: ${axis.description}`);
    }
    output.push('');
    output.push('</details>');
    output.push('');

    for (const trajectory of paragraphTrajectories) {
      output.push(renderCase(trajectory, repairByKey.get(trajectory.targetKey)));
    }
  }
}

fs.writeFileSync(outputPath, `${output.join('\n')}\n`, 'utf8');
console.log(outputPath);
console.log(`paragraphs=${passages.flatMap((passage) => passage.paragraphs).length}`);
console.log(`threads=${trajectories.length}`);
console.log(`repairCases=${repairResults.length}`);
