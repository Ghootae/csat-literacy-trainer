/**
 * 진단평가 테스트 공용 가짜 자료. 외부 전송 없이 가짜 평가기·가짜 transport·메모리 저장소만 쓴다.
 * 테스트 파일에서만 불러온다(운영 코드는 이 파일을 쓰지 않는다).
 */
import {
  feedbackObservationText,
  type FeedbackEvaluationCall, type FeedbackEvaluator, type FeedbackSession, type FeedbackTransport, type SimpleEvaluator, type SimpleOutput,
} from '@csat/pipeline';
import { loadDiagnosticBundle, loadDiagnosticSet } from './content.js';
import type { DiagnosticEvent, DiagnosticParticipant, DiagnosticStore } from './store.js';

export const RATIONALE = '원문을 읽고 이렇게 판단했다.';
export const metadata: FeedbackEvaluationCall['metadata'] = { provider: 'mock', model: 'fixed', promptVersion: 'problem-feedback-v5.8', durationMs: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0 };
export const set = loadDiagnosticSet();

export class MemoryStore implements DiagnosticStore {
  readonly files = new Map<string, string>();
  readonly events: DiagnosticEvent[] = [];
  load(id: string): DiagnosticParticipant | null { const raw = this.files.get(id); return raw === undefined ? null : JSON.parse(raw) as DiagnosticParticipant; }
  save(p: DiagnosticParticipant): void { this.files.set(p.participantId, JSON.stringify(p)); }
  appendEvent(e: DiagnosticEvent): void { this.events.push(JSON.parse(JSON.stringify(e)) as DiagnosticEvent); }
  count(type: string): number { return this.events.filter(e => e.type === type).length; }
}

export type Behavior = 'SUPPORTED' | 'ERROR' | 'INSUFFICIENT' | 'BOUNDARY' | 'MISMATCH' | 'THROW' | 'UNKNOWN_PATH' | 'INSUFFICIENT_MISMATCH';
export interface Call { questionId: string; mode: string }
export interface FeedbackFake {
  evaluator: FeedbackEvaluator;
  calls: Call[];
  /** 문항별 첫 선택 판정 동작. 호출 순번(0부터)도 받는다. */
  behavior: (questionId: string, callIndex: number) => Behavior;
  delay: () => Promise<void>;
}
export function feedbackFake(init: Partial<Pick<FeedbackFake, 'behavior' | 'delay'>> = {}): FeedbackFake {
  const calls: Call[] = []; const counts = new Map<string, number>();
  const fake: FeedbackFake = {
    calls, behavior: init.behavior ?? (() => 'SUPPORTED'), delay: init.delay ?? (async () => {}),
    evaluator: { async evaluate(s: FeedbackSession): Promise<FeedbackEvaluationCall> {
      const questionId = s.source.questionId;
      calls.push({ questionId, mode: s.evaluationMode ?? '' });
      await fake.delay();
      if (s.evaluationMode === 'END_EXPLANATION') {
        return { metadata, rawOutput: { firstChoice: '원문에서 판단 관계를 비교해 봐.', reselection: s.selections.length === 2 ? '다시 고른 답도 원문과 비교해 봐.' : null, answer: '정답은 원문의 판단 관계로 설명할 수 있어.' } };
      }
      const observation = s.observations.at(-1)!; const text = feedbackObservationText(observation);
      const studentEvidence = [{ observationId: observation.observationId, quote: text }];
      const sourceEvidence = [{ location: 'PASSAGE', quote: s.source.passage, mediaId: null, visualObservation: null }];
      if (s.evaluationMode === 'REPAIR') {
        return { metadata, rawOutput: { mode: 'REPAIR', boundary: 'NONE', reason: '교정 응답에서 관계 확인', reviewedResponse: studentEvidence[0],
          repairs: s.errors.map(e => ({ errorId: e.errorId, status: 'REPAIRED', studentEvidence })), newErrors: [],
          verificationComplete: true, rationaleSufficient: true, sufficiencyEvidence: studentEvidence } };
      }
      const index = counts.get(questionId) ?? 0; counts.set(questionId, index + 1);
      const behavior = fake.behavior(questionId, index);
      if (behavior === 'THROW') throw new Error('가짜 평가기 실패');
      const common = { mode: 'SELECTION', reason: '가짜 판정', studentEvidence, errorHypothesis: null, selectionMismatchQuestion: null };
      if (behavior === 'BOUNDARY') {
        return { metadata, rawOutput: { ...common, boundary: 'MISSING_SOURCE', reconstructability: 'UNKNOWN', reconstructedPath: [], rationaleImpliedVerdict: 'UNKNOWN',
          contentAssessment: 'UNKNOWN', insufficiencyKind: 'NONE', sourceEvidence: [], errors: [] } };
      }
      const reconstructed = { ...common, boundary: 'NONE', reconstructability: 'RECONSTRUCTABLE', reconstructedPath: [text], rationaleImpliedVerdict: s.choiceImpliedVerdict, sourceEvidence };
      if (behavior === 'MISMATCH') {
        // SUPPORTED이지만 근거가 가리키는 판정이 선택과 반대(선택-근거 불일치) → 교정 질문으로 가는 정상 경로
        return { metadata, rawOutput: { ...reconstructed, rationaleImpliedVerdict: s.choiceImpliedVerdict === 'VALID' ? 'INVALID' : 'VALID', errors: [],
          contentAssessment: 'SUPPORTED', insufficiencyKind: 'NONE', selectionMismatchQuestion: '고른 답과 네 근거가 같은 방향인지 다시 볼까?' } };
      }
      if (behavior === 'UNKNOWN_PATH') {
        // boundary는 NONE이지만 학생의 풀이를 재구성하지 못한 판정
        return { metadata, rawOutput: { ...common, boundary: 'NONE', reconstructability: 'UNKNOWN', reconstructedPath: [], rationaleImpliedVerdict: 'UNKNOWN',
          contentAssessment: 'UNKNOWN', insufficiencyKind: 'NONE', sourceEvidence, errors: [] } };
      }
      if (behavior === 'INSUFFICIENT_MISMATCH') {
        // 근거가 부족하면서 선택과 반대 방향을 가리킨다(정답이어도 범주 3)
        return { metadata, rawOutput: { ...reconstructed, rationaleImpliedVerdict: s.choiceImpliedVerdict === 'VALID' ? 'INVALID' : 'VALID', errors: [],
          contentAssessment: 'INSUFFICIENT', insufficiencyKind: 'MISSING_LINK', selectionMismatchQuestion: '고른 답과 네 근거가 같은 방향인지 다시 볼까?' } };
      }
      if (behavior === 'ERROR') {
        return { metadata, rawOutput: { ...reconstructed, contentAssessment: 'ERROR', insufficiencyKind: 'NONE',
          errors: [{ errorId: 'E1', errorType: 'CONTENT', description: '내용 오류', studentEvidence, sourceEvidence, basis: 'STATED', question: '그 부분을 원문에서 다시 찾아볼까?' }] } };
      }
      return { metadata, rawOutput: { ...reconstructed, errors: [], contentAssessment: behavior === 'INSUFFICIENT' ? 'INSUFFICIENT' : 'SUPPORTED',
        insufficiencyKind: behavior === 'INSUFFICIENT' ? 'MISSING_LINK' : 'NONE' } };
    } },
  };
  return fake;
}

export interface TransportFake { transport: FeedbackTransport; requests: any[]; delay: () => Promise<void>; fail: (index: number) => boolean }
export function transportFake(respond: (request: any, index: number) => unknown, init: Partial<Pick<TransportFake, 'delay' | 'fail'>> = {}): TransportFake {
  const requests: any[] = [];
  const fake: TransportFake = { requests, delay: init.delay ?? (async () => {}), fail: init.fail ?? (() => false),
    transport: { async create(request: any) {
      const index = requests.length; requests.push(request);
      await fake.delay();
      if (fake.fail(index)) throw new Error('가짜 transport 실패');
      return { status: 'completed', output_text: JSON.stringify(respond(request, index)), usage: { input_tokens: 1, output_tokens: 1 } };
    } } as FeedbackTransport };
  return fake;
}
const inputOf = (request: any) => JSON.parse(request.input[0].content[0].text) as any;
/** 사고 진단 transport: 요청의 caseId에 맞는 유효한 출력을 돌려준다. */
export const diagnosisFake = (init: Parameters<typeof transportFake>[1] = {}) => transportFake(request => ({
  caseId: inputOf(request).student.caseId, outcomeType: 'ERROR',
  steps: { S1_STEM: 'PASS', S2_CHOICE: 'PASS', S3_LOCATE: 'FAIL', S4_INTERPRET: 'NOT_OBSERVED', S5_JUDGE: 'NOT_OBSERVED' },
  firstFailedStep: 'S3_LOCATE', errors: [{ tag: 'MISREAD_FACT', step: 'S3_LOCATE', studentQuote: '인용' }], note: '메모', unjudgeableReason: null, guessed: false,
}), init);
/** 문단 판정 transport: 학생 발화 앞부분을 인용한 DIRECT를 돌려준다. */
export const judgeFake = (init: Parameters<typeof transportFake>[1] = {}) => transportFake(request => ({
  label: 'DIRECT', quotes: [inputOf(request).dialogue[0].text.slice(0, 3)], reason: '가짜 판정',
}), init);

export const summaryEvaluator: SimpleEvaluator = { async complete(input) {
  const output: SimpleOutput = { category: 'CAPTURED', reason: 'r', coreParts: [{ description: '핵심', sourceQuote: input.targetParagraph.text }], corePartsCovered: [true],
    errors: [], gaps: [], targetErrorResolved: null, targetGapReadings: null, targetGapsFilled: null, restatedSummary: '요약', action: 'PRAISE', message: '잘 잡았어',
    corePartSummaries: [], closingFeedback: null, coreSourceQuote: null };
  return { rawOutput: output, metadata: { provider: 'mock', model: 'mock', promptVersion: 'paragraph-simple-holistic-v4.2', durationMs: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0 } };
} };

export const bundleOf = (questionId: string) => loadDiagnosticBundle(questionId).source;
export const correctChoice = (questionId: string) => bundleOf(questionId).answerChoiceId;
export const wrongChoice = (questionId: string) => bundleOf(questionId).choices.find(c => c.choiceId !== correctChoice(questionId))!.choiceId;
export const provided = (choiceId: string) => ({ choiceId, rationale: { mode: 'PROVIDED', text: RATIONALE }, solveMs: 1000, rationaleMs: 2000, confidence: null });
export const omitted = (choiceId: string, confidence: 'SURE' | 'UNSURE' | 'ELIMINATION' = 'SURE', eliminationNote?: string) => ({ choiceId, rationale: { mode: 'OMITTED' }, solveMs: 1000, rationaleMs: null, confidence, ...(eliminationNote === undefined ? {} : { eliminationNote }) });
