/**
 * SNS 진단평가 세트 E 읽기(D-0205 3). 본 서비스 읽기 함수(`../content.ts`)는 고치지 않고 루트만 달리해 재사용한다.
 * 파일시스템 접근은 이 파일 안에 둔다.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod/v4';
import { loadStanceLabels, type AnalysisMap, type SourceDirectProblemBundle } from '@csat/pipeline';
import { loadBundleFromRoot, loadDialoguePassages, type DialoguePassageContent } from '../content.js';
import type { ProblemContentView } from '../../shared/contract.js';

export const DIAGNOSTIC_ROOT = resolve(process.cwd(), 'packages/pipeline/fixtures/experiments/sns-diagnostic');
const SET_PATH = resolve(DIAGNOSTIC_ROOT, 'diagnostic-set-e.json');
const REFERENCE_PATH = resolve(DIAGNOSTIC_ROOT, 'runtime-reference.json');

const PercentPair = z.tuple([z.number(), z.number()]);
export const DiagnosticSetSchema = z.object({
  schemaVersion: z.literal('sns-diagnostic-set-v1'),
  setId: z.literal('set-e'),
  referenceExam: z.object({ megastudySeq: z.number().int(), label: z.string() }).strict(),
  passages: z.array(z.object({
    passageId: z.string(),
    questionIds: z.array(z.string()).min(1),
    exam: z.object({ label: z.string(), megastudySeq: z.number().int() }).strict(),
    analysisMaps: z.array(z.object({ mapPath: z.string(), stancePath: z.string(), mapSha256: z.string() }).strict()).min(1),
    choiceLinkPath: z.string(),
  }).strict()).min(1),
  items: z.record(z.string(), z.object({
    passageId: z.string(), questionNumber: z.number().int(), answerPosition: z.number().int().min(1).max(5),
    megastudy: z.object({ correctRate: PercentPair, choicePercents: z.tuple([z.array(z.number()).length(5), z.array(z.number()).length(5)]),
      subjects: z.array(z.string()), source: z.string() }).strict(),
  }).strict()),
}).strict();
export type DiagnosticSet = z.infer<typeof DiagnosticSetSchema>;
export type DiagnosticSetPassage = DiagnosticSet['passages'][number];

export function loadDiagnosticSet(): DiagnosticSet {
  return DiagnosticSetSchema.parse(JSON.parse(readFileSync(SET_PATH, 'utf8')));
}
/**
 * 세트 E 이미지 문항(경마식 보도 q7·오디오 q17)의 media.contentHash는 접두 없는 sha256 16진수로 저장돼 있고(로컬 이미지 파일의 해시와 같다),
 * 묶음 스키마는 `sha256:` 접두를 요구한다. 동결 파일은 고치지 않고 읽을 때만 접두를 붙인다.
 */
function withSha256Prefix(content: ProblemContentView): void {
  for (const media of content.media) {
    if (media.contentHash !== undefined && /^[a-f0-9]{64}$/u.test(media.contentHash)) (media as { contentHash?: string }).contentHash = `sha256:${media.contentHash}`;
  }
}
export function loadDiagnosticBundle(questionId: string): { readonly content: ProblemContentView; readonly source: SourceDirectProblemBundle } {
  return loadBundleFromRoot(DIAGNOSTIC_ROOT, REFERENCE_PATH, questionId, withSha256Prefix);
}
export function loadDiagnosticPassages(): readonly DialoguePassageContent[] {
  return loadDialoguePassages(resolve(DIAGNOSTIC_ROOT, 'passages'));
}

export interface LoadedAnalysisMap { readonly map: AnalysisMap; readonly stances: Map<string, string> }
/** 지도 파일의 sha256이 세트 목록 파일과 같을 때만 읽는다. */
export function loadAnalysisMaps(passage: DiagnosticSetPassage): LoadedAnalysisMap[] {
  return passage.analysisMaps.map(entry => {
    const bytes = readFileSync(resolve(process.cwd(), entry.mapPath));
    if (createHash('sha256').update(bytes).digest('hex') !== entry.mapSha256) throw new Error(`분석 지도가 동결본과 다릅니다: ${entry.mapPath}`);
    const map = JSON.parse(bytes.toString('utf8')) as AnalysisMap;
    return { map, stances: loadStanceLabels(resolve(process.cwd(), entry.stancePath), map) };
  });
}

export interface ChoiceLinkTwist { readonly twistType: string; readonly twistDetail: string }
interface ChoiceLinkFile { questions: { number: number; choices: { number: number; parts: { twisted: boolean; twistType: string | null; twistDetail: string }[] }[] }[] }
/** 선지 연결 동결본에서 그 문항·그 선지의 `twisted: true` 부분의 꼬리표를 모은다. 결과 자료에만 쓴다(판정 입력 아님). */
export function loadChoiceLinkTwists(choiceLinkPath: string): (questionNumber: number, choicePosition: number) => ChoiceLinkTwist[] {
  const file = JSON.parse(readFileSync(resolve(process.cwd(), choiceLinkPath), 'utf8')) as ChoiceLinkFile;
  return (questionNumber, choicePosition) => (file.questions.find(q => q.number === questionNumber)?.choices.find(c => c.number === choicePosition)?.parts ?? [])
    .filter(part => part.twisted && part.twistType !== null)
    .map(part => ({ twistType: part.twistType!, twistDetail: part.twistDetail }));
}
