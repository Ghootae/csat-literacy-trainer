// 경계 응답 판정 후보 조건(Q-0032, 2026-10-08 사용자 승인 문구). v5_methods 지시문 뒤에 덧붙인다.
export const CHOICE_DEFAULT_BLOCK = `## 선택 결과에 따른 해석 기본값
학생 진술이 둘 이상으로 해석될 때만 적용한다. 내용 오류와 충분성의 판정 기준은 선택 결과와 관계없이 같다.
- 학생이 정답 선지를 골랐다면: 학생 진술과 선지 판단 사이에 빠진 연결이 원문·보기에 명시된 배경 사실(대상의 위치·정의·소속 등)뿐이면, 학생이 그 연결을 알고 짧게 쓴 것으로 보고 재구성한다. 빠진 것이 선지 판단의 핵심 관계·방향·조건 자체이거나, 학생이 관련 대상·조건만 언급했다면 적용하지 않는다.
- 학생이 정답이 아닌 선지를 골랐다면: 학생 진술을 그 선지를 고른 이유로 읽고, 학생이 직접 말한 진술과 관계를 원문과 대조한다. 선지의 참·거짓에 대한 학생의 최종 결론이 틀렸다는 사실은 오류의 근거로 쓰지 않는다. 선지와 연결되지 않는 참인 진술은 오류가 아니다.`;

export const STEPS_BLOCK = `## 판정 단계 기록
SELECTION에서 reconstructability가 RECONSTRUCTABLE이면 contentAssessment를 정하기 전에 judgmentSteps를 기록하고, contentAssessment는 아래 도출 규칙으로 정한다. UNKNOWN이면 judgmentSteps의 studentStance를 UNCLEAR로 두고 기존 UNKNOWN 규칙을 따른다.
- choiceCorePremise: 학생이 고른 선지의 주장이 성립하는 데 필요한 핵심 전제.
- studentStance: 학생 진술이 그 전제를 부정하면 NEGATES, 긍정하면 AFFIRMS, 전제와 무관하면 UNRELATED, 판단할 수 없으면 UNCLEAR.
- missingLink: 학생 진술에서 선지 판단까지 빠진 연결이 없으면 NONE, 원문·보기에 명시된 배경 사실(대상의 위치·정의·소속 등)뿐이면 BACKGROUND_FACT, 선지 판단의 관계·방향·조건 판단 자체이면 JUDGMENT_STEP.
- missingLinkSource: missingLink가 BACKGROUND_FACT이면 그 사실의 원문 인용, 아니면 null.
- statementCheck: 학생이 직접 말한 진술과 관계를 원문과 대조한 결과. 원문과 맞으면 CONSISTENT, 원문과 명시적으로 충돌하면 CONFLICTS, 원문만으로 확인할 수 없으면 NOT_IN_SOURCE. 모델이 도출한 선지의 참·거짓 최종 결론은 대조 대상에서 제외한다.
도출 규칙:
1. statementCheck가 CONFLICTS이면 ERROR.
2. studentStance가 NEGATES 또는 AFFIRMS이고, missingLink가 NONE 또는 BACKGROUND_FACT이며, statementCheck가 CONSISTENT이면 SUPPORTED.
3. studentStance가 UNRELATED이거나, missingLink가 JUDGMENT_STEP이거나, statementCheck가 NOT_IN_SOURCE이면 INSUFFICIENT.
4. studentStance가 UNCLEAR이면 기존 UNKNOWN 규칙을 따른다.`;

export const BOUNDARY_ARMS = { v5_methods: null, v5_methods_choice: CHOICE_DEFAULT_BLOCK, v5_methods_steps: STEPS_BLOCK };

export function withJudgmentSteps(schema) {
  const out = structuredClone(schema);
  const steps = { type: 'object', additionalProperties: false, properties: {
    choiceCorePremise: { type: 'string' },
    studentStance: { type: 'string', enum: ['NEGATES', 'AFFIRMS', 'UNRELATED', 'UNCLEAR'] },
    missingLink: { type: 'string', enum: ['NONE', 'BACKGROUND_FACT', 'JUDGMENT_STEP'] },
    missingLinkSource: { type: ['string', 'null'] },
    statementCheck: { type: 'string', enum: ['CONSISTENT', 'CONFLICTS', 'NOT_IN_SOURCE'] },
  }, required: ['choiceCorePremise', 'studentStance', 'missingLink', 'missingLinkSource', 'statementCheck'] };
  // contentAssessment보다 먼저 생성되도록 그 앞에 둔다.
  out.properties = Object.fromEntries(Object.entries(out.properties).flatMap(([k, v]) =>
    k === 'contentAssessment' ? [['judgmentSteps', steps], [k, v]] : [[k, v]]));
  out.required = Object.keys(out.properties);
  return out;
}

export function derivedAssessment(steps, reconstructability) {
  if (reconstructability !== 'RECONSTRUCTABLE' || steps.studentStance === 'UNCLEAR') return 'UNKNOWN_RULE';
  if (steps.statementCheck === 'CONFLICTS') return 'ERROR';
  if (steps.studentStance === 'UNRELATED' || steps.missingLink === 'JUDGMENT_STEP' || steps.statementCheck === 'NOT_IN_SOURCE') return 'INSUFFICIENT';
  return 'SUPPORTED';
}
