# 함정 지도 v0 사람 검토 자료

모델 출력 원문. 외부 실제 비율과 평균 예측은 REPORT.md/RESULTS.json. 후보 공손룡은 주 지표 제외.

## corporate-law-q13 (USED)

정답: C2

실제 화작 C1~C5: 5.00, 42.00, 14.00, 15.00, 23.00
실제 언매 C1~C5: 4.00, 53.00, 10.00, 11.00, 22.00

### gpt-6-luna

평균 예측 C1~C5: 11.33, 54.67, 12.67, 10.00, 11.33

#### r1: VALID

##### C1

태그: ["POLARITY","REFERENT"]

유인 경로 원문:

적립 재원이 특정 항목으로 명시되지 않았다는 점에 주목해 이를 이익 잉여금으로 볼 수 없다고 판단할 수 있다. 그러나 지문에서 이익 잉여금은 배당과 사업 투자에 쓰이는 유보 재원이므로 보기의 상황과 연결된다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이익 잉여금은 영업 활동에서 발생한 이익 중 사용되지 않고 유보된 재원으로, 주주들에게 이익을 분배하는 행위인 배당을 통해 배당금으로 지급되거나 사업 투자, 손실 보전 등을 목적으로 비교적 자유롭게 활용될 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "이사회는 현 상황에 대한 주주들의 불만을 잠재우기 위해 회사의 영업 이익을 분배하는 방안을 검토하였으나 필요한 재원의 부족으로 실행을 보류하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "새로운 사업 투자나 이익 분배를 위해 적립해 두었던 재원이 크게 줄어들었다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "PHRASE",
  "attractionTags": [
    "POLARITY",
    "REFERENT"
  ],
  "attractionMechanism": "적립 재원이 특정 항목으로 명시되지 않았다는 점에 주목해 이를 이익 잉여금으로 볼 수 없다고 판단할 수 있다. 그러나 지문에서 이익 잉여금은 배당과 사업 투자에 쓰이는 유보 재원이므로 보기의 상황과 연결된다.",
  "predictedSelectionPercent": 12
}
```

##### C2

태그: []

유인 경로 원문:

주식회사 설립에 개인의 출자가 관여하고 갑이 대표 이사라는 점을 분리해 판단해야 한다. 법인격은 주주 개인이 아니라 구성원 단체에 부여되고, 갑의 자산 운용 권한은 출자 때문이 아니라 정관이나 법령에 의해 주어진다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "법인은 자신의 이름으로 권리와 의무의 주체가 되어 자산을 운용할 수 있다. 따라서 법인의 자산이 개인의 출자에 의해 형성되었더라도 자산의 소유권은 특정 개인이 아닌 법인에게 귀속된다."
    },
    {
      "source": "PASSAGE",
      "quote": "주식회사는 사단 법인이면서 영리 법인으로, 법인격은 주식회사의 구성원 단체에 부여된다. 자산 운용의 권한은 이사회나 주주 총회, 특정 개인에게 주어지고 이들은 정해진 법령 내에서 결정권을 행사할 수 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "다만 법인은 행위 능력이 없으므로 실제 자산의 운용은 법인의 정관*이나 법령에서 권한을 부여한 사람에 의해 이루어진다."
    }
  ],
  "evidenceSpan": "CROSS_PARAGRAPH",
  "transformType": "ATTRIBUTION_SWAP",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "주식회사 설립에 개인의 출자가 관여하고 갑이 대표 이사라는 점을 분리해 판단해야 한다. 법인격은 주주 개인이 아니라 구성원 단체에 부여되고, 갑의 자산 운용 권한은 출자 때문이 아니라 정관이나 법령에 의해 주어진다.",
  "predictedSelectionPercent": 55
}
```

##### C3

태그: ["POLARITY","CONDITION","MULTI_STEP"]

유인 경로 원문:

자본 잉여금은 사용처가 제한되고 배당에도 쓸 수 없다는 점만 보고 자본 거래를 통한 이익 확보 자체가 적절하지 않다고 판단할 수 있다. 그러나 이익 잉여금과 자본 잉여금으로 손실을 보전할 수 없는 상황에서 자본금 사용에 이르기 전, 손실 보전에 활용할 수 있는 자본 잉여금을 고려할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "자본 잉여금은 주식 등 자본을 거래하여 얻은 이익으로 손실 보전 등의 제한된 목적으로만 사용될 수 있고, 배당금으로 지급될 수 없다."
    },
    {
      "source": "SCENARIO",
      "quote": "주식회사는 경영 부진으로 인해 적자가 누적되어 새로운 사업 투자나 이익 분배를 위해 적립해 두었던 재원이 크게 줄어들었다."
    },
    {
      "source": "SCENARIO",
      "quote": "이러한 사실이 알려지면서 신용도가 낮아져서 주가가 하락하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "CONDITION",
    "MULTI_STEP"
  ],
  "attractionMechanism": "자본 잉여금은 사용처가 제한되고 배당에도 쓸 수 없다는 점만 보고 자본 거래를 통한 이익 확보 자체가 적절하지 않다고 판단할 수 있다. 그러나 이익 잉여금과 자본 잉여금으로 손실을 보전할 수 없는 상황에서 자본금 사용에 이르기 전, 손실 보전에 활용할 수 있는 자본 잉여금을 고려할 수 있다.",
  "predictedSelectionPercent": 14
}
```

##### C4

태그: ["POLARITY","CONDITION"]

유인 경로 원문:

이익 잉여금이 소진되는 즉시 자본금이 감소한다고 읽으면, 자본 잉여금으로도 손실을 보전할 수 없는 경우라는 추가 조건을 놓칠 수 있다. 선지에는 그 조건이 포함되어 있으므로 지문의 설명과 부합한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "적자가 누적되어 이익 잉여금이나 자본 잉여금으로도 손실을 보전할 수 없는 경우에는 자본금을 사용하게 된다. 자본금의 감소는 회사의 존립을 위태롭게 하므로 신중한 자산 운용이 이루어져야 한다."
    }
  ],
  "evidenceSpan": "SAME_PARAGRAPH",
  "transformType": "INFERENCE_VALID",
  "transformSize": "PHRASE",
  "attractionTags": [
    "POLARITY",
    "CONDITION"
  ],
  "attractionMechanism": "이익 잉여금이 소진되는 즉시 자본금이 감소한다고 읽으면, 자본 잉여금으로도 손실을 보전할 수 없는 경우라는 추가 조건을 놓칠 수 있다. 선지에는 그 조건이 포함되어 있으므로 지문의 설명과 부합한다.",
  "predictedSelectionPercent": 8
}
```

##### C5

태그: ["POLARITY","REFERENT","ATTRIBUTION"]

유인 경로 원문:

부동산을 갑이 출연했다는 사실을 근거로 그 부동산이 여전히 갑 개인의 소유라고 볼 수 있다. 하지만 출자된 자산의 소유권은 법인에 귀속되며, 대표 이사도 정해진 권한과 절차에 따라 자산을 운용해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "법인의 자산이 개인의 출자에 의해 형성되었더라도 자산의 소유권은 특정 개인이 아닌 법인에게 귀속된다."
    },
    {
      "source": "PASSAGE",
      "quote": "다만 법인은 행위 능력이 없으므로 실제 자산의 운용은 법인의 정관*이나 법령에서 권한을 부여한 사람에 의해 이루어진다. 이때 정해진 절차에 어긋나거나 법인의 목적과는 다르게 자산을 운용하면 법적으로 처벌받을 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "한편 A의 설립자이자 현재 대표 이사인 갑은 회사의 평판을 개선하기 위해 회사를 설립할 당시에 자신이 출연했던 부동산을 기부하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "REFERENT",
    "ATTRIBUTION"
  ],
  "attractionMechanism": "부동산을 갑이 출연했다는 사실을 근거로 그 부동산이 여전히 갑 개인의 소유라고 볼 수 있다. 하지만 출자된 자산의 소유권은 법인에 귀속되며, 대표 이사도 정해진 권한과 절차에 따라 자산을 운용해야 한다.",
  "predictedSelectionPercent": 11
}
```

#### r2: VALID

##### C1

태그: ["POLARITY"]

유인 경로 원문:

보기의 ‘적립해 두었던 재원’이 배당에 쓰이는 이익 잉여금과 연결됨을 파악하면 타당한 진술이다. 적절한 진술을 부적절한 것으로 오인하는 경우에만 선택될 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "새로운 사업 투자나 이익 분배를 위해 적립해 두었던 재원이 크게 줄어들었다."
    },
    {
      "source": "SCENARIO",
      "quote": "이사회는 현 상황에 대한 주주들의 불만을 잠재우기 위해 회사의 영업 이익을 분배하는 방안을 검토하였으나 필요한 재원의 부족으로 실행을 보류하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "이익 잉여금은 영업 활동에서 발생한 이익 중 사용되지 않고 유보된 재원으로, 주주들에게 이익을 분배하는 행위인 배당을 통해 배당금으로 지급되거나 사업 투자, 손실 보전 등을 목적으로 비교적 자유롭게 활용될 수 있다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "PHRASE",
  "attractionTags": [
    "POLARITY"
  ],
  "attractionMechanism": "보기의 ‘적립해 두었던 재원’이 배당에 쓰이는 이익 잉여금과 연결됨을 파악하면 타당한 진술이다. 적절한 진술을 부적절한 것으로 오인하는 경우에만 선택될 수 있다.",
  "predictedSelectionPercent": 10
}
```

##### C2

태그: []

유인 경로 원문:

갑이 설립 때 재산을 출연했다는 사실과 대표 이사로서 자산 운용 권한을 갖는다는 사실은 별개다. 법인격은 구성원 단체에 부여되고, 갑의 권한은 대표 이사에게 정관이나 법령으로 부여된 권한에서 나오므로 선지의 인과 관계는 부적절하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "주식회사는 사단 법인이면서 영리 법인으로, 법인격은 주식회사의 구성원 단체에 부여된다."
    },
    {
      "source": "PASSAGE",
      "quote": "자산 운용의 권한은 이사회나 주주 총회, 특정 개인에게 주어지고 이들은 정해진 법령 내에서 결정권을 행사할 수 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "다만 법인은 행위 능력이 없으므로 실제 자산의 운용은 법인의 정관*이나 법령에서 권한을 부여한 사람에 의해 이루어진다."
    },
    {
      "source": "SCENARIO",
      "quote": "한편 A의 설립자이자 현재 대표 이사인 갑은 회사의 평판을 개선하기 위해 회사를 설립할 당시 자신이 출연했던 부동산을 기부하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "ATTRIBUTION_SWAP",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "갑이 설립 때 재산을 출연했다는 사실과 대표 이사로서 자산 운용 권한을 갖는다는 사실은 별개다. 법인격은 구성원 단체에 부여되고, 갑의 권한은 대표 이사에게 정관이나 법령으로 부여된 권한에서 나오므로 선지의 인과 관계는 부적절하다.",
  "predictedSelectionPercent": 57
}
```

##### C3

태그: ["POLARITY","CONDITION"]

유인 경로 원문:

자본 잉여금이 제한된 목적으로만 사용된다는 조건을 떠올리면 자본 거래를 통한 이익 추구 자체도 금지된다고 오해할 수 있다. 그러나 선지는 그 이익을 제한 외의 목적으로 사용한다고 하지 않고, 자본 거래를 통한 이익 창출을 고려할 수 있다고 말한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "이러한 사실이 알려지면서 신용도가 낮아져서 주가가 하락하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "자본 잉여금은 주식 등 자본을 거래하여 얻은 이익으로 손실 보전 등의 제한된 목적으로만 사용될 수 있고, 배당금으로 지급될 수 없다."
    },
    {
      "source": "PASSAGE",
      "quote": "주식회사의 자산 운용은 각 항목의 특성에 따라 이익을 극대화하는 방향으로 이루어지는데"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "CONDITION"
  ],
  "attractionMechanism": "자본 잉여금이 제한된 목적으로만 사용된다는 조건을 떠올리면 자본 거래를 통한 이익 추구 자체도 금지된다고 오해할 수 있다. 그러나 선지는 그 이익을 제한 외의 목적으로 사용한다고 하지 않고, 자본 거래를 통한 이익 창출을 고려할 수 있다고 말한다.",
  "predictedSelectionPercent": 11
}
```

##### C4

태그: ["POLARITY"]

유인 경로 원문:

적자가 계속되어 이익 잉여금과 자본 잉여금으로 손실을 보전할 수 없는 경우 자본금을 쓰게 되고, 자본금 감소는 회사 존립을 위태롭게 한다. 이를 연결하면 타당한 진술이며, 적절한 진술을 부적절하다고 판단해야만 오답으로 선택된다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "주식회사 A는 경영 부진으로 인해 적자가 누적되어 새로운 사업 투자나 이익 분배를 위해 적립해 두었던 재원이 크게 줄어들었다."
    },
    {
      "source": "PASSAGE",
      "quote": "적자가 누적되어 이익 잉여금이나 자본 잉여금으로도 손실을 보전할 수 없는 경우에는 자본금을 사용하게 된다."
    },
    {
      "source": "PASSAGE",
      "quote": "자본금의 감소는 회사의 존립을 위태롭게 하므로 신중한 자산 운용이 이루어져야 한다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY"
  ],
  "attractionMechanism": "적자가 계속되어 이익 잉여금과 자본 잉여금으로 손실을 보전할 수 없는 경우 자본금을 쓰게 되고, 자본금 감소는 회사 존립을 위태롭게 한다. 이를 연결하면 타당한 진술이며, 적절한 진술을 부적절하다고 판단해야만 오답으로 선택된다.",
  "predictedSelectionPercent": 8
}
```

##### C5

태그: ["POLARITY","MAPPING"]

유인 경로 원문:

출연했던 부동산이라도 소유권은 갑 개인이 아니라 법인에 귀속된다는 점을 적용하면, 갑이 정해진 절차 없이 이를 기부할 경우 법적 책임이 생길 수 있다는 추론이 가능하다. 개인 출연 재산을 개인 소유로 보거나, 기부는 회사 자산 운용과 무관하다고 오해하면 적절한 진술을 오답으로 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "따라서 법인의 자산이 개인의 출자에 의해 형성되었더라도 자산의 소유권은 특정 개인이 아닌 법인에게 귀속된다."
    },
    {
      "source": "PASSAGE",
      "quote": "이때 정해진 절차에 어긋나거나 법인의 목적과는 다르게 자산을 운용하면 법적으로 처벌받을 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "한편 A의 설립자이자 현재 대표 이사인 갑은 회사의 평판을 개선하기 위해 회사를 설립할 당시 자신이 출연했던 부동산을 기부하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "MAPPING"
  ],
  "attractionMechanism": "출연했던 부동산이라도 소유권은 갑 개인이 아니라 법인에 귀속된다는 점을 적용하면, 갑이 정해진 절차 없이 이를 기부할 경우 법적 책임이 생길 수 있다는 추론이 가능하다. 개인 출연 재산을 개인 소유로 보거나, 기부는 회사 자산 운용과 무관하다고 오해하면 적절한 진술을 오답으로 고를 수 있다.",
  "predictedSelectionPercent": 14
}
```

#### r3: VALID

##### C1

태그: ["POLARITY","MULTI_STEP"]

유인 경로 원문:

보기의 ‘필요한 재원의 부족’을 지문의 이익 잉여금 설명과 연결하면 배당 재원이 부족한 상황으로 이해할 수 있다. 다만 발문이 적절하지 않은 것을 묻기 때문에, 이 타당한 추론을 틀렸다고 판단하면 오답 선지로 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "이사회는 현 상황에 대한 주주들의 불만을 잠재우기 위해 회사의 영업 이익을 분배하는 방안을 검토하였으나 필요한 재원의 부족으로 실행을 보류하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "이익 잉여금은 영업 활동에서 발생한 이익 중 사용되지 않고 유보된 재원으로, 주주들에게 이익을 분배하는 행위인 배당을 통해 배당금으로 지급되거나 사업 투자, 손실 보전 등을 목적으로 비교적 자유롭게 활용될 수 있다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "MULTI_STEP"
  ],
  "attractionMechanism": "보기의 ‘필요한 재원의 부족’을 지문의 이익 잉여금 설명과 연결하면 배당 재원이 부족한 상황으로 이해할 수 있다. 다만 발문이 적절하지 않은 것을 묻기 때문에, 이 타당한 추론을 틀렸다고 판단하면 오답 선지로 고를 수 있다.",
  "predictedSelectionPercent": 12
}
```

##### C2

태그: []

유인 경로 원문:

주식회사의 법인격은 주주 개인의 출자 재산이 아니라 구성원 단체에 부여된다. 갑의 자산 운용 권한도 재산 출연에서 생기는 것이 아니라 대표 이사 등에게 정관이나 법령으로 부여되므로, 선지는 법인격 부여의 근거와 권한의 근거를 모두 잘못 연결했다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "주식회사는 사단 법인이면서 영리 법인으로, 법인격은 주식회사의 구성원 단체에 부여된다."
    },
    {
      "source": "PASSAGE",
      "quote": "자산 운용의 권한은 이사회나 주주 총회, 특정 개인에게 주어지고 이들은 정해진 법령 내에서 결정권을 행사할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "한편 A의 설립자이자 현재 대표 이사인 갑은 회사의 평판을 개선하기 위해 회사를 설립할 당시에 자신이 출연했던 부동산을 기부하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "ATTRIBUTION_SWAP",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "주식회사의 법인격은 주주 개인의 출자 재산이 아니라 구성원 단체에 부여된다. 갑의 자산 운용 권한도 재산 출연에서 생기는 것이 아니라 대표 이사 등에게 정관이나 법령으로 부여되므로, 선지는 법인격 부여의 근거와 권한의 근거를 모두 잘못 연결했다.",
  "predictedSelectionPercent": 52
}
```

##### C3

태그: ["POLARITY","CONDITION","SCOPE"]

유인 경로 원문:

자본 잉여금의 사용 목적이 제한된다는 대목을 자본 거래로 이익을 얻는 행위 자체가 금지된다는 뜻으로 확대해 읽을 수 있다. 그러나 선지는 자본 잉여금을 배당하겠다고 한 것이 아니라 영리 법인이 이익을 얻는 방법을 고려할 수 있다고 했으므로, 이를 부적절하다고 보면 발문의 방향까지 놓친 것이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "이러한 사실이 알려지면서 신용도가 낮아져서 주가가 하락하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "주식회사는 사단 법인이면서 영리 법인으로, 법인격은 주식회사의 구성원 단체에 부여된다."
    },
    {
      "source": "PASSAGE",
      "quote": "자본 잉여금은 주식 등 자본을 거래하여 얻은 이익으로 손실 보전 등의 제한된 목적으로만 사용될 수 있고, 배당금으로 지급될 수 없다."
    },
    {
      "source": "PASSAGE",
      "quote": "주식회사의 자산 운용은 각 항목의 특성에 따라 이익을 극대화하는 방향으로 이루어지는데"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "CONDITION",
    "SCOPE"
  ],
  "attractionMechanism": "자본 잉여금의 사용 목적이 제한된다는 대목을 자본 거래로 이익을 얻는 행위 자체가 금지된다는 뜻으로 확대해 읽을 수 있다. 그러나 선지는 자본 잉여금을 배당하겠다고 한 것이 아니라 영리 법인이 이익을 얻는 방법을 고려할 수 있다고 했으므로, 이를 부적절하다고 보면 발문의 방향까지 놓친 것이다.",
  "predictedSelectionPercent": 13
}
```

##### C4

태그: ["POLARITY","DIRECTION"]

유인 경로 원문:

적자 누적에서 이익 잉여금·자본 잉여금의 손실 보전, 자본금 사용, 자본금 감소의 위험으로 이어지는 흐름을 적용하면 선지의 가능성 진술은 타당하다. 자본금 감소가 원칙적으로 금지된다는 내용을 떠올려 이 흐름 자체가 불가능하다고 판단하거나, 발문이 부적절한 것을 묻는다는 점을 놓치면 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "주식회사 A는 경영 부진으로 인해 적자가 누적되어 새로운 사업 투자나 이익 분배를 위해 적립해 두었던 재원이 크게 줄어들었다."
    },
    {
      "source": "PASSAGE",
      "quote": "적자가 누적되어 이익 잉여금이나 자본 잉여금으로도 손실을 보전할 수 없는 경우에는 자본금을 사용하게 된다."
    },
    {
      "source": "PASSAGE",
      "quote": "자본금의 감소는 회사의 존립을 위태롭게 하므로 신중한 자산 운용이 이루어져야 한다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "DIRECTION"
  ],
  "attractionMechanism": "적자 누적에서 이익 잉여금·자본 잉여금의 손실 보전, 자본금 사용, 자본금 감소의 위험으로 이어지는 흐름을 적용하면 선지의 가능성 진술은 타당하다. 자본금 감소가 원칙적으로 금지된다는 내용을 떠올려 이 흐름 자체가 불가능하다고 판단하거나, 발문이 부적절한 것을 묻는다는 점을 놓치면 고를 수 있다.",
  "predictedSelectionPercent": 14
}
```

##### C5

태그: ["POLARITY","ATTRIBUTION","CONDITION"]

유인 경로 원문:

법인 자산은 법인에 귀속되고, 권한 있는 사람이 정해진 절차에 따라 운용해야 한다는 내용을 적용하면 절차를 거치지 않은 자산 처분에 법적 책임이 생길 수 있다. 갑이 설립 때 재산을 출연했다는 사실만으로 그 재산을 개인 자산처럼 처분할 권한이 있다고 오해하거나, 대표 이사라는 지위만으로 절차 요건이 면제된다고 보면 이 선지를 부적절하다고 판단할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "다만 법인은 행위 능력이 없으므로 실제 자산의 운용은 법인의 정관*이나 법령에서 권한을 부여한 사람에 의해 이루어진다."
    },
    {
      "source": "PASSAGE",
      "quote": "이때 정해진 절차에 어긋나거나 법인의 목적과는 다르게 자산을 운용하면 법적으로 처벌받을 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "한편 A의 설립자이자 현재 대표 이사인 갑은 회사의 평판을 개선하기 위해 회사를 설립할 당시에 자신이 출연했던 부동산을 기부하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "ATTRIBUTION",
    "CONDITION"
  ],
  "attractionMechanism": "법인 자산은 법인에 귀속되고, 권한 있는 사람이 정해진 절차에 따라 운용해야 한다는 내용을 적용하면 절차를 거치지 않은 자산 처분에 법적 책임이 생길 수 있다. 갑이 설립 때 재산을 출연했다는 사실만으로 그 재산을 개인 자산처럼 처분할 권한이 있다고 오해하거나, 대표 이사라는 지위만으로 절차 요건이 면제된다고 보면 이 선지를 부적절하다고 판단할 수 있다.",
  "predictedSelectionPercent": 9
}
```

### gpt-6.1-sol

평균 예측 C1~C5: 9.67, 63.33, 13.67, 6.67, 6.67

#### r1: VALID

##### C1

태그: ["MAPPING","PARAPHRASE_DISTANCE"]

유인 경로 원문:

〈보기〉의 ‘사업 투자나 이익 분배를 위해 적립해 두었던 재원’을 이익 잉여금에 대응하지 못하면, 배당 보류의 원인을 이익 잉여금 부족으로 특정한 선지가 근거 없는 해석처럼 보일 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이익 잉여금은 영업 활동에서 발생한 이익 중 사용되지 않고 유보된 재원으로, 주주들에게 이익을 분배하는 행위인 배당을 통해 배당금으로 지급되거나 사업 투자, 손실 보전 등을 목적으로 비교적 자유롭게 활용될 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "주식회사 A는 경영 부진으로 인해 적자가 누적되어 새로운 사업 투자나 이익 분배를 위해 적립해 두었던 재원이 크게 줄어들었다."
    },
    {
      "source": "SCENARIO",
      "quote": "이사회는 현 상황에 대한 주주들의 불만을 잠재우기 위해 회사의 영업 이익을 분배하는 방안을 검토하였으나 필요한 재원의 부족으로 실행을 보류하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "PHRASE",
  "attractionTags": [
    "MAPPING",
    "PARAPHRASE_DISTANCE"
  ],
  "attractionMechanism": "〈보기〉의 ‘사업 투자나 이익 분배를 위해 적립해 두었던 재원’을 이익 잉여금에 대응하지 못하면, 배당 보류의 원인을 이익 잉여금 부족으로 특정한 선지가 근거 없는 해석처럼 보일 수 있다.",
  "predictedSelectionPercent": 11
}
```

##### C2

태그: []

유인 경로 원문:

법인격을 부여받는 대상은 갑 개인이 아니라 구성원 단체인 A이며, 갑의 자산 운용 권한은 개인 재산 출연이 아니라 정관이나 법령에 근거한다. 선지는 법인격의 귀속 대상과 자산 운용 권한의 근거를 뒤바꾸었다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "다만 법인은 행위 능력이 없으므로 실제 자산의 운용은 법인의 정관*이나 법령에서 권한을 부여한 사람에 의해 이루어진다."
    },
    {
      "source": "PASSAGE",
      "quote": "주식회사는 사단 법인이면서 영리 법인으로, 법인격은 주식회사의 구성원 단체에 부여된다."
    },
    {
      "source": "SCENARIO",
      "quote": "한편 A의 설립자이자 현재 대표 이사인 갑은 회사의 평판을 개선하기 위해 회사를 설립할 당시에 자신이 출연했던 부동산을 기부하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "ATTRIBUTION_SWAP",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "법인격을 부여받는 대상은 갑 개인이 아니라 구성원 단체인 A이며, 갑의 자산 운용 권한은 개인 재산 출연이 아니라 정관이나 법령에 근거한다. 선지는 법인격의 귀속 대상과 자산 운용 권한의 근거를 뒤바꾸었다.",
  "predictedSelectionPercent": 64
}
```

##### C3

태그: ["MULTI_STEP","OUTSIDE_KNOWLEDGE","MAPPING"]

유인 경로 원문:

주가가 하락한 회사는 자본 거래로 이익을 얻기 어렵다는 상식에 기대면 ‘고려할 수 있다’는 가능성 진술까지 부정할 수 있다. 영리 법인의 목적과 자본 거래 이익의 존재를 결합하면 선지는 타당하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "주식회사는 사단 법인이면서 영리 법인으로, 법인격은 주식회사의 구성원 단체에 부여된다."
    },
    {
      "source": "PASSAGE",
      "quote": "자본 잉여금은 주식 등 자본을 거래하여 얻은 이익으로 손실 보전 등의 제한된 목적으로만 사용될 수 있고, 배당금으로 지급될 수 없다."
    },
    {
      "source": "PASSAGE",
      "quote": "주식회사의 자산 운용은 각 항목의 특성에 따라 이익을 극대화하는 방향으로 이루어지는데, 적자가 누적되어 이익 잉여금이나 자본 잉여금으로도 손실을 보전할 수 없는 경우에는 자본금을 사용하게 된다."
    },
    {
      "source": "SCENARIO",
      "quote": "이러한 사실이 알려지면서 신용도가 낮아져서 주가가 하락하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MULTI_STEP",
    "OUTSIDE_KNOWLEDGE",
    "MAPPING"
  ],
  "attractionMechanism": "주가가 하락한 회사는 자본 거래로 이익을 얻기 어렵다는 상식에 기대면 ‘고려할 수 있다’는 가능성 진술까지 부정할 수 있다. 영리 법인의 목적과 자본 거래 이익의 존재를 결합하면 선지는 타당하다.",
  "predictedSelectionPercent": 13
}
```

##### C4

태그: ["CONDITION","MULTI_STEP"]

유인 경로 원문:

선지에 자본 잉여금이 직접 언급되지 않았다는 점만 보고 손실 보전 조건이 누락되었다고 판단할 수 있다. 그러나 ‘이후 더 이상 누적된 적자를 해소할 수 없게 되면’은 다른 재원으로도 손실을 보전하지 못하는 상황을 포괄한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "주식회사의 자산 운용은 각 항목의 특성에 따라 이익을 극대화하는 방향으로 이루어지는데, 적자가 누적되어 이익 잉여금이나 자본 잉여금으로도 손실을 보전할 수 없는 경우에는 자본금을 사용하게 된다."
    },
    {
      "source": "PASSAGE",
      "quote": "자본금의 감소는 회사의 존립을 위태롭게 하므로 신중한 자산 운용이 이루어져야 한다."
    },
    {
      "source": "SCENARIO",
      "quote": "주식회사 A는 경영 부진으로 인해 적자가 누적되어 새로운 사업 투자나 이익 분배를 위해 적립해 두었던 재원이 크게 줄어들었다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "MULTI_STEP"
  ],
  "attractionMechanism": "선지에 자본 잉여금이 직접 언급되지 않았다는 점만 보고 손실 보전 조건이 누락되었다고 판단할 수 있다. 그러나 ‘이후 더 이상 누적된 적자를 해소할 수 없게 되면’은 다른 재원으로도 손실을 보전하지 못하는 상황을 포괄한다.",
  "predictedSelectionPercent": 7
}
```

##### C5

태그: ["REFERENT","CONDITION","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

갑이 출연한 부동산을 여전히 갑의 개인 재산으로 보거나, 대표 이사의 권한을 절차 제한 없는 처분 권한으로 이해하면 법적 책임의 가능성을 부정할 수 있다. 법인의 독립된 권리와 자산 운용에 대한 절차적 통제는 양립한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "따라서 법인의 자산이 개인의 출자에 의해 형성되었더라도 자산의 소유권은 특정 개인이 아닌 법인에게 귀속된다."
    },
    {
      "source": "PASSAGE",
      "quote": "이때 정해진 절차에 어긋나거나 법인의 목적과는 다르게 자산을 운용하면 법적으로 처벌받을 수 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "자산 운용의 권한은 이사회나 주주 총회, 특정 개인에게 주어지고 이들은 정해진 법령 내에서 결정권을 행사할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "한편 A의 설립자이자 현재 대표 이사인 갑은 회사의 평판을 개선하기 위해 회사를 설립할 당시에 자신이 출연했던 부동산을 기부하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "CONDITION",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "갑이 출연한 부동산을 여전히 갑의 개인 재산으로 보거나, 대표 이사의 권한을 절차 제한 없는 처분 권한으로 이해하면 법적 책임의 가능성을 부정할 수 있다. 법인의 독립된 권리와 자산 운용에 대한 절차적 통제는 양립한다.",
  "predictedSelectionPercent": 5
}
```

#### r2: VALID

##### C1

태그: ["MAPPING","PARAPHRASE_DISTANCE"]

유인 경로 원문:

〈보기〉의 ‘적립해 두었던 재원’을 이익 잉여금에 대응시키지 못하면, 배당 보류의 원인을 이익 잉여금 부족으로 특정한 것이 근거 없는 해석이라고 판단할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이익 잉여금은 영업 활동에서 발생한 이익 중 사용되지 않고 유보된 재원으로, 주주들에게 이익을 분배하는 행위인 배당을 통해 배당금으로 지급되거나 사업 투자, 손실 보전 등을 목적으로 비교적 자유롭게 활용될 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "주식회사 A는 경영 부진으로 인해 적자가 누적되어 새로운 사업 투자나 이익 분배를 위해 적립해 두었던 재원이 크게 줄어들었다."
    },
    {
      "source": "SCENARIO",
      "quote": "이사회는 현 상황에 대한 주주들의 불만을 잠재우기 위해 회사의 영업 이익을 분배하는 방안을 검토하였으나 필요한 재원의 부족으로 실행을 보류하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MAPPING",
    "PARAPHRASE_DISTANCE"
  ],
  "attractionMechanism": "〈보기〉의 ‘적립해 두었던 재원’을 이익 잉여금에 대응시키지 못하면, 배당 보류의 원인을 이익 잉여금 부족으로 특정한 것이 근거 없는 해석이라고 판단할 수 있다.",
  "predictedSelectionPercent": 9
}
```

##### C2

태그: []

유인 경로 원문:

갑의 자산 운용 권한은 개인 재산 출연이나 주주들의 법인격 부여에서 생기는 것이 아니라 정관이나 법령에 근거한다. 법인격의 귀속 대상도 갑 개인이 아닌 구성원 단체라는 점을 구별해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "다만 법인은 행위 능력이 없으므로 실제 자산의 운용은 법인의 정관*이나 법령에서 권한을 부여한 사람에 의해 이루어진다."
    },
    {
      "source": "PASSAGE",
      "quote": "따라서 법인의 자산이 개인의 출자에 의해 형성되었더라도 자산의 소유권은 특정 개인이 아닌 법인에게 귀속된다."
    },
    {
      "source": "PASSAGE",
      "quote": "주식회사는 사단 법인이면서 영리 법인으로, 법인격은 주식회사의 구성원 단체에 부여된다."
    },
    {
      "source": "SCENARIO",
      "quote": "한편 A의 설립자이자 현재 대표 이사인 갑은 회사의 평판을 개선하기 위해 회사를 설립할 당시에 자신이 출연했던 부동산을 기부하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "ATTRIBUTION_SWAP",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "갑의 자산 운용 권한은 개인 재산 출연이나 주주들의 법인격 부여에서 생기는 것이 아니라 정관이나 법령에 근거한다. 법인격의 귀속 대상도 갑 개인이 아닌 구성원 단체라는 점을 구별해야 한다.",
  "predictedSelectionPercent": 64
}
```

##### C3

태그: ["OUTSIDE_KNOWLEDGE","MULTI_STEP","CONDITION"]

유인 경로 원문:

주가가 하락하면 자본 거래로 이익을 얻을 수 없다는 상식적 판단을 앞세워, ‘고려할 수 있다’를 반드시 이익을 얻는다는 주장으로 강화해 읽을 수 있다. 영리 목적과 자본 거래 이익의 활용 가능성을 연결하면 적절한 진술이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "주식회사는 사단 법인이면서 영리 법인으로, 법인격은 주식회사의 구성원 단체에 부여된다."
    },
    {
      "source": "PASSAGE",
      "quote": "자본 잉여금은 주식 등 자본을 거래하여 얻은 이익으로 손실 보전 등의 제한된 목적으로만 사용될 수 있고, 배당금으로 지급될 수 없다."
    },
    {
      "source": "PASSAGE",
      "quote": "주식회사의 자산 운용은 각 항목의 특성에 따라 이익을 극대화하는 방향으로 이루어지는데, 적자가 누적되어 이익 잉여금이나 자본 잉여금으로도 손실을 보전할 수 없는 경우에는 자본금을 사용하게 된다."
    },
    {
      "source": "SCENARIO",
      "quote": "이러한 사실이 알려지면서 신용도가 낮아져서 주가가 하락하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "OUTSIDE_KNOWLEDGE",
    "MULTI_STEP",
    "CONDITION"
  ],
  "attractionMechanism": "주가가 하락하면 자본 거래로 이익을 얻을 수 없다는 상식적 판단을 앞세워, ‘고려할 수 있다’를 반드시 이익을 얻는다는 주장으로 강화해 읽을 수 있다. 영리 목적과 자본 거래 이익의 활용 가능성을 연결하면 적절한 진술이다.",
  "predictedSelectionPercent": 13
}
```

##### C4

태그: ["CONDITION","MULTI_STEP"]

유인 경로 원문:

선지에 자본 잉여금이 명시되지 않았다는 점만 보고 손실 보전 조건을 누락했다고 판단할 수 있다. 그러나 ‘이후 더 이상 누적된 적자를 해소할 수 없게 되면’이라는 조건까지 읽으면, 자본금 사용과 존립 위험으로 이어지는 추론은 타당하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "주식회사의 자산 운용은 각 항목의 특성에 따라 이익을 극대화하는 방향으로 이루어지는데, 적자가 누적되어 이익 잉여금이나 자본 잉여금으로도 손실을 보전할 수 없는 경우에는 자본금을 사용하게 된다."
    },
    {
      "source": "PASSAGE",
      "quote": "자본금의 감소는 회사의 존립을 위태롭게 하므로 신중한 자산 운용이 이루어져야 한다."
    },
    {
      "source": "SCENARIO",
      "quote": "주식회사 A는 경영 부진으로 인해 적자가 누적되어 새로운 사업 투자나 이익 분배를 위해 적립해 두었던 재원이 크게 줄어들었다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "MULTI_STEP"
  ],
  "attractionMechanism": "선지에 자본 잉여금이 명시되지 않았다는 점만 보고 손실 보전 조건을 누락했다고 판단할 수 있다. 그러나 ‘이후 더 이상 누적된 적자를 해소할 수 없게 되면’이라는 조건까지 읽으면, 자본금 사용과 존립 위험으로 이어지는 추론은 타당하다.",
  "predictedSelectionPercent": 6
}
```

##### C5

태그: ["ATTRIBUTION","CONDITION","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

갑이 출연한 부동산이라는 이유로 개인 소유물처럼 생각하거나, 대표 이사의 운용 권한을 절차 제한 없는 권한으로 이해하면 법적 책임의 가능성을 부정할 수 있다. 법인 소유 자산을 정해진 절차에 어긋나게 운용하면 책임이 발생할 수 있다는 진술이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "따라서 법인의 자산이 개인의 출자에 의해 형성되었더라도 자산의 소유권은 특정 개인이 아닌 법인에게 귀속된다."
    },
    {
      "source": "PASSAGE",
      "quote": "이때 정해진 절차에 어긋나거나 법인의 목적과는 다르게 자산을 운용하면 법적으로 처벌받을 수 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "자산 운용의 권한은 이사회나 주주 총회, 특정 개인에게 주어지고 이들은 정해진 법령 내에서 결정권을 행사할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "한편 A의 설립자이자 현재 대표 이사인 갑은 회사의 평판을 개선하기 위해 회사를 설립할 당시에 자신이 출연했던 부동산을 기부하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "ATTRIBUTION",
    "CONDITION",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "갑이 출연한 부동산이라는 이유로 개인 소유물처럼 생각하거나, 대표 이사의 운용 권한을 절차 제한 없는 권한으로 이해하면 법적 책임의 가능성을 부정할 수 있다. 법인 소유 자산을 정해진 절차에 어긋나게 운용하면 책임이 발생할 수 있다는 진술이다.",
  "predictedSelectionPercent": 8
}
```

#### r3: VALID

##### C1

태그: ["MAPPING","PARAPHRASE_DISTANCE"]

유인 경로 원문:

〈보기〉의 ‘적립해 두었던 재원’을 이익 잉여금에 대응시키지 못하거나, 적자가 발생했다는 사실과 배당 재원의 부족을 별개로 보아 타당한 설명을 부적절하다고 판단할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이익 잉여금은 영업 활동에서 발생한 이익 중 사용되지 않고 유보된 재원으로, 주주들에게 이익을 분배하는 행위인 배당을 통해 배당금으로 지급되거나 사업 투자, 손실 보전 등을 목적으로 비교적 자유롭게 활용될 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "주식회사 A는 경영 부진으로 인해 적자가 누적되어 새로운 사업 투자나 이익 분배를 위해 적립해 두었던 재원이 크게 줄어들었다."
    },
    {
      "source": "SCENARIO",
      "quote": "이사회는 현 상황에 대한 주주들의 불만을 잠재우기 위해 회사의 영업 이익을 분배하는 방안을 검토하였으나 필요한 재원의 부족으로 실행을 보류하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MAPPING",
    "PARAPHRASE_DISTANCE"
  ],
  "attractionMechanism": "〈보기〉의 ‘적립해 두었던 재원’을 이익 잉여금에 대응시키지 못하거나, 적자가 발생했다는 사실과 배당 재원의 부족을 별개로 보아 타당한 설명을 부적절하다고 판단할 수 있다.",
  "predictedSelectionPercent": 9
}
```

##### C2

태그: []

유인 경로 원문:

개인 재산의 출연이 자산 운용 권한을 발생시키는 것은 아니다. 갑의 권한은 정관이나 법령에 근거하며, 구성원 단체에 법인격이 부여된다는 것을 주주들이 갑에게 법인격을 부여한다는 의미로 바꿀 수도 없다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "따라서 법인의 자산이 개인의 출자에 의해 형성되었더라도 자산의 소유권은 특정 개인이 아닌 법인에게 귀속된다."
    },
    {
      "source": "PASSAGE",
      "quote": "다만 법인은 행위 능력이 없으므로 실제 자산의 운용은 법인의 정관*이나 법령에서 권한을 부여한 사람에 의해 이루어진다."
    },
    {
      "source": "PASSAGE",
      "quote": "주식회사는 사단 법인이면서 영리 법인으로, 법인격은 주식회사의 구성원 단체에 부여된다."
    },
    {
      "source": "SCENARIO",
      "quote": "한편 A의 설립자이자 현재 대표 이사인 갑은 회사의 평판을 개선하기 위해 회사를 설립할 당시에 자신이 출연했던 부동산을 기부하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "UNSUPPORTED_ADDITION",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "개인 재산의 출연이 자산 운용 권한을 발생시키는 것은 아니다. 갑의 권한은 정관이나 법령에 근거하며, 구성원 단체에 법인격이 부여된다는 것을 주주들이 갑에게 법인격을 부여한다는 의미로 바꿀 수도 없다.",
  "predictedSelectionPercent": 62
}
```

##### C3

태그: ["OUTSIDE_KNOWLEDGE","CONDITION","MULTI_STEP"]

유인 경로 원문:

신용도와 주가가 하락하면 자본 거래로 이익을 얻을 수 없다는 조건을 임의로 덧붙여 선지를 배제할 수 있다. 그러나 선지는 이익 획득의 성공을 단정하지 않고, 영리 목적과 손실 보전을 위해 그 방법을 고려할 수 있다고만 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "주식회사는 사단 법인이면서 영리 법인으로, 법인격은 주식회사의 구성원 단체에 부여된다."
    },
    {
      "source": "PASSAGE",
      "quote": "자본 잉여금은 주식 등 자본을 거래하여 얻은 이익으로 손실 보전 등의 제한된 목적으로만 사용될 수 있고, 배당금으로 지급될 수 없다."
    },
    {
      "source": "PASSAGE",
      "quote": "주식회사의 자산 운용은 각 항목의 특성에 따라 이익을 극대화하는 방향으로 이루어지는데, 적자가 누적되어 이익 잉여금이나 자본 잉여금으로도 손실을 보전할 수 없는 경우에는 자본금을 사용하게 된다."
    },
    {
      "source": "SCENARIO",
      "quote": "이러한 사실이 알려지면서 신용도가 낮아져서 주가가 하락하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "OUTSIDE_KNOWLEDGE",
    "CONDITION",
    "MULTI_STEP"
  ],
  "attractionMechanism": "신용도와 주가가 하락하면 자본 거래로 이익을 얻을 수 없다는 조건을 임의로 덧붙여 선지를 배제할 수 있다. 그러나 선지는 이익 획득의 성공을 단정하지 않고, 영리 목적과 손실 보전을 위해 그 방법을 고려할 수 있다고만 한다.",
  "predictedSelectionPercent": 15
}
```

##### C4

태그: ["CONDITION","MULTI_STEP"]

유인 경로 원문:

선지에 자본 잉여금이 명시되지 않았다는 점만 보고, 이익 잉여금 소진 직후 곧바로 자본금이 감소한다고 오독할 수 있다. ‘이후 더 이상 누적된 적자를 해소할 수 없게 되면’이라는 추가 조건은 다른 재원으로도 손실을 보전하지 못하는 상황을 포함한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "주식회사의 자산 운용은 각 항목의 특성에 따라 이익을 극대화하는 방향으로 이루어지는데, 적자가 누적되어 이익 잉여금이나 자본 잉여금으로도 손실을 보전할 수 없는 경우에는 자본금을 사용하게 된다."
    },
    {
      "source": "PASSAGE",
      "quote": "자본금의 감소는 회사의 존립을 위태롭게 하므로 신중한 자산 운용이 이루어져야 한다."
    },
    {
      "source": "SCENARIO",
      "quote": "주식회사 A는 경영 부진으로 인해 적자가 누적되어 새로운 사업 투자나 이익 분배를 위해 적립해 두었던 재원이 크게 줄어들었다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "MULTI_STEP"
  ],
  "attractionMechanism": "선지에 자본 잉여금이 명시되지 않았다는 점만 보고, 이익 잉여금 소진 직후 곧바로 자본금이 감소한다고 오독할 수 있다. ‘이후 더 이상 누적된 적자를 해소할 수 없게 되면’이라는 추가 조건은 다른 재원으로도 손실을 보전하지 못하는 상황을 포함한다.",
  "predictedSelectionPercent": 7
}
```

##### C5

태그: ["REFERENT","SCOPE","MULTI_STEP"]

유인 경로 원문:

갑이 출연한 부동산을 여전히 갑 개인의 재산으로 보거나, 대표 이사의 자산 운용 권한을 절차에 구속되지 않는 권한으로 확대하면 법적 책임의 가능성을 부정하게 된다. 법인의 독립된 권리와 자산 운용에 대한 법적 통제는 함께 성립한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "법인은 자신의 이름으로 권리와 의무의 주체가 되어 자산을 운용할 수 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "따라서 법인의 자산이 개인의 출자에 의해 형성되었더라도 자산의 소유권은 특정 개인이 아닌 법인에게 귀속된다."
    },
    {
      "source": "PASSAGE",
      "quote": "이때 정해진 절차에 어긋나거나 법인의 목적과는 다르게 자산을 운용하면 법적으로 처벌받을 수 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "자산 운용의 권한은 이사회나 주주 총회, 특정 개인에게 주어지고 이들은 정해진 법령 내에서 결정권을 행사할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "한편 A의 설립자이자 현재 대표 이사인 갑은 회사의 평판을 개선하기 위해 회사를 설립할 당시에 자신이 출연했던 부동산을 기부하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "SCOPE",
    "MULTI_STEP"
  ],
  "attractionMechanism": "갑이 출연한 부동산을 여전히 갑 개인의 재산으로 보거나, 대표 이사의 자산 운용 권한을 절차에 구속되지 않는 권한으로 확대하면 법적 책임의 가능성을 부정하게 된다. 법인의 독립된 권리와 자산 운용에 대한 법적 통제는 함께 성립한다.",
  "predictedSelectionPercent": 7
}
```

## dopamine-motor-control-q13 (USED)

정답: C2

실제 화작 C1~C5: 16.00, 24.00, 26.00, 24.00, 10.00
실제 언매 C1~C5: 16.00, 33.00, 21.00, 21.00, 8.00

### gpt-6-luna

평균 예측 C1~C5: 8.67, 64.33, 7.67, 12.00, 7.33

#### r1: VALID

##### C1

태그: ["REFERENT","SURFACE_MATCH"]

유인 경로 원문:

도파민이 혈액-뇌 장벽을 통과하지 못한다는 문장에 주목해 레보도파도 뇌에 들어갈 수 없다고 판단할 수 있다. 하지만 약물은 도파민 자체가 아니라 레보도파이며, 시나리오는 레보도파가 흑질의 도파민성 뉴런으로 흡수된다고 제시한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "음식이나 약물로 도파민을 섭취할 수 있으나 이렇게 체내로 유입된 도파민은 혈액-뇌 장벽을 통과할 수 없다."
    },
    {
      "source": "SCENARIO",
      "quote": "레보도파: 흑질의 도파민성 뉴런으로 흡수되어 도파민 합성을 증가시킴."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "도파민이 혈액-뇌 장벽을 통과하지 못한다는 문장에 주목해 레보도파도 뇌에 들어갈 수 없다고 판단할 수 있다. 하지만 약물은 도파민 자체가 아니라 레보도파이며, 시나리오는 레보도파가 흑질의 도파민성 뉴런으로 흡수된다고 제시한다.",
  "predictedSelectionPercent": 8
}
```

##### C2

태그: []

유인 경로 원문:

카르비도파가 효소를 억제한다는 사실만으로 도파민의 작용 기간도 연장한다고 볼 수 있는지 따져야 한다. 카르비도파가 억제하는 것은 말초 조직에서 레보도파를 도파민으로 합성하는 과정이며, 흑질에서 이미 합성된 도파민에 작용하지 않는다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "카르비도파: 레보도파를 도파민으로 합성하는 효소의 작용을 억제하며 혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함."
    },
    {
      "source": "PASSAGE",
      "quote": "도파민성 뉴런에서 합성된 도파민만이 뇌의 신경 경로를 따라 이동하며 신경 전달 물질로 작용할 수 있다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "CONDITION_CHANGE",
  "transformSize": "PHRASE",
  "attractionTags": [],
  "attractionMechanism": "카르비도파가 효소를 억제한다는 사실만으로 도파민의 작용 기간도 연장한다고 볼 수 있는지 따져야 한다. 카르비도파가 억제하는 것은 말초 조직에서 레보도파를 도파민으로 합성하는 과정이며, 흑질에서 이미 합성된 도파민에 작용하지 않는다.",
  "predictedSelectionPercent": 62
}
```

##### C3

태그: ["MAPPING","MULTI_STEP"]

유인 경로 원문:

도파민 수용체에 작용하는 약물이 뉴런의 기능을 바꾼다는 점을 도파민 합성 자체를 바꾸는 것으로 연결하면 이 선지를 부적절하다고 볼 수 있다. 그러나 프라미펙솔은 선조체 뉴런의 수용체에 결합해 도파민처럼 기능할 뿐, 도파민성 뉴런의 합성 과정에 관여한다고 제시되지 않는다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "프라미펙솔: 선조체 뉴런의 도파민 수용체에 결합하여 뉴런에 도파민이 결합된 것처럼 기능하게 함."
    },
    {
      "source": "PASSAGE",
      "quote": "도파민을 비롯한 신경 전달 물질은 시냅스 틈을 사이에 두고 연결해 있는 뉴런 간의 신호 전달을 매개한다."
    },
    {
      "source": "PASSAGE",
      "quote": "도파민은 운동 조절, 보상 및 동기 부여 등에 관여하는 신경 전달 물질로 뇌에 존재하는 도파민성 뉴런에서 합성된다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MAPPING",
    "MULTI_STEP"
  ],
  "attractionMechanism": "도파민 수용체에 작용하는 약물이 뉴런의 기능을 바꾼다는 점을 도파민 합성 자체를 바꾸는 것으로 연결하면 이 선지를 부적절하다고 볼 수 있다. 그러나 프라미펙솔은 선조체 뉴런의 수용체에 결합해 도파민처럼 기능할 뿐, 도파민성 뉴런의 합성 과정에 관여한다고 제시되지 않는다.",
  "predictedSelectionPercent": 8
}
```

##### C4

태그: ["CONDITION","DIRECTION"]

유인 경로 원문:

카르비도파가 레보도파의 도파민 합성을 억제한다는 부분만 보고 뇌에서의 도파민 합성까지 막는다고 오해할 수 있다. 하지만 카르비도파는 말초 조직에서만 작용하므로, 말초에서 레보도파가 소모되는 것을 줄여 뇌로 전달되는 양을 늘린다는 추론이 타당하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "레보도파: 흑질의 도파민성 뉴런으로 흡수되어 도파민 합성을 증가시킴. 투여된 레보도파의 상당량은 뇌로 전달되기 전에 말초 조직에서 도파민으로 합성됨."
    },
    {
      "source": "SCENARIO",
      "quote": "카르비도파: 레보도파를 도파민으로 합성하는 효소의 작용을 억제하며 혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함."
    }
  ],
  "evidenceSpan": "SAME_PARAGRAPH",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "DIRECTION"
  ],
  "attractionMechanism": "카르비도파가 레보도파의 도파민 합성을 억제한다는 부분만 보고 뇌에서의 도파민 합성까지 막는다고 오해할 수 있다. 하지만 카르비도파는 말초 조직에서만 작용하므로, 말초에서 레보도파가 소모되는 것을 줄여 뇌로 전달되는 양을 늘린다는 추론이 타당하다.",
  "predictedSelectionPercent": 14
}
```

##### C5

태그: ["SCOPE","CONDITION"]

유인 경로 원문:

완치가 불가능하다는 설명을 증상 완화도 불가능하다는 뜻으로 확대 해석하거나, 약물을 병용할 수 있다는 조건을 놓치면 이 선지를 부적절하다고 판단할 수 있다. 그러나 레보도파는 도파민 합성을 늘리고 프라미펙솔은 수용체에서 도파민처럼 기능하며, 약물 병용도 허용된다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "도파민성 뉴런이 파괴되는 것의 진행을 막을 수는 없기 때문에 병의 완치는 불가능하지만, 약물 치료를 통해 병의 증상을 완화할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "두 가지 이상의 약물을 병용할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "레보도파: 흑질의 도파민성 뉴런으로 흡수되어 도파민 합성을 증가시킴."
    },
    {
      "source": "SCENARIO",
      "quote": "프라미펙솔: 선조체 뉴런의 도파민 수용체에 결합하여 뉴런에 도파민이 결합된 것처럼 기능하게 함."
    }
  ],
  "evidenceSpan": "SAME_PARAGRAPH",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "SCOPE",
    "CONDITION"
  ],
  "attractionMechanism": "완치가 불가능하다는 설명을 증상 완화도 불가능하다는 뜻으로 확대 해석하거나, 약물을 병용할 수 있다는 조건을 놓치면 이 선지를 부적절하다고 판단할 수 있다. 그러나 레보도파는 도파민 합성을 늘리고 프라미펙솔은 수용체에서 도파민처럼 기능하며, 약물 병용도 허용된다.",
  "predictedSelectionPercent": 8
}
```

#### r2: VALID

##### C1

태그: ["POLARITY","SURFACE_MATCH","CONDITION"]

유인 경로 원문:

발문의 ‘적절하지 않은 것’을 놓치면 답으로 고를 수 있다. 도파민이 혈액-뇌 장벽을 통과하지 못한다는 문구에 주목해 레보도파도 통과하지 못한다고 판단하지만, 시나리오는 레보도파가 흑질의 도파민성 뉴런으로 흡수된다고 제시한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "음식이나 약물로 도파민을 섭취할 수 있으나 이렇게 체내로 유입된 도파민은 혈액-뇌 장벽을 통과할 수 없다."
    },
    {
      "source": "SCENARIO",
      "quote": "레보도파: 흑질의 도파민성 뉴런으로 흡수되어 도파민 합성을 증가시킴."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "SURFACE_MATCH",
    "CONDITION"
  ],
  "attractionMechanism": "발문의 ‘적절하지 않은 것’을 놓치면 답으로 고를 수 있다. 도파민이 혈액-뇌 장벽을 통과하지 못한다는 문구에 주목해 레보도파도 통과하지 못한다고 판단하지만, 시나리오는 레보도파가 흑질의 도파민성 뉴런으로 흡수된다고 제시한다.",
  "predictedSelectionPercent": 8
}
```

##### C2

태그: []

유인 경로 원문:

카르비도파는 말초에서 레보도파가 도파민으로 합성되는 것을 억제할 뿐, 혈액-뇌 장벽을 통과해 흑질에서 이미 합성된 도파민의 작용 기간을 늘리지는 못한다. 효소 억제라는 표면적 공통점과 작용 대상을 구별하면 부적절한 진술임을 판단할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "카르비도파: 레보도파를 도파민으로 합성하는 효소의 작용을 억제하며 혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함."
    },
    {
      "source": "PASSAGE",
      "quote": "레보도파는 또 다른 효소에 의해 도파민으로 합성된다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "MAPPING_SHIFT",
  "transformSize": "PHRASE",
  "attractionTags": [],
  "attractionMechanism": "카르비도파는 말초에서 레보도파가 도파민으로 합성되는 것을 억제할 뿐, 혈액-뇌 장벽을 통과해 흑질에서 이미 합성된 도파민의 작용 기간을 늘리지는 못한다. 효소 억제라는 표면적 공통점과 작용 대상을 구별하면 부적절한 진술임을 판단할 수 있다.",
  "predictedSelectionPercent": 68
}
```

##### C3

태그: ["POLARITY","REFERENT"]

유인 경로 원문:

발문의 부정 방향을 놓치면 답으로 선택할 수 있다. 프라미펙솔이 선조체 뉴런의 수용체에 작용한다는 점과 도파민 합성의 주체인 도파민성 뉴런을 혼동하면, 약물이 합성 과정에도 영향을 준다고 오판할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "프라미펙솔: 선조체 뉴런의 도파민 수용체에 결합하여 뉴런에 도파민이 결합된 것처럼 기능하게 함."
    },
    {
      "source": "PASSAGE",
      "quote": "도파민성 뉴런에서 합성된 도파민만이 뇌의 신경 경로를 따라 이동하며 신경 전달 물질로 작용할 수 있다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "REFERENT"
  ],
  "attractionMechanism": "발문의 부정 방향을 놓치면 답으로 선택할 수 있다. 프라미펙솔이 선조체 뉴런의 수용체에 작용한다는 점과 도파민 합성의 주체인 도파민성 뉴런을 혼동하면, 약물이 합성 과정에도 영향을 준다고 오판할 수 있다.",
  "predictedSelectionPercent": 7
}
```

##### C4

태그: ["POLARITY"]

유인 경로 원문:

두 약물의 작용을 결합하면 말초에서 레보도파가 도파민으로 바뀌는 것을 줄여 뇌로 전달되는 레보도파의 양을 늘릴 수 있다. 발문의 부정 방향을 놓치면 이 적절한 진술을 답으로 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "투여된 레보도파의 상당량은 뇌로 전달되기 전에 말초 조직에서 도파민으로 합성됨."
    },
    {
      "source": "SCENARIO",
      "quote": "혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함."
    }
  ],
  "evidenceSpan": "SAME_PARAGRAPH",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY"
  ],
  "attractionMechanism": "두 약물의 작용을 결합하면 말초에서 레보도파가 도파민으로 바뀌는 것을 줄여 뇌로 전달되는 레보도파의 양을 늘릴 수 있다. 발문의 부정 방향을 놓치면 이 적절한 진술을 답으로 고를 수 있다.",
  "predictedSelectionPercent": 10
}
```

##### C5

태그: ["POLARITY","MULTI_STEP"]

유인 경로 원문:

질환 진행에 따른 증상 완화라는 조건, 레보도파의 도파민 합성 증가 효과, 약물 병용 가능성을 연결하면 레보도파 증량 또는 프라미펙솔과의 병용이 가능하다는 판단에 이른다. 이 진술은 적절하므로, 발문의 부정 방향을 놓친 경우에만 답으로 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "도파민성 뉴런이 파괴되는 것의 진행을 막을 수는 없기 때문에 병의 완치는 불가능하지만, 약물 치료를 통해 병의 증상을 완화할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "두 가지 이상의 약물을 병용할 수 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "흑질의 도파민성 뉴런에서 분비된 도파민은 직접 경로를 활성화하고 간접 경로는 억제하여 목표하는 운동의 시작을 수월하게 함으로써 운동을 촉진하게 된다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "MULTI_STEP"
  ],
  "attractionMechanism": "질환 진행에 따른 증상 완화라는 조건, 레보도파의 도파민 합성 증가 효과, 약물 병용 가능성을 연결하면 레보도파 증량 또는 프라미펙솔과의 병용이 가능하다는 판단에 이른다. 이 진술은 적절하므로, 발문의 부정 방향을 놓친 경우에만 답으로 고를 수 있다.",
  "predictedSelectionPercent": 7
}
```

#### r3: VALID

##### C1

태그: ["POLARITY","REFERENT","SURFACE_MATCH"]

유인 경로 원문:

‘도파민은 혈액-뇌 장벽을 통과할 수 없다’는 구절을 레보도파에도 적용하면 이 진술을 부적절하다고 오판할 수 있다. 그러나 선지는 도파민이 아니라 레보도파를 가리키며, 시나리오는 레보도파가 흑질의 도파민성 뉴런으로 흡수된다고 제시한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이렇게 체내로 유입된 도파민은 혈액-뇌 장벽을 통과할 수 없다."
    },
    {
      "source": "SCENARIO",
      "quote": "흑질의 도파민성 뉴런으로 흡수되어 도파민 합성을 증가시킴."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "PHRASE",
  "attractionTags": [
    "POLARITY",
    "REFERENT",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "‘도파민은 혈액-뇌 장벽을 통과할 수 없다’는 구절을 레보도파에도 적용하면 이 진술을 부적절하다고 오판할 수 있다. 그러나 선지는 도파민이 아니라 레보도파를 가리키며, 시나리오는 레보도파가 흑질의 도파민성 뉴런으로 흡수된다고 제시한다.",
  "predictedSelectionPercent": 10
}
```

##### C2

태그: []

유인 경로 원문:

카르비도파가 억제하는 효소의 작용을 뇌 안에서 이미 합성된 도파민의 작용과 연결했는지가 핵심이다. 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초에서만 작용하므로 흑질에서 합성된 도파민의 작용 기간을 연장한다고 볼 수 없다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "레보도파를 도파민으로 합성하는 효소의 작용을 억제하며 혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함."
    },
    {
      "source": "PASSAGE",
      "quote": "도파민성 뉴런에서 합성된 도파민만이 뇌의 신경 경로를 따라 이동하며 신경 전달 물질로 작용할 수 있다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "MAPPING_SHIFT",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "카르비도파가 억제하는 효소의 작용을 뇌 안에서 이미 합성된 도파민의 작용과 연결했는지가 핵심이다. 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초에서만 작용하므로 흑질에서 합성된 도파민의 작용 기간을 연장한다고 볼 수 없다.",
  "predictedSelectionPercent": 63
}
```

##### C3

태그: ["MULTI_STEP","SCOPE"]

유인 경로 원문:

프라미펙솔의 작용이 수용체에서 도파민처럼 기능하는 것으로 제시되어 있으므로, 이를 도파민 합성 과정에 직접 영향을 주는 작용과 구분하면 선지가 적절함을 판단할 수 있다. 수용체 작용과 합성 작용을 같은 단계로 혼동하면 이 선지를 부적절하다고 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "선조체 뉴런의 도파민 수용체에 결합하여 뉴런에 도파민이 결합된 것처럼 기능하게 함."
    },
    {
      "source": "PASSAGE",
      "quote": "도파민 합성을 시작하는 아미노산인 티로신이 시냅스 전 뉴런에 해당하는 도파민성 뉴런으로 흡수되면 티로신은 효소에 의해 레보도파로 합성되고, 레보도파는 또 다른 효소에 의해 도파민으로 합성된다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MULTI_STEP",
    "SCOPE"
  ],
  "attractionMechanism": "프라미펙솔의 작용이 수용체에서 도파민처럼 기능하는 것으로 제시되어 있으므로, 이를 도파민 합성 과정에 직접 영향을 주는 작용과 구분하면 선지가 적절함을 판단할 수 있다. 수용체 작용과 합성 작용을 같은 단계로 혼동하면 이 선지를 부적절하다고 고를 수 있다.",
  "predictedSelectionPercent": 8
}
```

##### C4

태그: ["MULTI_STEP","DIRECTION"]

유인 경로 원문:

말초에서 레보도파가 도파민으로 바뀌는 것을 카르비도파가 억제하므로, 뇌로 전달되는 레보도파의 양은 늘어난다고 추론할 수 있다. 억제 작용이 레보도파의 뇌 전달량도 줄인다고 방향을 반대로 생각하면 이 선지를 부적절하다고 판단할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "투여된 레보도파의 상당량은 뇌로 전달되기 전에 말초 조직에서 도파민으로 합성됨."
    },
    {
      "source": "SCENARIO",
      "quote": "레보도파를 도파민으로 합성하는 효소의 작용을 억제하며 혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함."
    }
  ],
  "evidenceSpan": "SAME_PARAGRAPH",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MULTI_STEP",
    "DIRECTION"
  ],
  "attractionMechanism": "말초에서 레보도파가 도파민으로 바뀌는 것을 카르비도파가 억제하므로, 뇌로 전달되는 레보도파의 양은 늘어난다고 추론할 수 있다. 억제 작용이 레보도파의 뇌 전달량도 줄인다고 방향을 반대로 생각하면 이 선지를 부적절하다고 판단할 수 있다.",
  "predictedSelectionPercent": 12
}
```

##### C5

태그: ["MULTI_STEP","PARAPHRASE_DISTANCE"]

유인 경로 원문:

증상 완화에 약물 치료가 가능하고, 레보도파는 도파민 합성을 늘리며 약물 병용도 가능하다는 내용을 연결하면 선지의 방안을 타당한 추론으로 볼 수 있다. 지문에 ‘병이 진행되면 용량을 늘린다’는 문장이 그대로 없다는 이유만으로 부적절하다고 고르면 안 된다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "약물 치료를 통해 병의 증상을 완화할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "두 가지 이상의 약물을 병용할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "흑질의 도파민성 뉴런으로 흡수되어 도파민 합성을 증가시킴."
    }
  ],
  "evidenceSpan": "SAME_PARAGRAPH",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MULTI_STEP",
    "PARAPHRASE_DISTANCE"
  ],
  "attractionMechanism": "증상 완화에 약물 치료가 가능하고, 레보도파는 도파민 합성을 늘리며 약물 병용도 가능하다는 내용을 연결하면 선지의 방안을 타당한 추론으로 볼 수 있다. 지문에 ‘병이 진행되면 용량을 늘린다’는 문장이 그대로 없다는 이유만으로 부적절하다고 고르면 안 된다.",
  "predictedSelectionPercent": 7
}
```

### gpt-6.1-sol

평균 예측 C1~C5: 8.00, 61.33, 13.00, 5.00, 12.67

#### r1: VALID

##### C1

태그: ["REFERENT","SCOPE","MULTI_STEP"]

유인 경로 원문:

체내로 유입된 도파민이 혈액-뇌 장벽을 통과하지 못한다는 제한을 도파민의 전구 물질인 레보도파에도 적용하면 이 선지를 틀렸다고 판단한다. 경구 투여된 레보도파가 흑질의 뉴런에 흡수된다는 사실로부터 뇌 진입 가능성을 추론해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "음식이나 약물로 도파민을 섭취할 수 있으나 이렇게 체내로 유입된 도파민은 혈액-뇌 장벽을 통과할 수 없다."
    },
    {
      "source": "SCENARIO",
      "quote": "레보도파: 흑질의 도파민성 뉴런으로 흡수되어 도파민 합성을 증가시킴."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "SCOPE",
    "MULTI_STEP"
  ],
  "attractionMechanism": "체내로 유입된 도파민이 혈액-뇌 장벽을 통과하지 못한다는 제한을 도파민의 전구 물질인 레보도파에도 적용하면 이 선지를 틀렸다고 판단한다. 경구 투여된 레보도파가 흑질의 뉴런에 흡수된다는 사실로부터 뇌 진입 가능성을 추론해야 한다.",
  "predictedSelectionPercent": 8
}
```

##### C2

태그: []

유인 경로 원문:

카르비도파의 합성 효소 억제를 이미 합성된 도파민의 분해 억제로 대응시킨 것이 잘못이다. 또한 카르비도파는 말초 조직에서만 작용하므로 흑질에서 합성된 도파민의 작용 기간을 연장한다는 설명은 성립하지 않는다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "카르비도파: 레보도파를 도파민으로 합성하는 효소의 작용을 억제하며 혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함."
    },
    {
      "source": "PASSAGE",
      "quote": "재흡수된 도파민은 시냅스 소포에 저장되었다가 재사용되거나, 도파민 분해 효소에 의해 뉴런 안에서 분해된다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "MAPPING_SHIFT",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "카르비도파의 합성 효소 억제를 이미 합성된 도파민의 분해 억제로 대응시킨 것이 잘못이다. 또한 카르비도파는 말초 조직에서만 작용하므로 흑질에서 합성된 도파민의 작용 기간을 연장한다는 설명은 성립하지 않는다.",
  "predictedSelectionPercent": 60
}
```

##### C3

태그: ["MAPPING","SCOPE"]

유인 경로 원문:

도파민이 결합된 것처럼 기능한다는 설명을 도파민 합성 과정에도 관여한다는 뜻으로 확대하면 이 선지를 틀렸다고 판단한다. 제시된 작용은 선조체 뉴런의 수용체에 대한 것이며, 흑질 뉴런 내부의 합성 과정과 구별된다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "도파민 합성을 시작하는 아미노산인 티로신이 시냅스 전 뉴런에 해당하는 도파민성 뉴런으로 흡수되면 티로신은 효소에 의해 레보도파로 합성되고, 레보도파는 또 다른 효소에 의해 도파민으로 합성된다."
    },
    {
      "source": "SCENARIO",
      "quote": "프라미펙솔: 선조체 뉴런의 도파민 수용체에 결합하여 뉴런에 도파민이 결합된 것처럼 기능하게 함."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MAPPING",
    "SCOPE"
  ],
  "attractionMechanism": "도파민이 결합된 것처럼 기능한다는 설명을 도파민 합성 과정에도 관여한다는 뜻으로 확대하면 이 선지를 틀렸다고 판단한다. 제시된 작용은 선조체 뉴런의 수용체에 대한 것이며, 흑질 뉴런 내부의 합성 과정과 구별된다.",
  "predictedSelectionPercent": 12
}
```

##### C4

태그: ["DIRECTION","CONDITION","MULTI_STEP"]

유인 경로 원문:

도파민 합성을 억제하면 치료 효과도 감소할 것이라고 단순화하거나, 억제가 말초 조직에 한정된다는 조건을 놓치면 이 선지를 틀렸다고 판단한다. 말초에서의 전환이 억제되면 레보도파가 보존되어 뇌로 전달되는 양은 증가한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "투여된 레보도파의 상당량은 뇌로 전달되기 전에 말초 조직에서 도파민으로 합성됨."
    },
    {
      "source": "SCENARIO",
      "quote": "카르비도파: 레보도파를 도파민으로 합성하는 효소의 작용을 억제하며 혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함."
    },
    {
      "source": "PASSAGE",
      "quote": "음식이나 약물로 도파민을 섭취할 수 있으나 이렇게 체내로 유입된 도파민은 혈액-뇌 장벽을 통과할 수 없다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "DIRECTION",
    "CONDITION",
    "MULTI_STEP"
  ],
  "attractionMechanism": "도파민 합성을 억제하면 치료 효과도 감소할 것이라고 단순화하거나, 억제가 말초 조직에 한정된다는 조건을 놓치면 이 선지를 틀렸다고 판단한다. 말초에서의 전환이 억제되면 레보도파가 보존되어 뇌로 전달되는 양은 증가한다.",
  "predictedSelectionPercent": 5
}
```

##### C5

태그: ["SCOPE","MAPPING","MULTI_STEP"]

유인 경로 원문:

뉴런 파괴를 막을 수 없다는 설명을 약물로 증상도 완화할 수 없다는 뜻으로 확대하거나, 병이 진행되면 도파민성 뉴런이 모두 사라진다고 단정하면 이 선지를 고르게 된다. 도파민 합성을 늘리는 방법과 수용체에서 도파민 작용을 대신하는 방법은 감소한 도파민 기능을 보완할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "파킨슨병은 흑질의 도파민성 뉴런이 파괴되어 선조체로 분비되는 도파민의 양이 감소함으로써 수의적 운동에 장애가 나타나는 질환이다."
    },
    {
      "source": "SCENARIO",
      "quote": "도파민성 뉴런이 파괴되는 것의 진행을 막을 수는 없기 때문에 병의 완치는 불가능하지만, 약물 치료를 통해 병의 증상을 완화할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "레보도파: 흑질의 도파민성 뉴런으로 흡수되어 도파민 합성을 증가시킴."
    },
    {
      "source": "SCENARIO",
      "quote": "프라미펙솔: 선조체 뉴런의 도파민 수용체에 결합하여 뉴런에 도파민이 결합된 것처럼 기능하게 함."
    },
    {
      "source": "PASSAGE",
      "quote": "따라서 흑질의 도파민성 뉴런에서 분비된 도파민은 직접 경로를 활성화하고 간접 경로는 억제하여 목표하는 운동의 시작을 수월하게 함으로써 운동을 촉진하게 된다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "SCOPE",
    "MAPPING",
    "MULTI_STEP"
  ],
  "attractionMechanism": "뉴런 파괴를 막을 수 없다는 설명을 약물로 증상도 완화할 수 없다는 뜻으로 확대하거나, 병이 진행되면 도파민성 뉴런이 모두 사라진다고 단정하면 이 선지를 고르게 된다. 도파민 합성을 늘리는 방법과 수용체에서 도파민 작용을 대신하는 방법은 감소한 도파민 기능을 보완할 수 있다.",
  "predictedSelectionPercent": 15
}
```

#### r2: VALID

##### C1

태그: ["REFERENT","SCOPE","MULTI_STEP"]

유인 경로 원문:

도파민이 혈액-뇌 장벽을 통과하지 못한다는 제한을 도파민의 전구 물질인 레보도파에도 적용하면 이 선지를 틀렸다고 판단한다. 흑질의 뉴런에 흡수된다는 설명에서 레보도파의 뇌 진입을 추론해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "음식이나 약물로 도파민을 섭취할 수 있으나 이렇게 체내로 유입된 도파민은 혈액-뇌 장벽을 통과할 수 없다."
    },
    {
      "source": "SCENARIO",
      "quote": "레보도파: 흑질의 도파민성 뉴런으로 흡수되어 도파민 합성을 증가시킴."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "SCOPE",
    "MULTI_STEP"
  ],
  "attractionMechanism": "도파민이 혈액-뇌 장벽을 통과하지 못한다는 제한을 도파민의 전구 물질인 레보도파에도 적용하면 이 선지를 틀렸다고 판단한다. 흑질의 뉴런에 흡수된다는 설명에서 레보도파의 뇌 진입을 추론해야 한다.",
  "predictedSelectionPercent": 8
}
```

##### C2

태그: []

유인 경로 원문:

카르비도파가 억제하는 것은 말초 조직의 도파민 합성 효소이지, 흑질에서 이미 합성된 도파민을 분해하는 효소가 아니다. 작용 위치와 효소의 기능을 구별하면 도파민의 작용 기간을 연장한다는 설명이 부적절함을 알 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "카르비도파: 레보도파를 도파민으로 합성하는 효소의 작용을 억제하며 혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함."
    },
    {
      "source": "PASSAGE",
      "quote": "재흡수된 도파민은 시냅스 소포에 저장되었다가 재사용되거나, 도파민 분해 효소에 의해 뉴런 안에서 분해된다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "MAPPING_SHIFT",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "카르비도파가 억제하는 것은 말초 조직의 도파민 합성 효소이지, 흑질에서 이미 합성된 도파민을 분해하는 효소가 아니다. 작용 위치와 효소의 기능을 구별하면 도파민의 작용 기간을 연장한다는 설명이 부적절함을 알 수 있다.",
  "predictedSelectionPercent": 64
}
```

##### C3

태그: ["MAPPING","REFERENT","PARAPHRASE_DISTANCE"]

유인 경로 원문:

‘도파민이 결합된 것처럼 기능’한다는 설명을 도파민 합성을 늘린다는 뜻으로 혼동하면 이 선지를 틀렸다고 판단한다. 선조체 뉴런의 수용체에 작용하는 단계와 흑질의 도파민성 뉴런에서 합성되는 단계를 구별해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "도파민 합성을 시작하는 아미노산인 티로신이 시냅스 전 뉴런에 해당하는 도파민성 뉴런으로 흡수되면 티로신은 효소에 의해 레보도파로 합성되고, 레보도파는 또 다른 효소에 의해 도파민으로 합성된다."
    },
    {
      "source": "SCENARIO",
      "quote": "프라미펙솔: 선조체 뉴런의 도파민 수용체에 결합하여 뉴런에 도파민이 결합된 것처럼 기능하게 함."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MAPPING",
    "REFERENT",
    "PARAPHRASE_DISTANCE"
  ],
  "attractionMechanism": "‘도파민이 결합된 것처럼 기능’한다는 설명을 도파민 합성을 늘린다는 뜻으로 혼동하면 이 선지를 틀렸다고 판단한다. 선조체 뉴런의 수용체에 작용하는 단계와 흑질의 도파민성 뉴런에서 합성되는 단계를 구별해야 한다.",
  "predictedSelectionPercent": 13
}
```

##### C4

태그: ["CONDITION","DIRECTION","MULTI_STEP"]

유인 경로 원문:

카르비도파가 말초 조직에서만 작용한다는 조건을 놓치면 뇌 안의 도파민 합성까지 억제하므로 병용이 불리하다고 판단할 수 있다. 말초에서의 전환 억제가 뇌로 전달될 레보도파를 보존한다는 인과 관계를 따라가야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "음식이나 약물로 도파민을 섭취할 수 있으나 이렇게 체내로 유입된 도파민은 혈액-뇌 장벽을 통과할 수 없다."
    },
    {
      "source": "SCENARIO",
      "quote": "투여된 레보도파의 상당량은 뇌로 전달되기 전에 말초 조직에서 도파민으로 합성됨."
    },
    {
      "source": "SCENARIO",
      "quote": "카르비도파: 레보도파를 도파민으로 합성하는 효소의 작용을 억제하며 혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "DIRECTION",
    "MULTI_STEP"
  ],
  "attractionMechanism": "카르비도파가 말초 조직에서만 작용한다는 조건을 놓치면 뇌 안의 도파민 합성까지 억제하므로 병용이 불리하다고 판단할 수 있다. 말초에서의 전환 억제가 뇌로 전달될 레보도파를 보존한다는 인과 관계를 따라가야 한다.",
  "predictedSelectionPercent": 5
}
```

##### C5

태그: ["SCOPE","CONDITION","MULTI_STEP"]

유인 경로 원문:

뉴런 파괴의 진행을 막을 수 없다는 설명을 증상 완화도 불가능하다는 뜻으로 확대하면 이 선지를 고르게 된다. 도파민 합성을 늘리는 방법과 수용체에서 도파민의 기능을 대신하는 방법 모두 감소한 도파민의 작용을 보완할 수 있음을 결합해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "파킨슨병은 흑질의 도파민성 뉴런이 파괴되어 선조체로 분비되는 도파민의 양이 감소함으로써 수의적 운동에 장애가 나타나는 질환이다."
    },
    {
      "source": "SCENARIO",
      "quote": "도파민성 뉴런이 파괴되는 것의 진행을 막을 수는 없기 때문에 병의 완치는 불가능하지만, 약물 치료를 통해 병의 증상을 완화할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "레보도파: 흑질의 도파민성 뉴런으로 흡수되어 도파민 합성을 증가시킴."
    },
    {
      "source": "SCENARIO",
      "quote": "프라미펙솔: 선조체 뉴런의 도파민 수용체에 결합하여 뉴런에 도파민이 결합된 것처럼 기능하게 함."
    },
    {
      "source": "PASSAGE",
      "quote": "따라서 흑질의 도파민성 뉴런에서 분비된 도파민은 직접 경로를 활성화하고 간접 경로는 억제하여 목표하는 운동의 시작을 수월하게 함으로써 운동을 촉진하게 된다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "SCOPE",
    "CONDITION",
    "MULTI_STEP"
  ],
  "attractionMechanism": "뉴런 파괴의 진행을 막을 수 없다는 설명을 증상 완화도 불가능하다는 뜻으로 확대하면 이 선지를 고르게 된다. 도파민 합성을 늘리는 방법과 수용체에서 도파민의 기능을 대신하는 방법 모두 감소한 도파민의 작용을 보완할 수 있음을 결합해야 한다.",
  "predictedSelectionPercent": 10
}
```

#### r3: VALID

##### C1

태그: ["MAPPING","SCOPE","MULTI_STEP"]

유인 경로 원문:

체내로 유입된 도파민이 혈액-뇌 장벽을 통과하지 못한다는 제한을 그 전구 물질인 레보도파에까지 확대하면 이 선지를 부적절하다고 판단할 수 있다. 레보도파가 흑질의 뉴런에 흡수된다는 정보를 통해 뇌 진입 가능성을 추론해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "음식이나 약물로 도파민을 섭취할 수 있으나 이렇게 체내로 유입된 도파민은 혈액-뇌 장벽을 통과할 수 없다."
    },
    {
      "source": "SCENARIO",
      "quote": "레보도파: 흑질의 도파민성 뉴런으로 흡수되어 도파민 합성을 증가시킴."
    },
    {
      "source": "SCENARIO",
      "quote": "투여된 레보도파의 상당량은 뇌로 전달되기 전에 말초 조직에서 도파민으로 합성됨."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MAPPING",
    "SCOPE",
    "MULTI_STEP"
  ],
  "attractionMechanism": "체내로 유입된 도파민이 혈액-뇌 장벽을 통과하지 못한다는 제한을 그 전구 물질인 레보도파에까지 확대하면 이 선지를 부적절하다고 판단할 수 있다. 레보도파가 흑질의 뉴런에 흡수된다는 정보를 통해 뇌 진입 가능성을 추론해야 한다.",
  "predictedSelectionPercent": 8
}
```

##### C2

태그: []

유인 경로 원문:

카르비도파가 억제하는 것은 말초 조직의 도파민 합성 효소이지, 흑질에서 합성된 도파민의 분해 효소가 아니다. 효소의 기능과 약물의 작용 장소를 구별하면 도파민의 작용 기간을 연장한다는 결론이 성립하지 않음을 알 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "카르비도파: 레보도파를 도파민으로 합성하는 효소의 작용을 억제하며 혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함."
    },
    {
      "source": "PASSAGE",
      "quote": "재흡수된 도파민은 시냅스 소포에 저장되었다가 재사용되거나, 도파민 분해 효소에 의해 뉴런 안에서 분해된다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "MAPPING_SHIFT",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "카르비도파가 억제하는 것은 말초 조직의 도파민 합성 효소이지, 흑질에서 합성된 도파민의 분해 효소가 아니다. 효소의 기능과 약물의 작용 장소를 구별하면 도파민의 작용 기간을 연장한다는 결론이 성립하지 않음을 알 수 있다.",
  "predictedSelectionPercent": 60
}
```

##### C3

태그: ["REFERENT","MAPPING","MULTI_STEP"]

유인 경로 원문:

프라미펙솔이 결합하는 선조체 뉴런의 수용체를 흑질 도파민성 뉴런의 자가 수용체와 혼동하거나, 도파민처럼 기능한다는 것을 도파민 합성에 관여한다는 뜻으로 오해하면 이 선지를 고를 수 있다. 제시된 작용은 선조체의 수용체에 대한 것이므로 흑질의 도파민 합성 과정과 구별된다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "프라미펙솔: 선조체 뉴런의 도파민 수용체에 결합하여 뉴런에 도파민이 결합된 것처럼 기능하게 함."
    },
    {
      "source": "PASSAGE",
      "quote": "도파민 합성을 시작하는 아미노산인 티로신이 시냅스 전 뉴런에 해당하는 도파민성 뉴런으로 흡수되면 티로신은 효소에 의해 레보도파로 합성되고, 레보도파는 또 다른 효소에 의해 도파민으로 합성된다."
    },
    {
      "source": "PASSAGE",
      "quote": "흑질의 도파민성 뉴런은 선조체로 연결되어 직접 및 간접 경로를 통해 수의적 운동의 조절에 영향을 미친다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "MAPPING",
    "MULTI_STEP"
  ],
  "attractionMechanism": "프라미펙솔이 결합하는 선조체 뉴런의 수용체를 흑질 도파민성 뉴런의 자가 수용체와 혼동하거나, 도파민처럼 기능한다는 것을 도파민 합성에 관여한다는 뜻으로 오해하면 이 선지를 고를 수 있다. 제시된 작용은 선조체의 수용체에 대한 것이므로 흑질의 도파민 합성 과정과 구별된다.",
  "predictedSelectionPercent": 14
}
```

##### C4

태그: ["DIRECTION","SCOPE","MULTI_STEP"]

유인 경로 원문:

도파민 합성을 억제하면 치료 효과도 감소한다고 단순화하거나, 말초 조직에서만 작용한다는 조건을 놓치면 이 선지를 부적절하다고 판단할 수 있다. 말초에서의 전환을 억제하면 레보도파가 보존되어 뇌로 전달되는 양은 증가한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "투여된 레보도파의 상당량은 뇌로 전달되기 전에 말초 조직에서 도파민으로 합성됨."
    },
    {
      "source": "SCENARIO",
      "quote": "카르비도파: 레보도파를 도파민으로 합성하는 효소의 작용을 억제하며 혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함."
    },
    {
      "source": "PASSAGE",
      "quote": "음식이나 약물로 도파민을 섭취할 수 있으나 이렇게 체내로 유입된 도파민은 혈액-뇌 장벽을 통과할 수 없다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "DIRECTION",
    "SCOPE",
    "MULTI_STEP"
  ],
  "attractionMechanism": "도파민 합성을 억제하면 치료 효과도 감소한다고 단순화하거나, 말초 조직에서만 작용한다는 조건을 놓치면 이 선지를 부적절하다고 판단할 수 있다. 말초에서의 전환을 억제하면 레보도파가 보존되어 뇌로 전달되는 양은 증가한다.",
  "predictedSelectionPercent": 5
}
```

##### C5

태그: ["CONDITION","SCOPE","MULTI_STEP","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

완치가 불가능하다는 진술을 증상 완화도 불가능하다는 뜻으로 확대하거나, 병의 진행을 모든 도파민성 뉴런이 파괴된 상태로 바꾸어 읽으면 이 선지를 고를 수 있다. 제시된 조건에서는 레보도파 증량으로 도파민 합성을 늘리거나 프라미펙솔 병용으로 수용체 작용을 보완하는 것이 타당하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "파킨슨병은 흑질의 도파민성 뉴런이 파괴되어 선조체로 분비되는 도파민의 양이 감소함으로써 수의적 운동에 장애가 나타나는 질환이다."
    },
    {
      "source": "SCENARIO",
      "quote": "도파민성 뉴런이 파괴되는 것의 진행을 막을 수는 없기 때문에 병의 완치는 불가능하지만, 약물 치료를 통해 병의 증상을 완화할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "레보도파: 흑질의 도파민성 뉴런으로 흡수되어 도파민 합성을 증가시킴."
    },
    {
      "source": "SCENARIO",
      "quote": "프라미펙솔: 선조체 뉴런의 도파민 수용체에 결합하여 뉴런에 도파민이 결합된 것처럼 기능하게 함."
    },
    {
      "source": "PASSAGE",
      "quote": "따라서 흑질의 도파민성 뉴런에서 분비된 도파민은 직접 경로를 활성화하고 간접 경로는 억제하여 목표하는 운동의 시작을 수월하게 함으로써 운동을 촉진하게 된다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "SCOPE",
    "MULTI_STEP",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "완치가 불가능하다는 진술을 증상 완화도 불가능하다는 뜻으로 확대하거나, 병의 진행을 모든 도파민성 뉴런이 파괴된 상태로 바꾸어 읽으면 이 선지를 고를 수 있다. 제시된 조건에서는 레보도파 증량으로 도파민 합성을 늘리거나 프라미펙솔 병용으로 수용체 작용을 보완하는 것이 타당하다.",
  "predictedSelectionPercent": 13
}
```

## information-asymmetry-free-marketplace-q13 (USED)

정답: C5

실제 화작 C1~C5: 11.00, 28.00, 14.00, 17.00, 30.00
실제 언매 C1~C5: 7.00, 26.00, 9.00, 10.00, 47.00

### gpt-6-luna

평균 예측 C1~C5: 10.67, 14.33, 10.33, 12.33, 52.33

#### r1: VALID

##### C1

태그: ["POLARITY","SCOPE","SURFACE_MATCH"]

유인 경로 원문:

ⓐ의 의무를 플랫폼 사업자에게도 이미 적용되는 것으로 넓혀 읽으면, 플랫폼 A를 제재할 수 없다는 결론을 틀렸다고 보기 쉽다. 그러나 플랫폼 사업자에 대한 의무 부과는 지문에서 아직 제기된 주장일 뿐이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "인공 지능을 활용한 제품 또는 서비스를 제공하는 사업자에게 생성형 인공 지능 사용 여부를 표시하도록 하는 생성물 표시 의무를 강제하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "광고성 정보를 제작하여 게시한 정보 제공자와 광고성 정보가 유통되는 플랫폼 사업자에게도 그와 같은 의무를 부과해야 한다는 주장이 제기되고 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "식품 판매자 '갑'은 상품의 효능을 과장한 글과 가상 의료인이 등장하여 효능을 알리는 동영상을 생성형 인공 지능을 이용하여 제작한 후, 인터넷 언론사로 분류된 플랫폼 A에 각각 게시하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "SCOPE",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "ⓐ의 의무를 플랫폼 사업자에게도 이미 적용되는 것으로 넓혀 읽으면, 플랫폼 A를 제재할 수 없다는 결론을 틀렸다고 보기 쉽다. 그러나 플랫폼 사업자에 대한 의무 부과는 지문에서 아직 제기된 주장일 뿐이다.",
  "predictedSelectionPercent": 10
}
```

##### C2

태그: ["POLARITY","CONDITION","SCOPE","SURFACE_MATCH"]

유인 경로 원문:

갑이 생성형 인공 지능을 사용했다는 사실만으로 표시 의무가 발생한다고 보면 갑을 제재할 수 없다는 진술을 오답으로 판단할 수 있다. 하지만 지문의 의무는 인공 지능을 활용한 제품·서비스를 제공하는 사업자에게 부과된 것이며, 광고 제작에 AI를 쓴 경우까지 포함한다고 단정할 수 없다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "인공 지능을 활용한 제품 또는 서비스를 제공하는 사업자에게 생성형 인공 지능 사용 여부를 표시하도록 하는 생성물 표시 의무를 강제하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "식품 판매자 '갑'은 상품의 효능을 과장한 글과 가상 의료인이 등장하여 효능을 알리는 동영상을 생성형 인공 지능을 이용하여 제작한 후, 인터넷 언론사로 분류된 플랫폼 A에 각각 게시하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "광고성 정보를 제작하여 게시한 정보 제공자와 광고성 정보가 유통되는 플랫폼 사업자에게도 그와 같은 의무를 부과해야 한다는 주장이 제기되고 있다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "PHRASE",
  "attractionTags": [
    "POLARITY",
    "CONDITION",
    "SCOPE",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "갑이 생성형 인공 지능을 사용했다는 사실만으로 표시 의무가 발생한다고 보면 갑을 제재할 수 없다는 진술을 오답으로 판단할 수 있다. 하지만 지문의 의무는 인공 지능을 활용한 제품·서비스를 제공하는 사업자에게 부과된 것이며, 광고 제작에 AI를 쓴 경우까지 포함한다고 단정할 수 없다.",
  "predictedSelectionPercent": 14
}
```

##### C3

태그: ["POLARITY","ATTRIBUTION","CONDITION"]

유인 경로 원문:

사회적 갈등 위험을 이유로 한 처벌 주장이므로 다수 의견도 처벌을 허용할 것이라고 추측하면, 선지의 ‘부합하지 않는다’가 틀렸다고 볼 수 있다. 그러나 지문에서 다수 의견은 실명 확인 의무 위반 언론사를 제재하는 규정을 위헌으로 보았고, 표현에 대한 정부 개입을 경계하는 입장이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "어떤 표현의 진위나 가치 여부는 다양한 의견 간의 경쟁을 통해 결정되어야 하며 정부가 개입하면 안 된다."
    },
    {
      "source": "PASSAGE",
      "quote": "헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "'을'은 사회적 갈등을 유발할 위험이 매우 크다며 그러한 주장을 하는 이들을 처벌하는 '△△법'의 제정이 필요하다는 글을 작성했다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "ATTRIBUTION",
    "CONDITION"
  ],
  "attractionMechanism": "사회적 갈등 위험을 이유로 한 처벌 주장이므로 다수 의견도 처벌을 허용할 것이라고 추측하면, 선지의 ‘부합하지 않는다’가 틀렸다고 볼 수 있다. 그러나 지문에서 다수 의견은 실명 확인 의무 위반 언론사를 제재하는 규정을 위헌으로 보았고, 표현에 대한 정부 개입을 경계하는 입장이다.",
  "predictedSelectionPercent": 9
}
```

##### C4

태그: ["POLARITY","MULTI_STEP","SURFACE_MATCH"]

유인 경로 원문:

반복 게시된 글의 내용이 허위·왜곡 정보라고 지문에 명시되지 않았다는 점에만 주목하면, 이 사례가 소수 의견을 뒷받침한다는 추론을 과도하다고 여길 수 있다. 그러나 다른 이름을 사용한 반복 게시 상황은 자율적 교정의 한계와 공동 규제 필요성을 뒷받침하는 사례로 연결될 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "허위·왜곡 정보가 시민의 사회적·정치적 사안 판단에 쓰이고, 정책 담당자도 특정 개인이나 집단이 의도적으로 유통한 정보를 시민의 진정한 의견으로 오인할 수 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "비판론은 민주주의 의사 결정의 왜곡을 막기 위해 플랫폼과 정부의 공동 규제가 강화되어야 한다고 주장한다."
    },
    {
      "source": "SCENARIO",
      "quote": "이후 '을'은 게시자 이름을 달리해 같은 취지의 글을 플랫폼 B에 수차례 올렸다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "MULTI_STEP",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "반복 게시된 글의 내용이 허위·왜곡 정보라고 지문에 명시되지 않았다는 점에만 주목하면, 이 사례가 소수 의견을 뒷받침한다는 추론을 과도하다고 여길 수 있다. 그러나 다른 이름을 사용한 반복 게시 상황은 자율적 교정의 한계와 공동 규제 필요성을 뒷받침하는 사례로 연결될 수 있다.",
  "predictedSelectionPercent": 12
}
```

##### C5

태그: []

유인 경로 원문:

플랫폼 B가 실명 확인 절차를 거치지 않았다는 사실은 지문의 실명확인 사건과 대응하지만, 다수 의견은 그러한 언론사를 제재하는 규정을 위헌으로 판단했다. 따라서 플랫폼 B가 그 규정에 따라 법적 제재를 받는다는 선지는 결론을 반대로 제시한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "선거 운동 기간 중에 게시판 이용자의 실명 확인 조치를 하지 않은 인터넷 언론사를 제재하는 법률 규정의 위헌 여부에 대해, 헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "그 글을 인터넷 언론사로 분류된 플랫폼 B에 선거 운동 기간 중에 실명으로 게시했다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 지문에서 언급되지 않은 법률은 적용하지 않음.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "플랫폼 B가 실명 확인 절차를 거치지 않았다는 사실은 지문의 실명확인 사건과 대응하지만, 다수 의견은 그러한 언론사를 제재하는 규정을 위헌으로 판단했다. 따라서 플랫폼 B가 그 규정에 따라 법적 제재를 받는다는 선지는 결론을 반대로 제시한다.",
  "predictedSelectionPercent": 55
}
```

#### r2: VALID

##### C1

태그: []

유인 경로 원문:

지문은 표시 의무의 대상을 인공 지능 활용 제품·서비스를 제공하는 사업자로 한정하고, 플랫폼 사업자에게도 의무를 부과하자는 것은 주장으로 제시한다. 그러므로 플랫폼 A가 게시물을 유통했다는 사실만으로 ⓐ에 따른 의무 위반 제재를 할 수 없다는 판단은 적절하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "정부는 관련 법률 조항을 통해, 인공 지능을 활용한 제품 또는 서비스를 제공하는 사업자에게 생성형 인공 지능 사용 여부를 표시하도록 하는 생성물 표시 의무를 강제하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "하지만 광고성 정보를 제작하여 게시한 정보 제공자와 광고성 정보가 유통되는 플랫폼 사업자에게도 그와 같은 의무를 부과해야 한다는 주장이 제기되고 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "식품 판매자 '갑'은 상품의 효능을 과장한 글과 가상 의료인이 등장하여 효능을 알리는 동영상을 생성형 인공 지능을 이용하여 제작한 후, 인터넷 언론사로 분류된 플랫폼 A에 각각 게시하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "이용자가 정보의 진위나 의도, 편향 등의 여부를 알기 어려운 허위·과장 광고가 증가하고 있다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "지문은 표시 의무의 대상을 인공 지능 활용 제품·서비스를 제공하는 사업자로 한정하고, 플랫폼 사업자에게도 의무를 부과하자는 것은 주장으로 제시한다. 그러므로 플랫폼 A가 게시물을 유통했다는 사실만으로 ⓐ에 따른 의무 위반 제재를 할 수 없다는 판단은 적절하다.",
  "predictedSelectionPercent": 8
}
```

##### C2

태그: []

유인 경로 원문:

동영상이 허위 광고에 해당하고 생성형 인공 지능을 사용했다는 점은 인정하되, ⓐ의 표시 의무는 인공 지능 활용 제품·서비스를 제공하는 사업자를 대상으로 한다는 적용 범위를 확인하면 된다. 식품 판매자가 광고 제작에 인공 지능을 이용했다는 사실만으로 그 의무의 대상이 되는 것은 아니므로 이 선지는 적절하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "정부는 관련 법률 조항을 통해, 인공 지능을 활용한 제품 또는 서비스를 제공하는 사업자에게 생성형 인공 지능 사용 여부를 표시하도록 하는 생성물 표시 의무를 강제하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "식품 판매자 '갑'은 상품의 효능을 과장한 글과 가상 의료인이 등장하여 효능을 알리는 동영상을 생성형 인공 지능을 이용하여 제작한 후, 인터넷 언론사로 분류된 플랫폼 A에 각각 게시하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "이용자가 정보의 진위나 의도, 편향 등의 여부를 알기 어려운 허위·과장 광고가 증가하고 있다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "동영상이 허위 광고에 해당하고 생성형 인공 지능을 사용했다는 점은 인정하되, ⓐ의 표시 의무는 인공 지능 활용 제품·서비스를 제공하는 사업자를 대상으로 한다는 적용 범위를 확인하면 된다. 식품 판매자가 광고 제작에 인공 지능을 이용했다는 사실만으로 그 의무의 대상이 되는 것은 아니므로 이 선지는 적절하다.",
  "predictedSelectionPercent": 13
}
```

##### C3

태그: []

유인 경로 원문:

사회적·정치적 표현의 진위나 가치는 사상과 의견의 경쟁으로 해결되어야 한다는 헌법 재판소의 입장과, 표현을 이유로 한 제재 규정을 위헌으로 본 다수 의견을 적용하면 된다. 정책 채택을 주장하는 사람들을 처벌하자는 내용은 그 취지에 부합하지 않으므로 이 선지는 적절하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "'을'은 사회적 갈등을 유발할 위험이 매우 크다며 그러한 주장을 하는 이들을 처벌하는 '△△법'의 제정이 필요하다는 글을 작성했다."
    },
    {
      "source": "PASSAGE",
      "quote": "우리나라 헌법 재판소도 사회적·정치적 표현의 진위나 가치 여부는 사상과 의견의 경쟁으로 해결되어야 한다는 입장을 유지하고 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "선거 운동 기간 중에 게시판 이용자의 실명 확인 조치를 하지 않은 인터넷 언론사를 제재하는 법률 규정의 위헌 여부에 대해, 헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "사회적·정치적 표현의 진위나 가치는 사상과 의견의 경쟁으로 해결되어야 한다는 헌법 재판소의 입장과, 표현을 이유로 한 제재 규정을 위헌으로 본 다수 의견을 적용하면 된다. 정책 채택을 주장하는 사람들을 처벌하자는 내용은 그 취지에 부합하지 않으므로 이 선지는 적절하다.",
  "predictedSelectionPercent": 10
}
```

##### C4

태그: []

유인 경로 원문:

같은 취지의 글을 게시자 이름을 바꾸어 반복 게시한 상황은 의도적으로 유통된 정보가 시민의 진정한 의견으로 오인될 수 있다는 비판론의 우려를 뒷받침할 수 있다. 따라서 이를 규제 강화 필요성을 주장한 소수 의견의 근거가 될 수 있다고 본 선지는 적절하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "이후 '을'은 게시자 이름을 달리해 같은 취지의 글을 플랫폼 B에 수차례 올렸다."
    },
    {
      "source": "SCENARIO",
      "quote": "이에 '을'은 사회적 갈등을 유발할 위험이 매우 크다며 그러한 주장을 하는 이들을 처벌하는 '△△법'의 제정이 필요하다는 글을 작성했다."
    },
    {
      "source": "PASSAGE",
      "quote": "반면 '소수 의견'은 비판론과 같은 취지에서 허위·왜곡 정보는 토론 등 자율적 방법으로 교정되기 어렵다고 주장하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "정책 담당자도 특정 개인이나 집단이 의도적으로 유통한 정보를 시민의 진정한 의견으로 오인할 수 있다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "같은 취지의 글을 게시자 이름을 바꾸어 반복 게시한 상황은 의도적으로 유통된 정보가 시민의 진정한 의견으로 오인될 수 있다는 비판론의 우려를 뒷받침할 수 있다. 따라서 이를 규제 강화 필요성을 주장한 소수 의견의 근거가 될 수 있다고 본 선지는 적절하다.",
  "predictedSelectionPercent": 11
}
```

##### C5

태그: []

유인 경로 원문:

플랫폼 B가 인터넷 언론사이고 실명 확인을 하지 않았더라도, 지문에 제시된 헌법 재판소 다수 의견은 그러한 미확인 언론사를 제재하는 규정을 위헌으로 판단했다. 따라서 그 결론에 따라 법적 제재를 받는다는 선지는 결론의 방향을 거꾸로 적용한 부적절한 진술이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "그 글을 인터넷 언론사로 분류된 플랫폼 B에 선거 운동 기간 중에 실명으로 게시했다."
    },
    {
      "source": "SCENARIO",
      "quote": "이후 '을'은 게시자 이름을 달리해 같은 취지의 글을 플랫폼 B에 수차례 올렸다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 지문에서 언급되지 않은 법률은 적용하지 않음.)"
    },
    {
      "source": "PASSAGE",
      "quote": "선거 운동 기간 중에 게시판 이용자의 실명 확인 조치를 하지 않은 인터넷 언론사를 제재하는 법률 규정의 위헌 여부에 대해, 헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "플랫폼 B가 인터넷 언론사이고 실명 확인을 하지 않았더라도, 지문에 제시된 헌법 재판소 다수 의견은 그러한 미확인 언론사를 제재하는 규정을 위헌으로 판단했다. 따라서 그 결론에 따라 법적 제재를 받는다는 선지는 결론의 방향을 거꾸로 적용한 부적절한 진술이다.",
  "predictedSelectionPercent": 58
}
```

#### r3: VALID

##### C1

태그: ["CONDITION","SCOPE"]

유인 경로 원문:

광고를 게시한 정보 제공자와 플랫폼에도 의무를 부과하자는 주장을 이미 시행 중인 규정으로 오해하면 플랫폼 A도 제재 대상이라고 판단할 수 있다. 그러나 현행 의무는 인공 지능을 활용한 제품·서비스 제공 사업자에게 부과된 것이고, 정보 제공자와 플랫폼에 대한 의무는 주장으로 제기된 단계다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이에 정부는 관련 법률 조항을 통해, 인공 지능을 활용한 제품 또는 서비스를 제공하는 사업자에게 생성형 인공 지능 사용 여부를 표시하도록 하는 생성물 표시 의무를 강제하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "하지만 광고성 정보를 제작하여 게시한 정보 제공자와 광고성 정보가 유통되는 플랫폼 사업자에게도 그와 같은 의무를 부과해야 한다는 주장이 제기되고 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "식품 판매자 '갑'은 상품의 효능을 과장한 글과 가상 의료인이 등장하여 효능을 알리는 동영상을 생성형 인공 지능을 이용하여 제작한 후, 인터넷 언론사로 분류된 플랫폼 A에 각각 게시하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "SCOPE"
  ],
  "attractionMechanism": "광고를 게시한 정보 제공자와 플랫폼에도 의무를 부과하자는 주장을 이미 시행 중인 규정으로 오해하면 플랫폼 A도 제재 대상이라고 판단할 수 있다. 그러나 현행 의무는 인공 지능을 활용한 제품·서비스 제공 사업자에게 부과된 것이고, 정보 제공자와 플랫폼에 대한 의무는 주장으로 제기된 단계다.",
  "predictedSelectionPercent": 14
}
```

##### C2

태그: ["REFERENT","SCOPE"]

유인 경로 원문:

갑이 생성형 인공 지능을 이용해 광고 동영상을 만들었다는 사실만 보고, 생성물 표시 의무가 인공 지능을 사용한 모든 사람에게 적용된다고 확대할 수 있다. 하지만 지문에서 의무를 부과한 대상은 인공 지능 활용 제품 또는 서비스를 제공하는 사업자이므로, 식품 판매자 갑을 그 대상이라고 단정할 수 없다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이용자가 정보의 진위나 의도, 편향 등의 여부를 알기 어려운 허위·과장 광고가 증가하고 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "인공 지능을 활용한 제품 또는 서비스를 제공하는 사업자에게 생성형 인공 지능 사용 여부를 표시하도록 하는 생성물 표시 의무를 강제하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "식품 판매자 '갑'은 상품의 효능을 과장한 글과 가상 의료인이 등장하여 효능을 알리는 동영상을 생성형 인공 지능을 이용하여 제작한 후"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "SCOPE"
  ],
  "attractionMechanism": "갑이 생성형 인공 지능을 이용해 광고 동영상을 만들었다는 사실만 보고, 생성물 표시 의무가 인공 지능을 사용한 모든 사람에게 적용된다고 확대할 수 있다. 하지만 지문에서 의무를 부과한 대상은 인공 지능 활용 제품 또는 서비스를 제공하는 사업자이므로, 식품 판매자 갑을 그 대상이라고 단정할 수 없다.",
  "predictedSelectionPercent": 16
}
```

##### C3

태그: ["CONDITION","ATTRIBUTION"]

유인 경로 원문:

‘사회적 갈등을 유발할 위험이 매우 크다’는 조건을 명백하고 현존하는 위험에 해당한다고 간주하면, 다수 의견도 처벌을 허용할 것이라고 오해할 수 있다. 그러나 이 선택지는 사회·정치적 표현을 처벌하려는 주장이 다수 의견의 표현 경쟁 원칙과 부합하지 않는다고 판단한 것이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "어떤 표현의 진위나 가치 여부는 다양한 의견 간의 경쟁을 통해 결정되어야 하며 정부가 개입하면 안 된다."
    },
    {
      "source": "PASSAGE",
      "quote": "우리나라 헌법 재판소도 사회적·정치적 표현의 진위나 가치 여부는 사상과 의견의 경쟁으로 해결되어야 한다는 입장을 유지하고 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "'을'은 사회적 갈등을 유발할 위험이 매우 크다며 그러한 주장을 하는 이들을 처벌하는 '△△법'의 제정이 필요하다는 글을 작성했다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "ATTRIBUTION"
  ],
  "attractionMechanism": "‘사회적 갈등을 유발할 위험이 매우 크다’는 조건을 명백하고 현존하는 위험에 해당한다고 간주하면, 다수 의견도 처벌을 허용할 것이라고 오해할 수 있다. 그러나 이 선택지는 사회·정치적 표현을 처벌하려는 주장이 다수 의견의 표현 경쟁 원칙과 부합하지 않는다고 판단한 것이다.",
  "predictedSelectionPercent": 12
}
```

##### C4

태그: ["MAPPING","DIRECTION"]

유인 경로 원문:

같은 취지의 글을 반복 게시한 사실을 다양한 의견의 경쟁을 강화하는 행위로만 연결하면, 소수 의견을 뒷받침하지 않는다고 오판할 수 있다. 하지만 게시자 이름을 바꾸어 반복한 행위는 실제보다 여러 사람의 의견인 것처럼 보이게 해 시민 의견을 오인하게 할 수 있으므로, 허위·왜곡 정보에 대한 규제 필요성을 주장하는 소수 의견의 근거가 될 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "또 허위·왜곡 정보가 시민의 사회적·정치적 사안 판단에 쓰이고, 정책 담당자도 특정 개인이나 집단이 의도적으로 유통한 정보를 시민의 진정한 의견으로 오인할 수 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "이러한 입장에 따라 비판론은 민주주의 의사 결정의 왜곡을 막기 위해 플랫폼과 정부의 공동 규제가 강화되어야 한다고 주장한다."
    },
    {
      "source": "SCENARIO",
      "quote": "이후 '을'은 게시자 이름을 달리해 같은 취지의 글을 플랫폼 B에 수차례 올렸다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MAPPING",
    "DIRECTION"
  ],
  "attractionMechanism": "같은 취지의 글을 반복 게시한 사실을 다양한 의견의 경쟁을 강화하는 행위로만 연결하면, 소수 의견을 뒷받침하지 않는다고 오판할 수 있다. 하지만 게시자 이름을 바꾸어 반복한 행위는 실제보다 여러 사람의 의견인 것처럼 보이게 해 시민 의견을 오인하게 할 수 있으므로, 허위·왜곡 정보에 대한 규제 필요성을 주장하는 소수 의견의 근거가 될 수 있다.",
  "predictedSelectionPercent": 14
}
```

##### C5

태그: []

유인 경로 원문:

정답을 고르려면 실명 확인을 하지 않은 인터넷 언론사를 제재하는 규정이 헌법 재판소 다수 의견에 의해 위헌으로 결정되었다는 점을 적용해야 한다. 따라서 그 결론에 따라 플랫폼 B가 법적 제재를 받는다는 진술은 결론의 방향을 뒤집은 것이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "선거 운동 기간 중에 게시판 이용자의 실명 확인 조치를 하지 않은 인터넷 언론사를 제재하는 법률 규정의 위헌 여부에 대해, 헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "그 글을 인터넷 언론사로 분류된 플랫폼 B에 선거 운동 기간 중에 실명으로 게시했다. 이후 '을'은 게시자 이름을 달리해 같은 취지의 글을 플랫폼 B에 수차례 올렸다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 지문에서 언급되지 않은 법률은 적용하지 않음.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "정답을 고르려면 실명 확인을 하지 않은 인터넷 언론사를 제재하는 규정이 헌법 재판소 다수 의견에 의해 위헌으로 결정되었다는 점을 적용해야 한다. 따라서 그 결론에 따라 플랫폼 B가 법적 제재를 받는다는 진술은 결론의 방향을 뒤집은 것이다.",
  "predictedSelectionPercent": 44
}
```

### gpt-6.1-sol

평균 예측 C1~C5: 9.00, 19.33, 11.00, 14.33, 46.33

#### r1: VALID

##### C1

태그: ["SCOPE","MAPPING","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

플랫폼에도 표시 의무를 부과해야 한다는 주장을 이미 시행 중인 법적 의무로 확대하거나, 광고를 유통한 플랫폼도 당연히 책임져야 한다는 상식에 기대면 이 선지를 부적절하다고 판단한다. 현행 ⓐ의 의무 대상과 의무 확대 주장을 구분해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이에 정부는 관련 법률 조항을 통해, 인공 지능을 활용한 제품 또는 서비스를 제공하는 사업자에게 생성형 인공 지능 사용 여부를 표시하도록 하는 생성물 표시 의무를 강제하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "하지만 광고성 정보를 제작하여 게시한 정보 제공자와 광고성 정보가 유통되는 플랫폼 사업자에게도 그와 같은 의무를 부과해야 한다는 주장이 제기되고 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "식품 판매자 '갑'은 상품의 효능을 과장한 글과 가상 의료인이 등장하여 효능을 알리는 동영상을 생성형 인공 지능을 이용하여 제작한 후, 인터넷 언론사로 분류된 플랫폼 A에 각각 게시하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 지문에서 언급되지 않은 법률은 적용하지 않음.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "SCOPE",
    "MAPPING",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "플랫폼에도 표시 의무를 부과해야 한다는 주장을 이미 시행 중인 법적 의무로 확대하거나, 광고를 유통한 플랫폼도 당연히 책임져야 한다는 상식에 기대면 이 선지를 부적절하다고 판단한다. 현행 ⓐ의 의무 대상과 의무 확대 주장을 구분해야 한다.",
  "predictedSelectionPercent": 9
}
```

##### C2

태그: ["MAPPING","SCOPE","SURFACE_MATCH"]

유인 경로 원문:

'갑'이 생성형 인공 지능을 사용했다는 표면적 일치에 주목하여 그를 곧바로 ⓐ의 의무 대상인 사업자에 대응시키면 이 선지를 고르게 된다. '갑'은 식품 광고성 정보를 제작·게시한 정보 제공자이며, 이들에게 의무를 확대하는 것은 아직 주장으로 제시되어 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이에 정부는 관련 법률 조항을 통해, 인공 지능을 활용한 제품 또는 서비스를 제공하는 사업자에게 생성형 인공 지능 사용 여부를 표시하도록 하는 생성물 표시 의무를 강제하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "하지만 광고성 정보를 제작하여 게시한 정보 제공자와 광고성 정보가 유통되는 플랫폼 사업자에게도 그와 같은 의무를 부과해야 한다는 주장이 제기되고 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "식품 판매자 '갑'은 상품의 효능을 과장한 글과 가상 의료인이 등장하여 효능을 알리는 동영상을 생성형 인공 지능을 이용하여 제작한 후, 인터넷 언론사로 분류된 플랫폼 A에 각각 게시하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "두 게시물은 모두 익명으로 게시되었고, 생성형 인공 지능 사용 여부를 표시하지 않았다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 지문에서 언급되지 않은 법률은 적용하지 않음.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MAPPING",
    "SCOPE",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "'갑'이 생성형 인공 지능을 사용했다는 표면적 일치에 주목하여 그를 곧바로 ⓐ의 의무 대상인 사업자에 대응시키면 이 선지를 고르게 된다. '갑'은 식품 광고성 정보를 제작·게시한 정보 제공자이며, 이들에게 의무를 확대하는 것은 아직 주장으로 제시되어 있다.",
  "predictedSelectionPercent": 21
}
```

##### C3

태그: ["ATTRIBUTION","PARAPHRASE_DISTANCE","MULTI_STEP"]

유인 경로 원문:

실명 확인 규정의 위헌 결정과 정치적 주장에 대한 처벌 반대를 연결하지 못하거나, 규제를 옹호하는 소수 의견을 다수 의견에 귀속하면 이 선지가 틀렸다고 판단한다. 다수 의견의 표현 자유 보호 취지는 특정 정책 주장을 처벌하자는 '을'의 주장과 부합하지 않는다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "우리나라 헌법 재판소도 사회적·정치적 표현의 진위나 가치 여부는 사상과 의견의 경쟁으로 해결되어야 한다는 입장을 유지하고 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "선거 운동 기간 중에 게시판 이용자의 실명 확인 조치를 하지 않은 인터넷 언론사를 제재하는 법률 규정의 위헌 여부에 대해, 헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "이에 '을'은 사회적 갈등을 유발할 위험이 매우 크다며 그러한 주장을 하는 이들을 처벌하는 '△△법'의 제정이 필요하다는 글을 작성했다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "ATTRIBUTION",
    "PARAPHRASE_DISTANCE",
    "MULTI_STEP"
  ],
  "attractionMechanism": "실명 확인 규정의 위헌 결정과 정치적 주장에 대한 처벌 반대를 연결하지 못하거나, 규제를 옹호하는 소수 의견을 다수 의견에 귀속하면 이 선지가 틀렸다고 판단한다. 다수 의견의 표현 자유 보호 취지는 특정 정책 주장을 처벌하자는 '을'의 주장과 부합하지 않는다.",
  "predictedSelectionPercent": 13
}
```

##### C4

태그: ["MAPPING","MULTI_STEP","CONDITION"]

유인 경로 원문:

이름을 바꾼 반복 게시를 단순한 개인의 의견 표명으로만 보면, 다수 시민의 의견처럼 보이게 하여 정책 결정을 왜곡할 수 있다는 비판론과 연결하지 못한다. 선지는 법 제정으로 이어졌다는 조건 아래 소수 의견을 뒷받침할 '수 있다'고 한 것이지, 실제 오인이 확정되었다고 단정한 것이 아니다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "또 허위·왜곡 정보가 시민의 사회적·정치적 사안 판단에 쓰이고, 정책 담당자도 특정 개인이나 집단이 의도적으로 유통한 정보를 시민의 진정한 의견으로 오인할 수 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "반면 '소수 의견'은 비판론과 같은 취지에서 허위·왜곡 정보는 토론 등 자율적 방법으로 교정되기 어렵다고 주장하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "이후 '을'은 게시자 이름을 달리해 같은 취지의 글을 플랫폼 B에 수차례 올렸다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MAPPING",
    "MULTI_STEP",
    "CONDITION"
  ],
  "attractionMechanism": "이름을 바꾼 반복 게시를 단순한 개인의 의견 표명으로만 보면, 다수 시민의 의견처럼 보이게 하여 정책 결정을 왜곡할 수 있다는 비판론과 연결하지 못한다. 선지는 법 제정으로 이어졌다는 조건 아래 소수 의견을 뒷받침할 '수 있다'고 한 것이지, 실제 오인이 확정되었다고 단정한 것이 아니다.",
  "predictedSelectionPercent": 14
}
```

##### C5

태그: []

유인 경로 원문:

헌법 재판소의 결론은 실명 확인 의무를 위반한 인터넷 언론사를 제재하는 규정이 위헌이라는 것이다. 따라서 그 결론에 따라 플랫폼 B가 해당 규정으로 제재받는다는 진술은 법적 효과의 방향을 뒤집었다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "선거 운동 기간 중에 게시판 이용자의 실명 확인 조치를 하지 않은 인터넷 언론사를 제재하는 법률 규정의 위헌 여부에 대해, 헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "그 글을 인터넷 언론사로 분류된 플랫폼 B에 선거 운동 기간 중에 실명으로 게시했다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 지문에서 언급되지 않은 법률은 적용하지 않음.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "PHRASE",
  "attractionTags": [],
  "attractionMechanism": "헌법 재판소의 결론은 실명 확인 의무를 위반한 인터넷 언론사를 제재하는 규정이 위헌이라는 것이다. 따라서 그 결론에 따라 플랫폼 B가 해당 규정으로 제재받는다는 진술은 법적 효과의 방향을 뒤집었다.",
  "predictedSelectionPercent": 43
}
```

#### r2: VALID

##### C1

태그: ["SCOPE","CONDITION","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

플랫폼에도 표시 의무를 부과해야 한다는 주장을 이미 시행 중인 법률의 적용 범위로 오인하면, 제재하지 못한다는 옳은 진술을 틀렸다고 판단한다. 과장 광고를 유통했으므로 당연히 제재받는다는 상식을 적용해도 이 선지를 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이에 정부는 관련 법률 조항을 통해, 인공 지능을 활용한 제품 또는 서비스를 제공하는 사업자에게 생성형 인공 지능 사용 여부를 표시하도록 하는 생성물 표시 의무를 강제하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "하지만 광고성 정보를 제작하여 게시한 정보 제공자와 광고성 정보가 유통되는 플랫폼 사업자에게도 그와 같은 의무를 부과해야 한다는 주장이 제기되고 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "식품 판매자 '갑'은 상품의 효능을 과장한 글과 가상 의료인이 등장하여 효능을 알리는 동영상을 생성형 인공 지능을 이용하여 제작한 후, 인터넷 언론사로 분류된 플랫폼 A에 각각 게시하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 지문에서 언급되지 않은 법률은 적용하지 않음.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "SCOPE",
    "CONDITION",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "플랫폼에도 표시 의무를 부과해야 한다는 주장을 이미 시행 중인 법률의 적용 범위로 오인하면, 제재하지 못한다는 옳은 진술을 틀렸다고 판단한다. 과장 광고를 유통했으므로 당연히 제재받는다는 상식을 적용해도 이 선지를 고를 수 있다.",
  "predictedSelectionPercent": 11
}
```

##### C2

태그: ["MAPPING","SCOPE","SURFACE_MATCH"]

유인 경로 원문:

'갑'이 생성형 인공 지능을 이용했다는 표면적 일치에 주목하여, 광고성 정보 제작자를 인공 지능 활용 제품·서비스 제공 사업자와 동일시한다. 그러면 표시하지 않은 '갑'은 ⓐ로 제재받아야 한다고 생각해 옳은 선지를 부적절하다고 판단한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이에 정부는 관련 법률 조항을 통해, 인공 지능을 활용한 제품 또는 서비스를 제공하는 사업자에게 생성형 인공 지능 사용 여부를 표시하도록 하는 생성물 표시 의무를 강제하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "하지만 광고성 정보를 제작하여 게시한 정보 제공자와 광고성 정보가 유통되는 플랫폼 사업자에게도 그와 같은 의무를 부과해야 한다는 주장이 제기되고 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "식품 판매자 '갑'은 상품의 효능을 과장한 글과 가상 의료인이 등장하여 효능을 알리는 동영상을 생성형 인공 지능을 이용하여 제작한 후, 인터넷 언론사로 분류된 플랫폼 A에 각각 게시하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "두 게시물은 모두 익명으로 게시되었고, 생성형 인공 지능 사용 여부를 표시하지 않았다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 지문에서 언급되지 않은 법률은 적용하지 않음.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MAPPING",
    "SCOPE",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "'갑'이 생성형 인공 지능을 이용했다는 표면적 일치에 주목하여, 광고성 정보 제작자를 인공 지능 활용 제품·서비스 제공 사업자와 동일시한다. 그러면 표시하지 않은 '갑'은 ⓐ로 제재받아야 한다고 생각해 옳은 선지를 부적절하다고 판단한다.",
  "predictedSelectionPercent": 20
}
```

##### C3

태그: ["ATTRIBUTION","PARAPHRASE_DISTANCE","MULTI_STEP"]

유인 경로 원문:

실명 확인 규정의 위헌 결정과 사회적·정치적 표현의 자율적 경쟁이라는 취지를 연결하지 못하면, △△법에 대한 판단은 사건과 무관하다고 생각할 수 있다. 다수 의견을 정부 규제를 지지하는 입장으로 혼동해도 '부합하지 않는다'는 옳은 판단을 틀렸다고 보게 된다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "우리나라 헌법 재판소도 사회적·정치적 표현의 진위나 가치 여부는 사상과 의견의 경쟁으로 해결되어야 한다는 입장을 유지하고 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "선거 운동 기간 중에 게시판 이용자의 실명 확인 조치를 하지 않은 인터넷 언론사를 제재하는 법률 규정의 위헌 여부에 대해, 헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "이에 '을'은 사회적 갈등을 유발할 위험이 매우 크다며 그러한 주장을 하는 이들을 처벌하는 '△△법'의 제정이 필요하다는 글을 작성했다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "ATTRIBUTION",
    "PARAPHRASE_DISTANCE",
    "MULTI_STEP"
  ],
  "attractionMechanism": "실명 확인 규정의 위헌 결정과 사회적·정치적 표현의 자율적 경쟁이라는 취지를 연결하지 못하면, △△법에 대한 판단은 사건과 무관하다고 생각할 수 있다. 다수 의견을 정부 규제를 지지하는 입장으로 혼동해도 '부합하지 않는다'는 옳은 판단을 틀렸다고 보게 된다.",
  "predictedSelectionPercent": 10
}
```

##### C4

태그: ["MAPPING","MULTI_STEP","PARAPHRASE_DISTANCE"]

유인 경로 원문:

서로 다른 이름의 반복 게시가 다수 시민의 의견처럼 오인되고 정책 결정에 영향을 줄 수 있다는 연결을 놓치면, 단순한 반복 게시가 소수 의견의 근거가 될 수 없다고 판단한다. 소수 의견을 실명 확인 문제에만 한정해 이해해도 옳은 선지를 고르게 된다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "또 허위·왜곡 정보가 시민의 사회적·정치적 사안 판단에 쓰이고, 정책 담당자도 특정 개인이나 집단이 의도적으로 유통한 정보를 시민의 진정한 의견으로 오인할 수 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "반면 '소수 의견'은 비판론과 같은 취지에서 허위·왜곡 정보는 토론 등 자율적 방법으로 교정되기 어렵다고 주장하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "이후 '을'은 게시자 이름을 달리해 같은 취지의 글을 플랫폼 B에 수차례 올렸다."
    },
    {
      "source": "SCENARIO",
      "quote": "이에 '을'은 사회적 갈등을 유발할 위험이 매우 크다며 그러한 주장을 하는 이들을 처벌하는 '△△법'의 제정이 필요하다는 글을 작성했다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MAPPING",
    "MULTI_STEP",
    "PARAPHRASE_DISTANCE"
  ],
  "attractionMechanism": "서로 다른 이름의 반복 게시가 다수 시민의 의견처럼 오인되고 정책 결정에 영향을 줄 수 있다는 연결을 놓치면, 단순한 반복 게시가 소수 의견의 근거가 될 수 없다고 판단한다. 소수 의견을 실명 확인 문제에만 한정해 이해해도 옳은 선지를 고르게 된다.",
  "predictedSelectionPercent": 16
}
```

##### C5

태그: []

유인 경로 원문:

헌법 재판소가 실명 확인 의무 위반 언론사를 제재하는 규정을 위헌으로 결정했으므로, 그 규정에 따라 플랫폼 B가 제재받는다는 결론은 반대 방향이다. 선거 운동 기간·인터넷 언론사라는 적용 조건이 맞더라도 위헌 결정의 효력을 먼저 판단해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "선거 운동 기간 중에 게시판 이용자의 실명 확인 조치를 하지 않은 인터넷 언론사를 제재하는 법률 규정의 위헌 여부에 대해, 헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "그 글을 인터넷 언론사로 분류된 플랫폼 B에 선거 운동 기간 중에 실명으로 게시했다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 지문에서 언급되지 않은 법률은 적용하지 않음.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "PHRASE",
  "attractionTags": [],
  "attractionMechanism": "헌법 재판소가 실명 확인 의무 위반 언론사를 제재하는 규정을 위헌으로 결정했으므로, 그 규정에 따라 플랫폼 B가 제재받는다는 결론은 반대 방향이다. 선거 운동 기간·인터넷 언론사라는 적용 조건이 맞더라도 위헌 결정의 효력을 먼저 판단해야 한다.",
  "predictedSelectionPercent": 43
}
```

#### r3: VALID

##### C1

태그: ["SCOPE","CONDITION","MAPPING"]

유인 경로 원문:

플랫폼에도 표시 의무를 부과해야 한다는 주장을 이미 시행 중인 법률의 적용 범위로 오인하면, A도 제재할 수 있다고 판단하여 이 선지를 고른다. 광고의 확산이나 유해성만으로 ⓐ의 적용 대상이 확대되지는 않는다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이에 정부는 관련 법률 조항을 통해, 인공 지능을 활용한 제품 또는 서비스를 제공하는 사업자에게 생성형 인공 지능 사용 여부를 표시하도록 하는 생성물 표시 의무를 강제하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "하지만 광고성 정보를 제작하여 게시한 정보 제공자와 광고성 정보가 유통되는 플랫폼 사업자에게도 그와 같은 의무를 부과해야 한다는 주장이 제기되고 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "식품 판매자 '갑'은 상품의 효능을 과장한 글과 가상 의료인이 등장하여 효능을 알리는 동영상을 생성형 인공 지능을 이용하여 제작한 후, 인터넷 언론사로 분류된 플랫폼 A에 각각 게시하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 지문에서 언급되지 않은 법률은 적용하지 않음.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "SCOPE",
    "CONDITION",
    "MAPPING"
  ],
  "attractionMechanism": "플랫폼에도 표시 의무를 부과해야 한다는 주장을 이미 시행 중인 법률의 적용 범위로 오인하면, A도 제재할 수 있다고 판단하여 이 선지를 고른다. 광고의 확산이나 유해성만으로 ⓐ의 적용 대상이 확대되지는 않는다.",
  "predictedSelectionPercent": 7
}
```

##### C2

태그: ["MAPPING","SCOPE","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

인공 지능으로 광고를 제작한 식품 판매자를 인공 지능 활용 제품·서비스 제공 사업자와 동일시하면 ⓐ로 제재할 수 있다고 오판한다. 허위 의료인 광고는 당연히 처벌받아야 한다는 상식을 끌어와, ⓐ에 따른 제재 가능성과 다른 법률에 따른 제재 가능성을 혼동할 수도 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이에 정부는 관련 법률 조항을 통해, 인공 지능을 활용한 제품 또는 서비스를 제공하는 사업자에게 생성형 인공 지능 사용 여부를 표시하도록 하는 생성물 표시 의무를 강제하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "하지만 광고성 정보를 제작하여 게시한 정보 제공자와 광고성 정보가 유통되는 플랫폼 사업자에게도 그와 같은 의무를 부과해야 한다는 주장이 제기되고 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "식품 판매자 '갑'은 상품의 효능을 과장한 글과 가상 의료인이 등장하여 효능을 알리는 동영상을 생성형 인공 지능을 이용하여 제작한 후, 인터넷 언론사로 분류된 플랫폼 A에 각각 게시하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "두 게시물은 모두 익명으로 게시되었고, 생성형 인공 지능 사용 여부를 표시하지 않았다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 지문에서 언급되지 않은 법률은 적용하지 않음.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MAPPING",
    "SCOPE",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "인공 지능으로 광고를 제작한 식품 판매자를 인공 지능 활용 제품·서비스 제공 사업자와 동일시하면 ⓐ로 제재할 수 있다고 오판한다. 허위 의료인 광고는 당연히 처벌받아야 한다는 상식을 끌어와, ⓐ에 따른 제재 가능성과 다른 법률에 따른 제재 가능성을 혼동할 수도 있다.",
  "predictedSelectionPercent": 17
}
```

##### C3

태그: ["ATTRIBUTION","PARAPHRASE_DISTANCE","MULTI_STEP"]

유인 경로 원문:

다수 의견의 표현 보호 취지를 실명 확인 의무 문제에만 한정하여 읽으면, 특정 정치적 주장을 처벌하자는 △△법과의 충돌을 파악하지 못한다. 또는 정부 규제를 강조하는 소수 의견의 취지를 다수 의견에 귀속하여 이 선지를 틀렸다고 판단한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "우리나라 헌법 재판소도 사회적·정치적 표현의 진위나 가치 여부는 사상과 의견의 경쟁으로 해결되어야 한다는 입장을 유지하고 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "선거 운동 기간 중에 게시판 이용자의 실명 확인 조치를 하지 않은 인터넷 언론사를 제재하는 법률 규정의 위헌 여부에 대해, 헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "이에 '을'은 사회적 갈등을 유발할 위험이 매우 크다며 그러한 주장을 하는 이들을 처벌하는 '△△법'의 제정이 필요하다는 글을 작성했다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "ATTRIBUTION",
    "PARAPHRASE_DISTANCE",
    "MULTI_STEP"
  ],
  "attractionMechanism": "다수 의견의 표현 보호 취지를 실명 확인 의무 문제에만 한정하여 읽으면, 특정 정치적 주장을 처벌하자는 △△법과의 충돌을 파악하지 못한다. 또는 정부 규제를 강조하는 소수 의견의 취지를 다수 의견에 귀속하여 이 선지를 틀렸다고 판단한다.",
  "predictedSelectionPercent": 10
}
```

##### C4

태그: ["MAPPING","MULTI_STEP","CONDITION"]

유인 경로 원문:

같은 사람이 여러 이름으로 올린 글을 단순한 반복 표현으로만 보면, 개인의 의견이 다수 시민의 의견처럼 받아들여져 정책 결정을 왜곡할 가능성을 놓친다. △△법 제정으로 이어졌다는 가정과 '근거가 될 수 있다'는 한정을 무시하고, 실제 제정이나 왜곡이 확정되지 않았다는 이유로 선지를 배제할 수도 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "또 허위·왜곡 정보가 시민의 사회적·정치적 사안 판단에 쓰이고, 정책 담당자도 특정 개인이나 집단이 의도적으로 유통한 정보를 시민의 진정한 의견으로 오인할 수 있다."
    },
    {
      "source": "PASSAGE",
      "quote": "이러한 입장에 따라 비판론은 민주주의 의사 결정의 왜곡을 막기 위해 플랫폼과 정부의 공동 규제가 강화되어야 한다고 주장한다."
    },
    {
      "source": "PASSAGE",
      "quote": "반면 '소수 의견'은 비판론과 같은 취지에서 허위·왜곡 정보는 토론 등 자율적 방법으로 교정되기 어렵다고 주장하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "이후 '을'은 게시자 이름을 달리해 같은 취지의 글을 플랫폼 B에 수차례 올렸다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MAPPING",
    "MULTI_STEP",
    "CONDITION"
  ],
  "attractionMechanism": "같은 사람이 여러 이름으로 올린 글을 단순한 반복 표현으로만 보면, 개인의 의견이 다수 시민의 의견처럼 받아들여져 정책 결정을 왜곡할 가능성을 놓친다. △△법 제정으로 이어졌다는 가정과 '근거가 될 수 있다'는 한정을 무시하고, 실제 제정이나 왜곡이 확정되지 않았다는 이유로 선지를 배제할 수도 있다.",
  "predictedSelectionPercent": 13
}
```

##### C5

태그: []

유인 경로 원문:

헌법 재판소의 결론은 실명 확인을 하지 않은 인터넷 언론사를 제재하는 규정이 위헌이라는 것이다. 따라서 그 결론에 따라 플랫폼 B가 법적 제재를 받는다는 진술은 제재 가능 여부를 반대로 서술했으므로 적절하지 않다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "선거 운동 기간 중에 게시판 이용자의 실명 확인 조치를 하지 않은 인터넷 언론사를 제재하는 법률 규정의 위헌 여부에 대해, 헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "그 글을 인터넷 언론사로 분류된 플랫폼 B에 선거 운동 기간 중에 실명으로 게시했다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 지문에서 언급되지 않은 법률은 적용하지 않음.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "PHRASE",
  "attractionTags": [],
  "attractionMechanism": "헌법 재판소의 결론은 실명 확인을 하지 않은 인터넷 언론사를 제재하는 규정이 위헌이라는 것이다. 따라서 그 결론에 따라 플랫폼 B가 법적 제재를 받는다는 진술은 제재 가능 여부를 반대로 서술했으므로 적절하지 않다.",
  "predictedSelectionPercent": 53
}
```

## surface-tension-laplace-q16 (USED)

정답: C3

실제 화작 C1~C5: 4.00, 11.00, 61.00, 15.00, 10.00
실제 언매 C1~C5: 2.00, 4.00, 83.00, 7.00, 4.00

### gpt-6-luna

평균 예측 C1~C5: 11.00, 16.00, 48.33, 10.00, 14.67

#### r1: VALID

##### C1

태그: ["SURFACE_MATCH","MULTI_STEP"]

유인 경로 원문:

파란색 잉크가 처음 안정적으로 출력됐다는 점을 근거로 적정 범위에 있었다고 판단한 뒤, 빨간색 잉크와 대조되는 정보가 있는 것처럼 읽기 쉽다. 그러나 구입 당시에는 빨간색 잉크도 안정적으로 출력되었으므로 두 잉크의 오네소르게 수가 달랐다고 볼 근거가 없다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "PASSAGE",
      "quote": "일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "UNSUPPORTED_ADDITION",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "SURFACE_MATCH",
    "MULTI_STEP"
  ],
  "attractionMechanism": "파란색 잉크가 처음 안정적으로 출력됐다는 점을 근거로 적정 범위에 있었다고 판단한 뒤, 빨간색 잉크와 대조되는 정보가 있는 것처럼 읽기 쉽다. 그러나 구입 당시에는 빨간색 잉크도 안정적으로 출력되었으므로 두 잉크의 오네소르게 수가 달랐다고 볼 근거가 없다.",
  "predictedSelectionPercent": 11
}
```

##### C2

태그: ["DIRECTION","SURFACE_MATCH"]

유인 경로 원문:

점도가 클수록 오네소르게 수가 커진다는 관계를 기억하고, 첨가제를 넣은 뒤 다시 인쇄했다는 사실을 놓치면 오네소르게 수도 커졌다고 판단할 수 있다. 하지만 문제의 원인은 점도가 커 오네소르게 수가 범위를 넘은 것이므로, 조절 후 인쇄가 가능해졌다는 것은 그 값을 낮추는 방향과 맞는다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "확인해 보니 빨간색 잉크가 구입했을 때보다 더 끈적끈적해서, 첨가제를 넣어 끈적거림의 정도를 조절하여 다시 인쇄하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고"
    },
    {
      "source": "PASSAGE",
      "quote": "가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "DIRECTION",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "점도가 클수록 오네소르게 수가 커진다는 관계를 기억하고, 첨가제를 넣은 뒤 다시 인쇄했다는 사실을 놓치면 오네소르게 수도 커졌다고 판단할 수 있다. 하지만 문제의 원인은 점도가 커 오네소르게 수가 범위를 넘은 것이므로, 조절 후 인쇄가 가능해졌다는 것은 그 값을 낮추는 방향과 맞는다.",
  "predictedSelectionPercent": 13
}
```

##### C3

태그: []

유인 경로 원문:

표면 장력과 점도는 그대로이고, 밀도를 두 배로 하면서 노즐 지름을 절반으로 하면 밀도와 노즐 지름의 곱은 유지된다. 따라서 오네소르게 수를 결정하는 요인들의 관계상 오네소르게 수는 변하지 않는다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다."
    },
    {
      "source": "SCENARIO",
      "quote": "단, 두 잉크를 내보내는 노즐은 모양과 크기가 동일하다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "NONE",
  "attractionTags": [],
  "attractionMechanism": "표면 장력과 점도는 그대로이고, 밀도를 두 배로 하면서 노즐 지름을 절반으로 하면 밀도와 노즐 지름의 곱은 유지된다. 따라서 오네소르게 수를 결정하는 요인들의 관계상 오네소르게 수는 변하지 않는다.",
  "predictedSelectionPercent": 54
}
```

##### C4

태그: ["CONDITION","SURFACE_MATCH"]

유인 경로 원문:

두 달이 지난 시점에 빨간색 잉크에 문제가 생긴 사실을 파란색 잉크에도 적용해, 파란색도 적정 범위를 벗어났다고 추측할 수 있다. 그러나 시나리오는 그 시점의 파란색 잉크가 구입 당시와 차이가 없다고 명시하며, 구입 당시에는 안정적으로 출력되었다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "이 시점에 파란색 잉크는 구입했을 때와 차이가 없었다."
    },
    {
      "source": "SCENARIO",
      "quote": "시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "PASSAGE",
      "quote": "일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "UNSUPPORTED_ADDITION",
  "transformSize": "PHRASE",
  "attractionTags": [
    "CONDITION",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "두 달이 지난 시점에 빨간색 잉크에 문제가 생긴 사실을 파란색 잉크에도 적용해, 파란색도 적정 범위를 벗어났다고 추측할 수 있다. 그러나 시나리오는 그 시점의 파란색 잉크가 구입 당시와 차이가 없다고 명시하며, 구입 당시에는 안정적으로 출력되었다.",
  "predictedSelectionPercent": 8
}
```

##### C5

태그: ["DIRECTION","CONDITION"]

유인 경로 원문:

점도가 커지면 오네소르게 수가 커진다는 관계와 위성 잉크 방울이 생길 수 있다는 내용을 연결하면, 끈적해진 파란색 잉크에서도 위성 방울이 생긴다고 생각하기 쉽다. 그러나 지문은 오네소르게 수가 범위를 넘을 정도로 커지면 잉크가 노즐 밖으로 나오지 못하고, 위성 방울은 그와 반대의 경우에 생긴다고 설명한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "이후 세 달이 더 지난 후에도 문서를 인쇄해 보았다."
    },
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고"
    },
    {
      "source": "PASSAGE",
      "quote": "가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다. 이와 반대의 경우, 수많은 위성 잉크 방울이 생겨 원치 않는 오염이 발생한다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "DIRECTION",
    "CONDITION"
  ],
  "attractionMechanism": "점도가 커지면 오네소르게 수가 커진다는 관계와 위성 잉크 방울이 생길 수 있다는 내용을 연결하면, 끈적해진 파란색 잉크에서도 위성 방울이 생긴다고 생각하기 쉽다. 그러나 지문은 오네소르게 수가 범위를 넘을 정도로 커지면 잉크가 노즐 밖으로 나오지 못하고, 위성 방울은 그와 반대의 경우에 생긴다고 설명한다.",
  "predictedSelectionPercent": 14
}
```

#### r2: VALID

##### C1

태그: ["CONDITION","SCOPE"]

유인 경로 원문:

나중에 빨간색 잉크만 노즐에서 나오지 않았다는 점에 주목해, 빨간색 잉크는 구입 당시에도 적정 범위 밖이었을 것이라고 소급해 판단할 수 있다. 그러나 시나리오는 구입 직후 두 잉크 모두 안정적으로 출력되었다고 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "PASSAGE",
      "quote": "일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "CONDITION_CHANGE",
  "transformSize": "PHRASE",
  "attractionTags": [
    "CONDITION",
    "SCOPE"
  ],
  "attractionMechanism": "나중에 빨간색 잉크만 노즐에서 나오지 않았다는 점에 주목해, 빨간색 잉크는 구입 당시에도 적정 범위 밖이었을 것이라고 소급해 판단할 수 있다. 그러나 시나리오는 구입 직후 두 잉크 모두 안정적으로 출력되었다고 한다.",
  "predictedSelectionPercent": 12
}
```

##### C2

태그: ["DIRECTION","MULTI_STEP"]

유인 경로 원문:

첨가제를 넣어 인쇄가 다시 잘되었다는 결과에만 주목해 오네소르게 수를 키워서 안정 범위에 들어갔다고 생각할 수 있다. 하지만 문제의 원인은 점도 증가로 오네소르게 수가 범위보다 커진 것이므로, 점도를 조절해 문제를 해결하려면 오네소르게 수는 낮아져야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고,"
    },
    {
      "source": "PASSAGE",
      "quote": "가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다."
    },
    {
      "source": "SCENARIO",
      "quote": "빨간색 잉크가 구입했을 때보다 더 끈적끈적해서, 첨가제를 넣어 끈적거림의 정도를 조절하여 다시 인쇄하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "PHRASE",
  "attractionTags": [
    "DIRECTION",
    "MULTI_STEP"
  ],
  "attractionMechanism": "첨가제를 넣어 인쇄가 다시 잘되었다는 결과에만 주목해 오네소르게 수를 키워서 안정 범위에 들어갔다고 생각할 수 있다. 하지만 문제의 원인은 점도 증가로 오네소르게 수가 범위보다 커진 것이므로, 점도를 조절해 문제를 해결하려면 오네소르게 수는 낮아져야 한다.",
  "predictedSelectionPercent": 21
}
```

##### C3

태그: []

유인 경로 원문:

점도와 표면 장력은 그대로이고, 밀도를 두 배로 하면서 노즐 지름을 반으로 줄이면 밀도와 노즐 지름의 곱은 변하지 않는다. 따라서 오네소르게 수도 변하지 않는다는 추론이 타당하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다."
    }
  ],
  "evidenceSpan": "SAME_SENTENCE",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "점도와 표면 장력은 그대로이고, 밀도를 두 배로 하면서 노즐 지름을 반으로 줄이면 밀도와 노즐 지름의 곱은 변하지 않는다. 따라서 오네소르게 수도 변하지 않는다는 추론이 타당하다.",
  "predictedSelectionPercent": 42
}
```

##### C4

태그: ["CONDITION","SURFACE_MATCH"]

유인 경로 원문:

두 달이 지났다는 시간의 경과와 빨간색 잉크의 변화를 파란색 잉크에도 적용해, 파란색 잉크의 오네소르게 수 역시 적정 범위를 벗어났다고 추측할 수 있다. 그러나 파란색 잉크는 구입 당시와 차이가 없고, 구입 직후 안정적으로 출력되었다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "SCENARIO",
      "quote": "이 시점에 파란색 잉크는 구입했을 때와 차이가 없었다."
    },
    {
      "source": "PASSAGE",
      "quote": "일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "CONDITION_CHANGE",
  "transformSize": "PHRASE",
  "attractionTags": [
    "CONDITION",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "두 달이 지났다는 시간의 경과와 빨간색 잉크의 변화를 파란색 잉크에도 적용해, 파란색 잉크의 오네소르게 수 역시 적정 범위를 벗어났다고 추측할 수 있다. 그러나 파란색 잉크는 구입 당시와 차이가 없고, 구입 직후 안정적으로 출력되었다.",
  "predictedSelectionPercent": 13
}
```

##### C5

태그: ["DIRECTION","MULTI_STEP"]

유인 경로 원문:

점도가 커지면 오네소르게 수가 커진다는 관계와, 오네소르게 수가 범위보다 작을 때 위성 잉크 방울이 생긴다는 설명을 혼동할 수 있다. 하지만 구입 당시 안정적으로 출력된 잉크의 점도만 커지고 다른 조건이 같다면 오네소르게 수는 증가하므로, 위성 방울이 생기는 방향으로 변한다고 볼 수 없다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고,"
    },
    {
      "source": "PASSAGE",
      "quote": "가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다. 이와 반대의 경우, 수많은 위성 잉크 방울이 생겨 원치 않는 오염이 발생한다."
    },
    {
      "source": "SCENARIO",
      "quote": "시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "DIRECTION",
    "MULTI_STEP"
  ],
  "attractionMechanism": "점도가 커지면 오네소르게 수가 커진다는 관계와, 오네소르게 수가 범위보다 작을 때 위성 잉크 방울이 생긴다는 설명을 혼동할 수 있다. 하지만 구입 당시 안정적으로 출력된 잉크의 점도만 커지고 다른 조건이 같다면 오네소르게 수는 증가하므로, 위성 방울이 생기는 방향으로 변한다고 볼 수 없다.",
  "predictedSelectionPercent": 12
}
```

#### r3: VALID

##### C1

태그: ["SURFACE_MATCH","CONDITION"]

유인 경로 원문:

파란색 잉크가 처음에 안정적으로 출력되었으므로 그 오네소르게 수가 적정 범위였다는 점은 맞다. 그러나 빨간색 잉크도 같은 때 안정적으로 출력되었으므로 ‘빨간색과 달리’라는 비교가 틀렸음을 놓치면 선지를 참으로 판단할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "PASSAGE",
      "quote": "일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "UNSUPPORTED_ADDITION",
  "transformSize": "PHRASE",
  "attractionTags": [
    "SURFACE_MATCH",
    "CONDITION"
  ],
  "attractionMechanism": "파란색 잉크가 처음에 안정적으로 출력되었으므로 그 오네소르게 수가 적정 범위였다는 점은 맞다. 그러나 빨간색 잉크도 같은 때 안정적으로 출력되었으므로 ‘빨간색과 달리’라는 비교가 틀렸음을 놓치면 선지를 참으로 판단할 수 있다.",
  "predictedSelectionPercent": 10
}
```

##### C2

태그: ["DIRECTION","SURFACE_MATCH"]

유인 경로 원문:

잉크의 끈적거림이 조절되었다는 사실에 주목해 첨가제가 오네소르게 수를 키웠다고 연결할 수 있다. 하지만 점도를 낮추는 조절은 오네소르게 수도 낮추는 방향이며, 점도가 커져 오네소르게 수가 지나치게 커지면 잉크가 노즐 밖으로 나오지 못한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다."
    },
    {
      "source": "PASSAGE",
      "quote": "가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다."
    },
    {
      "source": "SCENARIO",
      "quote": "확인해 보니 빨간색 잉크가 구입했을 때보다 더 끈적끈적해서, 첨가제를 넣어 끈적거림의 정도를 조절하여 다시 인쇄하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "PHRASE",
  "attractionTags": [
    "DIRECTION",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "잉크의 끈적거림이 조절되었다는 사실에 주목해 첨가제가 오네소르게 수를 키웠다고 연결할 수 있다. 하지만 점도를 낮추는 조절은 오네소르게 수도 낮추는 방향이며, 점도가 커져 오네소르게 수가 지나치게 커지면 잉크가 노즐 밖으로 나오지 못한다.",
  "predictedSelectionPercent": 14
}
```

##### C3

태그: []

유인 경로 원문:

점도와 표면 장력이 유지되면, 밀도와 노즐 지름의 곱이 오네소르게 수에 영향을 준다. 밀도를 두 배로 하고 지름을 반으로 하면 그 곱은 같으므로 오네소르게 수도 변하지 않는다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 두 잉크를 내보내는 노즐은 모양과 크기가 동일하다.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "점도와 표면 장력이 유지되면, 밀도와 노즐 지름의 곱이 오네소르게 수에 영향을 준다. 밀도를 두 배로 하고 지름을 반으로 하면 그 곱은 같으므로 오네소르게 수도 변하지 않는다.",
  "predictedSelectionPercent": 49
}
```

##### C4

태그: ["CONDITION","SCOPE"]

유인 경로 원문:

두 달이라는 시간이 지났다는 사실을 잉크의 성질 변화로 여길 수 있다. 그러나 보기에서는 그 시점의 파란색 잉크가 구입 당시와 차이가 없다고 했고, 구입 당시 안정적으로 출력되었으므로 적정 범위를 벗어났다고 볼 수 없다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "이 시점에 파란색 잉크는 구입했을 때와 차이가 없었다."
    },
    {
      "source": "SCENARIO",
      "quote": "시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "PASSAGE",
      "quote": "일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "CONDITION_CHANGE",
  "transformSize": "PHRASE",
  "attractionTags": [
    "CONDITION",
    "SCOPE"
  ],
  "attractionMechanism": "두 달이라는 시간이 지났다는 사실을 잉크의 성질 변화로 여길 수 있다. 그러나 보기에서는 그 시점의 파란색 잉크가 구입 당시와 차이가 없다고 했고, 구입 당시 안정적으로 출력되었으므로 적정 범위를 벗어났다고 볼 수 없다.",
  "predictedSelectionPercent": 9
}
```

##### C5

태그: ["DIRECTION","CONDITION","MULTI_STEP"]

유인 경로 원문:

점도가 변해 오네소르게 수가 달라진다는 점에서 위성 방울 발생까지 이어 붙이기 쉽다. 하지만 파란색 잉크는 처음에 안정적으로 출력되었고 이후에도 한동안 차이가 없었으므로 적정 범위에서 시작한다. 점도가 커지면 오네소르게 수는 커지는 방향인 반면 위성 방울은 오네소르게 수가 범위보다 작을 때 생기므로, 이를 점도 증가와 연결할 수 없다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "SCENARIO",
      "quote": "이 시점에 파란색 잉크는 구입했을 때와 차이가 없었다."
    },
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다."
    },
    {
      "source": "PASSAGE",
      "quote": "이와 반대의 경우, 수많은 위성 잉크 방울이 생겨 원치 않는 오염이 발생한다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "DIRECTION",
    "CONDITION",
    "MULTI_STEP"
  ],
  "attractionMechanism": "점도가 변해 오네소르게 수가 달라진다는 점에서 위성 방울 발생까지 이어 붙이기 쉽다. 하지만 파란색 잉크는 처음에 안정적으로 출력되었고 이후에도 한동안 차이가 없었으므로 적정 범위에서 시작한다. 점도가 커지면 오네소르게 수는 커지는 방향인 반면 위성 방울은 오네소르게 수가 범위보다 작을 때 생기므로, 이를 점도 증가와 연결할 수 없다.",
  "predictedSelectionPercent": 18
}
```

### gpt-6.1-sol

평균 예측 C1~C5: 8.00, 15.00, 56.67, 5.00, 15.33

#### r1: VALID

##### C1

태그: ["CONDITION","SURFACE_MATCH"]

유인 경로 원문:

파란색 잉크가 안정적으로 출력되었다는 사실과 적정 범위의 수치가 일치하는 데만 주목하면 고를 수 있다. 그러나 '달리'는 구입 당시 빨간색 잉크를 적정 범위에서 제외하며, 이는 두 잉크 모두 안정적으로 출력되었다는 조건과 어긋난다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "잉크젯 프린터와 잉크를 구입한 직후, 시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "PASSAGE",
      "quote": "일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "CONDITION_CHANGE",
  "transformSize": "WORD",
  "attractionTags": [
    "CONDITION",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "파란색 잉크가 안정적으로 출력되었다는 사실과 적정 범위의 수치가 일치하는 데만 주목하면 고를 수 있다. 그러나 '달리'는 구입 당시 빨간색 잉크를 적정 범위에서 제외하며, 이는 두 잉크 모두 안정적으로 출력되었다는 조건과 어긋난다.",
  "predictedSelectionPercent": 8
}
```

##### C2

태그: ["DIRECTION","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

첨가제로 인쇄 성능이 좋아졌으므로 관련 수치도 커졌을 것이라고 판단하면 고를 수 있다. 실제로는 점도 증가로 너무 커진 오네소르게 수를 낮추어 적정 범위로 되돌려야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "두 달이 지난 후에 다시 문서를 인쇄하니 빨간색 잉크가 노즐에서 나오지 않았다."
    },
    {
      "source": "SCENARIO",
      "quote": "확인해 보니 빨간색 잉크가 구입했을 때보다 더 끈적끈적해서, 첨가제를 넣어 끈적거림의 정도를 조절하여 다시 인쇄하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다."
    },
    {
      "source": "PASSAGE",
      "quote": "가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "PHRASE",
  "attractionTags": [
    "DIRECTION",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "첨가제로 인쇄 성능이 좋아졌으므로 관련 수치도 커졌을 것이라고 판단하면 고를 수 있다. 실제로는 점도 증가로 너무 커진 오네소르게 수를 낮추어 적정 범위로 되돌려야 한다.",
  "predictedSelectionPercent": 14
}
```

##### C3

태그: []

유인 경로 원문:

밀도를 두 배로 하고 노즐 지름을 반으로 하면 두 값의 곱은 그대로이다. 점도와 표면 장력도 유지되므로 오네소르게 수는 변하지 않는다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다."
    }
  ],
  "evidenceSpan": "SAME_SENTENCE",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "밀도를 두 배로 하고 노즐 지름을 반으로 하면 두 값의 곱은 그대로이다. 점도와 표면 장력도 유지되므로 오네소르게 수는 변하지 않는다.",
  "predictedSelectionPercent": 58
}
```

##### C4

태그: ["REFERENT","MAPPING"]

유인 경로 원문:

두 달 후 발생한 빨간색 잉크의 출력 문제를 파란색 잉크의 상태로 옮겨 이해하면 고를 수 있다. 파란색 잉크는 구입 당시와 차이가 없으므로 오네소르게 수도 기존의 적정 범위를 유지한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "잉크젯 프린터와 잉크를 구입한 직후, 시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "SCENARIO",
      "quote": "두 달이 지난 후에 다시 문서를 인쇄하니 빨간색 잉크가 노즐에서 나오지 않았다."
    },
    {
      "source": "SCENARIO",
      "quote": "이 시점에 파란색 잉크는 구입했을 때와 차이가 없었다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 두 잉크를 내보내는 노즐은 모양과 크기가 동일하다.)"
    },
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도, 표면 장력, 밀도와 잉크젯 프린터의 노즐 지름에 의해 결정된다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "MAPPING_SHIFT",
  "transformSize": "WORD",
  "attractionTags": [
    "REFERENT",
    "MAPPING"
  ],
  "attractionMechanism": "두 달 후 발생한 빨간색 잉크의 출력 문제를 파란색 잉크의 상태로 옮겨 이해하면 고를 수 있다. 파란색 잉크는 구입 당시와 차이가 없으므로 오네소르게 수도 기존의 적정 범위를 유지한다.",
  "predictedSelectionPercent": 5
}
```

##### C5

태그: ["DIRECTION","REFERENT","MULTI_STEP"]

유인 경로 원문:

점도 변화로 인쇄 문제가 생긴다는 점만 파악하거나 '이와 반대의 경우'의 지시 대상을 놓치면 위성 잉크 방울과 연결할 수 있다. 점도 증가는 오네소르게 수를 높이지만, 위성 잉크 방울은 오네소르게 수가 적정 범위보다 낮을 때 발생한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "잉크젯 프린터와 잉크를 구입한 직후, 시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "PASSAGE",
      "quote": "점도란 끈적거림의 정도를 말하며 액체가 끈적끈적할수록 점도가 크다."
    },
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다."
    },
    {
      "source": "PASSAGE",
      "quote": "가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다. 이와 반대의 경우, 수많은 위성 잉크 방울이 생겨 원치 않는 오염이 발생한다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "DIRECTION",
    "REFERENT",
    "MULTI_STEP"
  ],
  "attractionMechanism": "점도 변화로 인쇄 문제가 생긴다는 점만 파악하거나 '이와 반대의 경우'의 지시 대상을 놓치면 위성 잉크 방울과 연결할 수 있다. 점도 증가는 오네소르게 수를 높이지만, 위성 잉크 방울은 오네소르게 수가 적정 범위보다 낮을 때 발생한다.",
  "predictedSelectionPercent": 15
}
```

#### r2: VALID

##### C1

태그: ["CONDITION","SCOPE","SURFACE_MATCH"]

유인 경로 원문:

파란색 잉크가 적정 범위에 있었다는 부분과 지문의 수치가 일치하는 데 주목하여 선지 전체를 참으로 판단한다. 그러나 '빨간색 잉크의 오네소르게 수와 달리'는 구입 당시 두 잉크 모두 안정적으로 출력되었다는 조건에 어긋난다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "잉크젯 프린터와 잉크를 구입한 직후, 시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "PASSAGE",
      "quote": "일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "SCOPE_CHANGE",
  "transformSize": "PHRASE",
  "attractionTags": [
    "CONDITION",
    "SCOPE",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "파란색 잉크가 적정 범위에 있었다는 부분과 지문의 수치가 일치하는 데 주목하여 선지 전체를 참으로 판단한다. 그러나 '빨간색 잉크의 오네소르게 수와 달리'는 구입 당시 두 잉크 모두 안정적으로 출력되었다는 조건에 어긋난다.",
  "predictedSelectionPercent": 8
}
```

##### C2

태그: ["DIRECTION","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

첨가제를 넣어 인쇄 성능이 좋아졌다는 것을 오네소르게 수가 커졌다는 뜻으로 오해한다. 이미 적정 범위보다 커서 출력되지 않던 상태이므로, 정상 출력되려면 오네소르게 수가 작아져야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "두 달이 지난 후에 다시 문서를 인쇄하니 빨간색 잉크가 노즐에서 나오지 않았다."
    },
    {
      "source": "SCENARIO",
      "quote": "확인해 보니 빨간색 잉크가 구입했을 때보다 더 끈적끈적해서, 첨가제를 넣어 끈적거림의 정도를 조절하여 다시 인쇄하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "PHRASE",
  "attractionTags": [
    "DIRECTION",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "첨가제를 넣어 인쇄 성능이 좋아졌다는 것을 오네소르게 수가 커졌다는 뜻으로 오해한다. 이미 적정 범위보다 커서 출력되지 않던 상태이므로, 정상 출력되려면 오네소르게 수가 작아져야 한다.",
  "predictedSelectionPercent": 17
}
```

##### C3

태그: []

유인 경로 원문:

밀도를 두 배로 하고 노즐 지름을 반으로 하면 두 값의 곱은 유지된다. 점도와 표면 장력도 그대로이므로 오네소르게 수는 변하지 않는다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다."
    }
  ],
  "evidenceSpan": "SAME_SENTENCE",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "밀도를 두 배로 하고 노즐 지름을 반으로 하면 두 값의 곱은 유지된다. 점도와 표면 장력도 그대로이므로 오네소르게 수는 변하지 않는다.",
  "predictedSelectionPercent": 56
}
```

##### C4

태그: ["REFERENT","MAPPING"]

유인 경로 원문:

두 달 뒤 적정 범위를 벗어난 빨간색 잉크의 상태를 파란색 잉크에도 대응시킨다. 파란색 잉크는 구입 당시와 차이가 없으므로 오네소르게 수가 적정 범위를 벗어났다고 볼 수 없다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "잉크젯 프린터와 잉크를 구입한 직후, 시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "SCENARIO",
      "quote": "두 달이 지난 후에 다시 문서를 인쇄하니 빨간색 잉크가 노즐에서 나오지 않았다."
    },
    {
      "source": "SCENARIO",
      "quote": "이 시점에 파란색 잉크는 구입했을 때와 차이가 없었다."
    },
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도, 표면 장력, 밀도와 잉크젯 프린터의 노즐 지름에 의해 결정된다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "MAPPING_SHIFT",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "MAPPING"
  ],
  "attractionMechanism": "두 달 뒤 적정 범위를 벗어난 빨간색 잉크의 상태를 파란색 잉크에도 대응시킨다. 파란색 잉크는 구입 당시와 차이가 없으므로 오네소르게 수가 적정 범위를 벗어났다고 볼 수 없다.",
  "predictedSelectionPercent": 5
}
```

##### C5

태그: ["DIRECTION","MULTI_STEP","CONDITION"]

유인 경로 원문:

점도 증가가 인쇄 이상을 일으킬 수 있다는 점까지만 연결하고, 그 이상 현상을 위성 잉크 방울 생성으로 잘못 판단한다. 다른 요인이 같다면 점도 증가는 오네소르게 수를 높이는 반면, 위성 잉크 방울은 오네소르게 수가 적정 범위보다 낮을 때 발생한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "잉크젯 프린터와 잉크를 구입한 직후, 시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "PASSAGE",
      "quote": "점도란 끈적거림의 정도를 말하며 액체가 끈적끈적할수록 점도가 크다."
    },
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다."
    },
    {
      "source": "PASSAGE",
      "quote": "가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다. 이와 반대의 경우, 수많은 위성 잉크 방울이 생겨 원치 않는 오염이 발생한다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "DIRECTION",
    "MULTI_STEP",
    "CONDITION"
  ],
  "attractionMechanism": "점도 증가가 인쇄 이상을 일으킬 수 있다는 점까지만 연결하고, 그 이상 현상을 위성 잉크 방울 생성으로 잘못 판단한다. 다른 요인이 같다면 점도 증가는 오네소르게 수를 높이는 반면, 위성 잉크 방울은 오네소르게 수가 적정 범위보다 낮을 때 발생한다.",
  "predictedSelectionPercent": 14
}
```

#### r3: VALID

##### C1

태그: ["SURFACE_MATCH","SCOPE"]

유인 경로 원문:

파란색 잉크가 안정적으로 출력되었다는 사실과 적정 범위의 수치가 일치하는 데만 주목하면 이 선지를 고를 수 있다. 그러나 '빨간색 잉크의 오네소르게 수와 달리'라는 표현은 두 잉크 모두 안정적으로 출력되었다는 조건을 파란색에만 적용하도록 축소한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "잉크젯 프린터와 잉크를 구입한 직후, 시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "PASSAGE",
      "quote": "일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "SCOPE_CHANGE",
  "transformSize": "PHRASE",
  "attractionTags": [
    "SURFACE_MATCH",
    "SCOPE"
  ],
  "attractionMechanism": "파란색 잉크가 안정적으로 출력되었다는 사실과 적정 범위의 수치가 일치하는 데만 주목하면 이 선지를 고를 수 있다. 그러나 '빨간색 잉크의 오네소르게 수와 달리'라는 표현은 두 잉크 모두 안정적으로 출력되었다는 조건을 파란색에만 적용하도록 축소한다.",
  "predictedSelectionPercent": 8
}
```

##### C2

태그: ["DIRECTION","SURFACE_MATCH","MULTI_STEP"]

유인 경로 원문:

첨가제를 '넣었다'는 표현을 물성이나 수치의 증가와 연결하면 오네소르게 수가 커졌다고 판단할 수 있다. 하지만 이미 점도 증가로 적정 범위를 초과한 상태이므로 정상 인쇄를 위해서는 오네소르게 수가 작아져야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "두 달이 지난 후에 다시 문서를 인쇄하니 빨간색 잉크가 노즐에서 나오지 않았다."
    },
    {
      "source": "SCENARIO",
      "quote": "확인해 보니 빨간색 잉크가 구입했을 때보다 더 끈적끈적해서, 첨가제를 넣어 끈적거림의 정도를 조절하여 다시 인쇄하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다."
    },
    {
      "source": "PASSAGE",
      "quote": "가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "WORD",
  "attractionTags": [
    "DIRECTION",
    "SURFACE_MATCH",
    "MULTI_STEP"
  ],
  "attractionMechanism": "첨가제를 '넣었다'는 표현을 물성이나 수치의 증가와 연결하면 오네소르게 수가 커졌다고 판단할 수 있다. 하지만 이미 점도 증가로 적정 범위를 초과한 상태이므로 정상 인쇄를 위해서는 오네소르게 수가 작아져야 한다.",
  "predictedSelectionPercent": 14
}
```

##### C3

태그: []

유인 경로 원문:

밀도를 두 배로 하고 노즐 지름을 반으로 하면 두 값의 곱은 유지된다. 점도와 표면 장력도 그대로이므로 오네소르게 수를 결정하는 요인들의 결합값이 변하지 않는다는 판단이 핵심이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다."
    }
  ],
  "evidenceSpan": "SAME_SENTENCE",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "밀도를 두 배로 하고 노즐 지름을 반으로 하면 두 값의 곱은 유지된다. 점도와 표면 장력도 그대로이므로 오네소르게 수를 결정하는 요인들의 결합값이 변하지 않는다는 판단이 핵심이다.",
  "predictedSelectionPercent": 56
}
```

##### C4

태그: ["REFERENT","MAPPING"]

유인 경로 원문:

두 달 뒤 인쇄 문제가 발생했다는 정보만 기억하고, 적정 범위를 벗어난 빨간색 잉크의 상태를 파란색 잉크에 옮겨 적용하면 이 선지를 고를 수 있다. 파란색 잉크는 구입 당시와 차이가 없으므로 오네소르게 수도 기존 상태를 유지한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "잉크젯 프린터와 잉크를 구입한 직후, 시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "SCENARIO",
      "quote": "두 달이 지난 후에 다시 문서를 인쇄하니 빨간색 잉크가 노즐에서 나오지 않았다."
    },
    {
      "source": "SCENARIO",
      "quote": "이 시점에 파란색 잉크는 구입했을 때와 차이가 없었다."
    },
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도, 표면 장력, 밀도와 잉크젯 프린터의 노즐 지름에 의해 결정된다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "MAPPING_SHIFT",
  "transformSize": "WORD",
  "attractionTags": [
    "REFERENT",
    "MAPPING"
  ],
  "attractionMechanism": "두 달 뒤 인쇄 문제가 발생했다는 정보만 기억하고, 적정 범위를 벗어난 빨간색 잉크의 상태를 파란색 잉크에 옮겨 적용하면 이 선지를 고를 수 있다. 파란색 잉크는 구입 당시와 차이가 없으므로 오네소르게 수도 기존 상태를 유지한다.",
  "predictedSelectionPercent": 5
}
```

##### C5

태그: ["DIRECTION","SURFACE_MATCH","MULTI_STEP"]

유인 경로 원문:

끈적거림 증가를 인쇄 이상과 연결한 뒤, 지문에 제시된 이상 현상인 위성 잉크 방울을 곧바로 대응시키면 이 선지를 고를 수 있다. 점도 증가는 오네소르게 수를 높이는 방향이며, 위성 잉크 방울은 반대로 그 수가 적정 범위보다 작을 때 발생한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "잉크젯 프린터와 잉크를 구입한 직후, 시험 삼아 문서 한 장을 인쇄했을 때, 빨간색 잉크와 파란색 잉크 모두 안정적으로 출력되었다."
    },
    {
      "source": "PASSAGE",
      "quote": "점도란 끈적거림의 정도를 말하며 액체가 끈적끈적할수록 점도가 크다."
    },
    {
      "source": "PASSAGE",
      "quote": "오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다."
    },
    {
      "source": "PASSAGE",
      "quote": "가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다. 이와 반대의 경우, 수많은 위성 잉크 방울이 생겨 원치 않는 오염이 발생한다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "DIRECTION_REVERSAL",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "DIRECTION",
    "SURFACE_MATCH",
    "MULTI_STEP"
  ],
  "attractionMechanism": "끈적거림 증가를 인쇄 이상과 연결한 뒤, 지문에 제시된 이상 현상인 위성 잉크 방울을 곧바로 대응시키면 이 선지를 고를 수 있다. 점도 증가는 오네소르게 수를 높이는 방향이며, 위성 잉크 방울은 반대로 그 수가 적정 범위보다 작을 때 발생한다.",
  "predictedSelectionPercent": 17
}
```

## mrna-vaccine-lipid-nanoparticle-q19 (USED)

정답: C5

실제 화작 C1~C5: 6.00, 10.00, 19.00, 25.00, 39.00
실제 언매 C1~C5: 6.00, 10.00, 19.00, 25.00, 39.00

### gpt-6-luna

평균 예측 C1~C5: 8.33, 10.33, 9.67, 11.00, 60.67

#### r1: VALID

##### C1

태그: ["MULTI_STEP","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

에탄올이 지문에 직접 설명되지 않았다는 점에 주목하거나, 에탄올을 친수성 물질로만 여겨 지질과 섞일 수 없다고 판단할 수 있다. 그러나 보기에서 지질이 에탄올에 녹아 있고, 지문의 소수성 물질 간 혼합 원리를 적용하면 이 선지는 적절하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "지질 분자는 지방산으로 이루어져 있기 때문에 물 분자와 섞이지 않는 소수성을 갖는다."
    },
    {
      "source": "PASSAGE",
      "quote": "소수성 물질은 소수성 물질과만 섞이기 때문이다."
    },
    {
      "source": "SCENARIO",
      "quote": "에탄올에 녹인 이온화 지질"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MULTI_STEP",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "에탄올이 지문에 직접 설명되지 않았다는 점에 주목하거나, 에탄올을 친수성 물질로만 여겨 지질과 섞일 수 없다고 판단할 수 있다. 그러나 보기에서 지질이 에탄올에 녹아 있고, 지문의 소수성 물질 간 혼합 원리를 적용하면 이 선지는 적절하다.",
  "predictedSelectionPercent": 9
}
```

##### C2

태그: ["CONDITION"]

유인 경로 원문:

보기의 ‘일정한 속도’를 고정된 필수 조건으로 해석해, 투입 속도를 조절한다는 선지를 보기의 과정과 양립할 수 없다고 판단할 수 있다. 하지만 일정한 투입 속도와 균일한 복합체 형성이라는 보기의 설명을 바탕으로 투입량 조절과 균일도 유지의 관계를 추론할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "이렇게 혼합된 용액을 수용성 완충 용액으로 투석 처리하여 pH를 높인다."
    },
    {
      "source": "SCENARIO",
      "quote": "에탄올을 제거하여 균일한 상태의 mRNA-지질 나노 입자 복합체를 얻어낸다."
    },
    {
      "source": "SCENARIO",
      "quote": "일정한 속도로 흘려보낸다."
    }
  ],
  "evidenceSpan": "SAME_PARAGRAPH",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION"
  ],
  "attractionMechanism": "보기의 ‘일정한 속도’를 고정된 필수 조건으로 해석해, 투입 속도를 조절한다는 선지를 보기의 과정과 양립할 수 없다고 판단할 수 있다. 하지만 일정한 투입 속도와 균일한 복합체 형성이라는 보기의 설명을 바탕으로 투입량 조절과 균일도 유지의 관계를 추론할 수 있다.",
  "predictedSelectionPercent": 9
}
```

##### C3

태그: ["CONDITION","DIRECTION"]

유인 경로 원문:

에탄올의 pH가 7이라는 보기의 조건을 혼합물 전체의 pH에도 곧바로 적용하면, 산성 환경에서 이온화 지질이 양이온화된다는 점을 놓칠 수 있다. 그러나 mRNA가 산성 용액에 있고, 지문은 낮은 pH에서 이온화 지질이 양이온화된다고 설명하므로 결합 추론은 적절하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "산성 용액에 녹인 mRNA"
    },
    {
      "source": "PASSAGE",
      "quote": "pH가 낮은 용액에서는 수소 이온 농도가 높으므로 이온화 지질이 양이온화된다."
    },
    {
      "source": "PASSAGE",
      "quote": "음전하를 띤 mRNA가 양이온성 지질로 둘러싸이면 음전하를 띤 세포막의 인산기 머리와 서로 반발하지 않기 때문이다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "DIRECTION"
  ],
  "attractionMechanism": "에탄올의 pH가 7이라는 보기의 조건을 혼합물 전체의 pH에도 곧바로 적용하면, 산성 환경에서 이온화 지질이 양이온화된다는 점을 놓칠 수 있다. 그러나 mRNA가 산성 용액에 있고, 지문은 낮은 pH에서 이온화 지질이 양이온화된다고 설명하므로 결합 추론은 적절하다.",
  "predictedSelectionPercent": 12
}
```

##### C4

태그: ["CONDITION"]

유인 경로 원문:

투석 전의 산성 용액에만 초점을 두거나, 수용성 완충 용액으로 투석하는 것이 pH를 바꾸지 않는다고 오해하면 이 선지를 부적절하다고 볼 수 있다. 하지만 보기에서 투석으로 pH를 높인다고 했고, 지문은 높은 pH에서 이온화 지질이 중성이 된다고 설명한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "수용성 완충 용액으로 투석 처리하여 pH를 높인다."
    },
    {
      "source": "PASSAGE",
      "quote": "반면 pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로 이온화 지질에 혈장 단백질이 흡착되지 않는다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION"
  ],
  "attractionMechanism": "투석 전의 산성 용액에만 초점을 두거나, 수용성 완충 용액으로 투석하는 것이 pH를 바꾸지 않는다고 오해하면 이 선지를 부적절하다고 볼 수 있다. 하지만 보기에서 투석으로 pH를 높인다고 했고, 지문은 높은 pH에서 이온화 지질이 중성이 된다고 설명한다.",
  "predictedSelectionPercent": 13
}
```

##### C5

태그: []

유인 경로 원문:

투석으로 pH가 높아지고 이온화 지질이 중성이 된다는 점은 근거가 있지만, 지문과 보기에는 높은 pH에서 소수성이 약해진다거나 분자 간 인력이 감소해 더 작은 복합체가 형성된다는 설명이 없다. 따라서 이 선지의 추가된 크기·소수성 변화를 근거 없는 내용으로 판단해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "이렇게 혼합된 용액을 수용성 완충 용액으로 투석 처리하여 pH를 높인다."
    },
    {
      "source": "PASSAGE",
      "quote": "반면 pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로 이온화 지질에 혈장 단백질이 흡착되지 않는다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "UNSUPPORTED_ADDITION",
  "transformSize": "PHRASE",
  "attractionTags": [],
  "attractionMechanism": "투석으로 pH가 높아지고 이온화 지질이 중성이 된다는 점은 근거가 있지만, 지문과 보기에는 높은 pH에서 소수성이 약해진다거나 분자 간 인력이 감소해 더 작은 복합체가 형성된다는 설명이 없다. 따라서 이 선지의 추가된 크기·소수성 변화를 근거 없는 내용으로 판단해야 한다.",
  "predictedSelectionPercent": 57
}
```

#### r2: VALID

##### C1

태그: ["POLARITY","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

에탄올이 지질을 녹인다는 보기에 제시된 사실을 지문의 소수성 물질 간 혼합 원리와 연결하면 타당한 추론이다. 다만 에탄올의 성질에 대한 배경지식에 의존해 이 추론을 부정하면 적절한 진술을 오답으로 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "소수성 물질은 소수성 물질과만 섞이기 때문이다."
    },
    {
      "source": "SCENARIO",
      "quote": "에탄올에 녹인 이온화 지질"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "에탄올이 지질을 녹인다는 보기에 제시된 사실을 지문의 소수성 물질 간 혼합 원리와 연결하면 타당한 추론이다. 다만 에탄올의 성질에 대한 배경지식에 의존해 이 추론을 부정하면 적절한 진술을 오답으로 고를 수 있다.",
  "predictedSelectionPercent": 8
}
```

##### C2

태그: ["POLARITY","CONDITION","SURFACE_MATCH"]

유인 경로 원문:

보기의 일정한 공급과 균일한 복합체 형성을 연결해 투입 속도를 조절하는 것이 균일도 유지에 중요하다고 이해할 수 있다. 반대로 ‘일정한 속도’를 ‘속도 조절이 불필요하다’는 뜻으로만 읽으면 적절한 진술을 부적절하다고 판단할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "일정한 속도로 흘려보낸다."
    },
    {
      "source": "SCENARIO",
      "quote": "균일한 상태의 mRNA-지질 나노 입자 복합체를 얻어낸다."
    }
  ],
  "evidenceSpan": "SAME_PARAGRAPH",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "CONDITION",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "보기의 일정한 공급과 균일한 복합체 형성을 연결해 투입 속도를 조절하는 것이 균일도 유지에 중요하다고 이해할 수 있다. 반대로 ‘일정한 속도’를 ‘속도 조절이 불필요하다’는 뜻으로만 읽으면 적절한 진술을 부적절하다고 판단할 수 있다.",
  "predictedSelectionPercent": 10
}
```

##### C3

태그: ["POLARITY","MULTI_STEP"]

유인 경로 원문:

산성 용액의 낮은 pH가 이온화 지질을 양이온화하고, 낮은 pH에서 mRNA와 이온화 지질을 결합시킨다는 두 근거를 연결해야 한다. 이 과정을 놓치거나 ‘양전하’를 세포막과의 반발로만 연결하면 적절한 진술을 오답으로 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "산성 용액에 녹인 mRNA와 에탄올에 녹인 이온화 지질"
    },
    {
      "source": "PASSAGE",
      "quote": "pH가 낮은 용액에서는 수소 이온 농도가 높으므로 이온화 지질이 양이온화된다."
    },
    {
      "source": "PASSAGE",
      "quote": "낮은 pH에서 mRNA와 이온화 지질을 결합시킨 뒤 pH를 높이면"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "MULTI_STEP"
  ],
  "attractionMechanism": "산성 용액의 낮은 pH가 이온화 지질을 양이온화하고, 낮은 pH에서 mRNA와 이온화 지질을 결합시킨다는 두 근거를 연결해야 한다. 이 과정을 놓치거나 ‘양전하’를 세포막과의 반발로만 연결하면 적절한 진술을 오답으로 고를 수 있다.",
  "predictedSelectionPercent": 8
}
```

##### C4

태그: ["POLARITY","DIRECTION"]

유인 경로 원문:

투석으로 pH가 높아지면 수소 이온 농도가 낮아지고, 그 결과 이온화 지질이 중성이 된다는 흐름을 연결하면 적절한 진술이다. pH 변화와 수소 이온 농도의 관계를 반대로 이해하면 이를 부적절하다고 판단할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "수용성 완충 용액으로 투석 처리하여 pH를 높인다."
    },
    {
      "source": "PASSAGE",
      "quote": "pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "DIRECTION"
  ],
  "attractionMechanism": "투석으로 pH가 높아지면 수소 이온 농도가 낮아지고, 그 결과 이온화 지질이 중성이 된다는 흐름을 연결하면 적절한 진술이다. pH 변화와 수소 이온 농도의 관계를 반대로 이해하면 이를 부적절하다고 판단할 수 있다.",
  "predictedSelectionPercent": 9
}
```

##### C5

태그: []

유인 경로 원문:

정답을 고르려면 지문에서 높은 pH에 따른 이온화 지질의 중성화와 혈장 단백질 비흡착은 설명하지만, 소수성 약화나 복합체 크기 감소는 설명하지 않는다는 점을 확인해야 한다. 따라서 그 두 주장은 근거 없는 추가이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로 이온화 지질에 혈장 단백질이 흡착되지 않는다."
    },
    {
      "source": "PASSAGE",
      "quote": "소수성 꼬리는 소수성 분자 간의 인력으로 인해 서로 몰려 있는 상태로 세포막이 구성된다."
    }
  ],
  "evidenceSpan": "CROSS_PARAGRAPH",
  "transformType": "UNSUPPORTED_ADDITION",
  "transformSize": "PHRASE",
  "attractionTags": [],
  "attractionMechanism": "정답을 고르려면 지문에서 높은 pH에 따른 이온화 지질의 중성화와 혈장 단백질 비흡착은 설명하지만, 소수성 약화나 복합체 크기 감소는 설명하지 않는다는 점을 확인해야 한다. 따라서 그 두 주장은 근거 없는 추가이다.",
  "predictedSelectionPercent": 65
}
```

#### r3: VALID

##### C1

태그: ["OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

에탄올이 일반적으로 극성을 띤다는 배경지식을 앞세워, 지문과 보기에서 확인되는 ‘이온화 지질이 에탄올에 녹아 있다’는 조건을 간과하면 이 진술을 부적절하다고 판단할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "지질 분자는 지방산으로 이루어져 있기 때문에 물 분자와 섞이지 않는 소수성을 갖는다."
    },
    {
      "source": "PASSAGE",
      "quote": "소수성 물질은 소수성 물질과만 섞이기 때문이다."
    },
    {
      "source": "SCENARIO",
      "quote": "에탄올에 녹인 이온화 지질"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "PHRASE",
  "attractionTags": [
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "에탄올이 일반적으로 극성을 띤다는 배경지식을 앞세워, 지문과 보기에서 확인되는 ‘이온화 지질이 에탄올에 녹아 있다’는 조건을 간과하면 이 진술을 부적절하다고 판단할 수 있다.",
  "predictedSelectionPercent": 8
}
```

##### C2

태그: ["MULTI_STEP"]

유인 경로 원문:

유입 속도가 투입량과 혼합 조건에 영향을 주고, 이를 조절해 균일한 복합체를 얻는다는 연결을 놓치면 이 진술을 부적절하다고 볼 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "산성 용액에 녹인 mRNA와 에탄올에 녹인 이온화 지질을 Y자 형태의 미세관에 일정한 속도로 흘려보낸다."
    },
    {
      "source": "SCENARIO",
      "quote": "에탄올을 제거하여 균일한 상태의 mRNA-지질 나노 입자 복합체를 얻어낸다."
    }
  ],
  "evidenceSpan": "SAME_PARAGRAPH",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "MULTI_STEP"
  ],
  "attractionMechanism": "유입 속도가 투입량과 혼합 조건에 영향을 주고, 이를 조절해 균일한 복합체를 얻는다는 연결을 놓치면 이 진술을 부적절하다고 볼 수 있다.",
  "predictedSelectionPercent": 12
}
```

##### C3

태그: ["CONDITION","DIRECTION"]

유인 경로 원문:

에탄올의 pH가 7이라는 조건을 혼합액 전체의 pH로 잘못 적용하거나, 산성 조건에서 이온화 지질이 양이온화되는 방향을 놓치면 이 진술을 부적절하다고 판단할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "산성 용액에 녹인 mRNA"
    },
    {
      "source": "PASSAGE",
      "quote": "pH가 낮은 용액에서는 수소 이온 농도가 높으므로 이온화 지질이 양이온화된다."
    },
    {
      "source": "PASSAGE",
      "quote": "낮은 pH에서 mRNA와 이온화 지질을 결합시킨 뒤 pH를 높이면 중성의 ‘mRNA-지질 나노 입자 복합체’를 만들 수 있고"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "DIRECTION"
  ],
  "attractionMechanism": "에탄올의 pH가 7이라는 조건을 혼합액 전체의 pH로 잘못 적용하거나, 산성 조건에서 이온화 지질이 양이온화되는 방향을 놓치면 이 진술을 부적절하다고 판단할 수 있다.",
  "predictedSelectionPercent": 9
}
```

##### C4

태그: ["DIRECTION"]

유인 경로 원문:

pH가 높아질 때 수소 이온 농도가 낮아지고 이온화 지질이 중성이 되는 변화를 반대로 이해하면, 타당한 설명인 이 선지를 부적절하다고 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "수용성 완충 용액으로 투석 처리하여 pH를 높인다."
    },
    {
      "source": "PASSAGE",
      "quote": "pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "DIRECTION"
  ],
  "attractionMechanism": "pH가 높아질 때 수소 이온 농도가 낮아지고 이온화 지질이 중성이 되는 변화를 반대로 이해하면, 타당한 설명인 이 선지를 부적절하다고 고를 수 있다.",
  "predictedSelectionPercent": 11
}
```

##### C5

태그: []

유인 경로 원문:

pH 상승으로 이온화 지질이 중성이 된다는 근거는 있지만, 소수성이 약해지고 분자 간 인력이 감소하여 복합체 크기가 작아진다는 내용은 지문과 보기에서 확인되지 않는다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "수용성 완충 용액으로 투석 처리하여 pH를 높인다."
    },
    {
      "source": "PASSAGE",
      "quote": "pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로 이온화 지질에 혈장 단백질이 흡착되지 않는다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "UNSUPPORTED_ADDITION",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "pH 상승으로 이온화 지질이 중성이 된다는 근거는 있지만, 소수성이 약해지고 분자 간 인력이 감소하여 복합체 크기가 작아진다는 내용은 지문과 보기에서 확인되지 않는다.",
  "predictedSelectionPercent": 60
}
```

### gpt-6.1-sol

평균 예측 C1~C5: 12.00, 19.67, 6.33, 6.00, 56.00

#### r1: VALID

##### C1

태그: ["OUTSIDE_KNOWLEDGE","MAPPING","MULTI_STEP"]

유인 경로 원문:

에탄올이 물과 섞인다는 배경지식을 앞세워 소수성을 가질 수 없다고 판단하면 이 선지를 고른다. 지문의 물질 간 혼합 원리와 보기의 ‘지질이 에탄올에 녹음’을 결합하는 대신 외부 지식으로 적절한 추론을 부정하는 경로이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "지질 분자는 지방산으로 이루어져 있기 때문에 물 분자와 섞이지 않는 소수성을 갖는다."
    },
    {
      "source": "PASSAGE",
      "quote": "물은 분자 내 전하가 양극으로 분리된 상태인 극성을 띠거나 분자가 전하를 띠는 물질, 즉 친수성 물질과만 섞이고 소수성 물질은 소수성 물질과만 섞이기 때문이다."
    },
    {
      "source": "SCENARIO",
      "quote": "산성 용액에 녹인 mRNA와 에탄올에 녹인 이온화 지질을 Y자 형태의 미세관에 일정한 속도로 흘려보낸다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "OUTSIDE_KNOWLEDGE",
    "MAPPING",
    "MULTI_STEP"
  ],
  "attractionMechanism": "에탄올이 물과 섞인다는 배경지식을 앞세워 소수성을 가질 수 없다고 판단하면 이 선지를 고른다. 지문의 물질 간 혼합 원리와 보기의 ‘지질이 에탄올에 녹음’을 결합하는 대신 외부 지식으로 적절한 추론을 부정하는 경로이다.",
  "predictedSelectionPercent": 13
}
```

##### C2

태그: ["PARAPHRASE_DISTANCE","CONDITION","MULTI_STEP"]

유인 경로 원문:

‘일정한 속도’와 ‘균일한 상태’를 연결하지 못하고, ‘속도를 조절’한다는 표현을 속도를 계속 불규칙하게 바꾼다는 뜻으로 읽으면 부적절하다고 판단한다. 투입량을 조절하여 일정한 공급 조건을 유지한다는 추론이 원문에 직접 쓰여 있지 않아 틀려 보일 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "산성 용액에 녹인 mRNA와 에탄올에 녹인 이온화 지질을 Y자 형태의 미세관에 일정한 속도로 흘려보낸다."
    },
    {
      "source": "SCENARIO",
      "quote": "그리고 에탄올을 제거하여 균일한 상태의 mRNA-지질 나노 입자 복합체를 얻어낸다."
    }
  ],
  "evidenceSpan": "SAME_PARAGRAPH",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "PARAPHRASE_DISTANCE",
    "CONDITION",
    "MULTI_STEP"
  ],
  "attractionMechanism": "‘일정한 속도’와 ‘균일한 상태’를 연결하지 못하고, ‘속도를 조절’한다는 표현을 속도를 계속 불규칙하게 바꾼다는 뜻으로 읽으면 부적절하다고 판단한다. 투입량을 조절하여 일정한 공급 조건을 유지한다는 추론이 원문에 직접 쓰여 있지 않아 틀려 보일 수 있다.",
  "predictedSelectionPercent": 16
}
```

##### C3

태그: ["CONDITION","MAPPING"]

유인 경로 원문:

혼합 전 에탄올의 pH가 7이라는 조건을 혼합 후에도 그대로 적용하면 이온화 지질이 중성이므로 mRNA와 결합할 수 없다고 오판한다. 산성 용액과 혼합된 이후의 조건으로 바꾸어 판단해야 한다는 점을 놓치는 경로이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "pH가 낮은 용액에서는 수소 이온 농도가 높으므로 이온화 지질이 양이온화된다."
    },
    {
      "source": "PASSAGE",
      "quote": "즉 낮은 pH에서 mRNA와 이온화 지질을 결합시킨 뒤 pH를 높이면 중성의 ‘mRNA-지질 나노 입자 복합체’를 만들 수 있고, 이 복합체는 세포막의 수용체에 결합하여 내포 작용에 의해 세포 내부로 진입할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "산성 용액에 녹인 mRNA와 에탄올에 녹인 이온화 지질을 Y자 형태의 미세관에 일정한 속도로 흘려보낸다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 이때 에탄올의 pH는 7임.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "MAPPING"
  ],
  "attractionMechanism": "혼합 전 에탄올의 pH가 7이라는 조건을 혼합 후에도 그대로 적용하면 이온화 지질이 중성이므로 mRNA와 결합할 수 없다고 오판한다. 산성 용액과 혼합된 이후의 조건으로 바꾸어 판단해야 한다는 점을 놓치는 경로이다.",
  "predictedSelectionPercent": 4
}
```

##### C4

태그: ["DIRECTION","MULTI_STEP"]

유인 경로 원문:

pH 상승을 수소 이온 농도 상승으로 잘못 읽으면 이온화 지질이 더 양이온화되어야 한다고 생각해 이 선지를 고른다. pH 상승, 수소 이온 농도 감소, 전기적 중성화로 이어지는 관계를 정확히 연결해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "pH가 낮은 용액에서는 수소 이온 농도가 높으므로 이온화 지질이 양이온화된다."
    },
    {
      "source": "PASSAGE",
      "quote": "반면 pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로 이온화 지질에 혈장 단백질이 흡착되지 않는다."
    },
    {
      "source": "SCENARIO",
      "quote": "이렇게 혼합된 용액을 수용성 완충 용액으로 투석 처리하여 pH를 높인다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "DIRECTION",
    "MULTI_STEP"
  ],
  "attractionMechanism": "pH 상승을 수소 이온 농도 상승으로 잘못 읽으면 이온화 지질이 더 양이온화되어야 한다고 생각해 이 선지를 고른다. pH 상승, 수소 이온 농도 감소, 전기적 중성화로 이어지는 관계를 정확히 연결해야 한다.",
  "predictedSelectionPercent": 6
}
```

##### C5

태그: []

유인 경로 원문:

pH 상승으로 확인되는 변화는 이온화 지질의 전기적 중성화이다. 이를 소수성 약화, 소수성 분자 간 인력 감소, 복합체 크기 감소로 연결하는 인과 사슬은 지문과 보기에 근거가 없으며, ‘균일한 상태’도 ‘더 미세한 크기’를 뜻하지 않는다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "반면 pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로 이온화 지질에 혈장 단백질이 흡착되지 않는다."
    },
    {
      "source": "PASSAGE",
      "quote": "즉 낮은 pH에서 mRNA와 이온화 지질을 결합시킨 뒤 pH를 높이면 중성의 ‘mRNA-지질 나노 입자 복합체’를 만들 수 있고, 이 복합체는 세포막의 수용체에 결합하여 내포 작용에 의해 세포 내부로 진입할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "이렇게 혼합된 용액을 수용성 완충 용액으로 투석 처리하여 pH를 높인다."
    },
    {
      "source": "SCENARIO",
      "quote": "그리고 에탄올을 제거하여 균일한 상태의 mRNA-지질 나노 입자 복합체를 얻어낸다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "UNSUPPORTED_ADDITION",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "pH 상승으로 확인되는 변화는 이온화 지질의 전기적 중성화이다. 이를 소수성 약화, 소수성 분자 간 인력 감소, 복합체 크기 감소로 연결하는 인과 사슬은 지문과 보기에 근거가 없으며, ‘균일한 상태’도 ‘더 미세한 크기’를 뜻하지 않는다.",
  "predictedSelectionPercent": 61
}
```

#### r2: VALID

##### C1

태그: ["OUTSIDE_KNOWLEDGE","MAPPING","MULTI_STEP"]

유인 경로 원문:

에탄올이 물과도 섞인다는 배경지식에 기대어 소수성을 가진다는 설명을 틀렸다고 판단할 수 있다. 그러나 지문이 제시한 혼합 원리와 보기의 지질 용해 사실을 연결하면, 에탄올에 지질과 섞일 수 있는 소수성이 있다는 설명은 적절하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "지질 분자는 지방산으로 이루어져 있기 때문에 물 분자와 섞이지 않는 소수성을 갖는다."
    },
    {
      "source": "PASSAGE",
      "quote": "물은 분자 내 전하가 양극으로 분리된 상태인 극성을 띠거나 분자가 전하를 띠는 물질, 즉 친수성 물질과만 섞이고 소수성 물질은 소수성 물질과만 섞이기 때문이다."
    },
    {
      "source": "SCENARIO",
      "quote": "산성 용액에 녹인 mRNA와 에탄올에 녹인 이온화 지질을 Y자 형태의 미세관에 일정한 속도로 흘려보낸다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "OUTSIDE_KNOWLEDGE",
    "MAPPING",
    "MULTI_STEP"
  ],
  "attractionMechanism": "에탄올이 물과도 섞인다는 배경지식에 기대어 소수성을 가진다는 설명을 틀렸다고 판단할 수 있다. 그러나 지문이 제시한 혼합 원리와 보기의 지질 용해 사실을 연결하면, 에탄올에 지질과 섞일 수 있는 소수성이 있다는 설명은 적절하다.",
  "predictedSelectionPercent": 12
}
```

##### C2

태그: ["CONDITION","PARAPHRASE_DISTANCE","MULTI_STEP"]

유인 경로 원문:

보기의 ‘일정한 속도’와 선지의 ‘속도를 조절’이 서로 모순된다고 읽거나, 투입량 조절과 균일도 유지의 연결이 직접 명시되지 않았다는 이유로 고를 수 있다. 투입 속도 조절을 일정한 투입 조건을 관리하는 것으로 이해하면 보기의 균일한 복합체 형성 과정과 부합한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "산성 용액에 녹인 mRNA와 에탄올에 녹인 이온화 지질을 Y자 형태의 미세관에 일정한 속도로 흘려보낸다."
    },
    {
      "source": "SCENARIO",
      "quote": "그리고 에탄올을 제거하여 균일한 상태의 mRNA-지질 나노 입자 복합체를 얻어낸다."
    }
  ],
  "evidenceSpan": "SAME_PARAGRAPH",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "PARAPHRASE_DISTANCE",
    "MULTI_STEP"
  ],
  "attractionMechanism": "보기의 ‘일정한 속도’와 선지의 ‘속도를 조절’이 서로 모순된다고 읽거나, 투입량 조절과 균일도 유지의 연결이 직접 명시되지 않았다는 이유로 고를 수 있다. 투입 속도 조절을 일정한 투입 조건을 관리하는 것으로 이해하면 보기의 균일한 복합체 형성 과정과 부합한다.",
  "predictedSelectionPercent": 20
}
```

##### C3

태그: ["CONDITION","MAPPING","MULTI_STEP"]

유인 경로 원문:

에탄올의 pH가 7이라는 조건을 혼합 이후에도 그대로 적용하여 이온화 지질이 중성으로 남는다고 판단할 수 있다. 산성 용액과 혼합되는 단계에서는 낮은 pH에 따른 양이온화와 mRNA 결합을 적용해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "pH가 낮은 용액에서는 수소 이온 농도가 높으므로 이온화 지질이 양이온화된다."
    },
    {
      "source": "PASSAGE",
      "quote": "즉 낮은 pH에서 mRNA와 이온화 지질을 결합시킨 뒤 pH를 높이면 중성의 ‘mRNA-지질 나노 입자 복합체’를 만들 수 있고, 이 복합체는 세포막의 수용체에 결합하여 내포 작용에 의해 세포 내부로 진입할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "산성 용액에 녹인 mRNA와 에탄올에 녹인 이온화 지질을 Y자 형태의 미세관에 일정한 속도로 흘려보낸다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 이때 에탄올의 pH는 7임.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "MAPPING",
    "MULTI_STEP"
  ],
  "attractionMechanism": "에탄올의 pH가 7이라는 조건을 혼합 이후에도 그대로 적용하여 이온화 지질이 중성으로 남는다고 판단할 수 있다. 산성 용액과 혼합되는 단계에서는 낮은 pH에 따른 양이온화와 mRNA 결합을 적용해야 한다.",
  "predictedSelectionPercent": 8
}
```

##### C4

태그: ["DIRECTION","POLARITY"]

유인 경로 원문:

pH 상승을 수소 이온 농도 상승으로 잘못 읽으면 선지의 농도 감소 설명을 틀렸다고 판단할 수 있다. 또는 지문과 일치하는 중성화 설명을 확인하고도 ‘적절하지 않은 것’을 고르는 발문의 방향을 놓칠 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "pH가 낮은 용액에서는 수소 이온 농도가 높으므로 이온화 지질이 양이온화된다."
    },
    {
      "source": "PASSAGE",
      "quote": "반면 pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로 이온화 지질에 혈장 단백질이 흡착되지 않는다."
    },
    {
      "source": "SCENARIO",
      "quote": "이렇게 혼합된 용액을 수용성 완충 용액으로 투석 처리하여 pH를 높인다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "DIRECTION",
    "POLARITY"
  ],
  "attractionMechanism": "pH 상승을 수소 이온 농도 상승으로 잘못 읽으면 선지의 농도 감소 설명을 틀렸다고 판단할 수 있다. 또는 지문과 일치하는 중성화 설명을 확인하고도 ‘적절하지 않은 것’을 고르는 발문의 방향을 놓칠 수 있다.",
  "predictedSelectionPercent": 6
}
```

##### C5

태그: []

유인 경로 원문:

pH 상승의 결과로 제시된 것은 이온화 지질의 전기적 중성화이지 소수성 약화가 아니다. 소수성 분자 간 인력에 관한 설명을 가져와 ‘소수성 약화 → 인력 감소 → 복합체 크기 감소’라는 근거 없는 인과 관계를 추가했음을 판단해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "반면 pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로 이온화 지질에 혈장 단백질이 흡착되지 않는다."
    },
    {
      "source": "PASSAGE",
      "quote": "이에 따라 인지질의 친수성 머리는 세포 외부나 세포질의 수용액에 접하고 소수성 꼬리는 소수성 분자 간의 인력으로 인해 서로 몰려 있는 상태로 세포막이 구성된다."
    },
    {
      "source": "SCENARIO",
      "quote": "이렇게 혼합된 용액을 수용성 완충 용액으로 투석 처리하여 pH를 높인다."
    },
    {
      "source": "SCENARIO",
      "quote": "그리고 에탄올을 제거하여 균일한 상태의 mRNA-지질 나노 입자 복합체를 얻어낸다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "UNSUPPORTED_ADDITION",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "pH 상승의 결과로 제시된 것은 이온화 지질의 전기적 중성화이지 소수성 약화가 아니다. 소수성 분자 간 인력에 관한 설명을 가져와 ‘소수성 약화 → 인력 감소 → 복합체 크기 감소’라는 근거 없는 인과 관계를 추가했음을 판단해야 한다.",
  "predictedSelectionPercent": 54
}
```

#### r3: VALID

##### C1

태그: ["OUTSIDE_KNOWLEDGE","MAPPING","MULTI_STEP"]

유인 경로 원문:

에탄올이 물과 섞인다는 배경지식에 기대어 소수성을 가진다는 설명을 곧바로 틀렸다고 판단할 수 있다. 이 문항에서는 지질의 소수성과 에탄올에 지질이 녹는다는 사례를 지문의 혼합 원리에 대응시켜 판단해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "지질 분자는 지방산으로 이루어져 있기 때문에 물 분자와 섞이지 않는 소수성을 갖는다."
    },
    {
      "source": "PASSAGE",
      "quote": "물은 분자 내 전하가 양극으로 분리된 상태인 극성을 띠거나 분자가 전하를 띠는 물질, 즉 친수성 물질과만 섞이고 소수성 물질은 소수성 물질과만 섞이기 때문이다."
    },
    {
      "source": "SCENARIO",
      "quote": "산성 용액에 녹인 mRNA와 에탄올에 녹인 이온화 지질을 Y자 형태의 미세관에 일정한 속도로 흘려보낸다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "OUTSIDE_KNOWLEDGE",
    "MAPPING",
    "MULTI_STEP"
  ],
  "attractionMechanism": "에탄올이 물과 섞인다는 배경지식에 기대어 소수성을 가진다는 설명을 곧바로 틀렸다고 판단할 수 있다. 이 문항에서는 지질의 소수성과 에탄올에 지질이 녹는다는 사례를 지문의 혼합 원리에 대응시켜 판단해야 한다.",
  "predictedSelectionPercent": 11
}
```

##### C2

태그: ["CONDITION","PARAPHRASE_DISTANCE","MULTI_STEP"]

유인 경로 원문:

‘일정한 속도’와 ‘속도를 조절’하는 것을 상충하는 조건으로 읽거나, 투입량과 균일도의 관계가 직접 명시되지 않았다는 이유로 부적절하다고 판단할 수 있다. 일정한 혼합 조건이 유지되도록 투입 속도와 양을 제어한다는 추론을 놓치는 경로이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "산성 용액에 녹인 mRNA와 에탄올에 녹인 이온화 지질을 Y자 형태의 미세관에 일정한 속도로 흘려보낸다."
    },
    {
      "source": "SCENARIO",
      "quote": "그리고 에탄올을 제거하여 균일한 상태의 mRNA-지질 나노 입자 복합체를 얻어낸다."
    }
  ],
  "evidenceSpan": "SAME_PARAGRAPH",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "PARAPHRASE_DISTANCE",
    "MULTI_STEP"
  ],
  "attractionMechanism": "‘일정한 속도’와 ‘속도를 조절’하는 것을 상충하는 조건으로 읽거나, 투입량과 균일도의 관계가 직접 명시되지 않았다는 이유로 부적절하다고 판단할 수 있다. 일정한 혼합 조건이 유지되도록 투입 속도와 양을 제어한다는 추론을 놓치는 경로이다.",
  "predictedSelectionPercent": 23
}
```

##### C3

태그: ["CONDITION","MAPPING"]

유인 경로 원문:

에탄올의 pH가 7이라는 조건을 혼합 후에도 그대로 적용하여 이온화 지질이 중성을 유지한다고 오독할 수 있다. 산성 용액과 혼합된 단계에서는 낮은 pH에 따른 양이온화와 mRNA 결합을 적용해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "pH가 낮은 용액에서는 수소 이온 농도가 높으므로 이온화 지질이 양이온화된다."
    },
    {
      "source": "PASSAGE",
      "quote": "즉 낮은 pH에서 mRNA와 이온화 지질을 결합시킨 뒤 pH를 높이면 중성의 ‘mRNA-지질 나노 입자 복합체’를 만들 수 있고, 이 복합체는 세포막의 수용체에 결합하여 내포 작용에 의해 세포 내부로 진입할 수 있다."
    },
    {
      "source": "SCENARIO",
      "quote": "산성 용액에 녹인 mRNA와 에탄올에 녹인 이온화 지질을 Y자 형태의 미세관에 일정한 속도로 흘려보낸다."
    },
    {
      "source": "SCENARIO",
      "quote": "(단, 이때 에탄올의 pH는 7임.)"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "MAPPING"
  ],
  "attractionMechanism": "에탄올의 pH가 7이라는 조건을 혼합 후에도 그대로 적용하여 이온화 지질이 중성을 유지한다고 오독할 수 있다. 산성 용액과 혼합된 단계에서는 낮은 pH에 따른 양이온화와 mRNA 결합을 적용해야 한다.",
  "predictedSelectionPercent": 7
}
```

##### C4

태그: ["DIRECTION","POLARITY"]

유인 경로 원문:

pH 상승을 수소 이온 농도 상승으로 잘못 연결하면 중성화 설명을 부적절하다고 판단하게 된다. 또는 지문과 부합하는 설명임을 확인하고도 ‘적절하지 않은 것’을 고르는 발문의 방향을 놓쳐 선택할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "pH가 낮은 용액에서는 수소 이온 농도가 높으므로 이온화 지질이 양이온화된다."
    },
    {
      "source": "PASSAGE",
      "quote": "반면 pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로 이온화 지질에 혈장 단백질이 흡착되지 않는다."
    },
    {
      "source": "SCENARIO",
      "quote": "이렇게 혼합된 용액을 수용성 완충 용액으로 투석 처리하여 pH를 높인다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "DIRECTION",
    "POLARITY"
  ],
  "attractionMechanism": "pH 상승을 수소 이온 농도 상승으로 잘못 연결하면 중성화 설명을 부적절하다고 판단하게 된다. 또는 지문과 부합하는 설명임을 확인하고도 ‘적절하지 않은 것’을 고르는 발문의 방향을 놓쳐 선택할 수 있다.",
  "predictedSelectionPercent": 6
}
```

##### C5

태그: []

유인 경로 원문:

pH 상승의 효과로 제시된 것은 이온화 지질의 전기적 중성화이지 소수성 약화가 아니다. 소수성 분자 간 인력에 관한 설명을 가져와 복합체 크기 감소까지 연결한 인과 사슬은 지문과 보기에 근거가 없으며, ‘균일한 상태’도 ‘더 작은 크기’를 뜻하지 않는다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "반면 pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로 이온화 지질에 혈장 단백질이 흡착되지 않는다."
    },
    {
      "source": "PASSAGE",
      "quote": "이에 따라 인지질의 친수성 머리는 세포 외부나 세포질의 수용액에 접하고 소수성 꼬리는 소수성 분자 간의 인력으로 인해 서로 몰려 있는 상태로 세포막이 구성된다."
    },
    {
      "source": "SCENARIO",
      "quote": "이렇게 혼합된 용액을 수용성 완충 용액으로 투석 처리하여 pH를 높인다."
    },
    {
      "source": "SCENARIO",
      "quote": "그리고 에탄올을 제거하여 균일한 상태의 mRNA-지질 나노 입자 복합체를 얻어낸다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "UNSUPPORTED_ADDITION",
  "transformSize": "STRUCTURE",
  "attractionTags": [],
  "attractionMechanism": "pH 상승의 효과로 제시된 것은 이온화 지질의 전기적 중성화이지 소수성 약화가 아니다. 소수성 분자 간 인력에 관한 설명을 가져와 복합체 크기 감소까지 연결한 인과 사슬은 지문과 보기에 근거가 없으며, ‘균일한 상태’도 ‘더 작은 크기’를 뜻하지 않는다.",
  "predictedSelectionPercent": 53
}
```

## gongsun-long-later-mohists-q12 (DATE_MISMATCH_CANDIDATE)

정답: C4

실제 화작 C1~C5: 7.00, 12.00, 19.00, 58.00, 4.00
실제 언매 C1~C5: 5.00, 9.00, 12.00, 72.00, 3.00

### gpt-6-luna

평균 예측 C1~C5: 10.33, 10.33, 10.33, 59.00, 10.00

#### r1: VALID

##### C1

태그: ["REFERENT","MAPPING"]

유인 경로 원문:

같은 ‘옷’이라는 말이 쓰였더라도 ⓐ는 필요한 옷을 뜻하고 ⓑ는 갑이 들고 있는 특정 옷을 가리킨다고 파악하면, 서로 다른 실을 같은 명으로 지시한 사례에 공손룡의 일대일 대응 원칙을 적용할 수 있다. 이 진술은 적절하므로, 발문의 부정 방향을 놓치거나 두 표현이 같은 대상을 가리킨다고 보면 오답으로 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "‘ⓐ옷이 없어.’"
    },
    {
      "source": "SCENARIO",
      "quote": "‘지금 네가 들고 있는 ⓑ옷은 뭐니? 옷장 안에 옷이 이렇게 많은데 무슨 ⓒ옷이 없어?’"
    },
    {
      "source": "PASSAGE",
      "quote": "그는 어떤 ‘실’은 그것을 가리키는 어떤 ‘명’에 의해서만 유일하게 지시되어야 한다는 것과, 어떤 명은 유일하게 어떤 실만을 지시하여야 한다는 것을 주장하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "서로 다른 실인 이것[此]과 저것[彼]이 똑같이 ‘이것’이라는 명으로 지시된다면 서로 구별되지 않게 되고"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "MAPPING"
  ],
  "attractionMechanism": "같은 ‘옷’이라는 말이 쓰였더라도 ⓐ는 필요한 옷을 뜻하고 ⓑ는 갑이 들고 있는 특정 옷을 가리킨다고 파악하면, 서로 다른 실을 같은 명으로 지시한 사례에 공손룡의 일대일 대응 원칙을 적용할 수 있다. 이 진술은 적절하므로, 발문의 부정 방향을 놓치거나 두 표현이 같은 대상을 가리킨다고 보면 오답으로 고를 수 있다.",
  "predictedSelectionPercent": 9
}
```

##### C2

태그: ["REFERENT","MAPPING"]

유인 경로 원문:

ⓐ의 ‘옷’은 필요한 빨간 옷을 뜻하지만, ⓓ의 ‘옷’은 옷 일반을 뜻한다고 보면 같은 명이 서로 다른 실을 지시하는 사례가 된다. 이를 허용하는 후기 묵가의 주장과 연결한 진술이므로, 같은 단어가 쓰였다는 이유만으로 두 표현의 지시 대상도 같다고 판단하면 오답으로 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "‘ⓐ옷이 없어.’"
    },
    {
      "source": "SCENARIO",
      "quote": "‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    },
    {
      "source": "PASSAGE",
      "quote": "하나의 명이 서로 다른 사물을 지시할 수 있다고 하면서, 이것과 저것, 두 마리의 새가 모두 학이라면 이것과 저것을 모두 ‘학’이라고 부를 수 있다는 예시를 들었다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "MAPPING"
  ],
  "attractionMechanism": "ⓐ의 ‘옷’은 필요한 빨간 옷을 뜻하지만, ⓓ의 ‘옷’은 옷 일반을 뜻한다고 보면 같은 명이 서로 다른 실을 지시하는 사례가 된다. 이를 허용하는 후기 묵가의 주장과 연결한 진술이므로, 같은 단어가 쓰였다는 이유만으로 두 표현의 지시 대상도 같다고 판단하면 오답으로 고를 수 있다.",
  "predictedSelectionPercent": 7
}
```

##### C3

태그: ["CONDITION","SCOPE"]

유인 경로 원문:

ⓑ의 ‘옷’은 옷 일반을 가리키는 것이 아니라 갑이 들고 있는 한 개체를 지시하는 상황에서 쓰였으므로, 유명을 단 하나의 개체에 대응시킨 사명으로 볼 수 있다. ‘옷’은 보통 유명이라는 점만 보고 상황에 따른 사명 사용을 놓치면 이 진술을 부적절하다고 오판할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "‘지금 네가 들고 있는 ⓑ옷은 뭐니?"
    },
    {
      "source": "PASSAGE",
      "quote": "사명은 가리키는 대상이 오직 하나인 명을 말한다."
    },
    {
      "source": "PASSAGE",
      "quote": "다른 하나는 ‘새[鳥]’라는 유명을 어떤 한 마리의 특정한 새를 가리킬 때 사용하는 경우처럼 유명을 단 하나의 개체에만 대응하게 함으로써 만들어지는 명이다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "SCOPE"
  ],
  "attractionMechanism": "ⓑ의 ‘옷’은 옷 일반을 가리키는 것이 아니라 갑이 들고 있는 한 개체를 지시하는 상황에서 쓰였으므로, 유명을 단 하나의 개체에 대응시킨 사명으로 볼 수 있다. ‘옷’은 보통 유명이라는 점만 보고 상황에 따른 사명 사용을 놓치면 이 진술을 부적절하다고 오판할 수 있다.",
  "predictedSelectionPercent": 11
}
```

##### C4

태그: []

유인 경로 원문:

대화에서 ⓓ는 옷 일반이 정말 없다는 뜻이 아니고, ⓔ는 빨간 옷이 필요한데 없다는 뜻으로 구별된다. 따라서 두 명이 같은 대상을 지시한다는 전제가 성립하지 않으며, 이 전제를 바탕으로 한 진술은 적절하지 않다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    },
    {
      "source": "PASSAGE",
      "quote": "일상에서 흰 말이 있을 때 ‘말이 있다.’라고 하며 특정 속성이 지정되지 않은 ‘말’이라는 단어로 흰 말처럼 특정 속성을 가진 말[馬]을 지시하는 것에 대해, 공손룡은 ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 그 용법을 구분해야 한다고 하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "MAPPING_SHIFT",
  "transformSize": "PHRASE",
  "attractionTags": [],
  "attractionMechanism": "대화에서 ⓓ는 옷 일반이 정말 없다는 뜻이 아니고, ⓔ는 빨간 옷이 필요한데 없다는 뜻으로 구별된다. 따라서 두 명이 같은 대상을 지시한다는 전제가 성립하지 않으며, 이 전제를 바탕으로 한 진술은 적절하지 않다.",
  "predictedSelectionPercent": 65
}
```

##### C5

태그: ["ATTRIBUTION","SURFACE_MATCH"]

유인 경로 원문:

‘빨간 옷’은 ‘옷’에 빨간색 속성이 더해진 표현이므로, 공손룡의 흰 말 논리를 적용하면 ⓔ와 ⓒ가 지시하는 실을 구별해야 한다. 후기 묵가가 흰 말도 말이라고 본다는 내용을 공손룡의 입장에 잘못 귀속하거나, ‘옷’이라는 말이 그대로 들어 있다는 점만 보면 적절하지 않은 진술로 오해할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    },
    {
      "source": "PASSAGE",
      "quote": "‘말[馬]’은 형체를 부르는 데 쓰는 단어이고 ‘희다[白]’는 색을 부르는 데 쓰는 단어인데, 흰 말은 말에 ‘희다’라는 속성이 함께하는 것이므로 말과 다르다고 하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 그 용법을 구분해야 한다고 하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "ATTRIBUTION",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "‘빨간 옷’은 ‘옷’에 빨간색 속성이 더해진 표현이므로, 공손룡의 흰 말 논리를 적용하면 ⓔ와 ⓒ가 지시하는 실을 구별해야 한다. 후기 묵가가 흰 말도 말이라고 본다는 내용을 공손룡의 입장에 잘못 귀속하거나, ‘옷’이라는 말이 그대로 들어 있다는 점만 보면 적절하지 않은 진술로 오해할 수 있다.",
  "predictedSelectionPercent": 8
}
```

#### r2: VALID

##### C1

태그: ["REFERENT"]

유인 경로 원문:

ⓐ와 ⓑ에 같은 말 ‘옷’이 쓰였다는 점만 보고 같은 대상을 가리킨다고 생각하면, 두 표현이 서로 다른 실을 지시한다는 판단을 놓치고 이 선지를 부적절하다고 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "그는 어떤 ‘실’은 그것을 가리키는 어떤 ‘명’에 의해서만 유일하게 지시되어야 한다는 것과, 어떤 명은 유일하게 어떤 실만을 지시하여야 한다는 것을 주장하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "서로 다른 실인 이것[此]과 저것[彼]이 똑같이 ‘이것’이라는 명으로 지시된다면 서로 구별되지 않게 되고"
    },
    {
      "source": "SCENARIO",
      "quote": "‘ⓐ옷이 없어.’"
    },
    {
      "source": "SCENARIO",
      "quote": "지금 네가 들고 있는 ⓑ옷은 뭐니?"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT"
  ],
  "attractionMechanism": "ⓐ와 ⓑ에 같은 말 ‘옷’이 쓰였다는 점만 보고 같은 대상을 가리킨다고 생각하면, 두 표현이 서로 다른 실을 지시한다는 판단을 놓치고 이 선지를 부적절하다고 고를 수 있다.",
  "predictedSelectionPercent": 14
}
```

##### C2

태그: ["REFERENT","SURFACE_MATCH"]

유인 경로 원문:

ⓐ와 ⓓ가 모두 ‘옷’이라는 같은 표면 어휘를 쓴다는 점에 주목해 두 표현의 지시 대상도 같다고 판단하면, 후기 묵가의 주장을 뒷받침하는 사례라는 해석을 부적절하다고 볼 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "하나의 명이 서로 다른 사물을 지시할 수 있다고 하면서, 이것과 저것, 두 마리의 새가 모두 학이라면 이것과 저것을 모두 ‘학’이라고 부를 수 있다는 예시를 들었다."
    },
    {
      "source": "SCENARIO",
      "quote": "‘ⓐ옷이 없어.’"
    },
    {
      "source": "SCENARIO",
      "quote": "내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "SURFACE_MATCH"
  ],
  "attractionMechanism": "ⓐ와 ⓓ가 모두 ‘옷’이라는 같은 표면 어휘를 쓴다는 점에 주목해 두 표현의 지시 대상도 같다고 판단하면, 후기 묵가의 주장을 뒷받침하는 사례라는 해석을 부적절하다고 볼 수 있다.",
  "predictedSelectionPercent": 13
}
```

##### C3

태그: ["CONDITION"]

유인 경로 원문:

‘옷’은 보통 여러 사물을 가리키는 말이라는 점에만 주목해, 특정 상황에서 하나의 개체를 가리키도록 쓰이면 사명이 될 수 있다는 조건을 놓칠 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "다른 하나는 ‘새[鳥]’라는 유명을 어떤 한 마리의 특정한 새를 가리킬 때 사용하는 경우처럼 유명을 단 하나의 개체에만 대응하게 함으로써 만들어지는 명이다."
    },
    {
      "source": "SCENARIO",
      "quote": "지금 네가 들고 있는 ⓑ옷은 뭐니?"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION"
  ],
  "attractionMechanism": "‘옷’은 보통 여러 사물을 가리키는 말이라는 점에만 주목해, 특정 상황에서 하나의 개체를 가리키도록 쓰이면 사명이 될 수 있다는 조건을 놓칠 수 있다.",
  "predictedSelectionPercent": 11
}
```

##### C4

태그: []

유인 경로 원문:

ⓓ의 ‘옷’은 옷이 실제로 전혀 없다는 뜻이 아니라고 설명되는 일반적인 옷이고, ⓔ는 필요한 ‘빨간 옷’이다. 따라서 두 명이 같은 대상을 지시한다는 선지의 전제가 대화와 맞지 않아 적절하지 않다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어."
    },
    {
      "source": "PASSAGE",
      "quote": "일상에서 흰 말이 있을 때 ‘말이 있다.’라고 하며 특정 속성이 지정되지 않은 ‘말’이라는 단어로 흰 말처럼 특정 속성을 가진 말[馬]을 지시하는 것에 대해, 공손룡은 ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 그 용법을 구분해야 한다고 하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "MAPPING_SHIFT",
  "transformSize": "PHRASE",
  "attractionTags": [],
  "attractionMechanism": "ⓓ의 ‘옷’은 옷이 실제로 전혀 없다는 뜻이 아니라고 설명되는 일반적인 옷이고, ⓔ는 필요한 ‘빨간 옷’이다. 따라서 두 명이 같은 대상을 지시한다는 선지의 전제가 대화와 맞지 않아 적절하지 않다.",
  "predictedSelectionPercent": 50
}
```

##### C5

태그: ["OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

상식적으로 빨간 옷도 옷의 한 종류라고 생각해 공손룡의 논리를 적용할 수 없다고 판단할 수 있다. 그러나 지문은 특정 속성이 더해진 흰 말과 말의 명을 구분하는 공손룡의 주장을 제시하고 있어, 이 대화에도 같은 논리를 적용할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "‘말[馬]’은 형체를 부르는 데 쓰는 단어이고 ‘희다[白]’는 색을 부르는 데 쓰는 단어인데, 흰 말은 말에 ‘희다’라는 속성이 함께하는 것이므로 말과 다르다고 하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "상식적으로 빨간 옷도 옷의 한 종류라고 생각해 공손룡의 논리를 적용할 수 없다고 판단할 수 있다. 그러나 지문은 특정 속성이 더해진 흰 말과 말의 명을 구분하는 공손룡의 주장을 제시하고 있어, 이 대화에도 같은 논리를 적용할 수 있다.",
  "predictedSelectionPercent": 12
}
```

#### r3: VALID

##### C1

태그: ["POLARITY","REFERENT"]

유인 경로 원문:

ⓐ의 ‘옷’은 빨간 옷을 뜻하는 반면 ⓑ의 ‘옷’은 갑이 들고 있는 특정 옷을 가리키므로, 같은 명이 서로 다른 실을 가리킨다고 볼 수 있다. 따라서 공손룡의 일대일 대응 원칙에 비추어 이 진술은 적절하지만, 발문이 ‘적절하지 않은 것’을 묻는다는 점을 놓치면 고를 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "‘ⓐ옷이 없어.’"
    },
    {
      "source": "SCENARIO",
      "quote": "‘지금 네가 들고 있는 ⓑ옷은 뭐니? 옷장 안에 옷이 이렇게 많은데 무슨 ⓒ옷이 없어?’"
    },
    {
      "source": "SCENARIO",
      "quote": "‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    },
    {
      "source": "PASSAGE",
      "quote": "그는 어떤 ‘실’은 그것을 가리키는 어떤 ‘명’에 의해서만 유일하게 지시되어야 한다는 것과, 어떤 명은 유일하게 어떤 실만을 지시하여야 한다는 것을 주장하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "REFERENT"
  ],
  "attractionMechanism": "ⓐ의 ‘옷’은 빨간 옷을 뜻하는 반면 ⓑ의 ‘옷’은 갑이 들고 있는 특정 옷을 가리키므로, 같은 명이 서로 다른 실을 가리킨다고 볼 수 있다. 따라서 공손룡의 일대일 대응 원칙에 비추어 이 진술은 적절하지만, 발문이 ‘적절하지 않은 것’을 묻는다는 점을 놓치면 고를 수 있다.",
  "predictedSelectionPercent": 8
}
```

##### C2

태그: ["POLARITY","REFERENT","MULTI_STEP"]

유인 경로 원문:

ⓐ의 ‘옷’은 필요한 빨간 옷을 뜻하고 ⓓ의 ‘옷’은 빨간색으로 한정되지 않은 옷을 뜻하므로, 같은 명칭이 서로 다른 대상을 지시하는 사례로 해석할 수 있다. 이를 후기 묵가의 주장과 연결한 진술은 적절하므로, 진술의 복합 구조를 따라가다 발문의 부정을 놓치면 오답으로 선택할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "‘ⓐ옷이 없어.’"
    },
    {
      "source": "SCENARIO",
      "quote": "‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    },
    {
      "source": "PASSAGE",
      "quote": "하나의 명이 서로 다른 사물을 지시할 수 있다고 하면서, 이것과 저것, 두 마리의 새가 모두 학이라면 이것과 저것을 모두 ‘학’이라고 부를 수 있다는 예시를 들었다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "REFERENT",
    "MULTI_STEP"
  ],
  "attractionMechanism": "ⓐ의 ‘옷’은 필요한 빨간 옷을 뜻하고 ⓓ의 ‘옷’은 빨간색으로 한정되지 않은 옷을 뜻하므로, 같은 명칭이 서로 다른 대상을 지시하는 사례로 해석할 수 있다. 이를 후기 묵가의 주장과 연결한 진술은 적절하므로, 진술의 복합 구조를 따라가다 발문의 부정을 놓치면 오답으로 선택할 수 있다.",
  "predictedSelectionPercent": 11
}
```

##### C3

태그: ["POLARITY","REFERENT"]

유인 경로 원문:

ⓑ의 ‘옷’은 일반적인 옷이라는 유형의 이름을 갑이 들고 있는 하나의 개체에 적용한 것이므로, 유명을 한 개체에만 대응시켜 사명으로 쓰는 경우로 볼 수 있다. 개념 구분을 놓치거나 발문의 방향을 놓치면 적절한 진술을 부적절하다고 판단할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "‘지금 네가 들고 있는 ⓑ옷은 뭐니?’"
    },
    {
      "source": "PASSAGE",
      "quote": "사명은 가리키는 대상이 오직 하나인 명을 말한다."
    },
    {
      "source": "PASSAGE",
      "quote": "다른 하나는 ‘새[鳥]’라는 유명을 어떤 한 마리의 특정한 새를 가리킬 때 사용하는 경우처럼 유명을 단 하나의 개체에만 대응하게 함으로써 만들어지는 명이다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "REFERENT"
  ],
  "attractionMechanism": "ⓑ의 ‘옷’은 일반적인 옷이라는 유형의 이름을 갑이 들고 있는 하나의 개체에 적용한 것이므로, 유명을 한 개체에만 대응시켜 사명으로 쓰는 경우로 볼 수 있다. 개념 구분을 놓치거나 발문의 방향을 놓치면 적절한 진술을 부적절하다고 판단할 수 있다.",
  "predictedSelectionPercent": 9
}
```

##### C4

태그: []

유인 경로 원문:

ⓓ의 ‘옷’은 빨간색 여부를 한정하지 않은 옷을, ⓔ의 ‘빨간 옷’은 빨간색 속성이 지정된 옷을 뜻한다. 따라서 두 명이 같은 대상을 지시한다는 전제가 성립하지 않으므로, 공손룡의 견해를 적용한 진술로도 적절하지 않다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    },
    {
      "source": "PASSAGE",
      "quote": "일상에서 흰 말이 있을 때 ‘말이 있다.’라고 하며 특정 속성이 지정되지 않은 ‘말’이라는 단어로 흰 말처럼 특정 속성을 가진 말[馬]을 지시하는 것에 대해, 공손룡은 ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 그 용법을 구분해야 한다고 하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "SCOPE_CHANGE",
  "transformSize": "PHRASE",
  "attractionTags": [],
  "attractionMechanism": "ⓓ의 ‘옷’은 빨간색 여부를 한정하지 않은 옷을, ⓔ의 ‘빨간 옷’은 빨간색 속성이 지정된 옷을 뜻한다. 따라서 두 명이 같은 대상을 지시한다는 전제가 성립하지 않으므로, 공손룡의 견해를 적용한 진술로도 적절하지 않다.",
  "predictedSelectionPercent": 62
}
```

##### C5

태그: ["POLARITY","MAPPING"]

유인 경로 원문:

ⓔ의 ‘빨간 옷’은 ⓒ의 일반적인 ‘옷’에 ‘빨간색’이라는 속성이 더해진 대상으로 볼 수 있다. 공손룡이 흰 말과 말의 용법을 구분한 논리를 이 사례에 적용하면 적절한 진술이므로, 발문의 방향을 놓치거나 사례 대응을 틀렸다고 여길 때 선택할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "‘옷장 안에 옷이 이렇게 많은데 무슨 ⓒ옷이 없어?’"
    },
    {
      "source": "SCENARIO",
      "quote": "‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    },
    {
      "source": "PASSAGE",
      "quote": "‘말[馬]’은 형체를 부르는 데 쓰는 단어이고 ‘희다[白]’는 색을 부르는 데 쓰는 단어인데, 흰 말은 말에 ‘희다’라는 속성이 함께하는 것이므로 말과 다르다고 하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "POLARITY",
    "MAPPING"
  ],
  "attractionMechanism": "ⓔ의 ‘빨간 옷’은 ⓒ의 일반적인 ‘옷’에 ‘빨간색’이라는 속성이 더해진 대상으로 볼 수 있다. 공손룡이 흰 말과 말의 용법을 구분한 논리를 이 사례에 적용하면 적절한 진술이므로, 발문의 방향을 놓치거나 사례 대응을 틀렸다고 여길 때 선택할 수 있다.",
  "predictedSelectionPercent": 10
}
```

### gpt-6.1-sol

평균 예측 C1~C5: 12.67, 19.33, 7.00, 51.67, 9.33

#### r1: VALID

##### C1

태그: ["REFERENT","MAPPING","MULTI_STEP"]

유인 경로 원문:

ⓐ가 실제로 뜻하는 빨간 옷과 ⓑ가 가리키는 손에 든 옷을 구별하지 못하면, 둘 다 같은 ‘옷’이므로 일대일 대응에 문제가 없다고 생각하여 이 선지를 부적절하다고 판단할 수 있다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "그는 어떤 ‘실’은 그것을 가리키는 어떤 ‘명’에 의해서만 유일하게 지시되어야 한다는 것과, 어떤 명은 유일하게 어떤 실만을 지시하여야 한다는 것을 주장하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "‘ⓐ옷이 없어.’"
    },
    {
      "source": "SCENARIO",
      "quote": "지금 네가 들고 있는 ⓑ옷은 뭐니?"
    },
    {
      "source": "SCENARIO",
      "quote": "내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "MAPPING",
    "MULTI_STEP"
  ],
  "attractionMechanism": "ⓐ가 실제로 뜻하는 빨간 옷과 ⓑ가 가리키는 손에 든 옷을 구별하지 못하면, 둘 다 같은 ‘옷’이므로 일대일 대응에 문제가 없다고 생각하여 이 선지를 부적절하다고 판단할 수 있다.",
  "predictedSelectionPercent": 12
}
```

##### C2

태그: ["REFERENT","SCOPE","MAPPING"]

유인 경로 원문:

ⓐ와 ⓓ가 모두 ‘옷’이라는 동일한 표현이라는 사실을 지시 대상까지 동일하다는 뜻으로 오해하면 선지를 틀렸다고 판단한다. ⓐ는 필요한 빨간 옷을, ⓓ는 빨간색 여부를 한정하지 않은 일반적인 옷을 뜻한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "또한 후기 묵가는 하나의 명이 지시하는 실은 오직 하나뿐이라는 주장에도 반대하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "하나의 명이 서로 다른 사물을 지시할 수 있다고 하면서, 이것과 저것, 두 마리의 새가 모두 학이라면 이것과 저것을 모두 ‘학’이라고 부를 수 있다는 예시를 들었다."
    },
    {
      "source": "SCENARIO",
      "quote": "‘ⓐ옷이 없어.’"
    },
    {
      "source": "SCENARIO",
      "quote": "내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "SCOPE",
    "MAPPING"
  ],
  "attractionMechanism": "ⓐ와 ⓓ가 모두 ‘옷’이라는 동일한 표현이라는 사실을 지시 대상까지 동일하다는 뜻으로 오해하면 선지를 틀렸다고 판단한다. ⓐ는 필요한 빨간 옷을, ⓓ는 빨간색 여부를 한정하지 않은 일반적인 옷을 뜻한다.",
  "predictedSelectionPercent": 18
}
```

##### C3

태그: ["CONDITION","MAPPING","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

‘옷’은 보통명사이므로 언제나 유명이라고 생각하거나 사명을 고유명사로만 이해하면 이 선지를 고르게 된다. 여기서는 손에 든 특정한 옷 하나를 가리키므로 사명으로 사용되었다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "사명은 가리키는 대상이 오직 하나인 명을 말한다."
    },
    {
      "source": "PASSAGE",
      "quote": "다른 하나는 ‘새[鳥]’라는 유명을 어떤 한 마리의 특정한 새를 가리킬 때 사용하는 경우처럼 유명을 단 하나의 개체에만 대응하게 함으로써 만들어지는 명이다."
    },
    {
      "source": "SCENARIO",
      "quote": "지금 네가 들고 있는 ⓑ옷은 뭐니?"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "MAPPING",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "‘옷’은 보통명사이므로 언제나 유명이라고 생각하거나 사명을 고유명사로만 이해하면 이 선지를 고르게 된다. 여기서는 손에 든 특정한 옷 하나를 가리키므로 사명으로 사용되었다.",
  "predictedSelectionPercent": 7
}
```

##### C4

태그: []

유인 경로 원문:

ⓓ는 빨간색 여부를 한정하지 않은 일반적인 옷이고 ⓔ는 빨간색 속성이 지정된 옷이므로, ‘같은 대상을 지시하고 있으므로’라는 전제가 틀렸다. 뒤의 공손룡에 관한 설명이 지문과 유사하더라도 이 전제 오류를 구별해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어."
    },
    {
      "source": "PASSAGE",
      "quote": "이렇게 일상에서 흰 말이 있을 때 ‘말이 있다.’라고 하며 특정 속성이 지정되지 않은 ‘말’이라는 단어로 흰 말처럼 특정 속성을 가진 말[馬]을 지시하는 것에 대해, 공손룡은 ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 그 용법을 구분해야 한다고 하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "MAPPING_SHIFT",
  "transformSize": "PHRASE",
  "attractionTags": [],
  "attractionMechanism": "ⓓ는 빨간색 여부를 한정하지 않은 일반적인 옷이고 ⓔ는 빨간색 속성이 지정된 옷이므로, ‘같은 대상을 지시하고 있으므로’라는 전제가 틀렸다. 뒤의 공손룡에 관한 설명이 지문과 유사하더라도 이 전제 오류를 구별해야 한다.",
  "predictedSelectionPercent": 52
}
```

##### C5

태그: ["ATTRIBUTION","MAPPING","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

빨간 옷도 당연히 옷이라는 일상적 상식이나 후기 묵가의 입장을 공손룡에게 적용하면 이 선지가 틀려 보인다. 공손룡의 관점에서는 색 속성이 추가된 ‘빨간 옷’과 속성이 지정되지 않은 ‘옷’의 용법을 구분해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "그런 주장의 근거로, 우선 그는 ‘말[馬]’은 형체를 부르는 데 쓰는 단어이고 ‘희다[白]’는 색을 부르는 데 쓰는 단어인데, 흰 말은 말에 ‘희다’라는 속성이 함께하는 것이므로 말과 다르다고 하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "공손룡은 ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 그 용법을 구분해야 한다고 하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "옷장 안에 옷이 이렇게 많은데 무슨 ⓒ옷이 없어?"
    },
    {
      "source": "SCENARIO",
      "quote": "내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "ATTRIBUTION",
    "MAPPING",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "빨간 옷도 당연히 옷이라는 일상적 상식이나 후기 묵가의 입장을 공손룡에게 적용하면 이 선지가 틀려 보인다. 공손룡의 관점에서는 색 속성이 추가된 ‘빨간 옷’과 속성이 지정되지 않은 ‘옷’의 용법을 구분해야 한다.",
  "predictedSelectionPercent": 11
}
```

#### r2: VALID

##### C1

태그: ["REFERENT","MAPPING","MULTI_STEP"]

유인 경로 원문:

ⓐ가 실제로 뜻하는 빨간 옷과 ⓑ가 가리키는 손에 든 특정 옷을 구별하지 못하면, 두 표현이 같은 대상을 가리킨다고 오독할 수 있다. 그러면 같은 ‘옷’이라는 명이 서로 다른 실을 지시한다는 일대일 대응 위반을 놓쳐 이 선지를 부적절하다고 판단한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "그는 어떤 ‘실’은 그것을 가리키는 어떤 ‘명’에 의해서만 유일하게 지시되어야 한다는 것과, 어떤 명은 유일하게 어떤 실만을 지시하여야 한다는 것을 주장하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "갑: (옷을 하나 들고 옷장을 보면서 한숨을 쉬고) ‘ⓐ옷이 없어.’"
    },
    {
      "source": "SCENARIO",
      "quote": "을: ‘지금 네가 들고 있는 ⓑ옷은 뭐니? 옷장 안에 옷이 이렇게 많은데 무슨 ⓒ옷이 없어?’"
    },
    {
      "source": "SCENARIO",
      "quote": "갑: ‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "MAPPING",
    "MULTI_STEP"
  ],
  "attractionMechanism": "ⓐ가 실제로 뜻하는 빨간 옷과 ⓑ가 가리키는 손에 든 특정 옷을 구별하지 못하면, 두 표현이 같은 대상을 가리킨다고 오독할 수 있다. 그러면 같은 ‘옷’이라는 명이 서로 다른 실을 지시한다는 일대일 대응 위반을 놓쳐 이 선지를 부적절하다고 판단한다.",
  "predictedSelectionPercent": 14
}
```

##### C2

태그: ["REFERENT","MAPPING","SCOPE"]

유인 경로 원문:

ⓐ와 ⓓ가 모두 ‘옷’이라는 동일한 단어라는 점만 보고 지시 범위까지 같다고 판단하면, 서로 다른 대상을 지시한다는 설명이 틀려 보인다. ⓐ는 문맥상 빨간 옷을, ⓓ는 색을 한정하지 않은 일반적인 옷을 뜻한다는 차이를 놓치는 경로이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "또한 후기 묵가는 하나의 명이 지시하는 실은 오직 하나뿐이라는 주장에도 반대하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "하나의 명이 서로 다른 사물을 지시할 수 있다고 하면서, 이것과 저것, 두 마리의 새가 모두 학이라면 이것과 저것을 모두 ‘학’이라고 부를 수 있다는 예시를 들었다."
    },
    {
      "source": "SCENARIO",
      "quote": "갑: (옷을 하나 들고 옷장을 보면서 한숨을 쉬고) ‘ⓐ옷이 없어.’"
    },
    {
      "source": "SCENARIO",
      "quote": "갑: ‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "MAPPING",
    "SCOPE"
  ],
  "attractionMechanism": "ⓐ와 ⓓ가 모두 ‘옷’이라는 동일한 단어라는 점만 보고 지시 범위까지 같다고 판단하면, 서로 다른 대상을 지시한다는 설명이 틀려 보인다. ⓐ는 문맥상 빨간 옷을, ⓓ는 색을 한정하지 않은 일반적인 옷을 뜻한다는 차이를 놓치는 경로이다.",
  "predictedSelectionPercent": 19
}
```

##### C3

태그: ["CONDITION","MAPPING","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

‘옷’은 보통명사이므로 언제나 유명이라고 생각하거나 사명을 고유명사에만 한정하면 이 선지가 틀려 보인다. 명의 분류는 사용 상황의 지시 대상 수에 따라 달라지며, ⓑ는 손에 든 단 하나의 옷을 가리킨다는 조건을 놓친 것이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "사명은 가리키는 대상이 오직 하나인 명을 말한다."
    },
    {
      "source": "PASSAGE",
      "quote": "다른 하나는 ‘새[鳥]’라는 유명을 어떤 한 마리의 특정한 새를 가리킬 때 사용하는 경우처럼 유명을 단 하나의 개체에만 대응하게 함으로써 만들어지는 명이다."
    },
    {
      "source": "SCENARIO",
      "quote": "을: ‘지금 네가 들고 있는 ⓑ옷은 뭐니? 옷장 안에 옷이 이렇게 많은데 무슨 ⓒ옷이 없어?’"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "MAPPING",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "‘옷’은 보통명사이므로 언제나 유명이라고 생각하거나 사명을 고유명사에만 한정하면 이 선지가 틀려 보인다. 명의 분류는 사용 상황의 지시 대상 수에 따라 달라지며, ⓑ는 손에 든 단 하나의 옷을 가리킨다는 조건을 놓친 것이다.",
  "predictedSelectionPercent": 7
}
```

##### C4

태그: []

유인 경로 원문:

ⓓ는 색을 한정하지 않은 일반적인 옷을, ⓔ는 빨간색 속성이 지정된 옷을 뜻하므로 둘이 같은 대상을 지시한다는 전제가 잘못되었다. 공손룡의 용법 구분 원칙을 재현한 뒷부분에 현혹되지 않고, 그 원칙을 적용하기 위한 보기의 대응 관계부터 확인해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "이렇게 일상에서 흰 말이 있을 때 ‘말이 있다.’라고 하며 특정 속성이 지정되지 않은 ‘말’이라는 단어로 흰 말처럼 특정 속성을 가진 말[馬]을 지시하는 것에 대해, 공손룡은 ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 그 용법을 구분해야 한다고 하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "갑: ‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "MAPPING_SHIFT",
  "transformSize": "PHRASE",
  "attractionTags": [],
  "attractionMechanism": "ⓓ는 색을 한정하지 않은 일반적인 옷을, ⓔ는 빨간색 속성이 지정된 옷을 뜻하므로 둘이 같은 대상을 지시한다는 전제가 잘못되었다. 공손룡의 용법 구분 원칙을 재현한 뒷부분에 현혹되지 않고, 그 원칙을 적용하기 위한 보기의 대응 관계부터 확인해야 한다.",
  "predictedSelectionPercent": 52
}
```

##### C5

태그: ["ATTRIBUTION","MAPPING","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

빨간 옷도 당연히 옷이라는 일상적 상식이나 후기 묵가의 입장을 공손룡에게 적용하면, ⓔ를 ⓒ라는 명으로 부르면 안 된다는 진술이 지나치다고 느낄 수 있다. 그러나 이는 ‘흰 말’과 ‘말’의 용법을 구분하라는 공손룡의 주장을 옷의 사례에 옮긴 타당한 반응이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "그런 주장의 근거로, 우선 그는 ‘말[馬]’은 형체를 부르는 데 쓰는 단어이고 ‘희다[白]’는 색을 부르는 데 쓰는 단어인데, 흰 말은 말에 ‘희다’라는 속성이 함께하는 것이므로 말과 다르다고 하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "이렇게 일상에서 흰 말이 있을 때 ‘말이 있다.’라고 하며 특정 속성이 지정되지 않은 ‘말’이라는 단어로 흰 말처럼 특정 속성을 가진 말[馬]을 지시하는 것에 대해, 공손룡은 ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 그 용법을 구분해야 한다고 하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "을: ‘지금 네가 들고 있는 ⓑ옷은 뭐니? 옷장 안에 옷이 이렇게 많은데 무슨 ⓒ옷이 없어?’"
    },
    {
      "source": "SCENARIO",
      "quote": "갑: ‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "ATTRIBUTION",
    "MAPPING",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "빨간 옷도 당연히 옷이라는 일상적 상식이나 후기 묵가의 입장을 공손룡에게 적용하면, ⓔ를 ⓒ라는 명으로 부르면 안 된다는 진술이 지나치다고 느낄 수 있다. 그러나 이는 ‘흰 말’과 ‘말’의 용법을 구분하라는 공손룡의 주장을 옷의 사례에 옮긴 타당한 반응이다.",
  "predictedSelectionPercent": 8
}
```

#### r3: VALID

##### C1

태그: ["REFERENT","MAPPING","MULTI_STEP"]

유인 경로 원문:

ⓐ가 실제로 뜻한 빨간 옷과 ⓑ가 지시하는 손에 든 특정 옷을 구별하지 못하면 선지를 틀렸다고 판단하기 쉽다. 같은 ‘옷’이라는 명이 서로 다른 실을 지시하는 상황을 공손룡의 일대일 대응 원칙 위반으로 연결해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C1",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "그는 어떤 ‘실’은 그것을 가리키는 어떤 ‘명’에 의해서만 유일하게 지시되어야 한다는 것과, 어떤 명은 유일하게 어떤 실만을 지시하여야 한다는 것을 주장하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "을: ‘지금 네가 들고 있는 ⓑ옷은 뭐니? 옷장 안에 옷이 이렇게 많은데 무슨 ⓒ옷이 없어?’"
    },
    {
      "source": "SCENARIO",
      "quote": "갑: ‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "MAPPING",
    "MULTI_STEP"
  ],
  "attractionMechanism": "ⓐ가 실제로 뜻한 빨간 옷과 ⓑ가 지시하는 손에 든 특정 옷을 구별하지 못하면 선지를 틀렸다고 판단하기 쉽다. 같은 ‘옷’이라는 명이 서로 다른 실을 지시하는 상황을 공손룡의 일대일 대응 원칙 위반으로 연결해야 한다.",
  "predictedSelectionPercent": 12
}
```

##### C2

태그: ["REFERENT","MAPPING","SCOPE"]

유인 경로 원문:

ⓐ와 ⓓ의 표기가 모두 ‘옷’이라는 이유로 지시 대상도 같다고 생각하면 이 선지를 부적절하다고 고르게 된다. ⓐ는 빨간 옷을, ⓓ는 색을 한정하지 않은 일반적인 옷을 뜻하므로 하나의 명이 서로 다른 실을 지시할 수 있다는 후기 묵가의 입장에 부합한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C2",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "또한 후기 묵가는 하나의 명이 지시하는 실은 오직 하나뿐이라는 주장에도 반대하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "하나의 명이 서로 다른 사물을 지시할 수 있다고 하면서, 이것과 저것, 두 마리의 새가 모두 학이라면 이것과 저것을 모두 ‘학’이라고 부를 수 있다는 예시를 들었다."
    },
    {
      "source": "SCENARIO",
      "quote": "갑: (옷을 하나 들고 옷장을 보면서 한숨을 쉬고) ‘ⓐ옷이 없어.’"
    },
    {
      "source": "SCENARIO",
      "quote": "갑: ‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "REFERENT",
    "MAPPING",
    "SCOPE"
  ],
  "attractionMechanism": "ⓐ와 ⓓ의 표기가 모두 ‘옷’이라는 이유로 지시 대상도 같다고 생각하면 이 선지를 부적절하다고 고르게 된다. ⓐ는 빨간 옷을, ⓓ는 색을 한정하지 않은 일반적인 옷을 뜻하므로 하나의 명이 서로 다른 실을 지시할 수 있다는 후기 묵가의 입장에 부합한다.",
  "predictedSelectionPercent": 21
}
```

##### C3

태그: ["CONDITION","MAPPING","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

‘옷’은 보통명사이므로 항상 유명이라고 판단하거나 사명을 고유명사로만 이해하면 이 선지를 틀렸다고 고를 수 있다. 그러나 ⓑ는 지금 들고 있는 단 하나의 옷을 가리키므로 유명을 사명으로 사용한 경우이다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C3",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "사명은 가리키는 대상이 오직 하나인 명을 말한다."
    },
    {
      "source": "PASSAGE",
      "quote": "다른 하나는 ‘새[鳥]’라는 유명을 어떤 한 마리의 특정한 새를 가리킬 때 사용하는 경우처럼 유명을 단 하나의 개체에만 대응하게 함으로써 만들어지는 명이다."
    },
    {
      "source": "SCENARIO",
      "quote": "을: ‘지금 네가 들고 있는 ⓑ옷은 뭐니? 옷장 안에 옷이 이렇게 많은데 무슨 ⓒ옷이 없어?’"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "CONDITION",
    "MAPPING",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "‘옷’은 보통명사이므로 항상 유명이라고 판단하거나 사명을 고유명사로만 이해하면 이 선지를 틀렸다고 고를 수 있다. 그러나 ⓑ는 지금 들고 있는 단 하나의 옷을 가리키므로 유명을 사명으로 사용한 경우이다.",
  "predictedSelectionPercent": 7
}
```

##### C4

태그: []

유인 경로 원문:

ⓓ는 빨간색 여부를 한정하지 않은 일반적인 옷을, ⓔ는 빨간색 속성이 지정된 옷을 뜻한다. 공손룡의 문제의식을 설명하는 뒷부분이 그럴듯하더라도, 두 명이 같은 대상을 지시한다는 첫 전제가 잘못되었음을 판단해야 한다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C4",
  "isAnswer": true,
  "decisiveEvidence": [
    {
      "source": "SCENARIO",
      "quote": "갑: ‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    },
    {
      "source": "PASSAGE",
      "quote": "이렇게 일상에서 흰 말이 있을 때 ‘말이 있다.’라고 하며 특정 속성이 지정되지 않은 ‘말’이라는 단어로 흰 말처럼 특정 속성을 가진 말[馬]을 지시하는 것에 대해, 공손룡은 ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 그 용법을 구분해야 한다고 하였다."
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "MAPPING_SHIFT",
  "transformSize": "PHRASE",
  "attractionTags": [],
  "attractionMechanism": "ⓓ는 빨간색 여부를 한정하지 않은 일반적인 옷을, ⓔ는 빨간색 속성이 지정된 옷을 뜻한다. 공손룡의 문제의식을 설명하는 뒷부분이 그럴듯하더라도, 두 명이 같은 대상을 지시한다는 첫 전제가 잘못되었음을 판단해야 한다.",
  "predictedSelectionPercent": 51
}
```

##### C5

태그: ["ATTRIBUTION","MAPPING","OUTSIDE_KNOWLEDGE"]

유인 경로 원문:

빨간 옷도 당연히 옷이라는 일상적 상식이나 후기 묵가의 입장을 공손룡에게 적용하면 이 선지를 부적절하다고 판단하게 된다. 공손룡에게는 ‘옷’과 빨간색 속성이 함께하는 ‘빨간 옷’의 용법을 구분해야 한다는 판단이 타당하다.

전체 선지 분석 원문:

```json
{
  "choiceId": "C5",
  "isAnswer": false,
  "decisiveEvidence": [
    {
      "source": "PASSAGE",
      "quote": "그런 주장의 근거로, 우선 그는 ‘말[馬]’은 형체를 부르는 데 쓰는 단어이고 ‘희다[白]’는 색을 부르는 데 쓰는 단어인데, 흰 말은 말에 ‘희다’라는 속성이 함께하는 것이므로 말과 다르다고 하였다."
    },
    {
      "source": "PASSAGE",
      "quote": "공손룡은 ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 그 용법을 구분해야 한다고 하였다."
    },
    {
      "source": "SCENARIO",
      "quote": "을: ‘지금 네가 들고 있는 ⓑ옷은 뭐니? 옷장 안에 옷이 이렇게 많은데 무슨 ⓒ옷이 없어?’"
    },
    {
      "source": "SCENARIO",
      "quote": "갑: ‘내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.’"
    }
  ],
  "evidenceSpan": "PASSAGE_PLUS_SCENARIO",
  "transformType": "INFERENCE_VALID",
  "transformSize": "STRUCTURE",
  "attractionTags": [
    "ATTRIBUTION",
    "MAPPING",
    "OUTSIDE_KNOWLEDGE"
  ],
  "attractionMechanism": "빨간 옷도 당연히 옷이라는 일상적 상식이나 후기 묵가의 입장을 공손룡에게 적용하면 이 선지를 부적절하다고 판단하게 된다. 공손룡에게는 ‘옷’과 빨간색 속성이 함께하는 ‘빨간 옷’의 용법을 구분해야 한다는 판단이 타당하다.",
  "predictedSelectionPercent": 9
}
```
