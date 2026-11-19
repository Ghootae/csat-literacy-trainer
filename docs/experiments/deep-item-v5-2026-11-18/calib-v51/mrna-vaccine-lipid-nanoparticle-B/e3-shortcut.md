## 판정 요약

| 문항 | ① | ② | ③ | ④ | ⑤ | 정답 |
|---|---|---|---|---|---|---|
| V1 | 거짓 | 거짓 | 참 | 거짓 | 거짓 | **③** |
| V2 | 거짓 | 거짓 | 거짓 | 참 | 거짓 | **④** |

- **V1:** ③은 ‘세포막이 함입된다면’이라는 가정이다. 현재 ㉢의 함입이 ‘없음’이라는 기록과 모순되지 않는다. 내포 작용으로 들어온 mRNA는 엔도솜에서 세포질로 방출되어야 한다. ④의 엔도솜 막은 **이온화 지질이 아니라 세포막에서 유래**한다.
- **V2:** ㉯의 중성화 과정에서는 pH가 **5→8로 상승**하고, 엔도솜 내부에서는 **8→6으로 하강**한다. ①은 체내 진입 제한의 원인을 혈장 단백질 흡착이 아닌 전기적 반발력으로 잘못 설명한다.

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
            "passage": "mRNA 백신은 바이러스 단백질의 유전 정보를 암호화한 mRNA를 접종하는 것이며, 바이러스를 배양하여 접종하는 기존 백신과 구별된다.",
            "bogi": "㉠의 유전 물질은 mRNA이고 지질 성분은 없다. ㉠은 지질로 감싸지 않은 mRNA를 접종하는 경우이므로, 지질 성분이 없다는 이유로 바이러스를 배양한 백신으로 분류할 수 없다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지에 제시된 지질 성분의 부재만으로는 백신의 종류를 판정할 수 없으며, ㉠의 유전 물질이 mRNA라는 관찰이 필요하다."
          }
        },
        {
          "n": 2,
          "decisive_clause": "소수성 꼬리가 물과 접하도록",
          "minimum_evidence": {
            "passage": "인지질은 친수성 머리가 수용액에 접하고, 소수성 꼬리는 서로 몰리도록 배열된다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "인지질의 친수성 머리가 물에 접한다는 사실만으로, 소수성 꼬리가 머리 대신 물에 접한다는 설명은 거짓이다."
          }
        },
        {
          "n": 3,
          "decisive_clause": "세포질로 방출되는 단계를 더 거쳐야",
          "minimum_evidence": {
            "passage": "수용체에 결합한 외부 물질은 세포막의 함입인 내포 작용으로 들어오며, 이때 엔도솜이 형성된다. 이후 엔도솜 막이 불안정해지면서 mRNA가 세포질로 방출된다.",
            "bogi": "㉢은 mRNA와 이온화 지질로 구성되며 세포막 수용체 결합은 있음이다. 현재 세포막 함입은 없음이지만, 선지는 함입이 일어나는 경우를 가정한다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "㉢의 mRNA가 수용체에 결합한 지질 복합체에 들어 있다는 관찰과, 함입 후 엔도솜 형성 및 세포질 방출로 이어지는 과정의 연결이 필요하다."
          }
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
            "proof": "엔도솜 막이 세포막에서 유래한다는 한 사실이 이온화 지질에서 유래한다는 설명을 직접 반박한다."
          }
        },
        {
          "n": 5,
          "decisive_clause": "DNA를 mRNA로 바꾸는 단계를 거치지 않고",
          "minimum_evidence": {
            "passage": "바이러스는 자신의 유전 물질을 mRNA로 바꾼 뒤 숙주 세포가 바이러스 단백질을 합성하게 한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "바이러스는 유전 물질을 mRNA로 바꾼 뒤 단백질 합성을 유도하므로, 선지가 명시한 DNA를 mRNA로 바꾸지 않는다는 설명은 거짓이다."
          }
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "㉣에서 함입되는 것은 세포막이다. 따라서 그 결과 생기는 엔도솜의 막도 세포막 유래이지, mRNA를 감싼 이온화 지질 유래가 아니다."
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
            "passage": "양이온성 지질은 mRNA와 세포막 사이의 전기적 반발력을 막는다. 체내에서 투과가 제한되는 이유는 양이온성 지질에 혈장 단백질이 흡착되기 때문이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "양이온성 지질이 mRNA와 세포막 사이의 전기적 반발력을 막는다는 사실에 어긋나며, 지문은 체내에서도 그 기능이 사라진다고 하지 않는다."
          }
        },
        {
          "n": 2,
          "decisive_clause": "리보솜을 대신하여",
          "minimum_evidence": {
            "passage": "세포질로 방출된 mRNA는 리보솜과 결합하여 바이러스 단백질 합성에 이용된다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "mRNA는 리보솜과 결합하여 단백질 합성에 이용되므로, 리보솜을 대신한다는 설명은 거짓이다."
          }
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
            "proof": "mRNA의 큰 분자 크기는 흡수가 어려운 원인이므로, 크기가 커서 쉽게 흡수된다는 설명은 거짓이다."
          }
        },
        {
          "n": 4,
          "decisive_clause": "pH가 변하는 방향이 서로 반대",
          "minimum_evidence": {
            "passage": "이온화 지질은 낮은 pH에서 mRNA와 결합하고 pH를 높이면 중성이 된다. 엔도솜 내부가 산성화되면 엔도솜 막이 불안정해진다.",
            "bogi": "㉯의 이온화 지질은 pH 5에서 mRNA와 결합했고 체내 용액의 pH는 8이었다. ㉯가 든 엔도솜의 pH는 6이었으며, 막의 일부가 흐트러졌다. 따라서 중성화 과정은 5→8의 상승, 엔도솜 산성화 과정은 8→6의 하강이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지만으로는 ㉯의 지질 종류와 pH 변화 경로를 알 수 없다. 이온화 지질을 사용했고 pH가 5→8→6으로 변했다는 관찰이 필요하다."
          }
        },
        {
          "n": 5,
          "decisive_clause": "소수성 분자 간의 인력이 아니라",
          "minimum_evidence": {
            "passage": "인지질의 소수성 꼬리들은 소수성 분자 간의 인력으로 인해 서로 몰려 있다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "인지질 꼬리들이 모이는 원인이 소수성 분자 간의 인력이라는 사실을 선지가 직접 부정하므로 거짓이다."
          }
        }
      ],
      "closest_rival": {
        "n": 1,
        "observation": "체내의 ㉮에서는 양이온성 지질에 혈장 단백질이 흡착된 것이 관찰되었다. 이는 지문이 제시한 체내 투과 제한의 원인과 일치하며, 전기적 반발력을 막지 못했다는 설명과는 다르다."
      },
      "valid_answers": [4],
      "weak": []
    }
  ]
}
```