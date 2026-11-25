**정답: V1 ④, V2 ②**

- **V1 ④:** X의 원자가 금속 입자 표면에 흩어져 붙었다. 금속 입자가 X의 표면에 분산되었다는 ④는 분산 방향을 뒤집었다.
- **V2 ②:** ㉮에 넣은 금속의 총량은 더 많지만, 고온에서 사용한 뒤 **반응에 관여하는 표면 금속 원자 수**는 ㉯가 더 많다. 흡착 세기와 다른 반응 조건이 같으므로, 지문의 원리에 따르면 ㉯의 촉매 활성이 더 높다.

검토상 **V1 ②는 정성적으로 적절하지만 근거가 약하다.** 소결된 입자의 비율이 낮다는 것은 소결이 덜 일어났다는 해석을 뒷받침한다. 다만 그 비율만으로는 소결로 잃은 전체 표면적이나 활성 저하 폭까지 확정할 수 없다. ④는 이와 달리 〈보기〉의 관찰과 직접 모순된다.

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
            "passage": "고체 촉매에는 활성 성분이 반드시 있어야 한다.",
            "bogi": "장치는 작은 금속 입자를 써서 기체 반응물을 처리한다. 첫 가동에 넣은 물질은 금속 입자뿐이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "금속 입자를 넣었다는 선지의 말만으로는 그 입자가 첫 가동의 유일한 촉매 구성 물질인지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "짝짓기",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "첫 가동의 투입 구성을 금속 입자는 비활성 열매체이고 별도의 고체가 촉매 작용을 하는 구성으로 바꿈 → 금속 입자를 활성 성분으로 볼 수 없다."
        },
        {
          "n": 2,
          "decisive_clause": "소결 때문에 촉매 활성이 덜 낮아졌겠군",
          "minimum_evidence": {
            "passage": "작은 금속 입자들이 붙어 커지는 것이 소결이다. 소결은 활성 성분의 전체 표면적을 줄이며, 소결을 억제하면 그로 인한 활성 저하가 억제된다.",
            "bogi": "두 번째 가동에서 X를 처음 공급했다. 같은 온도와 시간에서 붙어 커진 입자의 비율은 두 번째 가동이 더 낮았다. 이는 정성적 비교의 근거이며, 표면적 감소량은 제시되지 않았다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "소결이 활성을 낮춘다는 사실만으로는 X를 처음 넣었을 때 소결이 첫 가동보다 줄었는지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "두 번째 가동에서 붙어 커진 입자의 비율이 오히려 더 높았다고 바꿈 → 같은 비율 지표로 정성 비교하면 소결로 인한 활성 저하가 덜하다는 판단이 뒤집힌다."
        },
        {
          "n": 3,
          "decisive_clause": "강해진 흡착은 금속 입자 표면의 반응을 늦춰 촉매 활성을 낮추는 요인",
          "minimum_evidence": {
            "passage": "흡착이 지나치게 강하면 표면 반응이 느려져 촉매 활성이 낮아진다.",
            "bogi": "장치가 X를 더 공급했다. 두 번째 가동을 시작할 때 적절했던 흡착 세기가 추가 공급 뒤 지나치게 강해졌다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "지문만으로 과도한 흡착의 효과는 알 수 있지만, 선지가 사실로 진술한 추가 공급 뒤의 과도한 흡착이 실제로 일어났는지는 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "X를 더 공급한 뒤에도 흡착 세기가 적절한 범위에 머묾 → 지나치게 강한 흡착이 이 가동에서 활성을 낮췄다는 설명은 성립하지 않는다."
        },
        {
          "n": 4,
          "decisive_clause": "작은 금속 입자들이 X의 표면에 분산되었기 때문",
          "minimum_evidence": {
            "passage": "",
            "bogi": "처음 공급된 X의 원자는 모두 금속 입자 표면에 서로 떨어진 채 붙었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "지문은 지지체 위에 작은 금속 입자가 분산되는 경우를 설명하지만, 이 사례에서 X와 금속 중 무엇이 무엇의 표면에 분산되었는지는 알려 주지 않는다."
          },
          "steps": 0,
          "bogi_sources": 1,
          "task": "내용 확인",
          "bogi_only": true,
          "fact_sensitive": true,
          "fact_change": "처음 공급할 때 금속 입자들이 표면적이 넓고 열적으로 안정한 X의 표면에 분산되었다고 바꿈 → X가 지지체로 작용해 소결이 줄었다는 설명이 성립한다."
        },
        {
          "n": 5,
          "decisive_clause": "X가 증진제로 작용해 활성 성분의 전자 밀도를 바꾸었겠군",
          "minimum_evidence": {
            "passage": "증진제는 활성 성분의 전자 밀도를 변화시켜 흡착 세기를 조절할 수 있다.",
            "bogi": "X를 더 공급하자 금속 표면의 전자 밀도가 달라졌다. 적절했던 흡착 세기도 지나치게 강해졌다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "증진제가 전자 밀도를 바꿀 수 있다는 사실만으로는 X가 실제로 금속 표면의 전자 밀도를 바꾸었는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "짝짓기",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "X를 더 공급한 뒤에도 금속 표면의 전자 밀도가 변하지 않음 → X가 활성 성분의 전자 밀도를 바꾸었다는 진술은 거짓이다."
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "처음 공급된 X의 원자가 금속 입자 표면에 흩어져 붙었다. ②는 분산 방향을 전제하지 않지만, ④는 관찰된 방향을 거꾸로 진술한다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [4],
      "weak": [2]
    },
    {
      "version": "V2",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "먼저 금속 입자의 표면에 화학 흡착",
          "minimum_evidence": {
            "passage": "고체 촉매에서는 반응물이 먼저 활성 성분의 표면에 화학 흡착된다.",
            "bogi": "㉯의 금속은 작은 입자이다. 사용 후 반응에 관여하는 표면 금속 원자 수의 차(㉯−㉮)는 양수이므로 ㉯에는 반응에 관여하는 표면 금속 원자가 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "첫 단계가 활성 성분 표면의 화학 흡착이라는 사실만으로는 ㉯에서 금속 입자가 활성 성분인지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "㉯에서 반응에 관여하는 표면 원자가 금속이 아니라 금속 입자를 받치는 물질에만 있다고 바꿈 → 반응물이 처음 화학 흡착되는 곳은 금속 입자 표면이 아니다."
        },
        {
          "n": 2,
          "decisive_clause": "㉮가 ㉯보다 높은 촉매 활성을 보이겠군",
          "minimum_evidence": {
            "passage": "일반적으로 반응에 관여하는 표면 활성 성분 원자가 많을수록 반응물이 더 많이 흡착되어 촉매 활성이 높아진다.",
            "bogi": "사용 후 반응에 관여하는 표면 금속 원자 수의 차(㉯−㉮)는 양수다. 흡착 세기의 측정값 차는 0이고, 온도 등 다른 반응 조건도 같다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "㉮에 넣은 금속이 더 많다는 선지의 말만으로는 사용 후 어느 쪽의 표면 금속 원자가 반응에 더 많이 관여하는지 알 수 없다."
          },
          "steps": 4,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "사용 후 반응에 관여하는 표면 금속 원자 수의 차(㉯−㉮)를 음수로 바꿈 → 나머지 조건이 같으므로 ㉮가 더 높은 활성을 보인다는 진술이 참이 된다."
        },
        {
          "n": 3,
          "decisive_clause": "모두 생성물을 촉매에서 분리하는 별도의 공정이 필요 없겠군",
          "minimum_evidence": {
            "passage": "고체 촉매를 쓰면 액체나 기체 생성물을 촉매로부터 분리하는 별도 공정이 필요 없다.",
            "bogi": "㉮와 ㉯는 모두 고체 촉매이며, 두 촉매로 얻는 생성물은 기체이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지만으로는 ㉮와 ㉯가 고체 촉매인지, 생성물이 액체나 기체인지 알 수 없다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "생성물을 기체에서 촉매 입자와 뒤섞여 회수되는 고체 분말로 바꿈 → 생성물을 따로 회수하려면 분리 공정이 필요하다."
        },
        {
          "n": 4,
          "decisive_clause": "㉯에는 ㉮와 달리 지지체가 있으므로, 고온에서 소결 때문에 촉매 활성이 낮아지는 것을 억제할 수 있겠군",
          "minimum_evidence": {
            "passage": "작은 금속 입자를 표면적이 넓고 열적 안정성이 높은 지지체에 분산하면 소결로 인한 활성 저하가 억제된다.",
            "bogi": "㉮는 작은 금속 입자만으로 이루어져 있다. ㉯의 작은 금속 입자는 표면적이 넓고 열적 안정성이 높은 물질의 표면에 분산되어 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "지지체의 효과는 지문만으로 알 수 있지만, ㉯에만 지지체가 있다는 선지의 전제는 확인할 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "㉯도 별도의 분산 바탕 없이 작은 금속 입자만으로 이루어졌다고 바꿈 → ㉯에만 지지체가 있어서 활성 저하가 억제된다는 설명은 성립하지 않는다."
        },
        {
          "n": 5,
          "decisive_clause": "흡착 세기가 더 강해서가 아니라, ㉯의 표면에서 반응에 관여하는 금속 원자가 더 많기 때문",
          "minimum_evidence": {
            "passage": "일반적으로 반응에 관여하는 표면 활성 성분 원자가 많을수록 반응물의 흡착량이 많아진다.",
            "bogi": "흡착 세기의 측정값 차는 0이다. 온도 등 다른 반응 조건도 같다. 사용 후 반응에 관여하는 표면 금속 원자 수의 차(㉯−㉮)는 양수다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "표면 원자 수와 흡착량의 관계만으로는 두 촉매의 흡착 세기가 같은지, 사용 후 ㉯의 반응 관여 표면 원자가 더 많은지 알 수 없다."
          },
          "steps": 4,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "사용 후 반응에 관여하는 표면 금속 원자 수의 차(㉯−㉮)를 0으로 바꿈 → ㉯의 반응 관여 표면 원자가 더 많다는 설명은 거짓이다."
        }
      ],
      "closest_rival": {
        "n": 5,
        "observation": "사용 후 반응에 관여하는 표면 금속 원자 수의 차(㉯−㉮)가 양수다. 이 관찰은 총 금속량이 더 많은 ㉮의 활성이 높다는 ②가 아니라, ㉯에서 흡착량이 더 많다는 ⑤를 뒷받침한다."
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