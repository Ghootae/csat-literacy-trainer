import { z } from 'zod/v4';

export const ProblemPathProbeCaseSchema = z.object({
  caseId: z.string().min(1),
  description: z.string().min(1),
  initialChoiceId: z.string().min(1),
  rationale: z.string().min(1),
  followUpResponse: z.string().min(1).nullable(),
  variants: z.array(z.enum(['WITH_REPRESENTATIVE_PATHS', 'WITHOUT_REPRESENTATIVE_PATHS'])).min(1),
  expected: z.object({
    modes: z.array(z.enum(['ASSESS_SELECTION_RATIONALE', 'DIAGNOSE_PATH'])).min(1),
    allowedActions: z.array(z.enum([
      'ASK_DIAGNOSTIC', 'ASK_CORRECTIVE', 'REQUEST_RESELECTION',
      'DIRECT_COACHING', 'EXPLAIN_ITEM_BOUNDARY', 'COMPLETE',
    ])),
    allowedAssessments: z.array(z.enum(['SUPPORTED', 'UNCERTAIN', 'CLEAR_ERROR'])),
    requireUnknown: z.boolean(),
    forbidSupportedInference: z.boolean(),
    forbidSupplementals: z.boolean(),
    forbidAnswerChoiceInQuestion: z.boolean(),
  }).strict(),
}).strict();

export type ProblemPathProbeCase = z.infer<typeof ProblemPathProbeCaseSchema>;

export const PROBLEM_PATH_PROBE_CASES: readonly ProblemPathProbeCase[] = [
  {
    caseId: 'mrna-c2-vague', description: '비정보 근거에서 경로를 발명하지 않는다.',
    initialChoiceId: 'C2', rationale: '그냥 이상해 보여요.', followUpResponse: null,
    variants: ['WITH_REPRESENTATIVE_PATHS', 'WITHOUT_REPRESENTATIVE_PATHS'],
    expected: { modes: ['DIAGNOSE_PATH'], allowedActions: ['ASK_DIAGNOSTIC'], allowedAssessments: [], requireUnknown: true, forbidSupportedInference: true, forbidSupplementals: true, forbidAnswerChoiceInQuestion: true },
  },
  {
    caseId: 'mrna-correct-wrong-rationale', description: '정답 선택과 잘못된 근거를 구분한다.',
    initialChoiceId: 'C5', rationale: 'pH가 높아지면 양전하가 더 강해져서 ⑤가 틀립니다.', followUpResponse: null,
    variants: ['WITH_REPRESENTATIVE_PATHS'],
    expected: { modes: ['ASSESS_SELECTION_RATIONALE'], allowedActions: [], allowedAssessments: ['CLEAR_ERROR'], requireUnknown: false, forbidSupportedInference: false, forbidSupplementals: true, forbidAnswerChoiceInQuestion: true },
  },
  {
    caseId: 'mrna-correct-valid-rationale', description: '정답 정보 없이도 타당한 ⑤ 근거를 승인한다.',
    initialChoiceId: 'C5', rationale: '⑤입니다. pH가 높아지면 이온화 지질이 중성이 되지만, 그것만으로 소수성이 약해져 더 작은 복합체가 된다고 볼 근거는 없습니다.', followUpResponse: null,
    variants: ['WITH_REPRESENTATIVE_PATHS'],
    expected: { modes: ['ASSESS_SELECTION_RATIONALE'], allowedActions: [], allowedAssessments: ['SUPPORTED'], requireUnknown: false, forbidSupportedInference: false, forbidSupplementals: true, forbidAnswerChoiceInQuestion: true },
  },
  {
    caseId: 'mrna-correct-polarity-conflict', description: '부정 발문에서 선택 선지를 맞다고 승인한 P0 근거를 거부한다.',
    initialChoiceId: 'C5', rationale: 'pH가 높아져 이온화 지질이 중성이 되면 소수성도 약해질 것 같으므로, 소수성 인력이 줄어 복합체 크기가 더 작아진다는 설명이 맞는 것 같습니다.', followUpResponse: null,
    variants: ['WITH_REPRESENTATIVE_PATHS'],
    expected: { modes: ['ASSESS_SELECTION_RATIONALE'], allowedActions: [], allowedAssessments: ['CLEAR_ERROR'], requireUnknown: false, forbidSupportedInference: false, forbidSupplementals: true, forbidAnswerChoiceInQuestion: true },
  },
  {
    caseId: 'mrna-c4-partly-correct', description: '정확한 일부 추론까지 오류로 처리하지 않는다.',
    initialChoiceId: 'C4', rationale: '투석으로 pH가 높아지는 것은 맞지만 수소 이온도 증가한다고 생각했습니다.', followUpResponse: null,
    variants: ['WITH_REPRESENTATIVE_PATHS'],
    expected: { modes: ['DIAGNOSE_PATH'], allowedActions: ['ASK_CORRECTIVE'], allowedAssessments: [], requireUnknown: false, forbidSupportedInference: false, forbidSupplementals: true, forbidAnswerChoiceInQuestion: true },
  },
  {
    caseId: 'mrna-self-revision', description: '한 발화 안의 최초 표상과 자기 수정을 구분한다.',
    initialChoiceId: 'C4', rationale: '처음에는 pH가 높으면 수소 이온이 많다고 봤지만, 다시 생각하니 오히려 적습니다.', followUpResponse: null,
    variants: ['WITH_REPRESENTATIVE_PATHS'],
    expected: { modes: ['DIAGNOSE_PATH'], allowedActions: ['ASK_DIAGNOSTIC', 'REQUEST_RESELECTION'], allowedAssessments: [], requireUnknown: false, forbidSupportedInference: false, forbidSupplementals: true, forbidAnswerChoiceInQuestion: true },
  },
  {
    caseId: 'mrna-conflicting-turns', description: '현재 답변이 과거 관찰을 덮어쓰지 않는다.',
    initialChoiceId: 'C2', rationale: '속도를 계속 바꾸는 뜻이라 균일하지 않습니다.', followUpResponse: '속도를 계속 바꾼다는 뜻은 아니고 두 용액 속도를 다르게 정한다는 뜻이었습니다.',
    variants: ['WITH_REPRESENTATIVE_PATHS'],
    expected: { modes: ['DIAGNOSE_PATH'], allowedActions: ['EXPLAIN_ITEM_BOUNDARY', 'ASK_DIAGNOSTIC'], allowedAssessments: [], requireUnknown: false, forbidSupportedInference: false, forbidSupplementals: true, forbidAnswerChoiceInQuestion: true },
  },
  {
    caseId: 'mrna-c2-rational-challenge', description: '②의 합리적 이의를 학생 오류로 만들지 않는다.',
    initialChoiceId: 'C2', rationale: '두 용액의 속도를 다르게 하면 혼합 비율도 달라질 수 있습니다.', followUpResponse: null,
    variants: ['WITH_REPRESENTATIVE_PATHS', 'WITHOUT_REPRESENTATIVE_PATHS'],
    expected: { modes: ['DIAGNOSE_PATH'], allowedActions: ['ASK_DIAGNOSTIC', 'EXPLAIN_ITEM_BOUNDARY'], allowedAssessments: [], requireUnknown: false, forbidSupportedInference: false, forbidSupplementals: true, forbidAnswerChoiceInQuestion: true },
  },
  {
    caseId: 'mrna-new-error', description: '대표 WP에 없는 오류를 새 가설로 허용한다.',
    initialChoiceId: 'C3', rationale: 'Y자 관에서는 두 액체가 닿는 순간 mRNA가 분해된다고 생각했습니다.', followUpResponse: null,
    variants: ['WITH_REPRESENTATIVE_PATHS', 'WITHOUT_REPRESENTATIVE_PATHS'],
    expected: { modes: ['DIAGNOSE_PATH'], allowedActions: ['ASK_DIAGNOSTIC', 'ASK_CORRECTIVE'], allowedAssessments: [], requireUnknown: false, forbidSupportedInference: false, forbidSupplementals: true, forbidAnswerChoiceInQuestion: true },
  },
  {
    caseId: 'mrna-irrelevant-long', description: '무관한 장문의 키워드로 진단하지 않는다.',
    initialChoiceId: 'C3', rationale: '백신은 중요하고 나노 입자는 작으며 과학 기술은 발전합니다. 그래서 ③입니다.', followUpResponse: null,
    variants: ['WITH_REPRESENTATIVE_PATHS'],
    expected: { modes: ['DIAGNOSE_PATH'], allowedActions: ['ASK_DIAGNOSTIC'], allowedAssessments: [], requireUnknown: true, forbidSupportedInference: true, forbidSupplementals: true, forbidAnswerChoiceInQuestion: true },
  },
  {
    caseId: 'mrna-same-rationale-c2', description: '동일 근거의 의미를 선택에 맞춰 뒤집지 않는다 A.',
    initialChoiceId: 'C2', rationale: 'pH가 높아지면 전하가 사라져 소수성도 약해진다고 봤습니다.', followUpResponse: null,
    variants: ['WITHOUT_REPRESENTATIVE_PATHS'],
    expected: { modes: ['DIAGNOSE_PATH'], allowedActions: ['ASK_CORRECTIVE', 'ASK_DIAGNOSTIC'], allowedAssessments: [], requireUnknown: false, forbidSupportedInference: false, forbidSupplementals: true, forbidAnswerChoiceInQuestion: true },
  },
  {
    caseId: 'mrna-same-rationale-c3', description: '동일 근거의 의미를 선택에 맞춰 뒤집지 않는다 B.',
    initialChoiceId: 'C3', rationale: 'pH가 높아지면 전하가 사라져 소수성도 약해진다고 봤습니다.', followUpResponse: null,
    variants: ['WITHOUT_REPRESENTATIVE_PATHS'],
    expected: { modes: ['DIAGNOSE_PATH'], allowedActions: ['ASK_CORRECTIVE', 'ASK_DIAGNOSTIC'], allowedAssessments: [], requireUnknown: false, forbidSupportedInference: false, forbidSupplementals: true, forbidAnswerChoiceInQuestion: true },
  },
  {
    caseId: 'mrna-missed-only', description: '놓친 정답만 설명된 경우 타깃 충분성을 분리한다.',
    initialChoiceId: 'C2', rationale: 'pH가 높아져 중성이 되면 소수성도 약해진다고 생각했습니다.', followUpResponse: null,
    variants: ['WITH_REPRESENTATIVE_PATHS'],
    expected: { modes: ['DIAGNOSE_PATH'], allowedActions: ['ASK_CORRECTIVE', 'ASK_DIAGNOSTIC'], allowedAssessments: [], requireUnknown: false, forbidSupportedInference: false, forbidSupplementals: true, forbidAnswerChoiceInQuestion: true },
  },
].map((item) => ProblemPathProbeCaseSchema.parse(item));

export function assessProblemPathProbe(
  probe: ProblemPathProbeCase,
  result: unknown,
): { passed: boolean; failures: string[] } {
  const value = result as any;
  const failures: string[] = [];
  if (!probe.expected.modes.includes(value.mode)) failures.push('MODE');
  if (value.mode === 'ASSESS_SELECTION_RATIONALE') {
    if (!probe.expected.allowedAssessments.includes(value.assessment)) failures.push('ASSESSMENT');
    return { passed: failures.length === 0, failures };
  }
  if (!probe.expected.allowedActions.includes(value.nextActionCandidate?.type)) failures.push('ACTION');
  const evaluated = (value.targets ?? []).filter((target: any) => Array.isArray(target.pathSteps));
  const steps = evaluated.flatMap((target: any) => target.pathSteps);
  if (probe.expected.requireUnknown && !steps.some((step: any) => step.epistemicStatus === 'UNKNOWN')) failures.push('UNKNOWN_MISSING');
  if (probe.expected.forbidSupportedInference && steps.some((step: any) => step.epistemicStatus === 'SUPPORTED_INFERENCE')) failures.push('INVENTED_INFERENCE');
  if (probe.expected.forbidSupplementals && value.nextActionCandidate?.supplementalInferenceIds?.length > 0) failures.push('SUPPLEMENTAL_LEAK');
  const question = value.nextActionCandidate?.questionText ?? '';
  if (probe.expected.forbidAnswerChoiceInQuestion && /(?:정답|⑤|5번|C5)/u.test(question)) failures.push('ANSWER_LEAK');
  return { passed: failures.length === 0, failures };
}

export function problemPathSemanticFingerprint(result: unknown): unknown {
  const value = result as any;
  if (value.mode !== 'DIAGNOSE_PATH') {
    return { mode: value.mode, assessment: value.assessment };
  }
  return {
    mode: value.mode,
    activeTarget: value.activeTarget,
    action: value.nextActionCandidate?.type,
    targets: (value.targets ?? []).map((target: any) => ({
      kind: target.kind,
      status: target.status,
      errorAssessment: target.errorAssessment,
      sufficient: target.sufficiency?.sufficient ?? null,
      epistemicStatuses: (target.pathSteps ?? []).map((step: any) => step.epistemicStatus),
      divergenceLayers: [...new Set(
        (target.hypotheses ?? []).flatMap((hypothesis: any) => hypothesis.candidateDivergenceLayers),
      )].sort(),
    })),
    questionIntent: value.nextActionCandidate?.questionIntent === null
      ? null
      : {
          kind: value.nextActionCandidate?.questionIntent?.kind,
          targetRelationRefs: [...(value.nextActionCandidate?.questionIntent?.targetRelationRefs ?? [])].sort(),
          interventionStrength: value.nextActionCandidate?.questionIntent?.interventionStrength,
        },
  };
}

export function compareProblemPathProbeVariants(
  withPaths: unknown,
  withoutPaths: unknown,
): { status: 'PASS' | 'WARNING' | 'FAIL'; withFingerprint: unknown; withoutFingerprint: unknown } {
  const withFingerprint = problemPathSemanticFingerprint(withPaths);
  const withoutFingerprint = problemPathSemanticFingerprint(withoutPaths);
  function critical(value: any) {
    return {
      mode: value.mode,
      activeTarget: value.activeTarget,
      action: value.action,
      targets: value.targets?.map((target: any) => ({
        kind: target.kind,
        status: target.status,
        errorAssessment: target.errorAssessment,
        sufficient: target.sufficient,
      })),
      questionKind: value.questionIntent?.kind ?? null,
      interventionStrength: value.questionIntent?.interventionStrength ?? null,
    };
  }
  const exact = JSON.stringify(withFingerprint) === JSON.stringify(withoutFingerprint);
  const criticalMatch = JSON.stringify(critical(withFingerprint)) ===
    JSON.stringify(critical(withoutFingerprint));
  return {
    status: exact ? 'PASS' : criticalMatch ? 'WARNING' : 'FAIL',
    withFingerprint,
    withoutFingerprint,
  };
}
