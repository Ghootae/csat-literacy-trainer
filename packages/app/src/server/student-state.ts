import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  StudentEvidenceEventSchema,
  aggregateStudentState,
  generatePeriodicFeedback,
  type StudentEvidenceEvent,
} from '@csat/pipeline';

export interface StudentEvidenceSink {
  save(events: readonly StudentEvidenceEvent[]): void;
}

export class JsonlStudentEvidenceStore implements StudentEvidenceSink {
  constructor(readonly path = resolve(
    process.env['CSAT_STUDENT_EVIDENCE_LOG'] ??
    resolve(process.cwd(), '.omc/logs/student-state/evidence.jsonl'),
  )) {}

  save(events: readonly StudentEvidenceEvent[]): void {
    if (events.length === 0) return;
    mkdirSync(dirname(this.path), { recursive: true });
    appendFileSync(this.path, `${events.map((event) => JSON.stringify(StudentEvidenceEventSchema.parse(event))).join('\n')}\n`, 'utf8');
  }

  list(studentId: string): StudentEvidenceEvent[] {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, 'utf8').split('\n').filter(Boolean)
      .map((line) => StudentEvidenceEventSchema.parse(JSON.parse(line)))
      .filter((event) => event.studentId === studentId);
  }

  report(studentId: string, generatedAt = new Date().toISOString(), context: StudentEvidenceEvent['context'] = 'STUDENT', windowDays = 30) {
    if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365) throw new Error('피드백 기간은 1~365일이어야 합니다.');
    const to = new Date(generatedAt);
    const from = new Date(to.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const requestedWindow = { from: from.toISOString(), to: to.toISOString() };
    const events = this.list(studentId).filter((event) => event.context === context && event.observedAt >= requestedWindow.from && event.observedAt <= requestedWindow.to);
    const profile = aggregateStudentState({ studentId, generatedAt, context, requestedWindow, events });
    return { profile, feedback: generatePeriodicFeedback(profile) };
  }
}
