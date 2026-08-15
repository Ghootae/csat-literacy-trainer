import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

import type { SourceBundle } from './candidate-qualification.js';
import { MODEL, getClient, instrumented } from './llm/client.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import { ProbeCandidateSchema } from './regression-probe-qualification.js';

export const PROBE_GENERATOR_VERSION = 'regression-probe-generator-v1-no-expected-verdict';
export const GeneratedProbeCandidatesSchema = z.object({
  schemaVersion: z.literal('regression-probe-candidates-v1'),
  probes: z.array(ProbeCandidateSchema).min(1),
});

export function probeGeneratorModelInput(bundle: SourceBundle, querySet: GeneratedQuerySet, count: number) {
  return {
    primaryTextSegments: bundle.segments.map(({ sourceSegmentId, text }) => ({ sourceSegmentId, text })),
    regions: querySet.regions,
    requestedProbeCount: count,
  };
}

const SYSTEM = `당신은 보존 질의 회귀용 학생 응답 probe 후보 생성기다.
원문과 query 계약을 이용해 서로 독립적인 학생 응답을 만든다. 최종 verdict나 expected label은 절대 생성하지 않는다.
각 probe는 하나의 focal region을 겨냥하고 mutationSpec에 목표 query, 실제 보존·누락·모순 요소를 기록한다.
관계 완전 보존, 화제만 남김, 필수 관계/조건/논항 누락, 명시적 관계 전도를 고르게 포함한다.
응답은 학생이 실제로 쓸 수 있는 자연스러운 한국어 문장이어야 하며 query 질문 문구를 답에 포함하지 않는다.
mutation은 응답에 실제로 구현된 것만 기록하고, 서로 다른 probe가 같은 의미 변형을 반복하지 않게 한다.`;

export async function generateProbeCandidates(args: {
  paragraphId: string; bundle: SourceBundle; querySet: GeneratedQuerySet; count: number;
}) {
  const input = probeGeneratorModelInput(args.bundle, args.querySet, args.count);
  const response = await instrumented('regression-probe-generate', 'medium', args.paragraphId, () => getClient().messages.parse({
    model: MODEL, max_tokens: 10000, thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: zodOutputFormat(GeneratedProbeCandidatesSchema) },
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(input) }],
  }));
  if (response.parsed_output === null) throw new Error('regression probe generator 구조화 출력 파싱 실패');
  if (response.parsed_output.probes.length !== args.count) throw new Error(`probe 수 불일치: ${response.parsed_output.probes.length}/${args.count}`);
  const regionIds = new Set(args.querySet.regions.map((region) => region.regionId));
  const queryIds = new Set(args.querySet.regions.flatMap((region) => region.queries.map((query) => query.id)));
  if (new Set(response.parsed_output.probes.map((probe) => probe.id)).size !== args.count) throw new Error('probe ID 중복');
  for (const probe of response.parsed_output.probes) {
    if (probe.focal === undefined || !regionIds.has(probe.focal)) throw new Error(`${probe.id}: focal region 없음`);
    if (probe.mutationSpec.targetQueryIds.some((id) => !queryIds.has(id))) throw new Error(`${probe.id}: target query ID 없음`);
  }
  return response.parsed_output;
}
