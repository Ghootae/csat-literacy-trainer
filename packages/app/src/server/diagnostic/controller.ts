/**
 * SNS 진단평가 컨트롤러(인계 A (6), D-0204·D-0205·D-0207·D-0208).
 *
 * 한 지문은 (요약 대화) → 문항 답 모두 입력(정오 숨김) → 지문 결과 정리 → 문항별 피드백 → 다음 지문 순서로 돈다.
 * 선택 판정·마지막 설명은 본 서비스 `ProblemFeedbackController`를 그대로 재사용하고(복사하지 않음),
 * 이 파일은 지문 단위 순서·참가자 상태·백그라운드 작업(판정·사고 진단·문단 판정)·결과 조립을 맡는다.
 * 참가자마다 메모리 상태 하나가 기준이고, 저장은 참가자 단위 직렬 큐로 차례대로 한다(읽기 → await → 쓰기 금지).
 */
import { randomUUID } from 'node:crypto';
import { basename, dirname } from 'node:path';
import { z, ZodError } from 'zod/v4';
import {
  FeedbackRationaleSchema, combineRound, createFeedbackSession, createOpenAiTransport, diagnoseThought,
  judgeUnit, loadJudgePrompts, loadPositionData, loadThoughtDiagnosisPrompts, participantPosition, unitsForParagraph,
  type FeedbackEvaluator, type FeedbackTransport, type ParticipantPosition, type SimpleEvaluator,
} from '@csat/pipeline';
import type { DialoguePassageContent } from '../content.js';
import { FeedbackRequestSchema, ProblemFeedbackController, type FeedbackRecord } from '../problem-feedback.js';
import { SimpleDialogueController, SimpleNavigateSchema, SimpleRespondSchema } from '../dialogue-simple.js';
import type { SimpleDialogueView } from '../../shared/dialogue-simple.js';
import type { FeedbackMessage, FeedbackWorkbenchView } from '../../shared/problem-feedback.js';
import type { ProblemContentView } from '../../shared/contract.js';
import {
  loadAnalysisMaps, loadChoiceLinkTargets, loadChoiceLinkTwists, loadClassifyTypes, loadDiagnosticBundle, loadDiagnosticPassages, loadDiagnosticSet,
  loadRecommendationMap, loadTwistStudentText,
  type ChoiceLinkTargets, type ChoiceLinkTwist, type DiagnosticSet, type DiagnosticSetPassage, type LoadedAnalysisMap,
} from './content.js';
import {
  addCounts, copyOverlap, countParagraph, emptyCounts, judgedUnitIndex, pickTwist, summaryLink,
  type JudgedUnitInfo, type SummaryLink,
} from './reading.js';
import { FileDiagnosticStore, isParticipantId, type DiagnosticParticipant, type DiagnosticStore, type ItemAnswer } from './store.js';

export class DiagnosticHttpError extends Error {
  constructor(readonly status: 400 | 404 | 409, message: string) { super(message); }
}
const fail = (status: 400 | 404 | 409, message: string): never => { throw new DiagnosticHttpError(status, message); };

export const DiagnosticItemRequestSchema = z.object({
  choiceId: z.string().trim().min(1),
  rationale: FeedbackRationaleSchema,
  solveMs: z.number().int().nonnegative(),
  rationaleMs: z.number().int().nonnegative().nullable(),
}).strict();
export const DiagnosticStartSchema = z.object({ summary: z.boolean() }).strict();
export const DiagnosticFeedbackRequestSchema = FeedbackRequestSchema;

export const ITEM_REVIEW_LINE = '이 문항은 우리가 한 번 더 확인해 볼게. 다음 문항으로 넘어갈게.';
export const OMITTED_WRONG_RATIONALE_LINE = '정답이 아니야. 어떻게 판단했는지 적어 주면 같이 볼게. 적기 어려우면 [근거 미제출]을 눌러 줘.';
const ORDINALS = ['첫', '두', '세', '네', '다섯'];
const NUMERALS = '①②③④⑤';

type Participant = DiagnosticParticipant;
type ItemState = Participant['items'][string];
type JobStatus = ItemState['firstJudgment']['status'];
type Box = 'pending' | 'ready' | 'failed';
const box = (status: JobStatus): Box => status === 'READY' || status === 'NONE' ? 'ready' : status === 'FAILED' ? 'failed' : 'pending';

export interface DiagnosticControllerOptions {
  store?: DiagnosticStore;
  /** 선택 판정·마지막 설명 평가기. 없으면 본 서비스 기본 평가기(실제 모델). */
  feedbackEvaluator?: FeedbackEvaluator;
  /** 요약 대화 평가기. 없으면 본 서비스 기본 평가기(실제 모델). */
  summaryEvaluator?: SimpleEvaluator;
  summaryLogDirectory?: string;
  diagnosisTransport?: FeedbackTransport;
  judgeTransport?: FeedbackTransport;
  set?: DiagnosticSet;
  loadBundle?: typeof loadDiagnosticBundle;
  passages?: readonly DialoguePassageContent[];
  loadMaps?: (passage: DiagnosticSetPassage) => LoadedAnalysisMap[];
  loadTwists?: (path: string) => (questionNumber: number, choicePosition: number) => ChoiceLinkTwist[];
  /** 선지 연결 동결본에서 비틀린 조각의 지도 단위 id를 읽는다(요약과 틀린 문항 연결, 표시 전용). */
  loadTargets?: (path: string) => (questionNumber: number, choicePosition: number) => ChoiceLinkTargets | null;
  /** 지도마다 관계 id → 유형(지도 순서와 같다). */
  loadClassify?: (passage: DiagnosticSetPassage) => Map<string, string>[];
  /** 비틂 코드 → 추천 세트 이름. 없으면 대응표 파일. */
  recommendationMap?: Record<string, string[]>;
  /** "<문항 id>:<선지 번호>" → 학생용 바뀐 내용 문장. 없으면 학생용 문장 파일. */
  twistStudentText?: Record<string, string[]>;
  /** 백그라운드 판정·진단·문단 판정의 최대 시도 수(처음 1회 + 자동 재시도). 기본 3. */
  maxAttempts?: number;
  /** 문단 판정 동시 요청 수 상한. 기본 8. */
  analysisConcurrency?: number;
}

export interface DiagnosticItemView {
  questionId: string; questionNumber: number; content: ProblemContentView;
}
export type DiagnosticFeedbackView = FeedbackWorkbenchView & { skippable: boolean };

export class DiagnosticController {
  private readonly store: DiagnosticStore;
  private readonly set: DiagnosticSet;
  private readonly passages: readonly DialoguePassageContent[];
  private readonly feedback: ProblemFeedbackController;
  private readonly summary: SimpleDialogueController;
  private readonly diagnosisTransport: FeedbackTransport;
  private readonly judgeTransport: FeedbackTransport;
  private readonly loadBundle: typeof loadDiagnosticBundle;
  private readonly loadMaps: (passage: DiagnosticSetPassage) => LoadedAnalysisMap[];
  private readonly loadTwists: NonNullable<DiagnosticControllerOptions['loadTwists']>;
  private readonly loadTargets: NonNullable<DiagnosticControllerOptions['loadTargets']>;
  private readonly loadClassify: NonNullable<DiagnosticControllerOptions['loadClassify']>;
  private recommendationMap: Record<string, string[]> | undefined;
  private twistStudentText: Record<string, string[]> | undefined;
  private readonly targetCache = new Map<string, ReturnType<typeof loadChoiceLinkTargets>>();
  private readonly classifyCache = new Map<string, Map<string, string>[]>();
  private readonly unitIndexCache = new Map<string, Map<string, JudgedUnitInfo>[]>();
  private readonly maxAttempts: number;
  private readonly participants = new Map<string, Participant>();
  private readonly sessionIndex = new Map<string, { participantId: string; questionId: string }>();
  private readonly bundles = new Map<string, ReturnType<typeof loadDiagnosticBundle>>();
  private readonly mapCache = new Map<string, LoadedAnalysisMap[]>();
  private readonly twistCache = new Map<string, ReturnType<typeof loadChoiceLinkTwists>>();
  private readonly background = new Set<Promise<unknown>>();
  private readonly saveQueues = new Map<string, Promise<void>>();
  private readonly saveScheduled = new Set<string>();
  private readonly errors: unknown[] = [];
  private readonly limitWaiters: (() => void)[] = [];
  private running = 0;
  private readonly concurrency: number;
  private judgePrompts: ReturnType<typeof loadJudgePrompts> | undefined;
  private diagnosisInstructions: string | undefined;

  constructor(options: DiagnosticControllerOptions = {}) {
    this.store = options.store ?? new FileDiagnosticStore();
    this.set = options.set ?? loadDiagnosticSet();
    this.passages = options.passages ?? loadDiagnosticPassages();
    this.loadBundle = options.loadBundle ?? loadDiagnosticBundle;
    this.loadMaps = options.loadMaps ?? loadAnalysisMaps;
    this.loadTwists = options.loadTwists ?? loadChoiceLinkTwists;
    this.loadTargets = options.loadTargets ?? loadChoiceLinkTargets;
    this.loadClassify = options.loadClassify ?? loadClassifyTypes;
    this.recommendationMap = options.recommendationMap;
    this.twistStudentText = options.twistStudentText;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.concurrency = options.analysisConcurrency ?? 8;
    this.diagnosisTransport = options.diagnosisTransport ?? createOpenAiTransport();
    this.judgeTransport = options.judgeTransport ?? createOpenAiTransport();
    this.feedback = new ProblemFeedbackController({
      ...(options.feedbackEvaluator === undefined ? {} : { evaluator: options.feedbackEvaluator }),
      withoutInstantBubble: true,
      save: record => this.onFeedbackRecord(record),
    });
    this.summary = new SimpleDialogueController({
      ...(options.summaryEvaluator === undefined ? {} : { evaluator: options.summaryEvaluator }),
      passages: this.passages,
      ...(options.summaryLogDirectory === undefined ? {} : { logDirectory: options.summaryLogDirectory }),
    });
  }

  /** 테스트·종료용: 백그라운드 작업과 저장 큐가 모두 끝날 때까지 기다린다. 저장 실패가 있으면 던진다. */
  async idle(): Promise<void> {
    while (this.background.size > 0 || this.saveScheduled.size > 0) {
      await Promise.allSettled([...this.background, ...this.saveQueues.values()]);
    }
    await Promise.all(this.saveQueues.values());
    if (this.errors.length > 0) throw this.errors.shift();
  }

  // ---------- 참가자 ----------

  create(): { participantId: string; set: { passages: { passageId: string; title: string; questionIds: string[] }[] } } {
    const participantId = randomUUID();
    const p: Participant = { schemaVersion: 'sns-diagnostic-participant-v1', participantId, setId: 'set-e', createdAt: new Date().toISOString(),
      passages: {}, items: {}, analysis: {} };
    for (const passage of this.set.passages) {
      p.passages[passage.passageId] = { status: 'NOT_STARTED', summaryChosen: null, summarySessionId: null,
        firstTurns: Object.fromEntries(this.content(passage.passageId).paragraphs.map(q => [q.paragraphId, null])), feedbackCursor: 0 };
      for (const questionId of passage.questionIds) {
        p.items[questionId] = { draft: null, first: null, session: null, transcript: [],
          firstJudgment: { status: 'NONE', attempts: 0, contentAssessment: null, boundary: null },
          thoughtDiagnosis: { status: 'NONE', output: null }, reviewFlag: null };
      }
    }
    this.participants.set(participantId, p);
    this.event('PARTICIPANT_CREATED', p, {});
    this.requestSave(p);
    return { participantId, set: { passages: this.set.passages.map(passage => ({ passageId: passage.passageId, title: this.content(passage.passageId).title, questionIds: [...passage.questionIds] })) } };
  }

  progress(participantId: string) {
    const p = this.require(participantId);
    const passages = this.set.passages.map(passage => ({ passageId: passage.passageId, status: p.passages[passage.passageId]!.status,
      summaryChosen: p.passages[passage.passageId]!.summaryChosen, feedbackCursor: p.passages[passage.passageId]!.feedbackCursor }));
    const active = this.set.passages.find(passage => p.passages[passage.passageId]!.status !== 'DONE');
    const state = active ? p.passages[active.passageId]! : null;
    return { participantId, passages,
      set: { passages: this.set.passages.map(passage => ({ passageId: passage.passageId, title: this.content(passage.passageId).title, questionIds: [...passage.questionIds] })) },
      current: active && state ? { passageId: active.passageId, questionId: state.status === 'FEEDBACK' ? active.questionIds[state.feedbackCursor] ?? null : null } : null,
      position: this.position(p) };
  }

  // ---------- 지문 시작·요약 ----------

  start(participantId: string, passageId: string, raw: unknown): SimpleDialogueView | { questions: DiagnosticItemView[] } {
    const p = this.require(participantId); const passage = this.passage(passageId); const state = p.passages[passageId]!;
    const { summary } = DiagnosticStartSchema.parse(raw);
    if (state.status !== 'NOT_STARTED') fail(409, '이미 시작한 지문입니다.');
    state.summaryChosen = summary;
    this.event('PASSAGE_STARTED', p, { passageId, summary });
    if (!summary) { state.status = 'ANSWERING'; this.requestSave(p); return { questions: this.questions(passage) }; }
    const view = this.summary.start(passageId);
    state.summarySessionId = view.sessionId; state.status = 'SUMMARY';
    this.requestSave(p);
    return this.summaryView(view);
  }

  async summaryRespond(participantId: string, passageId: string, raw: unknown): Promise<SimpleDialogueView> {
    const p = this.require(participantId); this.summaryState(p, passageId);
    const request = SimpleRespondSchema.parse(raw);
    const sessionId = this.summarySession(p, passageId);
    const view = await this.summary.respond(sessionId, request);
    this.recordFirstTurn(p, passageId, sessionId, request.paragraphIndex);
    return this.summaryView(view);
  }

  summaryNavigate(participantId: string, passageId: string, raw: unknown): SimpleDialogueView {
    const p = this.require(participantId); this.summaryState(p, passageId);
    SimpleNavigateSchema.parse(raw);
    return this.summaryView(this.summary.navigate(this.summarySession(p, passageId), raw));
  }

  summaryFinish(participantId: string, passageId: string): { questions: DiagnosticItemView[] } {
    const p = this.require(participantId); const state = this.summaryState(p, passageId);
    state.status = 'ANSWERING';
    this.requestSave(p);
    return { questions: this.questions(this.passage(passageId)) };
  }

  // ---------- 문항 답 ----------

  /** 새로 고침 뒤 이어 가기: 답 입력 중인 지문의 문항과 임시 답. 정오는 없다. */
  answerDrafts(participantId: string, passageId: string): { questions: DiagnosticItemView[]; drafts: Record<string, { choiceId: string; rationale: ItemAnswer['rationale'] } | null> } {
    const p = this.require(participantId); const passage = this.passage(passageId); const state = p.passages[passageId]!;
    if (state.status !== 'ANSWERING') fail(409, '지금은 답을 입력하는 지문이 아닙니다.');
    return { questions: this.questions(passage),
      drafts: Object.fromEntries(passage.questionIds.map(id => { const draft = p.items[id]!.draft; return [id, draft ? { choiceId: draft.choiceId, rationale: draft.rationale } : null]; })) };
  }

  /** 답을 draft로 저장만 한다. 풀이 상태도 판정도 만들지 않고, 응답에는 정오·판정이 없다. */
  submitItem(participantId: string, questionId: string, raw: unknown): { saved: true } {
    const p = this.require(participantId);
    const passage = this.set.passages.find(candidate => candidate.questionIds.includes(questionId));
    if (!passage) return fail(404, '등록되지 않은 문항입니다.');
    const state = p.passages[passage.passageId]!;
    const body = DiagnosticItemRequestSchema.parse(raw);
    if (state.status !== 'ANSWERING') fail(409, '지금은 이 문항의 답을 낼 수 없습니다.');
    if (!this.bundle(questionId).source.choices.some(c => c.choiceId === body.choiceId)) fail(400, '존재하지 않는 선지입니다.');
    if (body.rationale.mode === 'OMITTED' && body.rationaleMs !== null) fail(400, '근거를 생략하면 rationaleMs는 null이어야 합니다.');
    const item = p.items[questionId]!;
    const revisionOfDraft = item.draft ? (item.draft as { revision?: number }).revision! + 1 : 0;
    item.draft = { ...body, savedAt: new Date().toISOString(), revision: revisionOfDraft } as ItemState['draft'];
    this.event('ITEM_SUBMITTED', p, { questionId, passageId: passage.passageId, choiceId: body.choiceId, rationale: body.rationale,
      solveMs: body.solveMs, rationaleMs: body.rationaleMs, revisionOfDraft });
    this.requestSave(p);
    return { saved: true };
  }

  /** 그 시점의 draft를 첫 응답으로 확정하고 선택 판정을 한꺼번에 시작한다. */
  answersDone(participantId: string, passageId: string): { position: ParticipantPosition } {
    const p = this.require(participantId); const passage = this.passage(passageId); const state = p.passages[passageId]!;
    if (state.status !== 'ANSWERING') fail(409, '이미 답 입력을 마쳤거나 아직 시작하지 않은 지문입니다.');
    const missing = passage.questionIds.filter(id => p.items[id]!.draft === null);
    if (missing.length > 0) fail(400, `아직 답하지 않은 문항이 있습니다: ${missing.join(', ')}`);
    state.status = 'AWAITING_JUDGMENT';
    const submittedAt = new Date().toISOString();
    const started: string[] = [];
    for (const questionId of passage.questionIds) {
      const item = p.items[questionId]!; const draft = item.draft!;
      const { savedAt: _savedAt, ...answer } = draft as typeof draft & { revision?: number };
      const { revision: _revision, ...firstAnswer } = answer as typeof answer & { revision?: number };
      item.first = { ...firstAnswer, submittedAt }; item.draft = null;
      const session = createFeedbackSession(randomUUID(), this.bundle(questionId).source);
      item.session = session; item.transcript = [];
      this.sessionIndex.set(session.sessionId, { participantId, questionId });
      this.feedback.adopt(session, []);
      const provided = item.first.rationale.mode === 'PROVIDED';
      if (provided) item.firstJudgment = { status: 'PENDING', attempts: 1, contentAssessment: null, boundary: null };
      void this.feedback.submit(session.sessionId, { transitionId: `${questionId}:select`, expectedRevision: 0,
        command: { type: 'SELECT', choiceId: item.first.choiceId, rationale: item.first.rationale } });
      if (provided) started.push(questionId);
    }
    this.event('ANSWERS_DONE', p, { passageId, questionIds: passage.questionIds });
    for (const questionId of started) this.track(this.runFirstJudgment(p, questionId, false));
    this.checkPassageReady(p, passageId);
    this.requestSave(p);
    return { position: this.position(p)! };
  }

  summaryCard(participantId: string, passageId: string) {
    const p = this.require(participantId); const passage = this.passage(passageId); const state = p.passages[passageId]!;
    if (state.status === 'NOT_STARTED' || state.status === 'SUMMARY' || state.status === 'ANSWERING') fail(409, '아직 답 입력을 마치지 않은 지문입니다.');
    const items = passage.questionIds.map(id => ({ id, item: p.items[id]! }));
    if (items.some(({ item }) => item.firstJudgment.status === 'PENDING')) return { status: 'pending' as const };
    let correct = 0; let supported = 0; let denominator = 0; let omitted = 0; let checking = 0;
    const cards = items.map(({ id, item }) => {
      const isCorrect = this.isCorrect(item); if (isCorrect) correct++;
      let quality: 'SUPPORTED' | 'NOT_SUPPORTED' | 'CHECKING' | null = null;
      if (item.first!.rationale.mode === 'OMITTED') omitted++;
      else if (item.firstJudgment.status === 'FAILED' || (item.firstJudgment.boundary !== null && item.firstJudgment.boundary !== 'NONE')) { checking++; quality = 'CHECKING'; }
      else {
        denominator++;
        quality = isCorrect && item.firstJudgment.contentAssessment === 'SUPPORTED' ? 'SUPPORTED' : 'NOT_SUPPORTED';
        if (quality === 'SUPPORTED') supported++;
      }
      return { questionId: id, questionNumber: this.set.items[id]!.questionNumber, correct: isCorrect, rationale: item.first!.rationale.mode, quality };
    });
    return { status: 'ready' as const, correct, total: items.length, supported, rationaleDenominator: denominator, omitted, checking, items: cards, position: this.position(p)! };
  }

  // ---------- 문항별 피드백 ----------

  feedbackView(participantId: string, questionId: string): DiagnosticFeedbackView {
    const p = this.require(participantId); const { index } = this.feedbackTarget(p, questionId, 'read');
    return this.itemView(p, questionId, index);
  }

  async feedbackSubmit(participantId: string, questionId: string, raw: unknown): Promise<DiagnosticFeedbackView> {
    const p = this.require(participantId); const { index } = this.feedbackTarget(p, questionId, 'write');
    const request = DiagnosticFeedbackRequestSchema.parse(raw);
    const item = p.items[questionId]!;
    try { await this.feedback.submit(item.session!.sessionId, request); }
    catch (error) { if (error instanceof ZodError) throw error; fail(409, error instanceof Error ? error.message : String(error)); }
    this.event('FEEDBACK_COMMAND', p, { questionId, transitionId: request.transitionId, command: request.command });
    if (request.command.type === 'SKIP') this.event('ITEM_SKIPPED', p, { questionId });
    return this.itemView(p, questionId, index);
  }

  // ---------- 결과 ----------

  result(participantId: string) {
    const p = this.require(participantId);
    const answered = this.set.passages.filter(passage => passage.questionIds.every(id => p.items[id]!.first !== null));
    const items = answered.flatMap(passage => passage.questionIds.map(id => this.resultItem(p, passage, id)));
    const diagnosed = items.filter(item => item.thoughtDiagnosis?.status === 'ready');
    const eligible = items.filter(item => item.thoughtDiagnosis !== null);
    const stepCounts: Record<string, number> = {};
    for (const item of diagnosed) { const key = item.thoughtDiagnosis!.firstFailedStep ?? 'NONE'; stepCounts[key] = (stepCounts[key] ?? 0) + 1; }
    const twistCounts: Record<string, number> = {};
    for (const item of items) for (const t of item.twist ?? []) twistCounts[t.twistType] = (twistCounts[t.twistType] ?? 0) + 1;
    const position = this.position(p);
    return {
      position: position === null ? { status: 'pending' as const }
        : { status: 'ready' as const, answered: position.answered, correct: position.correct, percentile: position.percentile, grade: position.grade, byPassage: this.positionByPassage(p) },
      items,
      steps: { status: eligible.some(i => i.thoughtDiagnosis!.status === 'pending') ? 'pending' as const : eligible.length > 0 && diagnosed.length === 0 ? 'failed' as const : 'ready' as const,
        counts: stepCounts, denominator: diagnosed.length },
      twists: { counts: twistCounts },
      recommendation: this.recommendation(twistCounts),
      reading: this.set.passages.filter(passage => p.passages[passage.passageId]!.summaryChosen === true).map(passage => this.resultReading(p, passage)),
    };
  }

  // ---------- 내부: 추천 ----------

  private recommendation(twistCounts: Record<string, number>): { twistType: string; setNames: string[] } | null {
    const twistType = pickTwist(twistCounts);
    if (twistType === null) return null;
    this.recommendationMap ??= loadRecommendationMap();
    return { twistType, setNames: [...(this.recommendationMap[twistType] ?? [])] };
  }

  // ---------- 내부: 불러오기·이어 가기 ----------

  private require(participantId: string): Participant {
    if (!isParticipantId(participantId)) return fail(400, '참가자 ID 형식이 올바르지 않습니다.');
    const cached = this.participants.get(participantId);
    if (cached) return cached;
    const stored = this.store.load(participantId);
    if (!stored) return fail(404, '참가자를 찾을 수 없습니다.');
    this.participants.set(participantId, stored);
    this.resume(stored);
    return stored;
  }

  /** 서버를 다시 켠 뒤 처음 불러올 때: 세션을 되살리고 PENDING인 작업만 다시 시작한다. */
  private resume(p: Participant): void {
    for (const [questionId, item] of Object.entries(p.items)) {
      if (!item.session) continue;
      this.sessionIndex.set(item.session.sessionId, { participantId: p.participantId, questionId });
      this.feedback.adopt(item.session, item.transcript);
      this.syncDerived(p, questionId);
    }
    for (const [questionId, item] of Object.entries(p.items)) {
      if (item.firstJudgment.status === 'PENDING') this.track(this.runFirstJudgment(p, questionId, true));
      if (item.thoughtDiagnosis.status === 'PENDING') this.track(this.runDiagnosis(p, questionId));
      else this.maybeStartDiagnosis(p, questionId);
    }
    for (const [paragraphId, analysis] of Object.entries(p.analysis)) {
      if (analysis.status === 'PENDING') this.track(this.runAnalysis(p, this.passageOfParagraph(paragraphId), paragraphId));
    }
    for (const passage of this.set.passages) this.checkPassageReady(p, passage.passageId);
  }

  private content(passageId: string): DialoguePassageContent {
    const content = this.passages.find(c => c.passageId === passageId);
    if (!content) throw new Error(`요약 대화 지문이 없습니다: ${passageId}`);
    return content;
  }
  private passage(passageId: string): DiagnosticSetPassage {
    return this.set.passages.find(candidate => candidate.passageId === passageId) ?? fail(404, '등록되지 않은 지문입니다.');
  }
  private passageOfParagraph(paragraphId: string): string {
    const passage = this.passages.find(c => c.paragraphs.some(q => q.paragraphId === paragraphId));
    if (!passage) throw new Error(`지문에 없는 문단입니다: ${paragraphId}`);
    return passage.passageId;
  }
  private passageOfQuestion(questionId: string): DiagnosticSetPassage {
    return this.set.passages.find(candidate => candidate.questionIds.includes(questionId))!;
  }
  private bundle(questionId: string) {
    let bundle = this.bundles.get(questionId);
    if (!bundle) { bundle = this.loadBundle(questionId); this.bundles.set(questionId, bundle); }
    return bundle;
  }
  private questions(passage: DiagnosticSetPassage): DiagnosticItemView[] {
    return passage.questionIds.map(questionId => ({ questionId, questionNumber: this.set.items[questionId]!.questionNumber, content: this.bundle(questionId).content }));
  }
  private isCorrect(item: ItemState): boolean {
    return item.first !== null && item.session !== null && item.first.choiceId === item.session.source.answerChoiceId;
  }

  // ---------- 내부: 요약 ----------

  private summaryState(p: Participant, passageId: string) {
    this.passage(passageId);
    const state = p.passages[passageId]!;
    if (state.status !== 'SUMMARY') fail(409, '요약 대화 중인 지문이 아닙니다.');
    return state;
  }
  /** 요약 세션은 메모리에만 있다. 서버를 다시 켠 뒤라면 같은 지문의 새 세션을 열어 id를 바꾼다(첫 발화 기록은 그대로). */
  private summarySession(p: Participant, passageId: string): string {
    const state = p.passages[passageId]!;
    if (state.summarySessionId) {
      try { this.summary.get(state.summarySessionId); return state.summarySessionId; } catch { /* 새로 연다 */ }
    }
    state.summarySessionId = this.summary.start(passageId).sessionId;
    this.requestSave(p);
    return state.summarySessionId;
  }
  /** 진단평가에서는 문제 연결 링크를 내보내지 않는다. */
  private summaryView(view: SimpleDialogueView): SimpleDialogueView {
    return { ...view, problemUrl: null, problemQuestionId: null };
  }
  private recordFirstTurn(p: Participant, passageId: string, sessionId: string, paragraphIndex: number): void {
    const paragraphId = this.content(passageId).paragraphs[paragraphIndex]!.paragraphId;
    const state = p.passages[passageId]!;
    if (state.firstTurns[paragraphId]) return;
    const first = this.summary.inspect(sessionId, paragraphIndex).attempts[0];
    const message = first?.messages.find(m => m.role === 'student');
    if (!first || !message || first.steps.length === 0) return;
    const overlap = copyOverlap(message.text, this.content(passageId).paragraphs[paragraphIndex]!.text);
    state.firstTurns[paragraphId] = { text: message.text, at: new Date().toISOString(), copyOverlap: overlap };
    this.event('SUMMARY_FIRST_TURN', p, { passageId, paragraphId, copyOverlap: overlap });
    this.requestSave(p);
    this.startAnalysis(p, passageId, paragraphId);
  }

  // ---------- 내부: 문단 판정 ----------

  private mapFor(passageId: string, paragraphId: string): LoadedAnalysisMap | null {
    return this.maps(passageId).find(m => m.map.propositions.some(x => x.paragraphId === paragraphId)) ?? null;
  }
  private classifyFor(passageId: string): Map<string, string>[] {
    let classify = this.classifyCache.get(passageId);
    if (!classify) { classify = this.loadClassify(this.passage(passageId)); this.classifyCache.set(passageId, classify); }
    return classify;
  }
  private unitIndexesFor(passageId: string): Map<string, JudgedUnitInfo>[] {
    let indexes = this.unitIndexCache.get(passageId);
    if (!indexes) { indexes = this.maps(passageId).map(loaded => judgedUnitIndex(loaded.map)); this.unitIndexCache.set(passageId, indexes); }
    return indexes;
  }
  private maps(passageId: string): LoadedAnalysisMap[] {
    let maps = this.mapCache.get(passageId);
    if (!maps) { maps = this.loadMaps(this.passage(passageId)); this.mapCache.set(passageId, maps); }
    return maps;
  }
  private startAnalysis(p: Participant, passageId: string, paragraphId: string): void {
    if (!this.mapFor(passageId, paragraphId)) return;
    p.analysis[paragraphId] = { status: 'PENDING', judgments: {} };
    this.requestSave(p);
    this.track(this.runAnalysis(p, passageId, paragraphId));
  }
  private async runAnalysis(p: Participant, passageId: string, paragraphId: string): Promise<void> {
    const analysis = p.analysis[paragraphId]!; const loaded = this.mapFor(passageId, paragraphId);
    const turn = p.passages[passageId]!.firstTurns[paragraphId];
    if (!loaded || !turn) return;
    this.judgePrompts ??= loadJudgePrompts();
    const prompts = this.judgePrompts;
    const round = { dialogue: [{ role: 'student', text: turn.text }] };
    const units = unitsForParagraph(loaded.map, paragraphId);
    const todo = [...units.nodes.map(unit => ({ unit, kind: 'node' as const })), ...units.relations.map(unit => ({ unit, kind: 'relation' as const }))]
      .filter(({ unit }) => analysis.judgments[unit.id] === undefined);
    await Promise.all(todo.map(({ unit, kind }) => this.limited(async () => {
      let lastError = '';
      for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
        try {
          const result = await judgeUnit(this.judgeTransport, prompts, round, kind, unit, loaded.stances);
          analysis.judgments[unit.id] = { status: 'OK', unitKind: kind, ...result.judgment, ...result.checked };
          this.event('ANALYSIS_DONE', p, { paragraphId, unitId: unit.id, unitKind: kind, attempts: attempt, judgment: result.judgment, metadata: result.metadata });
          this.requestSave(p);
          return;
        } catch (error) { lastError = error instanceof Error ? error.message : String(error); }
      }
      analysis.judgments[unit.id] = { status: 'FAILED', unitKind: kind, error: lastError };
      this.event('ANALYSIS_FAILED', p, { paragraphId, unitId: unit.id, unitKind: kind, attempts: this.maxAttempts, error: lastError });
      this.requestSave(p);
    })));
    const all = [...units.nodes, ...units.relations];
    analysis.status = all.every(unit => (analysis.judgments[unit.id] as { status?: string } | undefined)?.status === 'OK') ? 'READY' : 'FAILED';
    this.requestSave(p);
  }
  private async limited<T>(work: () => Promise<T>): Promise<T> {
    if (this.running >= this.concurrency) await new Promise<void>(resolve => { this.limitWaiters.push(resolve); });
    this.running++;
    try { return await work(); }
    finally { this.running--; this.limitWaiters.shift()?.(); }
  }

  // ---------- 내부: 선택 판정·사고 진단 ----------

  /** 본 서비스 컨트롤러가 세션을 저장할 때마다 불린다. 세션·말풍선을 참가자 상태에 반영하고 파생 값을 다시 계산한다. */
  private onFeedbackRecord(record: FeedbackRecord): void {
    const ref = this.sessionIndex.get(record.session.sessionId);
    if (!ref) return;
    const p = this.participants.get(ref.participantId);
    if (!p) return;
    const item = p.items[ref.questionId]!;
    item.session = record.session; item.transcript = record.transcript ?? [];
    if (record.event === 'EVALUATED') this.event('JUDGMENT_DONE', p, { questionId: ref.questionId, transitionId: record.transitionId, call: record.call });
    else if (record.event === 'EVALUATION_FAILED') this.event('JUDGMENT_FAILED', p, { questionId: ref.questionId, transitionId: record.transitionId, error: record.error, call: record.call });
    this.syncDerived(p, ref.questionId);
    this.requestSave(p);
  }

  /** 첫 선택 판정 결과(첫 SELECTION 판정)를 읽어 firstJudgment·reviewFlag를 정한다. 근거를 생략한 첫 응답에는 판정이 없다. */
  private syncDerived(p: Participant, questionId: string): void {
    const item = p.items[questionId]!;
    if (!item.first || item.first.rationale.mode !== 'PROVIDED' || !item.session) return;
    const first = item.session.assessments[0];
    if (!first || first.mode !== 'SELECTION' || item.firstJudgment.status === 'READY') return;
    item.firstJudgment = { status: 'READY', attempts: item.firstJudgment.attempts, contentAssessment: first.contentAssessment, boundary: first.boundary };
    if (first.boundary !== 'NONE') item.reviewFlag = 'BOUNDARY';
    // 상태기계가 ITEM_REVIEW로 보내는 조건과 같다(오답 + SUPPORTED + 선택-근거 일치). 불일치는 교정 질문으로 가는 정상 경로다.
    else if (!this.isCorrect(item) && first.contentAssessment === 'SUPPORTED' && item.session.selectionComparisons[0]?.selectionRationaleConsistency === 'CONSISTENT') item.reviewFlag = 'WRONG_SUPPORTED';
    if (item.reviewFlag) this.event('ITEM_REVIEW_FLAGGED', p, { questionId, reviewFlag: item.reviewFlag });
    this.onFirstJudgmentSettled(p, questionId);
  }
  private onFirstJudgmentSettled(p: Participant, questionId: string): void {
    this.maybeStartDiagnosis(p, questionId);
    this.checkPassageReady(p, this.passageOfQuestion(questionId).passageId);
  }

  private async runFirstJudgment(p: Participant, questionId: string, resume: boolean): Promise<void> {
    const item = p.items[questionId]!; const sessionId = item.session!.sessionId;
    let attempts = resume ? 0 : 1;
    item.firstJudgment.attempts = attempts;
    const retry = () => {
      attempts++; item.firstJudgment.attempts = attempts;
      try {
        void this.feedback.submit(sessionId, { transitionId: `${questionId}:judgment-resume-${attempts}`,
          expectedRevision: this.feedback.get(sessionId).revision, command: { type: 'RESUME' } });
      } catch { /* 이번 시도는 실패로 세고 다음 반복에서 판단한다 */ }
    };
    if (resume) retry();
    for (;;) {
      await this.feedback.settled(sessionId);
      if (item.firstJudgment.status === 'READY') return;
      if (attempts >= this.maxAttempts) {
        item.firstJudgment.status = 'FAILED';
        this.onFirstJudgmentSettled(p, questionId);
        this.requestSave(p);
        return;
      }
      retry();
    }
  }

  /** 사고 진단 대상: 근거를 쓴 오답, 그리고 근거를 쓴 정답 중 첫 선택 판정이 SUPPORTED가 아닌 것. 판정이 끝난 뒤에 정하며 문항 검토 문항은 부르지 않는다. */
  private maybeStartDiagnosis(p: Participant, questionId: string): void {
    const item = p.items[questionId]!;
    if (item.thoughtDiagnosis.status !== 'NONE' || !item.first || item.first.rationale.mode !== 'PROVIDED' || item.reviewFlag !== null) return;
    if (item.firstJudgment.boundary !== null && item.firstJudgment.boundary !== 'NONE') return;
    // 오답·정답 모두 첫 선택 판정이 끝나길 기다린다. 최종 실패는 SUPPORTED가 아닌 것으로 본다.
    if (item.firstJudgment.status !== 'READY' && item.firstJudgment.status !== 'FAILED') return;
    if (this.isCorrect(item) && item.firstJudgment.contentAssessment === 'SUPPORTED') return;
    item.thoughtDiagnosis = { status: 'PENDING', output: null };
    this.requestSave(p);
    this.track(this.runDiagnosis(p, questionId));
  }
  private async runDiagnosis(p: Participant, questionId: string): Promise<void> {
    const item = p.items[questionId]!; const first = item.first!;
    if (first.rationale.mode !== 'PROVIDED') return;
    this.diagnosisInstructions ??= loadThoughtDiagnosisPrompts().instructions;
    let lastError = '';
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const call = await diagnoseThought(this.diagnosisTransport, item.session!.source,
          { caseId: `${p.participantId}:${questionId}`, choiceId: first.choiceId, rationale: first.rationale.text }, this.diagnosisInstructions);
        item.thoughtDiagnosis = { status: 'READY', output: call.output };
        this.event('THOUGHT_DIAGNOSIS_DONE', p, { questionId, attempts: attempt, output: call.output, metadata: call.metadata });
        this.requestSave(p);
        return;
      } catch (error) { lastError = error instanceof Error ? error.message : String(error); }
    }
    item.thoughtDiagnosis = { status: 'FAILED', output: null };
    this.event('THOUGHT_DIAGNOSIS_FAILED', p, { questionId, attempts: this.maxAttempts, error: lastError });
    this.requestSave(p);
  }

  private checkPassageReady(p: Participant, passageId: string): void {
    const state = p.passages[passageId]!;
    if (state.status !== 'AWAITING_JUDGMENT') return;
    if (this.passage(passageId).questionIds.some(id => p.items[id]!.firstJudgment.status === 'PENDING')) return;
    state.status = 'FEEDBACK'; state.feedbackCursor = 0;
    this.requestSave(p);
  }

  // ---------- 내부: 문항별 피드백 ----------

  /** 피드백 요청은 그 지문이 FEEDBACK 상태이고 커서가 그 문항일 때만 받는다. 이미 지나온 문항은 읽기만 된다. */
  private feedbackTarget(p: Participant, questionId: string, mode: 'read' | 'write'): { index: number } {
    const passage = this.set.passages.find(candidate => candidate.questionIds.includes(questionId));
    if (!passage) return fail(404, '등록되지 않은 문항입니다.');
    const state = p.passages[passage.passageId]!; const index = passage.questionIds.indexOf(questionId);
    const readable = (state.status === 'FEEDBACK' || state.status === 'DONE') && index <= (state.status === 'DONE' ? Infinity : state.feedbackCursor);
    if (state.status === 'FEEDBACK' && index === state.feedbackCursor) return { index };
    if (mode === 'read' && readable) return { index };
    return fail(409, '지금은 이 문항의 피드백 차례가 아닙니다.');
  }

  private itemView(p: Participant, questionId: string, index: number): DiagnosticFeedbackView {
    const item = p.items[questionId]!; const session = item.session!;
    const base = this.feedback.get(session.sessionId);
    const review = base.phase === 'ITEM_REVIEW';
    const messageFor = (m: FeedbackMessage): FeedbackMessage => {
      if (m.role !== 'COACH' || m.kind === 'WAIT_DONE') return m;
      if (m.phase === 'ITEM_REVIEW') return { ...m, text: ITEM_REVIEW_LINE };
      if (m.phase === 'AWAITING_RATIONALE') return { ...m, text: OMITTED_WRONG_RATIONALE_LINE };
      return m;
    };
    const chosen = session.source.choices.find(c => c.choiceId === item.first!.choiceId)!;
    const intro: FeedbackMessage = { id: `diag-intro-${questionId}`, role: 'COACH', phase: 'AWAITING_SELECTION',
      text: `${ORDINALS[index] ?? String(index + 1)}번째 문항으로 돌아가 볼게. ${NUMERALS[chosen.position - 1]}번을 골랐네.` };
    const view: DiagnosticFeedbackView = { ...base,
      message: review ? ITEM_REVIEW_LINE : base.phase === 'AWAITING_RATIONALE' ? OMITTED_WRONG_RATIONALE_LINE : base.message,
      // 지문 답 입력 뒤 백그라운드로 돈 판정의 "끝났어" 말풍선은 피드백 차례에 맞지 않아 뺀다(차례 안에서 학생이 누른 RESUME의 것은 남긴다).
      transcript: [intro, ...base.transcript.filter(m => !m.id.startsWith(`done-${questionId}:`)).map(messageFor)],
      skippable: base.phase === 'AWAITING_RATIONALE' || base.phase === 'AWAITING_CORRECTION' || base.phase === 'AWAITING_RESELECTION' };
    // 끝난 문항(또는 문항 검토 문항)이 커서 문항이면 보여 준 직후 다음 문항으로 넘어간다.
    const state = p.passages[this.passageOfQuestion(questionId).passageId]!;
    if (state.status === 'FEEDBACK' && state.feedbackCursor === index && (base.phase === 'COMPLETED' || review)) this.advanceCursor(p, questionId);
    return structuredClone(view);
  }
  private advanceCursor(p: Participant, questionId: string): void {
    const passage = this.passageOfQuestion(questionId); const state = p.passages[passage.passageId]!;
    state.feedbackCursor++;
    if (state.feedbackCursor >= passage.questionIds.length) {
      state.status = 'DONE';
      this.event('PASSAGE_DONE', p, { passageId: passage.passageId });
    }
    this.requestSave(p);
  }

  // ---------- 내부: 위치·결과 ----------

  private responsesFor(p: Participant, passages: DiagnosticSetPassage[]) {
    return passages.flatMap(passage => passage.questionIds.flatMap(id => {
      const item = p.items[id]!;
      return item.first ? [{ seq: String(passage.exam.megastudySeq), questionNumber: this.set.items[id]!.questionNumber, correct: this.isCorrect(item) }] : [];
    }));
  }
  private answeredPassages(p: Participant): DiagnosticSetPassage[] {
    return this.set.passages.filter(passage => passage.questionIds.every(id => p.items[id]!.first !== null));
  }
  private position(p: Participant): ParticipantPosition | null {
    const answered = this.answeredPassages(p);
    return answered.length === 0 ? null : participantPosition(this.responsesFor(p, answered), loadPositionData());
  }
  private positionByPassage(p: Participant) {
    const answered = this.answeredPassages(p);
    return answered.map((passage, i) => {
      const position = participantPosition(this.responsesFor(p, answered.slice(0, i + 1)), loadPositionData());
      return { passageId: passage.passageId, low: position.percentile.low, high: position.percentile.high };
    });
  }

  private resultItem(p: Participant, passage: DiagnosticSetPassage, questionId: string) {
    const item = p.items[questionId]!; const meta = this.set.items[questionId]!; const first = item.first!; const session = item.session!;
    const chosen = session.source.choices.find(c => c.choiceId === first.choiceId)!;
    const correct = this.isCorrect(item); const review = item.reviewFlag !== null;
    const megastudy = { chosenPercents: [meta.megastudy.choicePercents[0][chosen.position - 1]!, meta.megastudy.choicePercents[1][chosen.position - 1]!] as [number, number],
      correctRate: meta.megastudy.correctRate };
    const afterFeedback = { corrected: session.correctionSucceeded, skipped: session.result?.skipped === true };
    const base = { questionId, passageId: passage.passageId, questionNumber: meta.questionNumber, chosenPosition: chosen.position,
      correct, rationale: first.rationale.mode, megastudy, afterFeedback };
    if (review) {
      return { ...base, review: true as const, answerPosition: null, judgment: { status: 'pending' as Box, contentAssessment: null, boundary: null },
        twist: null, thoughtDiagnosis: null, evidence: null, summaryLink: null };
    }
    const assessment = session.assessments[0]?.mode === 'SELECTION' ? session.assessments[0] : null;
    let twistFn = this.twistCache.get(passage.choiceLinkPath);
    if (!twistFn) { twistFn = this.loadTwists(passage.choiceLinkPath); this.twistCache.set(passage.choiceLinkPath, twistFn); }
    const twists = (correct ? [] : twistFn(meta.questionNumber, chosen.position)).map((twist, n) =>
      ({ ...twist, studentText: (this.twistTexts()[`${questionId}:${chosen.position}`] ?? [])[n] ?? null }));
    const eligibleDiagnosis = first.rationale.mode === 'PROVIDED' && (!correct || item.firstJudgment.contentAssessment !== 'SUPPORTED');
    const output = item.thoughtDiagnosis.output as { firstFailedStep: string | null; outcomeType: string } | null;
    return { ...base, review: false as const, answerPosition: meta.answerPosition,
      judgment: { status: box(item.firstJudgment.status), contentAssessment: item.firstJudgment.contentAssessment, boundary: item.firstJudgment.boundary },
      twist: twists.length > 0 ? twists : null,
      summaryLink: correct ? null : this.summaryLinkFor(p, passage, questionId, chosen.position),
      thoughtDiagnosis: eligibleDiagnosis && item.thoughtDiagnosis.status !== 'NONE'
        ? { status: box(item.thoughtDiagnosis.status), firstFailedStep: output?.firstFailedStep ?? null, outcomeType: output?.outcomeType ?? null } : null,
      evidence: { student: assessment && assessment.studentEvidence.length > 0 ? assessment.studentEvidence.map(e => e.quote).join(' / ') : null,
        source: (assessment?.sourceEvidence ?? []).filter(e => e.quote !== null).map(e => ({ location: e.location, quote: e.quote! })) } };
  }

  private twistTexts(): Record<string, string[]> {
    this.twistStudentText ??= loadTwistStudentText();
    return this.twistStudentText;
  }

  /** 첫 선택이 오답이고 문항 검토가 아니며 그 지문을 요약했을 때만. 골드·선지 연결은 표시에만 쓴다(D-0002·D-0162). */
  private summaryLinkFor(p: Participant, passage: DiagnosticSetPassage, questionId: string, chosenPosition: number): SummaryLink | null {
    if (p.passages[passage.passageId]!.summaryChosen !== true) return null;
    const meta = this.set.items[questionId]!;
    let targetFn = this.targetCache.get(passage.choiceLinkPath);
    if (!targetFn) { targetFn = this.loadTargets(passage.choiceLinkPath); this.targetCache.set(passage.choiceLinkPath, targetFn); }
    const chosen = targetFn(meta.questionNumber, chosenPosition);
    if (!chosen) return null;
    // 적절한 것 고르기: 학생이 고른 선지의 비틂. 적절하지 않은 것 고르기: 고른 선지는 맞는 진술이라 비틂이 없으므로 정답 선지의 비틂(알아채지 못한 곳).
    const source = chosen.stemPolarity === 'SELECT_INCORRECT' ? targetFn(meta.questionNumber, meta.answerPosition) : chosen;
    if (!source) return null;
    const content = this.content(passage.passageId);
    return summaryLink({
      targetIds: source.ids,
      mapDirectories: passage.analysisMaps.map(entry => basename(dirname(entry.mapPath))),
      unitIndexes: this.unitIndexesFor(passage.passageId),
      analysisOf: paragraphId => p.analysis[paragraphId],
      positionOf: paragraphId => content.paragraphs.find(q => q.paragraphId === paragraphId)?.position ?? null,
    });
  }

  private resultReading(p: Participant, passage: DiagnosticSetPassage) {
    const paragraphs = this.content(passage.passageId).paragraphs.filter(q => p.analysis[q.paragraphId] !== undefined);
    const statuses = paragraphs.map(q => p.analysis[q.paragraphId]!.status);
    const status: Box = statuses.some(s => s === 'PENDING') ? 'pending' : statuses.some(s => s === 'FAILED') ? 'failed' : 'ready';
    let counts = emptyCounts();
    const rows = paragraphs.map(q => {
      const loaded = this.mapFor(passage.passageId, q.paragraphId)!;
      const judgments = Object.fromEntries(Object.entries(p.analysis[q.paragraphId]!.judgments).map(([id, value]) => {
        const row = value as { status?: string; finalLabel?: string };
        return [id, { finalLabel: row.status === 'OK' ? row.finalLabel ?? null : null }];
      }));
      const combined = combineRound(loaded.map, q.paragraphId, judgments);
      const typeOf = this.classifyFor(passage.passageId)[this.maps(passage.passageId).indexOf(loaded)]!;
      counts = addCounts(counts, countParagraph(loaded.map, q.paragraphId, judgments, typeOf));
      return { paragraphId: q.paragraphId, nodes: combined.nodes, relations: combined.relations };
    });
    return { passageId: passage.passageId, status, paragraphs: rows, counts };
  }

  // ---------- 내부: 저장·기록 ----------

  private event(type: string, p: Participant, data: Record<string, unknown>): void {
    try { this.store.appendEvent({ type, participantId: p.participantId, ...data }); } catch (error) { this.errors.push(error); }
  }
  /** 저장은 참가자 단위 직렬 큐로 차례대로 한다. 큐가 돌 때의 메모리 상태 하나를 통째로 쓴다. */
  private requestSave(p: Participant): void {
    if (this.saveScheduled.has(p.participantId)) return;
    this.saveScheduled.add(p.participantId);
    const previous = this.saveQueues.get(p.participantId) ?? Promise.resolve();
    this.saveQueues.set(p.participantId, previous.then(() => {
      this.saveScheduled.delete(p.participantId);
      try { this.store.save(p); } catch (error) { this.errors.push(error); }
    }));
  }
  private track(work: Promise<unknown>): void {
    const tracked = work.catch((error: unknown) => { this.errors.push(error); }).finally(() => { this.background.delete(tracked); });
    this.background.add(tracked);
  }
}
