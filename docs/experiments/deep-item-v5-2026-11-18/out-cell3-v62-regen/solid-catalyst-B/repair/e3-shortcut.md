- **V1 정답: ②.** 두 시료에서 금속 입자가 놓인 위치는 다르지만, 반응물이 처음 화학 흡착되는 곳은 모두 활성 성분인 금속 입자의 표면이다.
- **V2 정답: ⑤.** 초기의 흡착 세기 8은 적정 범위인 3~5보다 높고, 후반의 4는 그 범위 안에 있다. ②는 전자 밀도 변화로 소결이 억제됐다고 결론 내릴 근거가 없다. 다만 지문이 그 가능성 자체를 명시적으로 배제하지는 않으므로 `weak`에 표시했다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "고체 촉매에 필요한 성분이 빠져 있어",
          "minimum_evidence": {
            "passage": "4문단: 고체 촉매에서 반드시 필요한 성분은 활성 성분이며, 증진제와 지지체는 없을 수도 있다.",
            "bogi": "㉯의 작은 금속 입자가 활성 성분이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "지문만으로는 ㉯에 필수 성분인 활성 성분이 있는지 알 수 없다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "처음 화학 흡착되는 위치는 ㉮에서는 지지체 바깥쪽이고 ㉯에서는 구멍 안쪽이지만, 두 시료 모두 반응물이 직접 붙는 곳은 지지체 자체가 아니라 금속 입자의 표면",
          "minimum_evidence": {
            "passage": "2문단: 반응물은 먼저 활성 성분의 표면에 화학 흡착된다.",
            "bogi": "두 시료의 활성 성분은 작은 금속 입자이다. 입자의 분산 위치는 ㉮가 지지체 바깥 면, ㉯가 구멍 안쪽 면이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "흡착이 활성 성분의 표면에서 일어난다는 사실만으로는 두 시료의 활성 성분이 무엇이고 어디에 놓여 있는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "㉮를 쓸 때의 활성화 에너지에도 못 미치겠군",
          "minimum_evidence": {
            "passage": "필요 없음. 선지가 가정한 6과 ㉮의 측정값을 비교하면 된다.",
            "bogi": "㉮를 쓸 때의 활성화 에너지는 4이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "촉매가 활성화 에너지를 바꾼다는 사실만으로는 ㉮를 쓸 때의 활성화 에너지가 6보다 큰지 알 수 없다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "내용 확인",
          "bogi_only": true
        },
        {
          "n": 4,
          "decisive_clause": "생성물이 처음 확인되었을 때 그 생성물을 내는 반응은 완결되었겠군",
          "minimum_evidence": {
            "passage": "2문단: 생성물이 활성 성분의 표면에서 탈착되어야 반응이 완결된다.",
            "bogi": "㉯에서 처음 확인된 생성물은 구멍 안의 금속 입자에 붙어 있었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "탈착이 완결 조건이라는 사실만으로는 처음 확인된 생성물이 이미 탈착되었는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "㉯가 분자의 운동 에너지를 높였기 때문",
          "minimum_evidence": {
            "passage": "1문단: 촉매는 활성화 에너지가 다른 반응 경로를 제공한다. 선지는 비교하는 운동 에너지를 3으로 고정했다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "촉매가 바꾸는 문턱은 활성화 에너지이고 선지는 두 경우에 같은 운동 에너지 3을 비교하므로, 문턱 통과 여부의 차이를 운동 에너지 증가로 설명할 수 없다."
          },
          "steps": 1,
          "bogi_sources": 0,
          "task": "원리 적용",
          "bogi_only": true
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "처음 확인된 생성물은 금속 입자에 여전히 붙어 있었다. 별도의 분리 공정이 필요 없다는 말은 그때 이미 탈착되었다는 뜻이 아니다."
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
          "decisive_clause": "흡착된 반응물들이 서로 달라붙는 소결",
          "minimum_evidence": {
            "passage": "3문단: 소결은 작은 금속 입자들이 서로 달라붙어 큰 입자를 이루는 현상이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "소결에서 서로 달라붙는 것은 금속 입자이지 금속 표면에 흡착된 반응물이 아니다."
          },
          "steps": 1,
          "bogi_sources": 0,
          "task": "내용 확인",
          "bogi_only": true
        },
        {
          "n": 2,
          "decisive_clause": "그 변화를 통해 소결을 억제했겠군",
          "minimum_evidence": {
            "passage": "4문단: 증진제가 전자 밀도를 바꾸어 흡착 세기를 조절하는 작용과 표면 구조를 바꾸어 소결을 억제하는 작용을 구분한다.",
            "bogi": "후반에 관찰된 금속 표면의 변화는 전자 밀도가 초기와 달라졌다는 것이다. 이 변화로 소결이 억제되었다는 관찰은 없다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지의 ‘그 변화’가 표면 구조 변화인지 전자 밀도 변화인지 지문만으로는 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "가동 초기에는 가동 후반보다 흡착된 반응물이 표면에서 더 빠르게 생성물로 바뀌었겠군",
          "minimum_evidence": {
            "passage": "2문단: 흡착이 너무 강하면 반응물이 지나치게 안정화되어 표면 반응이 느려진다.",
            "bogi": "적정 범위는 3~5이다. 초기의 8은 상한을 넘고 후반의 4는 범위 안에 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "초기의 흡착 세기가 더 크다는 말만으로는 초기의 값이 과도하고 후반의 값은 적정한지 알 수 없다."
          },
          "steps": 4,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "금속 활성 성분의 전체 표면적을 늘리는 효과",
          "minimum_evidence": {
            "passage": "3문단: 작은 금속 입자들이 달라붙어 큰 입자를 이루는 것은 소결이며, 소결이 일어나면 금속 활성 성분의 전체 표면적은 줄어든다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "입자들이 큰 입자 하나로 이어졌다는 관찰은 선지에 이미 있다. 다만 그 현상을 소결로 식별하는 정의와 소결 시 전체 표면적이 줄어든다는 관계가 모두 필요하다."
          },
          "steps": 2,
          "bogi_sources": 0,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "흡착 세기가 초기보다 낮아져, 흡착된 반응물이 지나치게 안정화되어 표면에서의 반응이 느려지는 조건에서는 벗어났고 흡착이 약해 흡착량이 적어지는 조건에는 들지 않았겠군",
          "minimum_evidence": {
            "passage": "2문단: 흡착이 너무 강하면 반응물이 지나치게 안정화되어 표면 반응이 느려지고, 흡착이 약하면 흡착량이 적어진다.",
            "bogi": "적정 범위는 3~5이다. 흡착 세기가 초기 8에서 후반 4로 낮아졌다. 8은 상한을 넘지만 4는 범위 안에 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "세기가 낮아졌다는 말만으로는 과도하게 강한 상태에서 벗어났는지, 또는 적정 범위 아래까지 낮아졌는지 알 수 없다."
          },
          "steps": 5,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "초기의 흡착 세기 8은 적정 범위의 상한인 5를 넘는다. 이때의 강한 흡착은 표면 반응을 빠르게 하는 것이 아니라 느리게 한다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [5],
      "weak": [2]
    }
  ]
}
```