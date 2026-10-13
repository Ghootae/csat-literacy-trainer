import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const outPath = resolve(root, 'docs/PROBLEM-SOLVING-V2-11-QUESTION-WEBAPP-REVIEW-PACKET-2026-09-11.md');
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const readText = (path) => readFileSync(resolve(root, path), 'utf8').trim();
const fence = (value, lang = '') => `\n\`\`\`\`${lang}\n${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}\n\`\`\`\`\n`;

const fullRows = readJson('docs/experiments/problem-source-direct-v2-full-cycle-seven-2026-09-11/results.json');
const fullSummary = readJson('docs/experiments/problem-source-direct-v2-full-cycle-seven-2026-09-11/summary.json');
const multiBase = readJson('docs/experiments/problem-source-direct-multi-image-canary-2026-09-09/results.json');
const multiRepair = readJson('docs/experiments/problem-source-direct-multi-image-canary-2026-09-09/repair-1/results.json');
const oldFixtures = readJson('packages/pipeline/experiments/problem-solving/three-reference-low-skill-ten-case-fixtures-v1.json');
const prompt = readText('packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-prompt-v2.md');
const evaluator = readText('packages/pipeline/src/problem-solving/source-direct-evaluator.ts');
const runtime = readText('packages/pipeline/src/problem-solving/source-direct-evaluator-runtime.ts');

const oldIds = [
  '6a2294f386fd308968e10e95-q19',
  '6a22950f86fd308968e11320-q19',
  '69c0186c78128b2a9bede0c8-q25',
  '69c0994b78128b2a9bee0922-q30',
];
const newIds = [...new Set(fullRows.map((row) => row.questionId))];

function inferStemPolarity(stem) {
  return /적절하지\s*않|옳지\s*않|잘못된|일치하지\s*않/u.test(stem)
    ? 'SELECT_INCORRECT' : 'SELECT_CORRECT';
}

function oldSource(questionId) {
  const experiment = readJson(`docs/experiments/problem-evaluator-three-reference-low-skill-10-item-2026-09-06/artifacts/source-cases/${questionId}/experiment-input.json`);
  const fixture = oldFixtures.cases.find((item) => item.caseId === questionId);
  const raw = experiment.sourceInput.source;
  return {
    fixture,
    source: {
      schemaVersion: 'source-direct-problem-bundle-v2',
      questionId,
      questionNumber: raw.question.question_number,
      passageId: questionId.replace(/-q[0-9]+$/u, ''),
      title: raw.title,
      exam: raw.exam,
      passage: raw.passage,
      stem: raw.question.stem,
      stemPolarity: inferStemPolarity(raw.question.stem),
      scenario: raw.question.supplements.map((item) => `${item.label}\n${item.text}`.trim()).join('\n\n'),
      media: raw.media.map((item, index) => ({
        mediaId: item.mediaId,
        sourceUrl: item.sourceUrl,
        mimeType: item.mimeType,
        width: item.width,
        height: item.height,
        contentHash: item.contentHash,
        placement: item.placement,
        localPath: fixture.mediaFiles[index]?.path ?? null,
      })),
      choices: raw.question.choices.map((choice) => ({
        choiceId: `C${choice.choice_number}`,
        position: choice.choice_number,
        text: choice.text,
      })),
      answerChoiceId: `C${raw.answerKey.correctChoice}`,
      officialExplanation: experiment.officialExplanationReference.text,
    },
  };
}

function sourceSection(source, provenance = null) {
  const media = source.media ?? [];
  const meta = {
    schemaVersion: source.schemaVersion,
    questionId: source.questionId,
    questionNumber: source.questionNumber,
    passageId: source.passageId,
    title: source.title,
    exam: source.exam,
    stemPolarity: source.stemPolarity,
    answerChoiceId: source.answerChoiceId,
  };
  let text = `\n### 원자료\n${fence(meta, 'json')}`;
  text += `\n#### 지문\n${fence(source.passage, 'text')}`;
  text += `\n#### 발문\n${fence(source.stem, 'text')}`;
  if (source.scenario) text += `\n#### 보기·상황 자료의 텍스트 부분\n${fence(source.scenario, 'text')}`;
  text += `\n#### 선지\n${fence(source.choices, 'json')}`;
  text += `\n#### 정답과 입력된 해설\n${fence({answerChoiceId: source.answerChoiceId, officialExplanation: source.officialExplanation}, 'json')}`;
  if (provenance !== null) {
    text += `\n#### 원자료·해설·미디어 계보\n${fence(provenance, 'json')}`;
  }
  text += `\n#### 이미지 원자료 메타데이터\n`;
  if (media.length === 0) {
    text += '\n없음.\n';
  } else {
    text += fence(media.map(({url, ...item}) => ({...item, transmittedUrlKind: url?.startsWith('data:') ? 'data-url(base64; 결과 파일에서는 제거)' : undefined})), 'json');
  }
  return text;
}

function observationLabel(item) {
  if (item.kind === 'INITIAL_SUBMISSION') return `최초 선택 ${item.selectedChoiceId}: ${item.rationale ?? '(근거 없음)'}`;
  if (item.kind === 'FOLLOW_UP_RESPONSE') return `${item.responseType}: ${item.rawResponse}`;
  return `재선택 ${item.selectedChoiceId}: ${item.rawResponse}`;
}

function fullCycleSection(questionId) {
  const rows = fullRows.filter((row) => row.questionId === questionId);
  const source = rows[0].input.source;
  const byCase = new Map();
  for (const row of rows) {
    const list = byCase.get(row.caseId) ?? [];
    list.push(row);
    byCase.set(row.caseId, list);
  }
  let text = `\n## ${source.title} — ${questionId}\n`;
  text += '\n- 검증 범위: v2 전체 사이클(정답 3유형, 오답 3유형)\n';
  text += `- 실제 호출: ${rows.length}회 / 기대 일치: ${rows.filter((row) => row.passed).length}/${rows.length}\n`;
  text += sourceSection(source, rows[0].provenance);
  text += '\n### 실제 학생 응답 사이클과 모델 출력\n';
  for (const [caseId, caseRows] of byCase) {
    const first = caseRows[0];
    text += `\n#### ${first.responseType} (${caseId})\n`;
    caseRows.forEach((row, index) => {
      const inputView = {
        evaluationMode: row.input.evaluationMode,
        sessionState: row.input.sessionState,
        observations: row.input.observations,
        paragraphHandoff: row.input.paragraphHandoff,
        previousDiagnosticState: row.input.previousDiagnosticState,
      };
      const latest = row.input.observations.at(-1);
      text += `\n##### 호출 ${index + 1}: ${row.stage}\n\n`;
      text += `- 최신 학생 발화: ${latest ? observationLabel(latest) : '(없음)'}\n`;
      text += `- 기대: ${row.expected.join(' 또는 ')}\n`;
      text += `- 관측: ${row.observed}\n`;
      text += `- 엄격 기대 일치: ${row.passed ? '예' : '**아니오**'}\n`;
      text += `- 비용: USD ${row.costUsd}; 지연: ${row.durationMs}ms\n`;
      text += '\n입력 중 세션·누적 학생 발화(원자료는 위에서 공통 제시):\n';
      text += fence(inputView, 'json');
      text += '\n검증 후 구조화 출력:\n';
      text += fence(row.output, 'json');
      text += `\n원출력과 검증 후 출력: ${JSON.stringify(row.rawOutput) === JSON.stringify(row.output) ? '동일' : '**다름**'}\n`;
      text += '\n호출 메타데이터:\n';
      text += fence(row.call, 'json');
    });
  }
  return text;
}

function multiSection(questionId) {
  const { source, fixture } = oldSource(questionId);
  const base = multiBase.find((row) => row.caseId === questionId);
  const repair = multiRepair.find((row) => row.caseId === questionId);
  const finalRow = repair ?? base;
  const response = fixture.responses.wrongMediumLow;
  let text = `\n## ${source.title} — ${questionId}\n`;
  text += '\n- 검증 범위: v2 다중 이미지 canary의 최초 교정 턴 1회만 검증(전체 후속 사이클 아님)\n';
  text += `- 학생 최초 선택·근거: ${response.choiceId} — ${response.rationale}\n`;
  text += `- 최종 판정: ${finalRow.observed}; 기대 일치: ${finalRow.actionPassed ? '예' : '아니오'}\n`;
  if (repair) text += '- 실행 계보: 최초 호출은 인용부호 차이로 계약 실패했고, 결정론적 인용 복원 보정 뒤 같은 문항을 1회 재실행함\n';
  text += sourceSection(source);
  text += '\n### 실제 입력의 학생 관찰\n';
  text += fence({
    evaluationMode: 'DIAGNOSE_PATH',
    observations: [{
      observationId: 'O1',
      kind: 'INITIAL_SUBMISSION',
      selectedChoiceId: response.choiceId,
      rationale: response.rationale,
      temporalRole: 'INITIAL',
    }],
    note: '결과 행이 input 전체를 저장하지 않아, 당시 고정 원자료·fixture·runner의 결정론적 조립 규칙으로 복원한 표시용 입력이다.',
  }, 'json');
  if (repair) {
    text += '\n### 최초 계약 실패 호출(숨기지 않음)\n';
    text += `\n- 관측: ${base.observed}\n- 오류: ${base.error}\n- 비용: USD ${base.costUsd}; 지연: ${base.durationMs}ms\n`;
    text += '\n검증 전 모델 원출력:\n';
    text += fence(base.rawOutput, 'json');
    text += '\n호출 메타데이터:\n';
    text += fence(base.call, 'json');
  }
  text += '\n### 최종 채택 호출\n';
  text += `\n- 기대: ${finalRow.expected}\n- 관측: ${finalRow.observed}\n- 비용: USD ${finalRow.costUsd}; 지연: ${finalRow.durationMs}ms\n`;
  text += '\n검증 후 구조화 출력:\n';
  text += fence(finalRow.output, 'json');
  text += `\n원출력과 검증 후 출력: ${JSON.stringify(finalRow.rawOutput) === JSON.stringify(finalRow.output) ? '동일' : '**다름(결정론적 인용 복원 적용)**'}\n`;
  text += '\n호출 메타데이터:\n';
  text += fence(finalRow.call, 'json');
  return text;
}

function between(text, start, end) {
  const from = text.indexOf(start);
  if (from < 0) throw new Error(`start marker not found: ${start}`);
  const to = text.indexOf(end, from);
  if (to < 0) throw new Error(`end marker not found: ${end}`);
  return text.slice(from, to).trim();
}

const multiCost = [...multiBase, ...multiRepair].reduce((sum, row) => sum + (row.costUsd ?? 0), 0);
const successfulEvidenceRows = fullRows.length + oldIds.length;
const paidCalls = fullRows.length + multiBase.length + multiRepair.length;
const totalCost = fullSummary.observedCostUsd + multiCost;

let doc = `# 문제 풀이 v2 11문항 원자료·실제 사이클 웹앱 검토 패킷

- 기준일: 2026-09-11 KST
- 목적: 외부 웹앱이 원문 직접 문제 풀이 판정, 후속 질문, 상태 전이와 프롬프트 실패 지점을 독립 검토
- 현행 정책: \`PS-PROBLEM-SOURCE-DIRECT-V1\`
- 모델: \`gpt-5.6-terra\`, reasoning effort \`medium\`
- 프롬프트: \`source-direct-problem-dialogue-prompt-v2\`
- 프롬프트 SHA-256: \`${fullSummary.promptHash}\`
- 구조화 문제 골드: 미사용

이 문서는 예시를 새로 작성한 자료가 아니다. 저장된 유료 실행의 원자료, 학생 발화, 모델 원출력,
검증 후 출력과 호출 메타데이터를 평가용으로 한데 모았다. 다만 기존 다중 이미지 4문항은 결과
행에 입력 전체가 저장되지 않았으므로 당시 고정 원자료·학생 fixture·runner의 결정론적 조립
규칙으로 입력 표시를 복원했다. 모델 출력은 저장된 실제 출력 그대로다.

## 1. 범위와 비교 시 주의점

| 묶음 | 고유 문항 | 학생 응답 경로 | 실제 과금 호출 | 최종 검토 가능한 행동 출력 |
|---|---:|---:|---:|---:|
| 기존 다중 이미지 canary | 4 | 문항당 명시적 오답 1개 | 5 | 4 |
| 신규 전체 사이클 | 7 | 문항당 6개 | 82 | 82 |
| 합계 | **11** | **46** | **${paidCalls}** | **${successfulEvidenceRows}** |

기존 4문항은 최초 교정 질문까지만 실행했으므로, 신규 7문항처럼 학생의 답변 수정과 재선택까지
검증됐다고 해석하면 안 된다. 기존 4문항의 5번째 과금 호출은 옥신 문항의 최초 계약 실패 후
표적 재실행이다. 총 관측 비용은 **USD ${totalCost.toFixed(7)}**(기존 USD ${multiCost.toFixed(7)} +
신규 USD ${fullSummary.observedCostUsd})다.

신규 7문항은 계획 84호출 중 82호출이 실행됐다. 결측치·이상치 문항의 정답·명시적 오류를
\`UNCERTAIN\`으로 잘못 낮춰 잡아 후속 교정 2호출에 상태상 도달하지 못했으며, 이를 임의로
우회하지 않았다.

## 2. 전체 결과 요약

- 신규 7문항 엄격 기대 일치: 78/82
- 오답 관련 호출: 49/49 기대 일치
- 모호한 오답 최초 응답: 7/7 \`ASK_DIAGNOSTIC\`
- 명확한 정답 불충분 근거 과수용: 2건
- 최소 충분성의 경계로 볼 수 있는 정답 근거 과수용: 1건
- 정답 근거의 명시적 오류를 \`UNCERTAIN\`으로 처리: 1건
- 기존 다중 이미지 4문항 최종 행동: 4/4 \`ASK_CORRECTIVE\`
- 기존 옥신 최초 실행: 의미 판정은 맞았으나 원문 인용의 작은따옴표 누락으로 엄격 계약 실패

## 3. 웹앱이 우선 검토할 네 판정

1. 지진파: “(나)와 (다)의 보호 방식이 맞는 것 같아서 ⑤”를 \`SUPPORTED\`로 처리했다.
2. 블록체인: “노드 수가 줄어드는 경우라서 ③”을 \`SUPPORTED\`로 처리했다.
3. 결측치·이상치: “두 기법 모두 이상치가 들어갈 수 있어서 ⑤”를 \`SUPPORTED\`로 처리했다.
   이는 엄격 기대상 \`UNCERTAIN\`이지만 허용 가능한 압축 설명일 수도 있는 경계 사례다.
4. 결측치·이상치: “B 기법이 최종적으로 선택한 직선이 이상치를 지나기 때문에 ⑤”에서 모델의
   이유는 후보 직선과 최종 선택 직선의 충돌을 정확히 찾았지만 라벨은 \`CLEAR_ERROR\`가 아닌
   \`UNCERTAIN\`이었다.

아래에는 먼저 기존 4문항, 그다음 신규 7문항을 싣는다.

# A. 기존 완료 4문항 — v2 다중 이미지 최초 교정 턴
`;

for (const id of oldIds) doc += multiSection(id);

doc += '\n# B. 신규 7문항 — v2 전체 사이클\n';
for (const id of newIds) doc += fullCycleSection(id);

const requestExcerpt = between(
  runtime,
  'export function createSourceDirectProblemRequestContent',
  'class OpenAISourceDirectProblemTransport',
);
const apiExcerpt = between(
  runtime,
  'class OpenAISourceDirectProblemTransport',
  'function errorType',
);
const schemaExcerpt = between(
  evaluator,
  'export const SourceDirectDiagnosticOutputSchema',
  'export const SourceDirectProblemEvaluatorInputSchema',
);
const validationExcerpt = between(
  evaluator,
  'export function validateSourceDirectProblemEvaluatorOutput',
  'function sufficiency',
);

doc += `
# C. 프롬프트 문제 위치를 검토하기 위한 실행 경계

## 1. 프롬프트와 코드의 역할 구분

- 아래 프롬프트 전문은 Responses API의 \`instructions\`로 그대로 전달된다.
- 사용자 입력은 별도 안내문을 덧붙이지 않고 evaluator 입력 JSON을 문자열화해 첫 \`input_text\`로
  전달한다. 이미지 URL은 이 JSON에서 제거하고, 각 이미지 앞에
  \`[SOURCE_MEDIA id | placement]\` 표지를 붙여 별도 \`input_image(detail=high)\`로 전달한다.
- 출력 형태는 프롬프트 문장만으로 강제하는 것이 아니라, 모드별 Zod 스키마를 JSON Schema로
  변환해 \`strict: true\`로 요청한다.
- 모델 출력 뒤에는 정확 인용, 모든 관찰 ID 포함, 허용 행동, 판정–행동 상태 정합성 등을 코드가
  검증한다. 그러므로 모델 원출력과 검증 후 출력의 차이 또는 계약 실패는 프롬프트 품질과 별도로
  봐야 한다.
- 신규 82호출은 원출력과 검증 후 출력이 모두 같았다. 기존 옥신 재실행에서는 인용부호 차이를
  결정론적으로 복원해 검증 후 출력이 달라졌다.

## 2. 현재 관측과 직접 연결되는 프롬프트 검토 후보

아래는 확정 원인이 아니라 웹앱이 검토할 가설이다.

1. 정답 평가의 “결정적인 근거와 연결이 압축되어 있어도 안정적으로 성립하면 SUPPORTED”가
   학생이 말하지 않은 관계 방향을 원문에서 보충하는 허가처럼 작동할 수 있다.
2. “짧음, 생략 …은 명시적 오류가 아니다”는 과잉 교정을 막지만, 정답 평가에서 ‘관련 대상만
   언급한 경우는 SUPPORTED가 아니다’라는 충분성 경계를 직접 규정하지 않는다.
3. 명시적 오류 정의는 있지만, \`reason\`이 충돌을 확정했으면 최종 \`assessment\`도
   \`CLEAR_ERROR\`여야 한다는 자기정합 규칙이 정답 근거 절에 없다.
4. 한 호출이 판정, 이유 작성, 근거 인용을 동시에 수행하므로, 먼저 맞는 정답과 해설을 본 뒤
   학생의 짧은 표현을 사후적으로 충분한 근거로 합리화할 가능성이 있다.

## 3. 실제 API 요청 조립 코드
${fence(requestExcerpt, 'ts')}
${fence(apiExcerpt, 'ts')}

## 4. 프롬프트와 별도로 적용되는 실제 출력 스키마
${fence(schemaExcerpt, 'ts')}

## 5. 프롬프트와 별도로 적용되는 사후 검증
${fence(validationExcerpt, 'ts')}

# D. 실제 평가 프롬프트 전문

아래가 이 문서의 모든 v2 호출에서 \`instructions\`로 사용된 실제 프롬프트다. 별도의 숨은
판정 프롬프트나 구조화 문제 골드는 사용하지 않았다.
${fence(prompt, 'text')}

# E. 정본 파일

- 신규 7문항 전체 결과: \`docs/experiments/problem-source-direct-v2-full-cycle-seven-2026-09-11/results.json\`
- 신규 7문항 요약: \`docs/experiments/problem-source-direct-v2-full-cycle-seven-2026-09-11/summary.json\`
- 기존 4문항 최초 결과: \`docs/experiments/problem-source-direct-multi-image-canary-2026-09-09/results.json\`
- 옥신 표적 재실행: \`docs/experiments/problem-source-direct-multi-image-canary-2026-09-09/repair-1/results.json\`
- 실제 프롬프트: \`packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-prompt-v2.md\`
- 요청 조립·API 호출: \`packages/pipeline/src/problem-solving/source-direct-evaluator-runtime.ts\`
- 입출력 계약·사후 검증: \`packages/pipeline/src/problem-solving/source-direct-evaluator.ts\`
`;

writeFileSync(outPath, doc);
process.stdout.write(`${outPath}\n${Buffer.byteLength(doc)} bytes\n${doc.split('\n').length} lines\n`);
