import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const dialogueLog = resolve(root, '.omc/logs/dialogue-experiment/sessions.jsonl');
const problemLog = resolve(root, '.omc/logs/problem-solving/sessions.jsonl');
const output = resolve(
  root,
  'docs/experiments/user-direct-full-cycle-six-2026-09-11/REVIEW-PACKET.md',
);

const cycles = [
  {
    passageId: 'gongsun-long-later-mohists',
    learningSessionId: 'a93573e2-cbd3-4bd1-8a19-89c4ac93df94',
    startedAt: '2026-09-11T06:45:00.000Z',
    completedAt: '2026-09-11T07:00:00.000Z',
  },
  {
    passageId: 'dopamine-motor-control',
    learningSessionId: '2c00bb11-2944-4be2-b900-5c527fd97eb5',
    startedAt: '2026-09-11T07:35:00.000Z',
    completedAt: '2026-09-11T07:55:00.000Z',
  },
  {
    passageId: 'corporate-law',
    learningSessionId: 'd4fdc6c0-3d62-40e9-8750-c85bd38ea31f',
    startedAt: '2026-09-11T11:06:00.000Z',
    completedAt: '2026-09-11T11:46:00.000Z',
  },
  {
    passageId: 'information-asymmetry-free-marketplace',
    learningSessionId: 'f438a323-490f-4943-a1b3-bb318d42bdad',
    startedAt: '2026-09-11T11:45:00.000Z',
    completedAt: '2026-09-11T12:12:00.000Z',
  },
  {
    passageId: 'surface-tension-laplace',
    learningSessionId: 'ebde02ac-e01f-4b87-9185-27b85ff2046f',
    startedAt: '2026-09-11T12:11:00.000Z',
    completedAt: '2026-09-11T12:30:00.000Z',
  },
  {
    passageId: 'mrna-vaccine-lipid-nanoparticle',
    learningSessionId: 'bd347005-c107-4ab4-96e2-2a4ec5108f15',
    startedAt: '2026-09-11T12:30:00.000Z',
    completedAt: '2026-09-11T13:04:00.000Z',
  },
];

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function readJsonl(path) {
  return readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
}

function block(text) {
  return String(text).split('\n').map((line) => `> ${line}`).join('\n');
}

function choiceNumber(content, choiceId) {
  return content.choices.find((choice) => choice.choiceId === choiceId)?.position ?? choiceId;
}

function problemReason(turn) {
  const target = turn.targetSnapshots.find((snapshot) => snapshot.kind === 'SELECTED_CHOICE');
  return target?.hypotheses?.[0]?.description ?? target?.sufficiency?.choiceExplained?.reason ?? null;
}

const dialogueRows = readJsonl(dialogueLog);
const problemRows = readJsonl(problemLog);
const rendered = [];
let paragraphCount = 0;
let initialPassCount = 0;
let followUpQuestionCount = 0;
let unclearCount = 0;
let errorCount = 0;
let problemEvaluatorCalls = 0;

for (const cycle of cycles) {
  cycle.passage = readJson(
    `packages/pipeline/fixtures/experiments/dialogue/passages/${cycle.passageId}.json`,
  );
  cycle.problem = readJson(
    `packages/pipeline/fixtures/experiments/problem-solving/public/${cycle.passage.problemQuestionId}.json`,
  );
  cycle.dialogues = dialogueRows
    .filter((row) => row.paragraphId.startsWith(`${cycle.passageId}-p`))
    .filter((row) => row.startedAt >= cycle.startedAt && row.startedAt < cycle.completedAt)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  cycle.problemRecord = problemRows.find((row) => row.learningSessionId === cycle.learningSessionId);
  if (cycle.dialogues.length !== cycle.passage.paragraphs.length) {
    throw new Error(`${cycle.passageId}: 문단 기록 수가 원문과 다릅니다.`);
  }
  if (cycle.problemRecord === undefined) throw new Error(`${cycle.passageId}: 문제 기록이 없습니다.`);

  paragraphCount += cycle.dialogues.length;
  initialPassCount += cycle.dialogues.filter((row) => row.turns[0]?.evaluation.status === 'PASS').length;
  for (const row of cycle.dialogues) {
    followUpQuestionCount += row.turns.filter((turn) => turn.questionShown !== null).length;
    unclearCount += row.turns.filter((turn) => turn.evaluation.status === 'UNCLEAR').length;
    errorCount += row.turns.filter((turn) => turn.evaluation.status === 'ERROR').length;
  }
  problemEvaluatorCalls += cycle.problemRecord.evaluatorCalls.length;
}

rendered.push('# 사용자 직접 전 구간 사용 기록: 문단 요약 → 연결 문항');
rendered.push('');
rendered.push('- 실행일: 2026-09-11 KST');
rendered.push('- 대상: 프로젝트 사용자가 학생 역할로 직접 수행한 6지문·30문단·연결 문항 6개');
rendered.push('- 문단 평가: `axis-dialogue-selective-v2` / 중심 이야기 게이트 `central-story-gate-prompt-v2`');
rendered.push('- 문제 평가: 원문 직접 v3 / `source-direct-problem-dialogue-prompt-v3`');
rendered.push('- 원기록: `.omc/logs/dialogue-experiment/sessions.jsonl`, `.omc/logs/problem-solving/sessions.jsonl`');
rendered.push('');
rendered.push('이 문서는 자동 테스트 기록과 분리한 실제 UI 사용 세션만 담는다. 문단 원문은 대화 passage fixture, 문항·보기·선지는 공개 문제 fixture, 응답·판정·질문·결과는 완료 세션 JSONL에서 가져왔다. 맞춤법과 띄어쓰기를 포함해 학생 입력은 원문 그대로 보존했다.');
rendered.push('');
rendered.push('## 전체 집계');
rendered.push('');
rendered.push('| 항목 | 결과 |');
rendered.push('|---|---:|');
rendered.push(`| 완료 지문 / 문단 / 연결 문항 | ${cycles.length} / ${paragraphCount} / ${cycles.length} |`);
rendered.push(`| 문단 최종 PASS | ${paragraphCount}/${paragraphCount} |`);
rendered.push(`| 최초 응답 즉시 PASS | ${initialPassCount}/${paragraphCount} |`);
rendered.push(`| 후속 질문 | ${followUpQuestionCount}회 |`);
rendered.push(`| 비통과 중간 판정 | UNCLEAR ${unclearCount}회 / ERROR ${errorCount}회 |`);
rendered.push(`| 문단 평가 호출 | ${paragraphCount + followUpQuestionCount}회 |`);
rendered.push(`| 문제 평가 호출 | ${problemEvaluatorCalls}회 |`);
rendered.push('| 문제 최종 정답 | 6/6 |');
rendered.push('| 첫 선택 정답 | 5/6 |');
rendered.push('| 재선택 후 정답 | 1/6 |');
rendered.push('| 근거 검증 | SUPPORTED 5건 / UNCERTAIN 1건 |');
rendered.push('| 정답 공개 | 0건 |');
rendered.push('');
rendered.push('## 지문별 요약');
rendered.push('');
rendered.push('| 지문 | 문단 | 즉시 PASS | 후속 질문 | 문제 경로 | 최종 근거 판정 |');
rendered.push('|---|---:|---:|---:|---|---|');
for (const cycle of cycles) {
  const session = cycle.problemRecord.session;
  const immediate = cycle.dialogues.filter((row) => row.turns[0]?.evaluation.status === 'PASS').length;
  const questions = cycle.dialogues.reduce(
    (sum, row) => sum + row.turns.filter((turn) => turn.questionShown !== null).length,
    0,
  );
  rendered.push(`| ${cycle.passage.title} | ${cycle.dialogues.length} | ${immediate} | ${questions} | ${session.result.resolutionOutcome} | ${session.result.rationaleAssessment} |`);
}

rendered.push('');
rendered.push('## 전체 원문과 실제 대화');

for (const [cycleIndex, cycle] of cycles.entries()) {
  const { passage, problem, problemRecord } = cycle;
  const session = problemRecord.session;
  rendered.push('');
  rendered.push(`### ${cycleIndex + 1}. ${passage.title}`);
  rendered.push('');
  rendered.push(`- 출전: ${passage.exam}`);
  rendered.push(`- 학습 세션 ID: \`${cycle.learningSessionId}\``);
  rendered.push(`- 연결 문항: ${problem.questionNumber}번`);
  rendered.push('');

  for (let index = 0; index < passage.paragraphs.length; index += 1) {
    const paragraph = passage.paragraphs[index];
    const dialogue = cycle.dialogues[index];
    rendered.push(`#### ${paragraph.position}문단`);
    rendered.push('');
    rendered.push('원문');
    rendered.push('');
    rendered.push(block(paragraph.text));
    rendered.push('');
    rendered.push('학생 최초 응답');
    rendered.push('');
    rendered.push(block(dialogue.initialResponse));
    rendered.push('');
    for (let turnIndex = 0; turnIndex < dialogue.turns.length; turnIndex += 1) {
      const turn = dialogue.turns[turnIndex];
      rendered.push(`판정 ${turnIndex + 1}: **${turn.evaluation.status}**`);
      rendered.push('');
      rendered.push(`- 학생 피드백: ${turn.evaluation.studentFeedback}`);
      rendered.push(`- 내부 판정 요약: ${turn.evaluation.decisionSummary}`);
      if (turn.questionShown !== null) {
        rendered.push(`- 후속 질문: ${turn.questionShown}`);
        rendered.push(`- 학생 후속 답변: ${turn.studentAnswer}`);
      }
      rendered.push('');
    }
  }

  rendered.push(`#### 연결 문항 ${problem.questionNumber}번 원자료`);
  rendered.push('');
  rendered.push(`**발문:** ${problem.stem}`);
  rendered.push('');
  rendered.push('**보기**');
  rendered.push('');
  rendered.push(block(problem.scenario));
  rendered.push('');
  rendered.push('**선지**');
  rendered.push('');
  for (const choice of problem.choices) rendered.push(`${choice.position}. ${choice.text}`);
  rendered.push('');
  rendered.push(`- 정답: ${choiceNumber(problem, session.answerChoiceId)}번`);
  rendered.push(`- 최초 선택: ${choiceNumber(problem, session.initialChoiceId)}번`);
  rendered.push(`- 최초 선택 근거: ${session.observations[0]?.rationale ?? '미입력'}`);
  rendered.push('');

  if (session.turns.length === 0) {
    rendered.push('후속 대화 없음.');
    rendered.push('');
  } else {
    for (const turn of session.turns) {
      const response = session.observations.find((observation) => observation.inReplyToTurnId === turn.turnId);
      const action = turn.nextAction;
      rendered.push(`**문제 풀이 ${turn.turnId}**`);
      rendered.push('');
      rendered.push(`- 내부 상태: ${turn.targetSnapshots.find((snapshot) => snapshot.kind === 'SELECTED_CHOICE')?.learningState ?? '없음'}`);
      const reason = problemReason(turn);
      if (reason !== null) rendered.push(`- 판정 이유: ${reason}`);
      rendered.push(`- 시스템 행동: ${action.type}`);
      rendered.push(`- 학생에게 표시: ${action.question ?? action.prompt ?? ''}`);
      if (response?.kind === 'RESELECTION') {
        rendered.push(`- 학생 재선택: ${choiceNumber(problem, response.selectedChoiceId)}번`);
        rendered.push(`- 재선택 근거: ${response.rawResponse ?? '미입력'}`);
      } else if (response !== undefined) {
        rendered.push(`- 학생 답변: ${response.rawResponse}`);
      }
      rendered.push('');
    }
  }

  rendered.push('**문제 최종 결과**');
  rendered.push('');
  rendered.push(`- 최종 선택: ${choiceNumber(problem, session.result.finalChoiceId)}번`);
  rendered.push(`- 선택 횟수: ${session.result.selectionAttempt}회`);
  rendered.push(`- 근거 판정: ${session.result.rationaleAssessment}`);
  rendered.push(`- 결과: ${session.result.resolutionOutcome}`);
  rendered.push(`- 학생 스스로 해결: ${session.result.resolvedByStudent ? '예' : '아니요'}`);
  rendered.push(`- 정답 공개: ${session.result.answerRevealed ? '예' : '아니요'}`);
  rendered.push('- 학생 화면의 종료 문구: 정답입니다.');
}

rendered.push('');
rendered.push('## 웹앱 검토 시 확인할 지점');
rendered.push('');
rendered.push('1. 최초 응답 30개 중 20개는 즉시 PASS, 10개는 후속 질문을 거쳐 PASS했다. 충분한 압축 응답을 불필요하게 보류한 사례가 있는지 원문과 대조한다.');
rendered.push('2. 총 13개 문단 후속 질문 가운데 12개는 UNCLEAR, 1개는 ERROR에서 생성됐다. 질문이 빠진 핵심 관계를 확인했는지, 이미 말한 내용을 다시 요구했는지 구분한다.');
rendered.push('3. 정보 비대칭 문제에서 최초 ② 선택은 두 차례 교정 질문 뒤 ⑤ 재선택으로 해결됐다. 첫 질문은 선택–근거 충돌, 두 번째 질문은 의무 적용 조건을 겨냥했다. 두 질문이 실제 오류를 순서대로 좁혔는지 검토한다.');
rendered.push('4. mRNA 19번은 정답 ⑤를 골랐지만 근거가 `UNCERTAIN`이었다. 운영 규칙에 따라 질문 없이 `INITIAL_CORRECT_UNVERIFIED`로 종료했고 학생 화면에는 “정답입니다.”가 표시됐다. 기록용 상태와 학생 경험이 적절한지 검토한다.');
rendered.push('5. 이 자료는 한 사용자의 자기 테스트 1회다. 실제 학생 집단의 학습 효과나 일반화 성능을 입증하지 않는다.');

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${rendered.join('\n')}\n`, 'utf8');
console.log(output);
