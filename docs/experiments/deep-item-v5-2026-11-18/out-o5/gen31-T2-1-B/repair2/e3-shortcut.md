**정답: V1 ①, V2 ⑤**

- **V1:** 같은 농도에서 출발했는데 t₁에서 ㉡이 ㉠보다 높으므로, 잔류 농도가 더 천천히 줄어든 ㉡이 모노클로라민 쪽이다. ㉡은 t₁에서 P보다 높지만 관망 말단인 t₂에서는 P보다 낮으므로, 말단에서 잰 농도에 맞춰 투입 조건을 조정해야 한다.
- **V2:** B에서는 조사 구간에 모노클로라민이 없었고, 출구에서 ㉮는 살아 있었지만 정상적으로 복제하지 못했다. B는 자외선으로 ㉮를 불활성화한 뒤 모노클로라민을 주입했으므로, 두 소독제가 조사 구간에서 동시에 작용하지 않아도 두 방식을 함께 사용한 것이다. ①의 ‘뒤에 … 작용할 수 있게 되었다’는 작용 가능해진 시점을 조사 구간 이후로 잡는 표현이다. A는 조사 구간 안에 이미 모노클로라민이 있었으므로, ‘벗어난 뒤**에도** 작용할 수 있었다’와는 다르다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 1,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "관망 말단에서 잰 농도에 맞춰 투입 조건을 조정해야겠군",
          "minimum_evidence": {
            "passage": "6문단: 모노클로라민은 유리 염소보다 느리게 소비되어 잔류분이 오래 유지된다. 관망 말단에서 필요한 잔류 농도가 유지되는지 확인하여 투입 조건을 조정한다.",
            "bogi": "t₀ 행: ㉠=㉡. t₁ 행: ㉠<P<㉡. 말단인 t₂ 행: ㉡<P."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "말단 농도에 맞춰 조정한다는 원칙만으로는 모노클로라민 쪽이 t₁에서 P를 웃돌고 t₂에서 P에 못 미쳤는지 알 수 없다."
          },
          "steps": 4,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "다른 소독제보다 미생물을 더 빠르게 불활성화하겠군",
          "minimum_evidence": {
            "passage": "6문단: 모노클로라민은 유리 염소보다 잔류분이 오래 유지되지만 미생물 불활성화 속도는 더 느리다.",
            "bogi": "t₀ 행: ㉠=㉡. t₁ 행: ㉡>㉠. 따라서 같은 시간 동안 ㉡의 농도 감소량이 더 작다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "불활성화 속도 비교 한 가지로는 선지가 가리키는 t₀~t₁의 감소가 더 느린 쪽을 정할 수 없다. 출발 농도와 t₁ 농도의 비교가 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "미생물 외의 물속 성분과 반응해 소비되는 일이 없기 때문이겠군",
          "minimum_evidence": {
            "passage": "6문단: 모노클로라민은 물속 성분과의 반응으로 소비되되, 그 소비 속도가 유리 염소보다 느리다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "두 소독제는 물속 성분과의 반응에 따른 소비 속도가 다를 뿐이므로, ㉡이 어느 쪽이든 ‘소비되는 일이 없다’는 설명은 틀리다."
          },
          "steps": 1,
          "bogi_sources": 0,
          "task": "내용 확인",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "t₁에서 잔류 소독제 농도가 더 높은 쪽에 적용되겠군",
          "minimum_evidence": {
            "passage": "3문단: 유리 염소가 천연 유기물과 반응하면 트리할로메탄이 생성될 수 있다. 6문단: 모노클로라민은 유리 염소보다 잔류분이 오래 유지된다.",
            "bogi": "t₀ 행: ㉠=㉡. t₁ 행: ㉡>㉠. t₁에서 농도가 더 높은 ㉡은 모노클로라민 쪽이고, 유리 염소 쪽은 ㉠이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "트리할로메탄 생성 반응에 유리 염소가 관여한다는 사실만으로는 t₁에서 농도가 더 높은 쪽이 어느 소독제인지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "미생물과 유리 염소의 접촉 시간에 포함되지 않겠군",
          "minimum_evidence": {
            "passage": "2문단: 접촉 시간은 미생물이 소독제에 노출되는 시간이다. 6문단: 유리 염소는 모노클로라민보다 빨리 소비된다.",
            "bogi": "t₀ 행: ㉠=㉡. t₂ 행: 0<㉠<㉡. ㉠의 변화: t₀부터 t₂까지 감소한다. 따라서 유리 염소 쪽인 ㉠은 t₁~t₂ 동안에도 농도가 0보다 높다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "접촉 시간의 정의만으로는 ㉠이 유리 염소 쪽인지, t₁~t₂ 동안 유리 염소가 남아 있었는지 알 수 없다."
          },
          "steps": 4,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "같은 농도로 출발해 t₁에 더 많이 남은 쪽은 모노클로라민이다. 이 소독제는 잔류 농도가 더 천천히 줄어들지만 미생물도 더 천천히 불활성화한다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [1],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 5,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "A에서는 조사 구간을 벗어난 뒤에 잔류 소독제가 작용할 수 있게 되었겠군",
          "minimum_evidence": {
            "passage": "6문단: 모노클로라민은 물속에 남아 작용할 수 있는 잔류 소독제다.",
            "bogi": "조사 구간 전체와 그 출구에서 A의 물에 이미 모노클로라민이 있었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "자외선 조사 자체가 소독제 잔류분을 남기지 않는다는 사실만으로는 A에 잔류 소독제가 언제부터 있었는지 알 수 없다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "자외선이 ㉮를 불활성화했다고 볼 수 없겠군",
          "minimum_evidence": {
            "passage": "4문단: 자외선은 미생물의 유전 물질을 손상시켜 정상적인 복제를 방해함으로써 불활성화한다.",
            "bogi": "B에는 조사 구간 전체와 출구에서 모노클로라민이 없었다. B의 출구에서 ㉮는 살아 있었지만 정상적으로 복제하지 못했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "복제 방해로 불활성화할 수 있다는 사실은 생존만으로 불활성화를 배제할 수 없음을 보여 주지만, B의 ㉮가 실제로 복제하지 못했는지까지는 알려 주지 않는다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "두 미생물 각각의 불활성화에 필요한 자외선 조사량을 확보했겠군",
          "minimum_evidence": {
            "passage": "4문단: 자외선에 의한 불활성화는 정상 복제가 방해되는 방식으로 일어나며, 필요한 조사량은 미생물의 종류와 목표에 맞춰 확보해야 한다.",
            "bogi": "B의 출구에서 ㉮와 ㉯가 모두 살아 있었고 ㉮만 정상적으로 복제하지 못했다. ㉯는 살아 있고 정상 복제도 가능했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "종류별로 필요한 조사량을 확보해야 한다는 원칙만으로는 B가 실제로 두 미생물의 목표를 달성했는지 알 수 없다. 특히 ㉯의 복제 결과가 필요하다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "B가 조정 대상이겠군",
          "minimum_evidence": {
            "passage": "",
            "bogi": "B의 관망 말단 농도는 1.5 mg/L이고, 필요한 최소 농도는 1 mg/L이다. B는 이미 최소 농도를 충족한다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "말단 농도에 맞춰 투입 조건을 조정한다는 원칙만으로는 B가 기준 미달인지 알 수 없다. B의 측정값과 최소 농도가 필요하다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": true
        },
        {
          "n": 5,
          "decisive_clause": "조사 구간에서 동시에 작용하지 않았어도 두 소독 방식을 함께 사용한 것이겠군",
          "minimum_evidence": {
            "passage": "4문단: 자외선은 정상 복제를 방해해 미생물을 불활성화한다. 5~6문단: 자외선 처리 뒤 공급 과정의 수질 유지를 위해 모노클로라민을 잔류 소독제로 사용할 수 있다.",
            "bogi": "B에는 조사 구간 전체와 출구에서 모노클로라민이 없었다. 출구에서 ㉮는 정상적으로 복제하지 못했다. 저장 시설을 지난 뒤에는 B에도 모노클로라민이 남아 있었다. 두 경로는 모노클로라민 주입 위치만 다르다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "자외선 처리 뒤 잔류 소독제를 쓸 수 있다는 사실만으로는 B에서 ㉮가 불활성화되었는지, 모노클로라민이 조사 구간 뒤에 주입되었는지 알 수 없다."
          },
          "steps": 4,
          "bogi_sources": 4,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 1,
        "observation": "조사 구간 전체와 출구에 모노클로라민이 있었던 경로는 A뿐이다. 따라서 A는 구간을 벗어난 뒤에야 잔류 소독제가 작용할 수 있게 된 사례가 아니다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [5],
      "weak": []
    }
  ]
}
```