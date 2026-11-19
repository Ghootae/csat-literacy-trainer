**정답은 V1 ③, V2 ④이다.**

- **V1 ③:** ㉣의 내부 pH가 5가 되면 산성화로 엔도솜 막이 불안정해지고, 방출된 mRNA가 세포질에서 리보솜과 결합할 수 있다.
- **V2 ④:** 세포 내에서 검출된 mRNA는 세포질과 엔도솜 내부의 양을 합해야 한다. ㉮는 \(60+40=100\), ㉯는 \(20+80=100\)으로 같다.

관찰원은 V1에서는 **변수 행별**, V2에서는 **서로 다른 문장별**로 세었다. 같은 문장에 제시된 여러 수치는 관찰원 하나로 세되, 합산·비교 등의 추론 단계는 구분했다. V1 ③의 단계는 ‘위치와 변경 조건 연결 → 산성 판정 → 막 불안정 → 방출 → 리보솜 결합’의 5단계이다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 3,
      "choices": [
        {
          "n": 1,
          "judgment": "거짓",
          "decisive_clause": "먼저 접종자의 DNA에서 전사되어야 하겠군",
          "minimum_evidence": {
            "passage": "mRNA 백신은 바이러스 단백질의 유전 정보를 암호화한 mRNA를 접종하며, 주입된 mRNA를 통해 바이러스 단백질을 합성한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "백신으로 주입된 mRNA 자체를 단백질 합성에 사용하므로, 접종자의 DNA에서 먼저 전사되어야 한다는 주장은 거짓이다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 2,
          "judgment": "거짓",
          "decisive_clause": "체내 효소로부터 mRNA를 보호하는 효과도 같겠군",
          "minimum_evidence": {
            "passage": "mRNA는 체내 효소에 의해 쉽게 분해되므로, mRNA를 보호하기 위해 지질 나노 입자를 이용한다.",
            "bogi": "‘mRNA를 감싼 지질’ 행: ㉠은 없음, ㉡은 이온화 지질이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉠과 ㉡에서 mRNA를 감싼 지질의 유무가 다르다는 관찰이 필요하다. pH가 같다는 조건만으로 보호 효과의 동일 여부는 확정할 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1
        },
        {
          "n": 3,
          "judgment": "참",
          "decisive_clause": "mRNA가 엔도솜 밖에서 리보솜과 결합할 수 있겠군",
          "minimum_evidence": {
            "passage": "pH가 7보다 낮으면 산성이다. 엔도솜 내부가 산성화되면 엔도솜 막이 불안정해져 mRNA가 세포질로 방출되고, 방출된 mRNA는 리보솜과 결합한다.",
            "bogi": "‘mRNA의 위치’ 행: ㉣은 엔도솜 내부이다. ‘용액의 pH’ 행: ㉠은 5이므로, 선지의 조건에서는 ㉣의 엔도솜 내부 pH도 5가 된다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉠의 pH가 5이고 ㉣의 mRNA가 엔도솜 내부에 있다는 관찰이 필요하다."
          },
          "steps": 5,
          "bogi_sources": 2
        },
        {
          "n": 4,
          "judgment": "거짓",
          "decisive_clause": "mRNA를 감싼 이온화 지질이 펼쳐져 만들어졌겠군",
          "minimum_evidence": {
            "passage": "엔도솜 막은 세포막에서 유래한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "엔도솜 막의 기원은 세포막이므로, mRNA를 감싼 이온화 지질이 펼쳐져 만들어졌다는 설명은 거짓이다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 5,
          "judgment": "거짓",
          "decisive_clause": "소수성 꼬리가 mRNA와 맞닿겠군",
          "minimum_evidence": {
            "passage": "세포막에서 인지질의 친수성 머리는 세포 외부나 세포질의 수용액에 접하고, 소수성 꼬리는 서로 몰려 있다.",
            "bogi": "‘mRNA의 위치’ 행: ㉢은 세포막 바깥면에 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉢의 mRNA가 세포막 바깥면에 있다는 위치 관찰이 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "‘mRNA를 감싼 지질’ 행에서 ㉠은 지질이 없고 ㉡은 이온화 지질로 감싸져 있다. 이 차이 때문에 pH가 같더라도 보호 효과가 같다고 할 수 없다."
      },
      "mirror_pair": {
        "exists": false
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
          "judgment": "거짓",
          "decisive_clause": "그 단백질을 항체로 인식하고",
          "minimum_evidence": {
            "passage": "생물체는 바이러스 단백질을 항원으로 인식하고 항체를 만들어 대항한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "바이러스 단백질은 항체가 아니라 항원으로 인식된다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 2,
          "judgment": "거짓",
          "decisive_clause": "중성 수용액이겠군",
          "minimum_evidence": {
            "passage": "중성 수용액의 pH는 7이며, 산성 용액의 pH는 7보다 낮다.",
            "bogi": "㉯의 일부 mRNA가 들어 있는 엔도솜 내부의 pH는 6이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉯의 엔도솜 내부 pH가 6이라는 관찰이 필요하다. 다른 용액보다 pH가 낮다는 비교만으로 산성인지 중성인지 확정할 수 없다."
          },
          "steps": 1,
          "bogi_sources": 1
        },
        {
          "n": 3,
          "judgment": "거짓",
          "decisive_clause": "세포 내에서 검출된 mRNA의 양도 더 적겠군",
          "minimum_evidence": {
            "passage": "엔도솜은 세포질 안에 형성되므로, 엔도솜 내부의 mRNA도 세포 내 mRNA에 포함된다.",
            "bogi": "mRNA가 검출된 곳은 세포질과 엔도솜 내부이며, 두 곳의 양은 ㉮가 각각 60과 40, ㉯가 각각 20과 80이다. 따라서 세포 내 검출량은 각각 100으로 같다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "두 시료의 세포질 및 엔도솜 내부 검출량이 필요하다. 세포질의 양이 적다는 사실만으로 세포 내 총검출량도 적다고 판정할 수 없다."
          },
          "steps": 4,
          "bogi_sources": 1
        },
        {
          "n": 4,
          "judgment": "참",
          "decisive_clause": "세포 내에서 검출된 mRNA의 양은 ㉮와 같겠군",
          "minimum_evidence": {
            "passage": "엔도솜은 세포질 안에 형성되므로, 세포질과 엔도솜 내부에서 검출된 mRNA를 모두 세포 내 검출량에 포함해야 한다.",
            "bogi": "mRNA가 검출된 두 곳의 양은 ㉮가 세포질 60과 엔도솜 내부 40, ㉯가 세포질 20과 엔도솜 내부 80이다. 합계는 각각 100으로 같다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "두 시료의 세포질 및 엔도솜 내부 검출량이 필요하다. 혈장 단백질 흡착에 관한 지문 사실만으로 두 시료의 실제 총검출량이 같은지 확정할 수 없다."
          },
          "steps": 4,
          "bogi_sources": 1
        },
        {
          "n": 5,
          "judgment": "거짓",
          "decisive_clause": "수용액에서 물과 섞이지 않겠군",
          "minimum_evidence": {
            "passage": "극성을 띠는 물질은 친수성 물질이며 물과 섞인다. 분자가 전하를 띠는 것만이 친수성의 조건은 아니다.",
            "bogi": "두 시료의 수용액에 있는 Q는 전기적으로 중성이면서 극성을 띤다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "Q가 극성을 띤다는 관찰이 필요하다. 전기적으로 중성이라는 사실만으로 물과 섞이는지 판정할 수 없다."
          },
          "steps": 1,
          "bogi_sources": 1
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "검출량 자료에서 ㉮는 60+40=100, ㉯는 20+80=100이다. 세포질만 비교하면 ㉯가 적지만, 엔도솜 내부까지 포함한 세포 내 총검출량은 같다."
      },
      "mirror_pair": {
        "exists": true,
        "choices": [3, 4],
        "why": "동일한 두 시료의 세포 내 mRNA 검출량을 비교하면서, ③은 ㉯가 더 적다고 하고 ④는 ㉮와 같다고 한다."
      },
      "valid_answers": [4],
      "weak": []
    }
  ]
}
```