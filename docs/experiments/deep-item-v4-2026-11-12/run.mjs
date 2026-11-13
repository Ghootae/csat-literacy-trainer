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
// 필요: OPENAI_API_KEY (저장소 .env 또는 셸 환경), 저장소의 openai 패키지.
// 모델: gpt-6.1-sol (운영 생성 모델과 같게). 사람 개입 없음: 2단계 선별도 모델이 한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

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

const MODEL = process.env.GEN_MODEL || 'gpt-6.1-sol';
const EFFORT = process.env.GEN_EFFORT || 'high';
const POLISH_EFFORT = process.env.POLISH_EFFORT || EFFORT;
const client = new OpenAI({ maxRetries: 0, timeout: 60 * 60 * 1000 }); // 재시도하면 중복 과금, 긴 추론은 스트리밍으로 받는다
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
const rulesA = fs.readFileSync(path.join(DIR, `rules-${MODE}.md`), 'utf8');
let avoidText = '';
const avoidSrc = path.join(DIR, OUT_NAME, `${PID}-A`, 'items.json');
if (MODE === 'B' && fs.existsSync(avoidSrc)) {
  const prev = JSON.parse(fs.readFileSync(avoidSrc, 'utf8')).items;
  avoidText = prev.map(it => `[A형 ${it.version}] 정답 착각: ${it.answerIntent ?? ''}\n` + it.choices.map((c, i) => `  ${c} (${it.truth?.[i] === 'X' ? '거짓' : '참'})`).join('\n')).join('\n\n');
  console.log('[함정 중복 방지] A형 결과를 이미 쓴 함정으로 넘김');
} else if (MODE === 'B') console.warn('[주의] A형 items.json 이 없어 함정 중복 방지 없이 실행합니다. A를 먼저 실행하세요.');
const AVOID = avoidText ? `\n\n[이미 쓴 함정 — 같은 지문의 A형 문항. 이 착각들은 정답·오답 어디에도 다시 쓰지 않는다]\n${avoidText}` : '';
const guideText = fs.readFileSync(path.join(DIR, process.env.GUIDE || 'readability-guide-v4.md'), 'utf8');
const usagePath = path.join(OUT, 'usage.json');
const usageLog = fs.existsSync(usagePath) ? JSON.parse(fs.readFileSync(usagePath, 'utf8')) : [];

async function call(stage, instructions, input, effort = EFFORT) {
  const cached = path.join(OUT, `${stage}.md`);
  if (fs.existsSync(cached) && !process.env.FORCE) { console.log(`[${stage}] 이미 있음, 건너뜀`); return fs.readFileSync(cached, 'utf8'); }
  console.log(`[${stage}] 호출 중 (${MODEL}, ${effort})...`);
  const t0 = Date.now();
  const res = await client.responses.stream({ model: MODEL, reasoning: { effort }, instructions, input }).finalResponse();
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
   (계산 양식) 4개 중 최소 하나는 식·절차를 직접 공격하는 후보(여러 변수 상쇄, 여러 단계 거친 결과)로, 최소 하나는 지문의 한 사례·부분에서 가져온 변수 방향을 다른 식·단계에 넣어야 판단되는 후보(사례 건너뛰기)로 고른다. 이런 후보가 목록에 없으면 그 사실을 적는다.` : ''}
3. 정답 후보 추천: 선정 4개 중 정답 자리에 가장 좋은 것과 그 이유(깊이와 매력도를 함께 보고).`,
  `[지문]\n${passage}\n\n[후보 목록]\n${s1}${AVOID}`);

// 3단계: 조립 (웹 스레드 하위 에이전트와 같은 지시, 재료 B만 2단계 결과로 바꿈)
const ASSEMBLE_A = `
할 일: "윗글을 바탕으로 〈보기〉를 이해한 내용으로 적절하지 않은 것은?" 형식의 5지선다 〈보기〉 문항을 두 버전(V1, V2) 만든다. 각 버전은 재료 B의 거짓 진술들이 다루는 구역을 중심에 두되, 〈보기〉의 구체 사례에 맞게 선지를 새로 쓴다. 두 버전은 〈보기〉 사례뿐 아니라 정답이 노리는 착각과 〈보기〉 짜임도 서로 달라야 한다(규칙 16).

출제 과정(규칙 A를 따른다):
1. 〈보기〉 사례 설계: 가상의 대상 하나(또는 둘)를 두고 3~6문장으로 쓴다. 핵심 개념만 정의로 풀어 쓴다(규칙 1). 사건은 원인·동기로 이어지게 쓴다(규칙 13). 지문 예시를 이름만 바꿔 옮기지 않는다(규칙 14). 디테일은 오해를 부르도록 고른다.
2. 선지 후보: 〈보기〉 문장마다 참 버전을 먼저 쓰고, 규칙 6을 통과하는 거짓 버전이 있는지 시도한다. 시도와 버린 이유를 짧게 기록한다.
3. 〈보기〉 길이를 규칙 10에 맞춘다(공백 제외 300자 이하). 넘으면 줄인다.
4. 최종 5선지: 거짓(=정답) 정확히 1개, 참 4개. 〈보기〉 관찰 문장은 결과까지 쓰고(규칙 23), 〈보기〉만으로 정오가 드러나는 선지는 쓰지 않으며(규칙 24), V1과 V2는 선지 함정을 공유하지 않는다(규칙 25). 정답은 마지막에 깊이와 매력도를 함께 보고 가장 좋은 거짓 후보로 고른다(규칙 17). 거짓은 단정어가 아니라 개념을 잘못 연결해서 생겨야 한다(규칙 15). 참 선지 4개도 각각 〈보기〉 표현 → 지문 개념 옮기기가 필요해야 한다. 참 선지 중 일부는 B의 거짓 진술을 뒤집은 '참이지만 헷갈리는' 형태로 써도 좋다.
5. 자기 검산: 선지마다 정오와 지문 근거 문장(원문 그대로)을 적고, 〈보기〉의 어느 표현을 어느 지문 개념으로 옮겨야 하는지 적는다. 정답이 하나뿐인지, 지문 밖 지식이 필요 없는지, 해석에 따라 정오가 바뀌는 선지가 없는지 확인한다.

출력(마크다운): 버전마다 (1) 문항(발문, 〈보기〉, 선지 ①~⑤) — 정답 표시 없이 시험지 형태로, (2) 정답과 선지별 해설 표(정오, 근거 문장, 옮기기 단계), (3) 출제 기록(〈보기〉 문장별 노린 오해, 시도했다가 버린 선지와 이유).
`;
const ASSEMBLE_B = `
할 일: "윗글을 바탕으로 〈보기〉를 이해한 내용으로 가장 적절한 것은?" 형식의 5지선다 〈보기〉 문항을 두 버전(V1, V2) 만든다. 지문의 식(변수 관계)·수치 범위·판단 절차를 중심에 두고, 재료 S의 거짓 진술들이 다루는 구역을 함정 선지에 활용하되 〈보기〉의 구체 사례에 맞게 새로 쓴다. 두 버전은 〈보기〉 장면뿐 아니라 정답이 공격하는 고리와 〈보기〉 짜임도 서로 달라야 한다(규칙 20).

출제 과정(규칙 B를 따른다):
1. 〈보기〉 사례 설계: 식·절차가 적용되는 현실 장면, 시간 축, 대상 둘 중 하나만 변화, 변수는 관찰 특징으로. 3~5문장. 사건은 원인·동기로 잇고(규칙 7), 지문 예시를 이름만 바꿔 옮기지 않는다(규칙 8). 규칙 문서의 예시 소재는 쓰지 않는다.
2. 선지 후보: 범위 → 한 변수 방향 → 여러 변수 상쇄 → 지문의 다른 문장 연결 순으로 고리를 고르고, 고리마다 참·거짓 버전을 모두 써 본 뒤 더 어려운 쪽을 고른다. 시도와 버린 이유를 짧게 기록한다.
3. 〈보기〉 길이를 규칙 5에 맞춘다(공백 제외 300자 이하).
4. 최종 5선지: 참(=정답) 정확히 1개, 거짓 4개. 〈보기〉 관찰 문장은 결과까지 쓰고(규칙 26), 〈보기〉만으로 정오가 드러나는 선지는 쓰지 않으며(규칙 27), V1과 V2는 선지 함정을 공유하지 않는다(규칙 28). 정답 자리에는 사례 건너뛰기 연결을 둔다(규칙 18). 불가능하면 출제 기록에 이유를 적고 여러 변수 상쇄 선지를 정답으로 둔다. 거짓 4개는 쉬움·중간·어려움을 섞고, 단정어로 거짓을 만들지 않는다(규칙 17).
5. 자기 검산: 선지마다 정오와 지문 근거 문장(원문 그대로), 〈보기〉의 어느 특징을 어느 변수로 옮겨야 하는지, 필요한 경우 배수 검산을 적는다. 참이 하나뿐인지, 지문 밖 지식이 필요 없는지, 해석에 따라 정오가 바뀌는 선지가 없는지 확인한다. 각 선지의 난도(쉬움/중간/어려움)도 적는다.

출력(마크다운): 버전마다 (1) 문항(발문, 〈보기〉, 선지 ①~⑤) — 정답 표시 없이 시험지 형태로, (2) 정답과 선지별 해설 표(정오, 근거 문장, 옮기기 단계, 난도), (3) 출제 기록(〈보기〉 문장별 노린 오해, 시도했다가 버린 선지와 이유).
`;
const s3 = await call('3-assemble', `너는 수능 국어 독서 출제자다. ${COMMON}
${MODE === 'B' ? ASSEMBLE_B : ASSEMBLE_A}맨 끝에 아래 형식의 JSON 코드 블록을 하나 덧붙인다:
\`\`\`json
{"items":[{"version":"V1","stem":"...","bogi":"...","choices":["①...","②...","③...","④...","⑤..."],"answer":4}]}
\`\`\``,
  `[지문]\n${passage}\n\n[${MODE}. 출제 규칙]\n${rulesA}\n\n[가독성 기준 — 〈보기〉와 선지 문장을 처음부터 이 기준에 맞게 쓴다]\n${guideText}\n\n[${MODE === 'B' ? 'S' : 'B'}. 선정된 거짓 진술]\n${s2}${AVOID}`);

// 3b단계: 사후 수정(다듬기) — 표현만 고친다. 정오·정답·연결 고리는 그대로.
const lastJson = t => [...t.matchAll(/```json\s*([\s\S]*?)```/g)].pop();
if (!lastJson(s3)) throw new Error('3단계 출력에서 JSON 블록을 찾지 못했습니다. out/3-assemble.md 확인');
const checklist = fs.readFileSync(path.join(DIR, 'polish-checklist.md'), 'utf8');
const s3b = await call('3b-polish', `너는 수능 국어 독서 문항의 문장을 다듬는 편집자다. ${COMMON}
입력은 지문, 출제 규칙, 출제자가 만든 문항 두 개(해설·출제 기록 포함), 다듬기 점검표다.
할 일: 점검표 항목을 문항의 〈보기〉와 선지 문장 하나하나에 적용해 표현만 고친다.
지킬 것:
- 정오, 정답 번호, 선지가 노리는 연결 고리와 난도는 바꾸지 않는다. 문항을 버리거나 쉽게 만들지 않는다.
- 고치면 정오가 흔들릴 것 같은 문제는 고치지 않고 '논리 메모'에 적는다.
- 고칠 곳이 없으면 그대로 둔다. 고치기 위해 고치지 않는다.
출력(마크다운): 버전마다 (1) 수정 표: 위치(〈보기〉 n번째 문장 / 선지 번호), 원문, 수정문, 점검표 항목 번호, (2) 논리 메모(없으면 '없음'), (3) 다듬은 문항(시험지 형태).
맨 끝에 아래 형식의 JSON 코드 블록을 하나 덧붙인다. truth는 선지별 정오(적절하면 "O", 적절하지 않으면 "X"), intent는 선지별 출제 의도 한 줄(〈보기〉의 어느 표현을 지문의 어느 개념으로 옮겨야 하는지, 거짓이면 어디가 어긋나는지), answerIntent는 정답이 노리는 착각 한 줄이다:
\`\`\`json
{"items":[{"version":"V1","stem":"...","bogi":"...","choices":["①...","②...","③...","④...","⑤..."],"answer":4,"truth":["O","O","O","X","O"],"intent":["...","...","...","...","..."],"answerIntent":"...","edits":3}]}
\`\`\``,
  `[지문]\n${passage}\n\n[출제 규칙]\n${rulesA}\n\n[다듬기 점검표]\n${checklist}\n\n[출제자가 만든 문항]\n${s3}`, POLISH_EFFORT);

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
맨 끝에 입력 JSON과 같은 형식의 JSON 코드 블록을 하나 덧붙인다. 항목마다 "hidden"(숨긴 핵심 개념 배열)과 "readabilityEdits"(수정 수)를 더하고, intent도 고친 문장에 맞게 갱신한다.`,
  `[지문]\n${passage}\n\n[교정 기준]\n${guide}\n\n[출제 기록]\n${s3}\n\n[다듬은 문항 JSON]\n${j3b[1]}`, POLISH_EFFORT);

// 4단계: 독립 풀이 검증 (정답 모르는 상태로, 최종 교정한 문항을 푼다)
const json = lastJson(s3c);
if (!json) throw new Error('3c단계 출력에서 JSON 블록을 찾지 못했습니다. out/3c-readability.md 확인');
const items = JSON.parse(json[1]).items;
const before = Object.fromEntries(JSON.parse(lastJson(s3)[1]).items.map(it => [it.version, it]));
const polished = Object.fromEntries(JSON.parse(j3b[1]).items.map(it => [it.version, it]));
for (const it of items) {
  it.bogiChars = it.bogi.replace(/\s/g, '').length;
  const b0 = before[it.version];
  if (b0 && String(b0.answer) !== String(it.answer)) console.warn(`[경고] ${it.version}: 다듬기·교정에서 정답이 바뀜 ${b0.answer} → ${it.answer}`);
  const p0 = polished[it.version];
  if (p0) { it.before = { bogi: p0.bogi, choices: p0.choices }; it.edits = p0.edits; }
}
fs.writeFileSync(path.join(OUT, 'items.json'), JSON.stringify({ passage: PID, mode: MODE, items }, null, 2));
const exam = items.map(it => `[${it.version}]\n${it.stem}\n〈보기〉\n${it.bogi}\n${it.choices.join('\n')}`).join('\n\n');
const s4 = await call('4-solve', `너는 수능 국어 만점권 수험생이자 검토자다. ${COMMON}
각 문항을 풀어라. 문항마다: 고른 답, 선지별 정오와 지문 근거 문장, 정답이 둘 이상이거나 없을 가능성, 〈보기〉와 지문이 모순되는 곳, 지문 밖 지식이 필요한 곳, 해석에 따라 정오가 흔들리는 선지를 적는다.
또 세 가지를 따로 검사한다.
(가) 장면-정의 대응: 〈보기〉가 지문 개념을 이름 대신 측정·관찰·행동으로 보여 주는 곳마다, 그 장면이 지문의 정의와 정확히 맞는지 본다. 측정 방향(예: 처음 들린 값과 처음 안 들린 값은 다르다), 몇 개 관찰을 개념 전체(구간 전체 등)로 넓힌 곳, 눈금·점수 같은 척도의 기준이 불분명한 곳, 장면만으로는 해설의 옮기기가 보장되지 않는 곳을 적는다. 없으면 '없음'.
(나) 실제로 막히는 문장: 일반적인 고등학생이 처음 읽을 때 문장 때문에 뜻을 놓치거나 잘못 잡을 만한 곳만 적는다(생략되어 둘 이상으로 읽히는 지시 대상, 뜻을 바로 잡기 어려운 명사구, 꼬인 문장). 문항이 요구하는 추론(조건 추적, 두 값 비교, 지문 개념으로 옮기기)과 사소한 확인은 적지 않는다. 없으면 '없음'.
(다) 설계 검사: 지문을 읽지 않고 〈보기〉만으로 정오가 드러나는 선지, 결과 없이 '살폈다/비교했다'로 끝나 선지와 이어지지 않는 〈보기〉 문장, 두 버전(V1·V2)이 같은 착각을 노리는 선지 쌍을 적는다. 없으면 '없음'.
맨 끝에 \`\`\`json {"answers":{"V1":번호,"V2":번호},"designCheck":{"V1":[{"where":"선지 ② 또는 〈보기〉 n번째 문장 또는 V1③-V2④","issue":"문제 한 줄"}],"V2":[]},"sceneCheck":{"V1":[{"where":"〈보기〉 n번째 문장","concept":"지문 개념","issue":"어긋나는 점 한 줄"}],"V2":[]},"hardSentences":{"V1":[{"where":"〈보기〉 2번째 문장 또는 선지 ③","text":"해당 구절","why":"뜻을 놓치는 이유 한 줄"}],"V2":[]}} \`\`\` 블록을 덧붙인다.`,
  `[지문]\n${passage}\n\n[문항]\n${exam}`);

const solveJson = JSON.parse((lastJson(s4) || [, '{"answers":{}}'])[1]);
const ans = solveJson.answers;
const hard = solveJson.hardSentences || {};
const scene = solveJson.sceneCheck || {};
const design = solveJson.designCheck || {};
const summary = items.map(it => `${it.version}: 출제 정답 ${it.answer} / 풀이 답 ${ans[it.version] ?? '?'} → ${String(it.answer) === String(ans[it.version]) ? '일치' : '불일치'} / 〈보기〉 ${it.bogiChars}자${it.bogiChars > 300 ? ' (권장 길이 넘음, 참고)' : ''} / 설계 문제 ${(design[it.version] || []).length}곳 / 장면-정의 문제 ${(scene[it.version] || []).length}곳 / 막히는 문장 ${(hard[it.version] || []).length}곳`).join('\n');
fs.writeFileSync(path.join(OUT, 'summary.txt'), summary + '\n');
fs.writeFileSync(path.join(OUT, 'solve.json'), JSON.stringify(ans, null, 2));
fs.writeFileSync(path.join(OUT, 'hard-sentences.json'), JSON.stringify(hard, null, 2));
fs.writeFileSync(path.join(OUT, 'scene-check.json'), JSON.stringify(scene, null, 2));
fs.writeFileSync(path.join(OUT, 'design-check.json'), JSON.stringify(design, null, 2));
console.log('\n' + summary + '\n결과: ' + OUT);
