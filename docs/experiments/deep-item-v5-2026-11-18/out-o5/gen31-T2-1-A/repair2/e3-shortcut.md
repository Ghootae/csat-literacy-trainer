**정답: V1 ④, V2 ②.** 두 문항 모두 부정 발문이다.

- **V1:** ⓓ와 높이가 같은 왼쪽 점은 ⓑ이다. ⓑ는 염소를 주입한 뒤 암모니아를 주입하기 전이므로, 이때의 유리 염소는 물에 남아 있는 천연 유기물과 반응할 수 있다. 따라서 ④는 거짓이다. ③에서 말하는 농도의 순증가는 그동안 유리 염소가 일부 소비되었을 가능성을 배제하지 않는다.
- **V2:** 암모니아 주입 직전의 유효 농도는 A가 더 높지만, 두 값은 염소 주입 후 서로 다른 시점에 잰 값이다. A와 B는 주입 간격만 다르므로, A에 암모니아를 넣기 전까지는 같은 조건에서 유리 염소에 노출되고 B에서는 그 노출 구간이 더 이어진다. 따라서 두 약품의 주입 사이에 B의 노출이 A보다 작지 않으므로, A의 노출이 더 크다는 ②는 거짓이다. 이는 주입 사이의 노출 비교이지, 암모니아 주입 이후까지 포함한 총노출이나 부산물 생성량의 비교는 아니다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 4,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "자외선 조사 자체가 잔류 소독제를 남기지 않는다는 설명과 들어맞겠군",
          "minimum_evidence": {
            "passage": "5문단: 자외선 조사 자체는 물속에 지속적으로 작용할 소독제 잔류분을 남기지 않는다.",
            "bogi": "그래프는 자외선 조사 구간을 막 지난 때부터 시작하며, 시작점 ⓐ의 농도는 0이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "그래프가 자외선 조사 직후에 시작하고 ⓐ의 농도가 0이라는 관찰이 필요하다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "내용 확인",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "ⓓ의 소독제보다 미생물을 더 빠르게 불활성화하겠군",
          "minimum_evidence": {
            "passage": "6문단: 염소를 먼저 주입하면 암모니아와 반응하기 전에는 유리 염소로 존재한다. 통상적인 처리 조건에서 모노클로라민은 유리 염소보다 미생물을 느리게 불활성화한다.",
            "bogi": "ⓓ와 높이가 같은 왼쪽 점은 ⓑ이다. ⓑ는 t₁과 t₂ 사이이고 ⓓ는 t₃ 이후이다. 염소는 t₁에, 암모니아는 t₂에 주입했다. t₃부터 잔류 소독제는 모노클로라민이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "같은 높이의 왼쪽 점이 ⓑ라는 것과 ⓑ·ⓓ의 소독제 종류를 구별할 주입 시점 정보가 필요하다."
          },
          "steps": 4,
          "bogi_sources": 4,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "ⓑ부터 t₂ 직전까지 유리 염소가 물속 성분과 반응해 소비됐을 수 있겠군",
          "minimum_evidence": {
            "passage": "2·3문단: 유리 염소는 천연 유기물 등 물속 성분과 반응하면서 소비될 수 있다. 6문단: 염소를 먼저 주입하면 암모니아 주입 전에는 유리 염소로 존재하는 구간이 생긴다.",
            "bogi": "ⓑ는 염소 주입 시점 t₁과 암모니아 주입 시점 t₂ 사이에 있다. 물에는 천연 유기물이 남아 있다. 농도가 더 높다는 양보 조건은 선지에 주어져 있으므로, 소비 가능성 판정에 농도 비교를 별도로 사용할 필요는 없다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "ⓑ부터 t₂ 직전까지가 유리 염소 존재 구간이라는 점과 그 물에 반응할 성분이 남아 있다는 점이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "천연 유기물은 유리 염소와 반응할 수 없겠군",
          "minimum_evidence": {
            "passage": "3문단: 유리 염소는 천연 유기물과 반응한다. 6문단: 염소를 먼저 주입하면 암모니아 주입 전에는 유리 염소로 존재하는 구간이 생긴다.",
            "bogi": "ⓓ와 높이가 같은 왼쪽 점은 ⓑ이다. ⓑ는 염소 주입 시점 t₁과 암모니아 주입 시점 t₂ 사이에 있다. 물에는 천연 유기물이 남아 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "일반적인 반응 가능성만으로는 해당 지점에서의 진술을 판정할 수 없다. 왼쪽 점이 ⓑ이고 그때 유리 염소와 천연 유기물이 함께 있다는 확인이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 4,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "관망 말단에는 공급 중에 작용할 수 있는 소독제가 남아 있겠군",
          "minimum_evidence": {
            "passage": "",
            "bogi": "그래프의 끝은 관망 말단 도달 시점이고, 끝점 ⓔ는 0보다 높다. 세로축은 잔류 소독제 농도이다. 이 값으로 소독제가 남아 있음을 확인할 수 있으며, 필요한 잔류 농도를 충족했다는 판정까지 요구되지는 않는다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "농도가 낮아졌다는 말만으로는 말단 농도가 0인지 양수인지 알 수 없으므로, 끝점 ⓔ의 높이가 필요하다."
          },
          "steps": 2,
          "bogi_sources": 3,
          "task": "내용 확인",
          "bogi_only": true
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "ⓑ는 염소 주입 뒤이자 암모니아 주입 전이다. 이때 유리 염소가 있으므로, 농도가 순증가하더라도 일부가 반응해 소비될 수 있다는 ③은 참이고 같은 점에서 반응할 수 없다는 ④는 거짓이다."
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
          "decisive_clause": "그때도 유리 염소가 미생물의 세포 성분에 산화 작용을 할 수 있겠군",
          "minimum_evidence": {
            "passage": "2문단: 유효 농도는 실제로 소독에 작용할 수 있는 농도이고, 유리 염소는 미생물의 세포 성분 등에 산화 작용을 한다.",
            "bogi": "D의 암모니아 주입 직전 유리 염소 유효 농도는 1로, 0보다 크다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "D의 암모니아 주입 직전 유리 염소 유효 농도가 0보다 큰지 확인해야 한다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "유효 농도가 더 높은 쪽에서 유리 염소에 대한 노출도 더 크겠군",
          "minimum_evidence": {
            "passage": "3문단: 유리 염소에 대한 노출은 농도뿐 아니라 접촉 시간에도 좌우된다. 6문단: 염소를 먼저 넣으면 암모니아와 반응하기 전까지 유리 염소가 존재하는 구간이 생긴다.",
            "bogi": "A는 주입 간격이 짧고 직전 농도가 2, B는 주입 간격이 길고 직전 농도가 1이다. 염소를 한 번 주입한 뒤 암모니아를 한 번 주입했다. 두 계통은 주입 간격만 다르고 나머지 처리 조건은 같으므로, A의 암모니아 주입 전 구간을 공유한 뒤 B에서만 그 구간이 더 이어진다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "어느 쪽의 직전 농도가 높은지, 어느 쪽의 주입 간격이 긴지, 주입 간격 이외의 조건이 같은지 알아야 한다."
          },
          "steps": 5,
          "bogi_sources": 4,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "자외선 처리와 함께 잔류 소독제를 쓸 근거가 되겠군",
          "minimum_evidence": {
            "passage": "1문단: 공급 과정에서 미생물이 재유입될 수 있어 수질 유지가 필요하다. 5문단: 자외선 조사 자체는 지속적으로 작용하는 소독제 잔류분을 남기지 않으므로 잔류 소독제를 함께 쓸 필요가 있다.",
            "bogi": "C의 관망에서 미생물 재유입은 ‘있음’이다. 자외선 처리 목표 달성은 선지가 제시한 조건이다."
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지가 관망에서의 재유입을 이미 명시하므로, 자외선 조사 자체가 지속적으로 작용할 잔류분을 남기지 않는다는 5문단의 사실만으로도 재유입이 잔류 소독제 사용의 근거가 됨을 알 수 있다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "유리 염소와의 접촉 시간은 B와 D에서 다르겠군",
          "minimum_evidence": {
            "passage": "2문단: 접촉 시간은 미생물이 소독제에 노출되는 시간이다. 6문단: 염소를 먼저 넣으면 암모니아와 반응하기 전까지 유리 염소가 존재하는 구간이 생긴다.",
            "bogi": "두 약품의 주입 간격은 B에서 ‘김’, D에서 ‘짧음’이다. 그 구간에 미생물이 있었다는 것은 선지의 조건이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "B와 D의 약품 주입 간격이 다른지 확인해야 한다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "염소와 암모니아의 혼합 상태는 개선할 필요가 있겠군",
          "minimum_evidence": {
            "passage": "6문단: 모노클로라민을 만들어 쓸 때에는 두 약품의 혼합 상태를 관리해야 하며, 관망 말단의 잔류 농도도 확인해야 한다.",
            "bogi": "E의 혼합 상태는 ‘불균일’이다. 말단 잔류 농도 확보는 선지가 제시한 조건이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "혼합 상태를 관리해야 한다는 사실만으로는 E에 개선이 필요한지 알 수 없으므로, E의 혼합 상태가 불균일하다는 관찰이 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "주입 간격 행에서 A와 D는 ‘짧음’, B는 ‘김’이다. 이 관찰은 ④의 B·D 접촉 시간 차이를 뒷받침하며, ②의 A·B 직전 농도는 같은 경과 시점에서 잰 값이 아님을 보여 준다."
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