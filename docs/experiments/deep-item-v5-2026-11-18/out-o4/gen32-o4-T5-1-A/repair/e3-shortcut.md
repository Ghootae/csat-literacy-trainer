- **V1 정답: ②.** A의 시장 가격은 800원을 넘을 수 없지만, C의 가격 탄력성을 구하는 구간은 1,000원까지 이른다.
- **V2 정답: ③.** 첫 적용에서 A의 수요량 증가분은 더 크지만, 부족량은 A가 균형 거래량의 60%, B가 80%이므로 B가 더 크다.

두 문항 모두 부정 발문이며, 내용상 거짓인 선지는 각각 하나뿐이다. `bogi_sources`는 같은 시장·적용 열에서 함께 읽는 값들을 1개로 묶고, 표 밖의 공통 조건 문장은 별도로 셌다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "650원에 거래할 수 있겠군",
          "minimum_evidence": {
            "passage": "1문단: 상한 가격보다 낮은 가격에서도 거래할 수 있다.",
            "bogi": "D의 상한 가격은 700원이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "상한 미만의 가격에서도 거래할 수 있다는 사실만으로는 650원이 D의 상한 미만인지 알 수 없다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "C의 가격 탄력성을 구하는 구간이 들어가겠군",
          "minimum_evidence": {
            "passage": "1문단: 상한 가격은 거래 가격의 최고 한도이다. 5문단: 탄력성을 구하는 구간의 한쪽 끝은 균형 가격이다.",
            "bogi": "A의 상한 가격은 800원이고 C의 균형 가격은 1,000원이다. A가 거치는 가격에는 C 구간의 끝점인 1,000원이 들어갈 수 없다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "탄력성 구간의 끝점이 균형 가격이라는 사실만으로는 그 끝점이 A가 거치는 범위를 벗어나는지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "D의 출발 가격과 같은 수준에서 멈추겠군",
          "minimum_evidence": {
            "passage": "4문단: 상한 가격이 균형 가격보다 낮으면 상승하던 시장 가격은 상한에서 멈춘다.",
            "bogi": "B의 상한 가격 600원은 균형 가격 900원보다 낮다. D의 출발 가격은 600원이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "상한에서 멈추는 조건을 알아도 B가 그 조건을 충족하는지, 그 상한이 D의 출발 가격과 같은지는 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "수요량 증가분이 달라서가 아니라 공급량 감소분이 달라서 부족량에 차이가 나겠군",
          "minimum_evidence": {
            "passage": "4~5문단: 부족량은 수요량 증가분과 공급량 감소분의 합이다. 각 변화분은 해당 탄력성에 가격 하락률과 균형 거래량을 곱해 구할 수 있다.",
            "bogi": "A와 C는 균형 가격 1,000원과 상한 가격 800원이 같아 가격 하락률이 모두 20%다. 균형 거래량과 수요 탄력성은 같지만 공급 탄력성은 A가 1, C가 2다. 따라서 수요량 증가분은 같고 공급량 감소분은 C가 더 크다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "공급 탄력성만 더 크면 부족량도 커진다는 규칙은 알 수 있지만, A와 C에서 실제로 그 조건이 성립하는지는 알 수 없다."
          },
          "steps": 5,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "출발 가격에서보다 상한 가격에서 더 많지만, 균형 거래량보다는 적겠군",
          "minimum_evidence": {
            "passage": "2문단: 가격이 오르는 동안 공급량은 늘어난다. 4문단: 상한이 균형 가격보다 낮으면 상한에서의 공급량은 균형 거래량보다 적다.",
            "bogi": "C의 출발 가격은 500원, 상한 가격은 800원, 균형 가격은 1,000원이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "가격 상승에 따라 공급량이 늘어난다는 사실만으로는 C의 상한 가격이 균형 가격보다 낮아 두 번째 비교도 성립하는지 알 수 없다."
          },
          "steps": 4,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "B가 실제로 상승을 멈추는 가격인 600원은 D의 출발 가격과 정확히 일치한다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [2],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 3,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "상한 가격에 닿기 전에 상승을 멈추겠군",
          "minimum_evidence": {
            "passage": "3문단: 상한 가격이 균형 가격보다 높으면 시장 가격은 상한에 이르기 전에 균형 가격에서 상승을 멈춘다.",
            "bogi": "두 번째 적용 B의 상한 가격 1,400원은 균형 가격 1,000원보다 높다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "균형 가격에서 먼저 멈추는 조건을 알아도 두 번째 적용 B의 상한이 균형 가격보다 높은지는 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "A의 수요량이 늘어난 양은 B의 공급량이 줄어든 양보다 적겠군",
          "minimum_evidence": {
            "passage": "5문단: 수요량 증가율과 공급량 감소율은 각각 해당 탄력성에 가격 하락률을 곱한 값이며, 두 변화율의 기준은 균형 거래량이다.",
            "bogi": "첫 적용 A와 B 모두 균형 가격 1,000원, 상한 가격 800원으로 가격 하락률이 20%이며 균형 거래량도 같다. A의 수요 탄력성 2와 B의 공급 탄력성 3을 적용하면 변화분은 각각 공통 균형 거래량의 40%, 60%이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "탄력성에서 수량 변화분을 구하는 관계만으로는 두 변화분의 크기를 정할 가격 하락률, 해당 탄력성, 균형 거래량의 비교 조건을 알 수 없다."
          },
          "steps": 4,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "부족량도 더 크겠군",
          "minimum_evidence": {
            "passage": "4~5문단: 부족량은 수요량 증가분과 공급량 감소분의 합이다. 가격 하락률과 균형 거래량이 같으면 두 탄력성의 합이 큰 쪽의 부족량이 더 크다.",
            "bogi": "첫 적용에서 두 시장 모두 균형 가격 1,000원, 상한 가격 800원으로 가격 하락률이 20%이고 균형 거래량도 같다. 수요·공급 탄력성의 합은 A가 2+1=3, B가 1+3=4다. 부족량은 각각 공통 균형 거래량의 60%, 80%이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "수요량 증가분이 더 크다는 사실만으로는 부족량의 대소가 정해지지 않는다. 가격 하락률과 균형 거래량의 비교 조건 및 양쪽 탄력성 값이 필요하다."
          },
          "steps": 5,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "두 번째 적용 때의 거래량은 첫 적용 때의 수요량보다 적겠군",
          "minimum_evidence": {
            "passage": "3문단: 상한이 균형 가격보다 높으면 균형 거래량만큼 거래된다. 4문단: 상한이 균형 가격보다 낮으면 상한에서의 수요량은 균형 거래량보다 많다.",
            "bogi": "A의 균형 가격은 두 적용 모두 1,000원이고, 상한 가격은 첫 적용 800원, 두 번째 적용 1,200원이다. 두 적용의 균형 거래량은 같다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "한 경우의 거래량이나 수요량에 관한 규칙만으로는 두 적용에서 상한이 균형 가격의 어느 쪽에 있는지, 비교 기준인 균형 거래량이 같은지 알 수 없다."
          },
          "steps": 5,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "첫 적용과 달리 두 번째 적용에서는 두 시장 모두 가격이 더는 오르지 않을 때 초과 수요가 남지 않겠군",
          "minimum_evidence": {
            "passage": "3문단: 상한이 균형 가격보다 높으면 초과 수요가 사라지는 균형 가격에서 상승이 멈춘다. 4문단: 상한이 균형 가격보다 낮으면 초과 수요가 남은 채 상한에서 상승이 멈춘다.",
            "bogi": "균형 가격은 네 경우 모두 1,000원이다. 첫 적용의 상한은 두 시장 모두 800원이고, 두 번째 적용의 상한은 A가 1,200원, B가 1,400원이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "균형 가격에서는 초과 수요가 사라진다는 사실만으로는 각 적용의 정지 가격이 균형 가격인지 상한 가격인지 알 수 없다."
          },
          "steps": 4,
          "bogi_sources": 4,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "첫 적용 B의 공급량 감소분은 공통 균형 거래량의 60%로, ②가 비교하는 A의 수요량 증가분(40%)보다 크고 ③이 비교하는 A의 부족량 전체(60%)와 같다. B에는 여기에 수요량 증가분도 더해진다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [3],
      "weak": []
    }
  ]
}
```