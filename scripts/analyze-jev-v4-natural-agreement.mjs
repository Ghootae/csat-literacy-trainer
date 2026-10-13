import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'docs/experiments/jev-v4-natural-agreement-v1-2026-09-29');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const raw = fs.existsSync(path.join(dir, 'raw-results.jsonl'))
  ? fs.readFileSync(path.join(dir, 'raw-results.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
  : [];
const latestSuccess = new Map();
for (const row of raw) if (row.httpStatus === 200 && row.response?.ok) latestSuccess.set(row.requestId, row);

const round = (value, places = 3) => value == null ? null : Number(value.toFixed(places));
const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const auc = (positive, negative, key) => {
  if (!positive.length || !negative.length) return null;
  let wins = 0;
  let comparisons = 0;
  for (const left of positive) {
    for (const right of negative) {
      wins += left[key] > right[key] ? 1 : left[key] === right[key] ? 0.5 : 0;
      comparisons += 1;
    }
  }
  return wins / comparisons;
};

const axes = [];
for (const item of manifest.included) {
  const values = {};
  for (const requestId of item.requestIds) {
    const answerMap = latestSuccess.get(requestId)?.response?.result?.answers ?? {};
    for (const [id, answer] of Object.entries(answerMap)) values[id] = answer.probability;
  }
  for (const axis of item.axes) {
    const required = axis.relations.filter((relation) => relation.diagnosticRole === 'required');
    const coverageValues = required.map((relation) => values[`${relation.relationId}_coverage`]).filter(Number.isFinite);
    const collisionValues = axis.relations.map((relation) => values[`${relation.relationId}_collision`]).filter(Number.isFinite);
    axes.push({
      caseId: item.caseId,
      paragraphId: item.paragraphId,
      responseStage: item.responseStage,
      axisId: axis.axisId,
      v4ContractValid: item.v4ContractValid,
      v4Status: axis.v4?.status ?? null,
      humanStatus: axis.humanApproved?.status ?? null,
      requiredMrCount: required.length,
      minRequiredCoverage: coverageValues.length === required.length ? Math.min(...coverageValues) : null,
      maxCollision: collisionValues.length === axis.relations.length ? Math.max(...collisionValues) : null,
      sensorValues: Object.fromEntries(axis.relations.flatMap((relation) => [
        [`${relation.relationId}_coverage`, values[`${relation.relationId}_coverage`] ?? null],
        [`${relation.relationId}_collision`, values[`${relation.relationId}_collision`] ?? null],
      ])),
    });
  }
}

const completeAxes = axes.filter((axis) => axis.minRequiredCoverage != null && axis.maxCollision != null);
const statusSummary = [...new Set(completeAxes.map((axis) => axis.v4Status).filter(Boolean))].sort().map((status) => {
  const rows = completeAxes.filter((axis) => axis.v4Status === status && axis.v4ContractValid);
  return {
    status,
    count: rows.length,
    medianMinCoverage: round(median(rows.map((row) => row.minRequiredCoverage))),
    medianMaxCollision: round(median(rows.map((row) => row.maxCollision))),
    minCoverageRange: rows.length ? [round(Math.min(...rows.map((row) => row.minRequiredCoverage))), round(Math.max(...rows.map((row) => row.minRequiredCoverage)))] : null,
    maxCollisionRange: rows.length ? [round(Math.min(...rows.map((row) => row.maxCollision))), round(Math.max(...rows.map((row) => row.maxCollision)))] : null,
  };
});

const thresholdRows = [];
for (const coverageThreshold of [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95]) {
  for (const collisionThreshold of [0.1, 0.2, 0.3, 0.4, 0.5]) {
    const comparable = completeAxes.filter((axis) => axis.v4ContractValid && axis.v4Status);
    const autoPass = comparable.filter((axis) => axis.minRequiredCoverage >= coverageThreshold && axis.maxCollision <= collisionThreshold);
    thresholdRows.push({
      coverageThreshold,
      collisionThreshold,
      comparableAxes: comparable.length,
      autoPassAxes: autoPass.length,
      autoPassRate: round(autoPass.length / comparable.length),
      v4PassAmongAutoPass: autoPass.filter((axis) => axis.v4Status === 'PASS').length,
      v4NonPassAmongAutoPass: autoPass.filter((axis) => axis.v4Status !== 'PASS').length,
      v4SeriousOrErrorAmongAutoPass: autoPass.filter((axis) => ['UNCLEAR_SERIOUS', 'ERROR'].includes(axis.v4Status)).length,
      humanCompared: autoPass.filter((axis) => axis.humanStatus).length,
      humanNonPassAmongAutoPass: autoPass.filter((axis) => axis.humanStatus && axis.humanStatus !== 'PASS').length,
      humanSeriousOrErrorAmongAutoPass: autoPass.filter((axis) => ['UNCLEAR_SERIOUS', 'ERROR'].includes(axis.humanStatus)).length,
    });
  }
}

const v4Comparable = completeAxes.filter((axis) => axis.v4ContractValid && axis.v4Status);
const v4Pass = v4Comparable.filter((axis) => axis.v4Status === 'PASS');
const v4NonPass = v4Comparable.filter((axis) => axis.v4Status !== 'PASS');
const humanComparable = completeAxes.filter((axis) => axis.humanStatus);
const humanPass = humanComparable.filter((axis) => axis.humanStatus === 'PASS');
const humanNonPass = humanComparable.filter((axis) => axis.humanStatus !== 'PASS');
const stageSummary = ['initial', 'followup'].map((stage) => {
  const rows = v4Comparable.filter((axis) => axis.responseStage === stage);
  const pass = rows.filter((axis) => axis.v4Status === 'PASS');
  const nonPass = rows.filter((axis) => axis.v4Status !== 'PASS');
  return {
    stage,
    count: rows.length,
    pass: pass.length,
    nonPass: nonPass.length,
    coverageAuc: round(auc(pass, nonPass, 'minRequiredCoverage')),
  };
});
const successfulRaw = [...latestSuccess.values()];
const execution = {
  medianWallTimeMs: round(median(successfulRaw.map((row) => row.wallTimeMs)), 1),
  medianModelLatencyMs: round(median(successfulRaw.map((row) => row.response.latencyMs)), 1),
  inputTokens: successfulRaw.reduce((sum, row) => sum + (row.response.result?.usage?.inputTokens ?? 0), 0),
  outputTokens: successfulRaw.reduce((sum, row) => sum + (row.response.result?.usage?.outputTokens ?? 0), 0),
  totalTokens: successfulRaw.reduce((sum, row) => sum + (row.response.result?.usage?.totalTokens ?? 0), 0),
};
const discrimination = {
  v4PassVsNonPassCoverageAuc: round(auc(v4Pass, v4NonPass, 'minRequiredCoverage')),
  v4NonPassVsPassCollisionAuc: round(auc(v4NonPass, v4Pass, 'maxCollision')),
  humanPassVsNonPassCoverageAuc: round(auc(humanPass, humanNonPass, 'minRequiredCoverage')),
  v4ComparableAxes: v4Comparable.length,
  humanComparableAxes: humanComparable.length,
  stageSummary,
};

const result = {
  experimentId: manifest.experimentId,
  analyzedAt: new Date().toISOString(),
  completion: {
    successfulRequests: latestSuccess.size,
    expectedRequests: manifest.counts.requests,
    completeAxes: completeAxes.length,
    expectedAxes: manifest.counts.includedAxes,
  },
  excluded: manifest.excluded,
  execution,
  discrimination,
  statusSummary,
  thresholdRows,
  axes,
};
fs.writeFileSync(path.join(dir, 'results.json'), `${JSON.stringify(result, null, 2)}\n`);

const statusTable = statusSummary.map((row) => `| ${row.status} | ${row.count} | ${row.medianMinCoverage ?? '-'} | ${row.medianMaxCollision ?? '-'} | ${row.minCoverageRange?.join('–') ?? '-'} | ${row.maxCollisionRange?.join('–') ?? '-'} |`).join('\n');
const selectedThresholds = thresholdRows.filter((row) => [0.3, 0.4, 0.5, 0.6, 0.7, 0.8].includes(row.coverageThreshold) && row.collisionThreshold === 0.2);
const thresholdTable = selectedThresholds.map((row) => `| ${row.coverageThreshold} | ${row.collisionThreshold} | ${row.autoPassAxes}/${row.comparableAxes} | ${row.v4NonPassAmongAutoPass} | ${row.v4SeriousOrErrorAmongAutoPass} | ${row.humanNonPassAmongAutoPass}/${row.humanCompared} |`).join('\n');
const report = `# JEV–V4 자연 응답 일치도 실험\n\n## 실험 목적\n\n이 실험의 목적은 합성한 모범·누락·오류 응답이 아니라, 실제 V4 평가 이력이 있는 자연 응답에서 JEV의 MR별 신호가 기존 판정과 얼마나 같은 방향으로 움직이는지 확인하는 것이다. 최종적으로는 JEV가 빠르고 저렴한 전단 측정기로서 안전한 자동 통과 후보를 좁히거나, 보완 여부를 학생에게 보여 주는 게이지에 활용될 가능성이 있는지 판단하려 했다.\n\n이번 비교에서 V4 판정을 절대 정답으로 간주하지 않았다. 먼저 V4와의 일치도를 측정하고, 사람이 직접 승인한 일부 표본에서는 사람 판정과도 별도로 비교했다. 특히 다음 세 질문을 확인 대상으로 삼았다.\n\n1. V4가 PASS로 본 축은 JEV의 required MR coverage도 상대적으로 높은가?\n2. V4가 UNCLEAR 또는 ERROR로 본 축을 JEV의 낮은 coverage나 높은 collision이 구분하는가?\n3. 매우 보수적인 역치를 두었을 때 거짓 자동 통과 없이 의미 있는 비율의 V4 호출을 줄일 수 있는가?\n\n## 대체적인 실험 과정\n\n1. 기존 V4 자연 응답 자료 45건과 축별 판정 74건을 불러왔다. 각 응답에는 최초 학생 응답, 필요한 경우 후속 질문과 학생 답변, V4의 축별 PASS·UNCLEAR_OK·UNCLEAR_SERIOUS·ERROR 판정이 들어 있다.\n2. 각 축이 기존 골드에서 어떤 MR과 연결되는지 복원했다. 연결된 모든 MR에 \`required\` 또는 \`error_only\` 역할이 명시된 경우만 1차 비교 대상으로 채택했다. 역할이 없는 MR을 임의로 필수 요소로 바꾸지 않았기 때문에 16건·24축은 제외되고 29건·50축이 남았다.\n3. JEV 입력에서는 원문과 AX 설명을 제거했다. 학생이 실제로 한 최초 응답과 후속 답변만 State에 넣고, 각 질문에 TARGET_MR을 하나씩 제시했다. 후속 질문 문장은 짧은 학생 답변의 지시 대상을 해석하는 문맥으로만 제공하고, 질문 자체를 학생 지식의 근거로 사용하지 말라고 명시했다.\n4. \`required\` MR에는 해당 의미가 학생 응답에 표현됐는지를 묻는 coverage 질문과 반대 주장이 있는지를 묻는 collision 질문을 모두 사용했다. \`error_only\` MR에는 생략을 벌점으로 만들지 않기 위해 collision만 물었다.\n5. 200개 센서를 플레이그라운드의 요청당 최대 5문항 형식으로 묶어 총 49회 실행했다. 원시 확률, 토큰 수, 모델 지연, 전체 왕복 시간을 매 요청마다 저장했다.\n6. 축별 coverage는 연결된 required MR 중 가장 낮은 값으로, collision은 연결 MR 중 가장 높은 값으로 요약했다. 하나의 필수 관계가 빠졌는데 다른 높은 점수로 평균이 보완되는 것을 막기 위해 평균 대신 최솟값을 사용했다.\n7. 이 두 값을 V4 판정과 비교해 상태별 분포와 PASS/non-PASS 순위 구분력을 계산했다. 또한 coverage와 collision 역치를 여러 값으로 바꾸어, 자동 통과 후보 수와 그 안에 포함되는 V4 non-PASS·SERIOUS·ERROR 수를 확인했다. 사람 승인 자료가 있는 축은 별도 보조 비교로 집계했다.\n\n## 결론\n\n현재 MR-level JEV 구성은 V4 판정을 넓게 대체하거나 안정적으로 복제하지 못했다. coverage는 PASS를 어느 정도 순위화했지만 겹침이 컸고(AUC ${discrimination.v4PassVsNonPassCoverageAuc}), collision은 non-PASS 분리에 기여하지 못했다(AUC ${discrimination.v4NonPassVsPassCollisionAuc}). 보수적인 coverage 0.7·collision 0.2 조건에서는 46축 중 5축(10.9%)만 자동 통과 후보가 되었고 모두 V4 PASS였지만, 표본이 작아 운영 역치로 승인할 근거는 아니다.\n\n더 근본적인 문제는 비교 계약의 불일치다. 현재 V4는 centralAxes 설명만 통과 기준으로 사용하고 coreRelations와 diagnosticRole을 입력받지 않는다. 반면 이번 JEV는 required MR 전체의 최솟값을 사용했다. N15에서는 V4가 축에 표현된 소유·운용·법적 통제를 확인해 PASS했지만, required MR11의 ‘공동체 질서 유지 목적’이 학생 응답에 없어 JEV 최솟값이 0.08이었다. 따라서 낮은 일치도를 JEV 성능만의 문제로 해석할 수 없다.\n\ncollision은 현재 형태로 V4 오류 안전망이 되지 못했다. 유효 V4 ERROR인 N33은 ‘잉크 방울’을 ‘공기방울’이라고 바꾼 대상 귀속 오류였지만, 고정 MR 문장과의 직접 반대가 아니어서 최고 collision이 0.05였다.\n\n## 상태\n\n- 성공 요청: ${latestSuccess.size}/${manifest.counts.requests}\n- 완성 축: ${completeAxes.length}/${manifest.counts.includedAxes}\n- V4 계약 유효 비교 축: ${v4Comparable.length}\n- 사람 승인 비교 축: ${humanComparable.length}\n- 역할 누락으로 제외: ${manifest.counts.excludedCases}건·${manifest.counts.excludedAxes}축\n- 실행 중앙값: 왕복 ${execution.medianWallTimeMs}ms, 모델 ${execution.medianModelLatencyMs}ms\n- 토큰: 입력 ${execution.inputTokens}, 출력 ${execution.outputTokens}, 합계 ${execution.totalTokens}\n\n## 입력 계약\n\n원문과 AX 설명을 제외하고 기존 골드의 TARGET_MR과 학생 원발화만 사용했다. 후속 질문은 짧은 학생 답변의 지시 대상을 해석하는 문맥으로만 제공했으며 독립 증거로 사용하지 말라고 명시했다. \`required\` MR은 coverage와 collision을, \`error_only\` MR은 collision만 측정했다.\n\n## V4 상태별 분포\n\n| V4 상태 | 축 수 | required MR 최저 coverage 중앙값 | collision 최고값 중앙값 | coverage 범위 | collision 범위 |\n|---|---:|---:|---:|---:|---:|\n${statusTable}\n\nPASS coverage 중앙값은 0.49, UNCLEAR_OK는 0.26이었지만 PASS 범위가 0.08–0.88로 매우 넓다. 사람 승인 16축에서 PASS/non-PASS coverage AUC는 ${discrimination.humanPassVsNonPassCoverageAuc}였으나 PASS 6축·UNCLEAR_OK 10축뿐이며 SERIOUS/ERROR가 없어 안전성 검증 표본으로는 부족하다. 최초 응답 AUC는 ${stageSummary[0].coverageAuc}, 후속 응답 AUC는 ${stageSummary[1].coverageAuc}다.\n\n## 자동 통과 역치 탐색\n\n아래 표는 운영 승인안이 아니라 shadow 역치 탐색이다. \`min required coverage ≥ 역치\`이고 \`max collision ≤ 0.2\`인 축만 자동 통과 후보로 본다.\n\n| coverage 하한 | collision 상한 | 자동 통과/비교 축 | V4 non-PASS | V4 SERIOUS·ERROR | 사람 non-PASS/비교 |\n|---:|---:|---:|---:|---:|---:|\n${thresholdTable}\n\n0.6 이하에서는 V4 SERIOUS/ERROR가 자동 통과 후보에 포함됐다. 0.7 이상에서는 이 표본의 거짓 자동 통과가 0이었지만 적용 범위가 10.9% 이하이고, 사람 비교도 1축뿐이다.\n\n## 해석 제한과 다음 조건\n\n- V4 판정은 비교 기준이지 절대 정답이 아니다.\n- 사람 승인 표본은 V4-light 불일치 사례에서 고른 고위험 표본이므로 대표 표본이 아니다.\n- \`UNCLEAR_OK\`는 MR coverage가 낮더라도 운영상 자동 질문이 필요 없을 수 있다. 정확한 4분류 일치와 라우팅 일치를 구분해야 한다.\n- 후속 응답은 질문 문맥 오염 가능성이 있으므로 최초 응답과 별도 층화해야 한다.\n- 16건·24축은 연결 MR의 diagnosticRole이 없어 임의 보정하지 않고 제외했다.\n- 다음 비교 전에 AX 통과 기준과 required MR의 범위를 정합화하거나, JEV도 AX 설명만 평가하는 별도 대조군을 두어야 한다.\n- 임계값, 자동 PASS, 운영 배포는 승인하지 않는다.\n\n## 후속 제품 결정\n\n사용자는 이 결과와 앞선 JEV 실험을 함께 검토한 뒤, 현재 제품 계획에서 JEV를 계속 유지할 이유가 충분하지 않다고 판단했다. JEV 관련 자동 PASS, MR 게이지 UI, MR 중요도·가중치 추가, collision 확장, 추가 유료·플레이그라운드 실험은 중단하고 연구 자료로 보존한다. 운영 평가기는 현재 V4를 유지한다.\n\n이 결정은 JEV가 영구적으로 불가능하다는 판정이 아니라 제품 작업의 \`PARKED\` 처리다. 실제 사용에서 V4 비용·지연이 반복 병목으로 확인되거나, 공식 API 접근과 모델 성능이 개선되고, 좁고 검증 가능한 새 효용이 생길 때만 재검토한다.\n`;
fs.writeFileSync(path.join(dir, 'REPORT.md'), report);
console.log(JSON.stringify(result.completion, null, 2));
