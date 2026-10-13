import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const WORKSPACE_ROOT = resolve('.');
const TRAINER_DATA_ROOT = resolve('/Users/mac/Projects/csat-literacy-trainer/data');
const PAGE_CACHE_ROOT = resolve(
  process.env['CSAT_SOURCE_PAGE_CACHE_ROOT'] ?? '/tmp/csat-low-skill-pages',
);
const PROSPECTIVE_ROOT = resolve(
  'docs/experiments/problem-gold-prospective-blind-2026-09-03/gold-production/artifacts',
);
const EXPERIMENT_ROOT = resolve(
  'docs/experiments/problem-evaluator-three-reference-low-skill-10-item-2026-09-06',
);
const ARTIFACT_ROOT = resolve(EXPERIMENT_ROOT, 'artifacts');
const SOURCE_CASE_ROOT = resolve(ARTIFACT_ROOT, 'source-cases');
const MEDIA_ROOT = resolve(ARTIFACT_ROOT, 'source-media');
const FIXTURE_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/three-reference-low-skill-ten-case-fixtures-v1.json',
);

type Assessment = 'NO_ERROR_DETECTED' | 'CLEAR_ERROR' | 'INSUFFICIENT_EVIDENCE';
type Action = 'COMPLETE' | 'ASK_CORRECTIVE' | 'ASK_DIAGNOSTIC';

interface ResponseSeed {
  readonly choiceId: string;
  readonly rationale: string;
  readonly expectedAssessment: Assessment;
  readonly expectedAction: Action;
  readonly expectedFocus: string;
}

interface CaseSeed {
  readonly prospectiveCaseId: string;
  readonly domain: 'HUMANITIES' | 'SOCIAL' | 'SCIENCE';
  readonly priorCandidateRisk: 'LOW' | 'MEDIUM';
  readonly responses: Readonly<Record<
    'correctInsufficient' | 'wrongMediumLow' | 'wrongLow',
    ResponseSeed
  >>;
}

const insufficient = (
  choiceId: string,
  rationale: string,
  expectedFocus: string,
): ResponseSeed => ({
  choiceId,
  rationale,
  expectedAssessment: 'INSUFFICIENT_EVIDENCE',
  expectedAction: 'ASK_DIAGNOSTIC',
  expectedFocus,
});

const clearError = (
  choiceId: string,
  rationale: string,
  expectedFocus: string,
): ResponseSeed => ({
  choiceId,
  rationale,
  expectedAssessment: 'CLEAR_ERROR',
  expectedAction: 'ASK_CORRECTIVE',
  expectedFocus,
});

const CASES: readonly CaseSeed[] = [
  {
    prospectiveCaseId: 'prospective-69bffa62fa5063deffe19c88-q8',
    domain: 'SOCIAL',
    priorCandidateRisk: 'LOW',
    responses: {
      correctInsufficient: insufficient(
        'C5',
        '조정 절차가 시작되는 조건과 관련 있다고 생각해서 ⑤를 골랐다.',
        '갑의 거절 뒤 조정 절차가 실제로 시작되는지와 조정위원회의 자료 수집 가능성을 어떻게 연결했는지 확인한다.',
      ),
      wrongMediumLow: clearError(
        'C3',
        'B 상가의 보증금이 상한액을 넘더라도 임차인 보호를 위해 최단 존속 기간은 계속 보장되므로 ③이 적절하지 않다.',
        '보증금이 법정 상한액을 초과하면 상가 임대차의 최단 존속 기간이 적용되지 않는다는 예외 조건을 교정한다.',
      ),
      wrongLow: insufficient(
        'C1',
        '보기의 A 주택 조건과 관련 있다고 생각해 ①을 골랐다.',
        'A 주택의 어떤 사실과 어떤 법적 효과를 연결해 ①을 부적절하다고 판단했는지 묻는다.',
      ),
    },
  },
  {
    prospectiveCaseId: 'prospective-69bffb2978128b2a9bedcf17-q6',
    domain: 'HUMANITIES',
    priorCandidateRisk: 'LOW',
    responses: {
      correctInsufficient: insufficient(
        'C5',
        '두 이론의 차이가 청자의 감정 변화에 있다고 생각해 ⑤를 골랐다.',
        '환기론과 인지론이 청자의 감정 변화를 각각 인정하는지 구체적으로 확인한다.',
      ),
      wrongMediumLow: clearError(
        'C2',
        '환기론은 청자가 감정을 실제로 느끼는 것이 아니라 인지한다고 보기 때문에 ②가 적절하지 않다.',
        '감정을 실제로 느끼지 않고 인지한다고 보는 입장은 환기론이 아니라 인지론이라는 입장 대응을 교정한다.',
      ),
      wrongLow: insufficient(
        'C4',
        '두 이론의 공통점을 말하고 있어서 ④를 골랐다.',
        '두 이론이 공통으로 인정한다고 본 대상이 음악의 표현 가능성인지 청자의 감정 변화인지 구별하게 한다.',
      ),
    },
  },
  {
    prospectiveCaseId: 'prospective-69c01c4f78128b2a9bede42e-q27',
    domain: 'SOCIAL',
    priorCandidateRisk: 'LOW',
    responses: {
      correctInsufficient: insufficient(
        'C5',
        '표현대리와 기본대리권을 구분해야 해서 ⑤를 골랐다.',
        '대리권 수여의 표시가 실제 대리권인 기본대리권을 발생시킨다고 보았는지 확인한다.',
      ),
      wrongMediumLow: clearError(
        'C4',
        '표현대리가 성립하면 상대방이 주장하지 않아도 자동으로 본인에게 효력이 생기므로 ④가 적절하지 않다.',
        '표현대리가 성립해도 상대방이 이를 주장해야 본인에게 효력이 미친다는 조건을 교정한다.',
      ),
      wrongLow: insufficient(
        'C3',
        '추인 뒤의 효과를 말하는 내용이라 ③을 골랐다.',
        '본인의 추인이 무권대리행위에 어떤 시점부터 어떤 효력을 주는 것으로 이해했는지 묻는다.',
      ),
    },
  },
  {
    prospectiveCaseId: 'prospective-69c01e63fa5063deffe1b596-q20',
    domain: 'HUMANITIES',
    priorCandidateRisk: 'LOW',
    responses: {
      correctInsufficient: insufficient(
        'C4',
        '퍼트넘이 의미 내재주의를 비판했다는 점 때문에 ④를 골랐다.',
        '개인이 부여한 주관적 의미를 내재주의와 퍼트넘이 각각 어떻게 평가한다고 보았는지 확인한다.',
      ),
      wrongMediumLow: clearError(
        'C5',
        '외부 세계의 지시체도 개인의 기술구를 통해서만 의미를 결정하므로 ⑤가 적절하지 않다.',
        '퍼트넘은 개인의 기술구가 아니라 외부 세계의 지시체가 의미를 결정한다고 본다는 대비를 교정한다.',
      ),
      wrongLow: insufficient(
        'C2',
        '전통적 관점에 대한 설명 같아서 ②를 골랐다.',
        '전통적 관점에서 인간의 인식과 언어 의미 사이의 관계를 어떻게 이해했는지 묻는다.',
      ),
    },
  },
  {
    prospectiveCaseId: 'prospective-69c0ad79fa5063deffe1e90b-q22',
    domain: 'SOCIAL',
    priorCandidateRisk: 'LOW',
    responses: {
      correctInsufficient: insufficient(
        'C2',
        '금리 인상 뒤 소비와 물가의 흐름을 보면 ②라고 생각했다.',
        '기준 금리 인상이 소비 심리와 물가에 어떤 방향으로 작용한다고 보았는지 확인한다.',
      ),
      wrongMediumLow: clearError(
        'C1',
        '기준 금리가 오르면 부동산 가격도 더 오를 수 있으므로 투자를 미룬다는 ①이 적절하지 않다.',
        '기준 금리 인상은 유동성을 줄여 자산 가격을 낮추는 방향으로 작용한다는 관계를 교정한다.',
      ),
      wrongLow: insufficient(
        'C3',
        '기업 대출과 관련된 반응이라 ③을 골랐다.',
        '금리 인상이 기업의 대출 부담과 공장 확장 결정에 어떤 영향을 준다고 보았는지 묻는다.',
      ),
    },
  },
  {
    prospectiveCaseId: 'prospective-6a2294f386fd308968e10e95-q19',
    domain: 'SCIENCE',
    priorCandidateRisk: 'LOW',
    responses: {
      correctInsufficient: insufficient(
        'C4',
        '친수성과 소수성의 배치가 반대인 것 같아서 ④를 골랐다.',
        '돌기 옆면의 역할에 필요한 젖음성과 A·C의 접촉각을 어떻게 연결했는지 확인한다.',
      ),
      wrongMediumLow: clearError(
        'C3',
        '돌기 꼭대기는 소수성이고 옆면은 친수성이어야 하므로 A와 D를 배치한 ③은 적절하지 않다.',
        '물을 포집하는 꼭대기는 친수성, 이동시키는 옆면은 소수성이어야 한다는 역할 대응을 교정한다.',
      ),
      wrongLow: insufficient(
        'C5',
        '접촉각이 가장 큰 재료가 언급되어 ⑤를 골랐다.',
        'C와 B의 배치 순서가 물의 포집과 이동 효율에 어떤 영향을 준다고 보았는지 묻는다.',
      ),
    },
  },
  {
    prospectiveCaseId: 'prospective-6a22950f86fd308968e11320-q19',
    domain: 'SCIENCE',
    priorCandidateRisk: 'LOW',
    responses: {
      correctInsufficient: insufficient(
        'C4',
        '두 상황에서 더 많이 자라는 쪽을 비교해 ④를 골랐다.',
        '(가)의 그늘진 쪽과 (나)의 눕힌 줄기 아래쪽에서 옥신 분포와 생장을 어떻게 연결했는지 확인한다.',
      ),
      wrongMediumLow: clearError(
        'C2',
        '빛을 받은 쪽의 옥신 농도가 높아지고 줄기도 그쪽으로 굽기 때문에 ②가 가장 적절하다.',
        '빛 자극 뒤 옥신은 그늘진 쪽에 더 많이 분포하고 그쪽 생장으로 줄기는 빛 쪽으로 굽는다는 방향 관계를 교정한다.',
      ),
      wrongLow: insufficient(
        'C1',
        '포토트로핀 설명이 들어 있어서 ①을 골랐다.',
        '포토트로핀이 빛을 받은 쪽과 그늘진 쪽 중 어디에서 활성화된다고 보았는지 묻는다.',
      ),
    },
  },
  {
    prospectiveCaseId: 'prospective-69c02034fa5063deffe1b915-q22',
    domain: 'HUMANITIES',
    priorCandidateRisk: 'MEDIUM',
    responses: {
      correctInsufficient: insufficient(
        'C3',
        '신고전주의의 표현 방식과 맞지 않아 보여 ③을 골랐다.',
        '신고전주의가 영웅의 감정과 색채를 어떤 방식으로 표현한다고 보았는지 확인한다.',
      ),
      wrongMediumLow: clearError(
        'C4',
        '신고전주의도 역동적인 구도를 이상적인 형식으로 추구했으므로 ④가 일치하지 않는다.',
        '역동적 구도는 신고전주의가 아니라 낭만주의의 특징이며 신고전주의의 이상적 형식미와 대립한다는 점을 교정한다.',
      ),
      wrongLow: insufficient(
        'C1',
        '로코코에 대한 반발이 언급되어 ①을 골랐다.',
        '로코코에 대한 반발과 신고전주의의 교훈적 메시지를 어떤 관계로 이해했는지 묻는다.',
      ),
    },
  },
  {
    prospectiveCaseId: 'prospective-69c0186c78128b2a9bede0c8-q25',
    domain: 'SCIENCE',
    priorCandidateRisk: 'MEDIUM',
    responses: {
      correctInsufficient: insufficient(
        'C4',
        '공간분해능과 전체 계산량의 관계를 적용하면 ④라고 생각했다.',
        'C의 수평 공간분해능 변화 배수와 연직·시간분해능을 포함한 계산량 배수를 어떻게 구했는지 확인한다.',
      ),
      wrongMediumLow: clearError(
        'C2',
        '대기의 최대 속도가 두 배가 되면 D의 시간 간격도 3초에서 6초로 늘려야 하므로 ②가 적절하지 않다.',
        '최대 속도가 커지면 안정 조건의 시간 간격 상한은 늘어나는 것이 아니라 줄어든다는 방향을 교정한다.',
      ),
      wrongLow: insufficient(
        'C5',
        '측면 경계 조건을 함께 말하고 있어서 ⑤를 골랐다.',
        '지역 모델 B·D가 전지구 모델 A·C의 자료를 측면 경계 조건으로 쓰는 이유를 어떻게 판단했는지 묻는다.',
      ),
    },
  },
  {
    prospectiveCaseId: 'prospective-69c0994b78128b2a9bee0922-q30',
    domain: 'SCIENCE',
    priorCandidateRisk: 'MEDIUM',
    responses: {
      correctInsufficient: insufficient(
        'C4',
        '재료를 바꾼 뒤 허용하중을 생각하면 ④라고 보았다.',
        '재료 A의 허용응력과 단면적을 이용해 ㄴ의 허용하중을 얼마로 계산했는지 확인한다.',
      ),
      wrongMediumLow: clearError(
        'C3',
        '예상 응력이 항복응력보다 작아도 원자 결합 상태에는 영구적인 변형이 생길 수 있으므로 ③이 적절하지 않다.',
        '연성 재료는 응력이 항복응력보다 작으면 영구 변형이 일어나지 않는다는 기준을 교정한다.',
      ),
      wrongLow: insufficient(
        'C1',
        '허용하중의 크기를 비교하는 내용이라 ①을 골랐다.',
        'ㄱ과 ㄴ의 허용응력을 각각 어떤 강도와 안전계수로 계산했는지 확인한다.',
      ),
    },
  },
];

interface JsonObject {
  readonly [key: string]: unknown;
}

async function readJson(path: string): Promise<JsonObject> {
  return JSON.parse(await readFile(path, 'utf8')) as JsonObject;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function decodeReactRouterPayload(html: string): JsonObject {
  const match = html.match(/streamController\.enqueue\(("(?:[^"\\]|\\.)*")\)/s);
  if (match?.[1] === undefined) throw new Error('React Router 직렬화 payload를 찾지 못함');
  const serialized = JSON.parse(match[1]) as string;
  const flat = JSON.parse(serialized) as unknown[];
  const memo = new Map<number, unknown>();
  const resolveReference = (value: unknown): unknown => {
    if (typeof value !== 'number') return value;
    if (value < 0) return null;
    return resolveIndex(value);
  };
  const resolveIndex = (index: number): unknown => {
    if (memo.has(index)) return memo.get(index);
    const raw = flat[index];
    if (Array.isArray(raw)) {
      const output: unknown[] = [];
      memo.set(index, output);
      output.push(...raw.map(resolveReference));
      return output;
    }
    if (typeof raw === 'object' && raw !== null) {
      const output: Record<string, unknown> = {};
      memo.set(index, output);
      for (const [rawKey, rawValue] of Object.entries(raw)) {
        const keyIndex = Number(rawKey.replace(/^_/, ''));
        const key = resolveIndex(keyIndex);
        if (typeof key !== 'string') throw new Error(`직렬화 객체 키가 문자열이 아님: ${rawKey}`);
        output[key] = resolveReference(rawValue);
      }
      return output;
    }
    memo.set(index, raw);
    return raw;
  };
  return asObject(resolveIndex(0), 'React Router root');
}

async function loadPublicProduct(sourceId: string): Promise<{
  readonly product: JsonObject;
  readonly htmlHash: string;
}> {
  const cachePath = resolve(PAGE_CACHE_ROOT, `${sourceId}.html`);
  let html: string;
  try {
    html = await readFile(cachePath, 'utf8');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    await mkdir(PAGE_CACHE_ROOT, { recursive: true });
    const response = await fetch(`https://gugeodat.com/products/${sourceId}`);
    if (!response.ok) throw new Error(`${sourceId}: 공개 원문 페이지 HTTP ${response.status}`);
    html = await response.text();
    await writeFile(cachePath, html);
  }
  const root = decodeReactRouterPayload(html);
  const loaderData = asObject(root['loaderData'], `${sourceId}.loaderData`);
  const route = asObject(
    loaderData['routes/_default/products.$id'],
    `${sourceId}.product route`,
  );
  const product = asObject(route['product'], `${sourceId}.product`);
  if (product['id'] !== sourceId) throw new Error(`${sourceId}: 공개 원문 product id 불일치`);
  return { product, htmlHash: sha256(html) };
}

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function asObject(value: unknown, label: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label}: 객체가 아님`);
  }
  return value as JsonObject;
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label}: 배열이 아님`);
  return value;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label}: 문자열이 아님`);
  return value;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label}: 숫자가 아님`);
  return value;
}

function sourceMediaIndex(source: JsonObject, src: unknown): number {
  const media = asArray(source['media'] ?? [], 'source.media');
  const index = media.findIndex((item) => asObject(item, 'media item')['sourceUrl'] === src);
  if (index < 0) throw new Error(`원문 이미지 URL을 source.media에서 찾지 못함: ${String(src)}`);
  return index;
}

function normalizeElements(source: JsonObject, value: unknown): JsonObject[] {
  return asArray(value, 'elements').map((raw, index) => {
    const element = asObject(raw, `element ${index}`);
    const normalized: Record<string, unknown> = {
      kind: asString(element['kind'], `element ${index}.kind`),
      start: asNumber(element['start'], `element ${index}.start`),
      end: asNumber(element['end'], `element ${index}.end`),
    };
    for (const key of [
      'symbol',
      'style',
      'displayMode',
      'superscript',
      'caption',
      'widthPercent',
      'align',
      'float',
    ]) {
      if (element[key] !== undefined) normalized[key] = element[key];
    }
    if (normalized['kind'] === 'image') {
      normalized['mediaIndex'] = sourceMediaIndex(source, element['src']);
    }
    return normalized;
  }).filter((element) =>
    element['kind'] === 'image' || element['start'] !== element['end']
  );
}

function mediaExtension(mimeType: string, sourceUrl: string): string {
  const fromUrl = extname(new URL(sourceUrl).pathname).toLowerCase();
  if (fromUrl === '.png' || fromUrl === '.jpg' || fromUrl === '.jpeg' || fromUrl === '.webp') {
    return fromUrl;
  }
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/webp') return '.webp';
  throw new Error(`지원하지 않는 이미지 형식: ${mimeType}`);
}

async function ensureMedia(
  caseId: string,
  mediaId: string,
  sourceUrl: string,
  mimeType: string,
  expectedHash: string,
): Promise<{ readonly path: string; readonly sha256: string }> {
  const extension = mediaExtension(mimeType, sourceUrl);
  const relativePath = `docs/experiments/problem-evaluator-three-reference-low-skill-10-item-2026-09-06/artifacts/source-media/${caseId}-${mediaId}${extension}`;
  const absolutePath = resolve(relativePath);
  let bytes: Uint8Array;
  try {
    bytes = await readFile(absolutePath);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`${sourceUrl}: HTTP ${response.status}`);
    bytes = new Uint8Array(await response.arrayBuffer());
    await writeFile(absolutePath, bytes);
  }
  const actualHash = sha256(bytes);
  if (actualHash !== expectedHash) {
    throw new Error(`${caseId}|${mediaId}: ${actualHash} != ${expectedHash}`);
  }
  return { path: relativePath, sha256: actualHash };
}

function naturalCaseId(prospectiveCaseId: string): string {
  return prospectiveCaseId.replace(/^prospective-/, '');
}

async function main(): Promise<void> {
  await mkdir(SOURCE_CASE_ROOT, { recursive: true });
  await mkdir(MEDIA_ROOT, { recursive: true });
  const fixtureCases: unknown[] = [];
  const selectionAudit: unknown[] = [];

  for (const seed of CASES) {
    const caseId = naturalCaseId(seed.prospectiveCaseId);
    const prospectiveDirectory = resolve(PROSPECTIVE_ROOT, seed.prospectiveCaseId);
    const prospectiveInput = await readJson(resolve(prospectiveDirectory, 'source-input.json'));
    const candidateGold = await readJson(resolve(prospectiveDirectory, 'candidate-gold.json'));
    const humanReview = await readJson(resolve(prospectiveDirectory, 'human-review.json'));
    const source = asObject(prospectiveInput['source'], `${caseId}.source`);
    const sourceId = asString(source['sourceId'], `${caseId}.sourceId`);
    const questionNumber = asNumber(source['questionNumber'], `${caseId}.questionNumber`);
    const result = await readJson(resolve(TRAINER_DATA_ROOT, `${sourceId}_result.json`));
    const enrichment = await readJson(resolve(TRAINER_DATA_ROOT, 'enrichment', 'records', `${sourceId}.json`));
    const publicPage = await loadPublicProduct(sourceId);
    const referenceExam = asObject(publicPage.product['referenceExam'], `${caseId}.referenceExam`);
    const publicPassage = asObject(referenceExam['passage'], `${caseId}.publicPassage`);
    if (asString(candidateGold['questionId'], `${caseId}.questionId`) !== caseId) {
      throw new Error(`${caseId}: candidate gold questionId 불일치`);
    }
    if (asString(result['passage'], `${caseId}.result.passage`) !== source['passage']) {
      throw new Error(`${caseId}: prospective/result 지문 불일치`);
    }
    if (publicPassage['text'] !== source['passage']) {
      throw new Error(`${caseId}: prospective/공개 원문 지문 불일치`);
    }
    const resultQuestion = asArray(result['questions'], `${caseId}.result.questions`)
      .map((item) => asObject(item, `${caseId}.result.question`))
      .find((item) => item['question_number'] === questionNumber);
    if (resultQuestion === undefined ||
      JSON.stringify(resultQuestion) !== JSON.stringify(source['question'])) {
      throw new Error(`${caseId}: prospective/result 문제 불일치`);
    }
    const publicQuestion = asArray(referenceExam['questions'], `${caseId}.publicQuestions`)
      .map((item) => asObject(item, `${caseId}.publicQuestion`))
      .find((item) => item['questionNumber'] === questionNumber);
    if (publicQuestion === undefined) throw new Error(`${caseId}: 공개 원문 문제 없음`);
    const explanationQuestion = asArray(enrichment['questions'], `${caseId}.enrichment.questions`)
      .map((item) => asObject(item, `${caseId}.enrichment.question`))
      .find((item) => item['question_number'] === questionNumber);
    if (explanationQuestion === undefined) throw new Error(`${caseId}: 공식 해설 없음`);
    const explanation = asObject(
      explanationQuestion['official_explanation'],
      `${caseId}.official_explanation`,
    );
    const answerKey = asObject(source['answerKey'], `${caseId}.answerKey`);
    if (explanationQuestion['correct_choice'] !== answerKey['correctChoice']) {
      throw new Error(`${caseId}: 원자료/해설 정답 불일치`);
    }
    if (candidateGold['answerChoiceId'] !== `C${answerKey['correctChoice']}`) {
      throw new Error(`${caseId}: 골드/원자료 정답 불일치`);
    }
    const choiceExplanations = asArray(
      explanation['choice_explanations'],
      `${caseId}.choice_explanations`,
    ).map((item) => {
      const row = asObject(item, `${caseId}.choice_explanation`);
      return `${row['choice_number']}번: ${row['explanation_ko']}`;
    });
    const officialExplanationText = [
      `정답 해설: ${asString(explanation['detailed_explanation_ko'], `${caseId}.detailed`)}`,
      `선지별 분석: ${choiceExplanations.join(' ')}`,
    ].join('\n');
    const enrichmentSource = asObject(enrichment['source'], `${caseId}.enrichment.source`);
    const sourceCaseDirectory = resolve(SOURCE_CASE_ROOT, caseId);
    await mkdir(sourceCaseDirectory, { recursive: true });
    await writeJson(resolve(sourceCaseDirectory, 'experiment-input.json'), {
      caseId,
      sourceInput: prospectiveInput,
      officialExplanationReference: {
        publisher: enrichmentSource['publisher'],
        service: enrichmentSource['service'],
        officiality: enrichmentSource['officiality'],
        sourceUrl: enrichmentSource['url'],
        pdfPages: explanation['source_pdf_pages'],
        sectionTitle: explanation['section_title'],
        text: officialExplanationText,
        contentType: explanation['content_type'],
      },
    });
    await writeJson(resolve(sourceCaseDirectory, 'c-gold.json'), candidateGold);

    const mediaFiles: unknown[] = [];
    for (const rawMedia of asArray(source['media'] ?? [], `${caseId}.source.media`)) {
      const media = asObject(rawMedia, `${caseId}.media`);
      const mediaId = asString(media['mediaId'], `${caseId}.mediaId`);
      const sourceUrl = asString(media['sourceUrl'], `${caseId}.sourceUrl`);
      const mimeType = asString(media['mimeType'], `${caseId}.mimeType`);
      const expectedHash = asString(media['contentHash'], `${caseId}.contentHash`)
        .replace(/^sha256:/, '');
      const local = await ensureMedia(caseId, mediaId, sourceUrl, mimeType, expectedHash);
      const placement = asObject(media['placement'], `${caseId}.placement`);
      mediaFiles.push({
        path: local.path,
        mimeType,
        sha256: local.sha256,
        placement: placement['supplementIndex'] === undefined
          ? String(placement['scope'])
          : `${String(placement['scope'])}[${String(placement['supplementIndex'])}]`,
      });
    }

    const sourceSupplements = asArray(resultQuestion['supplements'] ?? [], `${caseId}.supplements`);
    const publicSupplements = asArray(publicQuestion['supplements'] ?? [], `${caseId}.publicSupplements`);
    if (sourceSupplements.length !== publicSupplements.length) {
      throw new Error(`${caseId}: 공개 원문/보관 원문 보기 개수 불일치`);
    }
    const supplements = publicSupplements
      .map((raw, supplementIndex) => {
        const supplement = asObject(raw, `${caseId}.supplement`);
        const sourceSupplement = asObject(
          sourceSupplements[supplementIndex],
          `${caseId}.sourceSupplement`,
        );
        if (supplement['text'] !== sourceSupplement['text']) {
          throw new Error(`${caseId}: 공개 원문/보관 원문 보기 텍스트 불일치`);
        }
        return {
          supplementIndex,
          elements: normalizeElements(source, supplement['elements'] ?? []),
        };
      });
    fixtureCases.push({
      caseId,
      sourcePageUrl: `https://gugeodat.com/products/${sourceId}`,
      officialQuestionPdfUrl: null,
      passageElements: normalizeElements(source, publicPassage['elements'] ?? []),
      supplementElements: supplements,
      mediaFiles,
      responses: seed.responses,
    });
    const risk = asObject(humanReview['risk'], `${caseId}.risk`);
    if (risk['level'] !== seed.priorCandidateRisk) {
      throw new Error(`${caseId}: 고정한 후보 위험도와 원자료 불일치`);
    }
    selectionAudit.push({
      caseId,
      sourceId,
      questionNumber,
      title: source['title'],
      exam: source['exam'],
      domain: seed.domain,
      priorCandidateRisk: seed.priorCandidateRisk,
      priorCandidateRiskReasons: risk['reasons'],
      officialAnswer: `C${String(answerKey['correctChoice'])}`,
      detailedGoldAnswer: candidateGold['answerChoiceId'],
      decisivePathComparedToOfficialExplanation: true,
      candidateHumanReviewStatus: humanReview['status'],
      experimentalUseOnly: true,
      sourceHashes: {
        prospectiveInput: sha256(JSON.stringify(prospectiveInput)),
        candidateGold: sha256(JSON.stringify(candidateGold)),
        result: sha256(JSON.stringify(result)),
        enrichment: sha256(JSON.stringify(enrichment)),
        publicPageHtml: publicPage.htmlHash,
      },
    });
  }

  await writeJson(FIXTURE_PATH, {
    fixtureVersion: 'three-reference-low-skill-ten-case-fixtures-v1',
    sourceMarkingProvenance:
      'Local frozen product extraction *_result.json passage_elements and target supplement elements; prospective source text/question equality checked before serialization. Local media hashes match frozen source hashes.',
    studentResponseProvenance:
      'Human-authored and frozen before evaluator calls on 2026-09-06: correct choice with non-independent/insufficient rationale, medium-low wrong response with one explicit misconception, and low wrong response with ambiguous rationale.',
    cases: fixtureCases,
  });
  await writeJson(resolve(ARTIFACT_ROOT, 'selection-audit.json'), {
    preparedAt: new Date().toISOString(),
    workspaceRoot: WORKSPACE_ROOT,
    sourceDataRoot: TRAINER_DATA_ROOT,
    selectionPolicy: {
      excludedPriorFiveCases: [
        'hydrogen-production-q12',
        'law-guarantee-q8',
        'fta-origin-q8',
        'diffusion-model-q13',
        'thermal-actuator-q12',
      ],
      domainCounts: { HUMANITIES: 3, SOCIAL: 3, SCIENCE: 4 },
      priorCandidateRiskCounts: { LOW: 7, MEDIUM: 3 },
      responseLevels: ['correctInsufficient', 'wrongMediumLow', 'wrongLow'],
    },
    cases: selectionAudit,
  });
  process.stdout.write(`prepared cases=${fixtureCases.length} fixture=${FIXTURE_PATH}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
