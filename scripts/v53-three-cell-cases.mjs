// Handoff 2026-10-27-problem-feedback-k4-judgment-redesign, stage 2: v5.3 three-cell judgment on real items only (no invented choices).
// First judgment only (correct picks end with the end explanation). Each rationale runs 3 times: V5_LIVE_CHECK_SET=K4*3,...
const C = (id, group, questionId, choiceId, path, rationale) => ({ id, group, questionId, choiceId, rationale, replies: [], full: false, path });
const K = 'corporate-law-q13', D = 'dopamine-motor-control-q13', M = 'mrna-vaccine-lipid-nanoparticle-q19', S = 'surface-tension-laplace-q16';
export const cases = [
  // P: negative stem, correct pick, expect SUPPORTED (K4/DA non-official falsity point, K1 official). Rationales from v5.2 cases (W 90dacd2).
  C('K4', 'P', K, 'C2', 'P-point4-legal-personality', '주식회사 법인격의 부여 대상은 단체, not 개인'),
  C('K1', 'P', K, 'C2', 'P-point1-authority-basis', '권한은 재산을 낸 것과 상관없이 법령 안에서 이사회나 특정 개인에게 주어지는 거라, 출연 때문에 권한이 생겼다고 할 수 없음.'),
  C('DA', 'P', D, 'C2', 'P-synthesis-not-breakdown-enzyme', '카르비도파가 막는 건 레보도파를 도파민으로 만드는 효소지 도파민을 분해하는 효소가 아니니까, 이미 만들어진 도파민의 작용 기간을 늘린다고 볼 수 없음. 그래서 2번이 적절하지 않음.'),
  // I: negative stem, correct pick, expect INSUFFICIENT (KC CONCLUSION_ONLY, KF BLANK_UNSUPPORTED).
  C('KC', 'I', K, 'C2', 'I-restated-conclusion', '출연했다고 권한이 생기는 건 아님.'),
  C('KF', 'I', K, 'C2', 'I-blank-no-cue', '법인격은 단체에 부여됨.'),
  // X: over-acceptance probes, negative stem, correct pick. XS STRONGER, XA ADDED -> INSUFFICIENT READING_GAP; XB boundary (two blanks, weak cue).
  C('XS', 'X', D, 'C2', 'X-stronger-never-broken-down', '②는 카르비도파 때문에 흑질 도파민이 분해되지 않고 계속 남는다는 말인데, 재흡수된 도파민은 분해 효소로 분해된다고 했으니 계속 남을 수는 없어. 그래서 ②가 적절하지 않아.'),
  C('XA', 'X', K, 'C2', 'X-added-still-personal-property', '②는 갑이 출연한 부동산이 아직 갑 개인 것이라서 권한이 생겼다는 말인데, 법인의 자산은 개인이 출자했어도 법인 소유라고 했으니까 틀렸어.'),
  C('XB', 'X', K, 'C2', 'X-two-blanks-weak-cue', '재산을 낸 사람한테 법인격이 생기는 게 아니라 단체에 생기는 거라서 ②는 틀림.'),
  // Q: positive stem, correct pick. QF all claims -> SUPPORTED; QP viscosity/tension only -> INSUFFICIENT PARTIAL_SUPPORT.
  C('QF', 'Q', S, 'C3', 'Q-full-support', '오네소르게 수는 표면 장력, 밀도, 노즐 지름의 곱이 클수록 작아지는데, 밀도를 두 배로 하고 지름을 반으로 하면 곱이 그대로라서 점도랑 표면 장력이 같으면 오네소르게 수도 그대로야. 그래서 ③이 맞아.'),
  C('QP', 'Q', S, 'C3', 'Q-partial-support', '점도랑 표면 장력은 그대로라고 했으니까 오네소르게 수도 그대로일 거야. 그래서 ③이 맞아.'),
  // W: wrong first pick, expect an error and a correction question (sol).
  C('WR', 'W', M, 'C4', 'W-reading-negative-reversed', '④는 투석하면 수소 이온이 많아진다는 거잖아. 수소 이온이 많으면 이온화 지질은 양이온화되니까 중성이 될 수 없어. 그래서 ④가 틀렸어.'),
  C('WQ', 'W', S, 'C2', 'W-reading-positive-weaker', '②는 첨가제를 넣어서 오네소르게 수가 바뀌었다는 말이잖아. 끈적거림을 줄였으니 오네소르게 수가 작아져서 범위 안으로 들어온 거니까 ②가 맞아.'),
  C('WT', 'W', D, 'C3', 'W-target-levodopa-for-pramipexole', '③이 틀려. (다)는 흑질의 도파민성 뉴런으로 흡수돼서 도파민 합성을 늘리니까 합성 과정에 영향을 줘.'),
  C('WC', 'W', K, 'C4', 'W-content-capital-never-shrinks', '④가 틀려. 자본금은 원칙적으로 감액이 금지되니까 적자가 쌓여도 자본금이 줄어들 일은 없어.'),
  C('WH', 'W', K, 'C1', 'W-inferred-capital-surplus-dividend', '①이 틀린 것 같아요. 자본 잉여금이 남아 있었을 수도 있잖아요.'),
];
if (cases.length !== 15 || new Set(cases.map(c => c.id)).size !== 15) throw new Error('Case set must be 15 unique cases');
