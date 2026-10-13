import { readFileSync, writeFileSync } from 'node:fs';

const root='docs/experiments/v4-light-output-v1-2026-09-22';
const out='docs/review/v4-vs-v4-light-experiment-preview-2026-09-22.md';
const read=p=>readFileSync(p,'utf8').trim();
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const summary=json(`${root}/summary.json`);
const v=summary.arms.v4,l=summary.arms.light;
const pct=(a,b)=>((1-b/a)*100).toFixed(1);
const changes={};
for(const row of summary.comparisons)for(const x of row.comparison.changes??[]){const key=`${x.v4} → ${x.light}`;changes[key]=(changes[key]??0)+1;}

const v4Base=read('packages/pipeline/experiments/dialogue/central-story-gate-prompt-v4.md');
const claims=read('packages/pipeline/experiments/dialogue/current-claims-recording-v1.md');
const errors=read('packages/pipeline/experiments/dialogue/error-claims-recording-v1.md');
const light=read('packages/pipeline/experiments/dialogue/v4-light-judgment-prompt-v1.md');

const doc=`# V4 ↔ V4-light 실험 현황·결과·프롬프트 전문

- 작성일: 2026-09-22 KST
- 실험: \`v4-light-output-v1\`
- 운영 상태: **현재 V4 유지 / V4-light 미승격**
- 유료 실행: 90호출 완료, 추정 비용 $${summary.knownEstimatedUsd.toFixed(6)}
- 2단계 전체 흐름 시험: **진입 조건 미달로 미실행**

이 문서는 현재 무엇을 시험했는지, 무엇을 확인했고 무엇은 아직 확인하지 못했는지를 한곳에서 검토하기 위한 자료다. 마지막에는 실제 API 호출에 사용한 V4와 V4-light 지시문을 수정 없이 전문으로 싣는다.

## 1. 현재 해결하려는 문제

현재 문단 요약 판정기 V4는 자연 응답에서 사용자의 판단에 비교적 가까운 개입 경계를 보였지만, 한 호출의 비용과 지연이 크다.

직전 자연 응답 비교에서 V4는 45호출 기준 입력 약27.2만 토큰, 출력 약3.7만 토큰, API 시간 중앙값 약7.55초였다. direct-v1보다 입력·출력과 시간이 모두 컸다.

V4는 축 상태 외에도 다음 내용을 한 번에 생성한다.

- 누적 합성 응답
- 주장별 현재·수정·철회 기록
- 학생 발화의 직접 인용
- 누락 판단의 중심축 인용
- 오류 구절과 오류가 속한 현재 주장
- 학생에게 공개할 확인 내용
- 다음 질문의 대상과 목적
- 전체 판정 요약과 여러 중간 표현

현재 질문은 다음과 같다.

> V4의 판정 원칙과 인간에 가까운 개입 경계를 유지하면서, 상세 기록 출력을 줄여 비용과 시간을 줄일 수 있는가?

## 2. 이번 실험에서 실제로 한 것

### 공통 조건

- 출처가 확인된 사용자 직접 테스트 45시점
- 최초 응답 31시점, 후속 응답 14시점
- 동일한 문단 원문, 중심축, 학생 최초 응답, 과거 질문–답변, 이미 공개된 도움
- \`gpt-5.6-terra\` / reasoning \`medium\` / service tier \`default\`
- \`store:false\`
- 현재 V4와 V4-light를 시점별 병렬 호출하고 제출 순서를 교대
- 각 조건 45회, 총 90호출
- 질문 생성 0회, 재시도 0회
- 운영 코드·UI·공개 서버 변경 없음

### 현재 V4

기본 판정 프롬프트에 현재 주장 기록 계약과 오류 구절 기록 계약을 결합했다. 구조화 출력에는 합성 응답, 축 상태, 축별 학생용 공개 상태, 주장 이력, 오류 인용, 누락 인용, 질문 목적 등이 포함된다.

### V4-light

중심축만 통과 기준으로 삼는 원칙, 누적 답변 합성, OK 우선, 누락과 오류 구분 같은 취지를 유지하려 했다. 출력은 다음으로 줄였다.

- \`effectiveResponse\`
- 각 축의 \`axisId\`, \`status\`, 짧은 \`reason\`

주장 장부·직접 인용·누락 인용·오류 인용·공개 텍스트·질문 목적·전체 상태 등은 출력하지 않았다.

## 3. 설계상 중요한 정정

이번 V4-light는 엄밀한 의미에서 **판정을 끝낸 뒤 출력만 잘라낸 조건이 아니다.**

상세 필드를 출력하지 않으면서 그 필드를 작성하라는 지시도 함께 제거했다. 그 결과:

- 구조화 출력 스키마가 작아졌다.
- 입력 지시문도 짧아졌다.
- 모델이 주장·근거·누락·오류·질문 목적을 명시적으로 작성하며 판정하던 작업 과정도 사라졌다.

LLM에서는 ‘판정을 먼저 확정하고 그 뒤 기록한다’는 두 과정이 기계적으로 분리되어 있지 않다. 무엇을 출력해야 하는지가 판정 과정 자체에 영향을 줄 수 있다.

따라서 이번 실험이 검증한 것은 다음이다.

> V4의 상세 기록 작업 묶음을 제거했을 때 비용·지연과 판정이 어떻게 변하는가?

아직 검증하지 않은 것은 다음이다.

> V4의 판정 지시와 내부 확인 과정은 그대로 유지하고 최종 출력 필드만 줄였을 때 판정이 유지되는가?

## 4. 측정 결과

| 항목 | 현재 V4 | V4-light | 변화 |
|---|---:|---:|---:|
| 호출 수 | ${v.calls} | ${l.calls} | 동일 |
| 계약 유효 | ${v.valid}/${v.calls} | ${l.valid}/${l.calls} | light +${l.valid-v.valid} |
| API 시간 중앙값 | ${(v.medianApiMs/1000).toFixed(3)}초 | ${(l.medianApiMs/1000).toFixed(3)}초 | ${pct(v.medianApiMs,l.medianApiMs)}% 감소 |
| 입력 토큰 합계 | ${v.inputTokens.toLocaleString()} | ${l.inputTokens.toLocaleString()} | ${pct(v.inputTokens,l.inputTokens)}% 감소 |
| 출력 토큰 합계 | ${v.outputTokens.toLocaleString()} | ${l.outputTokens.toLocaleString()} | ${pct(v.outputTokens,l.outputTokens)}% 감소 |
| 추정 비용 | $${v.estimatedUsd.toFixed(6)} | $${l.estimatedUsd.toFixed(6)} | ${pct(v.estimatedUsd,l.estimatedUsd)}% 감소 |
| 모든 축 PASS | ${v.allPass} | ${l.allPass} | +${l.allPass-v.allPass} |
| SERIOUS/ERROR 질문 후보 | ${v.questionCandidate} | ${l.questionCandidate} | +${l.questionCandidate-v.questionCandidate} |

### 판정 보존

- 모든 축 상태가 동일한 시점: **${summary.same}/45**
- 상태 불일치: **${summary.disagreements}/45**, 총 16축
- 상태 전이: ${Object.entries(changes).map(([k,n])=>`\`${k}\` ${n}축`).join(', ')}
- 질문 후보 변화: **${summary.interventionChanges}/45**
- V4 비질문 → light 질문: ${summary.v4NoQuestionToLightQuestion.join(', ')}
- V4 질문 → light 비질문: 없음

V4-light는 V4가 \`UNCLEAR_OK\`에 두던 축을 한쪽에서는 PASS, 다른 쪽에서는 SERIOUS로 결정했다. 즉 비용을 줄였지만 V4의 완충 지대를 보존하지 못하고 direct-v1과 비슷하게 판정을 양극화했다.

사용자는 이 실험의 불일치15건이 담긴 REVIEW-PACKET을 직접 읽고 각 사례에서 V4의 표시 결과를 승인했다. 따라서 이 표본에서는 V4-light의15개 시점 차이를 사람 승인 기준 이탈로, V4 비질문→light 질문5건을 과개입으로 기록한다. 승인은 검토 문서에 표시된 합성 응답·축 상태와 이유·질문 후보에 한정하며, 숨은 claimLedger/errorClaims나 계약 유효성을 승인한 것은 아니다.

### 계약 안정성

현재 V4는 2건에서 \`claimLedger\`가 학생 답변이 아닌 질문 문구를 학생 근거로 인용해 계약 실패했다. V4-light는 기록 필드가 없어 45/45 계약 유효였다.

운영 V4는 이런 실패에서 학생 입력을 보존하고 한 번 재시도한다. 이번 대조는 재시도 0회로 고정했으므로 V4의 운영 재시도 비용·시간은 위 표에 포함되지 않는다.

### 합성 응답

V4-light는 45/45에서 합성 응답을 반환했다. 다만 2건에서는 학생이 말하지 않은 정답 내용을 “설명하지 않았다”는 평가자의 누락 설명으로 합성 응답에 포함했다. 현재 UI는 합성 응답을 학생에게 보여 주므로, 합성 응답에는 학생이 실제로 유지하는 의미만 담고 누락 해설은 넣지 않는 계약이 필요하다.

현재 V4에서도 다른 2건에 유사한 표현이 있어, 이것을 light만의 결함으로 확정할 수는 없다.

## 5. 현재 결론

성능 측면에서는 상세 기록 축소의 효과가 크다.

- 시간 중앙값 약 63.5% 감소
- 비용 약 73.6% 감소
- 입력 토큰 약 69.6% 감소
- 출력 토큰 약 78.3% 감소
- 기록 계약 실패 2건 제거

그러나 제품의 최우선 목표는 충분한 학생을 불필요하게 붙잡지 않는 것이다. V4-light는 V4가 질문하지 않던 5개 시점을 새 질문 후보로 바꿨고 반대 방향의 개선은 없었다. 따라서 사전 품질 진입 조건을 충족하지 못했다.

현재 결정은 다음과 같다.

- 운영 V4 유지
- V4-light 미승격
- 오류·철회·부분 수정·새 질문을 연결하는 2단계 유료 시험 미실행
- 기존 주장 기록·오류 인용 계약 유지

## 6. 남은 문제

### 6.1 순수한 출력 축소 효과가 분리되지 않았다

이번 후보는 입력 지시와 출력 스키마를 함께 줄였다. 비용·지연 감소 중 얼마가 짧은 입력, 짧은 출력, 기록 작업 제거에서 각각 왔는지 분리할 수 없다.

### 6.2 상세 기록이 판정의 사고 발판인지 불명확하다

주장·인용·누락·오류·질문 목적을 명시적으로 작성하는 작업이 V4의 OK/SERIOUS 경계를 안정화했을 가능성이 있다. 어떤 필드가 실제로 유효한지는 확인되지 않았다.

### 6.3 제거 가능한 필드가 아직 특정되지 않았다

후속 처리에 직접 쓰이는 필드와 감사용 필드가 섞여 있다.

- 합성 응답: UI와 누적 의미 확인에 필요
- 축별 상태: UI·질문 여부에 필요
- 질문 목적·오류 구절: 2차 질문이 다른 오류나 축으로 이동하지 않게 하는 안전장치
- 공개 텍스트: PASS/OK 축의 보상 UI에 필요
- 주장 이력·누락 인용: 상태 전이와 범위 검증에 사용
- 중심 대상·중심 이야기·정보량·긴 전체 요약: 축소 우선 후보지만 개별 제거 효과 미검증

### 6.4 V4도 독립 재호출에서 완전히 동일하지 않다

같은 프롬프트·입력·모델 조건의 전날 V4와 이번 V4를 비교하면 45시점 중 10시점·11축의 세부 상태가 달랐다. 대부분 PASS↔OK였고 질문 후보 여부는 45/45 동일했다. 한 사례에서는 ERROR 귀속 축이 달라졌다.

따라서 세부 라벨의 반복 일치와 실제 개입 여부의 안정성을 구분해야 한다.

### 6.5 실제 전체 흐름은 검증하지 않았다

이번 시험에서는 새 질문을 생성하지 않았다. 제거한 기록이 교정 질문의 정확성, 짧은 답의 누적, 철회·부분 수정 처리에 미치는 영향은 확인하지 않았다. 1단계 품질 조건을 통과하지 못했으므로 2단계를 실행하지 않았다.

### 6.6 사람 기준은 15건에 한정된다

불일치15건에는 사례별 V4 승인 기준이 생겼다. 그러나 나머지30개 일치 사례나 새로운 학생 응답에서 V4가 항상 옳다는 뜻은 아니다. 다음 후보 검증에서는 이15건을 필수 회귀로 사용하고, 일치 사례와 새로운 자연 응답에서 V4와 후보가 함께 틀리는 가능성도 별도로 본다.

## 7. 다음 실험을 한다면

다음 후보는 현재 V4-light를 고치는 방식보다 **V4의 판정 지시는 최대한 유지하고 출력 계약만 좁히는 별도 실험**이어야 한다.

예시:

1. V4의 중심축·누적 합성·OK/SERIOUS·오류·수정·철회 원칙은 그대로 둔다.
2. 상세 내용을 내부적으로 확인하되 최종 JSON에 쓰지 말라고 한다.
3. 먼저 후속에 사용되지 않는 필드만 제거한다.
4. \`effectiveResponse + 축 상태·이유\`를 핵심 출력으로 유지한다.
5. ERROR일 때의 오류 구절, 질문이 필요할 때의 질문 초점처럼 후속 안전에 필요한 최소 필드는 조건부로 남기는 후보도 별도로 비교한다.
6. 같은 45시점에서 V4의 질문 여부와 사용자 검토 경계를 보존하는지 본다.

이 설계도 완전한 인과 분리는 아니다. 출력 스키마가 달라지면 모델 생성 과정이 달라질 수 있다. 다만 이번 실험보다 “출력량 자체”에 훨씬 가까운 비교가 된다.

---

# 부록 A. 현재 V4 실제 지시문 전문

실제 V4 호출의 \`instructions\`는 아래 세 문서를 순서대로 결합한다.

## A-1. 중심축 판정·누적 합성·V4 개입 정책

출처: \`packages/pipeline/experiments/dialogue/central-story-gate-prompt-v4.md\`

\`\`\`text
${v4Base}
\`\`\`

## A-2. 현재 주장과 수정·철회 이력 기록 계약

출처: \`packages/pipeline/experiments/dialogue/current-claims-recording-v1.md\`

\`\`\`text
${claims}
\`\`\`

## A-3. 오류 구절 별도 지정 계약

출처: \`packages/pipeline/experiments/dialogue/error-claims-recording-v1.md\`

\`\`\`text
${errors}
\`\`\`

---

# 부록 B. V4-light 실제 지시문 전문

출처: \`packages/pipeline/experiments/dialogue/v4-light-judgment-prompt-v1.md\`

\`\`\`text
${light}
\`\`\`

---

## 관련 자료

- 실험 결과: \`docs/experiments/v4-light-output-v1-2026-09-22/REPORT.md\`
- 불일치 15시점: \`docs/experiments/v4-light-output-v1-2026-09-22/REVIEW-PACKET.md\`
- 실행 요약: \`docs/experiments/v4-light-output-v1-2026-09-22/summary.json\`
- 실행 감사: \`docs/experiments/v4-light-output-v1-2026-09-22/execution-audit.json\`
`;

writeFileSync(out,doc);
console.log(JSON.stringify({output:out,bytes:Buffer.byteLength(doc),v4Characters:v4Base.length+claims.length+errors.length,lightCharacters:light.length},null,2));
