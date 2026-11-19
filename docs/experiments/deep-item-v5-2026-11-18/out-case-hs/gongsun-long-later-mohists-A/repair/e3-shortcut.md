**정답은 V1 ②, V2 ④입니다.** 두 문항 모두 부정 발문이며, 각각 나머지 네 선지는 참입니다.

아래에서 `bogi_sources`는 판정에 필요한 서로 다른 관찰의 수입니다. 같은 문장에 있더라도 두 이름의 지시 범위를 각각 읽어 대조해야 하는 경우에는 별도 관찰로 셌습니다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "명실 문제를 다루는 일이겠군",
          "minimum_evidence": {
            "passage": "명실의 문제는 이름과 실재의 상관관계를 다루는 문제이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지 자체가 이름과 실제 대상의 관계를 따진다고 했으므로, 명실 문제의 정의만으로 참이라고 판정할 수 있다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 2,
          "decisive_clause": "사명으로 인정하지 않겠군",
          "minimum_evidence": {
            "passage": "유명을 단 하나의 개체에만 대응하게 하여 사용하면 사명이 된다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지 자체에 이번 ‘종’의 대응 대상이 하나의 실이라고 제시되어 있으므로, 그 용법을 사명으로 인정하지 않는다는 결론은 거짓이다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 3,
          "decisive_clause": "인간의 입장에서 구별하여 확정하는 역할을 하겠군",
          "minimum_evidence": {
            "passage": "공손룡에게 명은 실들 사이의 다름을 인간의 입장에서 구별하여 확정하는 역할을 한다.",
            "bogi": "안내인은 ‘여명’이라고 말하며 가장 작은 종을 가리켰다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "명의 일반적 역할만으로는 ‘여명’이 실제로 가장 작은 종을 지시하는지 확인할 수 없다. 그 지시 관계에 대한 관찰이 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1
        },
        {
          "n": 4,
          "decisive_clause": "두 명이 지시하는 실이 모두 같다고 보지는 않겠군",
          "minimum_evidence": {
            "passage": "후기 묵가는 하나의 실을 서로 다른 명으로 지시할 수 있다고 본다.",
            "bogi": "전시 목록의 ‘금이 간 종’은 금이 간 두 종을 지시한다. 전시 목록의 ‘종’은 온전한 종까지 포함한 세 종 모두를 지시한다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "한 실을 여러 명으로 지시할 수 있다는 사실만으로 두 명의 전체 지시 범위가 같은지 다른지는 결정되지 않는다. 두 명의 실제 지시 범위가 필요하다."
          },
          "steps": 2,
          "bogi_sources": 2
        },
        {
          "n": 5,
          "decisive_clause": "‘금이 간 종’을 ‘종’과 구분하겠군",
          "minimum_evidence": {
            "passage": "공손룡은 형체를 부르는 ‘말’에 ‘희다’라는 속성이 함께한 ‘흰 말’은 말과 다르다며 두 명의 용법을 구분한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지 자체가 형체를 부르는 말에 속성을 나타내는 말이 결합했다고 명시하므로, 공손룡의 속성 추가에 따른 구분 원칙만으로 참이라고 판정할 수 있다."
          },
          "steps": 1,
          "bogi_sources": 0
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "안내인이 ‘종’이라고 말하며 가리킨 대상은 앞서 가리킨 가장 작은 종 하나이다. 따라서 ②의 이번 용법은 사명이며, 목록에서 두 명의 전체 지시 범위를 비교하는 ④와 구별된다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [
        2
      ],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 4,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "명실 문제의 철학적 논의에 속하겠군",
          "minimum_evidence": {
            "passage": "명실의 문제는 이름과 실재의 상관관계를 다루는 철학적 문제이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지에 제시된 이름과 실제 거울의 관계는 곧 이름과 실재의 관계이므로, 명실 문제의 정의만으로 참이라고 판정할 수 있다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 2,
          "decisive_clause": "저녁 기록의 ‘거울’은 사명으로 인정할 수 있겠군",
          "minimum_evidence": {
            "passage": "유명은 속성을 공유하는 여러 대상을 지시하며, 유명을 단 하나의 개체에만 대응시켜 쓰면 사명이 된다. 같은 명도 대응 대상의 수에 따라 유명인지 사명인지 달라진다.",
            "bogi": "오전의 두 주문서에는 모두 ‘거울’이라고 적혀 있었다. 한 손님은 둥근 거울을, 다른 손님은 네모난 거울을 받았다. 저녁 기록의 ‘거울’은 남은 하나를 가리켰다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "유명과 사명의 구별 기준만으로는 오전과 저녁의 실제 대응 대상 수를 알 수 없다. 오전의 복수 대상과 저녁의 단일 대상이라는 관찰이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 3
        },
        {
          "n": 3,
          "decisive_clause": "‘거울’이라는 명으로 지시할 수 있다고 보겠군",
          "minimum_evidence": {
            "passage": "후기 묵가의 유명은 어느 하나의 속성을 공유하는 사물들을 지시하는 이름이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지 자체가 반환된 대상을 거울이라고 명시하므로, 그 대상 역시 ‘거울’이라는 유명으로 지시할 수 있다. 반환된 거울의 구체적 모양은 판정에 필요하지 않다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 4,
          "decisive_clause": "서로 다른 두 거울을 지시해도 된다고 보겠군",
          "minimum_evidence": {
            "passage": "공손룡은 어떤 명이 유일하게 어떤 하나의 실만을 지시해야 한다고 주장한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "하나의 명으로 서로 다른 두 실을 지시해도 된다는 결론은 공손룡의 일대일 대응 원칙에 직접 어긋난다. 손님들의 수령이나 서명 여부는 이 판정을 바꾸지 않는다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 5,
          "decisive_clause": "‘거울’과 ‘둥근 거울’이 지시하는 실을 구분하겠군",
          "minimum_evidence": {
            "passage": "공손룡은 특정 속성이 지정되지 않은 ‘말’과 ‘희다’라는 속성이 함께한 ‘흰 말’이 지시하는 실을 구분한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "‘둥근’을 특정 속성으로 읽으면 ‘거울’과 ‘둥근 거울’은 공손룡이 구분하는 무속성 명과 속성이 추가된 명의 관계이다. 수령·서명·반환 관찰 없이도 결론은 참이다."
          },
          "steps": 2,
          "bogi_sources": 0
        }
      ],
      "closest_rival": {
        "n": 5,
        "observation": "오전의 두 주문서에는 모두 동일한 ‘거울’이라는 명이 적혀 있었다. 두 손님의 수령·서명에도 불구하고, 그 한 명으로 서로 다른 실을 지시해도 된다는 ④의 결론은 공손룡의 원칙과 충돌한다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [
        4
      ],
      "weak": []
    }
  ]
}
```