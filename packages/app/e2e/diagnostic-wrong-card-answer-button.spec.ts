/**
 * 오답 카드 "문항 화면에서 정답 해설 보기" 버튼 e2e. 결과·진행·피드백 API를 page.route 고정 JSON으로 바꾸므로
 * 서버·모델 호출·외부 전송이 없다. 카드 내용은 저장된 v1.4 카드(경마 6·7번)를 쓴다.
 * 실행: PLAYWRIGHT_CLIENT_PORT=5473 npx playwright test packages/app/e2e/diagnostic-wrong-card-answer-button.spec.ts
 * 캡처 3장은 WRONG_CARD_SHOT_DIR(기본: docs/handoffs)에 남긴다(PC, deviceScaleFactor 2).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const runs = resolve(process.cwd(), 'docs/experiments/wrong-card-layer1-2026-11-19/runs/v1.4');
const shots = process.env['WRONG_CARD_SHOT_DIR'] ?? resolve(process.cwd(), 'docs/handoffs');
const load = (name: string) => JSON.parse(readFileSync(resolve(runs, name), 'utf8')) as { questionId: string;
  input: { item: { title: string; number: number }; stem: string; chosen: { position: number; text: string }; answer: { position: number; text: string }; studentRationale: string; passage: string;
    chosenTwists?: { twistDetail: string; choiceQuote: string; evidenceQuote: string }[]; answerTwists?: { twistDetail: string; choiceQuote: string; evidenceQuote: string }[] };
  attempts: { output: Record<string, unknown> }[] };
const horse6 = load('s23-horse6.json'); const horse7 = load('s23-horse7.json');
const PID = '00000000-0000-4000-8000-000000000023'; const PASSAGE = 'horse-race-reporting'; const TITLE = horse6.input.item.title;
const set = { passages: [{ passageId: PASSAGE, title: TITLE, questionIds: [horse6.questionId, horse7.questionId] }] };

/** 저장된 카드로 만든 결과 항목. `answerViewable`만 문항마다 다르다. */
function item(file: typeof horse6, answerViewable: boolean) {
  const { input } = file; const out = file.attempts.at(-1)!.output; const twists = input.chosenTwists ?? [];
  const toTwist = (t: { twistDetail: string; choiceQuote: string; evidenceQuote: string }) => ({ twistType: 'NEGATION', twistDetail: t.twistDetail, studentText: null, choiceQuote: t.choiceQuote, evidenceQuote: t.evidenceQuote });
  const { matchesTrap: _unused, ...card } = out as Record<string, unknown>;
  return { questionId: file.questionId, passageId: PASSAGE, questionNumber: input.item.number, chosenPosition: input.chosen.position, correct: false, rationale: 'PROVIDED', category: 'WRONG', elimination: false,
    megastudy: { chosenPercents: [14, 11], correctRate: [52, 61] }, afterFeedback: { corrected: false, skipped: false }, review: false, answerPosition: input.answer.position,
    judgment: { status: 'ready', contentAssessment: 'ERROR', boundary: 'NONE' }, twist: twists.length ? twists.map(toTwist) : null,
    thoughtDiagnosis: null, evidence: { student: input.studentRationale, source: [] }, summaryLink: null,
    stem: input.stem, chosenText: input.chosen.text, answerText: input.answer.text, stemPolarity: input.stem.includes('적절하지 않은') ? 'SELECT_INCORRECT' : 'SELECT_CORRECT',
    answerTwist: (input.answerTwists ?? []).length ? input.answerTwists!.map(toTwist) : null, selfCheck: null, strategyAvailable: false, answerViewable,
    card: { status: 'ready', ...card } };
}
const resultBody = { qualityTiers: 3, position: { status: 'pending' }, items: [item(horse6, true), item(horse7, false)], steps: { status: 'ready', counts: {}, denominator: 2 }, twists: { counts: {} },
  recommendation: null, reading: [], readingHabit: { status: 'none' }, symbolGloss: { [PASSAGE]: {} } };

/** 정답 해설 읽기 화면용 고정 피드백(마무리 대화 몇 줄 + 정답 공개). 저장 자료에 없는 선지는 자리 표시 문장이다. */
function feedbackBody(file: typeof horse6) {
  const { input } = file;
  const choices = [1, 2, 3, 4, 5].map(position => ({ choiceId: `c${position}`, position,
    text: position === input.chosen.position ? input.chosen.text : position === input.answer.position ? input.answer.text : `(이 캡처에서는 생략한 선지 ${position})` }));
  const choiceId = `c${input.chosen.position}`; const answerId = `c${input.answer.position}`;
  const say = (n: number, role: 'STUDENT' | 'COACH', text: string) => ({ id: `m${n}`, role, text, phase: 'COMPLETED' as const });
  return { version: 'problem-feedback-v4', sessionId: `fixed-${file.questionId}`, revision: 9, phase: 'COMPLETED',
    question: { questionId: file.questionId, passageText: input.passage, stem: input.stem, scenarioText: '', choices, media: [], textAnnotations: [] },
    message: '', correctionHighlights: [], activeErrorId: null, postRepairOptions: null, selectionCount: 3, maxSelections: 3, questionsAsked: 0, questionTargets: 0, penaltyEligibleSelections: 0, pointsDeducted: 0,
    evaluationStatus: 'IDLE', evaluationError: null,
    result: { outcome: 'COACHING_TERMINATED', selectedChoiceId: choiceId, choiceCorrect: false, selectionCount: 3, rationaleVerified: false, correctionSucceeded: false, answerRevealed: true, resolvedByStudent: false, selfReportedUnderstanding: null,
      answer: { choiceId: answerId, position: input.answer.position, text: input.answer.text } },
    title: input.item.title, exam: '고정 응답(캡처용)', questionNumber: input.item.number, selectedChoiceId: choiceId, skippable: false,
    transcript: [say(1, 'STUDENT', input.studentRationale), say(2, 'COACH', `정답은 ${input.answer.position}번이야. 지문에서 이 선지가 어떻게 이어지는지 같이 보자.`), say(3, 'COACH', '마무리 해설: 위 문장을 지문의 해당 문장과 나란히 놓고 다시 읽어 보면 판단이 갈리는 곳이 보여.')] };
}

async function mock(page: Page) {
  await page.addInitScript(id => { window.localStorage.setItem('csat-diagnostic-participant', id); }, PID);
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/diagnostic/participant/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/result')) return route.fulfill(json(resultBody));
    const feedback = /\/item\/([^/]+)\/feedback$/u.exec(url.pathname);
    if (feedback) { const q = decodeURIComponent(feedback[1]!); return route.fulfill(json(feedbackBody(q === horse6.questionId ? horse6 : horse7))); }
    if (url.pathname.endsWith(PID)) return route.fulfill(json({ participantId: PID, passages: [{ passageId: PASSAGE, status: 'DONE', summaryChosen: false }], set, current: null, position: null }));
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: '고정 응답에 없는 요청' }) });
  });
}
const chip = (page: Page, number: number) => page.locator(`[aria-label^="${TITLE} ${number}번,"]`);

test('오답 카드의 정답 해설 버튼: 볼 수 있는 문항에만 → 읽기 전용 화면 → 돌아오면 같은 카드·3층 펼침', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage(); await mock(page);
  await page.goto('/diagnostic');

  // 6번(answerViewable true): 카드를 열면 버튼이 있다. 3층을 펼친다.
  await expect(chip(page, 6)).toBeVisible();
  await chip(page, 6).dispatchEvent('click');
  const card = page.locator('#diag-item-card');
  await expect(card.getByTestId('open-answer')).toBeVisible();
  await card.getByTestId('card-layer3').locator('summary').click();
  await expect(card.getByTestId('card-layer3')).toHaveAttribute('open', '');
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(shots, '2026-11-26-wrong-card-answer-button-1-result.png'), fullPage: false });

  // 7번(answerViewable false): 정답 선지 칸은 있지만 버튼이 없다.
  await chip(page, 7).dispatchEvent('click');
  await expect(card.getByTestId('card-answer')).toBeVisible();
  await expect(card.getByTestId('open-answer')).toHaveCount(0);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(shots, '2026-11-26-wrong-card-answer-button-1b-result-no-button.png'), fullPage: false });

  // 6번으로 돌아와 3층을 펼친 채 버튼 → 읽기 전용 문항 화면
  await chip(page, 6).dispatchEvent('click');
  await card.getByTestId('card-layer3').locator('summary').click();
  await expect(card.getByTestId('card-layer3')).toHaveAttribute('open', '');
  await card.getByTestId('open-answer').click();
  await expect(page.getByTestId('back-to-result-card')).toBeVisible();
  await expect(page.locator('.lab-answer-reveal')).toContainText(`정답 ${horse6.input.answer.position}번`);
  await expect(page.getByText('읽기 전용(지나온 화면)')).toBeVisible();
  await page.screenshot({ path: resolve(shots, '2026-11-26-wrong-card-answer-button-2-read.png'), fullPage: false });

  // 돌아가기 → 같은 카드(6번)가 열려 있고 3층도 펼쳐져 있다.
  await page.getByTestId('back-to-result-card').click();
  await expect(card).toBeVisible();
  await expect(card).toContainText(`${TITLE} 6번`);
  await expect(card.getByTestId('card-layer3')).toHaveAttribute('open', '');
  await expect(card.getByTestId('open-answer')).toBeVisible();
  await page.waitForTimeout(800);   // 부드러운 스크롤이 끝난 뒤 찍는다
  await page.screenshot({ path: resolve(shots, '2026-11-26-wrong-card-answer-button-3-back.png'), fullPage: false });
  await context.close();
});
