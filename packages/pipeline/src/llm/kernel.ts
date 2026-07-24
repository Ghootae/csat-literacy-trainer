/**
 * ablation 커널 — 골드 생성의 세 원시 연산.
 *
 *   decompose   문단 → 최소 의미 명제
 *   compose     명제 → 위계 (primary 지정 + secondary 간선)
 *   regenerate  상위 노드 - 자식 하나 → 재구성된 상위 의미
 *
 * `regenerate`가 ablation 가중치의 분자다: 자식 v를 뺀 부모를 재생성하고 원본과의
 * 의미 거리를 재면 그것이 w(v)다. 이 세 연산만 있으면 K2(가중치 타당성 측정)를
 * 실행할 수 있다 — 파이프라인 전체를 기다릴 필요가 없다.
 */

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { validateCompleteness } from '../normalize.js';
import { MODEL, getClient, instrumented } from './client.js';
import {
  ComposeSchema,
  type Composed,
  DecomposeSchema,
  type Decomposed,
  type LinkVerdicts,
  LinkVerificationSchema,
  RegenerateSchema,
  SlotCoreSchema,
  type SlotCores,
} from './schemas.js';

const DECOMPOSE_SYSTEM = `당신은 수능 국어 비문학 지문을 분석한다.

먼저 문단을 문장으로 나누어 S1, S2 … 로 번호를 매긴다. 그다음 **최소 의미 명제**로
분해한다. 최소 명제란 더 쪼개면 의미가 성립하지 않는 단위이며, 각각이 하나의 관계
(시작 개념 → 끝 개념)를 담는다.

# 분해 원칙

- 한 문장이 조건절이나 관계절을 품고 있으면 여러 명제로 쪼갠다. 수능 논설문의 한 문장은
  보통 2~3개의 명제를 담는다.
- 분류 명제는 **기준을 시작 개념에 포함**한다. "법인은 재단과 사단으로 나뉜다"가 아니라
  "법인격 부여 대상이 재산이면 재단 법인이다" — 기준이 빠지면 문단에서 가장 변별력 있는
  내용이 사라진다.
- 조건부 매핑(A면 X, B면 Y, C면 Z)은 각 쌍을 별도 명제로 만든다.
- 문단에 없는 내용을 추론해 넣지 않는다. 상식으로 빈칸을 메우지 않는다.

# 명제를 층위로 정규화하라

명제를 원문 표현 그대로 두면, 독립시켰을 때 원문에 없는 함의가 생긴다. 특히 **법적 귀속과
실제 실행**이 섞이면 뒤 문장과 모순되는 것처럼 읽힌다.

나쁜 예: "법인은 자신의 이름으로 자산을 운용할 수 있다."
  → 독립시키면 "법인이 직접 행위한다"로 읽혀, 뒤의 "실제 운용은 사람이 한다"와 충돌한다.
좋은 예: "법인은 자산 운용에 관한 권리와 의무가 귀속되는 법적 주체이다."
  → 귀속 층위로 한정되어 실행 층위 진술과 공존한다.

각 명제에 다음을 채운다:
- predicate: 술어의 의미 식별자.
- argument: 같은 술어를 공유하는 명제들을 구분하는 인자. 없으면 빈 문자열.
- aspect: 설명 층위 (legal_attribution, actual_execution, definition, classification, …)
- subjectRole: 주체의 역할 (legal_principal, authorized_actor, …)
- sourceSentences: 근거 문장 번호
- standaloneSlotValue: 이 명제가 **독립된 학습 슬롯**으로서 가치가 있는가. 학생이 한 번의
  수정 행동으로 복원할 만한 사고 단위면 true. 도입·배경·용어 정의처럼 인접 핵심 내용에
  딸려가는 것이 자연스러우면 false.

# predicate 규칙 — 역할은 나누고, 대상은 나누지 마라

**같은 대상의 서로 다른 역할**은 서로 다른 술어다:
  asset_management_legal_subject (귀속) vs asset_management_execution (실행)

**같은 규칙이 대상만 달리 적용되는 조건부 매핑 집합**은 하나의 술어를 공유하고, 대상은
argument로만 구분한다:
  연속수치→평균 / 순위값→중앙값 / 문자값→최빈값
  → 셋 다 predicate="imputation_choice", argument는 각각 continuous / ordinal / categorical

술어를 대상별로 쪼개면(imputation_choice_ordinal 등) 학생이 대상을 뒤바꿔 써도 "서로 다른
술어의 각각 미충족"이 되어 **관계 오류로 잡히지 않는다.** 술어를 공유해야 같은 규칙 위의
대상 오배정으로 드러난다.

# "다만"을 자동으로 예외로 읽지 마라

'다만', '그러나', '단' 같은 접속 표현은 최소 세 기능을 갖는다: 앞 명제의 적용 범위를
좁히는 예외 / 조건을 더하는 제한 / **다른 층위나 측면을 보충하는 전환**.

exceptions에 적으려면 앞뒤 문장이 다음 넷을 **모두** 공유해야 한다:
  1. 동일한 대상   2. 동일한 주체 역할   3. 동일한 술어 의미   4. 동일한 설명 층위
그리고 뒤 문장이 앞 명제의 **진리 적용 범위를 실제로 축소**해야 한다.

대상은 같지만 주체 역할이나 설명 층위가 다르면 예외가 아니다. 이때는 exceptions를 비우고
links에 관계를 적는다 — role_separation, implements, realization_method, aspect_shift 중
맞는 것을 고르고, rationale에 **왜 예외가 아닌지**를 쓴다.

예: "법인은 …법적 주체이다"(legal_attribution / legal_principal)와
    "실제 운용은 권한자가 수행한다"(actual_execution / authorized_actor)는
    주체 역할과 층위가 달라 예외가 아니라 role_separation 관계다.`;

const COMPOSE_SYSTEM = `당신은 수능 국어 비문학 지문의 의미 위계를 구성한다.

주어진 최소 명제들을 합성해 **문단의 타이틀(최상위 의미)까지 올라가는 위계**를 만들어라.

구조:
- 각 노드는 **primary 부모를 정확히 하나** 갖는다. childIds로 그 관계를 표현한다.
- 위계의 루트가 타이틀이며, 문단 전체의 핵심을 한 문장으로 담는다.
- 중간 합성 노드는 2~5개의 자식을 아우른다. 자식이 하나뿐인 합성 노드는 만들지 않는다.

primary 부모 지정:
- 그 노드가 **가장 크게 기여하는** 상위 개념을 primary로 정한다. 분류상 자명한 소속이
  아니라, 그 노드를 지웠을 때 어느 상위 노드가 더 크게 훼손되는지를 기준으로 판단하라.

shortForm:
- 하위 명제의 층위를 흐리지 마라. "자산 소유 권능"처럼 뭉뚱그리면 그 안의 '법적 주체성'이
  약해진다. "자산 운용의 법적 주체성과 소유권 귀속"처럼 구체적으로 쓴다.

각 합성 노드에 두 판단을 함께 낸다 (구조 정리는 코드가 하므로, 사실만 정확히 답하라):
- introducesRelation: 이 노드가 자식들을 넘어서는 **새 관계**(인과·조건·대조·목적·절차)를
  도입하는가. 자식을 다시 묶어 말하는 병렬 묶음·열거에 불과하면 false.
- subsumedByParent: 상위 노드가 이미 이 노드의 일반화 의미를 포함하는가. 루트는 false.

secondary 간선 — **개수를 목표로 삼지 마라. 0개가 정답인 문단이 많다.**

만들기 전에 **반사실 검사**를 하라: 이 간선을 삭제했을 때 판정이 달라지는 **구체적인 학생
문장**을 쓸 수 있는가? 그 문장을 witness에 그대로 적는다. 못 쓰면 만들지 마라 — "설명 흐름상
연결된다"는 이유로는 부족하다.

추가 조건:
  1. 두 노드가 서로 **다른 primary 가지**에 있다.
  2. primary 경로의 **단순 단축이 아니다.** (p10이 이미 p10→c4→c7이라면 p10⇢c7은 금지)
  3. 양 끝이 각각 다른 상위 노드에 덮여 있다면, 누락은 그 노드들에서 이미 잡힌다 —
     이 경우 **모순 오판을 막는 관계**가 아닌 한 만들지 마라.

가장 가치 있는 secondary는 **역할 분리** 관계다. "법인이 자산 운용의 법적 주체"와 "실제
운용은 권한자가 수행"은 모순이 아니라 법적 귀속과 실제 실행의 역할 분리이며, 이 관계가
없으면 두 사실을 함께 쓴 정확한 요약이 모순으로 오판된다. witness는 그런 문장이다.

역방향으로 같은 사실을 두 번 적지 마라. "p6 →role_separation→ p9"와
"p9 →realization_method→ p6"은 하나의 사실이므로 한 번만 적는다.

모든 입력 명제는 정확히 하나의 primary 부모를 가져야 하며, 빠뜨리면 안 된다.`;

const REGENERATE_SYSTEM = `당신은 의미 위계의 한 노드를 재구성한다.

어떤 상위 노드가 여러 하위 요소를 아울러 성립한다. 그중 **일부만 주어졌을 때**, 주어진
것들만으로 이 상위 노드가 무엇을 말할 수 있는지 한 문장으로 재구성하라.

- 주어지지 않은 내용을 복원하거나 추론해 넣지 마라. 그것이 이 작업의 전부다.
- 남은 요소들로 말할 수 있는 범위가 좁아졌다면, 좁아진 그대로 진술하라.
- 남은 요소만으로는 상위 의미가 거의 성립하지 않는다면, 그 사실이 드러나게 진술하라.`;

/**
 * 문단을 최소 의미 명제로 분해한다.
 *
 * **완전성 검증을 통과할 때까지 재시도한다.** 분해가 문단의 일부만 다루고 끝나는 일이
 * 실제로 일어난다 — 「법인」 문단에서 7문장 중 첫 문장만 분해하고 조용히 성공한 적이 있다.
 * 검증 없이 통과시키면 골드가 문단의 일부만 덮은 채 완성되고, 그 사실이 검수 단계에
 * 가서야 드러난다.
 */
export async function decompose(
  paragraphText: string,
  tags: readonly string[],
  paragraphId?: string,
  maxAttempts = 3,
): Promise<Decomposed> {
  const base = `분야: ${tags.join(', ') || '미분류'}\n\n문단:\n${paragraphText}`;
  let correction = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await instrumented('decompose', 'high', paragraphId, () =>
      getClient().messages.parse({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high', format: zodOutputFormat(DecomposeSchema) },
        system: DECOMPOSE_SYSTEM,
        messages: [{ role: 'user', content: base + correction }],
      }),
    );

    const parsed = required(response.parsed_output, 'decompose');
    const issues = validateCompleteness(parsed.sentences, parsed.propositions);
    if (issues.length === 0) return parsed;

    if (attempt === maxAttempts) {
      throw new Error(
        `decompose: ${maxAttempts}회 시도 후에도 완전성 검증 실패\n` +
          issues.map((i) => `  - ${i.message}`).join('\n'),
      );
    }

    correction =
      `\n\n[이전 시도의 문제]\n${issues.map((i) => `- ${i.message}`).join('\n')}\n` +
      `문단의 **모든 문장**을 빠짐없이 분해하라. 각 명제의 sourceSentences가 실제 문장을 ` +
      `가리켜야 하고, 모든 문장이 최소 한 명제의 근거가 되어야 한다.`;
  }

  throw new Error('decompose: 도달할 수 없는 경로');
}

export async function compose(
  paragraphText: string,
  decomposed: Decomposed,
  paragraphId?: string,
): Promise<Composed> {
  // 층위와 역할을 함께 넘긴다. 이 정보가 없으면 합성이 법적 귀속과 실제 실행을 같은
  // 가지로 뭉뚱그려, 역할 분리 관계를 만들 근거가 사라진다.
  const list = decomposed.propositions
    .map((p) => {
      const links = p.links.map((l) => ` ${l.type}→${l.targetId}`).join('');
      return (
        `${p.id}: ${p.text}\n` +
        `    관계: ${p.relation.from} →(${p.relation.kind}) ${p.relation.to}\n` +
        `    층위: ${p.aspect} / 역할: ${p.subjectRole} / 술어: ${p.predicate}${links}`
      );
    })
    .join('\n');

  const response = await instrumented('compose', 'high', paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: zodOutputFormat(ComposeSchema) },
      system: COMPOSE_SYSTEM,
      messages: [
        { role: 'user', content: `원문 문단:\n${paragraphText}\n\n최소 명제:\n${list}` },
      ],
    }),
  );

  return required(response.parsed_output, 'compose');
}

/**
 * 자식 하나를 뺀 상위 노드를 재생성한다. ablation 가중치의 분자.
 *
 * effort는 `low`다 — 짧고 국소적인 작업이라 상위 설정이 낭비이고, 이 호출이 배치 비용의
 * 대부분(간선 수만큼)을 차지한다.
 */
export async function regenerate(
  parentText: string,
  remainingChildTexts: readonly string[],
  paragraphId?: string,
): Promise<string> {
  const remaining =
    remainingChildTexts.length === 0
      ? '(남은 하위 요소가 없다)'
      : remainingChildTexts.map((t, i) => `${i + 1}. ${t}`).join('\n');

  const response = await instrumented('regenerate', 'low', paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low', format: zodOutputFormat(RegenerateSchema) },
      system: REGENERATE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `원래 상위 노드:\n${parentText}\n\n주어진 하위 요소:\n${remaining}`,
        },
      ],
    }),
  );

  return required(response.parsed_output, 'regenerate').text;
}

const VERIFY_LINKS_SYSTEM = `당신은 의미 위계의 링크 후보를 **평가 영향**으로 심사한다.

분해·합성 단계가 낸 링크는 후보일 뿐이다. 각 후보에 대해 단 하나를 판단하라:

  **이 간선을 삭제했을 때, 실제 학생 답변의 충족·누락·모순 판정이 달라지는가?**

달라진다면 그 판정이 달라지는 **구체적인 학생 문장**을 witness에 그대로 쓰고 promote=true.
그런 문장을 만들 수 없으면 promote=false, witness는 빈 문자열 — 담화 흐름 설명용으로만
보존된다.

승격되는 전형: **역할 분리**. "법인이 자산 운용의 법적 주체이지만 실제 운용은 권한자가
수행한다"는 정확한 요약인데, 두 명제를 잇는 관계가 없으면 모순으로 오판된다. 이때 witness는
그 학생 문장 자체다.

강등되는 전형: 양 끝이 각각 별도 슬롯으로 확인되는 관계. 학생이 한쪽을 빠뜨리면 그 슬롯에서
이미 누락으로 잡히므로, 간선이 있든 없든 판정이 같다. "설명 흐름상 이어진다"는 이유로는
승격하지 마라.

관대하게 승격하지 마라. 판정을 바꾸지 않는 링크가 평가에 섞이면 채점 기준이 흐려진다.`;

/**
 * 링크 후보 심사 (파이프라인 5.5단계).
 *
 * 분해가 낸 링크와 합성이 낸 secondary 간선을 함께 심사한다. 중요한 링크가 합성의 우연한
 * 재생성에 의존하지 않게 하는 것이 목적이다.
 */
export async function verifyLinks(
  paragraphText: string,
  propositions: readonly { id: string; text: string; aspect: string; subjectRole: string }[],
  candidates: readonly { fromId: string; toId: string; type: string }[],
  paragraphId?: string,
): Promise<LinkVerdicts> {
  if (candidates.length === 0) return { verdicts: [] };

  const byId = new Map(propositions.map((p) => [p.id, p]));
  const describe = (id: string): string => {
    const p = byId.get(id);
    return p === undefined ? id : `${id} "${p.text}" (${p.aspect}/${p.subjectRole})`;
  };

  const listed = candidates
    .map((c) => `- ${describe(c.fromId)}\n  →(${c.type})→\n  ${describe(c.toId)}`)
    .join('\n\n');

  const response = await instrumented('verify-links', 'medium', paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(LinkVerificationSchema) },
      system: VERIFY_LINKS_SYSTEM,
      messages: [{ role: 'user', content: `원문 문단:\n${paragraphText}\n\n링크 후보:\n${listed}` }],
    }),
  );

  return required(response.parsed_output, 'verifyLinks');
}

const SLOT_CORE_SYSTEM = `당신은 학습 슬롯의 **핵심 사고 관계**를 뽑는다.

각 슬롯이 덮는 명제들이 주어진다. 학생이 그 슬롯을 요약할 때 **실제로 확인해야 할 것**을
2~4개로 적어라.

명칭을 다 나열했는지가 아니라 **관계를 파악했는지**가 기준이다.

예: "법인의 정의와 분류" 슬롯이 재단·사단·영리·비영리 명제를 덮는다고 하자.
  나쁨: "재단 법인, 사단 법인, 영리 법인, 비영리 법인을 모두 나열했는가"
  좋음: "법인이 독립된 법적 인격체라는 점"
        "법인격 부여 대상이 하나의 분류 기준이라는 점"
        "이익 추구 여부가 또 다른 분류 기준이라는 점"

두 번째 형태여야 학생이 명칭을 조금 다르게 써도 사고를 인정할 수 있다.`;

/** 슬롯별 핵심 사고 관계 (파이프라인 8단계). 정규화가 끝난 뒤에 호출한다. */
export async function slotCores(
  paragraphText: string,
  slots: readonly { id: string; shortForm: string; propositions: readonly string[] }[],
  paragraphId?: string,
): Promise<SlotCores> {
  const listed = slots
    .map((s) => `${s.id} (${s.shortForm})\n${s.propositions.map((p) => `    - ${p}`).join('\n')}`)
    .join('\n\n');

  const response = await instrumented('slot-core', 'medium', paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(SlotCoreSchema) },
      system: SLOT_CORE_SYSTEM,
      messages: [{ role: 'user', content: `원문 문단:\n${paragraphText}\n\n슬롯:\n${listed}` }],
    }),
  );

  return required(response.parsed_output, 'slotCores');
}

function required<T>(parsed: T | null, op: string): T {
  if (parsed === null) {
    throw new Error(`${op}: 구조화 출력 파싱 실패 — 스키마와 응답이 어긋났다`);
  }
  return parsed;
}
