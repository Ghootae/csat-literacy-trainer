**정답은 ④입니다.** 세포 내에서 검출된 mRNA의 총량은 세포질과 엔도솜 내부의 양을 합한 값이므로, ㉮와 ㉯ 모두 **100**입니다. ㉯의 세포질 mRNA가 더 적다는 사실만으로 세포 내 총량도 더 적다고 판단하면 안 됩니다.

③·④의 추론 단계는 **세포 내 범위 확인 → 두 구획의 양 합산 → 두 시료 비교**의 3단계로 셌습니다.

```json
{
  "items": [
    {
      "version": "V2",
      "answer": 4,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "그 단백질을 항체로 인식하고",
          "minimum_evidence": {
            "passage": "생물체는 바이러스 단백질을 항원으로 인식하고, 이에 대항하는 항체를 만든다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "바이러스 단백질은 항체가 아니라 항원으로 인식된다는 지문의 사실만으로 거짓임을 판정할 수 있다."
          },
          "steps": 1
        },
        {
          "n": 2,
          "decisive_clause": "중성 수용액이겠군",
          "minimum_evidence": {
            "passage": "중성 수용액의 pH는 7이며, pH가 7보다 낮으면 산성이다.",
            "bogi": "㉯의 엔도솜 내부 pH는 6이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "선지에는 실제 pH가 제시되지 않는다. ㉯의 엔도솜 내부 pH가 6이라는 관찰이 있어야 중성이 아니라 산성임을 확정할 수 있다."
          },
          "steps": 1
        },
        {
          "n": 3,
          "decisive_clause": "세포 내에서 검출된 mRNA의 양도 더 적겠군",
          "minimum_evidence": {
            "passage": "내포 작용으로 세포질 안에 엔도솜이 형성되므로, 엔도솜 내부에 있는 mRNA도 세포 내부에 있다.",
            "bogi": "mRNA의 검출 장소는 세포질과 엔도솜 내부이다. 두 곳의 양은 ㉮가 각각 60과 40, ㉯가 각각 20과 80이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "세포질의 양만으로는 세포 내 총량을 알 수 없다. 두 시료의 세포질 및 엔도솜 내부 측정값을 합산하여 비교해야 한다."
          },
          "steps": 3
        },
        {
          "n": 4,
          "decisive_clause": "세포 내에서 검출된 mRNA의 양은 ㉮와 같겠군",
          "minimum_evidence": {
            "passage": "내포 작용으로 세포질 안에 엔도솜이 형성되므로, 엔도솜 내부에 있는 mRNA도 세포 내부에 있다.",
            "bogi": "mRNA의 검출 장소는 세포질과 엔도솜 내부이다. 두 곳의 양은 ㉮가 각각 60과 40, ㉯가 각각 20과 80이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "혈장 단백질의 흡착이 세포막 투과를 제한한다는 지문만으로 두 시료의 세포 내 검출량이 같은지는 알 수 없다. 두 시료의 두 구획 측정값이 필요하다."
          },
          "steps": 3
        },
        {
          "n": 5,
          "decisive_clause": "물과 섞이지 않겠군",
          "minimum_evidence": {
            "passage": "극성을 띠거나 전하를 띠는 물질은 친수성 물질로, 물과 섞인다.",
            "bogi": "두 시료의 물질 Q는 극성을 띤다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "전기적으로 중성이라는 사실만으로는 극성 여부를 알 수 없다. Q가 극성을 띤다는 관찰이 있어야 물과 섞인다고 확정할 수 있다."
          },
          "steps": 1
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "㉯는 세포질의 mRNA만 적을 뿐이다. 세포 내 총량은 ㉮가 60+40=100, ㉯가 20+80=100으로 같다."
      },
      "valid_answers": [
        4
      ],
      "weak": []
    }
  ]
}
```