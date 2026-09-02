import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(experimentRoot, "../../..");
const manifestPath = path.join(
  repoRoot,
  "packages/pipeline/experiments/problem-solving/prospective-gold-sample-v1.json",
);
const productionRoot = path.join(experimentRoot, "gold-production");
const artifactsRoot = path.join(productionRoot, "artifacts");
const outputPath = path.join(experimentRoot, "REVIEW-PACKET.md");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const readOptionalJson = (filePath) =>
  fs.existsSync(filePath) ? readJson(filePath) : null;
const asArray = (value) => (Array.isArray(value) ? value : []);
const inline = (value) => {
  if (value === null || value === undefined || value === "") return "없음";
  if (typeof value === "boolean") return value ? "예" : "아니요";
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
};
const code = (value) => `\`${inline(value).replaceAll("`", "\\`")}\``;
const codeList = (values) =>
  asArray(values).length > 0 ? asArray(values).map(code).join(", ") : "없음";
const textBlock = (value) =>
  inline(value) === "없음"
    ? "없음"
    : String(value)
        .trim()
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n\n");
const bullet = (label, value) => `- ${label}: ${value}`;
const sourceReferences = (references) => {
  if (!asArray(references).length) return "없음";
  return references
    .map((reference) => {
      const parts = [];
      if (reference.paragraphId) parts.push(`문단 ${code(reference.paragraphId)}`);
      if (asArray(reference.propositionIds).length) {
        parts.push(`명제 ${codeList(reference.propositionIds)}`);
      }
      if (asArray(reference.relationIds).length) {
        parts.push(`관계 ${codeList(reference.relationIds)}`);
      }
      return parts.join(" / ");
    })
    .join("; ");
};

const manifest = readJson(manifestPath);
const rows = [];
const sections = [];

for (const [index, sample] of manifest.items.entries()) {
  const number = index + 1;
  const caseRoot = path.join(artifactsRoot, sample.caseId);
  const sourceInput = readJson(path.join(caseRoot, "source-input.json"));
  const source = sourceInput.source;
  const status = readJson(path.join(caseRoot, "production-status.json"));
  const validation = readJson(path.join(caseRoot, "initial-validation.json"));
  const candidatePath = path.join(caseRoot, "candidate-gold.json");
  const isValidatedCandidate = fs.existsSync(candidatePath);
  const gold = isValidatedCandidate
    ? readJson(candidatePath)
    : readJson(path.join(caseRoot, "first-generation-response.json"));
  const sufficientGroundCandidates =
    readOptionalJson(path.join(caseRoot, "sufficient-ground-candidates.json")) ?? [];
  const review = readOptionalJson(path.join(caseRoot, "human-review.json"));
  const metadata = readOptionalJson(path.join(caseRoot, "generation-metadata.json"));
  const choiceById = new Map(
    source.question.choices.map((choice) => [`C${choice.choice_number}`, choice]),
  );

  const risk = review?.risk?.level ?? "후보 미생성";
  const reviewStatus = review?.status ?? "사람 교정 필요";
  rows.push(
    `| [${number}](#case-${String(number).padStart(2, "0")}) | ${inline(sample.domain)} | ${inline(source.question.stem)} | ${code(`C${source.answerKey.correctChoice}`)} | ${inline(risk)} | ${code(reviewStatus)} |`,
  );

  const out = [];
  out.push(`<a id="case-${String(number).padStart(2, "0")}"></a>`);
  out.push(`## ${number}. ${source.exam} · ${source.title} ${source.questionNumber}번`);
  out.push("");
  out.push("### 검수 상태");
  out.push("");
  out.push(bullet("case ID", code(sample.caseId)));
  out.push(bullet("분야", code(sample.domain)));
  out.push(bullet("표본 범위", codeList(sample.coverage)));
  out.push(bullet("생산 상태", code(status.status)));
  out.push(bullet("후보 종류", isValidatedCandidate ? "정적 검증을 통과한 후보" : "검증 실패 원시 생성본(후보 골드 아님)"));
  out.push(bullet("사람 검수 상태", code(reviewStatus)));
  out.push(bullet("검수 위험도", code(risk)));
  if (review?.risk?.reasons?.length) {
    out.push(bullet("위험 사유", review.risk.reasons.map(inline).join("; ")));
  }
  out.push(bullet("원천 해시", code(sample.sourceHash)));
  out.push("");
  out.push("검수 체크: [ ] 공식 정답과 선지 판정 일치 · [ ] 원문 근거 정확 · [ ] 추론 비약 없음 · [ ] 충분 근거가 최소 조합 · [ ] 시각 자료 해석 정확");
  out.push("");

  out.push("### 원문");
  out.push("");
  out.push(textBlock(source.passage));
  out.push("");

  const mediaAssets = asArray(gold.mediaAssets);
  if (source.media?.length || mediaAssets.length) {
    out.push("#### 원문·문제 시각 자료");
    out.push("");
    const assets = mediaAssets.length
      ? mediaAssets
      : source.media.map((media) => ({ ...media, altText: media.mediaId }));
    for (const media of assets) {
      const extension = path.extname(new URL(media.sourceUrl).pathname) || ".png";
      const expectedLocalName = `${media.mediaId}${extension}`;
      const localMediaPath = path.join(caseRoot, "input-media", expectedLocalName);
      const relativeMediaPath = `./gold-production/artifacts/${sample.caseId}/input-media/${expectedLocalName}`;
      out.push(`**${media.mediaId} — ${inline(media.altText)}**`);
      out.push("");
      if (fs.existsSync(localMediaPath)) {
        out.push(`![${inline(media.altText)}](${relativeMediaPath})`);
      } else {
        out.push(`[시각 자료 원본 열기](${media.sourceUrl})`);
      }
      out.push("");
      out.push(
        bullet(
          "배치 / 역할 / 풀이 필수",
          `${code(media.placement?.scope)} / ${code(media.role)} / ${inline(media.requiredForSolving)}`,
        ),
      );
      out.push(bullet("종류 / MIME", `${code(media.kind)} / ${code(media.mimeType)}`));
      out.push(bullet("크기", `${inline(media.width)} × ${inline(media.height)}`));
      out.push(bullet("원본 URL", `[열기](${media.sourceUrl})`));
      out.push(bullet("콘텐츠 해시", code(media.contentHash)));
      out.push("");
    }
  }

  out.push("### 문제");
  out.push("");
  out.push(bullet("문항 제목", inline(source.question.title)));
  out.push(bullet("배점", `${inline(source.question.points)}점`));
  out.push(bullet("태그", codeList(source.question.tags)));
  out.push("");
  out.push(`**발문**: ${textBlock(source.question.stem)}`);
  out.push("");
  for (const supplement of asArray(source.question.supplements)) {
    out.push(`#### ${inline(supplement.label)}`);
    out.push("");
    out.push(textBlock(supplement.text));
    out.push("");
    for (const imageUrl of asArray(supplement.image_urls)) {
      out.push(`[보기 이미지 원본 열기](${imageUrl})`);
      out.push("");
    }
  }
  out.push("#### 선지");
  out.push("");
  for (const choice of source.question.choices) {
    out.push(`${choice.choice_number}. ${textBlock(choice.text)}`);
    out.push("");
  }
  out.push(
    `**공식 정답: ${source.answerKey.correctChoice}번 (${code(`C${source.answerKey.correctChoice}`)}) — ${inline(source.answerKey.correctChoiceText)}**`,
  );
  out.push("");

  out.push(isValidatedCandidate ? "### 골드 후보 전체" : "### 검증 실패 원시 생성본 전체");
  out.push("");
  if (!isValidatedCandidate) {
    out.push(
      "> 이 생성본은 최종 스키마 검증에 실패했으므로 `candidate-gold.json`으로 승격되지 않았습니다. 아래 내용은 사람 교정을 위한 참고 자료이며 승인 가능한 골드가 아닙니다.",
    );
    out.push("");
  }
  out.push(bullet("스키마", code(gold.schemaVersion)));
  out.push(bullet("골드 상태", code(gold.reviewStatus)));
  out.push(
    bullet(
      "골드 원천",
      `${code(gold.source?.sourceId)} / ${inline(gold.source?.exam)} / ${inline(gold.source?.questionNumber)}번`,
    ),
  );
  out.push(bullet("question / passage ID", `${code(gold.questionId)} / ${code(gold.passageId)}`));
  out.push(bullet("골드 발문", inline(gold.stem)));
  out.push(bullet("발문 극성", code(gold.stemPolarity)));
  out.push(bullet("정답 choice ID", code(gold.answerChoiceId)));
  out.push("");

  out.push("#### 시나리오와 사실");
  out.push("");
  out.push(textBlock(gold.scenario?.text));
  out.push("");
  for (const fact of asArray(gold.scenario?.facts)) {
    out.push(`- ${code(fact.id)} ${inline(fact.description)}`);
  }
  if (!asArray(gold.scenario?.facts).length) out.push("- 없음");
  out.push("");

  out.push("#### 원문 근거 명제");
  out.push("");
  out.push(bullet("passage detail ID", code(gold.passageDetailGold?.passageId)));
  out.push("");
  for (const proposition of asArray(gold.passageDetailGold?.propositions)) {
    out.push(`##### ${proposition.id} · ${proposition.paragraphId}`);
    out.push("");
    out.push(proposition.description);
    out.push("");
    out.push(bullet("원문 증거", `“${inline(proposition.evidence)}”`));
    out.push(bullet("범위", inline(proposition.scope)));
    out.push(bullet("극성 / 근거 유형", `${code(proposition.polarity)} / ${code(proposition.basis)}`));
    out.push(bullet("조건", asArray(proposition.conditions).map(inline).join("; ") || "없음"));
    out.push(bullet("예외", asArray(proposition.exceptions).map(inline).join("; ") || "없음"));
    out.push("");
  }

  out.push("#### 시각 자료 주장");
  out.push("");
  if (!asArray(gold.visualAssertions).length) out.push("없음");
  for (const assertion of asArray(gold.visualAssertions)) {
    out.push(`- ${code(assertion.id)} (${code(assertion.mediaId)}, ${code(assertion.kind)}): ${inline(assertion.description)}`);
  }
  out.push("");

  const renderInference = (inference, titlePrefix = "") => {
    out.push(`##### ${titlePrefix}${inference.inferenceId} · ${inference.operation}`);
    out.push("");
    out.push(inference.description);
    out.push("");
    out.push(bullet("결론", inline(inference.conclusion)));
    out.push(bullet("대상 주장 / 효과", `${codeList(inference.targetClaimIds)} / ${code(inference.targetClaimEffect)}`));
    out.push(bullet("직접 전제 refs", codeList(inference.premiseRefs)));
    out.push(bullet("원문 참조", sourceReferences(inference.references)));
    out.push(bullet("시나리오 사실", codeList(inference.scenarioFactIds)));
    out.push(bullet("시각 주장", codeList(inference.visualAssertionIds)));
    out.push(bullet("grounding / necessity", `${code(inference.grounding)} / ${code(inference.necessity)}`));
    out.push("");
  };

  out.push("#### 문항 추론");
  out.push("");
  for (const inference of asArray(gold.itemInferences)) renderInference(inference);
  if (!asArray(gold.itemInferences).length) out.push("없음\n");

  out.push("#### 보충 설명 추론");
  out.push("");
  for (const inference of asArray(gold.supplementalExplanationInferences)) {
    renderInference(inference, "보충 ");
  }
  if (!asArray(gold.supplementalExplanationInferences).length) out.push("없음\n");

  out.push("#### 선지별 골드 판정");
  out.push("");
  for (const choiceGold of asArray(gold.choices)) {
    const originalChoice = choiceById.get(choiceGold.choiceId);
    out.push(`##### ${choiceGold.choiceId} · ${inline(choiceGold.text ?? originalChoice?.text)}`);
    out.push("");
    out.push(bullet("위치 / 판정", `${inline(choiceGold.position)} / ${code(choiceGold.judgment)}`));
    out.push(bullet("판정 근거", inline(choiceGold.rationale)));
    out.push(bullet("주장 IDs", codeList(choiceGold.claimIds)));
    out.push(bullet("필수 원문 참조", sourceReferences(choiceGold.requiredReferences)));
    out.push(bullet("필수 시나리오 사실", codeList(choiceGold.scenarioFactIds)));
    out.push(bullet("필수 시각 주장", codeList(choiceGold.visualAssertionIds)));
    out.push("");
    const claims = asArray(gold.optionClaims).filter(
      (claim) => claim.choiceId === choiceGold.choiceId,
    );
    for (const claim of claims) {
      out.push(`**주장 ${claim.claimId} (${inline(claim.order)}순위)**`);
      out.push("");
      out.push(claim.description);
      out.push("");
      out.push(bullet("assessment / support", `${code(claim.assessment)} / ${code(claim.supportStrength)}`));
      out.push(bullet("decision / basis", `${code(claim.decision)} / ${code(claim.decisionBasis)}`));
      out.push(bullet("결정 핵심", inline(claim.decisionCritical)));
      out.push(bullet("의존 주장", codeList(claim.dependsOnClaimIds)));
      out.push(bullet("문항 추론", codeList(claim.itemInferenceIds)));
      out.push(bullet("원문 참조", sourceReferences(claim.references)));
      out.push(bullet("시나리오 사실", codeList(claim.scenarioFactIds)));
      out.push(bullet("시각 주장", codeList(claim.visualAssertionIds)));
      out.push(bullet("보충 추론", codeList(claim.fallbackSupplementalInferenceIds)));
      out.push(bullet("보충 사용 정책", codeList(claim.supplementalUsePolicy)));
      out.push("");
    }
  }

  out.push("#### 정답 도출 경로");
  out.push("");
  for (const step of asArray(gold.referencePath)) {
    out.push(`##### ${step.stepId}`);
    out.push("");
    out.push(step.description);
    out.push("");
    out.push(bullet("원문 참조", sourceReferences(step.references)));
    out.push(bullet("시나리오 사실", codeList(step.scenarioFactIds)));
    out.push(bullet("시각 주장", codeList(step.visualAssertionIds)));
    out.push(bullet("문항 추론", codeList(step.itemInferenceIds)));
    out.push(bullet("선지 주장", codeList(step.optionClaimIds)));
    out.push("");
  }
  out.push(bullet("필수 단계", codeList(gold.requiredPathStepIds)));
  out.push(bullet("결정 단계", codeList(gold.decisivePathStepIds)));
  out.push(bullet("결론 단계", codeList(gold.conclusionStepIds)));
  out.push(bullet("최종 답", code(gold.finalAnswerExplanation?.answerChoiceId)));
  out.push(bullet("최종 설명", inline(gold.finalAnswerExplanation?.message)));
  out.push(bullet("최종 설명 참조 단계", codeList(gold.finalAnswerExplanation?.referencePathStepIds)));
  out.push("");

  out.push("#### 대표 오답 경로");
  out.push("");
  if (!asArray(gold.representativeWrongPaths).length) out.push("없음");
  for (const wrongPath of asArray(gold.representativeWrongPaths)) {
    out.push(`- ${code(wrongPath.id)} ${inline(wrongPath.description)}`);
    out.push(`  - scope: ${code(wrongPath.scope)}`);
    out.push(`  - 선택 선지: ${codeList(wrongPath.selectedChoiceIds)}`);
    out.push(`  - 놓친 정답: ${code(wrongPath.missedAnswerChoiceId)}`);
    out.push(`  - 분기 층위 후보: ${codeList(wrongPath.candidateDivergenceLayers)}`);
  }
  out.push("");

  out.push("#### 골드 자체 검수 메모");
  out.push("");
  if (!asArray(gold.reviewNotes).length) out.push("없음");
  for (const note of asArray(gold.reviewNotes)) out.push(`- ${inline(note)}`);
  out.push("");

  out.push("### 충분 근거 조합 후보");
  out.push("");
  if (!sufficientGroundCandidates.length) {
    out.push("없음 — 유효한 후보 골드가 생성되지 않았습니다.");
    out.push("");
  }
  for (const candidate of sufficientGroundCandidates) {
    out.push(`#### ${candidate.candidateId}`);
    out.push("");
    out.push(bullet("선지 / 대상 주장", `${code(candidate.choiceId)} / ${codeList(candidate.targetClaimIds)}`));
    out.push(bullet("제안 경로 / 연산자", `${code(candidate.proposedRoute)} / ${code(candidate.operator)}`));
    out.push(bullet("필수 근거", codeList(candidate.requiredSourceRefs)));
    out.push(bullet("생략 허용 근거", codeList(candidate.allowedOmissionSourceRefs)));
    out.push(bullet("결론", inline(candidate.conclusion)));
    out.push(bullet("원천 추론", codeList(candidate.sourceInferenceIds)));
    out.push(bullet("생성 방식 / 상태", `${code(candidate.origin)} / ${code(candidate.reviewStatus)}`));
    out.push(bullet("위험 표지", codeList(candidate.riskFlags)));
    out.push("");
  }

  out.push("### 생성·검증 기록");
  out.push("");
  out.push(bullet("원시 스키마 통과", inline(validation.rawSchemaValid)));
  out.push(bullet("원시 오류", asArray(validation.rawValidationErrors).map(inline).join("; ") || "없음"));
  out.push(bullet("자동 정규화", codeList(validation.normalizationChanges)));
  out.push(bullet("최종 스키마 통과", inline(validation.schemaValid)));
  out.push(bullet("최종 오류", asArray(validation.validationErrors).map(inline).join("; ") || "없음"));
  out.push(bullet("생성 모델 / effort", `${code(metadata?.model)} / ${code(metadata?.effort)}`));
  out.push(bullet("프롬프트 버전", code(metadata?.promptVersion)));
  out.push(bullet("생성 시간", metadata?.durationMs === undefined ? "없음" : `${metadata.durationMs}ms`));
  out.push("");
  if (review) {
    out.push(bullet("검수 파일 상태", code(review.status)));
    out.push(bullet("검수자 / 시각", `${inline(review.reviewerId)} / ${inline(review.reviewedAt)}`));
    out.push(bullet("승인된 충분 근거 후보", codeList(review.approvedCandidateIds)));
    out.push(bullet("검수 메모", asArray(review.notes).map(inline).join("; ") || "없음"));
  }
  out.push("");
  out.push("**사람 검수 메모:**");
  out.push("");
  out.push("- 판정:");
  out.push("- 수정 필요 사항:");
  out.push("- 승인할 충분 근거 후보:");
  out.push("");
  out.push("[목차로 돌아가기](#빠른-목차)");
  out.push("");
  out.push("---");
  out.push("");
  sections.push(out.join("\n"));
}

const document = [
  "# 신규 24문항 골드 통합 검수본",
  "",
  `생성 기준: ${manifest.createdAt.slice(0, 10)} · 표본 ${manifest.items.length}문항 · 원천 \`${manifest.sourceRoot}\``,
  "",
  "> 이 문서는 검수 편의를 위해 기존 원천 입력과 생성 산출물을 사람이 읽을 수 있는 형태로 이어 붙인 파생 문서입니다. 이 파일의 체크 표시나 메모는 승인 계약에 반영되지 않습니다. 실제 승인 상태는 각 문항의 `human-review.json`에서만 변경합니다.",
  "",
  "문항마다 `원문 → 시각 자료 → 문제/선지/공식 정답 → 골드 후보 전체 → 충분 근거 조합 → 생성·검증 기록` 순서입니다. 23건은 검증된 후보이고, 볼록 렌즈 1건은 후보 미생성 상태라 검증 실패 원시 생성본을 교정 참고용으로 표시했습니다.",
  "",
  "<a id=\"빠른-목차\"></a>",
  "## 빠른 목차",
  "",
  "| 번호 | 분야 | 발문 | 정답 | 위험도 | 검수 상태 |",
  "|---:|---|---|---:|---|---|",
  ...rows,
  "",
  "---",
  "",
  ...sections,
].join("\n");

fs.writeFileSync(outputPath, document, "utf8");
console.log(`Wrote ${outputPath}`);
console.log(`Cases: ${manifest.items.length}`);
console.log(`Bytes: ${Buffer.byteLength(document, "utf8")}`);
