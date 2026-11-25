// 깊은 〈보기〉 문항 생성 v5 (2026-11-18): 〈보기〉 갈래(case 사례 / table 표·단계 목록 / view 외부 관점)를 버전별 입력으로 받는다.
//   근거: set-pattern-2026-11-18/SET-PATTERN.md(3점 98% 〈보기〉, 갈래 비율), BOGI-ANATOMY.md(기출 3점 9문항 해부).
//   공통 원칙 rules-common.md(〈보기〉는 사실만, 판정어 비우기, 오답 한 지점 한 방식, 정답 비튼 방식 기록, 정답 길이·번호),
//   갈래 규칙 kind-case.md / kind-table.md / kind-view.md. rules-A/B v5에서 '원인·동기 서사', '시간 축·조작' 규칙을 바꿈.
//   서버 쪽 처리: 정답 번호를 기출 분포(①19 ②29 ③35 ④38 ⑤48)로 미리 정해 주고, 어긋나면 선지를 맞바꿔 맞춘다.
//   checks.json: 〈보기〉 목적절, 정답이 가장 긴 선지인지, 갈래 형식(표 유무·길이), 비튼 방식 쏠림·V1=V2 중복.
// 실행: 저장소 루트에서  PASSAGE=<id> MODE=A|B KIND_V1=case|table|view KIND_V2=case|table|view OUT_NAME=out-v5 node docs/experiments/deep-item-v5-2026-11-18/run.mjs
//   (선택) ANSWER_V1=1~5 ANSWER_V2=1~5 로 정답 번호를 직접 지정. 없으면 지문·양식·버전으로 정해지는 고정 난수.
// v5.1 (2026-11-19): 표 갈래 규칙 좁힘(kind-table.md: 같은 행 = 같은 변수, 칸은 짧은 값, 결과 행 금지) + 칸 점검.
//   ONLY=V1|V2 로 한 버전만 다시 만든다. KEEP_OUT(기본 out-v5)의 같은 실행에서 1-search·2-select를 복사해 재사용하고,
//   다른 버전 문항을 '확정된 다른 버전'으로 넘겨 함정·비튼 방식·지문 구역이 겹치지 않게 한다. 결과 items.json은 새 버전만,
//   items-merged.json은 확정 버전 + 새 버전. B형의 A형 함정은 AVOID_OUT(기본 KEEP_OUT)에서 읽는다.
// ---- 이전 v4 설명 ----
// 깊은 〈보기〉 문항 생성 v4 (2026-11-12): 생성 규칙 v4(지문 용어 그대로, 판정 라벨만 장면으로, 장면-정의 일치, 짧은 지칭)를 조립 단계부터 적용하고 가독성 기준을 조립에도 준다. 4-solve가 장면-정의 대응(sceneCheck)과 실제로 막히는 문장(hardSentences)을 따로 본다.
// 실행: 저장소 루트에서  PASSAGE=plastic-polymerization MODE=A|B node docs/experiments/deep-item-v4-2026-11-12/run.mjs
// v4.1 (2026-11-12): 결과 없는 〈보기〉 금지, 〈보기〉만으로 풀리는 선지 금지, 함정 중복 금지(V1·V2, 그리고 B 실행은 A 결과의 함정을 '이미 쓴 함정'으로 받음 → A 먼저, B 나중에 실행). 4-solve에 설계 검사(designCheck) 추가.
// 이전 계보: 깊은 〈보기〉 문항 생성 v3.1: 골드 지도 탐색 → 선별(깊이+매력도) → 〈보기〉 조립 → 사후 수정(다듬기) → 가독성·오류 최종 교정 → 독립 풀이 검증.
// v3.1 (2026-11-12): 3c-readability 단계 추가(readability-guide.md). 지금은 v3 결과(1~3b)를 재사용해 3c만 비교 실행한다.
// v3.1b (2026-11-12): GUIDE=readability-guide-v2.md OUT_NAME=out-v2 로 교정 기준만 바꿔 다시 실행. 4-solve가 '다시 읽어야 했던 문장'(hardSentences)도 표시.
// 실행: 저장소 루트에서  PASSAGE=<id> MODE=A|B node docs/experiments/deep-item-v3.1-readability-2026-11-12/run.mjs
// 판정지: node docs/experiments/deep-item-v3.1-readability-2026-11-12/make-review.mjs  (out/ 전체를 모아 REVIEW-open.md 생성)
// v3 (2026-11-12): rules-A/B v3(사건 인과 연결, 지문 예시 옮기기 금지, 단정어 거짓 금지, V1·V2 정답 착각·짜임 차이,
//   계산 양식 사례 건너뛰기 연결을 정답 자리에, 규칙 예시에서 기출 소재 제거), 선별 매력도 축, 3b 다듬기 단계(polish-checklist.md).
// MODE=A: 개념 연결 양식(rules-A, 부정 발문). MODE=B: 계산 양식(rules-B, 긍정 발문, 식·변수·범위·절차 공격).
// v6 (2026-11-24, rule-audit-2026-11-23/PROPOSAL-code-v6.md 2절): RULES_V=6이면 v6 규칙 파일(*-v6.md)과 선택 전략 목록(strategies-v6.md)을 읽고,
//   3단계 지시에 '0. 전략 고르기'를 넣고 출력에 strategies·strategyUse를 받는다. 기계 점검에서 '정답이 가장 긴 선지'는 끄고 전략 점검을 더한다.
//   RULES_V가 없으면 v5 동작 그대로. DRY_RUN=1이면 API를 부르지 않고 2·3단계 지시문을 OUT 폴더의 *.dry.txt로 쓴 뒤 멈춘다.
// 필요: OPENAI_API_KEY (저장소 .env 또는 셸 환경), 저장소의 openai 패키지.
// 모델: 기본 gpt-6.2-sol(2026-11-20 전환, 이전 gpt-6.1-sol). 사람 개입 없음: 2단계 선별도 모델이 한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { renderBoth, validateSpec } from './graph/render.mjs'; // KIND=graph (2026-11-21): 명세 JSON → 읽기 판·SVG
import { checkStrategiesV6 } from './classify-v6.mjs';
import { checkGraphPlan } from './graph/plan-check.mjs'; // RULES_V=6 + KIND=graph: graphPlan 서버 확인(2026-11-25)
const V6 = process.env.RULES_V === '6'; // 기본값 5(v5 동작). 6이면 v6 규칙·지시문
const DRY = process.env.DRY_RUN === '1';
const stripOld = t => V6 ? t.replace(/\s*\(옛 [^()]*\)/g, '') : t; // v6 규칙 파일의 '(옛 …)' 대응 표시는 사람용이라 모델에게 보내는 문자열에서 지운다(파일은 그대로)

const DIR = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(process.cwd(), 'package.json'));
let OpenAI;
for (const p of ['openai', path.join(process.cwd(), 'packages/pipeline/node_modules/openai'), path.join(process.cwd(), 'packages/app/node_modules/openai')]) {
  try { OpenAI = require(p); OpenAI = OpenAI.default ?? OpenAI; break; } catch {}
}
if (!OpenAI) throw new Error('openai 패키지를 찾지 못했습니다. 저장소 루트에서 실행하세요.');
if (!process.env.OPENAI_API_KEY && fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const MODEL = process.env.GEN_MODEL || 'gpt-6.2-sol'; // 기본 6.2-sol(2026-11-20, REPORT-cell-gen62.md). 6.1은 GEN_MODEL=gpt-6.1-sol
const EFFORT = process.env.GEN_EFFORT || 'high';
const POLISH_EFFORT = process.env.POLISH_EFFORT || EFFORT;
const client = new OpenAI({ ...(DRY && !process.env.OPENAI_API_KEY ? { apiKey: 'dry-run' } : {}), maxRetries: 0, timeout: 60 * 60 * 1000 }); // 재시도하면 중복 과금, 긴 추론은 스트리밍으로 받는다
const PID = process.env.PASSAGE;
if (!PID) throw new Error('PASSAGE=<id> 를 지정하세요');
const PDIR = path.join(DIR, 'passages', PID);
const MODE = process.env.MODE || 'A';
if (!['A', 'B'].includes(MODE)) throw new Error('MODE는 A 또는 B');
const OUT_NAME = process.env.OUT_NAME || 'out';
const OUT = path.join(DIR, OUT_NAME, `${PID}-${MODE}`);
fs.mkdirSync(OUT, { recursive: true });

const passage = fs.readFileSync(path.join(PDIR, 'passage.txt'), 'utf8');
const map = fs.readFileSync(path.join(PDIR, 'map.json'), 'utf8');
const rulesA = stripOld(fs.readFileSync(path.join(DIR, `rules-${MODE}${V6 ? '-v6' : ''}.md`), 'utf8'));
let avoidText = '';
const ONLY = process.env.ONLY || '';
if (ONLY && !['V1', 'V2'].includes(ONLY)) throw new Error('ONLY는 V1 또는 V2');
const KEEP_OUT = process.env.KEEP_OUT || 'out-v5';
let keptItem = null;
if (ONLY) {
  const keepDir = path.join(DIR, KEEP_OUT, `${PID}-${MODE}`);
  const other = ONLY === 'V1' ? 'V2' : 'V1';
  keptItem = JSON.parse(fs.readFileSync(path.join(keepDir, 'items.json'), 'utf8')).items.find(x => x.version === other);
  if (!keptItem) throw new Error(`${keepDir}/items.json 에 ${other}가 없습니다`);
  for (const s of ['1-search.md', '2-select.md']) {
    const dst = path.join(OUT, s);
    if (!fs.existsSync(dst)) { fs.copyFileSync(path.join(keepDir, s), dst); console.log(`[재사용] ${KEEP_OUT}의 ${s}`); }
  }
}
const avoidSrc = path.join(DIR, process.env.AVOID_OUT || (ONLY ? KEEP_OUT : OUT_NAME), `${PID}-A`, 'items.json');
if (MODE === 'B' && fs.existsSync(avoidSrc)) {
  const prev = JSON.parse(fs.readFileSync(avoidSrc, 'utf8')).items;
  avoidText = prev.map(it => `[A형 ${it.version}] 정답 착각: ${it.answerIntent ?? ''} / 비튼 방식: ${it.answerTwist ?? '?'}\n` + it.choices.map((c, i) => `  ${c} (${it.truth?.[i] === 'X' ? '거짓' : '참'})`).join('\n')).join('\n\n');
  console.log('[함정 중복 방지] A형 결과를 이미 쓴 함정으로 넘김');
} else if (MODE === 'B') console.warn('[주의] A형 items.json 이 없어 함정 중복 방지 없이 실행합니다. A를 먼저 실행하세요.');
const keptText = keptItem ? `\n\n[확정된 다른 버전 ${keptItem.version} — 이번에는 ${ONLY} 하나만 만든다. 이 문항의 함정, 정답 비튼 방식(${keptItem.answerTwist ?? '?'}), 선지가 쓰는 지문 구역과 겹치지 않게 한다]\n${keptItem.bogi}\n` + keptItem.choices.map((c, i) => `  ${c} (${keptItem.truth?.[i] === 'X' ? '거짓' : '참'})`).join('\n') : '';
const AVOID = (avoidText ? `\n\n[이미 쓴 함정 — 같은 지문의 A형 문항. 이 착각들은 정답·오답 어디에도 다시 쓰지 않는다]\n${avoidText}` : '') + keptText;
const guideText = fs.readFileSync(path.join(DIR, process.env.GUIDE || 'readability-guide-v4.md'), 'utf8');

// v5: 갈래·정답 번호·비튼 방식
const KIND_NAME = { case: '사례', table: '표·단계 목록', view: '외부 글·관점', graph: '그래프', experiment: '실험·관찰' };
const KIND = { V1: process.env.KIND_V1, V2: process.env.KIND_V2 };
for (const v of ['V1', 'V2']) if (!KIND_NAME[KIND[v]]) throw new Error(`KIND_${v}는 case | table | view | graph | experiment 중 하나`);
const commonRules = stripOld(fs.readFileSync(path.join(DIR, V6 ? 'rules-common-v6.md' : 'rules-common.md'), 'utf8'))
  + (!V6 && MODE === 'B' && process.env.V53_B !== '0' ? '\n\n' + fs.readFileSync(path.join(DIR, 'rules-common-v53-B.md'), 'utf8') : ''); // 2026-11-19: v5.3 규칙은 B형에만
const kindRules = [...new Set([KIND.V1, KIND.V2])].map(k => `[갈래 규칙: ${KIND_NAME[k]} (${k})]\n` + stripOld(fs.readFileSync(path.join(DIR, `kind-${k}${V6 ? '-v6' : ''}.md`), 'utf8'))).join('\n\n');
const strategies = V6 ? stripOld(fs.readFileSync(path.join(DIR, 'strategies-v6.md'), 'utf8')) : '';
const POS_WEIGHT = [19, 29, 35, 38, 48]; // 기출 3점 169문항 정답 번호 분포
function pickPos(seed) {
  let h = 2166136261;
  for (const ch of seed) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  let r = h % POS_WEIGHT.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 5; i++) { if (r < POS_WEIGHT[i]) return i + 1; r -= POS_WEIGHT[i]; }
  return 5;
}
const TARGET = {};
for (const v of ['V1', 'V2']) TARGET[v] = Number(process.env[`ANSWER_${v}`]) || pickPos(`${PID}-${MODE}-${v}`);
if (TARGET.V1 === TARGET.V2 && !process.env.ANSWER_V2) TARGET.V2 = (TARGET.V1 % 5) + 1; // 두 버전이 같은 번호면 하나 옮김
const TWISTS = ['뒤집기', '범위 넓히기', '조건 바꾸기', '원인 바꾸기', '대상 바꾸기', '단계 바꾸기', '귀속 바꾸기', '예외 만들기', '짝 바꾸기', '의미 비틀기'];
const SPEC = (ONLY ? [ONLY] : ['V1', 'V2']).map(v => `- ${v}: 갈래 = ${KIND_NAME[KIND[v]]}(${KIND[v]}), 정답 번호 = ${TARGET[v]}번`).join('\n')
  + `\n- 정답 비튼 방식 후보: ${TWISTS.join(', ')}. V1과 V2는 서로 다른 방식을 고른다(${V6 ? 'OP2' : '공통 C6'}).`
  + (ONLY ? `\n- 이번 실행은 ${ONLY} 한 버전만 만든다. 출력의 두 버전 관련 지시는 이 한 버전에만 적용하고, JSON items에는 ${ONLY} 하나만 넣는다. 다른 버전은 입력의 [확정된 다른 버전]이다.` : '');
console.log('[v5 지정]\n' + SPEC);
const usagePath = path.join(OUT, 'usage.json');
const usageLog = fs.existsSync(usagePath) ? JSON.parse(fs.readFileSync(usagePath, 'utf8')) : [];

// gpt-6.2 계열은 긴 규칙을 top-level instructions 대신 developer 메시지로 보낸다(캐시용, 2026-11-20). 6.1 동작은 그대로.
const reqBody = (instructions, input) => MODEL.startsWith('gpt-6.2') ? { input: [{ role: 'developer', content: instructions }, ...(Array.isArray(input) ? input : [{ role: 'user', content: input }])] } : { instructions, input };
async function call(stage, instructions, input, effort = EFFORT) {
  if (DRY) { fs.writeFileSync(path.join(OUT, `${stage}.dry.txt`), `[instructions]\n${instructions}\n\n[input]\n${typeof input === 'string' ? input : JSON.stringify(input)}\n`); console.log(`[${stage}] 건조 실행: 지시문만 저장`); return '(건조 실행: 이 단계는 부르지 않음)'; }
  const cached = path.join(OUT, `${stage}.md`);
  if (fs.existsSync(cached) && !process.env.FORCE) { console.log(`[${stage}] 이미 있음, 건너뜀`); return fs.readFileSync(cached, 'utf8'); }
  console.log(`[${stage}] 호출 중 (${MODEL}, ${effort})...`);
  const t0 = Date.now();
  const res = await client.responses.stream({ model: MODEL, reasoning: { effort }, ...reqBody(instructions, input) }).finalResponse();
  const text = res.output_text;
  fs.writeFileSync(cached, text);
  usageLog.push({ stage, effort, model: res.model, seconds: Math.round((Date.now() - t0) / 1000), usage: res.usage });
  fs.writeFileSync(usagePath, JSON.stringify(usageLog, null, 2));
  console.log(`[${stage}] 완료 ${Math.round((Date.now() - t0) / 1000)}초`, JSON.stringify(res.usage));
  return text;
}

const COMMON = '한국어로 작업하고 한국어로 출력한다. 이 지문으로 출제된 실제 시험 문항을 기억하더라도 쓰거나 흉내 내지 않는다. 오직 주어진 지문과 자료만 근거로 한다.';

// 1단계: 탐색 (웹 스레드 하위 에이전트와 같은 지시)
const s1 = await call('1-search', `너는 한국어 독해 지문의 "헷갈리는 지점"을 탐색하는 분석가다. ${COMMON}

목표: 학생이 지문을 부분적으로만 이해했을 때 참이라고 착각하기 쉬운, 그러나 지문을 통합적으로 이해하면 분명히 거짓인 진술("헷갈리는 인근 지점")을 체계적으로 찾는다.

절차:
1. 탐색 공간 만들기: 서로 다른 문단에 있는 명제 쌍(필요하면 셋)을 고른다. 공통 대상·용어를 공유하거나, 비슷해 보이지만 다른 개념이거나, 원칙과 예외 관계이거나, 주체·대상이 다른 것을 우선한다. 문단 조합(1-2, 1-3, 1-4, 1-5, 2-3, 2-4, 2-5, 3-4, 3-5, 4-5, 같은 문단 안 대조)을 빠짐없이 덮도록 최소 40쌍을 훑는다. 훑은 쌍 목록은 짧게 기록한다.
2. 각 쌍에 이동 방식을 적용해 후보 진술을 만든다. 이동 방식:
   - 주체·대상 바꾸기 (누가/무엇에 의해/누구에게)
   - 두 개념 섞기 (비슷한 두 개념의 속성을 맞바꾸거나 합침)
   - 원칙만 보고 예외를 무시하기 / 예외를 원칙으로 넓히기
   - 범위 넓히기·좁히기 (일부 → 전부, 특정 종류 → 모든 종류)
   - 지문 밖의 새 구체 사례로 옮겼을 때 생기는 착각 (사례는 지문 개념으로만 판단 가능해야 함)
   - 인과 방향 뒤집기·근거 바꾸기
${MODE === 'B' ? `   - (계산 양식) 식에서 한 변수가 변할 때 결과의 증감 방향 뒤집기
   - (계산 양식) 여러 변수를 함께 바꿨을 때 상쇄되는데도 변한다고 하거나, 변하는데도 그대로라고 하기
   - (계산 양식) 범위 안/밖 판단, 범위를 벗어난 위·아래 두 경우의 결과 맞바꾸기
   - (계산 양식) "좋아졌다 = 수가 커졌다" 같은 가치 직관을 식의 실제 방향과 부딪히게 하기
   - (계산 양식) 처음 상태와 나중 상태, 변한 대상과 변하지 않은 대상 혼동
   - (계산 양식) 지문이 판단 절차를 다루면: 단계별 조건 판정(기준보다 많음/적음, 허용 범위 안/밖) 뒤집기, 한 단계의 결과를 최종 결과로 착각하기, 단계 순서 바꾸기
   - (계산 양식) 한 사례·부분에서 나온 변수 방향을 다른 식·단계에 가져가야 판단되는 진술(사례 건너뛰기)
` : ''}3. 거르기. 후보마다 아래 네 검사를 엄격히 적용하고, 모두 통과한 것만 남긴다.
   (a) 한 문장 검사: 쌍 중 한 문장(또는 지문의 한 부분)만 읽은 학생에게 그럴듯하게 참으로 보이는가? 그 문장을 인용한다.
   (b) 통합 검사: 다른 문장까지 함께 읽으면 분명히 거짓인가? 반박 근거 문장을 원문 그대로 인용한다.
   (c) 상식 검사: 지문을 읽지 않고 상식만으로 거짓임이 드러나면 탈락.
   (d) 모호성 검사: 어떤 합리적 해석으로도 참이 될 여지가 있으면 탈락. 부정어만 붙인 뒤집기처럼 너무 쉽게 틀린 게 보이는 것도 탈락.
4. 출력(마크다운):
   - 훑은 쌍 수, 만든 후보 수, 검사별 탈락 수
   - "헷갈림 구역" 목록: 통과 후보들을 개념 쌍 기준으로 묶은 구역(예: 'X 대 Y 혼동'), 구역마다 통과 후보 수
   - 통과 후보 전체 표(최대 30개): 번호, 진술(선지 문장처럼), 관련 명제 id, 이동 방식, (a) 참처럼 보이게 하는 문장, (b) 반박 문장
   - 탈락 예시 5개와 탈락 이유`,
  `[지문]\n${passage}\n\n[지문 분석 지도 JSON: propositions = 명제, nodes = 명제 묶음, relations = 명제 간 관계]\n${map}`);

// 2단계: 선별 (사람 평가 대신, 사람 평가에서 뽑은 기준을 모델이 적용)
const s2 = await call('2-select', `너는 수능 국어 독서 문항 검토자다. ${COMMON}

입력은 지문과, 헷갈리는 거짓 진술 후보 목록이다. 후보마다 "깊이", "매력도", 등급을 매기고 가장 좋은 4개를 고른다.

깊이 = 학생이 정오를 가리려고 연결해야 하는 지문 개념·규칙의 수(1, 1.5, 2, 3단계).
매력도 = 지문을 대충 읽은 학생이 이 거짓 진술을 참으로 고를 가능성(상/중/하). 깊이와 매력도는 따로 매긴다. 깊이가 낮아도 매력도가 높으면 좋은 정답 후보다(예: 한 단계짜리라도 두 관점의 차이를 학생이 흔히 잘못 짚는 축으로 옮겨 놓은 진술).
등급 기준(사람 평가자의 실제 판단에서 뽑은 것):
- very good: 반박 근거가 앞 문장과 다른 문단에 있다. 이름·겉모습이 닮은 이웃 개념 쌍을 섞는다(예: 겉모습이나 이름이 비슷한 두 제도·개념, 전체와 그 한 부분, 두 관점이 같은 용어를 다르게 쓰는 경우). 상식·직관이 거짓 쪽으로 학생을 끌어당긴다. 보통 2단계.
- good: 원칙과 예외가 부딪치는 진술(원칙만 보면 참). 또는 결과는 맞고 근거만 바꾼 진술. 보통 1~1.5단계.
- acceptable: 거짓이 분명하지만 헷갈림이 약하다.
- not good / bad: 한 문단 안, 한 구절만 보면 바로 풀린다. 또는 지문 표현을 거의 그대로 비틀었다.

출력(마크다운):
1. 후보별 표: 번호, 진술 요약, 깊이, 매력도, 등급, 한 줄 이유
2. 선정 4개: 원문 진술 그대로, 깊이·매력도, 그리고 각각 "(어떤 착각인가. 실제: 지문상 사실)" 형식의 한 줄 설명. 4개는 서로 같은 포인트를 반복하지 않게 하되, 한 〈보기〉 문항으로 엮을 수 있도록 가까운 구역에서 고른다. 4개 중 최소 하나는 매력도 '상'이어야 한다. 4개는 서로 다른 착각이어야 하며(같은 오해를 표현만 바꾼 것은 하나로 본다), V1·V2가 정답 착각을 하나씩 나눠 갖고 나머지 함정도 두 버전에 겹치지 않게 배정할 수 있어야 한다. 입력에 '이미 쓴 함정'이 있으면 그 착각과 같은 후보는 고르지 않는다.${MODE === 'B' ? `
${V6 ? '   (계산 양식) 식·절차를 직접 공격하는 후보(여러 변수 상쇄, 여러 단계 거친 결과)와 사례 건너뛰기 후보가 목록에 있으면 4개 안에 넣는다(선택 전략 S16·S1의 재료). 없으면 그 사실을 적는다.' : '   (계산 양식) 4개 중 최소 하나는 식·절차를 직접 공격하는 후보(여러 변수 상쇄, 여러 단계 거친 결과)로, 최소 하나는 지문의 한 사례·부분에서 가져온 변수 방향을 다른 식·단계에 넣어야 판단되는 후보(사례 건너뛰기)로 고른다. 이런 후보가 목록에 없으면 그 사실을 적는다.'}` : ''}
3. 정답 후보 추천: 선정 4개 중 정답 자리에 가장 좋은 것과 그 이유(깊이와 매력도를 함께 보고).`,
  `[지문]\n${passage}\n\n[후보 목록]\n${s1}${AVOID}`);

// 3단계: 조립 (웹 스레드 하위 에이전트와 같은 지시, 재료 B만 2단계 결과로 바꿈)
const ASSEMBLE_A = `
할 일: "윗글을 바탕으로 〈보기〉를 이해한 내용으로 적절하지 않은 것은?" 형식의 5지선다 〈보기〉 문항을 두 버전(V1, V2) 만든다. 각 버전은 재료 B의 거짓 진술들이 다루는 구역을 중심에 두되, 〈보기〉의 구체 사례에 맞게 선지를 새로 쓴다. 두 버전은 〈보기〉 사례뿐 아니라 정답이 노리는 착각과 〈보기〉 짜임도 서로 달라야 한다(규칙 16).

출제 과정(규칙 A를 따른다):
1. 〈보기〉 설계: 버전마다 입력의 [버전별 지정]에 적힌 갈래로 쓰고, 그 갈래 규칙의 형식·원칙을 따른다. 〈보기〉는 사실까지만 쓰고 목적·까닭·판정 결론은 쓰지 않는다(공통 C1). 판정에 쓰는 개념어는 비운다(공통 C2, 규칙 1). 지문 예시를 이름만 바꿔 옮기지 않는다(규칙 14). 디테일(사실·값)은 오해를 부르도록 고른다.
2. 선지 후보: 〈보기〉 문장마다 참 버전을 먼저 쓰고, 규칙 6을 통과하는 거짓 버전이 있는지 시도한다. 시도와 버린 이유를 짧게 기록한다.
3. 〈보기〉 길이와 선지 길이를 갈래 규칙에 맞춘다.
4. 최종 5선지: 거짓(=정답) 정확히 1개, 참 4개. 〈보기〉 관찰 문장은 결과까지 쓰고(규칙 23), 〈보기〉만으로 정오가 드러나는 선지는 쓰지 않으며(규칙 24), V1과 V2는 선지 함정을 공유하지 않는다(규칙 25). 정답은 마지막에 깊이와 매력도를 함께 보고 가장 좋은 거짓 후보로 고른다(규칙 17). 거짓은 단정어가 아니라 개념을 잘못 연결해서 생겨야 한다(규칙 15). 참 선지 4개도 각각 〈보기〉 표현 → 지문 개념 옮기기가 필요해야 한다. 참 선지 중 일부는 B의 거짓 진술을 뒤집은 '참이지만 헷갈리는' 형태로 써도 좋다. 정답(거짓)과 거짓 후보는 한 지점만 한 방식으로 비틀고(공통 C5), 정답의 비튼 방식은 V1·V2가 서로 다르다(공통 C6). 선지마다 근거 문단(표라면 칸)이 겹치지 않게 나눈다(공통 C4). 정답은 [버전별 지정]의 번호에 두고(공통 C10), 다섯 선지 중 가장 긴 선지가 되지 않게 쓴다(공통 C9).
5. 자기 검산: 선지마다 정오와 지문 근거 문장(원문 그대로)을 적고, 〈보기〉의 어느 표현을 어느 지문 개념으로 옮겨야 하는지 적는다. 정답이 하나뿐인지, 지문 밖 지식이 필요 없는지, 해석에 따라 정오가 바뀌는 선지가 없는지 확인한다.

출력(마크다운): 버전마다 (1) 문항(발문, 〈보기〉, 선지 ①~⑤) — 정답 표시 없이 시험지 형태로, (2) 정답과 선지별 해설 표(정오, 근거 문장, 옮기기 단계), (3) 출제 기록(〈보기〉 문장별 노린 오해, 시도했다가 버린 선지와 이유).
`;
const ASSEMBLE_B = `
할 일: "윗글을 바탕으로 〈보기〉를 이해한 내용으로 가장 적절한 것은?" 형식의 5지선다 〈보기〉 문항을 두 버전(V1, V2) 만든다. 지문의 식(변수 관계)·수치 범위·판단 절차를 중심에 두고, 재료 S의 거짓 진술들이 다루는 구역을 함정 선지에 활용하되 〈보기〉의 구체 사례에 맞게 새로 쓴다. 두 버전은 〈보기〉 장면뿐 아니라 정답이 공격하는 고리와 〈보기〉 짜임도 서로 달라야 한다(규칙 20).

출제 과정(규칙 B를 따른다):
1. 〈보기〉 설계: 버전마다 입력의 [버전별 지정]에 적힌 갈래로 쓰고, 그 갈래 규칙의 형식·원칙을 따른다. 식·절차가 적용되는 새 대상의 값·상태를 주고(규칙 1), 변수는 값이나 관찰 특징으로 보여 준다. 〈보기〉는 사실까지만 쓰고 목적·까닭·조작 서사는 쓰지 않는다(공통 C1, 규칙 3·7). 지문 예시를 이름만 바꿔 옮기지 않는다(규칙 8). 규칙 문서의 예시 소재는 쓰지 않는다.
2. 선지 후보: 범위 → 한 변수 방향 → 여러 변수 상쇄 → 지문의 다른 문장 연결 순으로 고리를 고르고, 고리마다 참·거짓 버전을 모두 써 본 뒤 더 어려운 쪽을 고른다. 시도와 버린 이유를 짧게 기록한다.
3. 〈보기〉 길이와 선지 길이를 갈래 규칙에 맞춘다.
4. 최종 5선지: 참(=정답) 정확히 1개, 거짓 4개. 〈보기〉 관찰 문장은 결과까지 쓰고(규칙 26), 〈보기〉만으로 정오가 드러나는 선지는 쓰지 않으며(규칙 27), V1과 V2는 선지 함정을 공유하지 않는다(규칙 28). 정답 자리에는 사례 건너뛰기 연결을 둔다(규칙 18). 불가능하면 출제 기록에 이유를 적고 여러 변수 상쇄 선지를 정답으로 둔다. 거짓 4개는 쉬움·중간·어려움을 섞고, 단정어로 거짓을 만들지 않는다(규칙 17). 거짓 선지는 한 지점만 한 방식으로 비틀고(공통 C5) 같은 방식은 많아야 둘이다. 정답(참)이 비켜 가는 함정의 방식을 answerTwist로 적되 V1·V2가 서로 다르게 한다(공통 C6). 선지마다 근거 문단(표라면 칸)이 겹치지 않게 나눈다(공통 C4). 정답은 [버전별 지정]의 번호에 두고(공통 C10), 다섯 선지 중 가장 긴 선지가 되지 않게 쓴다(공통 C9).
5. 자기 검산: 선지마다 정오와 지문 근거 문장(원문 그대로), 〈보기〉의 어느 특징을 어느 변수로 옮겨야 하는지, 필요한 경우 배수 검산을 적는다. 참이 하나뿐인지, 지문 밖 지식이 필요 없는지, 해석에 따라 정오가 바뀌는 선지가 없는지 확인한다. 각 선지의 난도(쉬움/중간/어려움)도 적는다.

출력(마크다운): 버전마다 (1) 문항(발문, 〈보기〉, 선지 ①~⑤) — 정답 표시 없이 시험지 형태로, (2) 정답과 선지별 해설 표(정오, 근거 문장, 옮기기 단계, 난도), (3) 출제 기록(〈보기〉 문장별 노린 오해, 시도했다가 버린 선지와 이유).
`;
const ASSEMBLE_A_V6 = `
할 일: "윗글을 바탕으로 〈보기〉를 이해한 내용으로 적절하지 않은 것은?" 형식의 5지선다 〈보기〉 문항을 두 버전(V1, V2) 만든다. 각 버전은 재료 B의 거짓 진술들이 다루는 구역을 중심에 두되, 〈보기〉의 구체 사례에 맞게 선지를 새로 쓴다. 두 버전은 〈보기〉 사례뿐 아니라 정답이 노리는 착각과 〈보기〉 짜임도 서로 달라야 한다(OP5).

출제 과정(공통 규칙 v6·선택 전략·규칙 A를 따른다):
0. 전략 고르기: 버전마다 [선택 전략 목록]에서 이 양식(A)과 이 버전의 갈래에 쓸 수 있는 전략을 1~3개 고르되 깊이 전략(목록 '종류' 열)을 1개 이상 고르고, 깊이 전략은 정답이나 rival 선지에 쓴다. 이유를 한 줄 적는다. 지문에 예외·단서 문장이 있고 갈래가 사례면 S13을 먼저 시도하고, 못 쓰면 출제 기록에 'S13 안 씀: 이유'를 적는다(KC2). 고르지 않은 전략은 지키지 않아도 된다.
1. 〈보기〉 설계: 버전마다 입력의 [버전별 지정]에 적힌 갈래로 쓰고, 그 갈래 규칙의 형식·원칙을 따른다. 〈보기〉는 사실까지만 쓰고 목적·까닭을 쓰지 않으며(R1), 정답을 가르는 관계를 직접 말하지 않는다(M9). 〈보기〉의 지문 용어는 돌려 말하지 않는다(R2). 관점 갈래는 선지가 판정하는 개념어를 〈보기〉에 쓰지 않는다(V3). 지문 예시를 이름만 바꿔 옮기지 않는다(M8). 디테일(사실·값)은 고른 전략에 맞게 고른다.
2. 선지 후보: 〈보기〉 문장마다 참 버전을 먼저 쓰고, 고른 전략과 P4(지문 문장으로 분명히 반박)를 통과하는 거짓 버전이 있는지 시도한다. 시도와 버린 이유를 짧게 기록한다.
3. 〈보기〉 길이와 선지 길이를 갈래 규칙에 맞춘다.
4. 최종 5선지: 거짓(=정답) 정확히 1개, 참 4개. 〈보기〉 관찰 문장은 결과까지 쓴다(R5). 〈보기〉만으로 정오가 드러나는 선지는 쓰지 않는다(M2). 참 선지도 지문 문장을 대조하기만 하면 끝나지 않게, 〈보기〉 표현을 지문 개념으로 옮기거나 지문 원리를 적용하게 쓴다(M3). 〈보기〉 없이 지문 문장을 확인하기만 하면 정해지는 선지는 많아야 1개다(M4). 〈보기〉를 안 봐도 지문만으로 풀리는 선지는 많아야 1개이고 쉬움 자리에만 둔다. 지문의 개념 정의·일반 원칙을 반대로 말하는 것으로 거짓을 만들지 않는다(GN1). 결론만 반대인 거울 짝을 만들지 않는다(M5). V1과 V2는 선지 함정을 공유하지 않는다(OP6). 정답은 마지막에 깊이와 매력도를 함께 보고 가장 좋은 거짓 후보로 고른다(OP4). 거짓은 단정어가 아니라 개념을 잘못 이어서 생긴다(M7). 참 선지 중 일부는 B의 거짓 진술을 뒤집은 '참이지만 헷갈리는' 형태로 써도 좋다. 거짓은 한 지점만 한 방식으로 비틀고(M1), 정답의 비튼 방식은 V1·V2가 서로 다르다(OP2). 선지 하나의 근거는 지문 1~2문단이다(M10). 정답은 [버전별 지정]의 번호에 둔다(OP1). 0번에서 고른 전략은 실제로 쓰고, 어느 선지·문장에 썼는지 적는다.
5. 자기 검산: 선지마다 정오와 지문 근거 문장(원문 그대로)을 적고, 〈보기〉의 어느 표현을 어느 지문 개념으로 옮겨야 하는지 적는다. 정답이 하나뿐인지, 지문 밖 지식이 필요 없는지, 해석에 따라 정오가 바뀌는 선지가 없는지 확인한다.

출력(마크다운): 버전마다 (1) 문항(발문, 〈보기〉, 선지 ①~⑤) — 정답 표시 없이 시험지 형태로, (2) 정답과 선지별 해설 표(정오, 근거 문장, 옮기기 단계), (3) 출제 기록(〈보기〉 문장별 노린 오해, 시도했다가 버린 선지와 이유, 고른 전략과 쓴 자리).
`;
const ASSEMBLE_B_V6 = `
할 일: "윗글을 바탕으로 〈보기〉를 이해한 내용으로 가장 적절한 것은?" 형식의 5지선다 〈보기〉 문항을 두 버전(V1, V2) 만든다. 지문의 식(변수 관계)·수치 범위·판단 절차를 중심에 두고, 재료 S의 거짓 진술들이 다루는 구역을 함정 선지에 활용하되 〈보기〉의 구체 사례에 맞게 새로 쓴다. 두 버전은 〈보기〉 장면뿐 아니라 정답이 공격하는 고리와 〈보기〉 짜임도 서로 달라야 한다(OP5).

출제 과정(공통 규칙 v6·선택 전략·규칙 B를 따른다):
0. 전략 고르기: 버전마다 [선택 전략 목록]에서 이 양식(B)과 이 버전의 갈래에 쓸 수 있는 전략을 1~3개 고르되 깊이 전략(목록 '종류' 열)을 1개 이상 고르고, 깊이 전략은 정답이나 rival 선지에 쓴다. 이유를 한 줄 적는다. 고르지 않은 전략은 지키지 않아도 된다.
1. 〈보기〉 설계: 버전마다 입력의 [버전별 지정]에 적힌 갈래로 쓰고, 그 갈래 규칙의 형식·원칙을 따른다. 식·절차가 적용되는 새 대상의 값·상태를 주고(RB1), 변수는 값이나 관찰 특징으로 보여 준다. 〈보기〉는 사실까지만 쓰고 목적·까닭·조작 서사는 쓰지 않는다(R1, RB3). 정답을 가르는 관계를 직접 말하지 않는다(M9). 지문 예시를 이름만 바꿔 옮기지 않는다(M8). 규칙 문서의 예시 소재는 쓰지 않는다.
2. 선지 후보: 고리마다 참·거짓 버전을 모두 써 본 뒤 더 어려운 쪽을 고른다(OP4). S16을 골랐으면 범위 → 한 변수 방향 → 여러 변수 상쇄 → 지문의 다른 문장 연결 순으로 고리를 고른다. 시도와 버린 이유를 짧게 기록한다.
3. 〈보기〉 길이와 선지 길이를 갈래 규칙에 맞춘다.
4. 최종 5선지: 참(=정답) 정확히 1개, 거짓 4개. 〈보기〉 관찰 문장은 결과까지 쓴다(R5). 〈보기〉만으로 정오가 드러나는 선지는 쓰지 않는다(M2). 정답(참)도 지문 문장을 대조하기만 하면 끝나지 않게 쓴다(M3). 〈보기〉 없이 지문 문장을 확인하기만 하면 정해지는 선지는 많아야 1개다(M4). 〈보기〉를 안 봐도 지문만으로 풀리는 선지는 많아야 1개이고 쉬움 자리에만 둔다. 지문의 개념 정의·일반 원칙을 반대로 말하는 것으로 거짓을 만들지 않는다(GN1). 결론만 반대인 거울 짝을 만들지 않는다(M5). V1과 V2는 선지 함정을 공유하지 않는다(OP6). S1을 골랐으면 정답 자리에 근거 둘 이상을 잇는 고리(사례 건너뛰기 연결 포함)를 둔다. 단정어로 거짓을 만들지 않는다(M7). 거짓 선지는 한 지점만 한 방식으로 비튼다(M1). 정답(참)이 비켜 가는 함정의 방식을 answerTwist로 적되 V1·V2가 서로 다르게 한다(OP2). 선지 하나의 근거는 지문 1~2문단이다(M10). 정답은 [버전별 지정]의 번호에 둔다(OP1). 0번에서 고른 전략은 실제로 쓰고, 어느 선지·문장에 썼는지 적는다.
5. 자기 검산: 선지마다 정오와 지문 근거 문장(원문 그대로), 〈보기〉의 어느 특징을 어느 변수로 옮겨야 하는지, 필요한 경우 배수 검산을 적는다. 참이 하나뿐인지, 지문 밖 지식이 필요 없는지, 해석에 따라 정오가 바뀌는 선지가 없는지 확인한다. 각 선지의 난도(쉬움/중간/어려움)도 적는다.

출력(마크다운): 버전마다 (1) 문항(발문, 〈보기〉, 선지 ①~⑤) — 정답 표시 없이 시험지 형태로, (2) 정답과 선지별 해설 표(정오, 근거 문장, 옮기기 단계, 난도), (3) 출제 기록(〈보기〉 문장별 노린 오해, 시도했다가 버린 선지와 이유, 고른 전략과 쓴 자리).
`;
const GRAPH_PLAN_SENTENCE = V6 && (KIND.V1 === 'graph' || KIND.V2 === 'graph') ? 'graphSpec보다 먼저 같은 항목에 "graphPlan" 객체를 넣는다(형식은 갈래 규칙 "먼저 쓰는 것: graphPlan"). ' : ''; // RULES_V=6 + 그래프 갈래일 때만. v5 프롬프트는 그대로
const s3 = await call('3-assemble', `너는 수능 국어 독서 출제자다. ${COMMON}
${V6 ? (MODE === 'B' ? ASSEMBLE_B_V6 : ASSEMBLE_A_V6) : (MODE === 'B' ? ASSEMBLE_B : ASSEMBLE_A)}맨 끝에 아래 형식의 JSON 코드 블록을 하나 덧붙인다:
\`\`\`json
{"items":[{"version":"V1","kind":"table","stem":"...","bogi":"...","choices":["①...","②...","③...","④...","⑤..."],"answer":4,"answerTwist":"짝 바꾸기","twists":["참","뒤집기","참","짝 바꾸기","참"],"roles":["쉬움","경쟁","중간","정답","중간"],"rival":2${V6 ? ',"strategies":["S3","S12"],"strategyUse":{"S3":"정답 ④","S12":"〈보기〉 셋째 문장, 선지 ②"}' : ''}}]}
\`\`\`
roles는 선지별 역할(${V6 ? 'OP3' : '공통 C11'}), rival은 가장 강한 경쟁 선지 번호다. kind는 갈래 영문 이름, answerTwist는 ${V6 ? 'M1 표의 방식 이름(OP2)' : '공통 C6의 방식 이름'}, twists는 선지별로 거짓이면 비튼 방식 이름, 참이면 "참"이다. 표 〈보기〉는 bogi 안에 안내 글과 마크다운 표를 줄바꿈으로 이어 넣는다. 갈래가 graph인 항목은 bogi를 빈 문자열로 두고 "graphSpec" 객체(갈래 규칙의 형식)를 항목에 넣는다. ${GRAPH_PLAN_SENTENCE}시험지 형태 출력에서 〈보기〉 자리에는 graphSpec의 요약(축·곡선 모양·표시 기호)을 적는다.${V6 ? ' strategies는 0번에서 고른 선택 전략 번호(1~3개), strategyUse는 전략마다 쓴 자리 한 줄이다.' : ''}`,
  `[지문]\n${passage}\n\n[버전별 지정]\n${SPEC}\n\n[${V6 ? '공통 규칙 v6' : '공통 원칙'} — 양식 규칙과 부딪치면 이것을 따른다]\n${commonRules}${V6 ? `\n\n[선택 전략 목록]\n${strategies}` : ''}\n\n${kindRules}\n\n[${MODE}. 출제 규칙]\n${rulesA}\n\n[가독성 기준 — 〈보기〉와 선지 문장을 처음부터 이 기준에 맞게 쓴다]\n${guideText}\n\n[${MODE === 'B' ? 'S' : 'B'}. 선정된 거짓 진술]\n${s2}${AVOID}`);

if (DRY) { console.log(`\n[건조 실행] 2·3단계 지시문을 ${OUT} 의 *.dry.txt 로 저장했다. API는 부르지 않았다.`); process.exit(0); }
// 3b단계: 사후 수정(다듬기) — 표현만 고친다. 정오·정답·연결 고리는 그대로.
const lastJson = t => [...t.matchAll(/```json\s*([\s\S]*?)```/g)].pop();
// 그래프 갈래(2026-11-21): 3단계 JSON의 graphSpec이 기준이다. 〈보기〉 = 명세에서 자동 생성한 읽기 판. 3b·3c에는 읽기 판을 따로 붙이고, 이후 graphSpec·bogi는 3단계 것으로 덮어쓴다.
const graphSpecs = {}, graphPlans = {}; // version → graphSpec / graphPlan(v6)
try { for (const it of JSON.parse(lastJson(s3)[1]).items) if (it.graphSpec) { graphSpecs[it.version] = it.graphSpec; if (GRAPH_PLAN_SENTENCE && it.graphPlan) graphPlans[it.version] = it.graphPlan; } } catch {}
for (const [v, g] of Object.entries(graphSpecs)) { const val = validateSpec(g); if (val.errs.length) console.warn(`[그래프 명세 오류] ${v}: ${val.errs.join(' / ')}`); }
const graphNote = Object.keys(graphSpecs).length ? '\n\n[그래프 읽기 판(graphSpec에서 자동 생성, 〈보기〉로 취급 — graphSpec·bogi는 고치지 않는다)]\n' + Object.entries(graphSpecs).map(([v, g]) => `[${v}]\n${renderBoth(g).text}`).join('\n\n') : '';
if (!lastJson(s3)) throw new Error('3단계 출력에서 JSON 블록을 찾지 못했습니다. out/3-assemble.md 확인');
const checklist = stripOld(fs.readFileSync(path.join(DIR, V6 ? 'polish-checklist-v6.md' : 'polish-checklist.md'), 'utf8'));
const s3b = await call('3b-polish', `너는 수능 국어 독서 문항의 문장을 다듬는 편집자다. ${COMMON}
입력은 지문, 출제 규칙, 출제자가 만든 문항 두 개(해설·출제 기록 포함), 다듬기 점검표다.
할 일: 점검표 항목을 문항의 〈보기〉와 선지 문장 하나하나에 적용해 표현만 고친다.
지킬 것:
- 정오, 정답 번호, 선지가 노리는 연결 고리와 난도는 바꾸지 않는다. 문항을 버리거나 쉽게 만들지 않는다.
- 고치면 정오가 흔들릴 것 같은 문제는 고치지 않고 '논리 메모'에 적는다.
- 고칠 곳이 없으면 그대로 둔다. 고치기 위해 고치지 않는다.
- (v5) 〈보기〉에 목적·까닭·판정 결론 문장("~하려고", "~위해", "~ 때문에", "~에 해당했다")이 있으면 사실만 남기고 지운다(${V6 ? 'R1·M9' : '공통 C1'}). 표 〈보기〉의 표 구조와 값은 바꾸지 않는다. (그래프 갈래) graphSpec${GRAPH_PLAN_SENTENCE ? '·graphPlan' : ''}과 bogi(읽기 판)는 고치지 않고 그대로 옮기며, 발문(stem)의 그래프 소개 문장과 선지만 다듬는다. ${V6 ? 'kind, answerTwist, twists, roles, rival, strategies, strategyUse는' : 'kind, answerTwist, twists, roles, rival은'} 그대로 옮긴다.
출력(마크다운): 버전마다 (1) 수정 표: 위치(〈보기〉 n번째 문장 / 선지 번호), 원문, 수정문, 점검표 항목 번호, (2) 논리 메모(없으면 '없음'), (3) 다듬은 문항(시험지 형태).
맨 끝에 아래 형식의 JSON 코드 블록을 하나 덧붙인다. truth는 선지별 정오(적절하면 "O", 적절하지 않으면 "X"), intent는 선지별 출제 의도 한 줄(〈보기〉의 어느 표현을 지문의 어느 개념으로 옮겨야 하는지, 거짓이면 어디가 어긋나는지), answerIntent는 정답이 노리는 착각 한 줄이다:
\`\`\`json
{"items":[{"version":"V1","kind":"table","stem":"...","bogi":"...","choices":["①...","②...","③...","④...","⑤..."],"answer":4,"answerTwist":"짝 바꾸기","twists":["참","뒤집기","참","짝 바꾸기","참"],"truth":["O","O","O","X","O"],"intent":["...","...","...","...","..."],"answerIntent":"...","edits":3}]}
\`\`\``,
  `[지문]\n${passage}\n\n[출제 규칙]\n${rulesA}\n\n[${V6 ? '공통 규칙 v6' : '공통 원칙'}]\n${commonRules}\n\n[다듬기 점검표]\n${checklist}\n\n[출제자가 만든 문항]\n${s3}${graphNote}`, POLISH_EFFORT);

// 3c단계: 가독성·오류 최종 교정 (v3.1) — 처음 읽는 학생이 한 번에 뜻을 잡게. 정오·정답·숨긴 핵심 개념은 그대로.
const j3b = lastJson(s3b);
if (!j3b) throw new Error('3b단계 출력에서 JSON 블록을 찾지 못했습니다. out/3b-polish.md 확인');
const guide = fs.readFileSync(path.join(DIR, process.env.GUIDE || 'readability-guide-v4.md'), 'utf8');
const s3c = await call('3c-readability', `너는 수능 국어 독서 문항의 최종 교정 편집자다. ${COMMON}
입력은 지문, 출제자의 출제 기록(해설·옮기기 단계 포함), 다듬은 문항 JSON, 교정 기준이다.
할 일:
1. 출제 기록과 해설을 보고, 버전마다 학생이 〈보기〉에서 지문 개념으로 옮겨야 하는 '숨긴 핵심 개념'(판정 라벨)을 1~2개 찾아 적는다(정답과 핵심 선지가 노리는 것).
2. 교정 기준에 따라 〈보기〉와 선지 문장을 고친다. 숨긴 핵심 개념은 〈보기〉에서 계속 숨기고(정의문으로도 풀지 않는다), 그 밖의 용어는 지문 용어로 되돌린다. 교정 기준의 원칙과 예시를 기준으로, 처음 읽는 고등학생이 막힐 문장은 모두 풀어 쓴다.
3. 정오와 정답 번호는 바꾸지 않는다. 고치면 정오가 흔들릴 것 같은 곳은 고치지 않고 메모로 남긴다.
4. 조건을 더하거나 빼지 않는다. 표현만 바꾼다. 숨긴 라벨을 보여 주는 장면을 새로 만들지 않고, 장면을 고칠 때는 지문 정의와의 대응이 유지되는지 확인한다.
출력(마크다운): 버전마다 (1) 숨긴 핵심 개념, (2) 수정 표: 위치, 원문, 수정문, 기준 번호, (3) 메모(없으면 '없음'), (4) 교정한 문항(시험지 형태).
맨 끝에 입력 JSON과 같은 형식의 JSON 코드 블록을 하나 덧붙인다. 항목마다 "hidden"(숨긴 핵심 개념 배열)과 "readabilityEdits"(수정 수)를 더하고, intent도 고친 문장에 맞게 갱신한다. ${V6 ? 'kind, answerTwist, twists, roles, rival, strategies, strategyUse는' : 'kind, answerTwist, twists, roles, rival은'} 그대로 둔다. 표 〈보기〉의 표 구조와 값은 바꾸지 않는다. (그래프 갈래) graphSpec${GRAPH_PLAN_SENTENCE ? '·graphPlan' : ''}과 bogi는 고치지 않고 그대로 옮긴다.`,
  `[지문]\n${passage}\n\n[교정 기준]\n${guide}\n\n[출제 기록]\n${s3}${graphNote}\n\n[다듬은 문항 JSON]\n${j3b[1]}`, POLISH_EFFORT);

// 4단계: 독립 풀이 검증 (정답 모르는 상태로, 최종 교정한 문항을 푼다)
const json = lastJson(s3c);
if (!json) throw new Error('3c단계 출력에서 JSON 블록을 찾지 못했습니다. out/3c-readability.md 확인');
let items = JSON.parse(json[1]).items;
if (ONLY) items = items.filter(x => x.version === ONLY);
if (!items.length) throw new Error('3c 결과에 만들 버전이 없습니다');
for (const it of items) if (graphSpecs[it.version]) { // 그래프: 3단계 명세가 기준
  it.kind = 'graph'; it.graphSpec = graphSpecs[it.version]; it.bogi = renderBoth(it.graphSpec).text;
  if (graphPlans[it.version]) it.graphPlan = graphPlans[it.version]; // v6: 3단계 graphPlan이 기준(3b·3c가 건드려도 덮어쓴다)
  const gdir = path.join(OUT, 'graph'); fs.mkdirSync(gdir, { recursive: true });
  const { svg, text } = renderBoth(it.graphSpec); fs.writeFileSync(path.join(gdir, `${it.version}.svg`), svg); fs.writeFileSync(path.join(gdir, `${it.version}.txt`), text + '\n');
}
const before = Object.fromEntries(JSON.parse(lastJson(s3)[1]).items.map(it => [it.version, it]));
const polished = Object.fromEntries(JSON.parse(j3b[1]).items.map(it => [it.version, it]));
for (const it of items) {
  it.bogiChars = it.bogi.replace(/\s/g, '').length;
  const b0 = before[it.version];
  if (b0 && String(b0.answer) !== String(it.answer)) console.warn(`[경고] ${it.version}: 다듬기·교정에서 정답이 바뀜 ${b0.answer} → ${it.answer}`);
  if (V6 && b0) { it.strategies ??= b0.strategies; it.strategyUse ??= b0.strategyUse; } // 다듬기·교정이 흘린 전략 칸은 3단계 것으로 채운다
  const p0 = polished[it.version];
  if (p0) { it.before = { bogi: p0.bogi, choices: p0.choices }; it.edits = p0.edits; }
}
// v5: 정답 번호 맞추기(선지 맞바꿈) + 기계 점검
const CIRC = ['①', '②', '③', '④', '⑤'];
const strip = c => c.replace(/^\s*[①②③④⑤]\s*/, '');
const checks = {};
for (const it of items) {
  it.kind = it.kind || KIND[it.version];
  const tgt = TARGET[it.version], cur = Number(it.answer);
  if (cur >= 1 && cur <= 5 && tgt !== cur) {
    const a = cur - 1, b = tgt - 1;
    const body = it.choices.map(strip);
    [body[a], body[b]] = [body[b], body[a]];
    it.choices = body.map((c, i) => `${CIRC[i]} ${c}`);
    if (it.rival) it.rival = Number(it.rival) === cur ? tgt : Number(it.rival) === tgt ? cur : Number(it.rival);
    for (const k of ['truth', 'intent', 'twists', 'roles']) if (Array.isArray(it[k]) && it[k].length === 5) [it[k][a], it[k][b]] = [it[k][b], it[k][a]];
    it.answerMoved = `${cur}→${tgt}`;
    it.answer = tgt;
    console.log(`[정답 번호] ${it.version}: ${cur}번 → ${tgt}번으로 선지 맞바꿈`);
  }
  const c = [];
  const lines = it.bogi.split('\n');
  const tableLines = lines.filter(l => /^\s*\|/.test(l));
  const text = lines.filter(l => !/^\s*\|/.test(l)).join(' ');
  const purpose = it.kind === 'graph' ? null : text.match(/[가-힣]*(하려고|려고|하기 위해|위해서|위하여|위해|알아보려|확인하려|목적으로|때문에|그래서)/g);
  if (purpose) c.push(`〈보기〉 목적·까닭 표현: ${[...new Set(purpose)].join(', ')}`);
  const judge = it.kind === 'graph' ? null : text.match(/[가-힣]*(에 해당|의 대상이|대상이 되)/g);
  if (judge) c.push(`〈보기〉 판정 표현: ${[...new Set(judge)].join(', ')}`);
  const len = s => s.length;
  const tlen = len(text.trim());
  if (it.kind === 'graph') {
    const val = validateSpec(it.graphSpec || {});
    for (const e of val.errs) c.push(`그래프 명세 오류: ${e}`);
    for (const w of val.warns) c.push(`그래프 판정어: ${w}`);
    const pts = (it.graphSpec?.series || []).reduce((n, q) => n + (q.points || []).length, 0);
    if (pts > 14) c.push(`그래프 점 ${pts}개(모양 위주로 줄일 것)`);
    if (GRAPH_PLAN_SENTENCE) { // graphPlan 칸 확인(RULES_V=6 + 그래프 갈래)
      it.graphPlanCheck = checkGraphPlan(it.graphPlan, it.graphSpec, passage);
      for (const e of it.graphPlanCheck.errs) c.push(`그래프 계획 오류: ${e}`);
    }
  } else if (it.kind === 'table') {
    if (tableLines.length < 3 && !/㉠|→/.test(it.bogi)) c.push('표 갈래인데 표·단계 목록이 없음');
    if (tlen > 160) c.push(`표 안내 글 ${tlen}자 (권장 30~120)`);
    const rows = tableLines.filter(l => !/^\s*\|\s*-/.test(l)).slice(1).map(l => l.split('|').slice(1, -1).map(s => s.trim()));
    const cells = rows.flatMap(r => r.slice(1)).filter(s => s && s !== '—' && s !== '-');
    const avgCell = cells.length ? Math.round(cells.reduce((x, s) => x + s.length, 0) / cells.length) : 0;
    it.tableCellAvg = avgCell;
    if (avgCell > 12) c.push(`표 칸 평균 ${avgCell}자 (권장 12자 이하, 사건 문장 대신 값)`);
    const resRows = rows.map(r => r[0]).filter(h => /결과|관찰|판정|변화|상태·결과/.test(h || ''));
    if (resRows.length) c.push(`결과·관찰 행 있음: ${resRows.join(', ')} (판정이 들어가지 않았는지 확인)`);
  } else {
    if (tableLines.length) c.push(`${KIND_NAME[it.kind]} 갈래인데 표가 들어 있음`);
    const [lo, hi] = it.kind === 'view' ? [200, 480] : [150, 310];
    if (tlen < lo || tlen > hi) c.push(`〈보기〉 ${tlen}자 (권장 ${lo}~${hi})`);
    if (it.kind === 'experiment' && !/^\s*\(단,/.test(lines.filter(l => l.trim()).pop() || '')) c.push("실험 갈래인데 '(단, …)' 줄 없음");
  }
  const lens = it.choices.map(ch => strip(ch).length);
  const ansLen = lens[it.answer - 1];
  const rank = 1 + lens.filter(l => l > ansLen).length;
  it.answerLenRank = rank;
  if (rank === 1 && !V6) c.push(`정답이 가장 긴 선지 (${ansLen}자, 다음 ${[...lens].sort((x, y) => y - x)[1]}자)`);
  const avg = Math.round(lens.reduce((x, y) => x + y, 0) / 5);
  it.choiceAvg = avg;
  const [clo, chi] = it.kind === 'graph' ? [35, 70] : it.kind === 'table' ? [35, 60] : it.kind === 'view' ? [70, 100] : [40, 85];
  if (avg < clo - 5 || avg > chi + 10) c.push(`선지 평균 ${avg}자 (권장 ${clo}~${chi})`);
  if (Array.isArray(it.twists)) {
    const cnt = {};
    it.twists.filter(x => x && x !== '참').forEach(x => { cnt[x] = (cnt[x] || 0) + 1; });
    const many = Object.entries(cnt).filter(([, n]) => n > 2);
    if (many.length) c.push(`같은 비튼 방식 3개 이상: ${many.map(([k, n]) => `${k} ${n}`).join(', ')}`);
  }
  if (V6) for (const w of checkStrategiesV6(it, MODE, it.kind)) c.push(`전략 점검: ${w}`);
  checks[it.version] = c;
}
const both = keptItem ? [...items, keptItem] : items;
const [i1, i2] = [both.find(x => x.version === 'V1'), both.find(x => x.version === 'V2')];
if (i1 && i2 && i1.answerTwist && i1.answerTwist === i2.answerTwist) (checks[ONLY || 'V2'] ||= []).push(`정답 비튼 방식이 V1과 같음: ${i2.answerTwist}`);
fs.writeFileSync(path.join(OUT, 'checks.json'), JSON.stringify(checks, null, 2));
fs.writeFileSync(path.join(OUT, 'items.json'), JSON.stringify({ passage: PID, mode: MODE, items }, null, 2));
if (keptItem) fs.writeFileSync(path.join(OUT, 'items-merged.json'), JSON.stringify({ passage: PID, mode: MODE, items: [...items, keptItem].sort((a, b) => a.version.localeCompare(b.version)) }, null, 2));
const exam = items.map(it => `[${it.version} · 갈래: ${KIND_NAME[it.kind] || it.kind}]\n${it.stem}\n〈보기〉${it.kind === 'graph' ? '(그림 대신 그래프 읽기 판)' : ''}\n${it.bogi}\n${it.choices.join('\n')}`).join('\n\n');
const s4 = await call('4-solve', `너는 수능 국어 만점권 수험생이자 검토자다. ${COMMON}
각 문항을 풀어라. 문항마다: 고른 답, 선지별 정오와 지문 근거 문장, 정답이 둘 이상이거나 없을 가능성, 〈보기〉와 지문이 모순되는 곳, 지문 밖 지식이 필요한 곳, 해석에 따라 정오가 흔들리는 선지를 적는다.
또 세 가지를 따로 검사한다.
(가) 장면-정의 대응: 〈보기〉가 지문 개념을 이름 대신 측정·관찰·행동으로 보여 주는 곳마다, 그 장면이 지문의 정의와 정확히 맞는지 본다. 측정 방향(예: 처음 들린 값과 처음 안 들린 값은 다르다), 몇 개 관찰을 개념 전체(구간 전체 등)로 넓힌 곳, 눈금·점수 같은 척도의 기준이 불분명한 곳, 장면만으로는 해설의 옮기기가 보장되지 않는 곳을 적는다. 없으면 '없음'.
(나) 실제로 막히는 문장: 일반적인 고등학생이 처음 읽을 때 문장 때문에 뜻을 놓치거나 잘못 잡을 만한 곳만 적는다(생략되어 둘 이상으로 읽히는 지시 대상, 뜻을 바로 잡기 어려운 명사구, 꼬인 문장). 문항이 요구하는 추론(조건 추적, 두 값 비교, 지문 개념으로 옮기기)과 사소한 확인은 적지 않는다. 없으면 '없음'.
(다) 설계 검사: 지문을 읽지 않고 〈보기〉만으로 정오가 드러나는 선지(정답이면 반드시 적는다), 결과 없이 '살폈다/비교했다'로 끝나 선지와 이어지지 않는 〈보기〉 문장, 두 버전(V1·V2)이 같은 착각을 노리는 선지 쌍을 적는다. 없으면 '없음'.
(라) 갈래 검사(v5): 버전마다 적힌 갈래에 맞게 〈보기〉가 쓰였는지 본다. 사례·관점: 〈보기〉에 목적·까닭·판정 결론이 있는가, 평가자와 평가 대상이 둘 다 〈보기〉에 있는가(관점). 표: 표에 판정 결과 행이 있는가, 칸에 값 대신 사건 문장이 있는가, 안내 글에 해석이 있는가, 두 선지가 같은 칸만 쓰는가, 표 칸을 가려도 지문만으로 풀리는 선지가 몇 개인가(둘 이상이면 적는다). 눈에 띄는 값을 그대로 비교한 오답 유인은 의도된 장치이므로 문제로 적지 않는다. 없으면 '없음'.
맨 끝에 \`\`\`json {"answers":{"V1":번호,"V2":번호},"designCheck":{"V1":[{"where":"선지 ② 또는 〈보기〉 n번째 문장 또는 V1③-V2④","issue":"문제 한 줄"}],"V2":[]},"sceneCheck":{"V1":[{"where":"〈보기〉 n번째 문장","concept":"지문 개념","issue":"어긋나는 점 한 줄"}],"V2":[]},"hardSentences":{"V1":[{"where":"〈보기〉 2번째 문장 또는 선지 ③","text":"해당 구절","why":"뜻을 놓치는 이유 한 줄"}],"V2":[]},"kindCheck":{"V1":[{"where":"〈보기〉 표 3행 또는 선지 ②","issue":"문제 한 줄"}],"V2":[]}} \`\`\` 블록을 덧붙인다.`,
  `[지문]\n${passage}\n\n[문항]\n${exam}`);

const solveJson = JSON.parse((lastJson(s4) || [, '{"answers":{}}'])[1]);
const ans = solveJson.answers;
const hard = solveJson.hardSentences || {};
const scene = solveJson.sceneCheck || {};
const design = solveJson.designCheck || {};
const kindChk = solveJson.kindCheck || {};
const summary = items.map(it => `${it.version}: 출제 정답 ${it.answer} / 풀이 답 ${ans[it.version] ?? '?'} → ${String(it.answer) === String(ans[it.version]) ? '일치' : '불일치'} / 〈보기〉 ${it.bogiChars}자 / 설계 문제 ${(design[it.version] || []).length}곳 / 장면-정의 문제 ${(scene[it.version] || []).length}곳 / 막히는 문장 ${(hard[it.version] || []).length}곳 / 갈래 ${it.kind} 문제 ${(kindChk[it.version] || []).length}곳 / 정답 비튼 방식 ${it.answerTwist ?? '?'} / 정답 길이 순위 ${it.answerLenRank} / 선지 평균 ${it.choiceAvg}자${it.answerMoved ? ` / 번호 옮김 ${it.answerMoved}` : ''} / 기계 점검 ${(checks[it.version] || []).length}건`).join('\n');
fs.writeFileSync(path.join(OUT, 'summary.txt'), summary + '\n');
fs.writeFileSync(path.join(OUT, 'solve.json'), JSON.stringify(ans, null, 2));
fs.writeFileSync(path.join(OUT, 'hard-sentences.json'), JSON.stringify(hard, null, 2));
fs.writeFileSync(path.join(OUT, 'scene-check.json'), JSON.stringify(scene, null, 2));
fs.writeFileSync(path.join(OUT, 'design-check.json'), JSON.stringify(design, null, 2));
fs.writeFileSync(path.join(OUT, 'kind-check.json'), JSON.stringify(kindChk, null, 2));
console.log('\n' + summary + '\n결과: ' + OUT);
