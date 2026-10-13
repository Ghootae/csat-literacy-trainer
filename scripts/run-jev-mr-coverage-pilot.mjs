import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const experimentDir = path.join(
  root,
  "docs/experiments/jev-mr-coverage-information-asymmetry-v1-2026-09-23",
);
const casesPath = path.join(experimentDir, "cases.json");
const repeatCount = Number(process.env.JEV_REPEAT_COUNT ?? "3");
const condition = process.env.JEV_CONDITION ?? "axis-and-target";
const sensorMode = process.env.JEV_SENSOR_MODE ?? "boolean";
const outputFile = process.env.JEV_OUTPUT_FILE ?? "raw-results.json";
const selectedCaseIds = new Set(
  (process.env.JEV_CASE_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const outputPath = path.join(experimentDir, outputFile);
const endpoint = "https://jevplayground.com/api/evaluate";

const fixture = JSON.parse(await fs.readFile(casesPath, "utf8"));

function coverageQuestion(relationId) {
  const relation = fixture.relations[relationId];
  return {
    instructions: [
      "오직 STUDENT_UTTERANCE 자체만 근거로 판단하라.",
      `학생 응답이 TARGET_MR(${relationId}: ${relation.description})의 의미 관계를 올바른 방향과 범위로 표현했는가?`,
      "AXIS나 TARGET_MR에 적힌 내용을 학생이 말했다고 추론하거나 누락된 내용을 보충하지 마라.",
      "관련 단어만 언급했거나 관계의 원인·결과 중 한쪽만 표현했다면 완전한 표현으로 간주하지 마라.",
    ].join(" "),
    type: "boolean",
  };
}

function coverageScoreQuestion(relationId) {
  const relation = fixture.relations[relationId];
  return {
    instructions: [
      "오직 STUDENT_UTTERANCE 자체만 근거로 판단하라.",
      `학생 응답이 TARGET_MR(${relationId}: ${relation.description})의 의미 관계를 어느 정도 표현했는가?`,
      "AXIS나 TARGET_MR에 적힌 내용을 학생이 말했다고 추론하거나 누락된 내용을 보충하지 마라.",
    ].join(" "),
    type: "score",
    criteria: [
      "표현되지 않았거나 무관함",
      "관련 소재나 대상만 언급함",
      "관계의 원인·결과 또는 구성 요소 중 일부만 표현함",
      "핵심 관계를 대체로 올바르게 표현했지만 범위나 방향에 약간의 모호함이 있음",
      "핵심 관계를 올바른 방향과 범위로 충분히 표현함",
    ],
  };
}

function collisionQuestion(relationId) {
  const relation = fixture.relations[relationId];
  return {
    instructions: [
      "오직 STUDENT_UTTERANCE 자체만 근거로 판단하라.",
      `학생 응답에 TARGET_MR(${relationId}: ${relation.description})과 명시적으로 모순되거나 관계 방향을 뒤집는 주장이 있는가?`,
      "단순한 생략, 짧은 답변, 관련 내용의 부재는 충돌로 간주하지 마라.",
    ].join(" "),
    type: "boolean",
  };
}

function buildPayload(testCase) {
  const stateLines = ["다음은 학생 응답의 의미 관계를 측정하는 과업이다."];
  if (condition === "axis-and-target") {
    stateLines.push(`AXIS: ${fixture.axis.description}`);
  }
  stateLines.push(
    `STUDENT_UTTERANCE: ${testCase.studentUtterance}`,
    "REFERENCE_TEXT는 제공되지 않았다. 학생이 실제로 표현한 내용만 평가하라.",
  );
  const questions =
    sensorMode === "score"
      ? {
          MR2_coverage_score: coverageScoreQuestion("MR2"),
          MR3_coverage_score: coverageScoreQuestion("MR3"),
        }
      : {
          MR2_coverage: coverageQuestion("MR2"),
          MR3_coverage: coverageQuestion("MR3"),
          MR1_collision: collisionQuestion("MR1"),
          MR2_collision: collisionQuestion("MR2"),
          MR3_collision: collisionQuestion("MR3"),
        };
  return {
    state: stateLines.join("\n"),
    questions,
  };
}

const records = [];

for (let repeat = 1; repeat <= repeatCount; repeat += 1) {
  for (const testCase of fixture.cases) {
    if (selectedCaseIds.size > 0 && !selectedCaseIds.has(testCase.id)) continue;
    const payload = buildPayload(testCase);
    const startedAt = Date.now();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });
    const body = await response.json().catch(() => null);
    const record = {
      repeat,
      caseId: testCase.id,
      label: testCase.label,
      expected: testCase.expected,
      httpStatus: response.status,
      wallTimeMs: Date.now() - startedAt,
      payload,
      response: body,
    };
    records.push(record);
    const probabilities = Object.fromEntries(
      Object.entries(body?.result?.answers ?? {}).map(([key, value]) => [
        key,
        value.probability ?? value.score,
      ]),
    );
    process.stdout.write(
      `${JSON.stringify({ repeat, caseId: testCase.id, status: response.status, probabilities })}\n`,
    );
  }
}

await fs.writeFile(
  outputPath,
  `${JSON.stringify(
    {
      experimentId: fixture.experimentId,
      endpointKind: "JEV Playground public evaluation route",
      endpoint,
      condition,
      sensorMode,
      repeatCount,
      createdAt: new Date().toISOString(),
      records,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

process.stdout.write(`Saved ${records.length} records to ${outputPath}\n`);
