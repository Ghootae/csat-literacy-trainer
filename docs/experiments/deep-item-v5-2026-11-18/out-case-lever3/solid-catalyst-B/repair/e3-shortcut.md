**정답: V1 ②, V2 ⑤**

- **V1:** 흡착 세기 5는 적정 범위인 4~6에 속한다. ㉮가 2에서 5로 바뀌면 흡착량이 늘고, ㉯가 8에서 5로 바뀌면 지나친 안정화가 완화되어 표면 반응이 빨라질 수 있다.
- **V2:** 후반에 작은 금속 입자들이 서로 붙어 큰 입자가 된 현상 자체가 소결이다. 후반의 입자 **한 개**는 전반의 입자 한 개보다 표면적이 넓지만, 소결로 금속 활성 성분의 **전체** 표면적은 줄어든다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "반응에 필요한 최소 운동 에너지를 갖지 못하겠군",
          "minimum_evidence": {
            "passage": "1문단: 활성화 에너지는 반응에 필요한 최소 운동 에너지이다.",
            "bogi": "㉮가 제공하는 반응 경로의 활성화 에너지는 6이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "최소 운동 에너지의 정의만으로는 7이 기준을 충족하는지 알 수 없다. ㉮ 경로의 활성화 에너지 값이 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "㉮에서는 흡착량이 늘고 ㉯에서는 흡착된 반응물이 표면에서 더 빠르게 반응할 수 있겠군",
          "minimum_evidence": {
            "passage": "2문단: 흡착이 약하면 흡착량이 적고, 너무 강하면 반응물이 지나치게 안정화되어 표면 반응이 느려진다.",
            "bogi": "적정 범위는 4~6이다. 현재 흡착 세기는 ㉮가 2, ㉯가 8이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "두 촉매의 현재 흡착 세기와 적정 범위를 모르면, 각각 5가 될 때 어떤 제약이 완화되는지 판정할 수 없다."
          },
          "steps": 4,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "흡착된 반응물이 지나치게 안정화되어",
          "minimum_evidence": {
            "passage": "2문단: 지나친 안정화는 흡착이 너무 강할 때 나타나며, 흡착이 약할 때는 흡착량이 적다.",
            "bogi": "적정 범위는 4~6이다. ㉮의 흡착 세기는 2이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "지나친 안정화가 강한 흡착에서 생긴다는 사실만으로는 ㉮의 흡착이 강한지 약한지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "촉매가 없는 쪽에서 반응이 더 빠르겠군",
          "minimum_evidence": {
            "passage": "1문단: 활성화 에너지가 작을수록 그 기준을 넘는 운동 에너지를 가진 분자가 많아 반응이 빠르다.",
            "bogi": "촉매가 없는 경로의 활성화 에너지는 10이다. ㉯가 제공하는 경로의 활성화 에너지는 8이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "활성화 에너지와 반응 속도의 관계를 알아도, 두 경로의 활성화 에너지 중 어느 쪽이 더 작은지 알아야 한다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "흡착량이 적어서 낮아졌던",
          "minimum_evidence": {
            "passage": "2문단: 흡착량이 적어 활성이 낮아지는 것은 흡착이 약할 때이고, 너무 강할 때는 표면 반응이 느려져 활성이 낮아진다.",
            "bogi": "적정 범위는 4~6이다. ㉯의 현재 흡착 세기는 8이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "흡착 세기를 두 배로 한다는 말만으로는 ㉯의 기존 활성 저하 원인을 알 수 없다. 현재 흡착 세기와 적정 범위가 필요하다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "㉮의 흡착 세기 2는 적정 범위의 하한 4보다 낮다. 따라서 ㉮의 문제는 지나친 안정화가 아니라 약한 흡착에 따른 적은 흡착량이다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [2],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 5,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "받침대가 지지체로서",
          "minimum_evidence": {
            "passage": "3문단: 작은 금속 입자들은 지지체의 표면에 분산된다.",
            "bogi": "작은 금속 입자들이 분산된 곳은 고체판 위이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "고체판을 받치고 있다는 사실만으로는 촉매의 지지체인지 알 수 없다. 금속 입자가 어느 표면에 분산되어 있는지 확인해야 한다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "활성 성분은 장치에 남겠군",
          "minimum_evidence": {
            "passage": "2문단: 활성 성분은 그 표면에 반응물을 화학 흡착시켜 촉매 활성을 제공한다.",
            "bogi": "반응물은 고체판이 아니라 금속 입자의 표면에 화학 흡착되었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "활성 성분의 역할을 알아도, 화학 흡착이 일어난 표면을 모르면 제거하는 금속과 남기는 고체판 중 어느 쪽이 활성 성분인지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "후반에 큰 입자가 나타나기 전에 소결이 일어났겠군",
          "minimum_evidence": {
            "passage": "3문단: 작은 금속 입자들이 서로 달라붙어 큰 입자를 이루는 현상이 소결이다.",
            "bogi": "운전 전반에는 금속 입자의 배열이 그대로였다. 후반에는 작은 입자들이 서로 붙어 큰 입자가 되었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "소결의 정의만으로는 운전 중 언제 어떤 입자 변화가 관찰되었는지 알 수 없다. 후반의 큰 입자가 어떻게 형성되었는지 확인해야 한다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "고체 촉매로부터 분리하는 별도의 공정이 필요했겠군",
          "minimum_evidence": {
            "passage": "1문단: 기체나 액체인 생성물을 고체 촉매로부터 분리하는 별도의 공정은 필요 없다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지에 기체 생성물과 고체 촉매가 모두 명시되어 있으므로, 별도 분리 공정이 필요 없다는 1문단의 진술만으로 선지를 반박할 수 있다."
          },
          "steps": 0,
          "bogi_sources": 0,
          "task": "내용 확인",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "금속 활성 성분의 전체 표면적은 전반보다 줄었겠군",
          "minimum_evidence": {
            "passage": "2문단: 반응물이 화학 흡착되는 표면은 활성 성분의 표면이다. 3문단: 작은 금속 입자들이 붙어 큰 입자를 이루는 것은 소결이며, 소결되면 금속 활성 성분의 전체 표면적이 줄어든다.",
            "bogi": "반응물은 금속 입자 표면에 화학 흡착되었다. 후반에는 작은 입자들이 서로 붙어 큰 입자가 되었다. 후반의 큰 입자 한 개는 전반의 작은 입자 한 개보다 표면적이 넓었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "소결 시 전체 표면적이 줄어든다는 사실만으로는 큰 입자가 소결로 형성되었는지, 입자 한 개의 표면적 비교도 맞는지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "후반에 작은 입자들이 서로 붙어 큰 입자가 되었다. 그 변화 자체가 소결이므로, 관찰된 소결을 큰 입자가 나타나기 전의 별개 사건으로 볼 수 없다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [5],
      "weak": []
    }
  ]
}
```