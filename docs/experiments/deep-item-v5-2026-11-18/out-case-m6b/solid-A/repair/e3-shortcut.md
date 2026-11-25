- **V1 정답: ④.** X 원자들이 금속 입자 표면에 붙은 것이지, 금속 입자들이 X의 표면에 분산된 것이 아니다. X가 금속의 표면 구조를 바꾸어 소결을 줄인 것은 지지체가 아니라 증진제의 작용에 해당한다.
- **V2 정답: ②.** ㉮에 들어 있는 금속의 총량은 더 많지만, 고온에서 사용한 뒤 **표면에서 반응에 관여하는 금속 원자 수**는 ㉯가 더 많다. 흡착 세기와 다른 반응 조건이 같으므로, 지문의 원리를 적용하면 ㉯의 촉매 활성이 더 높다.

`one_fact_shortcut`은 선지에 적힌 상황 전제까지 확인하여 정오를 확정할 수 있는지를 기준으로 판정했다. 예를 들어 V1의 ③은 지나친 흡착이 활성을 낮춘다는 인과만 지문으로 확인할 수 있고, X를 더 공급한 뒤 실제로 흡착이 지나치게 강해졌는지는 〈보기〉가 필요하다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 4,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "금속 입자는 활성 성분",
          "minimum_evidence": {
            "passage": "4문단: 고체 촉매에는 활성 성분이 반드시 있어야 하지만 증진제나 지지체는 없어도 된다.",
            "bogi": "첫 가동 때 장치가 금속 입자만 넣었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing": "첫 가동에 쓰인 고체 촉매가 금속 입자로만 이루어졌다는 관찰이 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "소결 때문에 촉매 활성이 덜 낮아졌겠군",
          "minimum_evidence": {
            "passage": "3문단: 고온에서 작은 금속 입자들이 서로 붙어 커지는 것이 소결이며, 소결을 억제하면 소결로 인한 촉매 활성 저하도 억제된다.",
            "bogi": "처음 X를 공급한 것은 두 번째 가동이다. 같은 온도와 시간에서 서로 붙어 커진 입자의 비율은 두 번째 가동이 첫 가동보다 낮았다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing": "X를 처음 공급한 가동에서 첫 가동보다 소결이 덜 일어났음을 보여 주는 비교가 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "금속 입자 표면의 반응을 늦춰 촉매 활성을 낮추는 요인",
          "minimum_evidence": {
            "passage": "2문단: 흡착이 너무 강하면 흡착된 반응물이 지나치게 안정화되어 표면 반응이 느려지고 촉매 활성이 낮아진다.",
            "bogi": "장치가 이후 X를 더 공급했다. 그 뒤 두 번째 가동 초기에 적절했던 흡착 세기가 지나치게 강해졌다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing": "지문으로 인과는 확인되지만, X를 더 공급한 뒤 흡착이 실제로 지나치게 강해졌다는 관찰이 필요하다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "X가 지지체로 작용했기 때문",
          "minimum_evidence": {
            "passage": "3문단: 지지체를 쓰면 작은 금속 입자들이 지지체의 표면에 분산된다.",
            "bogi": "X를 처음 공급하자 X 원자들이 금속 입자의 표면에 서로 떨어져 붙었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing": "금속 입자가 X의 표면에 분산된 것인지, 반대로 X가 금속 입자 표면에 붙은 것인지 확인해야 한다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "X가 증진제로 작용해 활성 성분의 전자 밀도를 바꾸었겠군",
          "minimum_evidence": {
            "passage": "4문단: 증진제는 활성 성분의 전자 밀도를 변화시켜 흡착 세기를 조절하기도 한다.",
            "bogi": "X를 더 공급하자 금속 표면의 전자 밀도가 달라졌다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing": "X를 더 공급하자 금속 표면의 전자 밀도가 달라졌다는 관찰이 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 5,
        "observation": "처음 공급한 X 원자들이 금속 입자 표면에 서로 떨어져 붙었다. 금속 입자가 X 표면에 분산된 것이 아니므로, X의 작용을 지지체로 설명한 ④가 틀리다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [4],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "먼저 금속 입자의 표면에 화학 흡착되겠군",
          "minimum_evidence": {
            "passage": "3문단: 지지체 표면에 작은 금속 활성 성분 입자를 분산할 수 있다. 2문단: 고체 촉매에서는 반응물이 먼저 활성 성분 표면에 화학 흡착된다.",
            "bogi": "㉯의 작은 금속 입자들은 표면적이 넓고 열적 안정성이 높은 물질의 표면에 분산되어 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing": "㉯에서 활성 성분에 해당하는 것이 금속 입자임을 판단할 배치 정보가 필요하다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "㉮가 ㉯보다 높은 촉매 활성을 보이겠군",
          "minimum_evidence": {
            "passage": "2문단: 일반적으로 반응에 관여하는 표면의 활성 성분 원자가 많을수록 반응물이 더 많이 흡착되어 촉매 활성이 높아진다.",
            "bogi": "사용 후 반응에 관여하는 표면 금속 원자 수의 차(㉯−㉮)는 양수이다. 두 촉매의 흡착 세기는 모두 적절하고 측정값의 차는 0이며, 다른 반응 조건도 같다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing": "금속 총량만으로는 활성의 대소를 정할 수 없다. 사용 후 반응에 관여하는 표면 금속 원자 수의 비교와 흡착 세기 등 비교 조건이 필요하다."
          },
          "steps": 5,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "생성물을 촉매에서 분리하는 별도의 공정이 필요 없겠군",
          "minimum_evidence": {
            "passage": "1문단: 고체 촉매를 사용하면 액체나 기체인 생성물을 촉매로부터 분리하는 별도의 공정이 필요 없다.",
            "bogi": "㉮와 ㉯는 같은 반응에 쓰이는 고체 촉매이고, 이 반응의 생성물은 기체이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing": "㉮와 ㉯가 고체 촉매이고 그 반응의 생성물이 기체라는 정보가 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "소결 때문에 촉매 활성이 낮아지는 것을 억제할 수 있겠군",
          "minimum_evidence": {
            "passage": "3문단: 작은 금속 입자를 표면적이 넓고 열적 안정성이 높은 지지체에 분산하면 소결로 인한 촉매 활성 저하가 억제된다.",
            "bogi": "㉮는 작은 금속 입자만으로 이루어져 있다. ㉯의 작은 금속 입자는 표면적이 넓고 열적 안정성이 높은 물질의 표면에 분산되어 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing": "지지체가 소결로 인한 활성 저하를 억제한다는 원리는 확인되지만, 실제로 ㉯에만 지지체가 있다는 관찰이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "흡착 세기가 더 강해서가 아니라, ㉯의 표면에서 반응에 관여하는 금속 원자가 더 많기 때문",
          "minimum_evidence": {
            "passage": "2문단: 일반적으로 반응에 관여하는 표면의 활성 성분 원자가 많을수록 반응물의 흡착이 많아진다.",
            "bogi": "두 촉매의 흡착 세기는 모두 적절하고 측정값의 차는 0이다. 다른 반응 조건도 같으며, 사용 후 반응에 관여하는 표면 금속 원자 수의 차(㉯−㉮)는 양수이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing": "흡착 세기가 같고, 사용 후 반응에 관여하는 표면 금속 원자 수는 ㉯가 더 많다는 비교가 필요하다."
          },
          "steps": 4,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 5,
        "observation": "사용 후 반응에 관여하는 표면 금속 원자 수의 차(㉯−㉮)가 양수이다. 따라서 금속 총량이 더 많은 ㉮가 아니라, 반응에 관여하는 표면 금속 원자가 더 많은 ㉯에서 흡착과 촉매 활성이 더 크다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [2],
      "weak": []
    }
  ]
}
```