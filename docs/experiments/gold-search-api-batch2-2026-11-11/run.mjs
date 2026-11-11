// API 방식으로 "골드 지도 탐색 → 선별 → 〈보기〉 조립 → 독립 풀이 검증"을 처음부터 돌린다.
// 실행: 저장소 루트에서  PASSAGE=<id> node docs/experiments/gold-search-api-batch2-2026-11-11/run.mjs   (passages/<id>/ 에 passage.txt, map.json)
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
const client = new OpenAI({ maxRetries: 0, timeout: 60 * 60 * 1000 }); // 재시도하면 중복 과금, 긴 추론은 스트리밍으로 받는다
const PID = process.env.PASSAGE;
if (!PID) throw new Error('PASSAGE=<id> 를 지정하세요');
const PDIR = path.join(DIR, 'passages', PID);
const OUT = path.join(DIR, 'out', PID);
fs.mkdirSync(OUT, { recursive: true });

const passage = fs.readFileSync(path.join(PDIR, 'passage.txt'), 'utf8');
const map = fs.readFileSync(path.join(PDIR, 'map.json'), 'utf8');
const rulesA = fs.readFileSync(path.join(DIR, 'rules-A.md'), 'utf8');
const usageLog = [];

async function call(stage, instructions, input) {
  const cached = path.join(OUT, `${stage}.md`);
  if (fs.existsSync(cached) && !process.env.FORCE) { console.log(`[${stage}] 이미 있음, 건너뜀`); return fs.readFileSync(cached, 'utf8'); }
  console.log(`[${stage}] 호출 중 (${MODEL}, ${EFFORT})...`);
  const t0 = Date.now();
  const res = await client.responses.stream({ model: MODEL, reasoning: { effort: EFFORT }, instructions, input }).finalResponse();
  const text = res.output_text;
  fs.writeFileSync(cached, text);
  usageLog.push({ stage, model: res.model, seconds: Math.round((Date.now() - t0) / 1000), usage: res.usage });
  fs.writeFileSync(path.join(OUT, 'usage.json'), JSON.stringify(usageLog, null, 2));
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
3. 거르기. 후보마다 아래 네 검사를 엄격히 적용하고, 모두 통과한 것만 남긴다.
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

입력은 지문과, 헷갈리는 거짓 진술 후보 목록이다. 후보마다 "깊이"와 등급을 매기고 가장 좋은 4개를 고른다.

깊이 = 학생이 정오를 가리려고 연결해야 하는 지문 개념·규칙의 수(1, 1.5, 2, 3단계).
등급 기준(사람 평가자의 실제 판단에서 뽑은 것):
- very good: 반박 근거가 앞 문장과 다른 문단에 있다. 이름·겉모습이 닮은 이웃 개념 쌍을 섞는다(예: 겉모습이나 이름이 비슷한 두 제도·개념, 전체와 그 한 부분, 두 관점이 같은 용어를 다르게 쓰는 경우). 상식·직관이 거짓 쪽으로 학생을 끌어당긴다. 보통 2단계.
- good: 원칙과 예외가 부딪치는 진술(원칙만 보면 참). 또는 결과는 맞고 근거만 바꾼 진술. 보통 1~1.5단계.
- acceptable: 거짓이 분명하지만 헷갈림이 약하다.
- not good / bad: 한 문단 안, 한 구절만 보면 바로 풀린다. 또는 지문 표현을 거의 그대로 비틀었다.

출력(마크다운):
1. 후보별 표: 번호, 진술 요약, 깊이, 등급, 한 줄 이유
2. 선정 4개: 원문 진술 그대로, 그리고 각각 "(어떤 착각인가. 실제: 지문상 사실)" 형식의 한 줄 설명. 4개는 서로 같은 포인트를 반복하지 않게 하되, 한 〈보기〉 문항으로 엮을 수 있도록 가까운 구역에서 고른다.`,
  `[지문]\n${passage}\n\n[후보 목록]\n${s1}`);

// 3단계: 조립 (웹 스레드 하위 에이전트와 같은 지시, 재료 B만 2단계 결과로 바꿈)
const s3 = await call('3-assemble', `너는 수능 국어 독서 출제자다. ${COMMON}

할 일: "윗글을 바탕으로 〈보기〉를 이해한 내용으로 적절하지 않은 것은?" 형식의 5지선다 〈보기〉 문항을 두 버전(V1, V2) 만든다. 각 버전은 재료 B의 거짓 진술들이 다루는 구역을 중심에 두되, 〈보기〉의 구체 사례에 맞게 선지를 새로 쓴다. 두 버전은 〈보기〉 사례가 서로 달라야 한다.

출제 과정(규칙 A를 따른다):
1. 〈보기〉 사례 설계: 가상의 대상 하나(또는 둘)를 두고 3~6문장으로 쓴다. 지문 용어를 쓰지 말고 정의를 풀어 쓴다. 디테일은 오해를 부르도록 고른다.
2. 선지 후보: 〈보기〉 문장마다 참 버전을 먼저 쓰고, 규칙 6을 통과하는 거짓 버전이 있는지 시도한다. 시도와 버린 이유를 짧게 기록한다.
3. 〈보기〉 길이를 규칙 10에 맞춘다(공백 제외 300자 이하). 넘으면 줄인다.
4. 최종 5선지: 거짓(=정답) 정확히 1개, 참 4개. 정답은 마지막에 가장 좋은 거짓 후보로 고른다. 참 선지 4개도 각각 〈보기〉 표현 → 지문 개념 옮기기가 필요해야 한다. 참 선지 중 일부는 B의 거짓 진술을 뒤집은 '참이지만 헷갈리는' 형태로 써도 좋다.
5. 자기 검산: 선지마다 정오와 지문 근거 문장(원문 그대로)을 적고, 〈보기〉의 어느 표현을 어느 지문 개념으로 옮겨야 하는지 적는다. 정답이 하나뿐인지, 지문 밖 지식이 필요 없는지, 해석에 따라 정오가 바뀌는 선지가 없는지 확인한다.

출력(마크다운): 버전마다 (1) 문항(발문, 〈보기〉, 선지 ①~⑤) — 정답 표시 없이 시험지 형태로, (2) 정답과 선지별 해설 표(정오, 근거 문장, 옮기기 단계), (3) 출제 기록(〈보기〉 문장별 노린 오해, 시도했다가 버린 선지와 이유).
맨 끝에 아래 형식의 JSON 코드 블록을 하나 덧붙인다:
\`\`\`json
{"items":[{"version":"V1","stem":"...","bogi":"...","choices":["①...","②...","③...","④...","⑤..."],"answer":4}]}
\`\`\``,
  `[지문]\n${passage}\n\n[A. 출제 규칙]\n${rulesA}\n\n[B. 선정된 거짓 진술]\n${s2}`);

// 4단계: 독립 풀이 검증 (정답 모르는 상태로 풀기)
const lastJson = t => [...t.matchAll(/```json\s*([\s\S]*?)```/g)].pop();
const json = lastJson(s3);
if (!json) throw new Error('3단계 출력에서 JSON 블록을 찾지 못했습니다. out/3-assemble.md 확인');
const items = JSON.parse(json[1]).items;
for (const it of items) { it.bogiChars = it.bogi.replace(/\s/g, '').length; }
const exam = items.map(it => `[${it.version}]\n${it.stem}\n〈보기〉\n${it.bogi}\n${it.choices.join('\n')}`).join('\n\n');
const s4 = await call('4-solve', `너는 수능 국어 만점권 수험생이자 검토자다. ${COMMON}
각 문항을 풀어라. 문항마다: 고른 답, 선지별 정오와 지문 근거 문장, 정답이 둘 이상이거나 없을 가능성, 〈보기〉와 지문이 모순되는 곳, 지문 밖 지식이 필요한 곳, 해석에 따라 정오가 흔들리는 선지를 적는다.
맨 끝에 \`\`\`json {"answers":{"V1":번호,"V2":번호}} \`\`\` 블록을 덧붙인다.`,
  `[지문]\n${passage}\n\n[문항]\n${exam}`);

const ans = JSON.parse((lastJson(s4) || [, '{"answers":{}}'])[1]).answers;
const summary = items.map(it => `${it.version}: 출제 정답 ${it.answer} / 풀이 답 ${ans[it.version] ?? '?'} → ${String(it.answer) === String(ans[it.version]) ? '일치' : '불일치'} / 〈보기〉 ${it.bogiChars}자${it.bogiChars > 300 ? ' (상한 초과)' : ''}`).join('\n');
fs.writeFileSync(path.join(OUT, 'summary.txt'), summary + '\n');
console.log('\n' + summary + '\n결과: ' + OUT);
