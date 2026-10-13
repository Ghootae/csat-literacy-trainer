import fs from "node:fs/promises";
import path from "node:path";

const experimentDir = path.join(
  process.cwd(),
  "docs/experiments/jev-collision-single-question-ab-v1-2026-09-23",
);
const endpoint = "https://jevplayground.com/api/evaluate";

const relations = {
  MR2: "정보 획득에 드는 비용의 차이는 취득 정보의 격차를 발생시켜 현실의 정보 비대칭으로 이어진다.",
  MR3: "상대적으로 정보를 적게 가진 경제 주체는 낮은 품질의 상품을 상대적으로 더 비싼 가격에 선택하는 역선택 문제에 직면한다.",
};

const tasks = [
  {
    id: "CROSS_MR2_TO_MR3",
    target: "MR3",
    expected: "low",
    studentUtterance: "정보 획득 비용의 차이는 정보 격차와 무관하고 현실의 정보 비대칭을 만들지 않는다.",
    bundledBaseline: 0.49,
  },
  {
    id: "CROSS_MR3_TO_MR2",
    target: "MR2",
    expected: "low",
    studentUtterance: "정보가 적은 거래자는 좋은 상품을 더 싼 가격에 고르게 되므로 역선택 문제는 생기지 않는다.",
    bundledBaseline: 0.63,
  },
  {
    id: "POSITIVE_MR2",
    target: "MR2",
    expected: "high",
    studentUtterance: "정보 획득 비용의 차이는 정보 격차와 무관하고 현실의 정보 비대칭을 만들지 않는다.",
    bundledBaseline: 0.97,
  },
  {
    id: "POSITIVE_MR3",
    target: "MR3",
    expected: "high",
    studentUtterance: "정보가 적은 거래자는 좋은 상품을 더 싼 가격에 고르게 되므로 역선택 문제는 생기지 않는다.",
    bundledBaseline: 0.93,
  },
  {
    id: "ABSENT_MR3",
    target: "MR3",
    expected: "low",
    studentUtterance: "현실에서는 정보 획득에 투입하는 비용이 다르기 때문에 각 경제 주체가 얻는 정보의 양과 질이 달라지고 정보 비대칭이 생긴다.",
    bundledBaseline: 0.05,
  },
  {
    id: "ABSENT_MR2",
    target: "MR2",
    expected: "low",
    studentUtterance: "거래 상대보다 정보를 적게 가진 경제 주체는 낮은 품질의 상품을 상대적으로 더 비싼 가격에 선택하는 역선택 문제를 겪는다.",
    bundledBaseline: 0.08,
  },
];

const records = [];

for (const task of tasks) {
  const targetDescription = relations[task.target];
  const payload = {
    state: `STUDENT_UTTERANCE: ${task.studentUtterance}`,
    questions: {
      decision: {
        instructions: [
          "오직 STUDENT_UTTERANCE 자체만 근거로 판단하라.",
          `학생 응답에 TARGET_MR(${task.target}: ${targetDescription})과 명시적으로 모순되거나 관계 방향을 뒤집는 주장이 있는가?`,
          "단순한 생략, 짧은 답변, 관련 내용의 부재는 충돌로 간주하지 마라.",
        ].join(" "),
        type: "boolean",
      },
    },
  };
  const startedAt = Date.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => null);
  const record = {
    ...task,
    httpStatus: response.status,
    wallTimeMs: Date.now() - startedAt,
    payload,
    response: body,
  };
  records.push(record);
  process.stdout.write(
    `${JSON.stringify({
      id: task.id,
      status: response.status,
      bundledBaseline: task.bundledBaseline,
      singleQuestion: body?.result?.answers?.decision?.probability,
    })}\n`,
  );
}

const outputPath = path.join(experimentDir, "raw-results-identical-prompt.json");
await fs.writeFile(
  outputPath,
  `${JSON.stringify(
    {
      experimentId: "jev-collision-single-question-ab-v1-2026-09-23",
      endpointKind: "JEV Playground public evaluation route",
      officialApiKeyUsed: false,
      tasks,
      records,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
process.stdout.write(`Saved ${records.length} records to ${outputPath}\n`);
