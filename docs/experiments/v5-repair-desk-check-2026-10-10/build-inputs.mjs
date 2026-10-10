import { readFileSync, writeFileSync } from 'node:fs';
import { createFeedbackSession, submitFeedbackCommand, applyFeedbackAssessment } from '/Users/mac/Projects/csat-literacy-problem-solving-mvp/packages/pipeline/dist/index.js';
import { feedbackEvaluationInput } from '/Users/mac/Projects/csat-literacy-problem-solving-mvp/packages/pipeline/dist/problem-solving/feedback-v4-evaluator.js';
const D = '/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/experiments/v5-multi-item-luna-sol-2026-10-08';
const cases = JSON.parse(readFileSync(`${D}/cases.json`)), sources = JSON.parse(readFileSync(`${D}/sources.json`));
const plan = [
  ['C1', 'gpt-6.1-sol', ['법인이요.', '회사 거예요. 그리고 대표 이사도 정관이나 법령의 절차를 지켜야 하니까 절차 없이 기부하면 책임이 생길 수 있어요.', '아 네 제가 틀렸네요.']],
  ['D2', 'gpt-6.1-sol', ['말초 조직이요.', '말초 조직이요. 그래서 뇌로 가는 레보도파가 줄어들어요.', '보기의 혈액-뇌 장벽 통과 여부에 따라 카르비도파가 효소의 작용을 억제하는 곳이요.']],
  ['S2', 'gpt-6.1-sol', ['큰 경우요.']],
  ['I1', 'gpt-6.1-sol', ['뒷받침해요.', '뒷받침해요. 그래도 실명 없이 법을 만들 수 있으니까 소수파는 실명 확인을 주장할 수 없어요.']],
  ['I2', 'gpt-6.1-sol', ['아니요.', '아니요, 4번은 맞는 설명이니까 적절하지 않은 걸 고르는 문제에서는 4번을 고르면 안 돼요.']],
  ['M4', 'gpt-6.1-sol', ['pH가 낮으면 양전하를 띠고 높으면 중성이 돼요. 그래서 높은 pH에서는 소수성이 강해져요.', 'pH가 낮으면 중성이고 높으면 양전하예요.']],
  ['S4', 'gpt-6-luna', ['그 세 값의 곱이 클수록 오네소르게 수가 작아져요.']],
  ['M2', 'gpt-6-luna', ['pH가 높아지면 수소 이온 농도가 낮아져서 이온화 지질이 전기적으로 중성이 돼요.']],
];
const out = [];
for (const [id, model, answers] of plan) {
  const k = cases.find(c => c.id === id), cell = JSON.parse(readFileSync(`${D}/${model}/${id}-r1.json`));
  answers.forEach((text, i) => {
    let s = submitFeedbackCommand(createFeedbackSession(`${id}-desk`, sources[k.questionId]),
      { type: 'SELECT', choiceId: k.choiceId, rationale: { mode: 'PROVIDED', text: k.rationale } }, 'o1');
    s = applyFeedbackAssessment(s, cell.call.rawOutput);
    const active = s.activeErrorId;
    s = submitFeedbackCommand(s, { type: 'CORRECT', errorId: active, text }, 'o2');
    const input = feedbackEvaluationInput(s);
    const v = `${id}${'abc'[i]}`;
    const { media: _m, ...src } = input.source;
    const B = { ...input, source: { ...src, media: input.source.media.map(({ url: _u, ...m }) => m) } };
    const C = { ...B, priorSelectionAnalysis: { note: '최초 선택 판정기의 내부 기록이다. 학생 발화가 아니며 정답도 아니다. reconstructedPath의 마지막 항목은 판정기가 도출한 결론이다.',
      reason: cell.call.rawOutput.reason, reconstructedPath: cell.call.rawOutput.reconstructedPath, studentClaims: cell.studentClaims } };
    writeFileSync(`${process.argv[3]}/${v}-B.json`, JSON.stringify(B, null, 1));
    writeFileSync(`${process.argv[3]}/${v}-C.json`, JSON.stringify(C, null, 1));
    out.push({ variant: `${id}${'abc'[i]}`, model, choiceCorrect: sources[k.questionId].answerChoiceId === k.choiceId,
      rationale: k.rationale, activeErrorId: active,
      errors: input.initialErrors.map(({ errorId, kind, description, question }) => ({ errorId, kind, description, question })),
      answer: text, armC_studentClaims: cell.studentClaims, armC_reconstructedPath: cell.call.rawOutput.reconstructedPath });
  });
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(out.map(o => `${o.variant} ${o.model} errors=${o.errors.length} active=${o.activeErrorId}`).join('\n'));
