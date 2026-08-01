/**
 * 자동 문단 수준 보존 질의 생성기 (Automatic Preservation-Query Generator).
 *
 * 입력은 원문 문장 + **안정화된 의미 그래프**(명제·source span·관계 간선)로 제한한다.
 * 특정 실행의 합성 노드(c5/c6/c7 등) 구조는 입력하지 않는다 — 질의는 합성 노드를 재현하는
 * 것이 아니라 문단의 의미 사실·관계를 평가 가능한 질의로 변환해야 한다.
 *
 * 이 모듈은 실험 경로 전용이다. 손 질의 오라클(fixtures/queries-corporate-law-p0.json)을
 * 입력이나 few-shot 예시로 절대 사용하지 않는다 — 재현성 실험의 데이터 누출 방지.
 */

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

import { MODEL, getClient, instrumented } from './client.js';

/**
 * 동결 버전 태그. 일반화 실험 동안 프롬프트·스키마를 고정한다 — 새 관계 유형에 대한
 * 순수 일반화를 관찰하기 위함. 개선안은 실험 후 별도 버전으로만 반영한다.
 */
export const GENERATOR_VERSION = 'v0';
export const EVAL_SCHEMA_VERSION = 'query-3axis-v1';

// ── 입력 타입 (안정화 골드에서 구성) ──

export interface GenSentence {
  readonly id: string;
  readonly text: string;
}
export interface GenProposition {
  readonly id: string;
  readonly text: string;
  readonly shortForm: string;
  readonly aspect: string;
  readonly subjectRole: string;
  readonly sourceSentences: readonly string[];
  readonly relation: { readonly from: string; readonly to: string; readonly kind: string };
}
export interface GenRelationEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly relation: string;
  readonly relationProperties: readonly string[];
  readonly contrastAxis: string | null;
  readonly kind: 'eval' | 'discourse';
}
export interface GeneratorInput {
  readonly paragraphId: string;
  readonly topic: string;
  readonly sentences: readonly GenSentence[];
  readonly propositions: readonly GenProposition[];
  readonly relationEdges: readonly GenRelationEdge[];
}

// ── 출력 스키마 ──

export const GeneratedQuerySchema = z.object({
  id: z.string().describe('영역 내 유일 식별자. 실행마다 달라도 무방.'),
  level: z.enum(['scope', 'relation', 'argument']).describe('scope=의미 영역 판별, relation=조직 관계 판별, argument=관계의 구체 대상·조건·결과 판별.'),
  question: z.string(),
  expectedAnswer: z.string(),
  sourceSentenceIds: z.array(z.string()).describe('이 질의가 근거하는 원문 문장 ID.'),
  propositionIds: z.array(z.string()).describe('앵커 명제 ID (하나 이상 필수 — relationEdge 앵커가 없으면).'),
  relationEdgeIds: z.array(z.string()).describe('앵커 관계 간선 ID (relation 질의는 가능하면 필수).'),
  criticalForRelation: z.boolean().describe('이 질의 보존이 영역의 관계 보존 인정에 필수인가.'),
  requiredForFullArgumentCoverage: z.boolean().describe('이 질의 보존이 완전 논항 커버리지 인정에 필수인가.'),
  acceptanceCriteria: z.array(z.string()).describe('학생 응답을 실제로 구분하는 판정 규칙. 추상 문구 금지.'),
  contradictionCriteria: z.array(z.string()).describe('어떤 응답이 이 질의를 모순시키는가. 없으면 빈 배열.'),
});

export const GeneratedRegionSchema = z.object({
  regionId: z.string(),
  label: z.string(),
  sourceSentenceIds: z.array(z.string()),
  propositionIds: z.array(z.string()).describe('영역이 관할하는 명제.'),
  relationEdgeIds: z.array(z.string()).describe('영역이 관할하는 관계 간선.'),
  queries: z.array(GeneratedQuerySchema),
});

export const GeneratedQuerySetSchema = z.object({
  paragraphId: z.string(),
  regions: z.array(GeneratedRegionSchema),
});

export type GeneratedQuery = z.infer<typeof GeneratedQuerySchema>;
export type GeneratedRegion = z.infer<typeof GeneratedRegionSchema>;
export type GeneratedQuerySet = z.infer<typeof GeneratedQuerySetSchema>;

const SYSTEM = `당신은 수능 국어 비문학 문단의 **정독 평가용 보존 질의**를 생성한다.
학생이 문단을 자유롭게 요약했을 때, 그 요약이 문단의 핵심 의미를 어느 수준까지 보존했는지
판정할 수 있는 질의를 만든다. 원문과 안정화된 의미 그래프(명제·source span·관계 간선)만 보고
생성하라.

# 원칙

A. **핵심 의미 구별을 평가하는 질의만.** 원문의 모든 사실을 질문으로 바꾸지 마라. 다음을 평가하는
   질의를 우선 생성한다: (1) 의미 영역을 찾았는가, (2) 하위 내용을 조직하는 핵심 관계를 보존했는가,
   (3) 관계의 필수 논항을 표현했는가, (4) 핵심 관계를 왜곡·반대 이해했는가.

B. **합성 노드가 아니라 의미 사실에 앵커링.** 각 질의는 원문 문장 span / proposition /
   relation·eval edge 중 하나 이상에 반드시 근거한다. 앵커 없는 일반 질문은 만들지 마라.

C. **scope·relation·argument 역할을 혼동하지 마라.** scope=어떤 의미 영역인지, relation=하위
   내용이 어떤 관계로 조직되는지, argument=관계를 이루는 구체 대상·조건·결과. 한 질의에 여러 층을
   과도하게 섞지 마라.

D. **관계 질의는 최소 충분하게.** 같은 관계를 표현만 바꿔 중복 질문하지 마라. 반대로 문단 이해에
   필수적인 관계(분류 기준, 대조, 역할 분리, 원인–결과, 조건–결과, 예외, 수단–목적, 주장–근거,
   과정 순서)는 누락하지 마라.

E. **논항을 지나치게 묶지 마라.** 서로 다른 정보는 별도 질의로 분리한다. 예: "실제 운용 주체가
   사람이라는 정보"와 "그 사람이 권한을 부여받아야 한다는 조건"은 다른 질의다.

F. **명명된 중간산물의 조건부 생략 허용.** 중간산물은 원문에서 명명되었다는 이유만으로 필수
   논항이 되지 않는다. 시작점·결과·관계 방향이 보존되고, 중간산물의 생략이 분기·조건·대조·
   인과 또는 순환의 성립 원리를 제거하지 않는다면 생략을 허용한다. 중간산물의 명칭은 생략할
   수 있지만, 그것이 핵심적인 기능을 수행한다면 그 기능적 역할은 보존되어야 한다.
   예: "이산화탄소로 포도당이 만들어지고 그 과정이 반복된다"는 3탄당 명칭을 생략했으나
   전체 흐름과 순환성을 모두 보존한다 → preserved. 만약 "3탄당의 분기·재생 역할"이 이 슬롯의
   핵심이라면 → partial (기능적 역할 누락).

G. **수용 기준은 판정 가능하게.** 실제 학생 응답을 구분할 수 있어야 한다.
   좋은 예: "법인과 사람을 서로 다른 역할의 주체로 배치하면 인정 / '분리'라는 단어는 불필요 /
   운용 주체를 특정 안 하면 미보존 / 법인이 직접 운용한다고 하면 모순".
   나쁜 예: "의미가 비슷하면 인정 / 충분히 잘 설명하면 인정".

# 구조

- 문단을 몇 개의 **의미 영역(region)**으로 나눈다.
- **각 영역은 반드시 scope 질의 하나를 포함한다** (level=scope): "이 영역은 무엇에 관한 것인가"를
  판별하는 질의. 학생이 관계를 못 짚고 화제어만 언급했을 때 '주제만 포착'을 판정하려면 모든 영역에
  scope 질의가 있어야 한다. scope 질의를 첫 영역에만 두지 마라.
- 그 위에 핵심 relation 질의 + 필요한 argument 질의를 둔다.
- criticalForRelation: 그 질의가 보존돼야 영역의 관계가 보존된 것으로 볼 핵심 질의(층위 무관 —
  역할 주체 구별 같은 논항도 핵심일 수 있다).
- requiredForFullArgumentCoverage: 완전한 논항 표현으로 인정하는 데 필요한 논항 질의.
- 관계 질의(level=relation)에는 가능하면 relationEdgeIds 앵커를 붙인다.

각 질의의 expectedAnswer는 원문 근거에 충실해야 한다.`;

export async function generateQuerySet(input: GeneratorInput): Promise<GeneratedQuerySet> {
  const sentenceBlock = input.sentences.map((s) => `[${s.id}] ${s.text}`).join('\n');
  const propBlock = input.propositions
    .map(
      (p) =>
        `[${p.id}] (${p.aspect}, 주체:${p.subjectRole}, 출처:${p.sourceSentences.join(',')}) ${p.text}\n` +
        `     관계: ${p.relation.from} —[${p.relation.kind}]→ ${p.relation.to}`,
    )
    .join('\n');
  const edgeBlock = input.relationEdges
    .map(
      (e) =>
        `[${e.id}] ${e.source} —[${e.relation}${e.relationProperties.length ? ':' + e.relationProperties.join(',') : ''}]→ ${e.target}` +
        `${e.contrastAxis ? ` (대조축: ${e.contrastAxis})` : ''} <${e.kind}>`,
    )
    .join('\n');

  const response = await instrumented('query-gen', 'high', input.paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: zodOutputFormat(GeneratedQuerySetSchema) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content:
            `문단 주제: ${input.topic}\n\n원문 문장:\n${sentenceBlock}\n\n` +
            `안정화 명제:\n${propBlock}\n\n관계 간선:\n${edgeBlock}\n\n` +
            `이 문단의 보존 질의 세트를 생성하라. paragraphId="${input.paragraphId}".`,
        },
      ],
    }),
  );

  const parsed = response.parsed_output;
  if (parsed === null) throw new Error('generateQuerySet: 구조화 출력 파싱 실패');
  return parsed;
}
