import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildJudgeInput, unitsForParagraph } from '@csat/pipeline';
import { buildSet, OUT_PATH } from '../../../../../scripts/build-diagnostic-set.mjs';
import { DIAGNOSTIC_ROOT, loadAnalysisMaps, loadChoiceLinkTwists, loadDiagnosticBundle, loadDiagnosticPassages, loadDiagnosticSet } from './content.js';

const set = loadDiagnosticSet();
const cuts = JSON.parse(readFileSync('docs/experiments/sns-diagnostic-calibration-2026-11-06/grade-cuts.json', 'utf8'));

describe('세트 E 목록 파일', () => {
  it('생성 스크립트 결과와 같고, 4지문 16문항이 D-0201 순서·megastudySeq·문항 번호를 지킨다', () => {
    expect(JSON.parse(readFileSync(OUT_PATH, 'utf8'))).toEqual(buildSet());
    expect(set.passages.map(p => p.passageId)).toEqual(['consciousness-cognition', 'horse-race-reporting', 'plastic-polymerization', 'audio-perceptual-coding']);
    expect(set.passages.reduce((n, p) => n + p.questionIds.length, 0)).toBe(16); expect(Object.keys(set.items)).toHaveLength(16);
    for (const passage of set.passages) {
      expect(passage.questionIds.map(id => set.items[id]!.questionNumber)).toEqual(cuts.setEItems[String(passage.exam.megastudySeq)]);
      expect(passage.questionIds).toEqual([...passage.questionIds].sort((a, b) => set.items[a]!.questionNumber - set.items[b]!.questionNumber));
    }
    expect(set.referenceExam).toEqual({ megastudySeq: 349, label: '2026학년도 수능' });
  });
  it('문항 묶음 16개를 읽고 정답 위치가 목록 파일과 같으며, 공개 내용에는 정답 열쇠가 없다', () => {
    const reference = JSON.parse(readFileSync(resolve(DIAGNOSTIC_ROOT, 'runtime-reference.json'), 'utf8')).questions as { questionId: string; answerChoiceId: string }[];
    for (const [questionId, item] of Object.entries(set.items)) {
      const { source, content } = loadDiagnosticBundle(questionId);
      expect(source.choices.find(c => c.choiceId === source.answerChoiceId)!.position).toBe(item.answerPosition);
      expect(source.answerChoiceId).toBe(reference.find(r => r.questionId === questionId)!.answerChoiceId);
      expect(JSON.stringify(content)).not.toContain('answerChoiceId'); expect(JSON.stringify(content)).not.toContain('officialExplanation');
      for (let i = 0; i < 2; i++) expect(item.megastudy.choicePercents[i]![item.answerPosition - 1]).toBe(item.megastudy.correctRate[i]);
    }
  });
  it('이미지 문항의 로컬 이미지 파일 해시가 묶음의 contentHash와 같다(원격 URL은 본 서비스 mRNA 묶음과 같은 방식)', () => {
    for (const [questionId, file] of [['audio-perceptual-coding-q17', 'audio-perceptual-coding-q17-img_001.png'], ['horse-race-reporting-q7', 'horse-race-reporting-q7-img_001.png']] as const) {
      const { source } = loadDiagnosticBundle(questionId);
      expect(source.media).toHaveLength(1);
      expect(source.media[0]!.contentHash).toBe(`sha256:${createHash('sha256').update(readFileSync(resolve(DIAGNOSTIC_ROOT, 'media', file))).digest('hex')}`);
      expect(source.media[0]!.url).toMatch(/^https:\/\//u);
    }
  });
});

describe('요약 대화·문단 판정 자료', () => {
  it('요약 대화 지문 4개의 모든 문단이 분석 지도에 있고, 모든 단위의 판정 입력(입장 포함)을 만들 수 있다', () => {
    const passages = loadDiagnosticPassages();
    expect(passages.map(p => p.passageId).sort()).toEqual(set.passages.map(p => p.passageId).sort());
    let units = 0;
    for (const setPassage of set.passages) {
      const maps = loadAnalysisMaps(setPassage);
      for (const paragraph of passages.find(p => p.passageId === setPassage.passageId)!.paragraphs) {
        const owner = maps.find(m => m.map.propositions.some(x => x.paragraphId === paragraph.paragraphId));
        expect(owner, paragraph.paragraphId).toBeDefined();
        const found = unitsForParagraph(owner!.map, paragraph.paragraphId);
        const round = { dialogue: [{ role: 'student', text: '요약' }] };
        for (const unit of found.nodes) { buildJudgeInput(round, 'node', unit, owner!.stances); units++; }
        for (const unit of found.relations) { buildJudgeInput(round, 'relation', unit, owner!.stances); units++; }
      }
    }
    expect(units).toBeGreaterThan(100);
  });
  it('지도 파일이 동결본과 다르면 읽지 않는다', () => {
    expect(() => loadAnalysisMaps({ ...set.passages[0]!, analysisMaps: [{ ...set.passages[0]!.analysisMaps[0]!, mapSha256: '0'.repeat(64) }] })).toThrow('동결본');
  });
  it('선지 연결 동결본에서 함정 꼬리표를 코드로 꺼낸다', () => {
    const twists = loadChoiceLinkTwists(set.passages[0]!.choiceLinkPath);
    const all = [12, 13, 14, 15, 16].flatMap(n => [1, 2, 3, 4, 5].flatMap(c => twists(n, c)));
    expect(all.length).toBeGreaterThan(0); expect(all.every(t => /^[A-Z_]+$/u.test(t.twistType))).toBe(true);
    expect(twists(99, 1)).toEqual([]);
  });
});
