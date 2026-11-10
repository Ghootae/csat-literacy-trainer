/**
 * SNS 진단평가 참가자 저장(D-0205 4). 참가자마다 파일 하나에 상태를 통째로 쓰고, 사건은 한 줄씩 덧붙인다.
 * 파일시스템 접근은 이 파일 안에 둔다.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FeedbackRationale, FeedbackSession } from '@csat/pipeline';
import type { FeedbackMessage } from '../../shared/problem-feedback.js';

export type JobStatus = 'NONE' | 'PENDING' | 'READY' | 'FAILED';
/** 근거를 생략한 응답의 확신 구분. 옛 파일에는 없을 수 있다(없으면 SURE로 본다). */
export type AnswerConfidence = 'SURE' | 'UNSURE';
export interface ItemAnswer { choiceId: string; rationale: FeedbackRationale; solveMs: number; rationaleMs: number | null; confidence?: AnswerConfidence | null }
export interface DiagnosticParticipant {
  schemaVersion: 'sns-diagnostic-participant-v1';
  participantId: string;
  setId: 'set-e';
  createdAt: string;
  passages: Record<string, {
    status: 'NOT_STARTED' | 'SUMMARY' | 'ANSWERING' | 'AWAITING_JUDGMENT' | 'FEEDBACK' | 'DONE';
    summaryChosen: boolean | null;
    summarySessionId: string | null;
    /** paragraphId → 첫 시도의 첫 학생 발화 */
    firstTurns: Record<string, { text: string; at: string; copyOverlap?: { n: 5; windows: number; matched: number; ratio: number } | null } | null>;
    /** 옛 파일 호환용. 학생 흐름은 쓰지 않는다(D-0218, 순서 강제 커서 폐지). */
    feedbackCursor?: number;
    /** 결과를 공개한 문항 id(D-0218). 옛 파일에는 없다(없으면 빈 목록). */
    revealed?: string[];
    /** 개발자 이동(D-0217)으로 요약을 건너뛴 지문. 옛 파일에는 없다(없으면 건너뛰지 않은 것). */
    devSkipped?: { summary: boolean };
  }>;
  items: Record<string, {
    /** answers-done 전 임시 답 */
    draft: (ItemAnswer & { savedAt: string }) | null;
    first: (ItemAnswer & { submittedAt: string }) | null;
    session: FeedbackSession | null;
    transcript: FeedbackMessage[];
    firstJudgment: { status: JobStatus; attempts: number; contentAssessment: string | null; boundary: string | null; reconstructability?: string | null; consistency?: string | null };
    thoughtDiagnosis: { status: JobStatus; output: unknown | null };
    reviewFlag: 'WRONG_SUPPORTED' | 'BOUNDARY' | null;
    /** 개발자 이동(D-0217)으로 답 없이 지나친 문항. 옛 파일에는 없다(없으면 false). */
    skipped?: boolean;
  }>;
  /** paragraphId 단위. judgments는 단위(노드·관계) id별 결과 */
  analysis: Record<string, { status: JobStatus; judgments: Record<string, unknown> }>;
}

export interface DiagnosticEvent { type: string; participantId: string; at?: string; [key: string]: unknown }
export interface DiagnosticStore {
  load(participantId: string): DiagnosticParticipant | null;
  save(participant: DiagnosticParticipant): void;
  appendEvent(event: DiagnosticEvent): void;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
export const isParticipantId = (id: string) => UUID.test(id);
const DEFAULT_ROOT = 'sessions/diagnostic';
/** 진단 저장 폴더. 참가자 파일과 요약 대화 기록이 모두 이 아래에 놓인다. */
export const diagnosticRoot = (): string => resolve(process.env['CSAT_DIAGNOSTIC_ROOT'] ?? resolve(process.cwd(), DEFAULT_ROOT));

export class FileDiagnosticStore implements DiagnosticStore {
  private readonly root: string;
  constructor(root: string = diagnosticRoot()) { this.root = resolve(root); }
  private path(participantId: string): string {
    if (!isParticipantId(participantId)) throw new Error('참가자 ID 형식이 올바르지 않습니다.');
    return resolve(this.root, `${participantId}.json`);
  }
  load(participantId: string): DiagnosticParticipant | null {
    const path = this.path(participantId);
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as DiagnosticParticipant : null;
  }
  /** 임시 파일에 쓴 뒤 rename으로 바꾼다. */
  save(participant: DiagnosticParticipant): void {
    const path = this.path(participant.participantId);
    mkdirSync(this.root, { recursive: true });
    const temporary = `${path}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify(participant, null, 2) + '\n', 'utf8');
    renameSync(temporary, path);
  }
  appendEvent(event: DiagnosticEvent): void {
    if (!isParticipantId(event.participantId)) throw new Error('참가자 ID 형식이 올바르지 않습니다.');
    mkdirSync(this.root, { recursive: true });
    appendFileSync(resolve(this.root, 'events.jsonl'), JSON.stringify({ ...event, at: event.at ?? new Date().toISOString() }) + '\n', 'utf8');
  }
}
