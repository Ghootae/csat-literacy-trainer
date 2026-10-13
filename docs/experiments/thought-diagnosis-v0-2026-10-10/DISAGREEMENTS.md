# 독립 라벨 불일치

## I1

학생 풀이: 실명 없이도 법 제정이 가능하다는 것을 근거로 소수파는 실명 확인을 주장할 수 없음.

비교 칸: errorTags

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "ERROR" | "ERROR" |
| firstFailedStep | "S5_JUDGE" | "S5_JUDGE" |
| S1_STEM | "PASS" | "PASS" |
| S2_CHOICE | "PASS" | "PASS" |
| S3_LOCATE | "PASS" | "PASS" |
| S4_INTERPRET | "PASS" | "PASS" |
| S5_JUDGE | "FAIL" | "FAIL" |
| errors | [{"tag":"DIRECTION","step":"S5_JUDGE","studentQuote":"실명 없이도 법 제정이 가능하다는 것을 근거로 소수파는 실명 확인을 주장할 수 없음."}] | [{"tag":"MAPPING","step":"S5_JUDGE","studentQuote":"실명 없이도 법 제정이 가능하다는 것을 근거로 소수파는 실명 확인을 주장할 수 없음"}] |
| note | "여론 왜곡 사례를 소수 의견을 반박하는 근거로 연결했다. 첫 실패는 원문 사실 자체보다 대조 관계에 있다." | "법 제정 사례와 소수 의견의 관계를 잘못 연결. 원문 사실 진술 자체의 오류는 없음" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## I3

학생 풀이: 완전경쟁시장에서는 경제 주체가 완전한 거래 정보를 갖는다고 가정해요.

비교 칸: steps.S4_INTERPRET

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "INSUFFICIENT" | "INSUFFICIENT" |
| firstFailedStep | null | null |
| S1_STEM | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S2_CHOICE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S3_LOCATE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S4_INTERPRET | "PASS" | "NOT_OBSERVED" |
| S5_JUDGE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| errors | [] | [] |
| note | "참인 일반 사실만 있으며 선택 선지의 판단 연결은 드러나지 않는다." | "선지와 무관한 참인 문장" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## I6

학생 풀이: 헌법 재판소의 소수 의견이 실명 확인을 안 한 언론사에 대한 제재 규정을 위헌으로 결정했으니, 그 규정에 따라 B를 제재할 수는 없어요. 그래서 5번이 틀렸어요.

비교 칸: steps.S5_JUDGE

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "ERROR" | "ERROR" |
| firstFailedStep | "S4_INTERPRET" | "S4_INTERPRET" |
| S1_STEM | "PASS" | "PASS" |
| S2_CHOICE | "PASS" | "PASS" |
| S3_LOCATE | "PASS" | "PASS" |
| S4_INTERPRET | "FAIL" | "FAIL" |
| S5_JUDGE | "FAIL" | "PASS" |
| errors | [{"tag":"ATTRIBUTION","step":"S4_INTERPRET","studentQuote":"헌법 재판소의 소수 의견이 실명 확인을 안 한 언론사에 대한 제재 규정을 위헌으로 결정했으니"}] | [{"tag":"ATTRIBUTION","step":"S4_INTERPRET","studentQuote":"헌법 재판소의 소수 의견이 실명 확인을 안 한 언론사에 대한 제재 규정을 위헌으로 결정했으니"}] |
| note | "위헌 결정을 소수 의견에 귀속하여 제재 불가의 근거로 삼았다." | "판단 경로는 맞고 귀속만 오류" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## C1

학생 풀이: 갑이 출연한 부동산은 회사가 아니라 여전히 갑 개인의 소유예요. 그리고 대표 이사에게는 정관이나 법령의 자산 운용 절차가 아예 적용되지 않아요. 그러니 기부할 때 절차를 안 거쳤다고 갑에게 법적 책임이 생긴다는 5번은 틀렸어요.

비교 칸: steps.S5_JUDGE, errorTags

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "ERROR" | "ERROR" |
| firstFailedStep | "S4_INTERPRET" | "S4_INTERPRET" |
| S1_STEM | "PASS" | "PASS" |
| S2_CHOICE | "PASS" | "PASS" |
| S3_LOCATE | "PASS" | "PASS" |
| S4_INTERPRET | "FAIL" | "FAIL" |
| S5_JUDGE | "FAIL" | "PASS" |
| errors | [{"tag":"ATTRIBUTION","step":"S4_INTERPRET","studentQuote":"갑이 출연한 부동산은 회사가 아니라 여전히 갑 개인의 소유예요."},{"tag":"SCOPE","step":"S4_INTERPRET","studentQuote":"대표 이사에게는 정관이나 법령의 자산 운용 절차가 아예 적용되지 않아요."}] | [{"tag":"ATTRIBUTION","step":"S4_INTERPRET","studentQuote":"갑이 출연한 부동산은 회사가 아니라 여전히 갑 개인의 소유예요"},{"tag":"CONDITION","step":"S4_INTERPRET","studentQuote":"대표 이사에게는 정관이나 법령의 자산 운용 절차가 아예 적용되지 않아요"}] |
| note | "소유권 귀속과 절차 적용의 전면 부정을 독립 오류 두 개로 기록했다. 절차 부정은 SCOPE와 CONDITION 사이에서 SCOPE로 판정했다." | "독립 오류 2개" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## C2

학생 풀이: 자본 잉여금도 배당금으로 지급할 수 있으니 이익 잉여금이 모자라도 배당 재원으로 쓰면 돼요. 이익 잉여금 부족 때문에 배당을 보류했다는 1번은 틀려요.

비교 칸: steps.S5_JUDGE

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "ERROR" | "ERROR" |
| firstFailedStep | "S4_INTERPRET" | "S4_INTERPRET" |
| S1_STEM | "PASS" | "PASS" |
| S2_CHOICE | "PASS" | "PASS" |
| S3_LOCATE | "PASS" | "PASS" |
| S4_INTERPRET | "FAIL" | "FAIL" |
| S5_JUDGE | "FAIL" | "PASS" |
| errors | [{"tag":"MISREAD_FACT","step":"S4_INTERPRET","studentQuote":"자본 잉여금도 배당금으로 지급할 수 있으니"}] | [{"tag":"MISREAD_FACT","step":"S4_INTERPRET","studentQuote":"자본 잉여금도 배당금으로 지급할 수 있으니"}] |
| note | "배당 불가능한 재원을 배당 가능하다고 읽어 보류 이유를 부정했다." | "배당 가능 여부를 원문과 반대로" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## C4

학생 풀이: 법인은 자신의 이름으로 권리와 의무의 주체가 돼요.

비교 칸: steps.S3_LOCATE, steps.S4_INTERPRET

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "INSUFFICIENT" | "INSUFFICIENT" |
| firstFailedStep | null | null |
| S1_STEM | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S2_CHOICE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S3_LOCATE | "NOT_OBSERVED" | "PASS" |
| S4_INTERPRET | "PASS" | "NOT_OBSERVED" |
| S5_JUDGE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| errors | [] | [] |
| note | "법인의 일반 지위만 말하며 기부 절차나 책임을 판단하지 않았다." | "관련 사실이나 선지 판단 연결 없음" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## C6

학생 풀이: 자본 잉여금은 배당할 수 없어요. 그런데 배당할 수 있다는 것 같기도 해요. 이익 잉여금이랑 어떤 관계인지는 모르겠어요. 그냥 1번을 찍었어요.

비교 칸: firstFailedStep, steps.S3_LOCATE, steps.S5_JUDGE

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "SELF_CONTRADICTION" | "SELF_CONTRADICTION" |
| firstFailedStep | "S5_JUDGE" | null |
| S1_STEM | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S2_CHOICE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S3_LOCATE | "PASS" | "NOT_OBSERVED" |
| S4_INTERPRET | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S5_JUDGE | "FAIL" | "NOT_OBSERVED" |
| errors | [] | [] |
| note | "배당 가능과 불가능을 함께 말하여 근거 해석을 확정하지 않았다. 연결을 모른다고 명시한 S5는 FAIL이다." | "상충 진술 + 찍음" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## D1

학생 풀이: 레보도파는 도파민과 같은 물질이니까 먹어도 혈액-뇌 장벽을 통과하지 못해요. 따라서 레보도파가 뇌로 진입할 수 있다는 1번은 틀렸어요.

비교 칸: steps.S5_JUDGE

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "ERROR" | "ERROR" |
| firstFailedStep | "S4_INTERPRET" | "S4_INTERPRET" |
| S1_STEM | "PASS" | "PASS" |
| S2_CHOICE | "PASS" | "PASS" |
| S3_LOCATE | "PASS" | "PASS" |
| S4_INTERPRET | "FAIL" | "FAIL" |
| S5_JUDGE | "FAIL" | "PASS" |
| errors | [{"tag":"MISREAD_FACT","step":"S4_INTERPRET","studentQuote":"레보도파는 도파민과 같은 물질이니까 먹어도 혈액-뇌 장벽을 통과하지 못해요."}] | [{"tag":"MISREAD_FACT","step":"S4_INTERPRET","studentQuote":"레보도파는 도파민과 같은 물질이니까 먹어도 혈액-뇌 장벽을 통과하지 못해요"}] |
| note | "동일시와 장벽 통과 부정은 하나의 연결된 오독으로 분절했다. 독립 오류 수 경계가 있다." | "동일시에서 장벽 결론까지 한 오류로 봄" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## D5

학생 풀이: D1은 흥분성이고 D2는 억제성 수용체예요.

비교 칸: steps.S4_INTERPRET

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "INSUFFICIENT" | "INSUFFICIENT" |
| firstFailedStep | null | null |
| S1_STEM | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S2_CHOICE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S3_LOCATE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S4_INTERPRET | "PASS" | "NOT_OBSERVED" |
| S5_JUDGE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| errors | [] | [] |
| note | "수용체의 성질만 말하여 프라미펙솔의 합성 영향 판단은 드러나지 않는다." | "선지와 무관한 참인 사실" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## D6

학생 풀이: 카르비도파는 뇌에 못 가니까요.

비교 칸: steps.S1_STEM

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "NONE" | "NONE" |
| firstFailedStep | null | null |
| S1_STEM | "NOT_OBSERVED" | "PASS" |
| S2_CHOICE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S3_LOCATE | "PASS" | "PASS" |
| S4_INTERPRET | "PASS" | "PASS" |
| S5_JUDGE | "PASS" | "PASS" |
| errors | [] | [] |
| note | "뇌에 못 간다는 근거는 흑질 작용을 배제하는 연결이다. 선지 재진술과 발문 방향의 명시 증거는 없어 S1·S2를 추정하지 않았다." | "짧지만 관계만으로 충분(D-0085)" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## S2

학생 풀이: 오네소르게 수가 너무 작으면 잉크가 노즐에서 나오지 못하니까 첨가제를 넣어 그 수를 키워야 다시 나와요. 그래서 더 커졌다는 2번이 맞아요.

비교 칸: steps.S5_JUDGE

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "ERROR" | "ERROR" |
| firstFailedStep | "S4_INTERPRET" | "S4_INTERPRET" |
| S1_STEM | "PASS" | "PASS" |
| S2_CHOICE | "PASS" | "PASS" |
| S3_LOCATE | "PASS" | "PASS" |
| S4_INTERPRET | "FAIL" | "FAIL" |
| S5_JUDGE | "FAIL" | "PASS" |
| errors | [{"tag":"DIRECTION","step":"S4_INTERPRET","studentQuote":"오네소르게 수가 너무 작으면 잉크가 노즐에서 나오지 못하니까 첨가제를 넣어 그 수를 키워야 다시 나와요."}] | [{"tag":"DIRECTION","step":"S4_INTERPRET","studentQuote":"오네소르게 수가 너무 작으면 잉크가 노즐에서 나오지 못하니까"}] |
| note | "출력 불가 조건과 조절 방향을 뒤집은 하나의 연결 오류로 기록했다." | "조건 방향 역전" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## S4

학생 풀이: 오네소르게 수는 점도만으로 결정되고 밀도나 노즐 지름, 표면 장력은 영향을 주지 않아요. 점도가 그대로라면 다른 건 바꿔도 그 수가 안 바뀌니까 3번이 맞아요.

비교 칸: steps.S5_JUDGE

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "ERROR" | "ERROR" |
| firstFailedStep | "S4_INTERPRET" | "S4_INTERPRET" |
| S1_STEM | "PASS" | "PASS" |
| S2_CHOICE | "PASS" | "PASS" |
| S3_LOCATE | "PASS" | "PASS" |
| S4_INTERPRET | "FAIL" | "FAIL" |
| S5_JUDGE | "FAIL" | "PASS" |
| errors | [{"tag":"SCOPE","step":"S4_INTERPRET","studentQuote":"오네소르게 수는 점도만으로 결정되고 밀도나 노즐 지름, 표면 장력은 영향을 주지 않아요."}] | [{"tag":"SCOPE","step":"S4_INTERPRET","studentQuote":"오네소르게 수는 점도만으로 결정되고 밀도나 노즐 지름, 표면 장력은 영향을 주지 않아요"}] |
| note | "영향 변수를 점도로 축소하여 불변을 잘못 일반화했다." | "관련 변수 범위 축소" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## S5

학생 풀이: 표면 장력 때문에 물방울이 구의 형태가 돼요.

비교 칸: steps.S4_INTERPRET

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "INSUFFICIENT" | "INSUFFICIENT" |
| firstFailedStep | null | null |
| S1_STEM | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S2_CHOICE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S3_LOCATE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S4_INTERPRET | "PASS" | "NOT_OBSERVED" |
| S5_JUDGE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| errors | [] | [] |
| note | "구형 물방울의 원인만 말하며 파란 잉크의 조건과 대조하지 않았다." | "" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## M2

학생 풀이: pH가 높아지면 수소 이온 농도가 높아져서 이온화 지질이 양전하를 띠게 돼요. 그러니까 소수성이 약해진다는 5번은 틀렸어요.

비교 칸: steps.S5_JUDGE

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "ERROR" | "ERROR" |
| firstFailedStep | "S4_INTERPRET" | "S4_INTERPRET" |
| S1_STEM | "PASS" | "PASS" |
| S2_CHOICE | "PASS" | "PASS" |
| S3_LOCATE | "PASS" | "PASS" |
| S4_INTERPRET | "FAIL" | "FAIL" |
| S5_JUDGE | "FAIL" | "PASS" |
| errors | [{"tag":"DIRECTION","step":"S4_INTERPRET","studentQuote":"pH가 높아지면 수소 이온 농도가 높아져서 이온화 지질이 양전하를 띠게 돼요."}] | [{"tag":"DIRECTION","step":"S4_INTERPRET","studentQuote":"pH가 높아지면 수소 이온 농도가 높아져서"}] |
| note | "pH에서 수소 이온 농도·전하로 이어지는 역전을 연결 오류 하나로 기록했다." | "" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## M4

학생 풀이: 이온화 지질은 pH가 높을 때 양전하를 띠니까, 산성 용액과 섞이면 양전하를 띤다는 3번이 적절하지 않아요.

비교 칸: steps.S5_JUDGE

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "ERROR" | "ERROR" |
| firstFailedStep | "S4_INTERPRET" | "S4_INTERPRET" |
| S1_STEM | "PASS" | "PASS" |
| S2_CHOICE | "PASS" | "PASS" |
| S3_LOCATE | "PASS" | "PASS" |
| S4_INTERPRET | "FAIL" | "FAIL" |
| S5_JUDGE | "FAIL" | "PASS" |
| errors | [{"tag":"DIRECTION","step":"S4_INTERPRET","studentQuote":"이온화 지질은 pH가 높을 때 양전하를 띠니까"}] | [{"tag":"DIRECTION","step":"S4_INTERPRET","studentQuote":"이온화 지질은 pH가 높을 때 양전하를 띠니까"}] |
| note | "높은 pH와 양전하의 관계를 뒤집어 산성 혼합 선지를 부정했다." | "" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

## M5

학생 풀이: 이온화 지질은 용액의 pH에 따라 양이온성이 달라져요.

비교 칸: steps.S4_INTERPRET

| 칸 | CODEX | CLAUDE |
|---|---|---|
| outcomeType | "INSUFFICIENT" | "INSUFFICIENT" |
| firstFailedStep | null | null |
| S1_STEM | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S2_CHOICE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| S3_LOCATE | "PASS" | "PASS" |
| S4_INTERPRET | "PASS" | "NOT_OBSERVED" |
| S5_JUDGE | "NOT_OBSERVED" | "NOT_OBSERVED" |
| errors | [] | [] |
| note | "판단에 관련된 pH 근거는 찾았으나 소수성과 크기를 주장하는 선지와 연결하지 않았다." | "관련 사실이나 연결 없음" |

판정: CODEX | CLAUDE | 직접 수정

사용자 판정 내용: 

