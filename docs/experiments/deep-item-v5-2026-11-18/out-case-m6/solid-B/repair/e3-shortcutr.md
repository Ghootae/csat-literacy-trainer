**정답: V1 ②, V2 ⑤**

- **V1:** 반응물이 처음 붙는 곳은 지지체 자체가 아니라 활성 성분인 금속 입자의 표면이다. 따라서 ㉮에서는 지지체 바깥쪽의 금속 입자 표면에, ㉯에서는 구멍 안쪽의 금속 입자 표면에 화학 흡착된다.
- **V2:** 흡착 세기는 초기 8에서 후반 4로 낮아졌다. 8은 적정 범위인 3~5보다 높지만, 4는 그 범위 안에 있으므로 후반에는 과도하게 강한 흡착 조건에서 벗어났고 약한 흡착 조건에도 들지 않았다. ②는 관찰된 전자 밀도 변화로부터 소결 억제를 도출할 수 없어 부적절하다. 다만 자료가 그런 억제의 가능성 자체를 배제하지는 않으므로 `weak`에 표시했다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "증진제를 넣지 않은 쪽을 쓸 때 반응에 필요한 최소 운동 에너지가 더 크겠군.",
          "minimum_evidence": {
            "passage": "1문단: 반응에 필요한 최소 운동 에너지가 활성화 에너지이다.",
            "bogi": "증진제가 없는 시료는 ㉯이다. 활성화 에너지는 ㉯가 2, ㉮가 4이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "증진제가 없어도 고체 촉매일 수 있다는 사실만으로는 어느 시료에 증진제가 없고 어느 쪽의 활성화 에너지가 더 큰지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "짝짓기",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "㉯의 활성화 에너지가 2에서 6으로 바뀜 → 증진제가 없는 ㉯를 쓸 때 필요한 최소 운동 에너지가 더 커져 참이 된다."
        },
        {
          "n": 2,
          "decisive_clause": "반응물이 처음 화학 흡착되는 위치는 ㉮에서는 지지체 바깥쪽이고 ㉯에서는 구멍 안쪽이지만, 두 시료 모두 반응물이 직접 붙는 곳은 지지체 자체가 아니라 금속 입자의 표면이겠군.",
          "minimum_evidence": {
            "passage": "2문단: 반응물은 먼저 활성 성분 표면에 화학 흡착된다. 3문단: 지지체에 분산한 작은 금속 입자가 활성 성분이다.",
            "bogi": "두 시료 모두 지지체에 작은 금속 입자를 분산했다. 금속 입자는 ㉮의 지지체 바깥 면에만, ㉯의 지지체 구멍 안쪽 면에만 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "활성 성분 표면에 먼저 흡착된다는 사실만으로는 두 시료에서 활성 성분이 지지체의 어디에 있는지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "㉮의 금속 입자도 구멍 안쪽 면에만 분산됨 → ㉮에서 최초 화학 흡착이 지지체 바깥쪽에서 일어난다는 진술이 거짓이 된다."
        },
        {
          "n": 3,
          "decisive_clause": "촉매를 쓰지 않을 때가 ㉮를 쓸 때보다 반응에 필요한 최소 에너지를 갖춘 분자가 더 많겠군.",
          "minimum_evidence": {
            "passage": "1문단: 활성화 에너지는 반응에 필요한 최소 운동 에너지이다. 같은 분포에서는 문턱이 더 높을 때 이를 충족하는 분자가 더 많을 수 없다.",
            "bogi": "활성화 에너지는 무촉매일 때 8, ㉮를 쓸 때 4이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "촉매가 활성화 에너지가 다른 경로를 제공한다는 사실만으로는 무촉매와 ㉮의 활성화 에너지 대소를 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "㉮를 쓸 때의 활성화 에너지가 4에서 9로 바뀜 → 8 이상 9 미만인 분자가 포함된 같은 분포에서는 무촉매일 때 문턱을 충족하는 분자가 더 많아져 참이 된다."
        },
        {
          "n": 4,
          "decisive_clause": "그 생성물이 확인된 시점에 이미 완결되었겠군.",
          "minimum_evidence": {
            "passage": "2문단: 고체 촉매에서 생성물이 활성 성분 표면으로부터 탈착되어야 반응이 완결된다.",
            "bogi": "㉯에서 처음 확인된 생성물은 금속 입자에서 생긴 뒤 확인될 때까지 줄곧 같은 자리에 붙어 있었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "탈착이 완결에 필요하다는 사실만으로는 첫 생성물이 확인 시점까지 탈착했는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "첫 생성물이 확인되기 전에 금속 입자 표면에서 탈착됨 → 확인 시점에는 반응이 이미 완결되어 참이 된다."
        },
        {
          "n": 5,
          "decisive_clause": "그 분자는 운동 에너지가 더 커져야 반응에 필요한 최소 에너지를 갖추겠군.",
          "minimum_evidence": {
            "passage": "1문단: 활성화 에너지는 반응에 필요한 최소 운동 에너지이다.",
            "bogi": "㉯를 쓸 때 활성화 에너지는 2이다. 선지에서 조건으로 준 운동 에너지 3은 이미 이 문턱을 넘는다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "활성화 에너지의 정의만으로는 ㉯를 쓸 때 운동 에너지 3이 반응 문턱을 충족하는지 알 수 없다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "㉯를 쓸 때의 활성화 에너지가 2에서 3.5로 바뀜 → 운동 에너지 3은 문턱에 못 미쳐 참이 된다."
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "㉯의 첫 생성물은 확인될 때까지 같은 자리에 붙어 있었다. 생성물 확인은 탈착 완료를 뜻하지 않는다."
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
          "decisive_clause": "촉매에 다른 물질이 섞여 있던 가동 후반에 일어났겠군.",
          "minimum_evidence": {
            "passage": "3문단: 작은 금속 입자들이 달라붙어 큰 입자를 이루는 것이 소결이다.",
            "bogi": "출구 쪽 작은 입자들이 경계 없이 이어져 큰 입자 하나를 이룬 때는 가동 후반이 시작되기 전이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "소결의 정의만으로는 작은 입자들이 큰 입자가 된 시점이 언제인지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "출구 쪽 입자들이 큰 입자를 이룬 시점이 후반 시작 전에서 다른 물질이 섞여 있던 후반으로 바뀜 → 소결이 후반에 일어났다는 진술이 참이 된다."
        },
        {
          "n": 2,
          "decisive_clause": "이 물질은 그 변화를 통해 소결을 억제했겠군.",
          "minimum_evidence": {
            "passage": "4문단: 지문은 표면 구조 변화에 의한 소결 억제와 전자 밀도 변화에 의한 흡착 세기 조절을 구분한다.",
            "bogi": "후반에 관찰된 금속 표면의 변화는 전자 밀도의 변화이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "지문에서 두 작용을 구분해도 〈보기〉 없이는 ‘그 변화’가 표면 구조 변화인지 전자 밀도 변화인지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "후반에 관찰된 변화가 전자 밀도 변화가 아니라 작은 금속 입자끼리 달라붙기 어려운 표면 구조로의 변화임 → 그 변화를 통한 소결 억제가 뒷받침된다."
        },
        {
          "n": 3,
          "decisive_clause": "가동 초기의 흡착 세기는 이런 활성 저하가 나타나는 범위에 있겠군.",
          "minimum_evidence": {
            "passage": "",
            "bogi": "적정 범위는 3~5이고 초기 값은 8이다. 8은 적정 범위보다 높은 쪽이므로 선지 앞절이 제시한 ‘흡착이 약한’ 범위가 아니다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "약한 흡착이 활성을 낮춘다는 사실만으로는 초기 측정값이 적정 범위보다 낮은지 알 수 없다."
          },
          "steps": 1,
          "bogi_sources": 2,
          "task": "짝짓기",
          "bogi_only": true,
          "fact_sensitive": true,
          "fact_change": "초기 흡착 세기가 8에서 2로 바뀜 → 적정 범위보다 약한 흡착에 해당하여 참이 된다."
        },
        {
          "n": 4,
          "decisive_clause": "소결로 금속 활성 성분의 전체 표면적이 줄어든 곳은 반응관 입구 쪽이겠군.",
          "minimum_evidence": {
            "passage": "3문단: 소결은 작은 금속 입자들이 달라붙어 큰 입자를 이루는 현상이다.",
            "bogi": "입구 쪽 입자들은 가동 내내 처음 크기와 모양을 유지했다. 입구 쪽에서는 소결이 없었으므로 소결에 따른 표면적 감소도 없었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "소결되면 전체 표면적이 줄어든다는 사실만으로는 반응관의 어느 쪽에서 소결이 일어났는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "작은 입자들이 큰 입자로 합쳐진 위치가 출구 쪽에서 입구 쪽으로 바뀜 → 소결에 따른 표면적 감소가 입구 쪽에서 일어나 참이 된다."
        },
        {
          "n": 5,
          "decisive_clause": "흡착 세기가 초기보다 낮아져, 흡착된 반응물이 지나치게 안정화되어 표면에서의 반응이 느려지는 조건에서는 벗어났고 흡착이 약해 흡착량이 적어지는 조건에는 들지 않았겠군.",
          "minimum_evidence": {
            "passage": "2문단: 흡착이 너무 강하면 반응물이 지나치게 안정화되어 표면 반응이 느려지고, 흡착이 약하면 흡착량이 적다.",
            "bogi": "적정 범위는 3~5이다. 초기에는 8로 상한을 넘었고, 후반에는 4로 낮아져 적정 범위에 들어갔다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "흡착이 너무 강하거나 약할 때의 효과를 알아도 초기값과 후반값이 적정 범위에 대해 각각 어디에 있는지 알 수 없다."
          },
          "steps": 5,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "후반 흡착 세기가 4에서 2로 바뀜 → 초기보다 낮아졌더라도 약한 흡착 범위에 들어가므로 거짓이 된다."
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "후반에 관찰된 금속 표면 변화는 표면 구조 변화가 아니라 전자 밀도 변화이다. 지문은 이 변화를 흡착 세기 조절과 연결한다."
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