/**
 * 타이틀 질의 생성 — 문단의 **최상위 관계**를 평가할 질의 3개를 만든다.
 *
 * **기존 생성기(`query-gen.ts`)를 확장하지 않고 따로 둔다.** 두 가지 이유다:
 *
 *  1. 기존 프롬프트를 건드리면 `GENERATOR_VERSION`을 올려야 하고, 그러면 fixture를 다시 만들고
 *     회귀 3세트를 통째로 재야 한다(실측 약 $7, 40분). 타이틀 때문에 그럴 이유가 없다.
 *  2. **입력이 다르다.** 타이틀 질의는 슬롯 목록과 타이틀 노드가 핵심 입력인데, 기존 생성기는
 *     명제·관계 간선을 받는다.
 *
 * 출력은 `GeneratedQuerySet` 모양 그대로(영역 하나)라 `evaluateResponse`가 손대지 않고 돈다.
 *
 * 판정 구조는 손으로 쓴 오라클과 같다 (`fixtures/title-queries/*-hand.json`,
 * `docs/experiments/title-compression-2026-08-10.md`):
 *
 *   qT1  scope      과대추상 차단
 *   qT2  relation   최상위 관계        (critical) → 기본 성공 조건
 *   qT3  argument   조직 방식 판별                 → 보너스
 *
 * `qT3`가 이 생성기의 어려운 부분이다. **이 시스템에서 유일하게 의미가 아니라 조직(형식)을
 * 보는 판정**이므로, 생성기가 그 성격의 수용 기준을 쓸 수 있어야 한다.
 */

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

import { MODEL, getClient, instrumented } from './client.js';
import { GeneratedQuerySetSchema, type GeneratedQuerySet } from './query-gen.js';

/** 프롬프트를 고치면 올린다. 생성 fixture 경로에 들어가므로 기존 산출물이 덮이지 않는다. */
export const TITLE_GENERATOR_VERSION: string = 'v1';

export interface TitleGeneratorInput {
  readonly paragraphId: string;
  /** 골드 타이틀 노드의 `shortForm`. 정답이 아니라 **생성 근거**로만 쓴다. */
  readonly titleShortForm: string;
  readonly sentences: readonly { readonly id: string; readonly text: string }[];
  /** 코어 슬롯. 타이틀이 아울러야 할 대상이다. */
  readonly slots: readonly { readonly id: string; readonly shortForm: string }[];
}

const SYSTEM = `당신은 수능 국어 비문학 문단의 **타이틀 평가용 질의**를 만든다.

학생은 이미 문단의 코어 영역들을 각각 정리하고 교정받은 상태다. 그다음 단계로 "이 문단이
결국 무엇을 말하는가"를 한 문장으로 쓴다. 그 답을 판정할 질의 **정확히 3개**를 만든다.

# 만들 질의 3개 — id와 역할이 고정이다

[qT1] level=scope, criticalForRelation=false
  질문: 이 문단은 무엇에 관한 글인가?
  역할: **과대추상 차단.** "니체의 철학"처럼 문단 고유의 내용이 없는 답을 걸러낸다.
  수용 기준: 이 문단에서만 나올 수 있는 대상·개념을 지목하면 인정. 어느 문단에나 해당하는
             일반 화제만 제시하면 미보존.

[qT2] level=relation, criticalForRelation=**true**
  질문: 이 문단이 최종적으로 말하는 것은 무엇인가? (문단의 최상위 관계를 묻는다)
  역할: **기본 성공 조건.** 코어 슬롯들을 조직하는 하나의 중심 관계가 드러나는지 본다.
  수용 기준에 반드시 넣을 것:
    - "표현 형식은 묻지 않는다"고 명시한다. 문장이 몇 개든, 접속사를 쓰든 관계만 드러나면 인정.
    - 관계의 **양 항과 방향**을 적는다 (무엇과 무엇이 어떤 관계인가).
    - 한쪽 항만 있거나 방향이 없으면 미보존이라고 적는다.
  contradictionCriteria: 관계 방향을 뒤집은 진술을 구체적으로 적는다.

[qT3] level=argument, criticalForRelation=false, requiredForFullArgumentCoverage=true
  질문: 이 응답은 하위 내용을 하나의 상위 관계로 **압축**했는가, 아니면 **나열·연결**했는가?
  역할: **보너스.** 위계적 추상화를 해냈는지 본다.
  수용 기준에 반드시 넣을 것 (문구를 이 취지 그대로 쓴다):
    - "판정 대상은 내용의 정확성이 아니라 **조직 방식**이다. 내용이 모두 맞아도 조직이
      나열이면 미보존이다."
    - 하나의 중심 서술에 나머지가 수식·근거·수단으로 **종속**되면 인정.
    - 코어 슬롯 내용이 **대등하게 이어지면**(~이고, ~하며, 문장 병렬) 미보존.
    - 원문이나 슬롯 문장을 그대로 또는 거의 그대로 이어 붙였으면 미보존.
    - **길이는 기준이 아니다.** 길어도 중심 서술 하나에 종속되면 인정하고, 짧아도 병렬이면 미보존.

# 원칙

1. **골드 타이틀 문자열과의 유사도를 묻지 마라.** 학생이 자기 말로 쓴 타이틀도 통과해야 한다.
   골드 타이틀은 무엇이 최상위 관계인지 알려주는 근거일 뿐이다.

2. **qT2는 관계를, qT3는 조직을 본다. 섞지 마라.** 같은 응답이 qT2 보존 + qT3 미보존일 수
   있고(관계는 있으나 나열), 그것이 정상이다. qT2 수용 기준에 "압축했는가"를 넣지 마라.

3. **슬롯을 모두 언급하라고 요구하지 마라.** 타이틀은 슬롯을 다시 서술하는 것이 아니라
   슬롯들이 종속되는 상위 관계를 표현하는 것이다. "모든 슬롯이 등장해야 한다"는 기준은
   나열을 최적 전략으로 만든다.

4. **수용 기준은 판정 가능하게.** 실제 학생 응답을 구분할 수 있어야 한다. "잘 요약했는가"
   같은 추상적 문구는 금지.

5. 영역은 하나만 만든다: regionId="title", label="문단의 중심 관계".
   sourceSentenceIds는 문단 전체, propositionIds와 relationEdgeIds는 빈 배열로 둔다.`;

export async function generateTitleQuerySet(input: TitleGeneratorInput): Promise<GeneratedQuerySet> {
  const sentenceBlock = input.sentences.map((s) => `[${s.id}] ${s.text}`).join('\n');
  const slotBlock = input.slots.map((s) => `[${s.id}] ${s.shortForm}`).join('\n');

  const response = await instrumented('title-gen', 'high', input.paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: zodOutputFormat(GeneratedQuerySetSchema) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content:
            `문단 원문:\n${sentenceBlock}\n\n` +
            `코어 슬롯 (학생이 이미 정리·교정한 것):\n${slotBlock}\n\n` +
            `골드 타이틀 (무엇이 최상위 관계인지 알려주는 근거 — 유사도 비교 대상이 아니다):\n` +
            `${input.titleShortForm}`,
        },
      ],
    }),
  );

  const parsed = response.parsed_output;
  if (parsed === null) throw new Error('generateTitleQuerySet: 구조화 출력 파싱 실패');
  return { ...parsed, paragraphId: input.paragraphId };
}

/** 생성 결과가 약속한 구조인지 확인한다. 어긋나면 프롬프트가 안 먹은 것이므로 조용히 넘기지 않는다. */
export function validateTitleQuerySet(set: GeneratedQuerySet): string[] {
  const problems: string[] = [];
  if (set.regions.length !== 1) problems.push(`영역이 ${set.regions.length}개 (1개여야 함)`);
  const region = set.regions[0];
  if (region === undefined) return problems;

  const byId = new Map(region.queries.map((q) => [q.id, q]));
  for (const [id, level] of [
    ['qT1', 'scope'],
    ['qT2', 'relation'],
    ['qT3', 'argument'],
  ] as const) {
    const q = byId.get(id);
    if (q === undefined) {
      problems.push(`${id} 없음`);
      continue;
    }
    if (q.level !== level) problems.push(`${id} level=${q.level} (${level}이어야 함)`);
    if (q.acceptanceCriteria.length === 0) problems.push(`${id} 수용 기준 없음`);
  }
  if (byId.get('qT2')?.criticalForRelation !== true) problems.push('qT2가 critical이 아님');
  if (byId.get('qT3')?.criticalForRelation === true) problems.push('qT3가 critical임 (보너스여야 함)');
  return problems;
}
