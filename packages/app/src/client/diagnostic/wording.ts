/**
 * 학생용 표현 확정본(D-0209, docs/review/sns-diagnostic-student-wording-draft-2026-11-06.md 1~3절)을 그대로 옮긴 상수.
 * 문구를 고치지 않는다. wording.test.ts가 확정본 마크다운과 글자 하나까지 같은지 대조한다.
 * 코드(`ADDED_CONTENT`, `S4_INTERPRET` 등)는 화면에 내지 않고 이 표를 거쳐 이름만 낸다.
 */

export type TwistCode = 'NEGATION' | 'DIRECTION' | 'SUBSTITUTION' | 'CONFLATION' | 'CAUSE_SWAP' | 'WRONG_REASON' | 'CONDITION_SHIFT' | 'HOLDER_SWAP' | 'PAIR_SWAP' | 'ABSOLUTIZE' | 'SCOPE_EXTEND' | 'DEGREE' | 'ADDED_CONTENT' | 'ADDED_METHOD';
/** 확정본 1절 표 순서(같은 횟수일 때 앞의 것을 고르는 기준). */
export const TWIST_WORDING: Record<TwistCode, { name: string; line: string }> = {
  NEGATION: { name: '긍정·부정 뒤집기', line: '지문에서 \'있다·된다·허용된다\'고 한 것을 \'없다·안 된다·금지된다\'로, 또는 그 반대로 바꿨어.' },
  DIRECTION: { name: '방향 뒤집기', line: '늘어남↔줄어듦, 이쪽→저쪽, 앞↔뒤처럼 변화나 관계의 방향을 반대로 바꿨어.' },
  SUBSTITUTION: { name: '요소 바꿔치기', line: '지문에 나온 대상·물질·수단 하나를 다른 것으로 바꿔 넣었어.' },
  CONFLATION: { name: '다른 두 가지를 같은 것으로', line: '지문이 분명히 구별한 두 가지를 같은 것처럼 섞었어.' },
  CAUSE_SWAP: { name: '원인·근거 바꿔치기', line: '결과는 맞게 썼는데, 그 결과의 원인이나 근거 자리에 다른 것을 넣었어.' },
  WRONG_REASON: { name: '상관없는 두 사실 잇기', line: '둘 다 지문에 있는 맞는 말인데, 원인과 결과가 아닌 두 사실을 원인과 결과처럼 이어 붙였어.' },
  CONDITION_SHIFT: { name: '조건 옮기기', line: '어떤 조건·상황·시점에서만 맞는 내용을 다른 조건·상황·시점에 옮겨 놓았어.' },
  HOLDER_SWAP: { name: '주장의 주인 바꾸기', line: '한 사람·학파·이론의 주장을 다른 쪽의 주장인 것처럼 바꿨어.' },
  PAIR_SWAP: { name: '두 대상의 특징 맞바꾸기', line: '지문이 서로 맞세운 두 대상(㉠과 ㉡ 등)에서 한쪽의 특징을 다른 쪽에 붙였어.' },
  ABSOLUTIZE: { name: '\'모두·반드시\'로 단정하기', line: '대상은 그대로 두고 말을 바꿨어. \'일부\', \'~할 수 있다\', \'~일 때\'처럼 제한하는 말을 \'모두\', \'반드시\', \'어떤 경우에도\', \'~만\'으로.' },
  SCOPE_EXTEND: { name: '적용 범위 넓히기', line: '대상을 넓혔어. 한쪽이나 한 영역에만 맞는 특징을 양쪽이나 다른 영역까지.' },
  DEGREE: { name: '정도 바꾸기', line: '방향은 그대로 두고 정도만 바꿨어.' },
  ADDED_CONTENT: { name: '없는 내용 덧붙이기', line: '지문(〈보기〉 포함)에 없는 기능·원인·사실·단계를 덧붙였어.' },
  ADDED_METHOD: { name: '글이 하지 않은 서술 방식', line: '글이 쓰지 않은 서술 방식(비교, 장단점 분석, 시대순 서술 등)을 썼다고 했어.' },
};
export const TWIST_CODES = Object.keys(TWIST_WORDING) as TwistCode[];
/** `OTHER` 비틂: 이름 대신 이 꼬리표, 한 줄 설명 없음, 함정 집계·추천에서 뺀다. */
export const OTHER_TWIST_NAME = '그 밖의 함정';

export type BranchCode = '내용' | '논증' | '관점' | '흐름';
/** 확정본 2절. 기타 갈래는 화면에 내지 않는다. */
export const BRANCH_WORDING: Record<BranchCode, { name: string; line: string }> = {
  내용: { name: '대상 사이의 관계', line: '원인과 결과, 순서, 조건, 목적, 대조, 종류처럼 지문 속 대상들이 서로 어떻게 이어지는지' },
  논증: { name: '주장과 근거', line: '글이 무엇을 근거로 말하는지, 예를 들어 풀고 원리를 적용하고 예외를 두는지' },
  관점: { name: '사람·이론 사이의 입장', line: '누가 누구와 생각이 같거나 다른지, 누가 누구를 비판하거나 평가하는지' },
  흐름: { name: '글의 흐름', line: '왜 그 논의가 나왔는지, 화제가 어디서 어디로 넘어가는지' },
};
export const BRANCH_CODES = Object.keys(BRANCH_WORDING) as BranchCode[];

export type StepCode = 'S1_STEM' | 'S2_CHOICE' | 'S3_LOCATE' | 'S4_INTERPRET' | 'S5_JUDGE';
/** 확정본 3절의 무너진 단계 다섯 개. */
export const STEP_WORDING: Record<StepCode, string> = {
  S1_STEM: '발문', S2_CHOICE: '선지 해석', S3_LOCATE: '근거 위치', S4_INTERPRET: '근거 해석', S5_JUDGE: '대조',
};
export const STEP_CODES = Object.keys(STEP_WORDING) as StepCode[];
