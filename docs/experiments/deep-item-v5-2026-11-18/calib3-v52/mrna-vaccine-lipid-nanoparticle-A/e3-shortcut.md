## 판정 결과

| 문항 | ① | ② | ③ | ④ | ⑤ | 정답 |
|---|---|---|---|---|---|---|
| V1 | 참 | 참 | **거짓** | 참 | 참 | **③** |
| V2 | 참 | 참 | 참 | 참 | **거짓** | **⑤** |

- **V1:** 수용체에 결합한 이온화 지질 시료는 이미 pH가 8로 조정되었으므로 양이온성을 그대로 유지하지 않는다.
- **V2:** E는 낮은 pH에서 복합체를 형성했고, pH 8에서 수용체에도 결합했다. 따라서 내포 작용이 시작되기 위한 조건을 갖추지 못했다는 설명은 거짓이다.

관찰 수는 **표의 같은 시료 열에 있는 여러 값은 1개**, 서로 다른 시료 열과 표 밖의 서로 다른 문장은 각각 별개로 계산했다. 또한 **〈보기〉가 불필요한 것과 지문 한 사실만으로 판단되는 것은 구별**했다.

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
            "passage": "1문단: 기억 세포는 같은 바이러스가 다시 침입할 경우에 대비하도록 생성된다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "기억 세포가 같은 바이러스의 재침입에 대비한다는 지문의 한 사실이 선지의 설명과 일치한다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 2,
          "decisive_clause": "세포막을 투과하는 데에는 제약을 받겠군",
          "minimum_evidence": {
            "passage": "2문단: mRNA는 음전하를 띠며 세포에 거의 흡수되지 않는 문제가 있다. 3문단: 전하를 띠는 물질은 친수성 물질이며 물과 섞인다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "〈보기〉 관찰은 필요 없지만, mRNA의 음전하·흡수 제약에 관한 사실과 전하를 띤 물질의 친수성·물과의 혼합에 관한 사실을 함께 사용해야 한다."
          },
          "steps": 2,
          "bogi_sources": 0
        },
        {
          "n": 3,
          "decisive_clause": "양이온성을 그대로 유지하겠군",
          "minimum_evidence": {
            "passage": "5문단: 높은 pH에서 이온화 지질은 전기적으로 중성이 된다.",
            "bogi": "시설은 이온화 지질 시료의 pH를 8로 조정했다. 그 뒤 이 시료가 세포막의 수용체에 결합했다. 따라서 수용체 결합 시점의 지질은 중성이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "수용체에 결합할 때의 pH가 필요하다. 선지 문장만으로는 결합 시점에 높은 pH였는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2
        },
        {
          "n": 4,
          "decisive_clause": "혈장 단백질의 흡착에 따른 제약은 두 시료 모두 피했겠군",
          "minimum_evidence": {
            "passage": "4문단: 양이온성 지질에는 혈장 단백질이 흡착되어 mRNA의 세포막 투과를 제한할 수 있다. 5문단: 높은 pH의 이온화 지질은 중성이며, 중성인 이온화 지질에는 혈장 단백질이 흡착되지 않는다.",
            "bogi": "양이온성 지질 시료는 혈장 단백질이 없는 용액에서 세포 내부로 들어갔다. 이온화 지질 시료는 pH가 8로 조정되었고, 그 뒤 수용체에 결합했다. 전자는 양이온성, 후자는 중성이지만, 전자는 단백질 부재로, 후자는 중성으로 인해 흡착 제약을 피한다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "양이온성 지질 시료의 혈장 단백질 유무와 이온화 지질 시료의 접촉 시점 pH가 모두 필요하다."
          },
          "steps": 6,
          "bogi_sources": 3
        },
        {
          "n": 5,
          "decisive_clause": "그 사실만으로 바이러스 감염이라고 할 수는 없겠군",
          "minimum_evidence": {
            "passage": "2문단: 바이러스 단백질의 유전 정보를 암호화한 mRNA를 접종하는 것이 mRNA 백신이다. mRNA 백신은 바이러스 자체가 아니며, 주입된 mRNA에 따른 바이러스 단백질 합성으로 면역 반응을 유도한다.",
            "bogi": "물에 섞여 있던 것은 바이러스 단백질의 유전 정보를 암호화한 mRNA였다. 시설은 그 mRNA를 나누어 각각 양이온성 지질과 이온화 지질로 둘러쌌다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "선지는 두 지질 시료의 내용물을 mRNA라고 직접 밝히지 않으므로, 두 시료가 바이러스 자체가 아니라 해당 mRNA를 담았다는 관찰이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "양이온성 지질 시료가 들어간 용액에는 혈장 단백질이 없었다. 따라서 양이온성이라는 이유만으로 ④의 흡착 제약 회피를 부정해서는 안 된다."
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
          "decisive_clause": "세포에 흡수되기 어렵겠군",
          "minimum_evidence": {
            "passage": "2문단: mRNA는 분자의 크기가 크고 음전하를 띠어 세포에 거의 흡수되지 않는 문제가 있다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지는 A의 mRNA 자체가 지닌 흡수상의 어려움을 설명하며, 이는 지문에 제시된 mRNA의 일반적 성질과 일치한다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 2,
          "decisive_clause": "전기적 반발력을 막겠군",
          "minimum_evidence": {
            "passage": "4문단: 음전하를 띤 mRNA를 양이온성 지질로 둘러싸면 음전하를 띤 세포막의 인산기 머리와 전기적으로 반발하는 것을 막을 수 있다.",
            "bogi": "B열의 지질 나노 입자 재료는 양이온성 지질이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "B의 지질이 양이온성 지질이라는 관찰이 필요하다. 선지 문장에는 B의 지질 종류나 전하 상태가 직접 제시되지 않았다."
          },
          "steps": 1,
          "bogi_sources": 1
        },
        {
          "n": 3,
          "decisive_clause": "mRNA가 세포막을 투과하는 데 제약을 받겠군",
          "minimum_evidence": {
            "passage": "4문단: 양이온성 지질에 혈장 단백질이 흡착되면 mRNA의 세포막 투과가 제한된다.",
            "bogi": "B열과 C열의 pH는 모두 8이다. C열의 재료는 양이온성 지질이고 혈장 단백질은 있음이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "B와 C의 pH가 같다는 비교 관찰, 그리고 C가 양이온성 지질이며 혈장 단백질이 존재한다는 관찰이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2
        },
        {
          "n": 4,
          "decisive_clause": "mRNA와 결합할 수 있겠군",
          "minimum_evidence": {
            "passage": "5문단: 낮은 pH에서는 이온화 지질이 수소 이온을 받아들여 양이온화되며, 이러한 조건에서 mRNA와 이온화 지질을 결합시킬 수 있다.",
            "bogi": "D열의 재료는 이온화 지질이고, 세포막에 접촉했을 때 용액의 pH는 5이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "D가 이온화 지질 시료이며 접촉 시점에도 pH가 5라는 관찰이 필요하다."
          },
          "steps": 2,
          "bogi_sources": 1
        },
        {
          "n": 5,
          "decisive_clause": "조건을 아직 갖추지 못했겠군",
          "minimum_evidence": {
            "passage": "5문단: 낮은 pH에서 mRNA와 이온화 지질을 결합한 뒤 pH를 높이면 중성 복합체를 만들 수 있다. 이 복합체는 세포막 수용체에 결합하여 내포 작용으로 세포 내부에 진입할 수 있다.",
            "bogi": "표 밖의 문장: 이온화 지질 시료에서는 모두 mRNA와 이온화 지질이 pH 5에서 결합했다. E열: 재료는 이온화 지질, 접촉 시점 pH는 8, 세포막 수용체 결합은 있음이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "E가 낮은 pH에서 복합체를 형성한 뒤 높은 pH에 놓였고, 이미 수용체에 결합했다는 관찰이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "E의 세포막 수용체 결합 칸이 있음이다. ④는 D의 mRNA 결합 가능성을 말할 뿐이며, 내포 작용의 조건을 아직 갖추지 못했다고 잘못 설명한 것은 ⑤이다."
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