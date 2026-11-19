## 판정 요약

두 문항 모두 **부정 발문**이므로, 내용상 거짓인 선지를 고른다.

| 문항 | ① | ② | ③ | ④ | ⑤ | 정답 |
|---|---|---|---|---|---|---|
| V1 | 참 | 참 | 거짓 | 참 | 참 | **③** |
| V2 | 참 | 참 | 참 | 참 | 거짓 | **⑤** |

- **V1:** pH를 높여 만든 복합체는 중성이다. 또한 지질이 mRNA를 둘러싸는 것과 **mRNA 자체가 양전하로 바뀌는 것**은 다르다.
- **V2:** 친수성 물질의 막 투과가 차단되는 것과 **세포막이 물질을 감싸 함입하는 내포 작용**은 구별해야 한다.
- 아래 `steps`는 **최소 판정 경로** 기준이다. `one_fact_shortcut`에서는 선지의 명시적 가정은 사용할 수 있지만, 선지가 주장하는 내용을 곧바로 참인 전제로 삼지는 않았다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 3,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "항체를 만들거나 같은 바이러스가 다시 침입할 때를 대비해 기억 세포를 생성할 수 있겠군",
          "minimum_evidence": {
            "passage": "생물체는 바이러스 단백질을 항원으로 인식하고 항체를 만들거나, 같은 바이러스의 침입에 대비해 기억 세포를 생성한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "바이러스 단백질에 대해 항체나 기억 세포를 생성한다는 지문의 면역 반응 설명을, 선지에 명시된 합성된 바이러스 단백질에 적용하면 참이다."
          },
          "steps": 1
        },
        {
          "n": 2,
          "decisive_clause": "체내 효소에 의해 쉽게 분해되었겠군",
          "minimum_evidence": {
            "passage": "mRNA 백신의 mRNA는 체내 효소에 의해 쉽게 분해된다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "보호되지 않은 원료 mRNA가 그대로 들어갔다는 가정에, mRNA는 체내 효소에 의해 쉽게 분해된다는 사실을 적용하면 참이다."
          },
          "steps": 1
        },
        {
          "n": 3,
          "decisive_clause": "양이온성을 유지해",
          "minimum_evidence": {
            "passage": "낮은 pH에서 mRNA와 이온화 지질을 결합시킨 뒤 pH를 높이면 중성의 mRNA-지질 나노 입자 복합체를 만들 수 있다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "지문이 설명한 복합체 제조 과정에서 pH를 높인 뒤에는 중성이 되므로, 그 단계에서도 양이온성을 유지한다는 진술은 거짓이다."
          },
          "steps": 1
        },
        {
          "n": 4,
          "decisive_clause": "친수성을 띠므로, 세포막을 투과하기 어렵겠군",
          "minimum_evidence": {
            "passage": "물은 친수성 물질과 섞이며, 세포막은 친수성 물질의 투과를 차단한다.",
            "bogi": "원료 mRNA를 물에 넣자 고르게 섞였다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "세포막이 친수성 물질의 투과를 차단한다는 한 사실만으로는 원료 mRNA의 친수성까지 확인할 수 없다. 물과 고르게 섞였다는 관찰이 더 필요하다. 지문만 이용하더라도 mRNA의 음전하와 친수성의 정의를 추가로 연결해야 한다."
          },
          "steps": 2
        },
        {
          "n": 5,
          "decisive_clause": "mRNA 자체가 양전하를 띠게 되어 세포막과의 전기적 반발이 줄었다고 볼 수는 없겠군",
          "minimum_evidence": {
            "passage": "음전하를 띤 mRNA가 양이온성 지질로 둘러싸이면 세포막의 인산기 머리와 반발하지 않는다. 반발 감소는 지질이 둘러싼 데 따른 것이지 mRNA 자체의 양전하 전환으로 설명되지 않는다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "지문은 음전하를 띤 mRNA를 양이온성 지질이 둘러싸 반발을 막는다고 설명하므로, mRNA 자체가 양전하로 바뀌었다고 볼 수 없다는 선지는 참이다."
          },
          "steps": 1
        }
      ],
      "closest_rival": {
        "n": 5,
        "observation": "복합체를 pH 8인 용액으로 옮겼다는 관찰이다. 이는 이온화 지질이 양이온성을 유지한다는 ③을 반박하며, mRNA 자체의 양전하화를 부정하는 ⑤와는 충돌하지 않는다."
      },
      "valid_answers": [
        3
      ],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 5,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "혈장 단백질이 지질에 흡착되어 mRNA가 세포막을 투과하는 것이 제한되겠군",
          "minimum_evidence": {
            "passage": "양이온성 지질에 혈장 단백질이 흡착되면 mRNA의 세포막 투과가 제한된다.",
            "bogi": "A의 지질은 양이온성 지질이며, 혈장 단백질이 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "양이온성 지질에 대한 혈장 단백질 흡착 규칙만으로는 A에 적용할 수 없다. A가 양이온성 지질을 사용하고 혈장 단백질도 있다는 두 관찰이 필요하다."
          },
          "steps": 2
        },
        {
          "n": 2,
          "decisive_clause": "바이러스 감염이 일어났다고 볼 수는 없겠군",
          "minimum_evidence": {
            "passage": "mRNA 백신은 바이러스가 아니므로 백신으로 인해 바이러스에 감염될 위험이 없다.",
            "bogi": "B는 동일한 mRNA로 만든 백신 시료 중 하나이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지 자체에는 B가 mRNA 백신 시료라는 정보가 없다. mRNA 백신의 비감염성이라는 한 사실을 B에 적용하려면 B의 시료 종류를 확인해야 한다."
          },
          "steps": 1
        },
        {
          "n": 3,
          "decisive_clause": "엔도솜 막이 불안정해져 mRNA가 엔도솜 밖 세포질로 방출될 수 있겠군",
          "minimum_evidence": {
            "passage": "낮은 pH는 산성에 해당한다. 엔도솜 내부가 산성화되면 엔도솜 막이 불안정해지고, 이에 따라 mRNA가 세포질로 방출된다.",
            "bogi": "C의 mRNA 위치는 엔도솜 내부이고, mRNA가 있는 공간의 pH는 낮다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "엔도솜 산성화에 따른 방출 규칙만으로는 C의 상태를 알 수 없다. C의 mRNA가 엔도솜 내부에 있고 그 공간의 pH가 낮다는 관찰이 필요하다."
          },
          "steps": 4
        },
        {
          "n": 4,
          "decisive_clause": "먼저 엔도솜 밖 세포질로 방출되어야겠군",
          "minimum_evidence": {
            "passage": "엔도솜에서 세포질로 방출된 mRNA가 리보솜과 결합한다.",
            "bogi": "D의 mRNA는 엔도솜 내부에 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지만으로는 D의 mRNA가 현재 엔도솜 내부에 있는지 알 수 없다. 이미 엔도솜 밖 세포질에 있는 경우와 구별하려면 D의 위치 관찰이 필요하다."
          },
          "steps": 1
        },
        {
          "n": 5,
          "decisive_clause": "내포 작용은 막히겠군",
          "minimum_evidence": {
            "passage": "내포 작용은 세포막의 일부가 수용체에 결합한 외부 물질과 함께 세포질로 함입되는 현상이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "내포 작용은 외부 물질이 막 자체를 투과하는 과정이 아니라 막이 그 물질과 함께 함입되는 과정이므로, 친수성 물질의 막 투과 차단을 근거로 내포 작용까지 막힌다고 한 것은 거짓이다."
          },
          "steps": 2
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "D의 mRNA 위치가 이미 '엔도솜 내부'라는 관찰이다. ④는 이미 유입된 mRNA가 리보솜과 결합하기 위한 방출의 필요성을 말한다. 이는 ⑤처럼 외부 복합체의 내포 작용 자체를 부정하는 주장과 다르다."
      },
      "valid_answers": [
        5
      ],
      "weak": []
    }
  ]
}
```