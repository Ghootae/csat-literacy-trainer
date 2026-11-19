**정답은 V1 ③, V2 ⑤입니다.**

- `one_fact_shortcut`은 선지에 제시된 **특정 시료의 관찰이 실제로 맞는지까지** 판정하는 기준으로 검토했습니다. 관찰을 사실이라고 가정해야만 설명이 성립하는 경우는 `false`로 처리했습니다.
- 표의 `bogi_sources`는 “한 열 안의 값 여러 개는 1”이라는 기준에 따라 **시료별 열 단위**로 셌습니다.
- V2 ⑤는 ‘거의 흡수되지 않는다’를 ‘절대로 투과할 수 없다’로 강화하지 않고, **뒤 절의 ‘내포 작용으로 들어갈 수 없다’**를 결정적 오류로 판정했습니다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 3,
      "choices": [
        {
          "n": 1,
          "verdict": "참",
          "decisive_clause": "지질 나노 입자가 mRNA를 보호한다는 설명에 들어맞겠군",
          "minimum_evidence": {
            "passage": "체내 효소에 의해 쉽게 분해되는 mRNA를 보호하고 세포 내로 진입시키기 위해 지질 나노 입자를 이용한다.",
            "bogi": "두 시료에서 각각 양이온성 지질과 이온화 지질이 mRNA를 감싸고 있었다는 문장. 체내 효소가 든 용액에서도 두 시료의 mRNA가 형태를 유지했다는 문장."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "두 시료에서 지질이 실제로 mRNA를 감쌌는지, 효소가 있는 조건에서도 mRNA가 형태를 유지했는지를 확인해야 한다."
          },
          "steps": 3,
          "step_basis": "지질로 감싼 시료와 효소 조건의 관찰을 연결하고, 형태 유지를 분해로부터의 보호로 해석한 다음, 지문의 보호 기능과 부합한다고 판단한다.",
          "bogi_sources": 2
        },
        {
          "n": 2,
          "verdict": "참",
          "decisive_clause": "인지질의 소수성 꼬리와도 잘 섞인다고 볼 수는 없겠군",
          "minimum_evidence": {
            "passage": "물은 친수성 물질과만 섞이고, 소수성 물질은 소수성 물질과만 섞인다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "친수성·소수성에 따른 혼합 규칙에 따르면, 물과 섞인다는 성질은 소수성 꼬리와도 잘 섞인다는 결론의 근거가 될 수 없다."
          },
          "steps": 2,
          "step_basis": "물과 고르게 섞인다는 표현을 친수성으로 해석하고, 친수성 물질과 소수성 물질의 혼합 규칙을 적용한다.",
          "bogi_sources": 0
        },
        {
          "n": 3,
          "verdict": "거짓",
          "decisive_clause": "㉡의 지질이 양이온성을 띠어",
          "minimum_evidence": {
            "passage": "이온화 지질은 높은 pH에서 전기적으로 중성이 된다. 중성의 mRNA-지질 나노 입자 복합체는 세포막 수용체에 결합하여 내포 작용으로 진입한다.",
            "bogi": "㉡에서 mRNA를 감싼 것은 이온화 지질이라는 문장. pH 7.4에서 ㉡이 세포막 수용체에 결합했다는 문장."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉡의 지질 종류와 수용체에 결합할 당시의 pH가 필요하다. 이온화 지질은 조건에 따라 양이온성일 수도, 중성일 수도 있다."
          },
          "steps": 2,
          "step_basis": "㉡의 지질 종류와 수용체 결합 당시의 pH를 연결하고, 높은 pH에서는 중성이라는 규칙을 적용한다.",
          "bogi_sources": 2
        },
        {
          "n": 4,
          "verdict": "참",
          "decisive_clause": "mRNA 자체의 음전하가 사라져서가 아니라, 양이온성 지질이 mRNA를 감싸기 때문",
          "minimum_evidence": {
            "passage": "음전하를 띤 mRNA가 양이온성 지질로 둘러싸이면, 음전하를 띤 세포막의 인산기 머리와 서로 반발하지 않는다.",
            "bogi": "㉠에서는 양이온성 지질이 mRNA를 감싸고 있었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉠이 실제로 양이온성 지질로 mRNA를 감싼 시료인지 확인해야 한다. 지문만으로는 ㉠의 구성을 알 수 없다."
          },
          "steps": 1,
          "step_basis": "㉠의 구성에 양이온성 지질의 전기적 반발 방지 원리를 바로 적용한다.",
          "bogi_sources": 1
        },
        {
          "n": 5,
          "verdict": "참",
          "decisive_clause": "기억 세포가 생성되고 같은 바이러스가 다시 침입할 때에 대비할 수 있겠군",
          "minimum_evidence": {
            "passage": "생물체는 바이러스 단백질을 항원으로 인식하고 기억 세포를 생성하여 같은 바이러스의 침입에 대비한다. mRNA 백신도 바이러스 단백질 합성과 기억 세포 생성을 통해 감염에 대비하게 한다.",
            "bogi": "㉡을 처리한 세포에서 바이러스 단백질이 검출되었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉡을 처리한 세포에서 바이러스 단백질이 실제로 검출되었는지 확인해야 한다."
          },
          "steps": 3,
          "step_basis": "검출된 바이러스 단백질을 항원으로 연결하고, 기억 세포 생성 및 같은 바이러스의 재침입 대비로 이어 간다.",
          "bogi_sources": 1
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "㉡이 수용체에 결합한 조건은 pH 7.4이다. 따라서 ③의 ㉡은 중성인 이온화 지질을 이용하는 경우이며, ④의 양이온성 지질에 의한 반발 방지 설명과 구별해야 한다."
      },
      "mirror_pair": {
        "exists": false
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
          "verdict": "참",
          "decisive_clause": "세포핵 속 DNA에서 새로 전사되는 단계를 거치지 않고 리보솜과 결합할 수",
          "minimum_evidence": {
            "passage": "mRNA는 세포질에서 리보솜을 통해 단백질 합성에 이용된다. 주입된 mRNA도 단백질 합성에 이용된다.",
            "bogi": "㉠ 열: 위치가 세포질이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉠의 mRNA가 리보솜과 결합할 수 있는 세포질에 놓였다는 관찰이 필요하다."
          },
          "steps": 1,
          "step_basis": "이미 세포질에 있는 mRNA에 리보솜을 통한 단백질 합성 원리를 바로 적용한다. 이미 존재하는 mRNA를 이용하므로 DNA에서 새로 전사할 필요는 없다.",
          "bogi_sources": 1
        },
        {
          "n": 2,
          "verdict": "참",
          "decisive_clause": "혈장 단백질이 지질에 흡착되어 mRNA가 세포막을 투과하는 데 제한을 받겠군",
          "minimum_evidence": {
            "passage": "체내에서는 양이온성 지질에 혈장 단백질이 흡착되어 mRNA의 세포막 투과가 제한된다.",
            "bogi": "㉡ 열: 양이온성 지질, 혈장, pH 7.4. ㉣ 열: pH 7.4."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉡의 지질 종류와 위치, 그리고 ㉡과 ㉣의 pH가 같은지를 확인해야 한다."
          },
          "steps": 3,
          "step_basis": "두 시료의 pH가 같음을 비교하고, 혈장에 놓인 양이온성 지질에 혈장 단백질이 흡착됨을 적용한 뒤, 그 결과를 mRNA 투과 제한으로 연결한다.",
          "bogi_sources": 2
        },
        {
          "n": 3,
          "verdict": "참",
          "decisive_clause": "㉣의 지질보다 수소 이온을 더 많이 받아 양이온화되겠군",
          "minimum_evidence": {
            "passage": "낮은 pH에서는 수소 이온 농도가 높아 이온화 지질이 양이온화되고, 높은 pH에서는 수소 이온을 적게 받아 중성이 된다.",
            "bogi": "㉢ 열: 이온화 지질, pH 4.0. ㉣ 열: 이온화 지질, pH 7.4."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "두 시료가 모두 이온화 지질을 사용한다는 사실과 두 시료의 pH 대소 관계가 필요하다."
          },
          "steps": 3,
          "step_basis": "두 pH를 비교하고, 더 낮은 pH를 더 많은 수소 이온 수용으로 연결한 뒤, 이를 양이온화로 연결한다.",
          "bogi_sources": 2
        },
        {
          "n": 4,
          "verdict": "참",
          "decisive_clause": "엔도솜 막이 불안정해진 뒤 mRNA가 엔도솜 밖의 세포질로 방출되겠군",
          "minimum_evidence": {
            "passage": "엔도솜 내부가 산성화되면 엔도솜 막이 불안정해져 mRNA가 세포질로 방출된다. pH 7보다 낮은 용액은 산성이다.",
            "bogi": "㉤ 열: 위치가 엔도솜 내부이고 pH가 5.0이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉤이 엔도솜 내부에 있으며 그 내부가 산성이라는 관찰이 필요하다."
          },
          "steps": 3,
          "step_basis": "pH 5.0을 산성 조건으로 해석하고, 산성 조건을 엔도솜 막의 불안정화에 연결한 뒤, mRNA의 세포질 방출로 연결한다.",
          "bogi_sources": 1
        },
        {
          "n": 5,
          "verdict": "거짓",
          "decisive_clause": "내포 작용으로 세포 안에 들어갈 수 없겠군",
          "minimum_evidence": {
            "passage": "높은 pH에서 중성이 된 mRNA-지질 나노 입자 복합체는 세포막 수용체에 결합하여 내포 작용으로 세포 내부에 진입할 수 있다.",
            "bogi": "㉣ 열: 이온화 지질, pH 7.4, 세포막 수용체 결합 있음."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉣의 복합체가 중성 조건에 있고 세포막 수용체에 결합했다는 관찰이 필요하다. 또한 mRNA가 세포에 거의 흡수되지 않는다는 지문만으로 앞 절의 가능성을 절대적으로 부정해서는 안 된다."
          },
          "steps": 3,
          "step_basis": "㉣의 이온화 지질이 pH 7.4에서 중성임을 판단하고, 수용체 결합 관찰과 연결한 뒤, 내포 작용에 의한 진입 가능성을 적용하여 뒤 절을 반박한다.",
          "bogi_sources": 1
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "㉣의 세포막 수용체 결합은 '있음'이다. 이 관찰은 ⑤의 내포 작용 불가 주장을 반박한다. ④의 엔도솜 막 불안정화는 세포 진입 이후의 방출 과정이므로 구별해야 한다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [
        5
      ],
      "weak": []
    }
  ]
}
```