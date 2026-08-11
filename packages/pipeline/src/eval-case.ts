/**
 * 관찰된 평가 사례 fixture.
 *
 * **실제 학습 세션에서 나온 판정을 그대로 얼려 둔 것이다.** 채점은 LLM 호출 1회에 걸려 있어
 * 프롬프트를 고치면 무엇이 따라 움직이는지 눈으로 볼 수 없다. 그래서 사례를 둘로 나눠 쓴다:
 *
 *   recordedVerdicts     그날 LLM이 낸 원시 판정. 결정적 회귀가 이걸 먹고 화면 결과를 고정한다
 *                        (API 키·비용 없음). 프롬프트를 고쳐도 이 값은 변하지 않는다.
 *   targetRegionVerdicts 프롬프트를 고친 뒤 **LLM이 내야 하는** 판정. 실호출 확인용.
 *
 * 둘을 한 파일에 두는 이유는 대조군 때문이다. 모순 조건을 좁히는 변경은 좁히려던 사례만
 * 움직이고 나머지는 그대로여야 하는데, 기준선과 목표가 떨어져 있으면 그 비교가 성립하지 않는다.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import type { QueryEval } from './llm/query-eval.js';
import type { RegionSemanticVerdict } from './query-normalize.js';

export interface EvalCaseProbe {
  readonly id: string;
  readonly label: string;
  /** 학생이 실제로 낸 응답. 섹션을 개행으로 이은 것 — 서버가 채점기에 넘기는 그 형태다. */
  readonly response: string;
  /**
   * 손으로 지은 가드 프로브. **관찰 기록이 없다** — 그래서 얼려 둘 판정도 없고, 결정적 회귀는
   * 이걸 건너뛴다. 완화가 과했는지 재려면 "이건 계속 모순이어야 한다"는 대조가 필요한데,
   * 그런 응답이 실제 세션에 마침 있으리라는 보장이 없어서 지어낸 것을 따로 표시한다.
   */
  readonly synthetic?: boolean;
  readonly recordedVerdicts?: QueryEval['verdicts'];
  readonly recordedRegionVerdicts?: Readonly<Record<string, RegionSemanticVerdict>>;
  readonly targetRegionVerdicts: Readonly<Record<string, RegionSemanticVerdict>>;
  /**
   * 질의별 목표 상태. **영역 판정만으로는 안 보이는 축**을 지킬 때 쓴다 — 타이틀의 보상은
   * `qT3` 하나로 갈리는데 영역 판정은 둘 다 `relation_preserved`라 구별되지 않는다.
   */
  readonly targetQueryStates?: Readonly<Record<string, string>>;
  /**
   * 목표는 적어 두되 **현재 필수 조건이 아닌** 프로브. 판정이 재현되지 않아 defer한 축을
   * 지운 대신 이렇게 남긴다 — 지우면 무엇을 미뤘는지가 사라지고, 필수로 두면 회귀가 늘
   * 빨갛다. 실호출은 결과를 보여주되 실패로 세지 않는다.
   */
  readonly deferred?: boolean;
  readonly deferReason?: string;
  readonly targetNote: string;
}

/** 얼려 둔 판정이 있는 프로브 — 결정적 회귀가 재생할 수 있는 것만. */
export interface RecordedProbe extends EvalCaseProbe {
  readonly recordedVerdicts: QueryEval['verdicts'];
  readonly recordedRegionVerdicts: Readonly<Record<string, RegionSemanticVerdict>>;
}

export function isRecorded(p: EvalCaseProbe): p is RecordedProbe {
  return p.recordedVerdicts !== undefined && p.recordedRegionVerdicts !== undefined;
}

export interface EvalCase {
  readonly caseId: string;
  readonly paragraphId: string;
  readonly observedAt: string;
  readonly source: string;
  readonly note: string;
  readonly focalRegionId: string;
  /**
   * 어느 질의셋으로 채점하는가. 기본은 영역 질의(`queries.json`).
   *
   * 타이틀 단계는 **같은 파이프라인을 다른 질의셋으로** 돈다(`title-queries.json`, 영역 하나).
   * 그래서 사례가 파일 이름만 알면 되고, 재생·실호출 경로는 그대로 쓴다.
   */
  readonly querySet?: 'region' | 'title';
  readonly probes: readonly EvalCaseProbe[];
}

/** 사례가 채점에 쓸 질의 파일. */
export function queryFileOf(c: EvalCase): string {
  return c.querySet === 'title' ? 'title-queries.json' : 'queries.json';
}

const DIR = resolve(process.cwd(), 'packages/pipeline/fixtures/eval-cases');

export function loadEvalCase(caseId: string): EvalCase {
  return JSON.parse(readFileSync(resolve(DIR, `${caseId}.json`), 'utf8')) as EvalCase;
}

/**
 * 디렉터리에 있는 사례 전부. **회귀가 파일 목록을 손으로 들고 있지 않게 한다** — 사례를
 * 추가하고 테스트에 등록하는 것을 잊으면, 얼려 둔 기준선이 아무것도 지키지 않는다.
 */
export function listEvalCases(): EvalCase[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => loadEvalCase(f.replace(/\.json$/, '')));
}

/** 얼려 둔 판정을 `assembleResponse`에 넣을 수 있는 모양으로. */
export function recordedEval(probe: RecordedProbe): QueryEval {
  return { verdicts: probe.recordedVerdicts };
}
