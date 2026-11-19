- **V1 정답: ⑤** — 산란되어 돌아온 초음파가 수신 신호가 되므로, 산란이 없는 것을 수신에 유리하다고 볼 수 없다.
- **V2 정답: ①** — A와 E의 혈류는 탐촉자에서 멀어지므로 파란색으로 표시된다.
- 두 문항 모두 나머지 네 선지는 참이며, 근거가 부족한 선지는 없다.

※ `one_fact_shortcut`에서는 **독립된 규칙 하나**만 허용했다. 따라서 〈보기〉 없이 판단할 수 있더라도 두 규칙을 함께 확인해야 하는 V1의 ②·④는 `false`로 구분했다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 5,
      "choices": [
        {
          "n": 1,
          "judgment": "참",
          "decisive_clause": "밀도가 각각 2와 6인 두 매질 사이에서 초음파가 더 많이 반사되겠군",
          "minimum_evidence": {
            "passage": "음향 저항은 밀도에 비례하며, 두 매질의 음향 저항 차이가 클수록 경계면에서 초음파가 더 많이 반사된다.",
            "bogi": "두 경계면의 밀도쌍은 (7, 8), (2, 6)이고 음향 저항의 비례상수는 모두 같다. 양의 공통 비례상수를 k라 하면 음향 저항 차이는 각각 k와 4k이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지에는 비교 대상인 다른 경계면의 밀도가 없다. 다른 경계면이 (7, 8)이라는 관찰과 모든 매질에 같은 비례상수가 적용된다는 조건을 확인해야 한다."
          }
        },
        {
          "n": 2,
          "judgment": "참",
          "decisive_clause": "가장 정확한 측정 각도는 아니지만, 실제 측정에서 유지해야 할 각도 범위에는 들겠군",
          "minimum_evidence": {
            "passage": "도플러 각도가 0°일 때 가장 정확하게 측정할 수 있고, 실제 측정에서는 60° 미만을 유지해야 한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "부족한 보기 관찰은 없다. 선지의 30°만으로 적용할 수 있지만, 선지 전체가 참임을 확정하려면 '최적 각도는 0°'와 '실제 유지 범위는 60° 미만'이라는 두 사실이 모두 필요하다."
          }
        },
        {
          "n": 3,
          "judgment": "참",
          "decisive_clause": "도플러 효과가 나타났겠군",
          "minimum_evidence": {
            "passage": "대상이 이동하여 송신 주파수와 수신 주파수가 달라지는 현상이 도플러 효과이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지 자체가 적혈구의 이동과 송수신 주파수의 차이를 제시하므로, 도플러 효과의 정의 하나로 참이라고 판단할 수 있다."
          }
        },
        {
          "n": 4,
          "judgment": "참",
          "decisive_clause": "계속 빨간색으로 표시되고 더 밝아지겠군",
          "minimum_evidence": {
            "passage": "혈류가 탐촉자를 향하면 빨간색으로 표시하고, 혈류 속도가 빠르면 더 밝게 표시한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "부족한 보기 관찰은 없다. 방향 유지와 속도 증가는 선지에 있지만, 전체 결론을 확정하려면 '접근 방향은 빨간색'과 '빠를수록 밝음'이라는 두 표시 규칙이 모두 필요하다."
          }
        },
        {
          "n": 5,
          "judgment": "거짓",
          "decisive_clause": "혈류 정보를 수신하는 데 유리하겠군",
          "minimum_evidence": {
            "passage": "적혈구에서 산란된 초음파 중 일부가 탐촉자로 되돌아와 혈류 정보를 얻는 데 이용된다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "적혈구에서 산란되어 돌아오는 초음파가 수신 신호가 된다는 사실만으로, 산란이 없는 것을 혈류 정보 수신에 유리하다고 한 판단을 부정할 수 있다."
          }
        }
      ],
      "closest_rival": {
        "n": 1,
        "observation": "밀도의 크기 자체가 아니라 두 밀도의 차이를 비교해야 한다. 보기에서 그 차이는 (7, 8) 경계가 1, (2, 6) 경계가 4이므로 ①은 참이다."
      },
      "valid_answers": [5],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 1,
      "choices": [
        {
          "n": 1,
          "judgment": "거짓",
          "decisive_clause": "빨간색으로 표시되겠군",
          "minimum_evidence": {
            "passage": "혈류가 탐촉자를 향하면 빨간색, 그 반대 방향이면 파란색으로 표시한다.",
            "bogi": "혈류 방향 행에서 A와 E는 모두 '멀어짐'이다. 따라서 두 조건 모두 파란색으로 표시된다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "산란된 초음파의 귀환 여부만으로는 표시색을 판단할 수 없다. A와 E의 혈류가 탐촉자에서 멀어진다는 관찰이 필요하다."
          }
        },
        {
          "n": 2,
          "judgment": "참",
          "decisive_clause": "도플러 변위의 절댓값은 B가 C보다 크겠군",
          "minimum_evidence": {
            "passage": "적혈구의 이동 속도가 빠를수록 도플러 변위의 절댓값은 크다.",
            "bogi": "공통 조건에서 연부 조직 내 초음파 속도는 같다. 적혈구 이동 속도 행에서 B는 20 cm/s, C는 10 cm/s이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지에 B와 C의 적혈구 이동 속도가 제시되어 있지 않다. B가 20 cm/s이고 C가 10 cm/s라는 관찰이 필요하다."
          }
        },
        {
          "n": 3,
          "judgment": "참",
          "decisive_clause": "도플러 변위는 양(+)의 값이겠군",
          "minimum_evidence": {
            "passage": "적혈구가 탐촉자에 가까워지는 방향으로 이동하면 도플러 변위는 양(+)의 값을 갖는다.",
            "bogi": "혈류 방향 행에서 D는 '가까워짐'이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지에는 D의 구체적인 혈류 방향이 없다. D가 탐촉자에 가까워진다는 관찰이 필요하다."
          }
        },
        {
          "n": 4,
          "judgment": "참",
          "decisive_clause": "초음파는 B에서보다 D에서 더 많이 산란되겠군",
          "minimum_evidence": {
            "passage": "주파수가 높을수록 산란이 많이 발생한다.",
            "bogi": "적혈구 크기는 B와 D가 모두 2이고, 송신 주파수는 B가 4 MHz, D가 8 MHz이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지의 적혈구 크기 동일 조건만으로는 산란량의 대소를 정할 수 없다. D의 송신 주파수가 B보다 높다는 관찰이 필요하다."
          }
        },
        {
          "n": 5,
          "judgment": "참",
          "decisive_clause": "초음파는 A에서보다 E에서 더 많이 산란되겠군",
          "minimum_evidence": {
            "passage": "산란체의 크기가 작을수록 산란이 많이 발생한다.",
            "bogi": "송신 주파수는 A와 E가 모두 4 MHz이고, 적혈구 크기는 A가 2, E가 1이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지의 송신 주파수 동일 조건만으로는 산란량의 대소를 정할 수 없다. E의 적혈구 크기가 A보다 작다는 관찰이 필요하다."
          }
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "혈류 방향 행에서 D는 '가까워짐'이지만 A와 E는 '멀어짐'이다. 따라서 D의 변위가 양수라는 ③은 참이고, A와 E가 빨간색이라는 ①은 거짓이다."
      },
      "valid_answers": [1],
      "weak": []
    }
  ]
}
```