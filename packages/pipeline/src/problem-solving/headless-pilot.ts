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

export const DEFAULT_MOHIST_Q12_PERSONAS: readonly StudentPersona[] = [
  {
    personaId: 'MH-REFERENT-ACCURATE', level: 'MID_HIGH',
    profile: '두 학파의 명–실 대응 원칙과 대화 속 각 표현의 지시 범위를 정확히 구별한다.',
    initialBias: '④의 ⓓ와 ⓔ가 같은 대상을 지시한다는 전제를 먼저 검토한다.',
    responseStyle: '선지의 전제와 적용 규칙을 한두 문장으로 분명히 말한다.',
  },
  {
    personaId: 'MH-C4-PRINCIPLE-ONLY', level: 'MID_HIGH',
    profile: '공손룡의 원칙은 이해하지만 복합 선지에서 후반 원칙이 맞으면 앞 전제를 덜 검토한다.',
    initialBias: '④ 후반부가 공손룡의 견해와 비슷해 보여 ④를 적절하다고 처리하고 다른 선지를 의심한다.',
    responseStyle: '어느 학파의 규칙을 적용했는지 구체적으로 말한다.',
  },
  {
    personaId: 'M-SCHOOL-CONFLATION', level: 'MID',
    profile: '공손룡과 후기 묵가의 예시는 기억하지만 어느 쪽이 다중 대응을 허용하는지 흔들린다.',
    initialBias: '공손룡도 맥락에 따라 같은 명이 여러 실을 지시할 수 있다고 생각해 ①을 의심한다.',
    responseStyle: '자신이 기억한 학파 원칙을 근거로 답한다.',
  },
  {
    personaId: 'M-FIXED-NAME-CLASS', level: 'MID',
    profile: '달명·유명·사명의 정의는 기억하지만 하나의 단어가 상황에 따라 분류가 달라지는 점을 놓친다.',
    initialBias: '‘옷’은 언제나 유명이라고 생각해 ③을 부적절하다고 본다.',
    responseStyle: '용어 정의를 짧게 인용해 설명한다.',
  },
  {
    personaId: 'ML-WHITE-HORSE-REVERSAL', level: 'MID_LOW',
    profile: '흰 말 사례의 결론 방향을 반대로 기억한다.',
    initialBias: '공손룡도 빨간 옷을 그냥 옷이라고 불러도 된다고 생각해 ⑤를 의심한다.',
    responseStyle: '흰 말 사례와 옷 사례를 직접 대응해 답한다.',
  },
  {
    personaId: 'ML-SAME-CONVERSATION-TARGET', level: 'MID_LOW',
    profile: '대화의 화제가 같으면 표현들이 같은 실을 지시한다고 성급히 묶는다.',
    initialBias: 'ⓓ와 ⓔ가 모두 갑이 찾는 옷 이야기이므로 같은 대상을 지시한다고 생각한다.',
    responseStyle: '대화 장면을 근거로 짧게 인과를 말한다.',
  },
  {
    personaId: 'L-ONE-TO-ONE-EVERYONE', level: 'LOW',
    profile: '두 학파의 차이를 놓치고 명과 실은 언제나 일대일이어야 한다고 이해한다.',
    initialBias: '후기 묵가도 한 명이 여러 실을 가리키는 것을 반대한다고 생각해 ②를 고른다.',
    responseStyle: '쉬운 말로 같은 이름이면 같은 물건이어야 한다고 답한다.',
  },
  {
    personaId: 'L-KEYWORD-MATCHER', level: 'LOW',
    profile: '선지 전체보다 ‘일대일’, ‘유명’, ‘속성’ 같은 단어가 지문에 있었는지를 중심으로 고른다.',
    initialBias: '‘유명을 사명으로 사용’이라는 표현이 낯설어 ③을 고르지만 이유가 선명하지 않다.',
    responseStyle: '처음에는 모호하게 답하고 구체적으로 물으면 한 생각을 말한다.',
  },
  {
    personaId: 'LL-GUESS-C1', level: 'LOWEST',
    profile: '명과 실의 관계를 거의 복원하지 못하고 첫 선지를 추측한다.',
    initialBias: '첫 선택은 C1이며 INITIAL_RESPONSE의 text는 null로 둔다.',
    responseStyle: '매우 짧게 답하고 처음에는 이유를 모르겠다고 말한다.',
  },
  {
    personaId: 'LL-NAME-OBJECT-MERGE', level: 'LOWEST',
    profile: '이름과 실제 대상, 대상의 속성을 하나로 섞어 이해한다.',
    initialBias: '문장에 옷이라는 글자가 같으면 모두 같은 대상을 뜻한다고 생각해 임의의 오답을 고른다.',
    responseStyle: '옷이라는 말이 같다는 점만 반복하지만 질문받은 표현에는 직접 답하려 한다.',
  },
].map((persona) => StudentPersonaSchema.parse(persona));

function expandedPersonas(
  prefix: string,
  biases: readonly [string, string, string, string, string],
): readonly StudentPersona[] {
  const levels = ['MID_HIGH', 'MID', 'MID_LOW', 'LOW', 'LOWEST'] as const;
  const profiles = [
    '지문과 보기의 조건을 비교적 정확히 연결하며 복합 선지의 전제를 확인한다.',
    '핵심 개념은 기억하지만 보기 상황에 적용할 때 한 관계를 혼동한다.',
    '개별 사실은 기억하지만 조건의 순서나 작용 범위를 놓치기 쉽다.',
    '눈에 띄는 표현과 일상적 직관을 중심으로 판단한다.',
    '관계를 거의 복원하지 못하고 한 단어나 첫인상으로 선택한다.',
  ];
  return biases.map((initialBias, index) => StudentPersonaSchema.parse({
    personaId: `${prefix}-${levels[index]}`,
    level: levels[index],
    profile: profiles[index],
    initialBias,
    responseStyle: index < 2
      ? '한두 문장으로 사용한 근거를 말하고 납득한 교정은 반영한다.'
      : index < 4
        ? '짧은 문장으로 한 관계만 설명하며 구체적으로 물으면 생각을 드러낸다.'
        : '처음에는 이유를 모르겠다고 답할 수 있고, 직접적인 질문에만 매우 짧게 답한다.',
  }));
}

export const EXPANDED_PERSONAS_BY_QUESTION_ID: Readonly<Record<string, readonly StudentPersona[]>> = {
  'corporate-law-q13': expandedPersonas('LAW13', [
    '②에서 개인의 출자와 대표 이사의 권한 근거가 다르다고 보아 C2를 선택한다.',
    '설립자가 재산을 냈으므로 주주들이 갑 개인에게 법인격과 운용 권한을 주었다고 생각해 C5를 의심한다.',
    '자본금은 절대로 줄일 수 없다고 기억해 C4를 고른다.',
    '자본 거래 이익은 법인 목적에 쓸 수 없다고 생각해 C3을 고른다.',
    '설립자라면 회사 재산을 자유롭게 다룰 수 있다고 생각해 C5를 고르며 이유는 단순하다.',
  ]),
  'information-asymmetry-free-marketplace-q13': expandedPersonas('INFO13', [
    '다수 의견의 위헌 결론과 ⑤의 제재 결론이 반대임을 확인해 C5를 선택한다.',
    'AI를 이용한 제작자 갑은 현재 생성물 표시 의무로 곧바로 제재된다고 생각해 C2를 고른다.',
    '플랫폼에도 현재 AI 표시 의무가 이미 부과된다고 생각해 C1을 고른다.',
    '위험한 주장을 처벌하는 법이 다수 의견과도 맞는다고 생각해 C3을 고른다.',
    '소수 의견이 최종 헌법 재판소 결론이라고 섞어 이해해 C4를 고른다.',
  ]),
  'surface-tension-laplace-q16': expandedPersonas('SURFACE16', [
    '밀도 두 배와 노즐 지름 절반이 곱에서 상쇄됨을 계산해 C3을 선택한다.',
    '첨가제 뒤 정상 출력이면 오네소르게 수가 더 커졌다고 생각해 C2를 고른다.',
    '밀도 증가만 보고 오네소르게 수가 작아진다고 판단해 C3을 의심하고 C1을 고른다.',
    '시간이 지나면 파란 잉크도 자동으로 적정 범위를 벗어난다고 생각해 C4를 고른다.',
    '더 끈적하면 작은 위성 방울로 쪼개진다고 생각해 C5를 고른다.',
  ]),
  'dopamine-motor-control-q13': expandedPersonas('DOPA13', [
    '카르비도파는 말초에서만 작용하므로 흑질 도파민 작용 기간을 늘리지 못한다고 보아 C2를 선택한다.',
    '효소를 억제하면 도파민 분해도 늦어진다고 생각해 C2를 맞는 설명으로 보고 C1을 고른다.',
    '레보도파도 도파민의 한 종류라 혈액-뇌 장벽을 통과하지 못한다고 생각해 C1을 고른다.',
    '프라미펙솔이 도파민처럼 기능하므로 흑질의 도파민 합성도 늘린다고 생각해 C3을 고른다.',
    '카르비도파가 레보도파의 뇌 진입 자체를 막는다고 생각해 C4를 고른다.',
  ]),
};

const ProblemSessionViewSchema = z.object({
  sessionId: z.string().min(1),
  phase: z.enum([
    'AWAITING_INITIAL_CHOICE',
    'AWAITING_RATIONALE',
    'PROCESSING',
    'EVALUATION_ERROR',
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
  selectionCount: z.number().int().nonnegative(),
  interventionCount: z.number().int().nonnegative(),
  interventionCountForCurrentSelection: z.number().int().nonnegative(),
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
  selectionProgress: z.object({ current: z.number().int(), maximum: z.number().int() }).optional(),
  result: z.object({
    correct: z.boolean(),
    finalChoiceId: z.string().min(1),
    outcome: z.string().min(1),
    selectionAttempt: z.number().int().positive(),
    rationaleSubmission: z.enum(['PROVIDED', 'NOT_PROVIDED']),
    rationaleAssessment: z.enum(['NOT_PROVIDED', 'NOT_EVALUATED', 'SUPPORTED', 'UNCERTAIN', 'CLEAR_ERROR']),
    rationaleNonEvaluationReason: z.enum([
      'FINAL_ATTEMPT_STATIC_TERMINATION',
      'PATH_DIAGNOSIS_ONLY',
    ]).nullable(),
    answerRevealed: z.boolean(),
    resolvedByStudent: z.boolean(),
    resolutionStage: z.enum(['INITIAL', 'SECOND_SELECTION', 'THIRD_SELECTION', 'ANSWER_REVEALED']),
    resolutionOutcome: z.enum([
      'INITIAL_CORRECT',
      'INITIAL_CORRECT_VERIFIED',
      'INITIAL_CORRECT_UNVERIFIED',
      'SECOND_SELECTION_CORRECT_VERIFIED',
      'SECOND_SELECTION_CORRECT_UNVERIFIED',
      'THIRD_SELECTION_CORRECT_VERIFIED',
      'THIRD_SELECTION_CORRECT_UNVERIFIED',
      'ANSWER_REVEALED',
      'UNRESOLVED',
    ]),
    interventionPath: z.string().min(1),
    interventionHistory: z.array(z.string().min(1)),
    effectiveRepairPath: z.string().min(1),
    answerExplanation: z.string().nullable(),
    answerReveal: z.object({
      answerChoiceId: z.string().min(1),
      lastChoiceId: z.string().min(1),
      lastChoiceExplanation: z.string().min(1),
      correctChoiceExplanation: z.string().min(1),
      groundingSummary: z.string().min(1),
    }).nullable(),
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
  get(sessionId: string): Promise<{ view: unknown; durationMs: number }>;
  resume(sessionId: string): Promise<{ view: unknown; durationMs: number }>;
  submitInitial(sessionId: string, body: unknown): Promise<{ view: unknown; durationMs: number }>;
  submitRationale(sessionId: string, rationale: string): Promise<{ view: unknown; durationMs: number }>;
  respond(sessionId: string, body: unknown): Promise<{ view: unknown; durationMs: number }>;
}

async function runWithEvaluationRecovery(
  api: HeadlessProblemApi,
  sessionId: string,
  mutation: () => Promise<{ view: unknown; durationMs: number }>,
): Promise<{ view: unknown; durationMs: number }> {
  try {
    return await mutation();
  } catch (initialError) {
    let durationMs = 0;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const restored = await api.get(sessionId);
      durationMs += restored.durationMs;
      const view = ProblemSessionViewSchema.parse(restored.view);
      if (view.phase !== 'EVALUATION_ERROR' && view.phase !== 'PROCESSING') {
        return { view, durationMs };
      }
      if (view.phase === 'PROCESSING') continue;
      try {
        const resumed = await api.resume(sessionId);
        return { view: resumed.view, durationMs: durationMs + resumed.durationMs };
      } catch {
        // 저장된 관찰은 유지된다. 다음 반복에서 최신 상태를 다시 읽고 평가만 재개한다.
      }
    }
    throw initialError;
  }
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
      next = await runWithEvaluationRecovery(options.api, view.sessionId, () => options.api.submitInitial(view.sessionId, {
        choiceId: decision.choiceId,
        ...(decision.text?.trim() ? { rationale: decision.text.trim() } : {}),
        ...(decision.confidence === null ? {} : { confidence: decision.confidence }),
      }));
    } else if (actionKind === 'RATIONALE') {
      next = await runWithEvaluationRecovery(options.api, view.sessionId, () =>
        options.api.submitRationale(view.sessionId, decision.text!.trim()));
    } else if (actionKind === 'RESELECTION') {
      next = await runWithEvaluationRecovery(options.api, view.sessionId, () => options.api.respond(view.sessionId, {
        type: 'RESELECT',
        choiceId: decision.choiceId,
        ...(decision.text?.trim() ? { rationale: decision.text.trim() } : {}),
      }));
    } else {
      next = await runWithEvaluationRecovery(options.api, view.sessionId, () => options.api.respond(view.sessionId, {
        type: 'TEXT', text: decision.text!.trim(),
      }));
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
