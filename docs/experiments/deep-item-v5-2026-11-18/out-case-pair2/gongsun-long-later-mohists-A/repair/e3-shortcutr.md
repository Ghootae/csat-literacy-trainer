**V1 정답은 ②입니다.** 첫 요청의 ‘여울’은 실제로 벽에 건 탈을 가리키지만, 두 번째 요청의 ‘여울’은 문맥상 확대할 이름표 글자를 가리킵니다. ②가 비교하는 것은 **두 번째 요청의 ‘여울’**과 **목록에서 탈을 가리키는 ‘마루’**이므로, 이 두 쓰임을 근거로 하나의 실에 두 명이 대응한다고 볼 수 없습니다.

⑤의 판단 범위는 전시장에서 쓰인 이름 전체가 아니라 **목록 안**입니다. 목록에서는 두 탈의 사진이 서로 다른 줄에 있고 각 줄에 명을 하나씩 적었으므로, 선지에 제시된 기준에 맞습니다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "서로 다른 명을 붙여서 두 탈이 별개의 실이 된 것은 아니",
          "minimum_evidence": {
            "passage": "2문단: 실은 인간과 무관하게 분화되어 있고, 인간이 붙이는 명은 그 실을 지시한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "실의 분화는 인간과 무관하므로, 인간이 명을 붙이는 행위가 두 실을 별개로 만든 것은 아니다."
          },
          "steps": 1,
          "bogi_sources": 0,
          "task": "내용 확인",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "두 명의 쓰임이 명과 실의 일대일 대응에 어긋난다",
          "minimum_evidence": {
            "passage": "2문단: 공손룡은 하나의 실이 하나의 명으로만 지시되어야 하고, 하나의 명도 하나의 실만 지시해야 한다고 본다.",
            "bogi": "‘마루’가 적힌 줄의 사진은 갑이 벽에 건 탈을 가리킨다. 두 번째 요청 뒤에는 탈을 그대로 두고 이름표 글자만 키웠으며, 을은 그 이름표를 붙였다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "일대일 대응 원칙만으로는 두 번째 요청의 ‘여울’과 목록의 ‘마루’가 각각 무엇을 가리키는지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "‘여울’이라는 명으로 갑에게 뜻을 전했다",
          "minimum_evidence": {
            "passage": "2문단: 공손룡은 명이 인간 사이에서 사상과 감정을 주고받게 하는 역할을 한다고 본다.",
            "bogi": "을이 첫 요청에서 ‘여울’을 걸어 달라고 하자 갑이 탈을 걸었고, 을은 갑이 건 그 탈을 고정했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "명의 전달 기능만으로는 을이 첫 요청에 실제로 ‘여울’을 썼고 그 요청이 갑에게 전달되었는지 확인할 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "두 명으로 그 탈을 지시할 수 있다",
          "minimum_evidence": {
            "passage": "4문단: 후기 묵가는 하나의 실이 서로 다른 두 명으로 지시될 수 있다고 본다.",
            "bogi": "을이 ‘여울’을 걸어 달라고 하자 갑은 ‘마루’가 적힌 줄의 사진 속 탈을 걸었고, 을은 그 탈을 고정했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "후기 묵가가 두 명의 지시를 허용한다는 사실만으로는 첫 요청의 ‘여울’과 목록의 ‘마루’가 실제로 같은 탈을 가리키는지 확인할 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "이 목록은 한 실을 명 하나로만 지시해야 한다는 공손룡의 기준에 맞다",
          "minimum_evidence": {
            "passage": "2문단: 공손룡은 어떤 실이 그것을 가리키는 하나의 명으로만 지시되어야 한다고 본다.",
            "bogi": "서로 다른 두 탈의 사진이 한 줄에 한 장씩 들어 있고, 두 줄의 이름 칸에는 ‘마루’와 ‘누리’가 각각 하나씩 적혀 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "사진마다 명이 하나라는 진술만으로는 같은 탈이 여러 사진에 중복되어 서로 다른 명으로 적혔는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "두 번째 요청 뒤에는 탈을 그대로 두고 이름표 글자만 키웠다. ②의 ‘여울’은 글자를 가리키는 반면, ③은 첫 요청에서 ‘여울’로 탈을 걸어 달라는 뜻을 전한 경우를 다룬다."
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