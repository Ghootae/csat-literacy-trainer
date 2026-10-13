# 사례별 정답 라벨과 모델 출력

## I1

문항: information-asymmetry-free-marketplace-q13

학생 선택: C4

학생 풀이: 실명 없이도 법 제정이 가능하다는 것을 근거로 소수파는 실명 확인을 주장할 수 없음.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | PASS | PASS | PASS |
| S2_CHOICE | PASS | FAIL | FAIL | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | NOT_OBSERVED | PASS | NOT_OBSERVED | PASS | PASS | PASS |
| S4_INTERPRET | PASS | NOT_OBSERVED | FAIL | FAIL | PASS | PASS | FAIL |
| S5_JUDGE | FAIL | NOT_OBSERVED | FAIL | PASS | FAIL | FAIL | PASS |
| firstFailedStep | S5_JUDGE | S2_CHOICE | S2_CHOICE | S4_INTERPRET | S5_JUDGE | S5_JUDGE | S4_INTERPRET |
| errors | MAPPING / S5_JUDGE / “실명 없이도 법 제정이 가능하다는 것을 근거로 소수파는 실명 확인을 주장할 수 없음” | MAPPING / S2_CHOICE / “소수파는 실명 확인을 주장할 수 없음.” | REFERENT / S2_CHOICE / “소수파는 실명 확인을 주장할 수 없음.”<br>ATTRIBUTION / S4_INTERPRET / “소수파는 실명 확인을 주장할 수 없음.” | ATTRIBUTION / S4_INTERPRET / “소수파는 실명 확인을 주장할 수 없음” | DIRECTION / S5_JUDGE / “실명 없이도 법 제정이 가능하다는 것을 근거로 소수파는 실명 확인을 주장할 수 없음.” | MAPPING / S5_JUDGE / “실명 없이도 법 제정이 가능하다는 것을 근거로 소수파는 실명 확인을 주장할 수 없음.” | MAPPING / S4_INTERPRET / “실명 없이도 법 제정이 가능하다는 것을 근거로 소수파는 실명 확인을 주장할 수 없음.” |
| note | 법 제정 사례와 소수 의견의 관계를 잘못 연결. 원문 사실 진술 자체의 오류는 없음 | C4는 소수 의견이 실명 확인을 주장하는지가 아니라, 반복 게시가 비판론의 주장에 근거가 될 수 있는지를 묻는다. | C4는 게시자 이름을 달리한 게시가 허위·왜곡 정보에 관한 소수 의견을 뒷받침할 수 있다는 내용인데, 학생은 이를 소수 의견이 실명 확인을 주장하는지의 문제로 바꾸어 판단했다. | 소수 의견은 실명 확인을 주장하는 것이 아니라 허위·왜곡 정보가 자율적으로 교정되기 어렵다는 입장이므로, 이를 실명 확인 주장으로 돌린 해석이 틀렸다. | 이름을 달리한 게시가 법 제정으로 이어진다는 조건은 포착했지만, 이를 소수 의견을 뒷받침할 수 없는 이유로 잘못 연결했다. 해당 사례는 특정인이 반복 게시한 의견이 시민의 진정한 의견으로 오인되어 의사 결정이 왜곡될 수 있다는 소수 의견의 취지를 뒷받침한다. | 실명 없이 게시한 글이 법 제정으로 이어지는 상황은 파악했으나, 이를 소수 의견의 반대 근거로 잘못 연결했다. 동일인이 이름을 달리해 올린 의견이 정책 결정에 영향을 미치는 사례는 민주주의 의사 결정의 왜곡을 우려하는 소수 의견을 뒷받침할 수 있다. | 여러 이름으로 반복 게시한 의견이 법 제정으로 이어지는 사례를 실명 확인의 불필요성을 보여 주는 사례로 잘못 대응했다. 이는 오히려 특정인의 의견이 시민들의 의견으로 오인되어 의사 결정이 왜곡될 수 있다는 소수 의견을 뒷받침한다. 잘못 해석한 전제에서 ④를 부적절하다고 판단하는 연결은 드러난다. |

## I2

문항: information-asymmetry-free-marketplace-q13

학생 선택: C4

학생 풀이: 한 사람이 이름을 바꿔 올린 글이 여러 시민의 의견으로 오인되어 법 제정으로 이어진 거예요. 소수 의견이 걱정한 여론 왜곡 사례이므로 소수 의견을 뒷받침한다는 4번은 맞는 설명입니다.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S5_JUDGE | PASS | PASS | FAIL | PASS | PASS | PASS | PASS |
| firstFailedStep | S1_STEM | S1_STEM | S1_STEM | S1_STEM | S1_STEM | S1_STEM | S1_STEM |
| errors | POLARITY / S1_STEM / “소수 의견을 뒷받침한다는 4번은 맞는 설명입니다” | POLARITY / S1_STEM / “4번은 맞는 설명입니다.” | POLARITY / S1_STEM / “소수 의견을 뒷받침한다는 4번은 맞는 설명입니다.” | POLARITY / S1_STEM / “4번은 맞는 설명입니다.” | POLARITY / S1_STEM / “소수 의견이 걱정한 여론 왜곡 사례이므로 소수 의견을 뒷받침한다는 4번은 맞는 설명입니다.” | POLARITY / S1_STEM / “소수 의견이 걱정한 여론 왜곡 사례이므로 소수 의견을 뒷받침한다는 4번은 맞는 설명입니다.” | POLARITY / S1_STEM / “소수 의견이 걱정한 여론 왜곡 사례이므로 소수 의견을 뒷받침한다는 4번은 맞는 설명입니다.” |
| note | 내용 판단은 맞고 부정 발문에서 적절한 선지를 선택 | 소수 의견을 뒷받침한다는 C4의 내용 판단은 타당하지만, ‘적절하지 않은 것’을 고르라는 발문의 방향과 달리 맞는 설명인 C4를 선택했다. | C4가 소수 의견을 뒷받침한다는 내용은 맞게 판단했지만, ‘적절하지 않은 것’을 고르는 발문의 방향을 놓쳤습니다. | C4가 소수 의견을 뒷받침한다고 판단한 근거는 타당하지만, 발문은 적절하지 않은 내용을 고르는 것이므로 선택 방향이 발문과 어긋났습니다. | 여론 왜곡 사례를 소수 의견의 취지와 연결해 ④를 적절한 설명으로 판단했으나, 적절하지 않은 것을 고르는 발문에서 ④를 선택했다. | 여러 이름으로 게시한 글이 시민들의 의견으로 오인되어 법 제정으로 이어지는 사례를 소수 의견의 근거로 정확히 연결했지만, 적절하지 않은 것을 고르는 발문에서 맞다고 판단한 ④를 선택했다. | 여론 왜곡 사례를 소수 의견의 근거로 연결하여 ④가 적절하다고 정확히 판단했지만, 적절하지 않은 선지를 고르는 발문에서 ④를 선택했다. |

## I3

문항: information-asymmetry-free-marketplace-q13

학생 선택: C4

학생 풀이: 완전경쟁시장에서는 경제 주체가 완전한 거래 정보를 갖는다고 가정해요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S4_INTERPRET | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 선지와 무관한 참인 문장 | 완전경쟁시장에 관한 진술은 맞지만 선택한 선지의 판단 근거와 연결되지 않는다. | 완전경쟁시장에 관한 사실을 말했지만, 선택한 선지의 판단 근거로 연결하지 않았다. | 완전경쟁시장에 대한 언급은 있지만 선택지의 주장과 연결된 판단 근거는 제시하지 않았다. | 완전경쟁시장의 가정을 정확히 진술했지만, 이는 ④의 판단에 필요한 근거가 아니며 소수 의견과 사례를 연결하는 설명도 드러나지 않는다. | 완전경쟁시장의 정보 가정은 지문에 부합하지만, 선택한 ④의 사례와 헌법 재판소 소수 의견을 연결하는 근거가 아니므로 선지 판단 과정은 드러나지 않는다. | 완전경쟁시장의 정보 가정을 정확히 진술했지만, 이는 ④의 소수 의견과 사례의 관계를 판단하는 데 필요한 근거가 아니며 선택 판단과의 연결도 드러나지 않는다. |

## I4

문항: information-asymmetry-free-marketplace-q13

학생 선택: C5

학생 풀이: 헌법 재판소 다수 의견은 실명 확인을 하지 않은 인터넷 언론사를 제재하는 규정을 위헌으로 결정했어요. 그래서 B가 그 규정으로 제재받는다는 5번은 틀렸어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | NONE | NONE | NONE | NONE | NONE | NONE | NONE |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 위헌 결정→제재 불가 연결 충분 | 다수 의견이 실명 확인 의무 위반 언론사를 제재하는 규정을 위헌으로 결정했다는 근거를 들어 ⑤가 부적절함을 정확히 판단했다. | 다수 의견이 실명 확인 의무 위반 언론사를 제재하는 규정을 위헌으로 결정했으므로, 플랫폼 B가 그 규정으로 제재받는다는 ⑤의 내용이 틀렸다고 올바르게 판단했다. | 다수 의견이 실명 확인 의무 위반 규정을 위헌으로 결정했다는 근거를 들어, 플랫폼 B가 제재받는다는 ⑤의 내용이 부적절하다고 판단했다. | 실명 확인 의무 위반 언론사를 제재하는 규정이 위헌이라는 다수 의견을 정확히 이해하고, 그 규정으로 플랫폼 B가 제재받는다는 ⑤를 적절하지 않은 선지로 판정했다. | 실명 확인 의무 위반 언론사를 제재하는 규정이 위헌이라는 다수 의견을 정확히 이해하고, 그 규정으로 B가 제재받는다는 ⑤를 부적절한 선지로 판단했다. | 실명 확인 의무 위반 언론사를 제재하는 규정의 위헌 결정을 정확히 이해하고, 그 규정으로 플랫폼 B가 제재받는다는 ⑤를 부적절한 선지로 판단했다. |

## I5

문항: information-asymmetry-free-marketplace-q13

학생 선택: C5

학생 풀이: 소수 의견도 다수 의견과 똑같이 그 규정이 위헌이라고 결정했어요. 그런데 이게 5번과 어떻게 연결되는지는 모르겠고 그냥 찍었어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | true | true | true | true | true | true | true |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | ATTRIBUTION / S4_INTERPRET / “소수 의견도 다수 의견과 똑같이 그 규정이 위헌이라고 결정했어요” | ATTRIBUTION / S4_INTERPRET / “소수 의견도 다수 의견과 똑같이 그 규정이 위헌이라고 결정했어요.” | ATTRIBUTION / S4_INTERPRET / “소수 의견도 다수 의견과 똑같이 그 규정이 위헌이라고 결정했어요.” | ATTRIBUTION / S4_INTERPRET / “소수 의견도 다수 의견과 똑같이 그 규정이 위헌이라고 결정했어요.” | ATTRIBUTION / S4_INTERPRET / “소수 의견도 다수 의견과 똑같이 그 규정이 위헌이라고 결정했어요.” | ATTRIBUTION / S4_INTERPRET / “소수 의견도 다수 의견과 똑같이 그 규정이 위헌이라고 결정했어요.” | ATTRIBUTION / S4_INTERPRET / “소수 의견도 다수 의견과 똑같이 그 규정이 위헌이라고 결정했어요.” |
| note | 귀속 오류 + 연결 모름 명시 | 소수 의견의 입장을 다수 의견과 동일하게 잘못 설명했으며, 선지 판단은 모르겠다고 했습니다. | 다수 의견과 소수 의견의 입장을 동일하게 이해했으며, 선지와의 연결은 모르겠다고 밝혀 판정 단계는 관찰되지 않는다. | 소수 의견이 다수 의견과 똑같이 위헌이라고 결정했다는 잘못된 귀속이 드러났으며, ⑤와의 연결은 모른다고 밝혀 판정할 수 없습니다. | 실명 확인 규정의 위헌 여부라는 필요한 근거는 언급했으나, 다수 의견의 위헌 결정을 소수 의견에도 잘못 귀속했다. 선지와의 연결은 모르겠다고 했으므로 대조·판정은 관찰되지 않는다. | 실명 확인 규정에 관한 헌법 재판소 의견을 언급했지만, 다수 의견의 위헌 결정을 소수 의견에도 잘못 귀속했다. 선지와의 연결은 모르겠다고 명시했으므로 대조·판정 단계는 관찰되지 않는다. | 판단에 필요한 실명확인 사건의 의견을 언급했지만, 다수 의견의 위헌 결정을 소수 의견에도 잘못 귀속했다. 선지와의 연결은 모르겠다고 했으므로 대조·판정은 관찰되지 않는다. |

## I6

문항: information-asymmetry-free-marketplace-q13

학생 선택: C5

학생 풀이: 헌법 재판소의 소수 의견이 실명 확인을 안 한 언론사에 대한 제재 규정을 위헌으로 결정했으니, 그 규정에 따라 B를 제재할 수는 없어요. 그래서 5번이 틀렸어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | ATTRIBUTION / S4_INTERPRET / “헌법 재판소의 소수 의견이 실명 확인을 안 한 언론사에 대한 제재 규정을 위헌으로 결정했으니” | ATTRIBUTION / S4_INTERPRET / “헌법 재판소의 소수 의견이 실명 확인을 안 한 언론사에 대한 제재 규정을 위헌으로 결정했으니” | ATTRIBUTION / S4_INTERPRET / “헌법 재판소의 소수 의견이 실명 확인을 안 한 언론사에 대한 제재 규정을 위헌으로 결정했으니” | ATTRIBUTION / S4_INTERPRET / “헌법 재판소의 소수 의견이 실명 확인을 안 한 언론사에 대한 제재 규정을 위헌으로 결정했으니” | ATTRIBUTION / S4_INTERPRET / “헌법 재판소의 소수 의견이 실명 확인을 안 한 언론사에 대한 제재 규정을 위헌으로 결정했으니” | ATTRIBUTION / S4_INTERPRET / “헌법 재판소의 소수 의견이 실명 확인을 안 한 언론사에 대한 제재 규정을 위헌으로 결정했으니” | ATTRIBUTION / S4_INTERPRET / “헌법 재판소의 소수 의견이 실명 확인을 안 한 언론사에 대한 제재 규정을 위헌으로 결정했으니” |
| note | 판단 경로는 맞고 귀속만 오류 | 제재 규정을 위헌으로 결정한 것은 소수 의견이 아니라 다수 의견이며, 학생은 의견의 주체를 잘못 귀속했다. | 제재 규정이 위헌이라고 결정한 것은 소수 의견이 아니라 다수 의견이며, 학생은 의견의 주체를 잘못 귀속했다. | 실명 확인 규정이 위헌이라고 결정한 것은 다수 의견이며, 이를 소수 의견으로 잘못 귀속했다. 이 전제에서는 5번이 틀렸다는 판정은 일관된다. | 위헌 결정을 소수 의견에 잘못 귀속했다. 다만 위헌인 규정으로 B를 제재할 수 없으므로 ⑤가 부적절하다는 대조·판정은 일관된다. | 위헌 결정을 내린 다수 의견을 소수 의견으로 잘못 귀속했다. 다만 위헌인 규정으로 B를 제재할 수 없다는 근거를 ⑤의 부적절성에 일관되게 연결했다. | 위헌 결정의 주체를 다수 의견이 아닌 소수 의견으로 잘못 귀속했다. 다만 위헌인 규정으로 B를 제재할 수 없다는 근거를 ⑤의 부적절성에 연결한 추론은 일관된다. |

## C1

문항: corporate-law-q13

학생 선택: C5

학생 풀이: 갑이 출연한 부동산은 회사가 아니라 여전히 갑 개인의 소유예요. 그리고 대표 이사에게는 정관이나 법령의 자산 운용 절차가 아예 적용되지 않아요. 그러니 기부할 때 절차를 안 거쳤다고 갑에게 법적 책임이 생긴다는 5번은 틀렸어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | ATTRIBUTION / S4_INTERPRET / “갑이 출연한 부동산은 회사가 아니라 여전히 갑 개인의 소유예요”<br>CONDITION / S4_INTERPRET / “대표 이사에게는 정관이나 법령의 자산 운용 절차가 아예 적용되지 않아요” | MISREAD_FACT / S4_INTERPRET / “갑이 출연한 부동산은 회사가 아니라 여전히 갑 개인의 소유예요.”<br>SCOPE / S4_INTERPRET / “대표 이사에게는 정관이나 법령의 자산 운용 절차가 아예 적용되지 않아요.” | MISREAD_FACT / S4_INTERPRET / “갑이 출연한 부동산은 회사가 아니라 여전히 갑 개인의 소유예요.”<br>SCOPE / S4_INTERPRET / “대표 이사에게는 정관이나 법령의 자산 운용 절차가 아예 적용되지 않아요.” | MISREAD_FACT / S4_INTERPRET / “갑이 출연한 부동산은 회사가 아니라 여전히 갑 개인의 소유예요.”<br>SCOPE / S4_INTERPRET / “대표 이사에게는 정관이나 법령의 자산 운용 절차가 아예 적용되지 않아요.” | ATTRIBUTION / S4_INTERPRET / “갑이 출연한 부동산은 회사가 아니라 여전히 갑 개인의 소유예요.”<br>SCOPE / S4_INTERPRET / “대표 이사에게는 정관이나 법령의 자산 운용 절차가 아예 적용되지 않아요.” | ATTRIBUTION / S4_INTERPRET / “갑이 출연한 부동산은 회사가 아니라 여전히 갑 개인의 소유예요.”<br>SCOPE / S4_INTERPRET / “대표 이사에게는 정관이나 법령의 자산 운용 절차가 아예 적용되지 않아요.” | ATTRIBUTION / S4_INTERPRET / “갑이 출연한 부동산은 회사가 아니라 여전히 갑 개인의 소유예요.”<br>SCOPE / S4_INTERPRET / “그리고 대표 이사에게는 정관이나 법령의 자산 운용 절차가 아예 적용되지 않아요.” |
| note | 독립 오류 2개 | 법인의 자산은 개인의 출자 여부와 무관하게 법인에 귀속되며, 대표 이사도 정관이나 법령에 따른 자산 운용 절차를 따라야 한다. | 선지 5의 주장을 이해하고 틀린 선지로 판단했지만, 출연 재산의 소유권과 대표 이사에게 적용되는 절차를 잘못 해석했습니다. | 부동산이 회사에 기부되면 회사 자산이 되며, 대표 이사도 정관이나 법령에 따른 절차를 따라야 하지만 이를 잘못 이해했습니다. | 선지 판단에 필요한 자산 소유권과 운용 절차를 언급했으나, 법인 소유 자산을 갑 개인에게 귀속시키고 대표 이사를 법적 통제 대상에서 제외했다. 다만 이 잘못된 전제에서 ⑤가 부적절하다는 결론을 도출하는 연결 자체는 일관된다. | 출연한 자산의 소유권은 법인에 귀속되며 대표 이사도 정관이나 법령의 자산 운용 절차를 따라야 한다. 학생은 이 두 근거를 잘못 해석했지만, 자신이 제시한 전제에서 ⑤가 부적절하다는 결론으로 연결하는 추론은 일관된다. | 법인에 귀속되는 출연 재산을 갑 개인 소유로 오인하고, 대표 이사를 자산 운용 절차의 적용 대상에서 제외했다. 다만 이 잘못된 전제에서 ⑤를 부적절하다고 판단하는 연결 자체는 일관된다. |

## C2

문항: corporate-law-q13

학생 선택: C1

학생 풀이: 자본 잉여금도 배당금으로 지급할 수 있으니 이익 잉여금이 모자라도 배당 재원으로 쓰면 돼요. 이익 잉여금 부족 때문에 배당을 보류했다는 1번은 틀려요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | MISREAD_FACT / S4_INTERPRET / “자본 잉여금도 배당금으로 지급할 수 있으니” | MISREAD_FACT / S4_INTERPRET / “자본 잉여금도 배당금으로 지급할 수 있으니 이익 잉여금이 모자라도 배당 재원으로 쓰면 돼요.” | MISREAD_FACT / S4_INTERPRET / “자본 잉여금도 배당금으로 지급할 수 있으니” | MISREAD_FACT / S4_INTERPRET / “자본 잉여금도 배당금으로 지급할 수 있으니” | MISREAD_FACT / S4_INTERPRET / “자본 잉여금도 배당금으로 지급할 수 있으니” | MISREAD_FACT / S4_INTERPRET / “자본 잉여금도 배당금으로 지급할 수 있으니” | MISREAD_FACT / S4_INTERPRET / “자본 잉여금도 배당금으로 지급할 수 있으니” |
| note | 배당 가능 여부를 원문과 반대로 | 자본 잉여금은 배당금으로 지급할 수 없다는 지문 내용을 잘못 이해해 1번을 부적절하다고 판단했다. | 자본 잉여금은 배당금으로 지급될 수 없는데, 지급할 수 있다고 잘못 이해해 1번을 부적절한 선지로 판단했다. | 자본 잉여금은 배당금으로 지급할 수 없다는 지문 내용을 잘못 이해해 1번을 부적절하다고 판단했다. | 배당 재원에 관한 필요한 근거를 언급했지만, 배당금으로 지급할 수 없는 자본 잉여금을 지급 가능한 것으로 오독했다. 다만 그 잘못된 전제에서 1번이 부적절하다고 판단하는 연결은 일관된다. | 배당 재원에 관한 필요한 근거를 언급했지만, 배당금으로 지급할 수 없는 자본 잉여금을 배당에 사용할 수 있다고 오독했다. 다만 그 잘못된 전제에서 1번이 부적절하다고 연결한 추론 자체는 일관된다. | 배당 재원에 관한 필요한 근거를 언급했으나, 배당금으로 지급할 수 없는 자본 잉여금을 지급 가능한 것으로 오독했다. 다만 그 잘못된 전제에서 1번이 부적절하다고 판단한 연결 자체는 일관된다. |

## C3

문항: corporate-law-q13

학생 선택: C2

학생 풀이: 갑의 운용 권한은 재산 출연 때문이 아니라 정관이나 법령에서 부여한 것이므로 2번의 이유가 틀렸어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | NONE | NONE | NONE | NONE | NONE | NONE | NONE |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 잘못된 인과를 직접 반박 | 정관이나 법령에 따른 권한과 개인 재산 출연을 구분해 2번의 이유가 틀렸다고 판단했고, ‘적절하지 않은 것’을 고르는 발문에 맞게 선택했다. | 갑의 자산 운용 권한은 개인 재산 출연이 아니라 정관이나 법령에 따른다는 근거로 ②를 적절하지 않은 선지로 판단했다. | 대표 이사의 운용 권한은 재산 출연이 아니라 정관이나 법령에 의해 부여된다는 근거로 2번의 이유가 부적절하다고 판단했다. | 자산 운용 권한의 근거가 개인의 재산 출연이 아니라 정관이나 법령임을 정확히 파악하고, 이를 ②의 잘못된 이유와 대조하여 부적절한 선지로 선택했다. | 자산 운용 권한의 근거가 개인의 재산 출연이 아니라 정관이나 법령임을 정확히 파악하고, 이를 ②의 잘못된 이유와 대조하여 부적절한 선지로 선택했다. | 자산 운용 권한의 근거가 재산 출연이 아니라 정관이나 법령임을 정확히 설명하고, 이를 선지의 잘못된 이유와 대조하여 부적절한 선지를 선택했다. |

## C4

문항: corporate-law-q13

학생 선택: C5

학생 풀이: 법인은 자신의 이름으로 권리와 의무의 주체가 돼요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | PASS | PASS | NOT_OBSERVED | PASS | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S4_INTERPRET | PASS | PASS | NOT_OBSERVED | PASS | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 관련 사실이나 선지 판단 연결 없음 | 법인이 권리와 의무의 주체라는 사실은 언급했지만, 이를 선택지의 절차 위반과 법적 책임 판단에 연결하지 않았다. | 법인이 자신의 이름으로 권리와 의무의 주체가 된다는 사실만 언급했으며, 이를 선택한 선지의 판단 근거와 연결하지 않았다. | 법인이 권리와 의무의 주체라는 사실은 정확히 제시했지만, 이를 선택한 선지의 판단과 연결하지 않았다. | 법인이 권리와 의무의 주체라는 참인 사실만 제시했다. 절차를 위반한 자산 운용에 법적 책임이 발생할 수 있다는 판단 근거와 연결하지 않아 ⑤를 선택한 논리는 드러나지 않는다. | 법인이 권리와 의무의 주체라는 사실은 맞지만, 정해진 절차를 어긴 자산 운용에 법적 책임이 발생하는지와 연결하지 않아 ⑤의 적절성을 판단한 근거는 드러나지 않는다. | 법인이 권리·의무의 주체라는 참인 사실만 제시했으며, 절차를 거치지 않은 자산 운용의 법적 책임과 연결하지 않아 ⑤의 정오 판단 근거가 드러나지 않는다. |

## C5

문항: corporate-law-q13

학생 선택: C2

학생 풀이: A의 법인격은 구성원 단체가 아니라 갑 개인에게 부여돼요. 그래도 갑의 자산 운용 권한은 재산 출연 때문이 아니라 정관이나 법령에서 받은 거니까, 출연 때문에 권한이 생겼다는 2번은 틀렸어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | ATTRIBUTION / S4_INTERPRET / “A의 법인격은 구성원 단체가 아니라 갑 개인에게 부여돼요” | MISREAD_FACT / S4_INTERPRET / “A의 법인격은 구성원 단체가 아니라 갑 개인에게 부여돼요.” | MISREAD_FACT / S4_INTERPRET / “A의 법인격은 구성원 단체가 아니라 갑 개인에게 부여돼요.” | MISREAD_FACT / S4_INTERPRET / “A의 법인격은 구성원 단체가 아니라 갑 개인에게 부여돼요.” | ATTRIBUTION / S4_INTERPRET / “A의 법인격은 구성원 단체가 아니라 갑 개인에게 부여돼요.” | ATTRIBUTION / S4_INTERPRET / “A의 법인격은 구성원 단체가 아니라 갑 개인에게 부여돼요.” | ATTRIBUTION / S4_INTERPRET / “A의 법인격은 구성원 단체가 아니라 갑 개인에게 부여돼요.” |
| note | 핵심 반박은 맞음 | 선지의 권한 부여 근거는 올바르게 판단했지만, 주식회사의 법인격이 갑 개인에게 부여된다고 잘못 이해했습니다. | 선지 2의 권한 발생 근거를 잘못 읽었다고 판단하고 정답 방향으로 판정했지만, A의 법인격이 갑 개인에게 부여됐다는 사실 오류가 있다. | 선지의 권한 근거를 출연이 아닌 정관이나 법령으로 판단해 선택은 맞았지만, 법인격의 귀속 주체를 갑 개인으로 잘못 이해했습니다. | 법인격의 부여 대상을 갑 개인으로 잘못 이해했지만, 자산 운용 권한은 출연이 아니라 정관이나 법령에서 비롯된다는 근거로 ②의 부적절성을 타당하게 판단했다. | 법인격의 귀속 주체를 갑 개인으로 잘못 해석했다. 다만 자산 운용 권한은 재산 출연이 아니라 정관이나 법령에서 비롯된다는 근거를 정확히 연결하여 ②를 부적절하다고 판정했다. | 법인격의 부여 대상을 갑 개인으로 잘못 이해했지만, 자산 운용 권한이 재산 출연이 아니라 정관이나 법령에서 비롯된다는 근거로 ②의 인과 관계를 반박한 판단은 타당하다. |

## C6

문항: corporate-law-q13

학생 선택: C1

학생 풀이: 자본 잉여금은 배당할 수 없어요. 그런데 배당할 수 있다는 것 같기도 해요. 이익 잉여금이랑 어떤 관계인지는 모르겠어요. 그냥 1번을 찍었어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | UNJUDGEABLE | INSUFFICIENT | UNJUDGEABLE | INSUFFICIENT | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE |
| unjudgeableReason | CONTRADICTORY | null | GUESS_ONLY | null | CONTRADICTORY | CONTRADICTORY | CONTRADICTORY |
| guessed | true | true | true | true | true | true | true |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S4_INTERPRET | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 상충 진술 + 찍음 | 자본 잉여금은 배당할 수 없다는 사실은 말했지만, 이를 1번 선지의 판단과 연결하지 않았고 찍었다고 밝혔다. | 선택 근거를 제시하지 않고 모른다고 한 뒤 1번을 찍었다고 밝혔다. | 자본 잉여금은 배당할 수 없다는 사실은 말했지만 이를 1번 선지의 판단 근거와 연결하지 않았고, 모른 채 찍었다고 밝혔다. | 자본 잉여금의 배당 가능 여부에 관해 상반된 진술을 하여 이해를 확정할 수 없고, 이익 잉여금과 1번 선지의 관계는 모르겠다고 하며 찍었음을 명시했다. | 자본 잉여금의 배당 가능 여부에 대해 상반된 진술을 하여 이해를 확정할 수 없고, 이익 잉여금 부족과 1번 선지의 판단을 연결하지 못한 채 찍었다고 명시했다. | 자본 잉여금의 배당 가능 여부에 대해 상반된 진술을 하여 이해를 확정할 수 없으며, 이익 잉여금 부족과 1번 선지의 정오를 연결한 근거도 없다. 찍었다고 명시했다. |

## D1

문항: dopamine-motor-control-q13

학생 선택: C1

학생 풀이: 레보도파는 도파민과 같은 물질이니까 먹어도 혈액-뇌 장벽을 통과하지 못해요. 따라서 레보도파가 뇌로 진입할 수 있다는 1번은 틀렸어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | MISREAD_FACT / S4_INTERPRET / “레보도파는 도파민과 같은 물질이니까 먹어도 혈액-뇌 장벽을 통과하지 못해요” | MISREAD_FACT / S4_INTERPRET / “레보도파는 도파민과 같은 물질이니까 먹어도 혈액-뇌 장벽을 통과하지 못해요.” | MISREAD_FACT / S4_INTERPRET / “레보도파는 도파민과 같은 물질이니까 먹어도 혈액-뇌 장벽을 통과하지 못해요.” | MISREAD_FACT / S4_INTERPRET / “레보도파는 도파민과 같은 물질이니까 먹어도 혈액-뇌 장벽을 통과하지 못해요.” | MISREAD_FACT / S4_INTERPRET / “레보도파는 도파민과 같은 물질이니까 먹어도 혈액-뇌 장벽을 통과하지 못해요.” | MISREAD_FACT / S4_INTERPRET / “레보도파는 도파민과 같은 물질이니까 먹어도 혈액-뇌 장벽을 통과하지 못해요.” | MISREAD_FACT / S4_INTERPRET / “레보도파는 도파민과 같은 물질이니까 먹어도 혈액-뇌 장벽을 통과하지 못해요.” |
| note | 동일시에서 장벽 결론까지 한 오류로 봄 | 레보도파를 도파민과 같은 물질로 잘못 이해해 혈액-뇌 장벽 통과 여부를 오독했지만, 그 전제에 따라 1번을 부적절한 선지로 판정했다. | 레보도파를 도파민과 같은 물질로 오해해, 레보도파가 혈액-뇌 장벽을 통과할 수 있다는 보기의 내용을 잘못 해석했다. | 레보도파와 도파민을 같은 물질로 보아, 레보도파가 혈액-뇌 장벽을 통과할 수 있다는 내용을 잘못 해석했다. | 혈액-뇌 장벽 통과 여부라는 관련 근거를 찾았으나, 도파민의 전구 물질인 레보도파를 도파민과 동일시했다. 다만 자신이 제시한 전제에서 1번을 부적절하다고 판단하는 연결은 일관된다. | 도파민의 혈액-뇌 장벽 통과 불가라는 관련 근거를 찾았으나, 도파민의 전구 물질인 레보도파를 도파민과 동일시했다. 이 잘못된 전제에서 1번을 부적절하다고 판단하는 연결 자체는 일관된다. | 도파민의 혈액-뇌 장벽 통과 제한이라는 관련 근거는 찾았으나, 레보도파를 도파민과 동일한 물질로 오해했다. 이 잘못된 전제에서 1번을 부적절하다고 판단하는 연결 자체는 일관된다. |

## D2

문항: dopamine-motor-control-q13

학생 선택: C4

학생 풀이: 카르비도파는 혈액-뇌 장벽을 통과해 흑질에서 레보도파가 도파민으로 바뀌는 걸 막아요. 그러면 뇌로 전달되는 레보도파도 줄어들 테니 증가한다는 4번은 틀렸어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | FAIL | FAIL | FAIL | PASS | PASS | PASS | FAIL |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | MISREAD_FACT / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 흑질에서 레보도파가 도파민으로 바뀌는 걸 막아요”<br>DIRECTION / S5_JUDGE / “뇌로 전달되는 레보도파도 줄어들 테니” | MISREAD_FACT / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 흑질에서 레보도파가 도파민으로 바뀌는 걸 막아요.”<br>MULTI_STEP / S5_JUDGE / “그러면 뇌로 전달되는 레보도파도 줄어들 테니” | CONDITION / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 흑질에서 레보도파가 도파민으로 바뀌는 걸 막아요.”<br>MULTI_STEP / S5_JUDGE / “그러면 뇌로 전달되는 레보도파도 줄어들 테니 증가한다는 4번은 틀렸어요.” | MISREAD_FACT / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 흑질에서 레보도파가 도파민으로 바뀌는 걸 막아요.”<br>DIRECTION / S4_INTERPRET / “그러면 뇌로 전달되는 레보도파도 줄어들 테니” | MISREAD_FACT / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 흑질에서 레보도파가 도파민으로 바뀌는 걸 막아요.”<br>DIRECTION / S4_INTERPRET / “그러면 뇌로 전달되는 레보도파도 줄어들 테니” | MISREAD_FACT / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 흑질에서 레보도파가 도파민으로 바뀌는 걸 막아요.”<br>DIRECTION / S4_INTERPRET / “그러면 뇌로 전달되는 레보도파도 줄어들 테니” | MISREAD_FACT / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 흑질에서 레보도파가 도파민으로 바뀌는 걸 막아요.”<br>DIRECTION / S5_JUDGE / “그러면 뇌로 전달되는 레보도파도 줄어들 테니 증가한다는 4번은 틀렸어요.” |
| note | 작용 위치 오류 + 전달량 방향 역전 | 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초 조직에서 작용하며, 말초에서 레보도파의 도파민 전환을 막아 뇌로 전달되는 레보도파의 양을 늘린다. | 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초에서만 작용하는데, 이를 흑질에서 작용한다고 해석했으며 그 전제로 레보도파의 뇌 전달량이 줄어든다고 연결했습니다. | 발문 방향과 선지의 증가 주장은 파악했지만, 카르비도파의 작용 위치와 뇌로 전달되는 레보도파의 양을 잘못 이해했다. | 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초 조직에서 작용하며, 병용 시 뇌로 전달되는 레보도파는 증가한다. 다만 학생이 내세운 감소라는 전제와 선지의 증가를 대조한 판정 자체는 일관된다. | 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초 조직에서만 작용하며, 병용 시 뇌로 전달되는 레보도파는 증가한다. 학생은 이를 잘못 해석했지만, 자신이 내세운 감소라는 전제와 ④의 증가 주장을 대조하는 판단은 일관된다. | 카르비도파의 작용 위치를 말초 조직이 아닌 흑질로 오독했으며, 학생이 제시한 뇌 내 전환 억제라는 전제에서도 뇌로 전달되는 레보도파가 감소한다는 결론은 도출되지 않는다. |

## D3

문항: dopamine-motor-control-q13

학생 선택: C2

학생 풀이: 카르비도파는 혈액-뇌 장벽을 통과하지 못해 말초에서만 작용해요. 그러니 흑질에서 합성된 도파민의 작용 기간을 늘린다는 2번은 틀렸어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | NONE | NONE | NONE | NONE | NONE | NONE | NONE |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note |  | 카르비도파가 말초에서만 작용한다는 근거로 ②의 설명이 부적절하다고 판단했다. | 카르비도파가 혈액-뇌 장벽을 통과하지 못해 말초에서만 작용한다는 근거로 ②가 부적절함을 판단했다. | 카르비도파가 말초에서만 작용하므로 흑질에서 합성된 도파민의 작용 기간을 늘릴 수 없다고 판단해 부적절한 선지를 골랐다. | 카르비도파가 혈액-뇌 장벽을 통과하지 못하고 말초에서만 작용한다는 근거를 정확히 이해하여, 흑질에서 합성된 도파민의 작용 기간을 늘린다는 ②를 부적절한 선지로 판정했다. | 카르비도파가 혈액-뇌 장벽을 통과하지 못하고 말초에서만 작용한다는 근거를 정확히 해석하여, 흑질에서 합성된 도파민의 작용 기간을 늘린다는 ②를 부적절하다고 판단했다. | 카르비도파가 혈액-뇌 장벽을 통과하지 못하고 말초에서만 작용한다는 근거를 정확히 이해하여, 흑질에서 합성된 도파민의 작용 기간을 늘린다는 ②를 부적절하다고 판단했다. |

## D4

문항: dopamine-motor-control-q13

학생 선택: C2

학생 풀이: 카르비도파는 혈액-뇌 장벽을 통과해 뇌에서 도파민 합성을 억제해요. 합성을 막는 것이지 도파민 분해를 막는 건 아니니 작용 기간을 연장한다는 2번은 틀렸어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | MISREAD_FACT / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 뇌에서 도파민 합성을 억제해요” | MISREAD_FACT / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 뇌에서 도파민 합성을 억제해요.” | MISREAD_FACT / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 뇌에서 도파민 합성을 억제해요.” | MISREAD_FACT / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 뇌에서 도파민 합성을 억제해요.” | MISREAD_FACT / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 뇌에서 도파민 합성을 억제해요.” | MISREAD_FACT / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 뇌에서 도파민 합성을 억제해요.” | MISREAD_FACT / S4_INTERPRET / “카르비도파는 혈액-뇌 장벽을 통과해 뇌에서 도파민 합성을 억제해요.” |
| note | 정답 선택, 작용 위치 오류 | 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초 조직에서만 작용하므로, 작용 위치에 대한 해석은 틀렸지만 이를 근거로 ②를 부적절하다고 판단했다. | 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초 조직에서만 작용한다는 보기 내용을 반대로 이해했지만, 그 전제에서는 ②를 틀렸다고 판단하는 연결은 일관된다. | 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초 조직에서만 작용한다는 내용을 잘못 이해했지만, 그 전제에서 선지의 작용 기간 연장 주장을 부정하는 판단은 일관적입니다. | 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초 조직에서만 작용하는데 이를 잘못 해석했다. 다만 합성 억제와 분해 억제를 구별하여 작용 기간 연장 주장을 부정한 대조·판정은 학생이 제시한 전제에서 일관된다. | 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초 조직에서만 작용하는데 이를 잘못 해석했다. 다만 합성 억제와 분해 억제를 구별하여 작용 기간 연장이라는 선지의 주장을 부정한 추론은 학생이 제시한 전제에서 일관된다. | 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초 조직에서만 작용하는데 이를 잘못 해석했다. 다만 합성 억제와 분해 억제를 구분하여 작용 기간 연장 주장을 부정하는 대조·판정은 일관되므로 S5는 PASS이다. |

## D5

문항: dopamine-motor-control-q13

학생 선택: C3

학생 풀이: D1은 흥분성이고 D2는 억제성 수용체예요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S4_INTERPRET | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 선지와 무관한 참인 사실 | D1·D2 수용체의 성질은 언급했지만, 이는 선택한 선지의 판단 근거와 연결되지 않습니다. | D1·D2 수용체에 관한 사실은 말했지만, 선택한 선지의 판단 근거로 연결하지 않았다. | D1·D2 수용체의 성격을 언급했지만, 이 내용은 (다)가 도파민 합성 과정에 영향을 주는지에 대한 판단과 연결되지 않습니다. | D1·D2 수용체의 성질은 맞게 진술했지만, 이를 (다)가 흑질의 도파민 합성 과정에 영향을 주는지에 대한 판단과 연결하지 않았다. | D1·D2 수용체의 성질은 정확히 진술했지만, 이를 (다)가 흑질의 도파민 합성 과정에 영향을 주는지와 연결하지 않아 ③의 정오 판단 근거가 드러나지 않는다. | 수용체의 흥분성·억제성에 대한 진술은 참이지만, (다)가 흑질의 도파민 합성 과정에 영향을 주는지에 대한 선지 판단과 연결되지 않는다. |

## D6

문항: dopamine-motor-control-q13

학생 선택: C2

학생 풀이: 카르비도파는 뇌에 못 가니까요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | NONE | INSUFFICIENT | INSUFFICIENT | NONE | NONE | NONE | NONE |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | PASS | PASS | PASS | PASS |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | PASS | PASS | NOT_OBSERVED | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S5_JUDGE | PASS | NOT_OBSERVED | NOT_OBSERVED | PASS | PASS | PASS | PASS |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 짧지만 관계만으로 충분(D-0085) | 카르비도파가 뇌에 도달하지 못한다는 관련 사실은 맞게 언급했지만, 이를 선택한 선지의 판단과 연결하지 않았다. | 카르비도파가 뇌에 도달하지 못한다는 관련 사실은 정확히 짚었지만, 이를 선지의 주장과 연결해 판단한 과정은 드러나지 않는다. | 카르비도파가 뇌에 들어가지 못한다는 근거를 들어 뇌에서 합성된 도파민의 작용 기간을 연장한다는 선지의 설명이 적절하지 않다고 판단했다. | 카르비도파가 뇌에 진입하지 못한다는 근거로, 흑질에서 합성된 도파민의 작용 기간을 연장한다는 ②를 부적절하다고 판단했다. | 카르비도파가 뇌에 진입하지 못한다는 필요한 근거를 정확히 제시하여, 흑질에서 합성된 도파민에 작용한다는 ②의 부적절성을 판단했다. 선지의 주장 전체를 어떻게 해석했는지는 드러나지 않는다. | 카르비도파가 뇌에 진입하지 못한다는 핵심 근거로, 흑질에서 합성된 도파민의 작용 기간을 연장한다는 ②의 주장을 부정했다. |

## S1

문항: surface-tension-laplace-q16

학생 선택: C3

학생 풀이: 점도와 표면 장력은 그대로이고 밀도 두 배와 노즐 지름 절반을 곱하면 이전과 같아요. 오네소르게 수를 결정하는 값이 같으니 변하지 않는다는 3번이 맞아요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | NONE | NONE | NONE | NONE | NONE | NONE | NONE |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note |  | 밀도와 노즐 지름의 곱이 유지되어 오네소르게 수가 변하지 않는다고 근거와 선지를 적절히 연결했다. | 점도와 표면 장력을 유지한 채 밀도와 노즐 지름의 곱이 그대로이므로 오네소르게 수가 변하지 않는다고 선지와 근거를 연결했다. | 밀도와 노즐 지름의 곱이 유지되므로 오네소르게 수도 변하지 않는다고 근거와 선지를 연결했다. | 점도와 표면 장력이 유지되고 밀도와 노즐 지름의 곱도 같으므로 오네소르게 수가 변하지 않는다는 근거를 ③의 판단에 정확히 연결했다. | 점도와 표면 장력이 일정하고 밀도와 노즐 지름의 곱이 유지되므로 오네소르게 수가 변하지 않는다는 근거를 ③의 판단에 정확히 연결했다. | 점도·표면 장력이 일정하고 밀도와 노즐 지름의 곱이 유지되므로 오네소르게 수가 변하지 않는다는 근거를 ③의 판단에 정확히 연결했다. |

## S2

문항: surface-tension-laplace-q16

학생 선택: C2

학생 풀이: 오네소르게 수가 너무 작으면 잉크가 노즐에서 나오지 못하니까 첨가제를 넣어 그 수를 키워야 다시 나와요. 그래서 더 커졌다는 2번이 맞아요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | DIRECTION / S4_INTERPRET / “오네소르게 수가 너무 작으면 잉크가 노즐에서 나오지 못하니까” | DIRECTION / S4_INTERPRET / “오네소르게 수가 너무 작으면 잉크가 노즐에서 나오지 못하니까” | DIRECTION / S4_INTERPRET / “오네소르게 수가 너무 작으면 잉크가 노즐에서 나오지 못하니까” | DIRECTION / S4_INTERPRET / “오네소르게 수가 너무 작으면 잉크가 노즐에서 나오지 못하니까 첨가제를 넣어 그 수를 키워야 다시 나와요.” | DIRECTION / S4_INTERPRET / “오네소르게 수가 너무 작으면 잉크가 노즐에서 나오지 못하니까” | DIRECTION / S4_INTERPRET / “오네소르게 수가 너무 작으면 잉크가 노즐에서 나오지 못하니까” | DIRECTION / S4_INTERPRET / “오네소르게 수가 너무 작으면 잉크가 노즐에서 나오지 못하니까” |
| note | 조건 방향 역전 | 지문은 오네소르게 수가 범위보다 클 때 잉크가 노즐 밖으로 나오지 못한다고 했지만, 학생은 너무 작을 때라고 반대로 이해했다. | 오네소르게 수가 범위보다 클 때 잉크가 노즐 밖으로 나오지 못한다는 내용을 반대로 이해했지만, 그 전제에서는 수를 키워야 한다고 일관되게 판단했다. | 지문은 오네소르게 수가 너무 클 때 잉크가 노즐 밖으로 나오지 못한다고 했으나, 학생은 그 방향을 반대로 이해했고 그 전제에서는 선지의 판단을 일관되게 연결했다. | 잉크가 노즐에서 나오지 못하는 것은 오네소르게 수가 너무 큰 경우인데, 학생은 이를 너무 작은 경우로 뒤집어 이해했다. 다만 그 잘못된 전제에서 수를 키워야 한다고 추론하여 ②와 연결한 판정은 일관된다. | 노즐에서 잉크가 나오지 않는 것은 오네소르게 수가 너무 큰 경우인데 이를 반대로 이해했다. 다만 수가 너무 작다는 자신의 전제에서 수를 키워야 한다고 추론하여 ②와 연결한 과정은 일관된다. | 노즐에서 잉크가 나오지 않는 것은 오네소르게 수가 너무 큰 경우인데 이를 반대로 해석했다. 다만 자신이 내세운 전제에서 수를 키워야 한다고 추론하여 ②와 연결한 판단은 일관된다. |

## S3

문항: surface-tension-laplace-q16

학생 선택: C2

학생 풀이: 점도가 커져 오네소르게 수가 너무 커졌기 때문에 잉크가 안 나온 거예요. 첨가제로 그 수를 낮춰 정상 범위로 되돌려야 하니까 더 커졌다는 2번은 틀린 설명이에요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | S1_STEM | S1_STEM | S1_STEM | S1_STEM | S1_STEM | S1_STEM | S1_STEM |
| errors | POLARITY / S1_STEM / “더 커졌다는 2번은 틀린 설명이에요” | POLARITY / S1_STEM / “더 커졌다는 2번은 틀린 설명이에요.” | POLARITY / S1_STEM / “더 커졌다는 2번은 틀린 설명이에요.” | POLARITY / S1_STEM / “2번은 틀린 설명이에요.” | POLARITY / S1_STEM / “더 커졌다는 2번은 틀린 설명이에요.” | POLARITY / S1_STEM / “더 커졌다는 2번은 틀린 설명이에요.” | POLARITY / S1_STEM / “첨가제로 그 수를 낮춰 정상 범위로 되돌려야 하니까 더 커졌다는 2번은 틀린 설명이에요.” |
| note | 긍정 발문에서 틀렸다고 판단한 선지 선택 | 2번이 틀렸다는 판단은 맞지만, 가장 적절한 것을 고르는 발문에서 2번을 선택했다. | C2가 틀린 설명이라고 올바르게 판단했지만, 가장 적절한 것을 고르는 발문에서 C2를 선택했습니다. | 첨가제가 오네소르게 수를 낮춘다고 근거를 들어 C2가 틀렸다고 판단했지만, 정답을 고르는 발문에서 C2를 선택했습니다. | 점도 증가로 오네소르게 수가 커졌으며 정상 인쇄를 위해 이를 낮춰야 한다는 근거로 ②의 부적절성을 정확히 판단했지만, 적절한 선지를 고르는 발문에서 ②를 선택했다. | 점도 증가로 오네소르게 수가 과도하게 커졌으며 정상 인쇄를 위해 이를 낮춰야 한다는 근거로 ②의 부적절성을 정확히 판단했지만, 적절한 선지를 고르는 발문에서 ②를 선택했다. | 점도 증가에 따른 오네소르게 수 상승과 첨가 후 필요한 감소를 정확히 이해하여 ②를 부적절하다고 판정했지만, 적절한 것을 고르는 발문에서 ②를 선택했다. |

## S4

문항: surface-tension-laplace-q16

학생 선택: C3

학생 풀이: 오네소르게 수는 점도만으로 결정되고 밀도나 노즐 지름, 표면 장력은 영향을 주지 않아요. 점도가 그대로라면 다른 건 바꿔도 그 수가 안 바뀌니까 3번이 맞아요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | SCOPE / S4_INTERPRET / “오네소르게 수는 점도만으로 결정되고 밀도나 노즐 지름, 표면 장력은 영향을 주지 않아요” | MISREAD_FACT / S4_INTERPRET / “오네소르게 수는 점도만으로 결정되고 밀도나 노즐 지름, 표면 장력은 영향을 주지 않아요.” | MISREAD_FACT / S4_INTERPRET / “오네소르게 수는 점도만으로 결정되고 밀도나 노즐 지름, 표면 장력은 영향을 주지 않아요.” | MISREAD_FACT / S4_INTERPRET / “오네소르게 수는 점도만으로 결정되고 밀도나 노즐 지름, 표면 장력은 영향을 주지 않아요.” | SCOPE / S4_INTERPRET / “오네소르게 수는 점도만으로 결정되고 밀도나 노즐 지름, 표면 장력은 영향을 주지 않아요.” | MISREAD_FACT / S4_INTERPRET / “오네소르게 수는 점도만으로 결정되고 밀도나 노즐 지름, 표면 장력은 영향을 주지 않아요.” | SCOPE / S4_INTERPRET / “오네소르게 수는 점도만으로 결정되고 밀도나 노즐 지름, 표면 장력은 영향을 주지 않아요.” |
| note | 관련 변수 범위 축소 | 지문은 오네소르게 수가 점도뿐 아니라 표면 장력·밀도·노즐 지름에도 영향을 받는다고 설명하지만, 학생은 이 요인들의 영향을 부정했습니다. false 전제에서 점도가 그대로이므로 오네소르게 수도 그대로라고 연결한 판정 자체는 일관됩니다. | 오네소르게 수는 점도가 클수록 커지고 표면 장력·밀도·노즐 지름의 곱이 클수록 작다는 지문 내용을 잘못 이해했다. | 선지의 불변 주장은 파악했지만, 오네소르게 수가 점도 외에 표면 장력·밀도·노즐 지름에도 영향을 받는다는 내용을 잘못 이해했습니다. | 오네소르게 수의 결정 요인을 점도로만 축소하여 근거를 잘못 해석했다. 정답을 선택했지만 실제 근거인 밀도와 노즐 지름의 곱이 일정하다는 관계를 활용하지 않았다. 다만 자신이 제시한 전제에서 ③을 옳다고 판단하는 추론은 일관된다. | 정답을 선택했지만 오네소르게 수의 결정 요인을 잘못 이해했다. 실제로는 밀도와 노즐 지름의 변화가 곱에서 상쇄되어 수가 유지된다. 다만 학생이 제시한 잘못된 전제에서 ③을 도출하는 추론 자체는 일관된다. | 정답을 선택했지만 오네소르게 수의 결정 요인을 점도로만 축소했다. 실제로는 밀도와 노즐 지름의 변화가 곱에서 상쇄되므로 수가 유지된다. 다만 학생이 제시한 잘못된 전제에서 ③으로 연결하는 추론 자체는 일관된다. |

## S5

문항: surface-tension-laplace-q16

학생 선택: C4

학생 풀이: 표면 장력 때문에 물방울이 구의 형태가 돼요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S4_INTERPRET | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note |  | 표면 장력과 물방울의 형태에 관한 사실만 언급했고, 선택한 선지를 판단하는 근거로 연결하지 않았다. | 표면 장력과 물방울의 형태에 관한 내용은 언급했지만, 선택한 선지를 판단하는 근거와 연결하지 않았다. | 표면 장력과 물방울의 형태에 관한 사실은 언급했지만, 선택한 선지의 판단 근거와 연결되지 않습니다. | 표면 장력이 물방울을 구형으로 만든다는 참인 사실을 진술했지만, 선택한 ④의 파란색 잉크의 오네소르게 수와 적정 범위 판단에는 연결되지 않는다. | 표면 장력이 물방울을 구형으로 만든다는 참인 사실을 언급했지만, 두 달 후 파란색 잉크의 오네소르게 수가 적정 범위를 벗어났다는 선지 판단에 필요한 근거와 연결되지 않는다. | 표면 장력 때문에 물방울이 구형이 된다는 진술은 맞지만, 선택한 ④의 파란색 잉크의 오네소르게 수와 적정 범위 판단에 필요한 근거가 아니며 선지와의 연결도 드러나지 않는다. |

## S6

문항: surface-tension-laplace-q16

학생 선택: C3

학생 풀이: 오네소르게 수는 점도가 작을수록 커진다고 생각해요. 그런데 밀도와 노즐 지름까지 바꾸면 어떻게 되는지 모르겠어서 3번을 찍었어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | true | true | true | true | true | true | true |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | PASS | PASS | NOT_OBSERVED | NOT_OBSERVED | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | DIRECTION / S4_INTERPRET / “오네소르게 수는 점도가 작을수록 커진다고 생각해요” | DIRECTION / S4_INTERPRET / “오네소르게 수는 점도가 작을수록 커진다고 생각해요.” | DIRECTION / S4_INTERPRET / “오네소르게 수는 점도가 작을수록 커진다고 생각해요.” | DIRECTION / S4_INTERPRET / “오네소르게 수는 점도가 작을수록 커진다고 생각해요.” | DIRECTION / S4_INTERPRET / “오네소르게 수는 점도가 작을수록 커진다고 생각해요.” | DIRECTION / S4_INTERPRET / “오네소르게 수는 점도가 작을수록 커진다고 생각해요.” | DIRECTION / S4_INTERPRET / “오네소르게 수는 점도가 작을수록 커진다고 생각해요.” |
| note | 역비례 오류 + 연결 모름 | 오네소르게 수와 점도의 관계를 반대로 진술했으며, 밀도와 노즐 지름의 변화는 모르겠다고 하고 찍었다고 밝혔다. | 오네소르게 수는 점도가 클수록 커지므로 점도와 오네소르게 수의 관계를 반대로 이해했으며, 3번은 모른 채 찍었다고 밝혔다. | 지문은 점도가 클수록 오네소르게 수가 크다고 하므로 점도와 오네소르게 수의 관계를 반대로 이해했다. | 판단에 필요한 오네소르게 수의 결정 요인을 언급했으나 점도와의 증감 관계를 반대로 해석했다. 정답을 선택했지만 밀도와 노즐 지름 변화의 효과는 모르겠다고 하여 대조·판정은 관찰되지 않는다. | 오네소르게 수와 점도의 관계를 언급했지만, 점도가 클수록 수가 커진다는 지문의 방향을 반대로 해석했다. 밀도와 노즐 지름 변화에 따른 판단은 모르겠다고 하며 찍었으므로 관찰되지 않는다. | 오네소르게 수를 결정하는 요인들은 언급했으나, 점도가 클수록 오네소르게 수가 커진다는 관계를 반대로 이해했다. 밀도와 노즐 지름의 변화에 따른 판단은 모르겠다고 했으므로 관찰되지 않은 것으로 처리한다. |

## M1

문항: mrna-vaccine-lipid-nanoparticle-q19

학생 선택: C5

학생 풀이: 투석으로 pH가 높아지면 이온화 지질이 중성이 된다는 건 지문에 있지만, 소수성이 약해져 인력이 줄고 더 작은 복합체가 생긴다는 내용은 지문에도 보기에도 없어요. 그래서 5번이 적절하지 않아요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | NONE | NONE | NONE | NONE | NONE | NONE | NONE |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note |  | pH 상승에 따른 중성화와 선지의 소수성 약화·입자 크기 주장에 근거가 없음을 구분해 ⑤를 적절하지 않은 것으로 판단했다. | pH 상승에 따른 중성화와 선지의 소수성 약화·입자 크기 주장에 근거가 없음을 구분해 ⑤를 부적절한 설명으로 판단했다. | pH가 높아지면 이온화 지질이 중성이 된다는 지문 내용과 ⑤의 소수성 약화·입자 크기 관련 주장이 근거에 없다는 점을 정확히 대조해 부적절한 선지로 판단했다. | pH 상승에 따른 중성화는 지문에 근거가 있지만, ⑤의 소수성 약화·인력 감소·복합체 크기 감소는 근거가 없음을 구별하여 부적절한 선지로 판단했다. | pH 상승에 따른 이온화 지질의 중성화와 선지의 소수성 약화·크기 감소 주장을 구분하고, 후자는 지문과 보기에 근거가 없으므로 적절하지 않다고 정확히 판단했다. | pH 상승에 따른 중성화는 근거가 있지만 소수성 약화와 복합체 크기 감소는 근거가 없음을 구별하여, ⑤를 적절하지 않은 선지로 정확히 판정했다. |

## M2

문항: mrna-vaccine-lipid-nanoparticle-q19

학생 선택: C5

학생 풀이: pH가 높아지면 수소 이온 농도가 높아져서 이온화 지질이 양전하를 띠게 돼요. 그러니까 소수성이 약해진다는 5번은 틀렸어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | PASS | PASS | PASS | FAIL | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | DIRECTION / S4_INTERPRET / “pH가 높아지면 수소 이온 농도가 높아져서” | DIRECTION / S4_INTERPRET / “pH가 높아지면 수소 이온 농도가 높아져서 이온화 지질이 양전하를 띠게 돼요.” | DIRECTION / S4_INTERPRET / “pH가 높아지면 수소 이온 농도가 높아져서 이온화 지질이 양전하를 띠게 돼요.” | DIRECTION / S4_INTERPRET / “pH가 높아지면 수소 이온 농도가 높아져서 이온화 지질이 양전하를 띠게 돼요.”<br>MULTI_STEP / S5_JUDGE / “그러니까 소수성이 약해진다는 5번은 틀렸어요.” | DIRECTION / S4_INTERPRET / “pH가 높아지면 수소 이온 농도가 높아져서 이온화 지질이 양전하를 띠게 돼요.” | DIRECTION / S4_INTERPRET / “pH가 높아지면 수소 이온 농도가 높아져서 이온화 지질이 양전하를 띠게 돼요.” | DIRECTION / S4_INTERPRET / “pH가 높아지면 수소 이온 농도가 높아져서 이온화 지질이 양전하를 띠게 돼요.” |
| note |  | 높은 pH에서는 수소 이온 농도가 낮아지고 이온화 지질은 전기적으로 중성이 되지만, 학생은 이를 반대로 해석했습니다. | 발문과 5번의 주장은 파악했지만, 높은 pH에서 수소 이온 농도가 낮아지고 이온화 지질이 중성이 된다는 지문 내용을 반대로 해석했습니다. | 높은 pH에서는 수소 이온 농도가 낮아져 이온화 지질이 중성이 되며, 이를 근거로 소수성 변화 주장을 반박하는 연결도 제시하지 않았습니다. | 부적절한 선지를 고르는 방향은 맞지만, pH가 높아지면 수소 이온 농도가 낮아지고 이온화 지질이 중성이 된다는 근거를 반대로 해석했다. 전하 상태가 소수성 약화 주장을 왜 반박하는지는 설명하지 않아 대조·판정의 연결은 확인되지 않는다. | 정답을 선택했지만, pH 상승 시 수소 이온 농도가 낮아지고 이온화 지질이 중성이 된다는 관계를 반대로 해석했다. 전하 상태가 선지의 소수성 약화 주장을 어떻게 반박하는지는 드러나지 않아 대조·판정 단계는 판단을 보류한다. | 부적절한 선지를 고르는 방향은 맞지만, pH가 높아지면 수소 이온 농도가 낮아지고 이온화 지질이 중성이 된다는 관계를 반대로 해석했다. 전하 변화가 소수성 약화 주장을 반박하는 이유는 드러나지 않는다. |

## M3

문항: mrna-vaccine-lipid-nanoparticle-q19

학생 선택: C5

학생 풀이: 그림을 보면 mRNA 용액과 에탄올 용액이 한 입구로 같이 들어가서 처음부터 섞여 있어요. 5번의 소수성이 약해져 더 작은 복합체가 생긴다는 건 지문에 근거가 없으니 틀렸어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | MISREAD_FACT / S4_INTERPRET / “그림을 보면 mRNA 용액과 에탄올 용액이 한 입구로 같이 들어가서 처음부터 섞여 있어요” | MISREAD_FACT / S4_INTERPRET / “그림을 보면 mRNA 용액과 에탄올 용액이 한 입구로 같이 들어가서 처음부터 섞여 있어요.” | MISREAD_FACT / S4_INTERPRET / “그림을 보면 mRNA 용액과 에탄올 용액이 한 입구로 같이 들어가서 처음부터 섞여 있어요.” | MISREAD_FACT / S4_INTERPRET / “mRNA 용액과 에탄올 용액이 한 입구로 같이 들어가서 처음부터 섞여 있어요.” | MISREAD_FACT / S4_INTERPRET / “그림을 보면 mRNA 용액과 에탄올 용액이 한 입구로 같이 들어가서 처음부터 섞여 있어요.” | MISREAD_FACT / S4_INTERPRET / “그림을 보면 mRNA 용액과 에탄올 용액이 한 입구로 같이 들어가서 처음부터 섞여 있어요.” | MISREAD_FACT / S4_INTERPRET / “그림을 보면 mRNA 용액과 에탄올 용액이 한 입구로 같이 들어가서 처음부터 섞여 있어요.” |
| note | 그림 오독, 나머지 판단은 맞음 | 선택지 5가 지문에 근거하지 않는다고 판단한 연결은 적절하지만, 그림의 두 용액 투입 경로를 잘못 설명했다. | 그림에서는 두 용액이 서로 다른 입구로 들어와 합류하지만, 학생은 한 입구로 함께 들어온다고 해석했습니다. C5가 근거 없다고 판단한 것은 발문의 방향과 일치합니다. | C5의 설명이 지문에 근거가 없다고 판단한 것은 적절하지만, 그림에서는 두 용액이 각각 다른 입구로 들어온다. | ⑤의 소수성 약화와 크기 감소에 근거가 없다는 판단은 타당하지만, 그림에서 두 용액이 서로 다른 입구로 들어와 합류하는 것을 한 입구에서 처음부터 섞여 있는 것으로 오독했다. | ⑤의 소수성 약화와 복합체 크기 감소에 근거가 없다는 판단은 타당하지만, 그림에서는 두 용액이 서로 다른 입구로 들어와 합류하므로 처음부터 한 입구로 섞여 들어온다는 설명은 명시적 오독이다. | ⑤의 소수성 약화와 크기 감소에 근거가 없다는 판단은 타당하지만, 그림에서 두 용액이 서로 다른 입구로 들어와 합류하는 것을 한 입구에서 처음부터 섞여 들어오는 것으로 오독했다. |

## M4

문항: mrna-vaccine-lipid-nanoparticle-q19

학생 선택: C3

학생 풀이: 이온화 지질은 pH가 높을 때 양전하를 띠니까, 산성 용액과 섞이면 양전하를 띤다는 3번이 적절하지 않아요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR | ERROR |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET | S4_INTERPRET |
| errors | DIRECTION / S4_INTERPRET / “이온화 지질은 pH가 높을 때 양전하를 띠니까” | DIRECTION / S4_INTERPRET / “이온화 지질은 pH가 높을 때 양전하를 띠니까” | DIRECTION / S4_INTERPRET / “이온화 지질은 pH가 높을 때 양전하를 띠니까” | DIRECTION / S4_INTERPRET / “이온화 지질은 pH가 높을 때 양전하를 띠니까” | DIRECTION / S4_INTERPRET / “이온화 지질은 pH가 높을 때 양전하를 띠니까” | DIRECTION / S4_INTERPRET / “이온화 지질은 pH가 높을 때 양전하를 띠니까” | DIRECTION / S4_INTERPRET / “이온화 지질은 pH가 높을 때 양전하를 띠니까” |
| note |  | 지문은 낮은 pH에서 이온화 지질이 양이온화되고 높은 pH에서 중성이 된다고 설명하므로 전하 변화 방향을 반대로 이해했습니다. | 지문은 pH가 낮을 때 이온화 지질이 양이온화된다고 설명하지만, 학생은 그 방향을 반대로 이해했습니다. | 지문은 pH가 낮을 때 이온화 지질이 양이온화된다고 설명하지만, 학생은 이를 반대로 해석하고 그 전제에 따라 3번을 부적절하다고 판정했다. | 낮은 pH에서 양이온화되고 높은 pH에서 중성이 되는 관계를 반대로 해석했다. 다만 그 잘못된 전제에서 산성 용액과 혼합하면 양전하를 띤다는 ③을 부적절하다고 판단하는 연결은 일관된다. | 낮은 pH에서 이온화 지질이 양이온화된다는 관계를 반대로 이해했지만, 자신이 제시한 전제에 따라 3번을 부적절하다고 판정하는 연결은 일관된다. | 낮은 pH에서 양이온화되고 높은 pH에서 중성이 된다는 관계를 반대로 해석했다. 다만 그 잘못된 전제에서 산성 용액과 섞이면 양전하를 띤다는 ③을 부적절하다고 판단한 연결은 일관된다. |

## M5

문항: mrna-vaccine-lipid-nanoparticle-q19

학생 선택: C5

학생 풀이: 이온화 지질은 용액의 pH에 따라 양이온성이 달라져요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT | INSUFFICIENT |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | PASS | PASS | NOT_OBSERVED | PASS | PASS | PASS | PASS |
| S4_INTERPRET | PASS | PASS | NOT_OBSERVED | PASS | PASS | PASS | PASS |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 관련 사실이나 연결 없음 | pH에 따라 이온화 지질의 양이온성이 달라진다는 사실은 정확히 언급했지만, 이를 선지의 소수성·입자 크기 주장과 연결해 판단하지 않았다. | pH에 따라 이온화 지질의 양이온성이 달라진다는 사실만 진술했으며, 이를 선택한 선지의 판단 근거와 연결하지 않았다. | pH에 따라 이온화 지질의 양이온성이 달라진다는 지문 내용을 정확히 언급했지만, 이를 선택한 선지의 주장과 연결해 판단하지 않았다. | pH에 따라 이온화 지질의 양이온성이 달라진다는 관련 근거는 정확히 언급했지만, 이를 ⑤의 소수성 약화 및 복합체 크기 감소 주장과 대조하여 부적절하다고 판단하는 연결은 드러나지 않는다. | pH에 따라 이온화 지질의 양이온성이 달라진다는 관련 근거는 정확히 제시했지만, 이를 ⑤의 소수성 약화 및 복합체 크기 감소 주장과 대조하여 부적절하다고 판단하는 연결은 드러나지 않는다. | pH에 따라 이온화 지질의 양이온성이 달라진다는 관련 근거는 정확히 언급했지만, 이를 ⑤의 소수성 약화·복합체 크기 감소 주장과 대조하여 부적절함을 판단하는 연결은 드러나지 않는다. |

## M6

문항: mrna-vaccine-lipid-nanoparticle-q19

학생 선택: C4

학생 풀이: 투석하면 pH가 높아져 수소 이온 농도가 낮아지고, 그러면 이온화 지질이 전기적으로 중성이 되니까 4번은 맞는 설명이에요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH | POLARITY_MISMATCH |
| unjudgeableReason | null | null | null | null | null | null | null |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |
| S2_CHOICE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S3_LOCATE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S4_INTERPRET | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| S5_JUDGE | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| firstFailedStep | S1_STEM | S1_STEM | S1_STEM | S1_STEM | S1_STEM | S1_STEM | S1_STEM |
| errors | POLARITY / S1_STEM / “4번은 맞는 설명이에요” | POLARITY / S1_STEM / “그러면 이온화 지질이 전기적으로 중성이 되니까 4번은 맞는 설명이에요.” | POLARITY / S1_STEM / “그러니까 4번은 맞는 설명이에요.” | POLARITY / S1_STEM / “4번은 맞는 설명이에요.” | POLARITY / S1_STEM / “4번은 맞는 설명이에요.” | POLARITY / S1_STEM / “4번은 맞는 설명이에요.” | POLARITY / S1_STEM / “4번은 맞는 설명이에요.” |
| note |  | 4번의 내용이 맞다고 판단한 것은 타당하지만, ‘적절하지 않은 것’을 고르는 발문의 방향과 선택이 충돌한다. | 학생은 4번이 지문에 부합한다고 판단했지만, 발문은 적절하지 않은 내용을 고르라고 요구한다. | C4의 내용은 지문에 맞게 판단했지만, ‘적절하지 않은 것’을 고르는 발문의 방향을 반영하지 못했습니다. | 투석에 따른 pH 상승, 수소 이온 농도 감소, 이온화 지질의 중성화를 정확히 연결하여 4번을 적절하다고 판단했지만, 적절하지 않은 선지를 고르는 발문에서 4번을 선택했다. | 투석에 따른 pH 상승, 수소 이온 농도 감소, 이온화 지질의 중성화를 정확히 연결해 4번을 적절하다고 판단했지만, 적절하지 않은 선지를 고르는 발문에서 4번을 선택했다. | 투석에 따른 pH 상승, 수소 이온 농도 감소, 이온화 지질의 중성화를 정확히 연결하여 4번을 옳다고 판단했으나, 적절하지 않은 설명을 고르는 발문에서 4번을 선택했다. |

## N1

문항: information-asymmetry-free-marketplace-q13

학생 선택: C2

학생 풀이: 그냥 왠지 2번 같았어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE |
| unjudgeableReason | NO_CONTENT | GUESS_ONLY | GUESS_ONLY | GUESS_ONLY | NO_CONTENT | NO_CONTENT | NO_CONTENT |
| guessed | false | true | true | true | true | true | true |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S4_INTERPRET | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 감만 말함, 근거 내용 없음 | ‘왠지’라는 느낌만 제시해 판단 근거를 확인할 수 없다. | 선택 이유를 감으로만 밝혀 판단에 필요한 논리 내용이 드러나지 않는다. | 선택 이유를 ‘왠지’라고만 밝혀 판단 근거가 드러나지 않는다. | 느낌으로 선택했다고만 밝혔으며, 선지 판단의 근거나 논리 내용은 제시하지 않았다. | 감에 따른 선택만 제시하여 선지 판단의 논리 내용이 드러나지 않는다. | 감으로 선택했다는 말만 있어 선지 판단의 논리나 오류를 확인할 수 없다. |

## N2

문항: corporate-law-q13

학생 선택: C5

학생 풀이: 몰라요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE |
| unjudgeableReason | GUESS_ONLY | GUESS_ONLY | GUESS_ONLY | GUESS_ONLY | GUESS_ONLY | GUESS_ONLY | GUESS_ONLY |
| guessed | true | true | true | true | true | true | true |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S4_INTERPRET | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 모름만 말함 | 선택은 했지만 근거 없이 ‘몰라요’라고 밝혀 판단 과정을 확인할 수 없다. | 학생이 모른다고만 밝혀 선지 판단의 근거와 연결을 확인할 수 없다. | 선택은 했지만 근거로 ‘몰라요’만 제시해 판단 과정을 확인할 수 없다. | ‘몰라요.’라고만 하여 선택의 근거나 논리 단계의 성공·실패를 판단할 수 없다. | 학생이 '몰라요.'라고만 하여 선택의 근거나 논리 단계의 성공·실패를 판단할 수 없다. | 학생이 ‘몰라요.’라고만 밝혀 선택의 근거나 논리 단계의 성공·실패를 판단할 수 없다. |

## N3

문항: dopamine-motor-control-q13

학생 선택: C3

학생 풀이: 3번이 적절하지 않은 것 같아요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE |
| unjudgeableReason | NO_CONTENT | NO_CONTENT | NO_CONTENT | NO_CONTENT | NO_CONTENT | NO_CONTENT | NO_CONTENT |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | NOT_OBSERVED | PASS | PASS | NOT_OBSERVED | PASS | PASS | PASS |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S4_INTERPRET | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 선택 되풀이, 근거 없음 | 발문의 ‘적절하지 않은’ 방향은 반영했지만, 3번의 내용이나 근거를 설명하지 않아 판단 과정을 확인할 수 없습니다. | 발문의 ‘적절하지 않은’ 방향은 언급했지만, 3번이 부적절하다고 판단한 근거나 원문과의 대조가 드러나지 않습니다. | 선택한 선지와 ‘3번이 적절하지 않은 것 같아요’라는 말만 있어 판단 근거를 확인할 수 없습니다. | 부적절한 선지를 고르는 발문 방향은 드러나지만, 선택 판단을 뒷받침하는 근거 내용이 없어 나머지 단계는 판단할 수 없다. | 부적절한 선지를 고르는 발문 방향은 드러나지만, 선택을 되풀이할 뿐 내용 판단의 근거가 없어 오류 단계를 확정할 수 없다. | 부적절한 선지를 고르는 발문 방향은 드러나지만, 선택만 되풀이하여 내용 이해나 판단 근거는 확인할 수 없다. |

## N4

문항: surface-tension-laplace-q16

학생 선택: C4

학생 풀이: 구입 당시와 달리, 두 달이 지난 후 파란색 잉크의 오네소르게 수는 인쇄의 적정 범위를 벗어났으니까요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE |
| unjudgeableReason | NO_CONTENT | NO_CONTENT | NO_CONTENT | NO_CONTENT | NO_CONTENT | NO_CONTENT | NO_CONTENT |
| guessed | false | false | false | false | false | false | false |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S4_INTERPRET | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 선지 문장 되풀이, 근거 없음 | 선지의 내용을 되풀이했을 뿐, 파란색 잉크의 오네소르게 수가 적정 범위를 벗어났다고 판단한 근거는 제시하지 않았다. | 선택한 선지의 내용을 되풀이했을 뿐, 이를 뒷받침하는 근거나 판단 과정이 드러나지 않는다. | 선지 내용을 되풀이했을 뿐, 판단 근거가 드러나지 않습니다. | 선택한 ④의 내용을 되풀이했을 뿐, 적정 범위를 벗어났다고 판단한 근거를 제시하지 않아 사고 단계를 판정할 수 없다. | 선택한 ④의 내용을 되풀이했을 뿐, 적정 범위를 벗어났다고 판단한 근거를 제시하지 않아 사고 단계를 판정할 수 없다. | 선택한 ④의 내용을 되풀이했을 뿐, 파란색 잉크의 오네소르게 수가 적정 범위를 벗어났다고 판단한 근거가 없어 사고 과정을 판정할 수 없다. |

## N5

문항: mrna-vaccine-lipid-nanoparticle-q19

학생 선택: C2

학생 풀이: 시간이 없어서 찍었어요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE |
| unjudgeableReason | GUESS_ONLY | GUESS_ONLY | GUESS_ONLY | GUESS_ONLY | GUESS_ONLY | GUESS_ONLY | GUESS_ONLY |
| guessed | true | true | true | true | true | true | true |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S4_INTERPRET | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 찍음만 말함 | 시간이 없어 찍었다고만 밝혀 선지 판단의 근거와 논리 연결을 확인할 수 없습니다. | 시간이 없어 찍었다고 밝혔으며 선택 판단의 근거가 드러나지 않는다. | 시간이 없어 찍었다고 밝혔으며, 선택을 뒷받침하는 논리적 근거가 없다. | 시간이 없어 찍었다고만 밝혔으므로, 오답 선택만으로 논리 단계의 실패를 판정할 수 없다. | 시간이 없어 찍었다고만 밝혔으므로 선택의 정오와 별개로 논리 단계의 성공·실패를 판단할 수 없다. | 시간이 없어 찍었다고만 밝혔으므로 선택의 정오와 별개로 논리 단계의 성공·실패를 판단할 근거가 없다. |

## N6

문항: information-asymmetry-free-marketplace-q13

학생 선택: C3

학생 풀이: 느낌상 3번이 제일 이상해 보였어요. 다른 건 다 맞는 말 같아서요.

| 항목 | 정답 | luna 1회 | luna 2회 | luna 3회 | sol 1회 | sol 2회 | sol 3회 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| outcomeType | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE | UNJUDGEABLE |
| unjudgeableReason | NO_CONTENT | GUESS_ONLY | GUESS_ONLY | GUESS_ONLY | NO_CONTENT | NO_CONTENT | NO_CONTENT |
| guessed | false | true | true | true | true | true | true |
| S1_STEM | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | PASS | NOT_OBSERVED | NOT_OBSERVED |
| S2_CHOICE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S3_LOCATE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S4_INTERPRET | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| S5_JUDGE | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED | NOT_OBSERVED |
| firstFailedStep | null | null | null | null | null | null | null |
| errors | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 |
| note | 느낌과 내용 없는 소거, 근거 내용 없음 | ‘느낌상’ 이상해 보였다는 감에 따른 선택만 드러나 판단 근거를 확인할 수 없다. | 느낌으로 선택했다고 밝혔으며, 판단 근거나 원문과의 연결은 제시하지 않았다. | 느낌에 따라 골랐다고 했을 뿐 판단 근거를 제시하지 않았다. | 이상해 보이는 선지를 선택해 발문 방향은 맞게 처리했으나, 느낌 외에 선지 판단의 구체적 근거를 제시하지 않아 내용 이해와 추론은 판단할 수 없다. | 느낌으로 선택했다고 명시했으며, 선지의 내용이나 원문 근거에 대한 설명이 없어 논리 단계를 판정할 수 없다. | 느낌에 따른 선택과 다른 선지가 맞아 보인다는 인상만 제시하여, 선지 판단의 논리적 근거를 확인할 수 없다. |

