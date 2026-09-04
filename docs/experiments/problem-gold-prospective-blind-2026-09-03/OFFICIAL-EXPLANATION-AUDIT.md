# 신규 24문항 공식 해설 원자료 감사

감사일: 2026-09-03

감사 대상: `prospective-gold-sample-v1.json`의 24개 문항

## 1. 결론

사용자의 기억이 맞다. 24개 문항 모두 원자료의 enrichment 레코드에 EBSi 정답 및 해설
자료가 연결되어 있다. 문항 번호 조인, 정답 번호, 정답 선택지 문구도 24/24 모두 원문 문제
레코드와 일치한다.

다만 DB에 저장된 것은 **해설 전문이나 풀이 요약이 아니라 공식 배포 PDF를 찾기 위한 구조화된
위치 안내**다. 각 문항에는 정답 번호, PDF URL, PDF 쪽수, 해설 섹션 제목과 정형 안내문이
있다. 24개 레코드 모두 다음 저작권 처리 방침을 명시한다.

> 해설 전문은 전재하지 않고 정답, 선택지, 해설 섹션 제목과 PDF 위치만 구조화했다.

따라서 이번 생산에서 “공식 해설이 원자료에 없었다”는 설명은 정확하지 않다. 정확한 설명은
“공식 해설 **참조 메타데이터는 있었지만 생산 로더가 이를 버렸고, PDF의 실제 해설 본문은
추출하지 않았다**”이다.

## 2. 전수 감사 결과

| 확인 항목 | 결과 |
|---|---:|
| manifest 문항 | 24 |
| enrichment 파일 존재 | 24/24 |
| product ID 일치 | 24/24 |
| question number 조인 성공 | 24/24 |
| `official_explanation` 존재 | 24/24 |
| `official_explanation.available = true` | 24/24 |
| EBSi 정답 및 해설 PDF URL 존재 | 24/24 |
| PDF 쪽수 존재 | 24/24 |
| 해설 섹션 제목 존재 | 24/24 |
| 안내문의 정답 기호와 `correct_choice` 일치 | 24/24 |
| `correct_choice`가 문제 선택지에 존재 | 24/24 |
| `correct_choice_text`가 문제 선택지 문구와 일치 | 24/24 |
| 해설 본문 또는 문항별 풀이 요약 저장 | **0/24** |
| 원자료 트리 안의 로컬 PDF 파일 | **0개** |
| 생산 당시 `source-input.json`에 해설 필드 전달 | **0/24** |

24개 안내문은 모두 다음 형식의 정형 문구다.

```text
EBSi 해설은 ③을 정답으로 제시한다. 상세 근거와 오답 분석은 PDF 2쪽의 해당 문항 해설에서 확인할 수 있다.
```

즉 `guide_ko`는 풀이 요약으로 간주할 수 없다. 실제 선지별 근거나 추론 연결은 연결된 PDF의
지정 쪽에서 별도로 추출해야 한다.

원자료가 사용하는 `officiality`는 “EBSi 공식 배포 해설”이다. 각 레코드는 이것이 시험 출제
기관이 직접 집필한 공식 해설이라는 뜻은 아니라고 별도로 제한한다.

## 3. 문항별 위치

아래 24개 행은 모두 `위치 안내만 있음 / 본문 없음` 상태다. PDF 링크는 DB에 저장된 값을
그대로 표시했다. 링크의 현재 네트워크 가용성이나 PDF 본문의 의미 정확성은 이번 읽기 전용
감사의 범위에 포함하지 않았다.

| # | 분야 | 문항 | 정답 | PDF 쪽 | 해설 섹션 | 원자료 |
|---:|---|---|---:|---:|---|---|
| 1 | SCIENCE | 나미브 사막 딱정벌레의 수분 획득 원리와 방법 19번 | 4 | 2 | 구체적 상황에 적용하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/6a2294f386fd308968e10e95.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20260604/go1/kor_hsj_V3Q33Y86.pdf) |
| 2 | SCIENCE | 수치예보와 수치예보 모델의 원리 25번 | 4 | 3 | 구체적 상황에 적용하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c0186c78128b2a9bede0c8.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20251014/go2/kor_hsj_FJMJXZZL.pdf) |
| 3 | SCIENCE | 구조물의 하중과 허용응력 30번 | 4 | 3 | 구체적 상황에 적용하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c0994b78128b2a9bee0922.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20241015/go1/kor_hsj_M4258A7J.pdf) |
| 4 | SCIENCE | 볼록 렌즈와 비점 수차 11번 | 3 | 2 | 구체적 상황에 적용하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69fd388386fd308968e0b9f4.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20260507/go3/korA_hsj_4T33HF88_2.pdf) |
| 5 | SCIENCE | 옥신의 기능과 식물 생장 조절 19번 | 4 | 3 | 구체적 상황에 적용하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/6a22950f86fd308968e11320.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20260604/go2/kor_hsj_6P18YL38.pdf) |
| 6 | SCIENCE | 블록체인 기술의 특성 11번 | 3 | 6 | 구체적 사례 적용 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69bcae308095df3b8c53d9a2.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20240904/go3/korA_1_hsj_2A7H1YW8_1.pdf) |
| 7 | SCIENCE | 지진파의 특성과 내진설계 32번 | 5 | 3 | 구체적 상황에 적용하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c0961c78128b2a9bee0717.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20250604/go1/kor_hsj_T89VB6SC.pdf) |
| 8 | SCIENCE | 데이터의 결측치와 이상치 처리 10번 | 5 | 7 | 다른 견해와의 비교 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c006f178128b2a9bedd2f3.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20231116/go3/korA_1_hsj_6C96YO18.pdf) |
| 9 | SOCIAL | 유동성과 금리의 관계 22번 | 2 | 3 | 구체적인 상황에 적용하여 이해한다 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c0ad79fa5063deffe1e90b.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20230323/go1/kor_hsj_3C4D71AA.pdf) |
| 10 | SOCIAL | 준거가격과 거래효용 15번 | 4 | 2 | 자료를 바탕으로 이해하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c09163fa5063deffe1c180.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20251014/go1/kor_hsj_T36295XA.pdf) |
| 11 | SOCIAL | 법 모델과 임대차 보호 제도 8번 | 5 | 5 | 구체적 사례 적용 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69bffa62fa5063deffe19c88.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20250604/go3/korA_1_hsj_P951F819_2.pdf) |
| 12 | SOCIAL | 민법의 대리제도와 표현대리 27번 | 5 | 3 | 세부 정보 파악하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c01c4f78128b2a9bede42e.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20250604/go2/kor_hsj_1D4PC7B2.pdf) |
| 13 | SOCIAL | 형사 절차에서의 강제 처분과 사법적 통제 6번 | 1 | 1 | 글의 핵심 정보를 이해한다 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c28572d58cf540a9bc258f.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20260324/go3/korA_hsj_A8R846U4.pdf) |
| 14 | SOCIAL | 국제 물품 매매 계약의 위험 부담 (CISG) 12번 | 3 | 2 | 글의 핵심 정보를 이해한다 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c379001d65ab18e18f9c12.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20260324/go2/kor_hsj_G41V6CH9.pdf) |
| 15 | SOCIAL | 연합형 게임과 섀플리 값 14번 | 5 | 2 | 세부 내용 이해하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69bbf8ec8937cf14551905a1.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20250430/go3/korA_hsj_84CU269Q.pdf) |
| 16 | SOCIAL | 블라지의 도덕적 자아 모델 23번 | 3 | 3 | 핵심 개념의 세부 내용 파악하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c0d51e78128b2a9befe4b9.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20241015/go1/kor_hsj_M4258A7J.pdf) |
| 17 | HUMANITIES | 의미 내재주의와 의미 외재주의 20번 | 4 | 2 | 세부 내용 파악 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c01e63fa5063deffe1b596.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20240904/go2/kor_hsj_E91AW835.pdf) |
| 18 | HUMANITIES | 음악의 정서 표현과 감정 미학 6번 | 5 | 1 | 글의 세부 내용 파악하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69bffb2978128b2a9bedcf17.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20240711/go3/korA_1_hsj_1P42X9B5.pdf) |
| 19 | HUMANITIES | 신고전주의와 낭만주의 미술 22번 | 3 | 3 | 글의 세부 정보를 파악한다 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c02034fa5063deffe1b915.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20240328/go2/kor_hsj_WJ2WB32J.pdf) |
| 20 | HUMANITIES | 생명 중심 윤리(테일러)와 생태 중심 윤리(레오폴드) 22번 | 2 | 3 | 핵심 정보를 구체적 사례에 적용한다 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c379591d65ab18e18f9d18.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20260324/go2/kor_hsj_G41V6CH9.pdf) |
| 21 | HUMANITIES | 니체의 철학 23번 | 5 | 2 | 세부 정보 추론하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c08e2efa5063deffe1be35.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20230601/go2/kor_hsj_1VD29QM4.pdf) |
| 22 | HUMANITIES | 정약용의 윤리학과 신독 36번 | 2 | 4 | 글의 세부 내용 추론하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c08dfd78128b2a9bedf040.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20230906/go2/kor_hsj_F95996PB.pdf) |
| 23 | HUMANITIES | 샤프츠베리와 듀이의 미적 경험론 16번 | 5 | 2 | 글의 내용 전개 방식 파악하기 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c09494fa5063deffe1d390.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20250903/go1/kor_hsj_YR115187_1.pdf) |
| 24 | HUMANITIES | 의식과 인지 과정에 대한 철학적 논의 15번 | 2 | 10 | 내용의 인과관계 파악 | [record](/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/69c0114f78128b2a9bedd8fc.json) · [PDF](https://wdown.ebsi.co.kr/W61001/01exam/20230601/go3/korA_hsj_92BU14Z2.pdf) |

24문항은 22개의 PDF를 참조한다. 같은 시험지에 속한 3번·16번, 14번·20번이 각각 PDF를
공유한다.

## 4. 생산 입력에서 사라진 지점

누락은 네 단계로 재현된다.

```text
enrichment JSON
  └─ source + official_explanation 존재
      ↓ EnrichmentSchema 파싱
correct_choice + correct_choice_text만 보존
      ↓ loadSource
answerKey만 ProblemGoldGenerationSource에 전달
      ↓ 생성 프롬프트
“공식 해설은 입력되지 않았다”고 선언
```

구체적으로 다음 계약이 원인이다.

1. `run-prospective-gold-production.ts`의 `EnrichmentSchema`는 문항에서
   `question_number`, `correct_choice`, `correct_choice_text`만 선언한다. Zod 파싱 결과에서
   `official_explanation`은 제거된다.
2. 같은 파일의 `loadSource`는 enrichment에서 `answerKey`만 반환한다.
3. `ProblemGoldGenerationSource` 인터페이스에도 공식 해설 참조 필드가 없다.
4. `gold-generation-runtime.ts`는 생성 계약에 “공식 해설은 입력되지 않았다”고 명시한다.
5. 실제 24개 생산 산출물의 `source-input.json`에도 `official_explanation`, PDF 쪽수, 섹션,
   해설 URL이 한 건도 없다.

따라서 원자료 선택이나 문항 번호 조인의 문제가 아니다. manifest의 `enrichmentFile`은 올바른
파일을 가리키고, 원천 해시도 그 파일 전체를 포함한다. **읽기는 했지만 파싱·입력 계약에서
체계적으로 제외한 것**이다.

## 5. 기존 A→B1→B2→B3→C 구조에 대한 영향

현재 enrichment 데이터만 그대로 넣어서는 A `ExplanationAudit`을 제대로 실행할 수 없다.
기존 A단계의 `OfficialExplanationReference`는 `text`를 필수로 요구하고, 감사 claim의
`sourceText`가 그 본문에 실제로 포함되는지도 검사한다. 위치 안내문만 `text`로 넘기면 A는
정답 번호와 “PDF에서 확인”이라는 메타 문구만 분해하게 되어 풀이 감사 기능을 수행하지
못한다.

24문항을 기존 전체 파이프라인으로 처리하려면 생성 전에 다음 입력 준비 단계가 필요하다.

```text
enrichment 참조 확인
→ PDF URL·쪽수로 해당 문항 해설 본문 추출
→ 문항 번호/섹션 경계 및 정답 번호 대조
→ OfficialExplanationReference(text 포함) 생성
→ A → B1 → B2 → B3 → C → 품질 게이트
```

이때 `guide_ko`를 해설 전문처럼 승격하면 안 된다. PDF 본문 추출 실패, 스캔/OCR 오류,
표·그림에 의존하는 해설은 사람 검토로 보내야 한다.

반면 공식 해설 본문을 아직 확보하지 않은 상태에서도 지문·문제·그림·정답을 이용한 독립 C
의미 감사 자체는 설계할 수 있다. 다만 그것은 기존의 **해설 교차 검토형 C**와 다른
`source-only C` 모드이며, A단계를 수행한 것으로 표시해서는 안 된다.

## 6. 별도 표본 파일

원자료 루트에는 문항별 해설 요약을 실제로 담은
`69bbef9a8937cf145518cb13_answers_sample.json` 파일이 한 개 있다. 이것은 “법 해석과 보증
계약”의 6문항을 담은 `answer-explanation-sample-v1` 프로토타입이며, 이번 24개 product에는
포함되지 않는다. 따라서 이 파일의 존재를 24문항에 해설 요약이 저장되어 있다는 근거로
사용할 수 없다.

## 7. 감사 범위와 후속 판단

이번에는 승인된 범위대로 원자료와 현재 입력 경로만 읽기 전용으로 감사했다. 기존 골드,
후보 골드, 사람 검수 상태 및 생산 코드는 변경하지 않았고 PDF 다운로드, 본문 추출, 에이전트
재실행도 하지 않았다.

후속 생산을 재개하기 전에 먼저 22개 PDF에서 24개 문항의 실제 해설 본문을 확보하고, 그
추출물이 A단계 입력 계약을 만족하는지 별도 검증해야 한다. 그 결과를 확인한 뒤에야 24개를
전체 파이프라인으로 다시 생성할지, 기존 후보를 폐기하고 새 실험으로 분리할지 결정할 수
있다.
