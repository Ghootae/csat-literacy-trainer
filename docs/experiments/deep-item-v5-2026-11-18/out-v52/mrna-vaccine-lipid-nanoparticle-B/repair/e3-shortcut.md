## 판정 결과

| 문항 | ① | ② | ③ | ④ | ⑤ | 정답 |
|---|---|---|---|---|---|---|
| V1 | 거짓 | 거짓 | 참 | 거짓 | 거짓 | **③** |
| V2 | 거짓 | 거짓 | 거짓 | 참 | 거짓 | **④** |

두 문항 모두 긍정 발문이며, 내용상 참인 선지는 각각 하나다.  
`one_fact_shortcut`은 **지문 사실 하나만으로 실제 정오가 확정되는지**를 기준으로 했다. 따라서 〈보기〉가 불필요하더라도 지문 관계 둘을 연결해야 한다면 `false`이다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 3,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "접종자의 DNA에서 전사되어야",
          "minimum_evidence": {
            "passage": "mRNA 백신은 바이러스 단백질의 유전 정보를 암호화한 mRNA를 접종하며, 주입된 mRNA를 통해 바이러스 단백질을 합성한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "백신으로 주입한 mRNA 자체가 단백질 합성에 쓰이므로, 먼저 접종자의 DNA에서 전사되어야 한다는 주장은 거짓이다."
          },
          "steps": 1
        },
        {
          "n": 2,
          "decisive_clause": "보호하는 효과도 같겠군",
          "minimum_evidence": {
            "passage": "체내에서 쉽게 분해되는 mRNA를 보호하기 위해 지질 나노 입자를 이용한다.",
            "bogi": "‘mRNA를 감싼 지질’ 행에서 ㉠은 ‘없음’, ㉡은 ‘이온화 지질’이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "부족한 관찰: ㉠과 ㉡의 지질 피복 유무가 서로 다르다는 사실이 필요하다. pH가 같다는 선지의 정보만으로는 보호 효과의 동일 여부를 확정할 수 없다."
          },
          "steps": 2
        },
        {
          "n": 3,
          "decisive_clause": "mRNA가 엔도솜 밖에서 리보솜과 결합할 수 있겠군",
          "minimum_evidence": {
            "passage": "산성 용액의 pH는 7보다 낮다. 엔도솜 내부가 산성화되면 엔도솜 막이 불안정해져 mRNA가 세포질로 방출되고, 방출된 mRNA는 리보솜과 결합한다.",
            "bogi": "㉠의 pH는 5이다. ㉣의 mRNA는 엔도솜 내부에 있으며 현재 pH는 7이다. 따라서 조건대로라면 ㉣의 pH는 7에서 5로 낮아진다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "부족한 관찰: ㉠과 ㉣의 pH가 각각 5와 7이라는 정보가 필요하다. 여기에 pH 하강에 따른 산성화, mRNA 방출, 리보솜 결합을 연결해야 한다."
          },
          "steps": 4
        },
        {
          "n": 4,
          "decisive_clause": "mRNA를 감싼 이온화 지질이 펼쳐져 만들어졌겠군",
          "minimum_evidence": {
            "passage": "내포 작용은 세포막 일부가 외부 물질과 함께 세포질로 함입되는 현상이며, 엔도솜 막은 세포막에서 유래한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "엔도솜 막은 세포막에서 유래하므로, mRNA를 감싼 이온화 지질이 펼쳐져 만들어졌다는 설명은 거짓이다."
          },
          "steps": 1
        },
        {
          "n": 5,
          "decisive_clause": "친수성 머리가 아니라",
          "minimum_evidence": {
            "passage": "세포막에서 인지질의 친수성 머리는 세포 외부나 세포질의 수용액에 접하고, 소수성 꼬리는 서로 몰려 있다.",
            "bogi": "‘mRNA의 위치’ 행에서 ㉢은 ‘세포막 바깥면’이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "부족한 관찰: ㉢의 mRNA가 세포막 바깥면에 있다는 위치 정보가 필요하다. 이를 세포 외부 수용액에 접하는 면으로 해석해야 친수성 머리와 맞닿음을 판정할 수 있다."
          },
          "steps": 2
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "‘mRNA를 감싼 지질’ 행에서 ㉠은 ‘없음’, ㉡은 ‘이온화 지질’로 다르다. pH가 같아도 보호 조건까지 같은 것은 아니다."
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
          "decisive_clause": "항체로 인식하고",
          "minimum_evidence": {
            "passage": "생물체는 바이러스 단백질을 항원으로 인식하고, 이에 대항하는 항체를 만든다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "바이러스 단백질은 항원으로 인식되는 대상이지 항체로 인식되는 대상이 아니므로 거짓이다."
          },
          "steps": 1
        },
        {
          "n": 2,
          "decisive_clause": "중성 수용액이겠군",
          "minimum_evidence": {
            "passage": "중성 수용액의 pH는 7이며, 산성 용액의 pH는 7보다 낮다.",
            "bogi": "㉯의 엔도솜 내부 pH는 6이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "부족한 관찰: ㉯의 엔도솜 내부 pH가 6이라는 값이 필요하다. ㉮보다 pH가 낮다는 선지의 상대적 정보만으로는 중성 여부를 확정할 수 없다."
          },
          "steps": 1
        },
        {
          "n": 3,
          "decisive_clause": "같은 방향으로 pH가 변하겠군",
          "minimum_evidence": {
            "passage": "엔도솜 내부의 산성화에 따라 mRNA가 방출된다. 반면 중성의 mRNA-지질 나노 입자 복합체는 낮은 pH에서 결합시킨 뒤 pH를 높여 만든다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "보기 관찰이 더 필요한 것은 아니지만, 방출을 일으키는 엔도솜 산성화와 중성 복합체 형성을 위한 pH 상승이라는 두 지문 관계를 함께 알아야 한다. 두 과정의 pH 변화 방향은 반대이다."
          },
          "steps": 2
        },
        {
          "n": 4,
          "decisive_clause": "지질이 mRNA의 세포 내 진입을 돕기 쉬워지겠군",
          "minimum_evidence": {
            "passage": "양이온성 지질은 mRNA의 세포 내 진입을 돕지만, 체내에서는 혈장 단백질이 지질에 흡착되어 mRNA의 세포막 투과가 제한된다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "혈장 단백질의 흡착이 세포막 투과를 제한하므로, 선지의 가정처럼 흡착이 줄면 그 제한이 완화되어 지질이 mRNA의 진입을 돕기 쉬워진다."
          },
          "steps": 1
        },
        {
          "n": 5,
          "decisive_clause": "물과 섞이지 않겠군",
          "minimum_evidence": {
            "passage": "물은 극성을 띠거나 분자가 전하를 띠는 친수성 물질과 섞인다.",
            "bogi": "두 시료의 물질 Q는 전기적으로 중성이지만 극성을 띤다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "부족한 관찰: Q가 극성을 띤다는 정보가 필요하다. 전기적으로 중성이라는 선지의 정보만으로는 물과 섞이는지 확정할 수 없다."
          },
          "steps": 1
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "mRNA 방출과 중성 복합체 형성에서 pH 변화 방향은 서로 반대이다. 전자는 산성화에 따른 하강이고 후자는 상승이다."
      },
      "valid_answers": [4],
      "weak": []
    }
  ]
}
```