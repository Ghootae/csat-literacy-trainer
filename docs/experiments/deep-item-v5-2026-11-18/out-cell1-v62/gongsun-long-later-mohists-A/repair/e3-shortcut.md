**V1 정답은 ②입니다.** 목록을 붙인 뒤에도 ‘여울’이 가리키는 작품은 ㉠ 하나뿐입니다. 후기 묵가는 지시 대상이 하나인 명을 사명으로 보므로, 목록이 붙은 뒤에도 ‘여울’은 사명입니다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "가장 많은 작품을 지시하는 명을 달명으로 보지는 않겠군",
          "minimum_evidence": {
            "passage": "[5문단] 달명은 천지 만물을 총괄하여 지시하는 명이다.",
            "bogi": "‘작품’ 칸은 4점, ‘도자기’ 칸은 3점, ‘손잡이 달린 도자기’ 칸은 2점을 지시한다. 목록에서 가장 많이 지시하는 ‘작품’도 천지 만물을 총괄하는 명은 아니다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "목록에서 가장 많은 작품을 지시하는 명이 무엇인지 알 수 없다. 목록 안에서 지시 대상이 가장 많다는 사실만으로는 그 명이 천지 만물을 총괄하는지 판정할 수 없다."
          },
          "steps": 3,
          "bogi_sources": 3,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "목록이 붙은 뒤에는 사명으로 보지 않겠군",
          "minimum_evidence": {
            "passage": "[5문단] 사명은 지시 대상이 오직 하나인 명이다.",
            "bogi": "‘여울’은 ㉠ 앞 카드의 제목이다. 담당자는 그 카드를 그대로 둔 채 목록을 붙였으므로, 목록이 붙은 뒤에도 ‘여울’이 가리키는 작품은 ㉠ 하나다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "목록이 붙은 뒤에도 ‘여울’이 ㉠ 하나만 가리키는지 확인해야 한다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "명을 통해 직원의 뜻이 동료에게 전해졌겠군",
          "minimum_evidence": {
            "passage": "[2문단] 공손룡에 따르면 명은 인간이 사상과 감정을 주고받게 하는 역할을 한다.",
            "bogi": "㉡ 앞 카드의 제목은 ‘노을’이다. 직원이 ‘노을’ 옆에 조명을 놓으라고 하자 동료는 그 제목이 가리키는 ㉡ 옆에 조명을 놓았다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "동료가 조명을 놓은 위치가 직원이 사용한 명이 가리키는 작품의 옆인지 확인해야 한다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "‘도자기’보다 외연이 작지만 두 명이 모두 지시하는 작품도 있겠군",
          "minimum_evidence": {
            "passage": "[4문단] 후기 묵가는 하나의 실이 두 명으로 지시될 수 있다고 본다. [5문단] 명의 외연은 그 명이 지시하는 실의 범위이다.",
            "bogi": "‘손잡이 달린 도자기’ 칸에는 ㉠·㉡, ‘도자기’ 칸에는 ㉠·㉡·㉢이 실려 있다. 지시 대상은 각각 2점과 3점이며, ㉠과 ㉡은 두 칸에 공통으로 실려 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "두 명이 각각 몇 작품을 가리키고 어느 작품을 공통으로 가리키는지 확인해야 한다."
          },
          "steps": 4,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "전시 목록이 붙기 전에도 서로 다른 세 개의 실이었겠군",
          "minimum_evidence": {
            "passage": "[2문단] 공손룡에게 실은 인간의 명명과 무관하게 분화되어 있는 각각의 개체이다.",
            "bogi": "목록을 붙이기 전부터 ㉠~㉣은 전시실에 놓여 있었다. 목록의 ‘도자기’ 칸에는 그중 ㉠·㉡·㉢의 사진이 실렸다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "‘도자기’ 칸에 실린 작품이 정확히 세 점이고, 그 작품들이 목록을 붙이기 전부터 놓여 있었는지 확인해야 한다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 1,
        "observation": "‘작품’ 칸이 포괄하는 것은 전시 작품 네 점이다. 전시 목록 안에서 가장 넓은 범위를 가진다는 것과 천지 만물을 총괄한다는 것은 다르므로 ①은 참이다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [2],
      "weak": []
    }
  ]
}
```