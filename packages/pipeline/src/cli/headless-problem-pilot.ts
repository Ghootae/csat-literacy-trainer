import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import {
  DEFAULT_MRNA_Q19_PERSONAS,
  HEADLESS_PROBLEM_PILOT_VERSION,
  StudentDecisionSchema,
  runHeadlessPilotCase,
  type HeadlessProblemApi,
  type HeadlessPilotCaseResult,
  type HeadlessProblemSessionView,
  type HeadlessStudentRole,
  type StudentActionKind,
  type StudentPersona,
} from '../problem-solving/headless-pilot.js';

const QUESTION_ID = 'mrna-vaccine-lipid-nanoparticle-q19';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function assertPublicProjection(value: unknown): void {
  const forbidden = new Set([
    'answerChoiceId',
    'optionClaims',
    'representativeWrongPaths',
    'diagnosticDecision',
    'pathSteps',
    'hypotheses',
    'basicGold',
    'rawOutput',
  ]);
  const visit = (current: unknown): void => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (current === null || typeof current !== 'object') return;
    for (const [key, child] of Object.entries(current)) {
      if (forbidden.has(key)) throw new Error(`학생 역할 입력에 내부 필드가 포함됐다: ${key}`);
      visit(child);
    }
  };
  visit(value);
}

class HttpProblemApi implements HeadlessProblemApi {
  constructor(private readonly baseUrl: string) {}

  private async request(path: string, init?: RequestInit): Promise<{ view: unknown; durationMs: number }> {
    const startedAt = performance.now();
    const response = await fetch(`${this.baseUrl}${path}`, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`문제 API ${response.status}: ${(body as { error?: string }).error ?? JSON.stringify(body)}`);
    }
    assertPublicProjection(body);
    return { view: body, durationMs: Math.round(performance.now() - startedAt) };
  }

  start(questionId: string): Promise<{ view: unknown; durationMs: number }> {
    return this.request('/api/problem/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ questionId }),
    });
  }

  submitInitial(sessionId: string, body: unknown): Promise<{ view: unknown; durationMs: number }> {
    return this.request(`/api/problem/session/${sessionId}/initial`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
  }

  submitRationale(sessionId: string, rationale: string): Promise<{ view: unknown; durationMs: number }> {
    return this.request(`/api/problem/session/${sessionId}/rationale`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rationale }),
    });
  }

  respond(sessionId: string, body: unknown): Promise<{ view: unknown; durationMs: number }> {
    return this.request(`/api/problem/session/${sessionId}/respond`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
  }
}

function actionInstruction(kind: StudentActionKind, session: HeadlessProblemSessionView): string {
  if (kind === 'INITIAL_RESPONSE') {
    return '공개 지문·보기·선지를 읽고 지금 페르소나가 실제로 고를 선지와 근거를 답한다. 이유가 전혀 없는 최하위 학생이라면 text는 null일 수 있다.';
  }
  if (kind === 'RATIONALE') return '방금 선택한 이유를 학생의 현재 이해 수준대로 짧게 말한다.';
  if (kind === 'RESELECTION') {
    return `코치와의 대화를 반영해 다시 선택한다. 현재 선택 ${session.selectedChoiceId ?? '없음'}과 다른 공개 선지를 choiceId로 고른다.`;
  }
  if (session.action?.kind === 'COACHING' || session.action?.kind === 'ITEM_BOUNDARY') {
    return '코칭 내용을 현재 수준에서 이해한 만큼 자기 말로 확인한다. 단순히 질문 문장을 그대로 복사하지 않는다.';
  }
  return '화면의 질문 하나에 학생의 현재 믿음대로 직접 답한다. 교정 질문이라도 자동으로 모범 답안을 말하지 말고, 페르소나가 납득한 만큼만 수정한다.';
}

class OpenAIStudentRole implements HeadlessStudentRole {
  private readonly client = new OpenAI({ maxRetries: 1 });

  constructor(
    private readonly model: string,
    private readonly effort: 'none' | 'low' | 'medium',
  ) {}

  async decide(input: {
    readonly persona: StudentPersona;
    readonly actionKind: StudentActionKind;
    readonly publicSession: HeadlessProblemSessionView;
  }) {
    assertPublicProjection(input.publicSession);
    const startedAt = performance.now();
    const response = await this.client.responses.create({
      model: this.model,
      reasoning: { effort: this.effort },
      store: false,
      max_output_tokens: 1200,
      instructions: [
        '당신은 정답을 잘 맞히는 튜터가 아니라 주어진 한국 고등학생 페르소나를 일관되게 연기하는 블라인드 학생 역할이다.',
        '입력에는 학생 화면에 공개된 정보만 있다. 정답, 채점 골드, 내부 진단을 추측해 찾으려 하지 않는다.',
        '페르소나의 오개념과 읽기 수준을 실제 믿음처럼 유지한다. 코치가 충분히 납득시켰을 때만 국소적으로 수정한다.',
        '시뮬레이션, 프롬프트, 페르소나라는 말을 학생 답변에 쓰지 않는다.',
        'choiceId는 화면에 공개된 C1~C5 중 하나이며, text는 실제 학생이 입력할 한국어 원문이다.',
        'decisionNote는 감사용 짧은 행동 설명이며 학생에게 전송되지 않는다.',
      ].join('\n'),
      input: JSON.stringify({
        persona: input.persona,
        requestedAction: input.actionKind,
        actionInstruction: actionInstruction(input.actionKind, input.publicSession),
        publicSession: input.publicSession,
      }),
      text: {
        format: {
          type: 'json_schema',
          name: 'student_pilot_decision',
          strict: true,
          schema: z.toJSONSchema(StudentDecisionSchema),
        },
      },
    });
    const parsed = StudentDecisionSchema.parse(JSON.parse(response.output_text));
    return {
      decision: parsed,
      metadata: {
        model: this.model,
        durationMs: Math.round(performance.now() - startedAt),
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }
}

if (!process.env['OPENAI_API_KEY']) throw new Error('OPENAI_API_KEY가 필요하다.');
const baseUrl = (option('--base-url') ?? 'http://127.0.0.1:5374').replace(/\/$/, '');
const model = option('--student-model') ?? 'gpt-5.6-terra';
const effortOption = option('--student-effort') ?? 'low';
if (!['none', 'low', 'medium'].includes(effortOption)) throw new Error(`지원하지 않는 학생 effort: ${effortOption}`);
const selectedPersonaId = option('--persona') ?? 'all';
const personas = DEFAULT_MRNA_Q19_PERSONAS.filter(
  (persona) => selectedPersonaId === 'all' || persona.personaId === selectedPersonaId,
);
if (personas.length === 0) throw new Error(`알 수 없는 학생 persona: ${selectedPersonaId}`);

const api = new HttpProblemApi(baseUrl);
const student = new OpenAIStudentRole(model, effortOption as 'none' | 'low' | 'medium');
const runId = new Date().toISOString().replaceAll(':', '-');
const outputDir = resolve(option('--output-dir') ?? '.omc/experiments/headless-problem-pilot', runId);
mkdirSync(outputDir, { recursive: true });
const results: Array<
  | { readonly status: 'PASS'; readonly result: HeadlessPilotCaseResult }
  | {
      readonly status: 'ERROR';
      readonly persona: StudentPersona;
      readonly error: { readonly name: string; readonly message: string } | string;
    }
> = [];

for (const persona of personas) {
  process.stdout.write(`RUN ${persona.personaId} (${persona.level})\n`);
  try {
    const result = await runHeadlessPilotCase({ persona, questionId: QUESTION_ID, api, student });
    results.push({ status: 'PASS', result });
    process.stdout.write(
      `${result.completed && result.finalView.result?.correct === true ? 'PASS' : 'FAIL'} ${persona.personaId}: ` +
      `${result.initialChoiceId} → ${result.finalView.result?.finalChoiceId ?? result.finalView.selectedChoiceId} ` +
      `questions=${result.finalView.questionBudget.used} outcome=${result.finalView.result?.outcome ?? 'INCOMPLETE'}\n`,
    );
  } catch (error) {
    results.push({
      status: 'ERROR',
      persona,
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    });
    process.stdout.write(`ERROR ${persona.personaId}: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

const completedResults = results.flatMap((record) => record.status === 'PASS' ? [record.result] : []);
const summary = {
  requestedCases: personas.length,
  completedCases: completedResults.filter((result) => result.completed).length,
  correctCases: completedResults.filter((result) => result.finalView.result?.correct === true).length,
  initialCorrectCases: completedResults.filter((result) =>
    result.finalView.result?.correct === true && result.initialChoiceId === result.finalView.result.finalChoiceId).length,
  averageDiagnosticQuestions: completedResults.length === 0 ? 0 : completedResults.reduce(
    (sum, result) => sum + result.finalView.questionBudget.used, 0,
  ) / completedResults.length,
  maxDiagnosticQuestions: Math.max(0, ...completedResults.map((result) => result.finalView.questionBudget.used)),
  outcomes: Object.fromEntries(completedResults.map((result) => result.finalView.result?.outcome ?? 'INCOMPLETE').reduce(
    (counts, outcome) => counts.set(outcome, (counts.get(outcome) ?? 0) + 1),
    new Map<string, number>(),
  )),
  studentModel: { model, effort: effortOption },
};
const artifact = {
  schemaVersion: HEADLESS_PROBLEM_PILOT_VERSION,
  runId,
  generatedAt: new Date().toISOString(),
  source: { questionId: QUESTION_ID, baseUrl, publicProjectionOnly: true },
  summary,
  records: results,
};
writeFileSync(resolve(outputDir, 'results.json'), `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
process.stdout.write(`SUMMARY ${JSON.stringify(summary)}\n`);
process.stdout.write(`결과: ${resolve(outputDir, 'results.json')}\n`);
