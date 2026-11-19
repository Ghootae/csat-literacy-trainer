## 판정 결과

- **V1: 정답 ⑤** — ①~④는 참, ⑤는 거짓이다.
- **V2: 정답 ①** — ①은 거짓, ②~⑤는 참이다.
- 두 문항 모두 정답은 하나이며, 근거가 부족하여 판정을 유보할 선지는 없다.

선지 자체에 명시된 수치·조건만으로 판단할 수 있으면 〈보기〉를 중복 근거로 넣지 않았다. 또한 **〈보기〉 없이 판단할 수 있더라도 독립된 지문 규칙 두 개가 필요하면** `one_fact_shortcut`은 `false`로 처리했다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 5,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "2와 6인 두 매질 사이에서 초음파가 더 많이 반사",
          "minimum_evidence": {
            "passage": "음향 저항은 매질의 밀도에 비례하며, 음향 저항 차이가 큰 두 매질의 경계면에서 초음파가 더 많이 반사된다.",
            "bogi": "두 경계면의 밀도쌍은 각각 (7, 8), (2, 6)이며, 모든 매질의 음향 저항에는 같은 비례상수가 적용된다. 밀도 차이는 각각 1과 4이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지에는 비교 대상인 다른 경계면의 밀도가 없다. 다른 밀도쌍이 (7, 8)이고 모든 매질에 같은 비례상수가 적용된다는 관찰이 필요하다."
          },
          "steps": 4
        },
        {
          "n": 2,
          "decisive_clause": "가장 정확한 측정 각도는 아니지만, 실제 측정에서 유지해야 할 각도 범위에는 들겠군",
          "minimum_evidence": {
            "passage": "도플러 각도가 0°일 때 가장 정확하게 측정할 수 있으며, 실제 측정에서는 60° 미만을 유지해야 한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "30°는 선지에 명시되어 있어 추가로 필요한 보기 관찰은 없다. 그러나 선지 전체를 참으로 확정하려면 '0°에서 가장 정확함'과 '실제 측정에서는 60° 미만을 유지함'이라는 두 규칙이 모두 필요하다."
          },
          "steps": 2
        },
        {
          "n": 3,
          "decisive_clause": "도플러 효과가 나타났겠군",
          "minimum_evidence": {
            "passage": "대상이 이동하여 송신 주파수와 수신 주파수가 달라지는 현상을 도플러 효과라고 한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지 자체가 '적혈구가 이동하면서 송신·수신 주파수가 달라졌다'고 제시하므로, 도플러 효과의 정의에 바로 해당한다."
          },
          "steps": 1
        },
        {
          "n": 4,
          "decisive_clause": "계속 빨간색으로 표시되고 더 밝아지겠군",
          "minimum_evidence": {
            "passage": "혈류가 탐촉자를 향하면 빨간색으로 표시하며, 혈류 속도가 빠르면 더 밝게 표시한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "속도 증가와 탐촉자 쪽 흐름의 유지는 선지에 명시되어 있어 추가로 필요한 보기 관찰은 없다. 다만 빨간색 유지와 밝기 증가를 모두 확정하려면 방향-색 규칙과 속도-밝기 규칙이 각각 필요하다."
          },
          "steps": 2
        },
        {
          "n": 5,
          "decisive_clause": "혈류 정보를 수신하는 데 유리하겠군",
          "minimum_evidence": {
            "passage": "혈류 정보 수신에 이용되는 귀환 초음파는 적혈구에서 산란된 초음파의 일부이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "적혈구의 산란은 혈류 정보를 담은 초음파가 탐촉자로 돌아오는 과정이므로, 산란을 없애는 것을 혈류 정보 수신에 유리하다고 할 수 없다."
          },
          "steps": 1
        }
      ],
      "closest_rival": {
        "n": 1,
        "observation": "두 경계면의 밀도 차이는 각각 1과 4이고 음향 저항의 비례상수는 같다. 따라서 2와 6인 경계면의 반사량이 더 많다는 ①은 참이다. 경계면의 반사량 비교와 적혈구 산란의 수신상 역할을 혼동하지 않아야 한다."
      },
      "valid_answers": [
        5
      ],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 1,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "A와 E의 혈류는 빨간색으로 표시",
          "minimum_evidence": {
            "passage": "혈류가 탐촉자를 향하면 빨간색, 탐촉자에서 멀어지면 파란색으로 표시한다.",
            "bogi": "혈류 방향 행에서 A와 E는 모두 '멀어짐'이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "산란된 초음파가 돌아왔다는 사실만으로 표시 색은 정해지지 않는다. A와 E의 혈류가 탐촉자에서 멀어진다는 관찰이 필요하다."
          },
          "steps": 1
        },
        {
          "n": 2,
          "decisive_clause": "도플러 변위의 절댓값은 B가 C보다 크겠군",
          "minimum_evidence": {
            "passage": "적혈구의 이동 속도가 빠를수록 도플러 변위의 절댓값이 크다.",
            "bogi": "적혈구 이동 속도는 B가 20 cm/s, C가 10 cm/s이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "연부 조직을 통과하는 초음파의 속도가 같다는 조건만으로는 두 변위의 절댓값을 비교할 수 없다. B와 C의 적혈구 이동 속도가 각각 20과 10이라는 관찰이 필요하다."
          },
          "steps": 2
        },
        {
          "n": 3,
          "decisive_clause": "도플러 변위는 양(+)의 값",
          "minimum_evidence": {
            "passage": "적혈구가 탐촉자에 가까워지는 방향으로 이동하면 도플러 변위는 양(+)이다.",
            "bogi": "혈류 방향 행에서 D는 '가까워짐'이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지에는 D의 구체적인 방향이 제시되어 있지 않다. D가 탐촉자에 가까워진다는 관찰이 필요하다."
          },
          "steps": 1
        },
        {
          "n": 4,
          "decisive_clause": "B에서보다 D에서 더 많이 산란",
          "minimum_evidence": {
            "passage": "주파수가 높을수록 산란이 많이 발생한다.",
            "bogi": "B와 D의 적혈구 크기는 모두 2이며, 송신 주파수는 B가 4 MHz, D가 8 MHz이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "적혈구 크기가 같다는 선지의 조건만으로는 산란량의 대소를 정할 수 없다. D의 송신 주파수가 B보다 높다는 관찰이 필요하다."
          },
          "steps": 2
        },
        {
          "n": 5,
          "decisive_clause": "A에서보다 E에서 더 많이 산란",
          "minimum_evidence": {
            "passage": "산란체의 크기가 작을수록 산란이 많이 발생한다.",
            "bogi": "A와 E의 송신 주파수는 모두 4 MHz이며, 적혈구 크기는 A가 2, E가 1이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "송신 주파수가 같다는 선지의 조건만으로는 산란량의 대소를 정할 수 없다. E의 적혈구 크기가 A보다 작다는 관찰이 필요하다."
          },
          "steps": 2
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "적혈구 이동 속도 행에서 B는 20 cm/s, C는 10 cm/s이다. 같다고 제시된 것은 초음파의 연부 조직 통과 속도이지 적혈구의 이동 속도가 아니므로, ②는 참이다."
      },
      "valid_answers": [
        1
      ],
      "weak": []
    }
  ]
}
```