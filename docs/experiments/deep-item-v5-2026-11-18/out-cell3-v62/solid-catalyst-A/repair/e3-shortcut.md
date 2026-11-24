**정답: V1 ④, V2 ②.** 두 문항 모두 부정 발문이므로, 내용상 거짓인 선지를 골랐다.

- **V1:** ①·②·③·⑤는 참, ④는 거짓이다. 처음 X를 공급했을 때 **금속 입자가 X의 표면에 분산된 것이 아니라, X 원자가 금속 입자 표면에 흩어져 붙었다.** ②는 같은 상태에서 출발한 두 가동의 소결 비율을 비교한 것으로, 촉매 활성 전체의 우열이 아니라 **소결로 인한 저하**만을 말한다.
- **V2:** ①·③·④·⑤는 참, ②는 거짓이다. ㉮에 들어 있는 **금속의 총량**은 더 많지만, 고온에서 사용한 뒤 **표면에서 반응에 관여하는 금속 원자**는 ㉯에 더 많다. 흡착 세기와 다른 반응 조건이 같으므로, 지문의 원리에 따르면 ㉯의 촉매 활성이 더 높다.

단계 수에서 별도의 추론 없이 〈보기〉의 관찰과 직접 대조해 판정하는 경우는 0으로 셌다. V1 ③은 선지가 ‘흡착이 지나치게 강해졌다’는 관찰을 전제로 제시하므로, 그 관찰에서 끌어낸 결론을 지문의 한 사실로 판정할 수 있다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 4,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "첫 가동 때 넣은 금속 입자는 활성 성분",
          "minimum_evidence": {
            "passage": "4문단: 고체 촉매에는 활성 성분이 반드시 있어야 한다.",
            "bogi": "첫 가동에는 금속 입자만 넣었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "활성 성분이 필수라는 사실만으로는 첫 가동에 넣은 촉매 재료가 금속 입자뿐이었다는 것을 알 수 없다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "첫 가동 때보다 소결 때문에 촉매 활성이 덜 낮아졌겠군",
          "minimum_evidence": {
            "passage": "3문단: 작은 금속 입자가 서로 붙어 커지는 것이 소결이며, 소결이 억제되면 그로 인한 촉매 활성 저하도 억제된다.",
            "bogi": "가동할 때마다 같은 상태의 입자를 새로 넣었다. 같은 온도와 시간으로 비교했을 때, 서로 붙어 커진 입자의 비율은 X를 처음 공급한 두 번째 가동에서 더 낮았다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "소결을 억제하면 그로 인한 활성 저하가 줄어든다는 사실만으로는 두 가동 중 어느 쪽에서 소결이 덜 일어났는지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "표면의 반응을 늦춰 촉매 활성을 낮추는 요인",
          "minimum_evidence": {
            "passage": "2문단: 흡착이 지나치게 강하면 흡착된 반응물이 지나치게 안정화되어 표면 반응이 느려지고 촉매 활성이 낮아진다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지가 전제한 ‘흡착이 지나치게 강해졌다’에 2문단의 인과 규칙을 적용하면 표면 반응이 느려지고 촉매 활성이 낮아진다."
          },
          "steps": 1,
          "bogi_sources": 0,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "작은 금속 입자들이 X의 표면에 분산되었기",
          "minimum_evidence": {
            "passage": "",
            "bogi": "X를 처음 공급하자 X 원자가 모두 금속 입자 표면에 서로 떨어진 채 붙었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "지문의 지지체 원리만 보면 X가 금속 입자를 받치는 물질일 가능성을 배제할 수 없다. 실제로 어느 물질이 어느 표면에 붙었는지 확인해야 한다."
          },
          "steps": 0,
          "bogi_sources": 1,
          "task": "내용 확인",
          "bogi_only": true
        },
        {
          "n": 5,
          "decisive_clause": "X가 증진제로 작용해",
          "minimum_evidence": {
            "passage": "4문단: 증진제는 활성 성분의 전자 밀도를 변화시켜 흡착 세기를 조절할 수 있다.",
            "bogi": "X를 더 공급하자 금속 표면의 전자 밀도가 달라졌다. 적절했던 흡착 세기도 지나치게 강해졌다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "증진제가 전자 밀도를 바꿀 수 있다는 지문 사실만으로는 X를 더 공급했을 때 실제로 전자 밀도와 흡착 세기가 달라졌는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "짝짓기",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "X를 처음 공급했을 때 X 원자가 금속 입자 표면에 흩어져 붙었다. ②는 소결이 덜 일어난 결과를 설명하지만, ④는 이 관찰에서 입자와 표면의 관계를 거꾸로 읽었다."
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
            "passage": "3문단: 작은 금속 입자를 넓고 열적으로 안정한 지지체 위에 분산하는 것은 금속을 활성 성분으로 쓰는 방식이다. 2문단: 반응물은 먼저 활성 성분 표면에 화학 흡착된다.",
            "bogi": "㉯의 작은 금속 입자들은 표면적이 넓고 열적 안정성이 높은 물질의 표면에 분산되어 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "반응물이 활성 성분 표면에 먼저 화학 흡착된다는 사실만으로는 ㉯에서 금속 입자가 활성 성분인지 알 수 없다."
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
            "passage": "2문단: 일반적으로 반응에 관여하는 표면의 활성 성분 원자가 많을수록 반응물이 더 많이 흡착되어 촉매 활성이 높다.",
            "bogi": "고온에서 사용한 뒤 표면에서 반응에 관여하는 금속 원자는 ㉯에 더 많았다. 두 촉매의 흡착 세기는 같고 적절하며, 온도 등 다른 반응 조건도 같다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지에 적힌 금속 총량과 지문의 표면 원자 수 규칙만으로는 사용 후 어느 촉매에 반응에 관여하는 표면 금속 원자가 더 많은지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "생성물을 촉매에서 분리하는 별도의 공정이 필요 없겠군",
          "minimum_evidence": {
            "passage": "1문단: 고체 촉매를 사용하면 기체나 액체 생성물을 촉매로부터 분리하는 별도 공정이 필요 없다.",
            "bogi": "㉮와 ㉯는 모두 고체 촉매이고, 두 촉매가 쓰이는 반응의 생성물은 기체이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "별도 분리 공정이 필요 없는 조건은 지문에 있지만, 선지만으로는 ㉮와 ㉯가 고체 촉매인지, 생성물이 기체인지 알 수 없다."
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
            "bogi": "㉮는 작은 금속 입자만으로 이루어져 있다. ㉯의 작은 금속 입자들은 표면적이 넓고 열적 안정성이 높은 물질의 표면에 분산되어 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "지지체의 효과는 지문에서 확인되지만, ‘㉯에는 ㉮와 달리 지지체가 있다’는 전제가 맞는지는 두 촉매의 구성을 확인해야 한다."
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
            "passage": "2문단: 일반적으로 반응에 관여하는 표면의 활성 성분 원자가 많을수록 반응물의 흡착량이 많다.",
            "bogi": "두 촉매의 흡착 세기는 같고 적절하다. 온도 등 다른 반응 조건도 같다. 사용 후 표면에서 반응에 관여하는 금속 원자는 ㉯에 더 많았다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "표면 원자 수와 흡착량의 관계만으로는 ㉯에 반응에 관여하는 표면 원자가 실제로 더 많은지, 두 촉매의 흡착 세기가 같은지 확인할 수 없다."
          },
          "steps": 2,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 5,
        "observation": "사용 뒤 표면에서 반응에 관여하는 금속 원자는 ㉮보다 ㉯에 더 많았다. 이 관찰은 ⑤의 흡착량 비교를 뒷받침하고, 금속 총량이 더 많은 ㉮의 활성이 높다는 ②의 결론을 뒤집는다."
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