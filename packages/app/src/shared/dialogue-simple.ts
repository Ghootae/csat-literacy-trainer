/** 단순 형식 문단 개발자 모드(simple-holistic)의 서버-클라이언트 계약. */
export type SimpleMessageLabel = '나의 요약' | '다시 쓴 요약' | '나의 답' | '피드백' | '다시 써 보기' | '확인하기' | '생각해 보기' | '빠진 내용' | '바로잡기' | '문단 핵심';
/** `quote`: 말풍선 위에 작게 보일 학생 발화 인용. `parts`: 말풍선 안 옅은 배경 상자에 번호 목록으로 보일 부분별 문단 핵심. `items`: 말풍선 안 번호 목록(빈 곳 질문). */
export interface SimpleMessageView { role: 'student' | 'tutor'; text: string; label: SimpleMessageLabel; quote?: string; parts?: string[]; items?: string[]; copied?: true }
export type SimpleStage = 'INITIAL' | 'RETRY' | 'AFTER_CORRECTION' | 'AFTER_GAP';
/** 단계별 학생 말풍선 이름. 서버 기록과 클라이언트 대기 말풍선이 같이 쓴다. */
export const simpleStudentLabel: Record<SimpleStage, SimpleMessageLabel> =
  { INITIAL: '나의 요약', RETRY: '다시 쓴 요약', AFTER_CORRECTION: '나의 답', AFTER_GAP: '나의 답' };
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
    attemptNumber: number;
    attemptCount: number;
    /** 현재 시도 마지막 단계의 재구성 요약. 아직 판정이 없으면 null. */
    restatedSummary: string | null;
    /** 현재 시도에 학생 발화가 있고 평가 중이 아닐 때. */
    canStartNewAttempt: boolean;
    /** 현재 시도의 단계(state.stage). */
    stage: SimpleStage;
    /** REVEAL: 마무리 공개 표시. HINT: 교정 질문을 기다리는 동안 오류의 근거 문장 하나. 문단 텍스트 기준 위치. */
    highlights: SimpleHighlightView[];
    highlightKind: 'HINT' | 'REVEAL' | null;
    canRespond: boolean;
    evaluationStatus: 'IDLE' | 'PROCESSING' | 'RETRYABLE_ERROR';
    evaluationError: string | null;
  };
  allDone: boolean;
  /** 지문을 모두 마쳤고 연결 문제가 있을 때만. 문단 기록은 싣지 않는다. */
  problemUrl: string | null;
  /** 연결된 문제가 있으면 완료 여부와 무관하게 준다(개발 화면 파트 이동용). */
  problemQuestionId: string | null;
}

export interface SimpleNewAttemptRequest { paragraphIndex: number }
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
  /** 서버가 정한 원문 옮김 판정. INITIAL·RETRY만 값이 있고 그 밖은 null. */
  sourceCopyDetected: boolean | null;
  message: string;
  highlights: SimpleHighlightView[];
}
export interface SimpleAttemptInspection {
  attemptNumber: number;
  status: 'IN_PROGRESS' | 'DONE' | 'ABANDONED';
  state: { stage: string; retryUsed: boolean; questionsAsked: number; done: boolean; outcome: string | null };
  messages: SimpleMessageView[];
  steps: SimpleStepInspection[];
  memos: { attempt: string; steps: Record<number, string> };
}
export interface SimpleInspection {
  paragraphIndex: number;
  paragraphId: string;
  currentAttemptNumber: number;
  attempts: SimpleAttemptInspection[];
  memos: { paragraph: string };
}
/** attemptNumber=null,stepIndex=null 문단 인상 / n,null 시도 인상 / n,k 단계 인상. 옛 줄(attemptNumber 없음)은 null=문단, 숫자=시도 1의 단계로 읽는다. */
export interface SimpleMemoRecord {
  savedAt: string; sessionId: string; passageId: string; paragraphId: string; attemptNumber: number | null; stepIndex: number | null; text: string;
}
