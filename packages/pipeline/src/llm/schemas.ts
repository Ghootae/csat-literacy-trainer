/**
 * 구조화 출력 스키마.
 *
 * 골드 위계는 세 단계로 만들어진다: 명제 분해 → 합성(primary 지정 포함) → ablation 재생성.
 *
 * 명제는 표면 진술만 담지 않는다. **설명 층위**(aspect)와 **주체 역할**(subjectRole)을 함께
 * 실어야 평가기가 "법적 귀속 주체"와 "실제 실행 주체"를 같은 술어의 서로 다른 역할로
 * 인식한다. 이 정보가 없으면 문단을 정확히 읽은 학생의 요약이 모순으로 오판된다.
 */

// SDK의 `zodOutputFormat`은 Zod v4 타입을 받는다. zod 3.25는 `zod/v4` 서브패스로 이를 제공한다.
import { z } from 'zod/v4';

/** 명제가 담는 관계. 판정 규칙 R1(양끝 노드)이 이 구조 위에서 동작한다. */
export const RelationSchema = z.object({
  from: z.string().describe('관계의 시작 개념. 학생 응답 대조의 한쪽 끝.'),
  to: z.string().describe('관계의 끝 개념. 학생 응답 대조의 다른 쪽 끝.'),
  kind: z
    .string()
    .describe(
      '관계의 종류. 아래에서 고르되, 맞는 것이 없으면 새로 써도 된다: ' +
        '정의 · 분류 · 인과 · 조건부 매핑 · 속성 · 권능 · 귀결 · 규칙 · 제재 · 목적 · 열거 · 대조. ' +
        '판정 규칙 R1은 from/to만 쓰므로 이 값은 서술용이다.',
    ),
});

/**
 * 명제 사이의 의미 관계.
 *
 * `exception`/`condition`은 뒤 문장이 앞 명제의 **적용 범위를 실제로 축소**할 때만 쓴다.
 * 대상은 같지만 주체 역할이나 설명 층위가 다르면 나머지 종류 중 하나다 — 이 구분이
 * Gate A 오판을 막는다.
 */
export const LinkSchema = z.object({
  type: z
    .enum([
      'exception',
      'condition',
      'implements',
      'role_separation',
      'realization_method',
      'aspect_shift',
    ])
    .describe('관계의 종류. exception/condition은 적용 범위 축소일 때만.'),
  targetId: z.string().describe('관계가 향하는 명제의 id.'),
  rationale: z.string().describe('왜 이 종류인지 한 문장. 특히 exception이 아닌 이유.'),
});

export const PropositionSchema = z.object({
  id: z.string().describe('p1, p2, … 형식의 식별자.'),
  text: z.string().describe('명제를 한 문장으로 진술한 것.'),
  shortForm: z.string().describe('충족 시 학생에게 공개할 축약형. 20자 내외.'),
  relation: RelationSchema,
  predicate: z
    .string()
    .describe(
      '술어의 의미 식별자. 영문 snake_case. 같은 대상에 대한 서로 다른 **역할**은 서로 다른 ' +
        '술어다 (asset_management_legal_subject vs asset_management_execution). 그러나 같은 ' +
        '규칙이 대상만 달리 적용되는 **조건부 매핑 집합**은 하나의 술어를 공유한다 — ' +
        '연속수치→평균 / 순위값→중앙값 / 문자값→최빈값은 셋 다 imputation_choice다.',
    ),
  argument: z
    .string()
    .describe(
      '같은 술어를 공유하는 명제들을 구분하는 인자. 조건부 매핑이면 적용 대상 ' +
        '(continuous / ordinal / categorical). 해당 없으면 빈 문자열.',
    ),
  standaloneSlotValue: z
    .boolean()
    .describe(
      '이 명제가 **독립된 학습 슬롯**으로서 가치가 있는가. 학생이 한 번의 수정 행동으로 ' +
        '복원할 만한 사고 단위면 true. 도입·배경·용어 정의처럼 인접 핵심 슬롯에 딸려가는 ' +
        '것이 자연스러우면 false.',
    ),
  aspect: z
    .string()
    .describe(
      '설명 층위. 영문 snake_case. 예: legal_attribution, actual_execution, definition, ' +
        'classification, purpose, sanction. 층위가 다르면 두 명제는 모순 후보가 아니다.',
    ),
  subjectRole: z
    .string()
    .describe(
      '주체의 역할. 영문 snake_case. 예: legal_principal, authorized_actor, classified_entity.',
    ),
  sourceSentences: z.array(z.string()).describe('근거 문장 번호. S1, S2 … 형식.'),
  exceptions: z
    .array(z.string())
    .describe(
      '이 명제의 **적용 범위를 축소하는** 예외. 아래 4요소 판별을 통과한 것만. ' +
        '통과하지 못하면 빈 배열로 두고 links에 적절한 관계를 적는다.',
    ),
  links: z.array(LinkSchema).describe('다른 명제와의 의미 관계. 없으면 빈 배열.'),
});

export const DecomposeSchema = z.object({
  sentences: z
    .array(z.object({ id: z.string(), text: z.string() }))
    .describe('문단을 문장으로 나눈 것. S1, S2 … 명제의 sourceSentences가 이를 가리킨다.'),
  propositions: z.array(PropositionSchema),
});

export const CompositeSchema = z.object({
  id: z.string().describe('c1, c2, … 형식의 식별자. 타이틀은 별도.'),
  text: z.string().describe('하위 요소를 아우르는 상위 의미를 한 문장으로.'),
  shortForm: z
    .string()
    .describe(
      '충족 시 공개할 축약형. 하위 명제의 층위를 흐리지 않게 — "자산 소유 권능"처럼 ' +
        '뭉뚱그리지 말고 "자산 운용의 법적 주체성과 소유권 귀속"처럼 구체적으로.',
    ),
  childIds: z.array(z.string()).describe('이 노드를 primary 부모로 삼는 자식들의 id.'),
  introducesRelation: z
    .boolean()
    .describe(
      '이 노드가 자식들을 넘어서는 **새 관계**(인과·조건·대조·목적·절차)를 도입하는가. ' +
        '자식들의 단순 병렬 묶음이나 열거에 불과하면 false.',
    ),
  subsumedByParent: z
    .boolean()
    .describe(
      '이 노드의 상위 노드가 이미 이 노드의 일반화 의미를 포함하는가. ' +
        '루트는 false. 판단 근거는 두 노드의 text를 비교해서.',
    ),
});

export const ComposeSchema = z.object({
  composites: z.array(CompositeSchema).describe('중간 합성 노드들. 루트를 포함한다.'),
  titleId: z.string().describe('루트 노드의 id.'),
  secondaryEdges: z
    .array(
      z.object({
        fromId: z.string(),
        toId: z.string(),
        type: z
          .enum(['implements', 'role_separation', 'realization_method', 'aspect_shift'])
          .describe('관계의 종류.'),
        witness: z
          .string()
          .describe(
            '**반사실 증인.** 이 간선을 삭제했을 때 판정이 달라지는 구체적인 학생 문장을 ' +
              '그대로 쓴다. 못 쓰면 빈 문자열로 두고, 그러면 평가에 쓰이지 않는다.',
          ),
        evaluationEffect: z
          .string()
          .describe('그 문장의 판정이 어떻게 달라지는지 한 문장 (충족→모순 등).'),
      }),
    )
    .describe(
      'primary 트리로 표현되지 않는 **서로 다른 가지 사이의** 관계. 조상으로 바로 잇는 ' +
        '단축 간선은 금지. 없으면 빈 배열 — 트리로 충분하면 트리로 둔다.',
    ),
});

/**
 * 링크 검증 (파이프라인 5.5단계).
 *
 * 분해·합성이 낸 링크는 **후보**일 뿐이다. 별도 단계에서 반사실 증인을 생성해 평가용으로
 * 승격하거나 discourse로 강등한다. 중요한 링크가 합성의 우연한 재생성에 의존하지 않게
 * 하기 위한 것이다 — 「법인」의 role_separation은 분해가 냈고, 합성이 같은 간선을 다시
 * 만들어준 덕에 우연히 살아남았다.
 */
export const LinkVerificationSchema = z.object({
  verdicts: z.array(
    z.object({
      fromId: z.string(),
      toId: z.string(),
      promote: z
        .boolean()
        .describe('평가용으로 승격할지 여부. 반사실 증인을 못 만들면 false.'),
      witness: z
        .string()
        .describe(
          '이 간선을 삭제했을 때 판정이 달라지는 **구체적인 학생 문장**. ' +
            'promote가 false면 빈 문자열.',
        ),
      evaluationEffect: z
        .string()
        .describe('그 문장의 판정이 어떻게 달라지는지 (예: "충족 → 모순으로 오판").'),
    }),
  ),
});

/** 슬롯의 핵심 사고 관계 (8단계). 명제 나열이 아니라 확인해야 할 사고 단위다. */
export const SlotCoreSchema = z.object({
  slots: z.array(
    z.object({
      slotId: z.string(),
      requiredReasoningCore: z
        .array(z.string())
        .describe(
          '학생 요약에서 실제로 확인할 핵심 사고 관계 2~4개. 명칭 나열 여부가 아니라 ' +
            '관계 파악 여부다. 예: "법인격 부여 대상이 하나의 분류 기준이라는 점".',
        ),
    }),
  ),
});

export const RegenerateSchema = z.object({
  text: z.string().describe('남은 자식들만으로 재구성한 상위 노드의 의미.'),
});

export type Decomposed = z.infer<typeof DecomposeSchema>;
export type Composed = z.infer<typeof ComposeSchema>;
export type Regenerated = z.infer<typeof RegenerateSchema>;
export type SlotCores = z.infer<typeof SlotCoreSchema>;
export type LinkVerdicts = z.infer<typeof LinkVerificationSchema>;
