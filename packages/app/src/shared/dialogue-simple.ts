/** 단순 형식 문단 개발자 모드(simple-holistic)의 서버-클라이언트 계약. */
export interface SimpleMessageView { role: 'student' | 'tutor'; text: string }
export interface SimpleHighlightView { start: number; end: number; text: string; location: 'PASSAGE' }

export interface SimpleDialogueView {
  sessionId: string;
  passageId: string;
  title: string;
  exam: string;
  currentIndex: number;
  paragraphs: { paragraphId: string; position: number; text: string; done: boolean }[];
  current: {
    index: number;
    messages: SimpleMessageView[];
    done: boolean;
    /** 마무리 행동에서만 채워진다(문단 텍스트 기준 위치). */
    highlights: SimpleHighlightView[];
    canRespond: boolean;
    evaluationStatus: 'IDLE' | 'PROCESSING' | 'RETRYABLE_ERROR';
    evaluationError: string | null;
  };
  allDone: boolean;
  /** 지문을 모두 마쳤고 연결 문제가 있을 때만. 문단 기록은 싣지 않는다. */
  problemUrl: string | null;
}

export interface SimpleRespondRequest { transitionId: string; paragraphIndex: number; text: string }

export interface SimpleStepInspection {
  stepIndex: number;
  stage: string;
  studentText: string;
  /** 모델 원출력(검증을 통과한 것). */
  output: unknown;
  expectedAction: string;
  action: string;
  validationFailures: { rawOutput: unknown; problems: string[] }[];
  call: { provider: string; model: string; promptVersion: string; durationMs: number; inputTokens: number; outputTokens: number; cachedTokens: number; attempts: number };
  message: string;
  highlights: SimpleHighlightView[];
}
export interface SimpleInspection {
  paragraphIndex: number;
  paragraphId: string;
  state: { stage: string; retryUsed: boolean; questionsAsked: number; done: boolean; outcome: string | null };
  steps: SimpleStepInspection[];
  memos: { paragraph: string; steps: Record<number, string> };
}
export interface SimpleMemoRecord {
  savedAt: string; sessionId: string; passageId: string; paragraphId: string; stepIndex: number | null; text: string;
}
