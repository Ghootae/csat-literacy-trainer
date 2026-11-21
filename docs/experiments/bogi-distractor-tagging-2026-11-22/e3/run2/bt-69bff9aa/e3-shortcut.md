**출제 의도상 정답은 ④입니다.** 다만 발문을 ‘내용상 거짓인 선지’를 고르는 것으로 엄밀히 적용하면, ④는 거짓으로 확정되지 않고 **근거 부족**으로 남습니다.

④에서 ㉰에 작용하는 하중은 \(15+10=25\text{kN}\)으로, 균열하중인 \(30\text{kN}\)보다 작습니다. 따라서 균열이 시작되지 않는다는 것은 알 수 있지만, 그것만으로 전 단면이 하중에 저항하는지는 알 수 없습니다. 지문은 **압축응력만 작용하면 전 단면이 하중에 저항한다**고 했지, **압축응력만 작용할 때에만** 전 단면이 저항한다고 하지는 않았습니다.

아래에서 `answer`는 출제 의도상 답이고, `valid_answers`는 내용상 거짓으로 확정된 선지의 목록입니다. `null`은 주어진 자료로 정오를 확정할 수 없어 확정에 필요한 단계 수나 관찰 수를 산정할 수 없다는 뜻입니다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 4,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "인장응력이 인장강도보다 커진",
          "minimum_evidence": {
            "passage": "지문에서 설명하는 보의 휨에 따른 균열은 콘크리트의 인장응력이 인장강도를 넘을 때 발생한다.",
            "bogi": "기존 보에서 하중에 의한 균열이 심해졌다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "기존 보에 실제로 하중에 의한 균열이 생겼다는 관찰이 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1
        },
        {
          "n": 2,
          "decisive_clause": "보의 상단 길이가 짧아지겠군",
          "minimum_evidence": {
            "passage": "하중으로 보가 아래로 휘면 상단에 압축력이 작용하여 길이가 짧아진다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지가 하중이 작용하는 상황을 전제하므로, 보의 상단은 압축되어 짧아진다는 지문 규칙을 바로 적용할 수 있다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 3,
          "decisive_clause": "인장응력이 발생하겠군",
          "minimum_evidence": {
            "passage": "사용하중은 고정하중과 활하중의 합이다. 미리 준 압축응력으로 상쇄되지 않은 인장응력이 인장강도를 넘으면 균열이 발생한다.",
            "bogi": "고정하중은 15kN이고, 표의 ㉯ 열에서 균열하중은 35kN이다. 선지의 활하중 25kN을 더하면 40kN으로 균열하중을 넘는다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "활하중이 25kN으로 늘어난다는 말만으로는 인장응력이 남는다고 확정할 수 없다. 고정하중과 ㉯의 균열하중이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2
        },
        {
          "n": 4,
          "decisive_clause": "부재의 전 단면이 하중에 저항하겠군",
          "minimum_evidence": {
            "passage": "부분 긴장 보는 고정하중만 작용할 때 압축응력만 작용하여 전 단면이 하중에 저항한다. 지문은 인장응력이 남는 경우에 전 단면이 저항하지 않는다고는 명시하지 않는다.",
            "bogi": "고정하중 15kN에 선지의 활하중 10kN을 더한 25kN은 ㉰의 균열하중 30kN보다 작다. 이 비교로 균열 발생 여부는 알 수 있지만, 전 단면의 저항 여부는 확정할 수 없다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "활하중 10kN이 작용할 때 어느 단면까지 하중에 저항하는지에 대한 관찰, 또는 이를 판정할 지문 규칙이 없다."
          },
          "steps": null,
          "bogi_sources": null
        },
        {
          "n": 5,
          "decisive_clause": "균열은 폐합되지 않겠군",
          "minimum_evidence": {
            "passage": "부분 긴장 보는 사용하중이 작용할 때 균열이 생기고, 활하중이 제거되면 긴장력에 의해 균열이 폐합된다.",
            "bogi": "고정하중 15kN에 지속되는 활하중 15kN을 더하면 30kN으로, 표의 ㉰ 열에 제시된 균열하중과 같다. 균열이 시작되는 하중이 계속 유지된다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "활하중을 제거하면 균열이 폐합된다는 사실만으로 그 역을 단정할 수 없다. 지속되는 하중이 ㉰의 균열하중에 도달한다는 확인이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2
        }
      ],
      "closest_rival": {
        "n": 5,
        "observation": "㉰의 균열하중은 30kN이다. ⑤의 합계 하중 30kN은 균열이 시작되는 값에 포함되고, ④의 25kN은 그보다 작다. 다만 ④에서 균열이 시작되지 않는다는 사실이 전 단면의 저항을 보장하지는 않는다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [],
      "weak": [4]
    }
  ]
}
```