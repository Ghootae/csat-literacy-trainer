import { readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ProblemDiagnosticEpisodeSchema,
  ProblemSolvingNextActionSchema,
  validateDiagnosticEpisodeAgainstGold,
} from './episode.js';

const fixtureDir = resolve(
  process.cwd(),
  'packages/pipeline/fixtures/experiments/problem-solving/episodes',
);

function fixture(name: string) {
  return JSON.parse(readFileSync(resolve(fixtureDir, name), 'utf8')) as unknown;
}

function questionGold() {
  const path = resolve(
    process.cwd(),
    'packages/pipeline/fixtures/experiments/problem-solving',
    'mrna-vaccine-lipid-nanoparticle-q19.json',
  );
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

describe('problem diagnostic episode', () => {
  it('재선택 문구가 전체 선지 재검사를 요구하면 거부한다', () => {
    expect(() => ProblemSolvingNextActionSchema.parse({
      type: 'REQUEST_RESELECTION',
      prompt: '이제 각 선지를 다시 검토한 뒤 선택해 주세요.',
    })).toThrow(/전체 선지 재검사/);
    expect(ProblemSolvingNextActionSchema.parse({
      type: 'REQUEST_RESELECTION',
      prompt: '방금 확인한 pH 관계를 반영해 다시 선택해 주세요.',
    }).type).toBe('REQUEST_RESELECTION');
  });

  it('모든 기대 에피소드 fixture가 계약을 통과한다', () => {
    const names = readdirSync(fixtureDir).filter((name) => name.endsWith('.json'));

    expect(names).toHaveLength(9);
    for (const name of names) {
      expect(() => ProblemDiagnosticEpisodeSchema.parse(fixture(name)), basename(name))
        .not.toThrow();
    }
  });

  it('모든 mRNA 기대 에피소드의 골드 참조가 승인 골드에 실제로 존재한다', () => {
    const names = readdirSync(fixtureDir).filter(
      (name) => name.startsWith('mrna-') && name.endsWith('.json'),
    );

    expect(names).toHaveLength(8);
    for (const name of names) {
      expect(
        () => validateDiagnosticEpisodeAgainstGold(fixture(name), questionGold()),
        basename(name),
      ).not.toThrow();
    }
  });

  it('②의 모호한 근거는 다른 개입을 요구하는 가설을 진단 질문으로 구별한다', () => {
    const episode = ProblemDiagnosticEpisodeSchema.parse(
      fixture('mrna-q19-c2-ambiguous-speed.json'),
    );
    const target = episode.turns[0]?.targetSnapshots.find(
      (item) => item.kind === 'SELECTED_CHOICE',
    );

    expect(target?.status).toBe('INSUFFICIENT');
    expect(new Set(target?.hypotheses.map((item) => item.interventionSignature)).size)
      .toBe(2);
    expect(episode.turns[0]?.nextAction.type).toBe('ASK_DIAGNOSTIC');
  });

  it('선택 오답과 놓친 정답의 충분성을 독립적으로 보존한다', () => {
    const episode = ProblemDiagnosticEpisodeSchema.parse(
      fixture('mrna-q19-dual-target-asymmetry.json'),
    );
    const snapshots = new Map(
      episode.turns[0]?.targetSnapshots.map((item) => [item.kind, item]),
    );

    expect(snapshots.get('SELECTED_CHOICE')?.status).toBe('INSUFFICIENT');
    expect(snapshots.get('MISSED_ANSWER')?.status).toBe('SUFFICIENT');
    expect(episode.turns[0]?.activeTarget).toBe('SELECTED_CHOICE');
  });

  it('정답 근거 오류 에피소드는 ANSWER_RATIONALE 타깃 하나만 사용한다', () => {
    const episode = ProblemDiagnosticEpisodeSchema.parse(
      fixture('mrna-q19-correct-choice-wrong-rationale.json'),
    );

    expect(episode.entryReason).toBe('CORRECT_RATIONALE_REVIEW');
    expect(episode.turns[0]?.targetSnapshots).toEqual([
      expect.objectContaining({ kind: 'ANSWER_RATIONALE', choiceId: 'C5' }),
    ]);
    expect(episode.turns[0]?.nextAction.type).toBe('ASK_CORRECTIVE');
  });

  it('같은 개입으로 다룰 수 있는 복수 가설은 추가 진단 없이 충분할 수 있다', () => {
    const episode = ProblemDiagnosticEpisodeSchema.parse(
      fixture('mrna-q19-dual-target-asymmetry.json'),
    );
    const target = episode.turns[0]?.targetSnapshots.find(
      (item) => item.kind === 'MISSED_ANSWER',
    );

    expect(target?.hypotheses).toHaveLength(2);
    expect(new Set(target?.hypotheses.map((item) => item.interventionSignature)).size)
      .toBe(1);
    expect(target?.sufficiency?.sufficient).toBe(true);
  });

  it('합리적인 ② 해석은 학생 오류가 아니라 문항 경계 설명으로 전환한다', () => {
    const episode = ProblemDiagnosticEpisodeSchema.parse(
      fixture('mrna-q19-c2-rational-challenge.json'),
    );
    const lastTurn = episode.turns.at(-1);
    const activeHypothesis = lastTurn?.targetSnapshots
      .find((item) => item.kind === 'SELECTED_CHOICE')
      ?.hypotheses.find((item) => item.plausibility === 'ACTIVE');

    expect(activeHypothesis?.kind).toBe('RATIONAL_CHALLENGE');
    expect(lastTurn?.nextAction).toEqual(expect.objectContaining({
      type: 'DIRECT_COACHING',
      coachingReason: 'ITEM_INTERPRETATION_BOUNDARY',
    }));
  });

  it('재선택만으로 놓친 정답의 내부 경로를 직접 진단했다고 저장하지 않는다', () => {
    const episode = ProblemDiagnosticEpisodeSchema.parse(
      fixture('mrna-q19-c4-completed.json'),
    );
    const missedAnswer = episode.turns.at(-1)?.targetSnapshots.find(
      (item) => item.kind === 'MISSED_ANSWER',
    );

    expect(missedAnswer?.status).toBe('NOT_DIRECTLY_DIAGNOSED');
    expect(episode.verificationEvents).toContainEqual(expect.objectContaining({
      target: 'MISSED_ANSWER',
      outcome: 'WEAKLY_SUPPORTS',
    }));
    expect(episode.result?.unresolvedTargets).toEqual(['MISSED_ANSWER']);
  });

  it('PCR Ct의 상위 표상 하나가 복수 판단을 함께 교정하는 비교 회귀를 보존한다', () => {
    const episode = ProblemDiagnosticEpisodeSchema.parse(
      fixture('pcr-ct-upper-representation-completed.json'),
    );

    expect(episode.turns[0]?.nextAction).toEqual(expect.objectContaining({
      type: 'ASK_CORRECTIVE',
      targetedHypothesisIds: ['H-S1'],
    }));
    expect(episode.result).toEqual(expect.objectContaining({
      finalChoiceId: 'C2',
      correct: true,
      transferCheckTags: expect.arrayContaining(['UPPER_REPRESENTATION_CORRECTION']),
    }));
  });

  it('충분성 네 조건 중 하나라도 거짓이면 sufficient가 참일 수 없다', () => {
    const raw = fixture('mrna-q19-c4-passage-representation.json') as Record<string, unknown>;
    const turns = raw['turns'] as Array<Record<string, unknown>>;
    const targets = turns[0]!['targetSnapshots'] as Array<Record<string, unknown>>;
    const sufficiency = targets[0]!['sufficiency'] as Record<string, unknown>;
    const dimension = sufficiency['safeInterventionAvailable'] as Record<string, unknown>;
    dimension['satisfied'] = false;

    expect(() => ProblemDiagnosticEpisodeSchema.parse(raw)).toThrow(/네 조건/);
  });

  it('불충분한 타깃이 교정 질문으로 건너뛰는 것을 거부한다', () => {
    const raw = fixture('mrna-q19-c2-ambiguous-speed.json') as Record<string, unknown>;
    const turns = raw['turns'] as Array<Record<string, unknown>>;
    turns[0]!['nextAction'] = {
      type: 'ASK_CORRECTIVE',
      target: 'SELECTED_CHOICE',
      question: '다시 생각해 보세요.',
      purpose: '성급한 교정',
      targetedHypothesisIds: ['H-S1'],
    };

    expect(() => ProblemDiagnosticEpisodeSchema.parse(raw)).toThrow(/충분한 타깃/);
  });

  it('충분한 타깃에 불필요한 진단 질문을 추가하는 것을 거부한다', () => {
    const raw = fixture('mrna-q19-c4-passage-representation.json') as Record<string, unknown>;
    const turns = raw['turns'] as Array<Record<string, unknown>>;
    turns[0]!['nextAction'] = {
      type: 'ASK_DIAGNOSTIC',
      target: 'SELECTED_CHOICE',
      question: '어느 쪽인가요?',
      purpose: '불필요한 추가 진단',
      distinguishesHypothesisIds: ['H-S1', 'H-S2'],
    };

    expect(() => ProblemDiagnosticEpisodeSchema.parse(raw)).toThrow(/불충분한 타깃/);
  });

  it('한 턴에 복수 행동을 배열로 저장하지 못하게 한다', () => {
    const raw = fixture('mrna-q19-c4-passage-representation.json') as Record<string, unknown>;
    const turns = raw['turns'] as Array<Record<string, unknown>>;
    turns[0]!['nextAction'] = [turns[0]!['nextAction'], turns[0]!['nextAction']];

    expect(() => ProblemDiagnosticEpisodeSchema.parse(raw)).toThrow();
  });

  it('학생 관찰에 모델 가설을 섞어 저장하지 못하게 한다', () => {
    const raw = fixture('mrna-q19-c4-passage-representation.json') as Record<string, unknown>;
    const observations = raw['observations'] as Array<Record<string, unknown>>;
    observations[0]!['hypotheses'] = [{ hypothesisId: 'H-LEAK' }];

    expect(() => ProblemDiagnosticEpisodeSchema.parse(raw)).toThrow();
  });
});
