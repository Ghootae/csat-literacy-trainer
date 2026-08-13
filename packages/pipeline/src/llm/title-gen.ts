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

import { MODEL, TITLE_GENERATION_EFFORT, getClient, instrumented } from './client.js';
import { GeneratedQuerySetSchema, type GeneratedQuerySet } from './query-gen.js';

/** 프롬프트를 고치면 올린다. 생성 fixture 경로에 들어가므로 기존 산출물이 덮이지 않는다. */
export const TITLE_GENERATOR_VERSION: string = 'v2';

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

[qT2] level=**argument**, criticalForRelation=**true**
  질문: 이 문단의 코어 축들이 모두 살아 있는가? (명시했거나 학생 표현에 합리적으로 포함되는가)
  역할: **기본 성공 조건 — 누락 검사.** 관계를 요구하는 질의가 아니라, 축이 사라지지 않았는지
        보는 질의다. 그래서 층위가 argument다.

  먼저 **코어 축 목록**을 정한다. 3~4개를 잡아 기대 답에 번호로 적는다.

  **축은 짧은 명사구 하나로만 적는다.** 괄호 설명·예시·수치·기제·명명 근거를 붙이지 마라.
  축은 "무엇에 관한 것인지"만 가리키면 되고, 그 안의 내용은 앞 영역 단계가 이미 검사했다.

      좋음   (1) 포도당 생성 과정  (2) 환경 조건  (3) C3 식물 분류
      나쁨   (1) 원료(빛에너지·CO2)와 산물(포도당·물)을 회로로 만드는 단계
             (2) 순환 절차(A+B 결합→C→D, 남은 것의 A 재생)와 그 명명

  **세부를 축에 적어 넣으면 어떤 압축도 통과할 수 없게 된다.** 축이 이미 문단 전체가 되어
  버리기 때문이다. 그러면 이 질의는 학생에게 원문을 다시 쓰라고 요구하는 것이 되고, 그것은
  이 단계가 재려는 것과 정반대다.

  **문단에 최상위 관계가 있으면 그 관계도 축의 하나로 센다.** 대립·인과·문제해결처럼 문단
  전체를 조직하는 관계가 있으면, 그것이 빠진 응답은 축 하나를 잃은 것이다. 그런 관계가 없는
  나열형 문단이면 축은 내용 항목들뿐이다 — 없는 관계를 지어내 요구하지 마라.

  수용 기준에 반드시 넣을 것:
    - "판정 대상은 축의 생존이지 표현 형식이 아니다. 문장이 몇 개든, 나열이든 한 문장이든 묻지
      않는다." (조직 방식은 qT3가 본다)
    - **사전적 상하위어가 아니라 맥락적 함의로 판단한다.** "그 상위어가 이 축을 사전적으로
      포함하는가"가 아니라 "학생 표현을 자연스럽게 읽었을 때 생략된 축의 의미가 그 안에
      합리적으로 들어 있는가"를 묻는다.
    - **애매하면 인정한다.** 구체 내용의 정확성은 앞 영역 단계에서 이미 검사했다. 타이틀에서
      판단이 갈리는 것을 미달로 처리하면, 알고 있는 학생을 표기 문제로 벌하게 된다.
    - 어느 항으로도 그 축을 읽어낼 수 없으면 미보존이다. **접은 것과 잃은 것을 가르는 것이
      이 질의의 전부다** — 다만 아래 "판정 범위" 항을 함께 읽어라.
    - 축을 하나하나 다 적어도 인정한다. 나열이라고 낮추지 마라 — 그것은 qT3의 몫이다.
  contradictionCriteria: 축을 뒤바꾸거나 관계 방향을 뒤집은 진술을 구체적으로 적는다.

[qT3] level=argument, criticalForRelation=false, requiredForFullArgumentCoverage=true
  질문: 이 응답은 코어 축들을 상위어로 접었는가, 아니면 그대로 나열했는가?
  역할: **보너스 — 추상화 보상.** 아는 내용을 더 높은 수준으로 조직해 냈는지 본다.

  **이 축은 현재 defer 상태다** (docs/DECISIONS.md, 2026-08-11). 판정이 안정적으로
  재현되지 않아 제품 동작이나 회귀의 필수 성공 조건으로 쓰지 않는다. 질의는 유지하되,
  기준을 억지로 강하게 쓰지 마라 — **여기서 무엇이 나오든 기본 성공 판정은 흔들리지 않아야
  한다.** criticalForRelation을 절대 true로 만들지 마라. 그것이 이 분리를 지키는 장치다.
  수용 기준에 반드시 넣을 것 (문구를 이 취지 그대로 쓴다):
    - "판정 대상은 내용의 정확성이 아니라 **추상화 여부**다. 정확도는 qT2가 본다."
    - 둘 이상의 코어 축이 하나의 상위어·중심 서술 아래로 묶였으면 인정. **종속**(주절 하나에
      나머지가 수식·근거로 붙음)이든 **포섭**(상위 범주가 여럿을 아우름)이든 상관없다.
    - 축을 하나씩 대등하게 이어 놓았으면 미보존.
    - 원문이나 슬롯 문장을 그대로 또는 거의 그대로 이어 붙였으면 미보존.
    - "**축을 잃은 것은 압축이 아니다.** qT2가 미보존이면 여기서도 인정하지 않는다."
    - **길이는 기준이 아니다.** 길어도 접었으면 인정하고, 짧아도 나열이면 미보존.

# 원칙

1. **골드 타이틀 문자열과의 유사도를 묻지 마라.** 학생이 자기 말로 쓴 타이틀도 통과해야 한다.
   골드 타이틀은 무엇이 코어 축인지 알려주는 근거일 뿐이다.
   **골드 타이틀보다 더 잘 압축한 응답이 나올 수 있고, 그것이 정상이다** — 골드는 "안전하게
   의미를 보존한 기본 성공 예시"이지 도달해야 할 상한이 아니다.

2. **qT2는 생존을, qT3는 조직을 본다. 섞지 마라.** 같은 응답이 qT2 보존 + qT3 미보존일 수
   있고(축은 다 살았으나 나열), 그것이 기본 성공이다. qT2 수용 기준에 "압축했는가"를 넣지 마라.

3. **나열을 미달로 만들지 마라.** 축을 다 적은 나열은 기본 성공이다. 나열보다 압축이 낫다는
   것은 qT3의 보상으로 표현하지, qT2의 미달로 표현하지 않는다.

4. **수용 기준은 판정 가능하게.** 실제 학생 응답을 구분할 수 있어야 한다. "잘 요약했는가"
   같은 추상적 문구는 금지.

5. **판정 범위 — 이 단계가 안정적으로 재는 것은 셋이다.**
   (a) 과대추상 차단 (b) 명백한 핵심 누락 차단 (c) 나열은 기본 성공.
   상위 표현이 생략된 세부축을 맥락적으로 포섭하는지 여부는 **사람 사이에서도 갈리고 실측에서
   재현되지 않았다**(docs/DECISIONS.md). 그 경계를 가르려고 기준을 정교하게 만들지 마라.
   갈리는 경우는 (c)로 흘려보내는 것이 이 단계의 방침이다 — 타이틀은 게이트가 아니라 보상이므로
   보상을 놓치는 쪽이 이해한 학생을 막는 쪽보다 낫다.

5. 영역은 하나만 만든다: regionId="title", label="문단의 중심 관계".
   sourceSentenceIds는 문단 전체, propositionIds와 relationEdgeIds는 빈 배열로 둔다.`;

export async function generateTitleQuerySet(input: TitleGeneratorInput): Promise<GeneratedQuerySet> {
  const sentenceBlock = input.sentences.map((s) => `[${s.id}] ${s.text}`).join('\n');
  const slotBlock = input.slots.map((s) => `[${s.id}] ${s.shortForm}`).join('\n');

  const response = await instrumented('title-gen', TITLE_GENERATION_EFFORT, input.paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: TITLE_GENERATION_EFFORT, format: zodOutputFormat(GeneratedQuerySetSchema) },
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
    ['qT2', 'argument'],
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
