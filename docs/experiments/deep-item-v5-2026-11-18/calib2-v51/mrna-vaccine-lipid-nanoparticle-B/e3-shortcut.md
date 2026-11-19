**정답은 V1 ③, V2 ④입니다.** 두 문항 모두 정답이 하나이며, 판정 근거가 부족한 선지는 없습니다.

추론 단계는 다음과 같이 구분했습니다.
- **V1 ③: 3단계** — 수용체 결합과 가정된 함입을 내포 작용으로 파악 → 엔도솜 형성 → 세포질 방출이 별도로 필요함을 판단.
- **V2 ④: 5단계** — 5→8의 상승 확인 → 중성화와 연결 → ‘막이 흐트러짐’을 막의 불안정화로 해석 → 8→6의 하강 확인 → 두 방향 비교.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 3,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "두 백신은 모두 바이러스를 배양하는 기존 방식으로 만든 것",
          "minimum_evidence": {
            "passage": "바이러스 단백질의 유전 정보를 암호화한 mRNA를 접종하는 것은 mRNA 백신이다. 이는 바이러스를 배양하여 접종하는 기존 백신과 달리 바이러스가 아니다.",
            "bogi": "㉠의 유전 물질은 바이러스 단백질의 유전 정보가 담긴 mRNA이며, 지질 성분은 없다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지에 제시된 '지질 성분이 없음'만으로는 백신의 유형을 결정할 수 없다. 적어도 ㉠이 바이러스 단백질의 유전 정보를 담은 mRNA 시료라는 관찰이 필요하다."
          },
          "steps": 1
        },
        {
          "n": 2,
          "decisive_clause": "소수성 꼬리가 물과 접하도록 배열",
          "minimum_evidence": {
            "passage": "인지질의 친수성 머리는 수용액에 접하고, 소수성 꼬리는 소수성 분자 간의 인력으로 서로 모인다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "수용액과 접하는 부분은 친수성 머리이므로, 그 대신 소수성 꼬리가 물과 접하도록 배열된다는 설명은 거짓이다."
          },
          "steps": 1
        },
        {
          "n": 3,
          "decisive_clause": "세포질로 방출되는 단계를 더 거쳐야",
          "minimum_evidence": {
            "passage": "수용체에 결합한 외부 물질과 함께 세포막이 함입되는 것이 내포 작용이다. 내포 작용으로 엔도솜이 형성되며, 그 안의 mRNA는 이후 엔도솜 막이 불안정해지면서 세포질로 방출된다.",
            "bogi": "㉢의 세포막 수용체 결합은 '있음'이다. 여기에 선지가 세포막 함입을 가정한다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "㉢의 수용체 결합이 '있음'이라는 관찰이 필요하며, 함입을 내포 작용으로 파악한 뒤 엔도솜 형성과 세포질 방출의 관계까지 연결해야 한다."
          },
          "steps": 3
        },
        {
          "n": 4,
          "decisive_clause": "그 막은 mRNA를 감싼 이온화 지질에서 유래",
          "minimum_evidence": {
            "passage": "엔도솜 막은 세포막에서 유래한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "엔도솜 막의 기원은 세포막이므로, mRNA를 감싼 이온화 지질에서 유래한다는 설명은 거짓이다."
          },
          "steps": 1
        },
        {
          "n": 5,
          "decisive_clause": "DNA를 mRNA로 바꾸는 단계를 거치지 않고",
          "minimum_evidence": {
            "passage": "DNA에 저장된 유전 정보는 mRNA로 전사된 뒤 리보솜을 통해 단백질로 합성된다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "DNA의 유전 정보로 단백질을 합성하려면 mRNA로 전사되는 단계를 거치므로, 그 단계를 생략한다는 설명은 거짓이다."
          },
          "steps": 1
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "㉣에서 '세포막 함입=있음'으로 기록되었다. 함입되는 것은 세포막 자체이므로, 형성된 엔도솜의 막도 세포막에서 유래하며 mRNA를 감싼 이온화 지질에서 유래하지 않는다."
      },
      "valid_answers": [3],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 4,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "전기적 반발력을 막지 못해",
          "minimum_evidence": {
            "passage": "음전하를 띤 mRNA가 양이온성 지질로 둘러싸이면 음전하를 띤 세포막의 인산기 머리와 서로 반발하지 않는다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "양이온성 지질은 mRNA와 세포막 사이의 전기적 반발을 막으므로, 체내에서 그 반발을 막지 못했다는 설명은 거짓이다."
          },
          "steps": 1
        },
        {
          "n": 2,
          "decisive_clause": "리보솜을 대신하여",
          "minimum_evidence": {
            "passage": "세포질로 방출된 mRNA는 리보솜과 결합하여 바이러스 단백질을 합성한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "mRNA는 리보솜과 결합하여 단백질 합성에 이용되는 것이지 리보솜을 대신하는 것이 아니므로 거짓이다."
          },
          "steps": 1
        },
        {
          "n": 3,
          "decisive_clause": "세포에 쉽게 흡수되겠군",
          "minimum_evidence": {
            "passage": "mRNA는 분자의 크기가 크고 음전하를 띠어 세포에 거의 흡수되지 않는다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "mRNA의 큰 분자 크기는 세포 흡수를 어렵게 하는 요인이므로, 크기가 커서 쉽게 흡수된다는 설명은 거짓이다."
          },
          "steps": 1
        },
        {
          "n": 4,
          "decisive_clause": "pH가 변하는 방향이 서로 반대",
          "minimum_evidence": {
            "passage": "이온화 지질은 pH가 높은 용액에서 전기적으로 중성이 된다.",
            "bogi": "㉯는 pH 5에서 mRNA와 결합했고 이후 놓인 체내 용액은 pH 8이다. ㉯가 든 엔도솜은 pH 6이며, 그곳에서 엔도솜 막의 일부가 흐트러지는 현상이 관찰되었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "결합 용액의 pH 5, 체내 용액의 pH 8, 엔도솜의 pH 6 및 막이 흐트러졌다는 관찰이 없으면 두 사건에 대응하는 pH 변화 방향을 비교할 수 없다."
          },
          "steps": 5
        },
        {
          "n": 5,
          "decisive_clause": "소수성 분자 간의 인력이 아니라",
          "minimum_evidence": {
            "passage": "인지질의 소수성 꼬리들은 소수성 분자 간의 인력으로 인해 서로 모인다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "인지질 꼬리들이 모이는 원인은 소수성 분자 간의 인력이므로, 이를 부정하고 전기적 반발력 때문이라고 한 설명은 거짓이다."
          },
          "steps": 1
        }
      ],
      "closest_rival": {
        "n": 1,
        "observation": "체내에서 ㉮의 양이온성 지질에 혈장 단백질이 흡착되었다. 이는 지문이 제시한 세포막 투과 제한의 원인에 해당하며, 전기적 반발을 막지 못했다는 설명과 구별된다."
      },
      "valid_answers": [4],
      "weak": []
    }
  ]
}
```