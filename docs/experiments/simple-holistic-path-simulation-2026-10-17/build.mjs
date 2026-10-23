// 단순 형식 문단 v4.1 전체 경로(29) 시뮬레이션 생성기. 문단 두 개 × 29 경로 = 58 사례.
// node docs/experiments/simple-holistic-path-simulation-2026-10-17/build.mjs
// 출력: cases.json(실험 스크립트용), SIMULATION.md(사람이 읽는 기대 대화)
// 2026-10-22: 교정 질문에 내용 없이 답한 경로 2개 추가(P30 '맞지 않아.' — 다르다는 건 알아챘음, P31 '잘 모르겠어.'). 문단마다 31 경로.
// 2026-10-19(3): v4.6 — 질문 뒤 마무리 말풍선을 '전체 피드백 + 부분별 핵심 상자'로 바꿔 기대 bubbles를 새 문자열로 맞춤(별도 도입·빠진 내용 말풍선 없음).
// 2026-10-19(2): v4.4 원칙에 맞게 기대값 2건 수정 — 공손룡 '왜?'에 틀린 이유는 질문 1번 오류(빠진 내용 없음), 공손룡 교정 실패 답은 관계+목적 오류 둘. 새 문단 3개 추가(법인 5, 정보 비대칭 4, 표면 장력 2).
// 2026-10-19: 구멍 하나 질문에 질문과 무관한 틀린 말(도파민 'D1이 억제성…')은 판정하지 않는다(사용자 원칙, v4.4). 공손룡 쪽은 이유를 물은 질문에 틀린 이유를 댄 것이라 오류 그대로.
// 2026-10-18: gongsun oneErrWithB를 오류 하나로 고침(이전 문장은 '그래야 혼란이 줄어든다'가 둘째 오류였다 — 1차 실행 RESULTS 6).
// 기대 말풍선 문구는 방향 예시다. 비교 기준은 분류·행동·항목 판정·말풍선 구성·짚는 내용의 방향이다.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// ── 문단별 재료 ──────────────────────────────────────────────
const P = {
  gongsun: {
    passageId: 'gongsun-long-later-mohists', paragraphId: 'gongsun-long-later-mohists-p2', title: '공손룡과 후기 묵가의 명실론 · 문단 2',
    core: '공손룡은 명과 실이 엄격하게 일대일로 대응해야 한다고 보았다. 그래야 서로 다른 실을 같은 명으로 불러 생기는 혼란을 막을 수 있기 때문이다.',
    parts: { A: '명과 실은 일대일로 대응해야 한다(관계)', B: '그래야 서로 다른 실을 같은 명으로 불러 생기는 혼란을 막는다(목적)' },
    sentences: {
      A: '그는 어떤 ‘실’은 그것을 가리키는 어떤 ‘명’에 의해서만 유일하게 지시되어야 한다는 것과, 어떤 명은 유일하게 어떤 실만을 지시하여야 한다는 것을 주장하였다.',
      B: '그는 명과 실의 엄격한 일대일 대응 관계를 통해, 명이 그 역할을 할 때 오해나 문제가 생기지 않게 하려 하였다.',
      derive: '명가(名家) 사상가인 공손룡은 ‘실’이 ‘물(物)’로부터 파생된 것이라고 하였다.',
    },
    questions: { A: '공손룡은 명과 실이 어떤 관계여야 한다고 봤을까?', B: '공손룡은 왜 그렇게 주장했을까?' },
    say: {
      captured: '공손룡은 하나의 명이 하나의 실만 가리켜야 서로 다른 걸 같은 이름으로 불러서 생기는 혼란을 막을 수 있다고 봤다.',
      captured2: '명과 실이 일대일로 대응해야 헷갈리지 않는다는 게 공손룡의 주장이다.',
      copy: '그는 어떤 ‘실’은 그것을 가리키는 어떤 ‘명’에 의해서만 유일하게 지시되어야 한다는 것과, 어떤 명은 유일하게 어떤 실만을 지시하여야 한다는 것을 주장하였다.',
      irrelevant: '잘 모르겠어.',
      nonCore: '공손룡은 명가의 사상가였다.',
      onlyA: '공손룡은 명과 실이 일대일로 대응해야 한다고 주장했다.',
      oneErrWithB: '공손룡은 하나의 명이 여러 실을 가리켜도 된다고 봤다. 그리고 명과 실의 관계를 정해서 혼란을 막으려 했다.',
      oneErrNoB: '공손룡은 하나의 명이 여러 실을 가리켜도 된다고 봤다.',
      multi: '공손룡은 명과 실이 다대다로 대응해도 된다고 봤고, 그래야 이름을 자유롭게 바꿔 쓰며 유연하게 소통할 수 있다고 했다.',
      fixResolvedFull: '아, 하나의 명은 하나의 실만 가리켜야 한다고 봤네.',
      fixResolvedPartial: '하나의 명은 하나의 실만 가리켜야 하는 거였네.',
      fixFailed: '여러 실을 한 이름으로 부를 수 있어야 소통이 편하니까 맞는 것 같아.',
      g2Filled: '1. 일대일로 대응해야 한다.\n2. 서로 다른 걸 같은 이름으로 부르면 헷갈리니까.',
      g2Partial: '공손룡은 명과 실의 관계가 일대일이어야 한다고 봤어.',
      g2Irrelevant: '모르겠어.',
      g2Errors: '다대다 대응.\n유연한 소통이 가능.',
      g2ErrorPlusBlank: '명과 실은 서로 상관없이 정해진다.\n잘 모르겠어.',
      g1Filled: '서로 다른 걸 같은 이름으로 부르면 헷갈리니까, 그걸 막으려고.',
      g1Vague: '그렇게 하는 게 맞으니까.',
      g1Irrelevant: '모르겠어.',
      g1Error: '이름을 상황에 따라 바꿔 쓸 수 있게 하려고.',
      g1OtherError: '하나의 명이 여러 실을 가리켜야 하니까 그런 거 아닐까?',
    },
    g1OtherRelevant: true,
    fixFailedErrors: ['relMany', 'purposeConv'],
    errors: {
      relMany: { quote: '하나의 명이 여러 실을 가리켜도 된다고 봤다', part: 'A', fix: '공손룡은 오히려 하나의 명이 하나의 실만 가리켜야 한다고 주장했어.' },
      relManyMulti: { quote: '명과 실이 다대다로 대응해도 된다고 봤고', part: 'A', fix: '다대다가 아니라, 명과 실이 하나씩 엄격하게 대응해야 한다고 봤어.' },
      purposeFlexMulti: { quote: '이름을 자유롭게 바꿔 쓰며 유연하게 소통할 수 있다고 했다', part: 'B', fix: '자유롭게 바꿔 쓰려는 게 아니라, 서로 다른 실을 같은 명으로 불러 생기는 혼란을 막으려는 거야.' },
      relManyFrag: { quote: '다대다 대응.', part: 'A', fix: '다대다가 아니라, 명과 실이 하나씩만 대응해야 한다고 봤어.' },
      purposeFlexFrag: { quote: '유연한 소통이 가능.', part: 'B', fix: '유연한 소통이 아니라, 혼란이 생기지 않게 하려고 그렇게 주장한 거야.' },
      relNone: { quote: '명과 실은 서로 상관없이 정해진다.', part: 'A', fix: '상관없는 게 아니라, 명과 실이 엄격하게 일대일로 대응해야 한다고 봤어.' },
      purposeChange: { quote: '이름을 상황에 따라 바꿔 쓸 수 있게 하려고.', part: 'B', fix: '이름을 바꿔 쓰려는 게 아니라, 같은 이름이 다른 실을 가리켜 생기는 혼란을 막으려는 거야.' },
      relManyOther: { quote: '하나의 명이 여러 실을 가리켜야 하니까', part: 'A', fix: '하나의 명은 하나의 실만 가리켜야 한다고 봤어.' },
      purposeConv: { quote: '소통이 편하니까', part: 'B', fix: '소통을 편하게 하려는 게 아니라, 같은 이름이 다른 실을 가리켜 생기는 혼란을 막으려는 거야.' },
    },
    reply: {
      praiseShort: '일대일 대응과 그게 막으려는 혼란을 함께 잡았네. 이 문단의 중심을 정확히 짚었어.',
      praiseAfter: '질문에 답하면서 일대일 대응과 그 이유를 모두 채웠어.',
      retry: '문단 문장을 거의 그대로 옮겨 적었네. 공손룡이 무엇을 주장했는지 네 말로 다시 써 볼래?',
      gap2: '공손룡이 명가 사상가인 건 맞지만, 이 문단의 중심 내용이라고 보긴 어려워. 내가 더 확인하고 싶은 건 이거야.',
      gap1: '일대일 대응이라는 주장은 잘 잡았어. 하나만 더 확인하고 싶어.',
      gap1AfterFix: '맞아, 그렇게 고친 게 맞아. 하나만 더 확인하고 싶어.',
      correction: '하나의 명이 여러 실을 가리켜도 된다고 했는데, 문단에서 공손룡이 명과 실의 관계를 어떻게 말하는지 다시 볼래?',
      missingB: (got) => `${got ? '일대일 대응은 잘 잡았어. ' : ''}아직 빠진 부분은 그렇게 주장한 이유, 서로 다른 실을 같은 명으로 부르면 생기는 혼란을 막으려 했다는 점이야.`,
      missingAB: '아직 빠진 부분은 명과 실이 일대일로 대응해야 한다는 주장과, 그것으로 혼란을 막으려 했다는 이유야.',
      noResponse: '괜찮아, 이번엔 내가 정리해 줄게.',
    },
  },
  dopamine: {
    passageId: 'dopamine-motor-control', paragraphId: 'dopamine-motor-control-p4', title: '도파민의 합성, 수용체, 수의적 운동 조절 · 문단 4',
    core: '흑질의 도파민은 D1 수용체가 밀집한 직접 경로는 활성화하고 D2 수용체가 밀집한 간접 경로는 억제한다. 그 결과 운동의 시작이 수월해져 운동이 촉진된다.',
    parts: { A: '도파민은 (D1이 있는) 직접 경로는 활성화하고 (D2가 있는) 간접 경로는 억제한다(작용)', B: '그 결과 운동 시작이 수월해져 운동이 촉진된다(결과)' },
    sentences: {
      A: '직접 경로의 선조체 뉴런에는 D1 계열 수용체가, 간접 경로의 선조체 뉴런에는 D2 계열 수용체가 밀집되어 있다.',
      B: '따라서 흑질의 도파민성 뉴런에서 분비된 도파민은 직접 경로를 활성화하고 간접 경로는 억제하여 목표하는 운동의 시작을 수월하게 함으로써 운동을 촉진하게 된다.',
      derive: '흑질의 도파민성 뉴런은 선조체로 연결되어 직접 및 간접 경로를 통해 수의적 운동의 조절에 영향을 미친다.',
    },
    questions: { A: '도파민은 두 경로에 각각 어떻게 작용할까?', B: '그 결과 운동에는 어떤 영향을 줄까?' },
    say: {
      captured: '도파민은 D1이 있는 직접 경로는 켜고 D2가 있는 간접 경로는 꺼서 운동을 시작하기 쉽게 만든다.',
      captured2: '도파민이 직접 경로는 활성화, 간접 경로는 억제해서 결국 운동을 촉진한다.',
      copy: '따라서 흑질의 도파민성 뉴런에서 분비된 도파민은 직접 경로를 활성화하고 간접 경로는 억제하여 목표하는 운동의 시작을 수월하게 함으로써 운동을 촉진하게 된다.',
      irrelevant: '잘 모르겠어.',
      nonCore: '흑질의 도파민성 뉴런은 선조체로 연결되어 있다.',
      onlyA: '도파민은 직접 경로를 활성화하고 간접 경로는 억제한다.',
      oneErrWithB: '도파민은 직접 경로를 억제하고 간접 경로를 활성화해서 운동을 촉진한다.',
      oneErrNoB: '도파민은 직접 경로를 억제하고 간접 경로를 활성화한다.',
      multi: '직접 경로에는 D2 수용체가, 간접 경로에는 D1 수용체가 있어서, 도파민은 결국 운동을 억제한다.',
      fixResolvedFull: '아, 반대구나. 직접 경로는 활성화하고 간접 경로는 억제하는 거네.',
      fixResolvedPartial: '반대였네. 직접 경로를 활성화하고 간접 경로를 억제해.',
      fixFailed: 'D2가 억제성이니까 직접 경로가 억제되는 게 맞는 것 같아.',
      g2Filled: '1. 직접 경로는 활성화하고 간접 경로는 억제해.\n2. 운동이 쉽게 시작돼서 촉진돼.',
      g2Partial: '직접 경로는 활성화하고 간접 경로는 억제해.',
      g2Irrelevant: '모르겠어.',
      g2Errors: '둘 다 활성화.\n운동이 멈춤.',
      g2ErrorPlusBlank: '둘 다 억제해.\n잘 모르겠어.',
      g1Filled: '운동을 시작하기 쉬워져서 운동이 촉진돼.',
      g1Vague: '운동이랑 관련이 있어.',
      g1Irrelevant: '모르겠어.',
      g1Error: '운동이 차단돼.',
      g1OtherError: 'D1이 억제성이라서 그런 거 아닐까?',
    },
    g1OtherRelevant: false,
    errors: {
      relMany: { quote: '직접 경로를 억제하고 간접 경로를 활성화', part: 'A', fix: '반대야. 도파민은 직접 경로는 활성화하고 간접 경로는 억제해.' },
      relManyMulti: { quote: '직접 경로에는 D2 수용체가, 간접 경로에는 D1 수용체가 있어서', part: 'A', fix: '수용체가 뒤바뀌었어. 직접 경로에는 D1, 간접 경로에는 D2가 밀집해 있어.' },
      purposeFlexMulti: { quote: '도파민은 결국 운동을 억제한다', part: 'B', fix: '억제가 아니라, 운동 시작을 수월하게 해서 운동을 촉진해.' },
      relManyFrag: { quote: '둘 다 활성화.', part: 'A', fix: '둘 다가 아니라, 직접 경로는 활성화하고 간접 경로는 억제해.' },
      purposeFlexFrag: { quote: '운동이 멈춤.', part: 'B', fix: '멈추는 게 아니라, 운동을 시작하기 쉬워져서 촉진돼.' },
      relNone: { quote: '둘 다 억제해.', part: 'A', fix: '둘 다 억제하는 게 아니라, 직접 경로는 활성화하고 간접 경로만 억제해.' },
      purposeChange: { quote: '운동이 차단돼.', part: 'B', fix: '차단이 아니라, 운동 시작이 수월해져서 운동이 촉진돼.' },
      relManyOther: { quote: 'D1이 억제성이라서', part: 'A', fix: 'D1은 억제성이 아니라 흥분성 수용체라서 직접 경로가 활성화돼.' },
    },
    reply: {
      praiseShort: '두 경로에 반대로 작용해서 운동을 쉽게 시작하게 한다는 핵심을 잡았네.',
      praiseAfter: '질문에 답하면서 두 경로에 대한 작용과 그 결과를 모두 채웠어.',
      retry: '문단 문장을 거의 그대로 옮겨 적었네. 도파민이 어떤 역할을 하는지 네 말로 다시 써 볼래?',
      gap2: '도파민성 뉴런이 선조체로 연결된다는 건 맞지만, 이 문단의 중심 내용이라고 보긴 어려워. 내가 더 확인하고 싶은 건 이거야.',
      gap1: '두 경로에 반대로 작용한다는 건 잘 잡았어. 하나만 더 확인하고 싶어.',
      gap1AfterFix: '맞아, 그렇게 고친 게 맞아. 하나만 더 확인하고 싶어.',
      correction: '직접 경로를 억제하고 간접 경로를 활성화한다고 했는데, 문단에서 각 경로에 어떤 수용체가 있는지 다시 볼래?',
      missingB: (got) => `${got ? '두 경로에 대한 작용은 잘 잡았어. ' : ''}아직 빠진 부분은 그 결과 운동 시작이 수월해져 운동이 촉진된다는 점이야.`,
      missingAB: '아직 빠진 부분은 도파민이 직접 경로는 활성화하고 간접 경로는 억제한다는 점과, 그 결과 운동이 촉진된다는 점이야.',
      noResponse: '괜찮아, 이번엔 내가 정리해 줄게.',
    },
  },
  corporate: {
    passageId: 'corporate-law', paragraphId: 'corporate-law-p5', title: '법인의 종류와 자산 운용의 법적 통제 · 문단 5',
    core: '무상 증자는 자산이 밖으로 나가지 않고 총 규모가 그대로여서 이사회 결정만으로 실행할 수 있다. 반면 배당은 자산이 외부로 유출되므로 주주 총회 의결 등 더 까다로운 요건이 필요하다.',
    parts: { A: '무상 증자는 자산 총규모가 변하지 않아 이사회 결정만으로 실행(유출 없음 → 가벼운 요건)', B: '배당은 자산이 외부로 유출되어 주주 총회 의결 등 더 까다로운 요건(유출 → 무거운 요건)' },
    sentences: {
      A: '무상 증자를 실행하면 자산의 구조만 재편되고 자산의 총 규모는 변하지 않기 때문에 이사회의 결정만으로 실행이 가능하다.',
      B: '다만 배당은 자산이 외부로 유출되는 것이기 때문에, 잘못된 판단으로 인한 회사나 주주들의 손해를 막기 위해 이사회뿐만 아니라 주주 총회의 의결을 거치는 등 더 까다로운 요건을 만족해야 한다.',
      derive: '주식회사의 자산 운용은 자산의 외부 유출 여부에 따라 실행의 요건이 다르다.',
    },
    questions: { A: '무상 증자는 실행 요건이 어떻게 정해져 있을까?', B: '배당의 실행 요건은 무상 증자와 어떻게 다를까?' },
    say: {
      captured: '무상 증자는 자산이 회사 밖으로 나가지 않아서 이사회 결정만으로 되지만, 배당은 자산이 빠져나가니까 주주 총회까지 거쳐야 한다.',
      captured2: '자산이 밖으로 나가느냐에 따라 요건이 달라서, 무상 증자는 이사회만, 배당은 주주 총회 의결까지 필요하다.',
      copy: '무상 증자를 실행하면 자산의 구조만 재편되고 자산의 총 규모는 변하지 않기 때문에 이사회의 결정만으로 실행이 가능하다.',
      irrelevant: '잘 모르겠어.',
      nonCore: '주식회사는 무상 증자를 하면 주식을 주주들에게 무상으로 나눠 준다.',
      onlyA: '무상 증자는 자산 총규모가 그대로라서 이사회 결정만으로 실행할 수 있다.',
      oneErrWithB: '무상 증자는 주주 총회 의결을 거쳐야 실행할 수 있다. 배당은 자산이 밖으로 나가니까 요건이 더 까다롭다.',
      oneErrNoB: '무상 증자는 주주 총회 의결을 거쳐야 실행할 수 있다.',
      multi: '무상 증자는 자산이 외부로 유출되기 때문에 주주 총회 의결이 필요하고, 배당은 이사회 결정만으로 할 수 있다.',
      fixResolvedFull: '아, 무상 증자는 자산이 밖으로 안 나가니까 이사회 결정만으로 되는구나.',
      fixResolvedPartial: '무상 증자는 자산 규모가 그대로라 이사회 결정만으로 되는 거였네.',
      fixFailed: '무상 증자도 주식을 새로 발행하니까 주주 총회를 거쳐야 할 것 같아.',
      g2Filled: '1. 이사회 결정만으로 돼. 자산 총규모가 안 변하니까.\n2. 배당은 자산이 밖으로 나가서 주주 총회 의결까지 거쳐야 해.',
      g2Partial: '무상 증자는 자산 총규모가 그대로라 이사회 결정만으로 돼.',
      g2Irrelevant: '모르겠어.',
      g2Errors: '주주 총회 의결.\n배당은 이사회만 결정하면 돼.',
      g2ErrorPlusBlank: '무상 증자는 주주 총회를 거쳐야 해.\n잘 모르겠어.',
      g1Filled: '배당은 자산이 회사 밖으로 나가니까 주주 총회 의결까지 거쳐야 해.',
      g1Vague: '배당은 좀 다를 것 같아.',
      g1Irrelevant: '모르겠어.',
      g1Error: '배당도 이사회 결정만으로 할 수 있어.',
      g1OtherError: '주식회사는 상법을 적용받지 않잖아.',
    },
    g1OtherRelevant: false,
    errors: {
      relMany: { quote: '무상 증자는 주주 총회 의결을 거쳐야 실행할 수 있다', part: 'A', fix: '무상 증자는 자산 총규모가 그대로라 이사회 결정만으로 실행할 수 있어.' },
      relManyMulti: { quote: '무상 증자는 자산이 외부로 유출되기 때문에 주주 총회 의결이 필요하고', part: 'A', fix: '반대야. 무상 증자는 자산이 밖으로 나가지 않아서 이사회 결정만으로 돼.' },
      purposeFlexMulti: { quote: '배당은 이사회 결정만으로 할 수 있다', part: 'B', fix: '배당은 자산이 외부로 유출되기 때문에 주주 총회 의결 같은 더 까다로운 요건이 필요해.' },
      relManyFrag: { quote: '주주 총회 의결.', part: 'A', fix: '무상 증자는 주주 총회 없이 이사회 결정만으로 실행할 수 있어.' },
      purposeFlexFrag: { quote: '배당은 이사회만 결정하면 돼.', part: 'B', fix: '배당은 이사회뿐 아니라 주주 총회 의결도 거쳐야 해.' },
      relNone: { quote: '무상 증자는 주주 총회를 거쳐야 해.', part: 'A', fix: '무상 증자는 이사회 결정만으로 실행할 수 있어.' },
      purposeChange: { quote: '배당도 이사회 결정만으로 할 수 있어.', part: 'B', fix: '배당은 자산이 밖으로 나가서 주주 총회 의결 등 더 까다로운 요건이 필요해.' },
    },
    reply: {
      praiseShort: '자산이 밖으로 나가는지에 따라 무상 증자와 배당의 요건이 달라진다는 대비를 잘 잡았어.',
      praiseAfter: '질문에 답하면서 무상 증자와 배당의 요건 차이를 모두 채웠어.',
      retry: '문단 문장을 거의 그대로 옮겨 적었네. 이 문단이 무엇과 무엇을 비교하는지 네 말로 다시 써 볼래?',
      gap2: '무상 증자로 주식을 무상 분배한다는 건 맞지만, 이 문단의 중심 내용이라고 보긴 어려워. 내가 더 확인하고 싶은 건 이거야.',
      gap1: '무상 증자의 요건은 잘 잡았어. 하나만 더 확인하고 싶어.',
      gap1AfterFix: '맞아, 그렇게 고친 게 맞아. 하나만 더 확인하고 싶어.',
      correction: '무상 증자에 주주 총회 의결이 필요하다고 했는데, 문단에서 무상 증자의 실행 요건을 어떻게 말하는지 다시 볼래?',
      missingB: (got) => `${got ? '무상 증자의 요건은 잘 잡았어. ' : ''}아직 빠진 부분은 배당은 자산이 외부로 유출되기 때문에 주주 총회 의결 등 더 까다로운 요건이 필요하다는 점이야.`,
      missingAB: '아직 빠진 부분은 무상 증자는 자산 규모가 그대로라 이사회 결정만으로 되고, 배당은 자산이 빠져나가 더 까다로운 요건이 필요하다는 대비야.',
      noResponse: '괜찮아, 이번엔 내가 정리해 줄게.',
    },
  },
  infoAsym: {
    passageId: 'information-asymmetry-free-marketplace', paragraphId: 'information-asymmetry-free-marketplace-p4', title: '정보 비대칭과 사상의 자유 시장 이론 · 문단 4',
    core: '비판론은 허위·왜곡 정보가 넘쳐나면 의견 간 경쟁이 이루어질 수 없고 민주적 의사 결정이 왜곡된다고 본다. 그래서 플랫폼과 정부의 공동 규제를 강화해야 한다고 주장한다.',
    parts: { A: '허위·왜곡 정보가 대량 공급되면 의견 경쟁이 불가능하고 의사 결정이 왜곡된다(근거)', B: '그래서 플랫폼과 정부의 공동 규제를 강화해야 한다(주장)' },
    sentences: {
      A: '비판론에 따르면, 진실한 정보는 과소 공급되고 허위·왜곡 정보가 대량 공급되는 상황에서는 다양한 의견 간의 경쟁이 이루어질 수 없다.',
      B: '이러한 입장에 따라 비판론은 민주주의 의사 결정의 왜곡을 막기 위해 플랫폼과 정부의 공동 규제가 강화되어야 한다고 주장한다.',
      derive: '사상의 자유 시장 이론에 대한 비판론도 제기되었다.',
    },
    questions: { A: '비판론은 사상의 자유 시장이 왜 제대로 작동하지 않는다고 볼까?', B: '그래서 비판론은 무엇을 해야 한다고 주장할까?' },
    say: {
      captured: '비판론은 허위 정보가 넘치면 의견 경쟁이 안 되고 민주적 결정이 왜곡되니까, 플랫폼과 정부가 함께 규제해야 한다고 본다.',
      captured2: '허위·왜곡 정보 때문에 사상의 경쟁이 안 되므로 플랫폼과 정부의 공동 규제를 강화하자는 게 비판론이다.',
      copy: '이러한 입장에 따라 비판론은 민주주의 의사 결정의 왜곡을 막기 위해 플랫폼과 정부의 공동 규제가 강화되어야 한다고 주장한다.',
      irrelevant: '잘 모르겠어.',
      nonCore: '사상의 자유 시장 이론에 대한 비판론이 있다.',
      onlyA: '비판론은 허위 정보가 대량으로 퍼지면 다양한 의견 간의 경쟁이 이루어질 수 없다고 본다.',
      oneErrWithB: '비판론은 허위 정보가 많아질수록 의견 경쟁이 더 활발해진다고 본다. 그래서 플랫폼과 정부가 함께 규제해야 한다고 주장한다.',
      oneErrNoB: '비판론은 허위 정보가 많아질수록 의견 경쟁이 더 활발해진다고 본다.',
      multi: '비판론은 허위 정보도 의견 경쟁으로 걸러진다고 보고, 그래서 정부는 개입하지 말아야 한다고 주장한다.',
      fixResolvedFull: '아, 허위 정보가 넘치면 오히려 의견 경쟁이 안 된다는 거구나.',
      fixResolvedPartial: '허위 정보가 넘치면 의견 경쟁이 이루어질 수 없다는 거였네.',
      fixFailed: '그래도 정보가 많을수록 사람들이 더 많이 비교할 수 있으니까 경쟁이 활발해질 것 같아.',
      g2Filled: '1. 허위 정보가 넘쳐서 의견 경쟁이 안 되고 민주적 결정이 왜곡되니까.\n2. 플랫폼과 정부가 같이 규제를 강화해야 한다고.',
      g2Partial: '허위 정보가 너무 많으면 의견 간 경쟁이 안 된다고 봐.',
      g2Irrelevant: '모르겠어.',
      g2Errors: '정부가 너무 많이 개입해서.\n정부는 빠지고 플랫폼이 알아서 하게 둬야 한다고.',
      g2ErrorPlusBlank: '의견 경쟁이 너무 활발해서.\n잘 모르겠어.',
      g1Filled: '플랫폼과 정부가 함께 규제를 강화해야 한다고 주장해.',
      g1Vague: '뭔가 대책이 필요하다고.',
      g1Irrelevant: '모르겠어.',
      g1Error: '정부는 손을 떼고 시장에 맡겨야 한다고.',
      g1OtherError: '헌법 재판소는 실명 확인 규정을 합헌이라고 했어.',
    },
    g1OtherRelevant: false,
    errors: {
      relMany: { quote: '허위 정보가 많아질수록 의견 경쟁이 더 활발해진다고 본다', part: 'A', fix: '반대야. 비판론은 허위 정보가 넘치면 의견 경쟁이 이루어질 수 없다고 봐.' },
      relManyMulti: { quote: '허위 정보도 의견 경쟁으로 걸러진다고 보고', part: 'A', fix: '그건 사상의 자유 시장 이론의 입장이야. 비판론은 허위 정보가 넘치면 의견 경쟁이 이루어질 수 없다고 봐.' },
      purposeFlexMulti: { quote: '정부는 개입하지 말아야 한다고 주장한다', part: 'B', fix: '비판론은 오히려 플랫폼과 정부의 공동 규제를 강화해야 한다고 주장해.' },
      relManyFrag: { quote: '정부가 너무 많이 개입해서.', part: 'A', fix: '정부 개입이 문제가 아니라, 허위 정보가 넘쳐 의견 경쟁이 이루어질 수 없다는 게 비판론의 근거야.' },
      purposeFlexFrag: { quote: '정부는 빠지고 플랫폼이 알아서 하게 둬야 한다고.', part: 'B', fix: '정부가 빠지는 게 아니라, 플랫폼과 정부가 함께 규제를 강화해야 한다는 거야.' },
      relNone: { quote: '의견 경쟁이 너무 활발해서.', part: 'A', fix: '경쟁이 너무 활발한 게 아니라, 허위 정보 때문에 경쟁이 이루어질 수 없다는 거야.' },
      purposeChange: { quote: '정부는 손을 떼고 시장에 맡겨야 한다고.', part: 'B', fix: '시장에 맡기자는 게 아니라, 플랫폼과 정부의 공동 규제를 강화하자는 주장이야.' },
    },
    reply: {
      praiseShort: '허위 정보로 의견 경쟁이 무너진다는 근거와 공동 규제라는 주장을 함께 잡았네.',
      praiseAfter: '질문에 답하면서 비판론의 근거와 주장을 모두 채웠어.',
      retry: '문단 문장을 거의 그대로 옮겨 적었네. 비판론이 무엇을 주장하는지 네 말로 다시 써 볼래?',
      gap2: '사상의 자유 시장 이론에 비판론이 있다는 건 맞지만, 이 문단의 중심 내용이라고 보긴 어려워. 내가 더 확인하고 싶은 건 이거야.',
      gap1: '비판론의 근거는 잘 잡았어. 하나만 더 확인하고 싶어.',
      gap1AfterFix: '맞아, 그렇게 고친 게 맞아. 하나만 더 확인하고 싶어.',
      correction: '허위 정보가 많아질수록 의견 경쟁이 활발해진다고 했는데, 문단에서 비판론이 이 상황을 어떻게 보는지 다시 볼래?',
      missingB: (got) => `${got ? '비판론의 근거는 잘 잡았어. ' : ''}아직 빠진 부분은 그래서 플랫폼과 정부의 공동 규제를 강화해야 한다는 비판론의 주장이야.`,
      missingAB: '아직 빠진 부분은 허위 정보가 넘치면 의견 경쟁이 이루어질 수 없다는 근거와, 그래서 공동 규제를 강화해야 한다는 주장이야.',
      noResponse: '괜찮아, 이번엔 내가 정리해 줄게.',
    },
  },
  surface: {
    passageId: 'surface-tension-laplace', paragraphId: 'surface-tension-laplace-p2', title: '표면 장력과 라플라스 식 · 문단 2',
    core: '폐포를 둘러싼 액체층의 표면 장력은 폐포를 수축시키는 압력으로 작용한다. 그런데 계면 활성제가 이 표면 장력을 낮춰 폐포가 쉽게 확장되게 한다.',
    parts: { A: '액체층의 표면 장력은 폐포를 수축시키는 압력으로 작용한다(원인)', B: '계면 활성제가 표면 장력을 낮춰 폐포 확장이 쉬워진다(조절과 결과)' },
    sentences: {
      A: '폐포를 둘러싸고 있는 액체층의 표면 장력은 폐포를 수축하게 하는 압력으로 작용한다.',
      B: '그런데 지질과 단백질로 구성된 계면 활성제가 분비되어 액체층의 표면 장력을 낮춘다.',
      B_alt: '이에 따라 폐포의 확장이 쉬워진다.',
      derive: '라플라스 식은 사람이 호흡할 때 폐포에 작용하는 압력과 표면 장력 사이의 관계를 설명할 때도 유용하다.',
    },
    questions: { A: '폐포를 둘러싼 액체층의 표면 장력은 폐포에 어떤 영향을 줄까?', B: '그런데 폐포가 쉽게 확장될 수 있는 까닭은 뭘까?' },
    say: {
      captured: '표면 장력은 폐포를 오므라들게 하는데, 계면 활성제가 표면 장력을 낮춰서 폐포가 쉽게 부풀 수 있다.',
      captured2: '액체층 표면 장력이 폐포를 수축시키지만 계면 활성제가 그걸 줄여 줘서 폐포 확장이 쉬워진다.',
      copy: '폐포를 둘러싸고 있는 액체층의 표면 장력은 폐포를 수축하게 하는 압력으로 작용한다.',
      irrelevant: '잘 모르겠어.',
      nonCore: '폐포에는 공기가 드나든다.',
      onlyA: '폐포를 둘러싼 액체층의 표면 장력은 폐포를 수축시키는 압력으로 작용한다.',
      oneErrWithB: '표면 장력은 폐포를 팽창시키는 압력으로 작용한다. 계면 활성제는 표면 장력을 낮춰서 폐포가 쉽게 확장되게 한다.',
      oneErrNoB: '표면 장력은 폐포를 팽창시키는 압력으로 작용한다.',
      multi: '표면 장력은 폐포를 팽창시키고, 계면 활성제는 표면 장력을 높여서 폐포가 잘 부풀게 한다.',
      fixResolvedFull: '아, 표면 장력은 폐포를 수축시키는 쪽이구나.',
      fixResolvedPartial: '표면 장력은 폐포를 수축시키는 압력이었네.',
      fixFailed: '표면 장력이 표면을 팽팽하게 당기니까 폐포가 부푸는 것 같아.',
      g2Filled: '1. 폐포를 수축시키는 압력으로 작용해.\n2. 계면 활성제가 표면 장력을 낮춰 주니까.',
      g2Partial: '표면 장력은 폐포를 수축시키는 압력으로 작용해.',
      g2Irrelevant: '모르겠어.',
      g2Errors: '폐포를 팽창시켜.\n계면 활성제가 표면 장력을 높여서.',
      g2ErrorPlusBlank: '폐포를 부풀게 해.\n잘 모르겠어.',
      g1Filled: '계면 활성제가 표면 장력을 낮춰 주니까 확장이 쉬워져.',
      g1Vague: '뭔가 도와주는 게 있어서.',
      g1Irrelevant: '모르겠어.',
      g1Error: '계면 활성제가 표면 장력을 높여서.',
      g1OtherError: '물방울은 원래 정육면체 모양이잖아.',
    },
    g1OtherRelevant: false,
    errors: {
      relMany: { quote: '표면 장력은 폐포를 팽창시키는 압력으로 작용한다', part: 'A', fix: '반대야. 표면 장력은 폐포를 수축시키는 압력으로 작용해.' },
      relManyMulti: { quote: '표면 장력은 폐포를 팽창시키고', part: 'A', fix: '표면 장력은 폐포를 팽창시키는 게 아니라 수축시키는 압력으로 작용해.' },
      purposeFlexMulti: { quote: '계면 활성제는 표면 장력을 높여서', part: 'B', fix: '계면 활성제는 표면 장력을 높이는 게 아니라 낮춰서 폐포 확장을 쉽게 해.' },
      relManyFrag: { quote: '폐포를 팽창시켜.', part: 'A', fix: '표면 장력은 폐포를 팽창시키는 게 아니라 수축시키는 압력이야.' },
      purposeFlexFrag: { quote: '계면 활성제가 표면 장력을 높여서.', part: 'B', fix: '계면 활성제는 표면 장력을 낮춰서 확장을 쉽게 해.' },
      relNone: { quote: '폐포를 부풀게 해.', part: 'A', fix: '표면 장력은 폐포를 부풀게 하는 게 아니라 수축시키는 쪽으로 작용해.' },
      purposeChange: { quote: '계면 활성제가 표면 장력을 높여서.', part: 'B', fix: '계면 활성제는 표면 장력을 높이는 게 아니라 낮춰서 폐포가 쉽게 확장돼.' },
    },
    reply: {
      praiseShort: '표면 장력이 폐포를 수축시키고 계면 활성제가 그걸 낮춰 확장을 돕는다는 흐름을 잡았네.',
      praiseAfter: '질문에 답하면서 표면 장력의 작용과 계면 활성제의 역할을 모두 채웠어.',
      retry: '문단 문장을 거의 그대로 옮겨 적었네. 폐포에서 무슨 일이 일어나는지 네 말로 다시 써 볼래?',
      gap2: '폐포에 공기가 드나든다는 건 맞지만, 이 문단의 중심 내용이라고 보긴 어려워. 내가 더 확인하고 싶은 건 이거야.',
      gap1: '표면 장력이 폐포를 수축시킨다는 건 잘 잡았어. 하나만 더 확인하고 싶어.',
      gap1AfterFix: '맞아, 그렇게 고친 게 맞아. 하나만 더 확인하고 싶어.',
      correction: '표면 장력이 폐포를 팽창시킨다고 했는데, 문단에서 표면 장력이 폐포에 어떤 압력으로 작용한다고 하는지 다시 볼래?',
      missingB: (got) => `${got ? '표면 장력이 폐포를 수축시킨다는 건 잘 잡았어. ' : ''}아직 빠진 부분은 계면 활성제가 표면 장력을 낮춰 폐포 확장을 쉽게 한다는 점이야.`,
      missingAB: '아직 빠진 부분은 표면 장력이 폐포를 수축시키는 압력으로 작용한다는 점과, 계면 활성제가 그 표면 장력을 낮춰 확장을 쉽게 한다는 점이야.',
      noResponse: '괜찮아, 이번엔 내가 정리해 줄게.',
    },
  },
};

// ── 단계 만들기 ──────────────────────────────────────────────
const coreBubble = (p, intro = '내가 파악한 이 문단의 핵심은 이거야.') => ({ label: '문단 핵심', text: intro, box: p.core });
const fixBubbles = (p, keys, intro) => [{ label: '바로잡기', text: intro }, ...keys.map(k => ({ label: '바로잡기', quote: p.errors[k].quote, text: p.errors[k].fix }))];
const step = (stage, student, expect, tutor) => ({ stage, student, expect, tutor });

// 첫 요약·다시 쓴 요약 단계
const S = {
  captured: (p, stage) => step(stage, stage === 'INITIAL' ? p.say.captured : p.say.captured2,
    { category: 'CAPTURED', action: 'PRAISE', bubbles: ['피드백'], highlights: [], points: ['잡은 핵심(두 부분)을 구체적으로 칭찬', '핵심 상자 없음'] },
    [{ label: '피드백', text: p.reply.praiseShort }]),
  copy: p => step('INITIAL', p.say.copy,
    { category: 'COPY', action: 'RETRY_PROMPT', bubbles: ['다시 써 보기'], highlights: [], points: ['옮겨 적었다고 말하고 자기 말로 다시 쓰게 함', '문단 내용을 알려 주지 않음'] },
    [{ label: '다시 써 보기', text: p.reply.retry }]),
  noResponse: p => step('RETRY', p.say.irrelevant,
    { category: 'IRRELEVANT', action: 'CLOSE_NO_RESPONSE', bubbles: ['문단 핵심(도입+상자)'], highlights: ['B'], highlightNote: '핵심을 가장 직접 담은 문장 하나(B 문장이 유력)', points: ['대신 정리해 주겠다는 도입', '상자에 문단 핵심'] },
    [{ label: '문단 핵심', text: p.reply.noResponse, box: p.core }]),
  gap2: p => step('INITIAL', p.say.nonCore,
    { category: 'GAP', action: 'GAP_QUESTION', gaps: ['A', 'B'], bubbles: ['생각해 보기(번호 질문 2)'], highlights: [], points: ['응답이 사실이지만 중심 내용이 아니라고 분명히 말함(인정하지 않음)', '질문 1은 A(관계/작용), 질문 2는 B(목적/결과)를 방향만 물음', '답이 되는 개념어를 질문에 넣지 않음'] },
    [{ label: '생각해 보기', text: p.reply.gap2, items: [p.questions.A, p.questions.B] }]),
  gap1: (p, stage) => step(stage, p.say.onlyA,
    { category: 'GAP', action: 'GAP_QUESTION', gaps: ['B'], bubbles: ['생각해 보기(번호 질문 1)'], highlights: [], points: ['잡은 A를 짧게 인정', '질문 하나로 B를 방향만 물음'] },
    [{ label: '생각해 보기', text: p.reply.gap1, items: [p.questions.B] }]),
  oneError: (p, stage, withB) => step(stage, withB ? p.say.oneErrWithB : p.say.oneErrNoB,
    { category: 'ONE_ERROR', action: 'CORRECTION_QUESTION', errors: [{ key: 'relMany', part: 'A', gapIndex: null }], bubbles: ['확인하기'], highlights: [], points: ['학생 말의 어느 부분인지 짚고, 그 부분을 문단이 어떻게 말하는지 묻는 열린 질문(맞는지 예/아니오로 묻지 않음)', '맞는 답을 알려 주지 않음', withB ? 'B는 이미 말함' : 'B가 빠져 있어도 확인 질문만'] },
    [{ label: '확인하기', text: p.reply.correction }]),
  multi: (p, stage) => step(stage, p.say.multi,
    { category: 'MULTI_ERROR', action: 'CLOSE_ERRORS', errors: [{ key: 'relManyMulti', part: 'A', gapIndex: null }, { key: 'purposeFlexMulti', part: 'B', gapIndex: null }], missingNote: false, bubbles: ['바로잡기(도입)', '바로잡기', '바로잡기', '바로잡기(마무리+상자)'], highlights: ['A', 'B'], points: ['질문 없이 오류 2개를 각각 인용하고 바로잡음', '마지막 말풍선에 마무리 피드백과 부분별 핵심 상자'] },
    [...fixBubbles(p, ['relManyMulti', 'purposeFlexMulti'], '지문과 다른 점이 두 군데 있어서 하나씩 볼게.'), coreBubble(p, '내가 보는 이 문단의 핵심은 이래.')]),
};

// 확인 질문에 한 답 (AFTER_CORRECTION)
const C = {
  bare: p => step('AFTER_CORRECTION', '맞지 않아.',
    { category: 'ONE_ERROR', action: 'CLOSE_ERRORS', targetErrorResolved: false, errors: [{ key: 'relMany', part: 'A', gapIndex: null }], missingNote: false, bubbles: ['바로잡기(도입)', '바로잡기', '바로잡기(마무리+상자)'], highlights: ['A'], points: ['내용 없이 다르다고만 함 → 고침 아님', '도입에서 다르다는 걸 알아챈 점은 짧게 인정(고쳤다고 하지 않음)', '그 오류를 인용하고 바로잡음', '마지막 말풍선에 마무리 피드백과 부분별 핵심 상자'] },
    [{ label: '바로잡기', text: '맞아, 지문과 달라. 어떻게 다른지 짚어 볼게.' }, ...fixBubbles(p, ['relMany'], '').slice(1), coreBubble(p, '내가 보는 이 문단의 핵심은 이래.')]),
  unknown: p => step('AFTER_CORRECTION', '잘 모르겠어.',
    { category: 'ONE_ERROR', action: 'CLOSE_ERRORS', targetErrorResolved: false, errors: [{ key: 'relMany', part: 'A', gapIndex: null }], missingNote: false, bubbles: ['바로잡기(도입)', '바로잡기', '바로잡기(마무리+상자)'], highlights: ['A'], points: ['모르겠다는 답은 고침 아님', '알아챘다고 인정하지 않음', '그 오류를 인용하고 바로잡음'] },
    [...fixBubbles(p, ['relMany'], '괜찮아, 지문과 다른 부분을 같이 볼게.'), coreBubble(p, '내가 보는 이 문단의 핵심은 이래.')]),
  resolvedCaptured: p => step('AFTER_CORRECTION', p.say.fixResolvedFull,
    { category: 'CAPTURED', action: 'PRAISE', targetErrorResolved: true, bubbles: ['피드백(상자)'], highlights: [], points: ['고친 것을 칭찬하는 피드백 아래 부분별 핵심 상자'] },
    [coreBubble(p), { label: '피드백', text: '바로 고쳤네. 이제 두 부분을 모두 잡았어.' }]),
  resolvedGap: p => step('AFTER_CORRECTION', p.say.fixResolvedPartial,
    { category: 'GAP', action: 'GAP_QUESTION', targetErrorResolved: true, gaps: ['B'], bubbles: ['생각해 보기(번호 질문 1)'], highlights: [], points: ['고친 것을 인정', '두 번째(마지막) 질문으로 B를 방향만 물음'] },
    [{ label: '생각해 보기', text: p.reply.gap1AfterFix, items: [p.questions.B] }]),
  failed: p => { const keys = p.fixFailedErrors ?? ['relMany']; return step('AFTER_CORRECTION', p.say.fixFailed,
    { category: keys.length > 1 ? 'MULTI_ERROR' : 'ONE_ERROR', action: 'CLOSE_ERRORS', targetErrorResolved: false, errors: keys.map(k => ({ key: k, part: p.errors[k].part, gapIndex: null })), missingNote: false, bubbles: ['바로잡기(도입)', ...keys.map(() => '바로잡기'), '바로잡기(마무리+상자)'], highlights: [...new Set(keys.map(k => p.errors[k].part))], points: ['앞서 확인한 오류가 남았다는 도입', keys.length > 1 ? '남은 오류와 새로 틀린 목적을 각각 인용하고 바로잡음' : '그 오류를 인용하고 바로잡음', '마지막 말풍선에 마무리 피드백과 부분별 핵심 상자'] },
    [...fixBubbles(p, keys, '앞에서 확인한 부분이 아직 문단과 달라.'), coreBubble(p, '내가 보는 이 문단의 핵심은 이래.')]); },
};

// 구멍 질문에 한 답 (AFTER_GAP). asked: ['A','B'] 또는 ['B']. gotA: 앞서 A를 말했는지(빠진 내용 인정용)
const G = {
  filled: (p, asked) => step('AFTER_GAP', asked.length === 2 ? p.say.g2Filled : p.say.g1Filled,
    { category: 'CAPTURED', action: 'PRAISE', targetGapsFilled: asked.map(() => true), bubbles: ['피드백(상자)'], highlights: [], points: ['각 답을 질문과 합쳐 읽어 모두 채움', '칭찬하는 피드백 아래 부분별 핵심 상자'] },
    [coreBubble(p), { label: '피드백', text: p.reply.praiseAfter }]),
  partial: (p, asked) => asked.length === 2
    ? step('AFTER_GAP', p.say.g2Partial,
      { category: 'GAP', action: 'CLOSE_GAP', targetGapsFilled: [true, false], bubbles: ['빠진 내용(상자)'], highlights: ['B'], points: ['A는 채움, B는 못 채움(오류 아님)', '잡은 A를 짧게 인정하고 아직 빠진 B를 말함', '중요도 비교 없음'] },
      [coreBubble(p, '내가 생각한 이 문단의 핵심 내용은 이거야.'), { label: '빠진 내용', text: p.reply.missingB(true) }])
    : step('AFTER_GAP', p.say.g1Vague,
      { category: 'GAP', action: 'CLOSE_GAP', targetGapsFilled: [false], bubbles: ['빠진 내용(상자)'], highlights: ['B'], points: ['모호한 답은 오류가 아니라 못 채움', '앞서 잡은 A를 짧게 인정하고 아직 빠진 B를 말함'] },
      [coreBubble(p, '내가 생각한 이 문단의 핵심 내용은 이거야.'), { label: '빠진 내용', text: p.reply.missingB(true) }]),
  irrelevant: (p, asked) => step('AFTER_GAP', asked.length === 2 ? p.say.g2Irrelevant : p.say.g1Irrelevant,
    { category: 'IRRELEVANT', action: 'CLOSE_GAP', targetGapsFilled: asked.map(() => false), bubbles: ['빠진 내용(상자)'], highlights: asked, points: ['물은 항목 모두 못 채움', asked.length === 2 ? '빠진 부분으로 A·B 모두 말함(잡은 것 없음)' : '앞서 잡은 A를 인정하고 B가 빠졌다고 말함'] },
    [coreBubble(p, '내가 생각한 이 문단의 핵심 내용은 이거야.'), { label: '빠진 내용', text: asked.length === 2 ? p.reply.missingAB : p.reply.missingB(true) }]),
  errors: (p, asked) => asked.length === 2
    ? step('AFTER_GAP', p.say.g2Errors,
      { category: 'MULTI_ERROR', action: 'CLOSE_ERRORS', targetGapsFilled: [false, false], errors: [{ key: 'relManyFrag', part: 'A', gapIndex: 0 }, { key: 'purposeFlexFrag', part: 'B', gapIndex: 1 }], missingNote: false, bubbles: ['바로잡기(도입)', '바로잡기', '바로잡기', '바로잡기(마무리+상자)'], highlights: ['A', 'B'], points: ['조각 답을 질문과 합쳐 읽음(둘째 답은 목적/결과 주장으로)', '오류 2개, 각각 질문 1·2에 연결', '물은 항목 모두 바로잡기로 응답'] },
      [...fixBubbles(p, ['relManyFrag', 'purposeFlexFrag'], '네 답에서 지문과 다른 점을 하나씩 볼게.'), coreBubble(p, '내가 보는 이 문단의 핵심은 이래.')])
    : step('AFTER_GAP', p.say.g1Error,
      { category: 'ONE_ERROR', action: 'CLOSE_ERRORS', targetGapsFilled: [false], errors: [{ key: 'purposeChange', part: 'B', gapIndex: 0 }], missingNote: false, bubbles: ['바로잡기(도입)', '바로잡기', '바로잡기(마무리+상자)'], highlights: ['B'], points: ['답을 질문과 합쳐 읽어 B에 대한 틀린 주장으로 판정', '오류 1개(질문 1)'] },
      [...fixBubbles(p, ['purposeChange'], '네 답에서 지문과 다른 점을 짚어 볼게.'), coreBubble(p, '내가 보는 이 문단의 핵심은 이래.')]),
  errorPlusUncovered: (p, asked) => asked.length === 2
    ? step('AFTER_GAP', p.say.g2ErrorPlusBlank,
      { category: 'ONE_ERROR', action: 'CLOSE_ERRORS', targetGapsFilled: [false, false], targetGapReadingsNote: '둘째 읽기는 빈 문자열', errors: [{ key: 'relNone', part: 'A', gapIndex: 0 }], missingNote: true, bubbles: ['바로잡기(도입)', '바로잡기', '바로잡기(마무리+상자)'], highlights: ['A', 'B'], points: ['질문 1 답은 오류(gapIndex 0)', '질문 2 "모르겠어"는 오류 아님·못 채움 → 마무리 피드백이 이 항목에 응답', '물은 항목 모두 응답받음'] },
      [...fixBubbles(p, ['relNone'], '네 답에서 지문과 다른 점을 짚어 볼게.'), { label: '빠진 내용', text: p.reply.missingB(false) }, coreBubble(p, '내가 보는 이 문단의 핵심은 이래.')])
    : !p.g1OtherRelevant ? step('AFTER_GAP', p.say.g1OtherError,
      { category: 'GAP', action: 'CLOSE_GAP', targetGapsFilled: [false], bubbles: ['빠진 내용(상자)'], highlights: ['B'], points: ['질문과 무관한 말(다른 대상의 성질)은 맞든 틀리든 판정하지 않음(오류로 세지 않고 바로잡지 않음)', '빠진 내용에서 질문과 다른 이야기였다고 짧게 짚고 B가 빠졌다고 말함'] },
      [coreBubble(p, '내가 생각한 이 문단의 핵심 내용은 이거야.'), { label: '빠진 내용', text: `질문과는 다른 이야기를 했어. ${p.reply.missingB(true)}` }])
    : step('AFTER_GAP', p.say.g1OtherError,
      { category: 'ONE_ERROR', action: 'CLOSE_ERRORS', targetGapsFilled: [false], errors: [{ key: 'relManyOther', part: 'A', gapIndex: 0 }], missingNote: false, bubbles: ['바로잡기(도입)', '바로잡기', '바로잡기(마무리+상자)'], highlights: ['A'], points: ['물은 것(이유)에 대한 답의 형태로 틀린 이유를 댐 → 질문 1번의 오류(v4.4 원칙)', '물은 항목이 바로잡기로 응답받았으므로 빠진 내용 말풍선 없음'] },
      [...fixBubbles(p, ['relManyOther'], '네 답에서 지문과 다른 점을 짚어 볼게.'), coreBubble(p, '내가 보는 이 문단의 핵심은 이래.')]),
};
const gLeaves = ['filled', 'partial', 'irrelevant', 'errors', 'errorPlusUncovered'];
const gName = { filled: '물은 항목 모두 채움', partial: '일부 못 채움(오류 없음)', irrelevant: '무관한 말', errors: '오류, 물은 항목 모두 오류/채움', errorPlusUncovered: '오류 + 오류도 채움도 아닌 항목' };

// ── 경로 조립: 전체 경로 수형도(P01~P29)와 같은 순서 ─────────────
function paths(p) {
  const out = [];
  const add = (name, steps, outcome) => out.push({ name, steps, outcome });
  const outOf = s => ({ PRAISE: 'CAPTURED', CLOSE_GAP: 'GAP_REVEALED', CLOSE_ERRORS: 'ERRORS_REVEALED', CLOSE_NO_RESPONSE: 'NO_RESPONSE' })[s.expect.action];
  const fin = (name, steps) => add(name, steps, outOf(steps.at(-1)));
  // P01
  fin('첫 요약: 핵심 잡음', [S.captured(p, 'INITIAL')]);
  // P02~P16: 첫 요약 복사 → 다시 쓰기
  const r0 = S.copy(p);
  fin('복사 → 다시 쓴 요약: 핵심 잡음', [r0, S.captured(p, 'RETRY')]);
  fin('복사 → 다시 쓴 요약: 다시 무관', [r0, S.noResponse(p)]);
  for (const g of gLeaves) fin(`복사 → 다시 쓴 요약: 구멍(하나) → ${gName[g]}`, [r0, S.gap1(p, 'RETRY'), G[g](p, ['B'])]);
  fin('복사 → 다시 쓴 요약: 오류 하나 → 고침 + 핵심', [r0, S.oneError(p, 'RETRY', true), C.resolvedCaptured(p)]);
  for (const g of gLeaves) fin(`복사 → 다시 쓴 요약: 오류 하나 → 고침 + 구멍 → ${gName[g]}`, [r0, S.oneError(p, 'RETRY', false), C.resolvedGap(p), G[g](p, ['B'])]);
  fin('복사 → 다시 쓴 요약: 오류 하나 → 못 고침', [r0, S.oneError(p, 'RETRY', true), C.failed(p)]);
  fin('복사 → 다시 쓴 요약: 오류 둘 이상', [r0, S.multi(p, 'RETRY')]);
  // P17~P21
  for (const g of gLeaves) fin(`첫 요약: 구멍(둘) → ${gName[g]}`, [S.gap2(p), G[g](p, ['A', 'B'])]);
  // P22~P28
  fin('첫 요약: 오류 하나 → 고침 + 핵심', [S.oneError(p, 'INITIAL', true), C.resolvedCaptured(p)]);
  for (const g of gLeaves) fin(`첫 요약: 오류 하나 → 고침 + 구멍 → ${gName[g]}`, [S.oneError(p, 'INITIAL', false), C.resolvedGap(p), G[g](p, ['B'])]);
  fin('첫 요약: 오류 하나 → 못 고침', [S.oneError(p, 'INITIAL', true), C.failed(p)]);
  // P29
  fin('첫 요약: 오류 둘 이상', [S.multi(p, 'INITIAL')]);
  // P30~P31 (2026-10-22): 교정 질문에 내용 없이 답함
  fin('첫 요약: 오류 하나 → 내용 없이 "맞지 않아"', [S.oneError(p, 'INITIAL', true), C.bare(p)]);
  fin('첫 요약: 오류 하나 → "잘 모르겠어"', [S.oneError(p, 'INITIAL', true), C.unknown(p)]);
  return out;
}

const cases = [];
for (const [key, p] of Object.entries(P)) {
  paths(p).forEach((path, i) => {
    const id = `P${String(i + 1).padStart(2, '0')}`;
    cases.push({
      caseId: `${key}-${id}`, pathId: id, paragraphKey: key, passageId: p.passageId, paragraphId: p.paragraphId,
      name: path.name, expectedOutcome: path.outcome,
      questionsAsked: path.steps.filter(s => ['GAP_QUESTION', 'CORRECTION_QUESTION'].includes(s.expect.action)).length,
      steps: path.steps.map(s => ({
        stage: s.stage, student: s.student,
        expect: { ...s.expect, highlights: s.expect.highlights.map(h => ({ part: h, sentence: p.sentences[h] })),
          errors: s.expect.errors?.map(e => ({ ...e, studentQuote: p.errors[e.key].quote })) },
        exampleTutor: s.tutor,
      })),
    });
  });
}
if (cases.length !== 31 * Object.keys(P).length) throw new Error(`사례 수 ${cases.length} ≠ ${31 * Object.keys(P).length}`);
if (cases.some(c => c.questionsAsked > 2)) throw new Error('질문 3회 이상 경로');

const meta = {
  schemaVersion: 'simple-holistic-path-simulation-v1', createdAt: '2026-10-17',
  rules: 'paragraph-simple-holistic-v4.1 (D-0140, D-0144, D-0145 + 보완 v4.1)',
  paragraphs: Object.fromEntries(Object.entries(P).map(([k, p]) => [k, { passageId: p.passageId, paragraphId: p.paragraphId, title: p.title, core: p.core, parts: p.parts, sentences: p.sentences, questions: p.questions }])),
  comparison: '질적 동일 기준: 단계별 category·action, AFTER_CORRECTION targetErrorResolved, GAP_QUESTION의 빈 곳 수와 내용(A/B), AFTER_GAP targetGapsFilled와 오류의 gapIndex·내용(A/B), missingNote 유무, 마무리 말풍선 구성, 지문 표시 문장(A/B), points의 방향. exampleTutor 문구는 방향 예시이며 비교 대상이 아니다.',
  runnerNote: '실험 시 모델 출력의 gaps를 다음 단계 targetGaps로, 직전 단계의 튜터 말풍선(번호 질문 포함)을 dialogue로 이어 붙인다. 앞 단계가 기대와 달라 경로가 갈라지면 그 지점에서 멈추고 갈라짐으로 기록한다.',
};
writeFileSync(join(here, 'cases.json'), JSON.stringify({ meta, cases }, null, 2) + '\n');

// 읽기용 문서
const outLabel = { CAPTURED: '핵심을 잡음', GAP_REVEALED: '빠진 내용 공개', ERRORS_REVEALED: '바로잡고 공개', NO_RESPONSE: '응답 없음' };
const lines = ['# 단순 형식 문단 전체 경로 시뮬레이션 (2026-10-17)', '',
  '`build.mjs`가 생성한다. 손으로 고치지 말고 생성기를 고친다.', '',
  `- 규칙: ${meta.rules}`, `- 사례: 문단 ${Object.keys(P).length}개 × 경로 31 = ${cases.length}`, `- 경로 번호는 전체 경로 수형도(https://claude.ai/artifact/JivxbidCQbSLA4HdS7TCxd)의 P01~P29와 같다. P30·P31은 2026-10-22에 더한 교정 질문 무내용 답 경로다.`,
  `- ${meta.comparison}`, ''];
for (const [k, p] of Object.entries(P)) {
  lines.push(`## ${p.title}`, '', `- 문단 핵심(모델 판단 예): ${p.core}`, `- A: ${p.parts.A}`, `- B: ${p.parts.B}`, `- A 근거 문장: ${p.sentences.A}`, `- B 근거 문장: ${p.sentences.B}`, '');
  for (const c of cases.filter(c => c.paragraphKey === k)) {
    lines.push(`### ${c.caseId} · ${c.name}`, '', `기대 결과: ${outLabel[c.expectedOutcome]} · 질문 ${c.questionsAsked}회`, '');
    c.steps.forEach((s, i) => {
      const e = s.expect;
      const judge = [`${e.category} → ${e.action}`, e.targetErrorResolved !== undefined && `고침=${e.targetErrorResolved}`, e.gaps && `빈 곳 ${e.gaps.join('·')}`, e.targetGapsFilled && `채움 ${JSON.stringify(e.targetGapsFilled)}`,
        e.errors?.length && `오류 ${e.errors.map(x => `${x.part}${x.gapIndex !== null ? `(질문 ${x.gapIndex + 1})` : ''}`).join('·')}`].filter(Boolean).join(' · ');
      lines.push(`${i + 1}. **${s.stage}** 학생: “${s.student.replace(/\n/g, ' / ')}”`, `   - 기대 판정: ${judge}`, `   - 말풍선: ${e.bubbles.join(' → ')} · 지문 표시: ${e.highlights.length ? e.highlights.map(h => h.part).join('·') : '없음'}`, `   - 확인할 방향: ${e.points.join('; ')}`);
      for (const t of s.exampleTutor) lines.push(`   - 예시 〔${t.label}〕 ${t.quote ? `(“${t.quote}”) ` : ''}${t.text}${t.items ? ' ' + t.items.map((q, j) => `${j + 1}. ${q}`).join(' ') : ''}${t.box ? ` ［${t.box}］` : ''}`);
    });
    lines.push('');
  }
}
writeFileSync(join(here, 'SIMULATION.md'), lines.join('\n'));
console.log(`cases ${cases.length}`, Object.entries(cases.reduce((m, c) => (m[c.expectedOutcome] = (m[c.expectedOutcome] ?? 0) + 1, m), {})).map(([k, v]) => `${k}=${v}`).join(' '));
