import { z } from 'zod/v4';

export const HEADLESS_PROBLEM_PILOT_VERSION = 'headless-problem-pilot-v1' as const;

export const StudentLevelSchema = z.enum([
  'MID_HIGH',
  'MID',
  'MID_LOW',
  'LOW',
  'LOWEST',
]);

export const StudentPersonaSchema = z.object({
  personaId: z.string().min(1),
  level: StudentLevelSchema,
  profile: z.string().min(1),
  initialBias: z.string().min(1),
  responseStyle: z.string().min(1),
}).strict();

export type StudentPersona = z.infer<typeof StudentPersonaSchema>;

export const DEFAULT_MRNA_Q19_PERSONAS: readonly StudentPersona[] = [
  {
    personaId: 'MH-ACCURATE', level: 'MID_HIGH',
    profile: '지문과 보기의 조건을 비교적 정확히 연결하지만 확신하기 전 근거를 짧게 확인한다.',
    initialBias: '전하 상태, pH와 소수성을 서로 다른 속성으로 구분하려 한다.',
    responseStyle: '한두 문장으로 핵심 근거를 분명히 말한다.',
  },
  {
    personaId: 'MH-SPEED-SKEPTIC', level: 'MID_HIGH',
    profile: '과학 개념은 이해하지만 선지 표현의 모호성에 민감하다.',
    initialBias: '투입 속도를 조절한다는 말을 시간에 따라 속도를 계속 바꾸는 것으로 읽기 쉽다.',
    responseStyle: '의심한 표현과 이유를 구체적으로 말한다.',
  },
  {
    personaId: 'M-ETHANOL-PH', level: 'MID',
    profile: '개별 사실은 기억하지만 용액 혼합 뒤 조건을 결합하는 데 흔들린다.',
    initialBias: '에탄올의 pH가 7이면 혼합 용액도 산성이 되기 어렵다고 생각한다.',
    responseStyle: '자신이 사용한 한 가지 조건을 중심으로 설명한다.',
  },
  {
    personaId: 'M-CHARGE-HYDROPHOBIC', level: 'MID',
    profile: '지문 사실은 읽지만 서로 다른 물질 속성을 하나의 강약 축으로 합치기 쉽다.',
    initialBias: '전하가 사라져 중성이 되면 소수성도 약해진다고 생각한다.',
    responseStyle: '인과를 한 문장으로 설명하고 질문을 받으면 재검토한다.',
  },
  {
    personaId: 'ML-VISUAL-LITERAL', level: 'MID_LOW',
    profile: '그림을 먼저 보고 눈에 띄는 변화에 의미를 과도하게 부여한다.',
    initialBias: 'Y자 관의 합류 지점을 mRNA가 분해되거나 사라지는 사건으로 읽기 쉽다.',
    responseStyle: '그림에서 본 장면을 근거로 짧게 답한다.',
  },
  {
    personaId: 'ML-PH-DIRECTION', level: 'MID_LOW',
    profile: '용어는 기억하지만 수치 방향과 농도 관계를 자주 반대로 연결한다.',
    initialBias: 'pH 수치가 높아지면 수소 이온 농도도 높아진다고 생각한다.',
    responseStyle: '현재 믿는 방향을 분명히 말하고 교정 질문에는 계산 없이 답한다.',
  },
  {
    personaId: 'L-SURFACE-PROPERTY', level: 'LOW',
    profile: '일상적 인상으로 과학적 속성을 판단한다.',
    initialBias: '투명하거나 pH가 중성인 액체는 친수성이며 소수성이 아니라고 생각한다.',
    responseStyle: '쉬운 말과 일상적 예를 사용한다.',
  },
  {
    personaId: 'L-FRAGMENTED', level: 'LOW',
    profile: '선지 전체보다 한 단어나 한 장면만 보고 고른다.',
    initialBias: '통제라는 단어가 이상하다는 직감으로 처음에는 C2를 고르지만 구체적인 이유는 잘 말하지 못한다.',
    responseStyle: '처음 답은 모호하고, 구체적으로 물으면 그때 한 가지 생각을 말한다.',
  },
  {
    personaId: 'LL-GUESSER', level: 'LOWEST',
    profile: '지문 관계를 거의 복원하지 못하고 직감적으로 선택한다.',
    initialBias: '첫 선택은 C4로 추측하며 INITIAL_RESPONSE의 text는 null로 둔다. 약한 힌트만으로는 쉽게 수정하지 못한다.',
    responseStyle: '매우 짧게 답하며 처음에는 이유가 없다고 말할 수 있다.',
  },
  {
    personaId: 'LL-CHARGE-REVERSAL', level: 'LOWEST',
    profile: '대상과 전하 부호, 결합 순서를 뒤섞는다.',
    initialBias: 'mRNA가 양전하이고 이온화 지질이 음전하라서 결합한다고 생각한다.',
    responseStyle: '한 문장 안에서도 용어를 섞지만 질문받은 관계에는 직접 답하려 한다.',
  },
].map((persona) => StudentPersonaSchema.parse(persona));

const ProblemSessionViewSchema = z.object({
  sessionId: z.string().min(1),
  phase: z.enum([
    'AWAITING_INITIAL_CHOICE',
    'AWAITING_RATIONALE',
    'AWAITING_RESPONSE',
    'AWAITING_RESELECTION',
    'COMPLETED',
  ]),
  content: z.object({
    questionId: z.string().min(1),
    title: z.string().min(1),
    passage: z.string().min(1),
    stem: z.string().min(1),
    scenario: z.string().min(1),
    image: z.unknown().nullable(),
    choices: z.array(z.object({
      choiceId: z.string().min(1),
      position: z.number().int().positive(),
      text: z.string().min(1),
    }).passthrough()).min(1),
  }).passthrough(),
  selectedChoiceId: z.string().nullable(),
  action: z.object({
    kind: z.enum(['DIAGNOSTIC_QUESTION', 'CORRECTIVE_QUESTION', 'COACHING', 'ITEM_BOUNDARY']),
    text: z.string().min(1),
  }).nullable(),
  reselectionPrompt: z.string().nullable(),
  transcript: z.array(z.object({
    role: z.enum(['STUDENT', 'COACH']),
    kind: z.string().min(1),
    text: z.string(),
  }).passthrough()),
  questionBudget: z.object({ used: z.number().int(), maximum: z.number().int() }),
  attemptQuestionBudget: z.object({ used: z.number().int(), maximum: z.number().int() }).optional(),
  result: z.object({
    correct: z.boolean(),
    finalChoiceId: z.string().min(1),
    outcome: z.string().min(1),
    selectionAttempt: z.number().int().positive(),
    rationaleAssessment: z.enum(['NOT_PROVIDED', 'SUPPORTED', 'UNCERTAIN', 'CLEAR_ERROR']),
    answerRevealed: z.boolean(),
    resolvedByStudent: z.boolean(),
  }).nullable(),
}).passthrough();

export type HeadlessProblemSessionView = z.infer<typeof ProblemSessionViewSchema>;

export const StudentDecisionSchema = z.object({
  choiceId: z.string().nullable(),
  text: z.string().nullable(),
  confidence: z.number().min(0).max(100).nullable(),
  decisionNote: z.string().min(1),
}).strict();

export type StudentDecision = z.infer<typeof StudentDecisionSchema>;

export type StudentActionKind = 'INITIAL_RESPONSE' | 'RATIONALE' | 'FOLLOW_UP' | 'RESELECTION';

export interface StudentRoleCall {
  readonly decision: StudentDecision;
  readonly metadata: {
    readonly model: string;
    readonly durationMs: number;
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
}

export interface HeadlessStudentRole {
  decide(input: {
    readonly persona: StudentPersona;
    readonly actionKind: StudentActionKind;
    readonly publicSession: HeadlessProblemSessionView;
  }): Promise<StudentRoleCall>;
}

export interface HeadlessProblemApi {
  start(questionId: string): Promise<{ view: unknown; durationMs: number }>;
  submitInitial(sessionId: string, body: unknown): Promise<{ view: unknown; durationMs: number }>;
  submitRationale(sessionId: string, rationale: string): Promise<{ view: unknown; durationMs: number }>;
  respond(sessionId: string, body: unknown): Promise<{ view: unknown; durationMs: number }>;
}

export interface HeadlessPilotCaseResult {
  readonly persona: StudentPersona;
  readonly initialChoiceId: string;
  readonly completed: boolean;
  readonly finalView: HeadlessProblemSessionView;
  readonly studentCalls: readonly StudentRoleCall['metadata'][];
  readonly events: readonly {
    readonly actionKind: StudentActionKind;
    readonly decision: StudentDecision;
    readonly publicPhaseBefore: HeadlessProblemSessionView['phase'];
    readonly publicPhaseAfter: HeadlessProblemSessionView['phase'];
    readonly coachActionKind: 'DIAGNOSTIC_QUESTION' | 'CORRECTIVE_QUESTION' | 'COACHING' | 'ITEM_BOUNDARY' | null;
    readonly serverDurationMs: number;
  }[];
}

function validateDecision(
  decisionInput: unknown,
  actionKind: StudentActionKind,
  view: HeadlessProblemSessionView,
): StudentDecision {
  const decision = StudentDecisionSchema.parse(decisionInput);
  const choiceIds = new Set(view.content.choices.map((choice) => choice.choiceId));
  if (actionKind === 'INITIAL_RESPONSE' || actionKind === 'RESELECTION') {
    if (decision.choiceId === null || !choiceIds.has(decision.choiceId)) {
      throw new Error(`${actionKind}: 공개 선지 중 하나를 선택해야 한다.`);
    }
  }
  if (actionKind === 'RATIONALE' || actionKind === 'FOLLOW_UP') {
    if (decision.text?.trim()) return decision;
    throw new Error(`${actionKind}: 학생 원문 응답이 필요하다.`);
  }
  return decision;
}

export async function runHeadlessPilotCase(options: {
  readonly persona: StudentPersona;
  readonly questionId: string;
  readonly api: HeadlessProblemApi;
  readonly student: HeadlessStudentRole;
  readonly maxStudentTurns?: number;
}): Promise<HeadlessPilotCaseResult> {
  const persona = StudentPersonaSchema.parse(options.persona);
  const started = await options.api.start(options.questionId);
  let view = ProblemSessionViewSchema.parse(started.view);
  const events: HeadlessPilotCaseResult['events'][number][] = [];
  const studentCalls: StudentRoleCall['metadata'][] = [];
  let initialChoiceId: string | null = null;

  for (let turn = 0; turn < (options.maxStudentTurns ?? 8); turn += 1) {
    if (view.phase === 'COMPLETED') break;
    const actionKind: StudentActionKind = view.phase === 'AWAITING_INITIAL_CHOICE'
      ? 'INITIAL_RESPONSE'
      : view.phase === 'AWAITING_RATIONALE'
        ? 'RATIONALE'
        : view.phase === 'AWAITING_RESELECTION'
          ? 'RESELECTION'
          : 'FOLLOW_UP';
    const call = await options.student.decide({ persona, actionKind, publicSession: view });
    studentCalls.push(call.metadata);
    const decision = validateDecision(call.decision, actionKind, view);
    const before = view.phase;
    const coachActionKind = view.action?.kind ?? null;
    let next: { view: unknown; durationMs: number };
    if (actionKind === 'INITIAL_RESPONSE') {
      initialChoiceId = decision.choiceId!;
      next = await options.api.submitInitial(view.sessionId, {
        choiceId: decision.choiceId,
        ...(decision.text?.trim() ? { rationale: decision.text.trim() } : {}),
        ...(decision.confidence === null ? {} : { confidence: decision.confidence }),
      });
    } else if (actionKind === 'RATIONALE') {
      next = await options.api.submitRationale(view.sessionId, decision.text!.trim());
    } else if (actionKind === 'RESELECTION') {
      next = await options.api.respond(view.sessionId, {
        type: 'RESELECT',
        choiceId: decision.choiceId,
        ...(decision.text?.trim() ? { rationale: decision.text.trim() } : {}),
      });
    } else {
      next = await options.api.respond(view.sessionId, {
        type: 'TEXT', text: decision.text!.trim(),
      });
    }
    view = ProblemSessionViewSchema.parse(next.view);
    events.push({
      actionKind,
      decision,
      publicPhaseBefore: before,
      publicPhaseAfter: view.phase,
      coachActionKind,
      serverDurationMs: next.durationMs,
    });
  }
  if (initialChoiceId === null) throw new Error('학생의 최초 선택이 생성되지 않았다.');
  return {
    persona,
    initialChoiceId,
    completed: view.phase === 'COMPLETED',
    finalView: view,
    studentCalls,
    events,
  };
}
