**정답은 ②입니다.** ㉠에서 ‘별’은 ◇가 새겨진 접시를, ‘달’은 ○가 새겨진 접시를 가리킵니다. 접시 하나에는 표식이 하나씩만 새겨져 있으므로 두 이름의 지시 대상은 서로 다릅니다. 공손룡의 일대일 대응 원칙을 어겼다는 결론에 앞서, ‘같은 실을 두 명으로 지시했다’는 전제부터 틀렸습니다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "‘달’이라는 명으로 의사소통했다",
          "minimum_evidence": {
            "passage": "2문단: 명은 실을 지시하며, 인간이 사상과 감정을 주고받게 한다.",
            "bogi": "표식은 접시마다 다르다. ㉠에서 직원은 ‘달’이라 말하며 ○ 접시를 칠했고, 마지막 문장에서 보조 직원은 ‘달’을 포장해 달라는 요청에 ○ 접시를 포장했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉠의 ‘달’이 가리킨 접시와 보조 직원이 포장한 접시가 모두 ○ 접시인지 확인해야 한다."
          },
          "steps": 4,
          "bogi_sources": 3,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "같은 실을 ‘별’과 ‘달’이라는 두 명으로 지시했으므로",
          "minimum_evidence": {
            "passage": "",
            "bogi": "접시 하나에는 표식이 하나만 새겨져 있다. ㉠에서 ‘별’의 지시 대상에는 ◇가, ‘달’의 지시 대상에는 ○가 새겨져 있으므로 지시 대상은 서로 다른 접시다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "공손룡의 일대일 대응 원칙만으로는 ㉠의 ‘별’과 ‘달’이 실제로 같은 접시를 가리켰는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "내용 확인",
          "bogi_only": true
        },
        {
          "n": 3,
          "decisive_clause": "‘해’와 ‘구름’이라는 두 명으로 그 접시를 지시할 수 있다",
          "minimum_evidence": {
            "passage": "4문단: 후기 묵가는 하나의 실이 서로 다른 두 명으로 지시될 수 있다고 보았다.",
            "bogi": "표식은 접시마다 다르다. ㉡에서 ‘해’를 닦을 때와 ‘구름’을 칠할 때의 표식은 모두 △이므로 두 말의 지시 대상은 한 접시다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "후기 묵가가 한 실에 두 명을 허용한다는 사실만으로는 ㉡의 두 말이 실제로 한 접시를 가리켰는지 알 수 없다."
          },
          "steps": 4,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "명을 달리 붙였다고 해서 별개의 실이 생긴 것은 아니라고",
          "minimum_evidence": {
            "passage": "2문단: 실은 인간과 무관하게 분화된 개체이고, 인간이 붙인 명은 그 실을 지시한다.",
            "bogi": "표식은 접시마다 다르다. ㉡에서 ‘해’와 ‘구름’이 가리키는 접시의 표식은 모두 △여서, 이름은 달라도 접시는 동일하다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "실이 명과 무관하게 분화된다는 사실로 일반 원칙은 확인되지만, ㉡에서 직원이 실제로 같은 접시를 두 명으로 불렀는지는 확인할 수 없다."
          },
          "steps": 4,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "‘달’과 ‘별’이라는 명으로 서로 다른 두 실을 구별했다",
          "minimum_evidence": {
            "passage": "2문단: 공손룡에 따르면 명은 실들 사이의 다름을 구별하여 확정한다.",
            "bogi": "접시에는 표식이 하나씩 있고 표식은 접시마다 다르다. ㉠에서 ‘달’은 ○ 접시, ‘별’은 닦은 ◇ 접시를 가리킨다. 마지막 문장에서 포장한 접시는 ○ 접시이므로 ㉠의 ‘달’과 같은 대상을 가리키며, 닦은 ◇ 접시와는 다르다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "포장한 접시가 ㉠의 ‘달’에 해당하는지, 그리고 그 접시와 ㉠에서 닦은 ‘별’의 접시가 서로 다른지 확인해야 한다."
          },
          "steps": 5,
          "bogi_sources": 3,
          "task": "짝짓기",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "두 이름 아래 기록된 표식은 ②가 다루는 ㉠에서는 ◇·○로 다르고, ④가 다루는 ㉡에서는 △·△로 같다. 공손룡이 한 실에 두 명을 붙이는 데 반대한다고 해서, 명을 달리 붙이는 행위가 새 실을 만들어 낸다고 보는 것은 아니다."
      },
      "mirror_pair": {
        "exists": true,
        "choices": [2, 5],
        "why": "⑤에서 포장한 ○ 접시는 ㉠에서 ‘달’이라 부른 바로 그 접시다. 따라서 두 선지는 같은 ‘별’과 ‘달’의 지시 대상을 비교하며, ②는 같은 실이라고, ⑤는 서로 다른 두 실이라고 판단한다."
      },
      "valid_answers": [2],
      "weak": []
    }
  ]
}
```