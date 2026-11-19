## 판정 결과

| 문항 | ① | ② | ③ | ④ | ⑤ | 정답 |
|---|---|---|---|---|---|---|
| V1 | 참 | 참 | 거짓 | 참 | 참 | **③** |
| V2 | 참 | 참 | 참 | 참 | 거짓 | **⑤** |

- **V1 ③:** 이온화 지질 시료는 pH를 8로 높인 뒤 수용체에 결합했다. 이때 지질은 중성이므로 양이온성을 그대로 유지하지 않는다.
- **V2 ⑤:** E는 pH 8에서 중성 복합체가 되었고 수용체에도 결합했다. 따라서 지문에 제시된 내포 작용의 진입 조건을 갖추었다. 실제 내포 작용이 관찰되었다고까지 판단할 필요는 없다.

아래의 지름길 판정에서는 **선지에 적힌 원인이나 시료의 성질을 검증 없이 참으로 가정하지 않았다.** 또한 단계 수는 불필요한 우회 설명을 제외한 최소 판정 경로를 기준으로 했다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 3,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "같은 바이러스가 침입할 경우에 대비하는 역할",
          "minimum_evidence": {
            "passage": "기억 세포는 같은 바이러스가 침입할 경우에 대비하여 생성된다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지가 대상으로 삼은 것이 기억 세포이므로, 같은 바이러스의 재침입에 대비한다는 지문의 한 사실을 바로 적용하면 참이다."
          },
          "steps": 1
        },
        {
          "n": 2,
          "decisive_clause": "친수성을 띠어 물과 섞이지만, 세포막을 투과하는 데에는 제약을 받겠군.",
          "minimum_evidence": {
            "passage": "mRNA는 크고 음전하를 띠어 세포에 거의 흡수되지 않는다. 전하를 띤 물질은 친수성 물질이며 물과 섞인다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "추가 〈보기〉 관찰이 반드시 필요한 것은 아니지만, 한 사실만으로는 부족하다. mRNA의 음전하·흡수 곤란이라는 사실에 전하를 띤 물질의 친수성이라는 규칙을 추가해야 선지 전체가 입증된다."
          },
          "steps": 2
        },
        {
          "n": 3,
          "decisive_clause": "양이온성을 그대로 유지하겠군.",
          "minimum_evidence": {
            "passage": "높은 pH에서는 이온화 지질이 수소 이온을 적게 받아들여 전기적으로 중성이 된다.",
            "bogi": "이온화 지질 시료의 용액을 pH 8로 조정했고, 그 뒤 이 시료가 수용체에 결합했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "수용체에 결합하기 전에 시료의 pH가 8로 조정되었다는 관찰이 필요하다. 지문의 pH별 전하 규칙만으로는 이 시료의 결합 시점 전하를 정할 수 없다."
          },
          "steps": 2
        },
        {
          "n": 4,
          "decisive_clause": "전하 상태가 달랐지만, 혈장 단백질의 흡착에 따른 제약은 두 시료 모두 피했겠군.",
          "minimum_evidence": {
            "passage": "양이온성 지질에는 혈장 단백질이 흡착되어 mRNA의 세포막 투과를 제한할 수 있다. 높은 pH에서 이온화 지질은 중성이 되며 혈장 단백질이 흡착되지 않는다.",
            "bogi": "양이온성 지질 시료는 혈장 단백질이 없는 용액에서 세포 내부로 들어갔다. 이온화 지질 시료는 pH 8로 조정된 뒤 수용체에 결합했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "양이온성 지질 시료의 용액에는 혈장 단백질이 없었다는 관찰과, 이온화 지질 시료는 pH 8에서 세포막에 결합했다는 관찰이 모두 필요하다."
          },
          "steps": 5
        },
        {
          "n": 5,
          "decisive_clause": "그 사실만으로 바이러스 감염이라고 할 수는 없겠군.",
          "minimum_evidence": {
            "passage": "바이러스 단백질의 유전 정보를 암호화한 mRNA를 접종하는 것이 mRNA 백신이다. mRNA 백신은 바이러스가 아니므로 바이러스 감염의 위험 없이 바이러스 단백질 합성을 유도한다.",
            "bogi": "바이러스 단백질의 유전 정보를 암호화한 mRNA를 나누어 각각 양이온성 지질과 이온화 지질로 둘러쌌다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "두 시료에 담긴 것이 바이러스 자체가 아니라 해당 유전 정보를 암호화한 mRNA라는 관찰이 필요하다. mRNA 백신의 비감염성이라는 사실만으로는 지시 대상인 두 시료의 내용물까지 확인할 수 없다."
          },
          "steps": 2
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "양이온성 지질 시료가 들어간 용액에는 혈장 단백질이 없었다. 따라서 양전하를 띠더라도 혈장 단백질 흡착에 따른 제약은 없으므로 ④는 참이다."
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
          "decisive_clause": "세포에 흡수되기 어렵겠군.",
          "minimum_evidence": {
            "passage": "지질로 보호·전달하지 않은 mRNA는 분자의 크기가 크고 음전하를 띠어 세포에 거의 흡수되지 않는다.",
            "bogi": "A 열의 지질 나노 입자 재료는 '없음'이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "A에 지질 나노 입자가 없다는 관찰이 필요하다. mRNA의 크기와 음전하만으로는 A에서 지질에 의한 전달 보완이 이루어지는지까지 확인할 수 없다."
          },
          "steps": 1
        },
        {
          "n": 2,
          "decisive_clause": "전기적 반발력을 막겠군.",
          "minimum_evidence": {
            "passage": "음전하를 띤 mRNA를 양이온성 지질로 둘러싸면 음전하를 띤 세포막의 인산기 머리와 전기적으로 반발하는 것을 막을 수 있다.",
            "bogi": "B 열의 지질 나노 입자 재료는 '양이온성 지질'이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "B의 지질이 양이온성 지질이라는 관찰이 필요하다. 선지는 B의 지질 종류를 직접 제시하지 않는다."
          },
          "steps": 1
        },
        {
          "n": 3,
          "decisive_clause": "혈장 단백질이 지질에 흡착되어 mRNA가 세포막을 투과하는 데 제약을 받겠군.",
          "minimum_evidence": {
            "passage": "양이온성 지질에는 혈장 단백질이 흡착되어 mRNA의 세포막 투과를 제한한다.",
            "bogi": "B와 C의 pH는 모두 8이다. C의 지질 재료는 '양이온성 지질'이고 혈장 단백질은 '있음'이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "B와 C의 pH가 같다는 관찰, C가 양이온성 지질을 사용한다는 관찰, C에 혈장 단백질이 있다는 관찰이 필요하다."
          },
          "steps": 3
        },
        {
          "n": 4,
          "decisive_clause": "양이온성을 띠므로 mRNA와 결합할 수 있겠군.",
          "minimum_evidence": {
            "passage": "낮은 pH에서는 이온화 지질이 수소 이온을 많이 받아들여 양이온화된다. 낮은 pH에서 mRNA와 이온화 지질을 결합시킬 수 있다.",
            "bogi": "D의 지질 재료는 '이온화 지질'이고, 세포막 접촉 시점의 pH는 5이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "D가 이온화 지질 시료이며 접촉 시점에도 pH 5에 놓였다는 관찰이 필요하다. 수용체 결합이 없다는 사실은 mRNA와 지질의 결합 가능성을 부정하지 않는다."
          },
          "steps": 2
        },
        {
          "n": 5,
          "decisive_clause": "내포 작용이 시작되기 위한 조건을 아직 갖추지 못했겠군.",
          "minimum_evidence": {
            "passage": "높은 pH에서는 이온화 지질이 중성이 된다. 중성의 mRNA-지질 나노 입자 복합체는 세포막 수용체에 결합하여 내포 작용으로 세포 내부에 진입할 수 있다.",
            "bogi": "E의 지질 재료는 '이온화 지질', pH는 8, 세포막 수용체 결합은 '있음'이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "E의 pH가 8이고 수용체 결합이 있다는 관찰이 필요하다. 이 관찰들을 적용하면 중성 복합체가 이미 수용체에 결합했으므로, 진입 조건을 아직 갖추지 못했다는 선지는 거짓이다."
          },
          "steps": 2
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "수용체 결합 행에서 D는 '없음', E는 '있음'이다. ④의 mRNA-지질 결합 가능성과 ⑤의 수용체 결합 이후 내포 조건을 구별해야 한다."
      },
      "valid_answers": [
        5
      ],
      "weak": []
    }
  ]
}
```