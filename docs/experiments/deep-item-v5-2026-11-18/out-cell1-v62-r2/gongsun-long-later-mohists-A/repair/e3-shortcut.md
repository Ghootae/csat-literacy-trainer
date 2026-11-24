**V1 정답: ②.** 후기 묵가에게 ‘등잔’이 사명인지는 단어 자체가 아니라 그 쓰임에서 가리키는 대상의 수로 결정된다. 안내 화면의 ‘등잔’은 두 점을 가리키지만, 정비 일지의 ‘등잔’은 받침을 바꾼 푸른 등잔 한 점만 가리킨다. 따라서 일지의 ‘새벽’과 ‘등잔’은 둘 다 사명이다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "‘새벽’이라는 명을 붙이기 전에도 두 등잔은 서로 다른 실이었겠군.",
          "minimum_evidence": {
            "passage": "2문단: 실은 인간이 명을 붙이는 일과 무관하게 분화되어 있는 각각의 개체이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지가 전제한 '두 등잔'은 별개의 두 개체이므로, 명을 붙이기 전에도 서로 다른 실이다."
          },
          "steps": 1,
          "bogi_sources": 0,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "‘등잔’은 사명이 아니겠군.",
          "minimum_evidence": {
            "passage": "5문단: 후기 묵가에게 가리키는 대상이 오직 하나인 명은 사명이며, 유명을 특정 개체 하나에만 대응시켜 쓸 때도 사명이 된다.",
            "bogi": "셋째 문장: 갑은 푸른 등잔에만 새 받침을 달고 그 일을 '등잔의 받침을 바꾸었다.'라고 기록했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "사명의 정의만으로는 일지 속 '등잔'이 한 점을 가리키는지 여러 점을 가리키는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "‘등잔’과 ‘새벽’을 쓴 방식은 그 원칙에 어긋나겠군.",
          "minimum_evidence": {
            "passage": "2문단: 공손룡은 하나의 실이 하나의 명으로만 지시되어야 한다고 보았다.",
            "bogi": "첫째 문장: '새벽'은 푸른 등잔의 고유명사이다. 셋째 문장: 갑은 푸른 등잔에만 새 받침을 달고 '등잔의 받침을 바꾸었다.'라고 썼다. 넷째 문장: 갑은 '새벽의 받침을 점검할 것.'이라고 덧붙였다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "명칭이 두 개 쓰였다는 사실만으로는 원칙 위반이 아니다. 두 명이 동일한 실을 지시하는지 확인해야 한다."
          },
          "steps": 4,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "‘등잔’의 외연은 ‘기증품’의 외연을 포함하며 그보다 넓겠군.",
          "minimum_evidence": {
            "passage": "4~5문단: 후기 묵가는 하나의 명이 여러 실을 지시할 수 있다고 보며, 명의 외연은 그 명이 지시하는 대상의 범위이다.",
            "bogi": "둘째 문장의 두 버튼별 관찰: '등잔'을 누르면 푸른 등잔과 누런 등잔이 모두 뜨고, '기증품'을 누르면 누런 등잔만 뜬다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "한 명이 여러 실을 지시할 수 있다는 사실만으로는 화면의 두 이름이 각각 어느 등잔을 지시하는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "‘새벽’이라는 명으로 두 실을 구별했겠군.",
          "minimum_evidence": {
            "passage": "",
            "bogi": "첫째 문장: 두 등잔 중 푸른 등잔에 '새벽'이라는 이름을 붙였다. 넷째 문장: 지시에는 '새벽의 받침을 점검할 것.'이라고 적혔다. 다섯째 문장: 을은 그 일지를 읽고 푸른 등잔의 받침을 점검했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "명이 실을 구별하는 기능이 있다는 사실만으로는 을이 '새벽'을 읽고 어느 등잔을 골랐는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 3,
          "task": "짝짓기",
          "bogi_only": true
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "갑은 푸른 등잔에만 새 받침을 달고 그 일을 '등잔의 받침을 바꾸었다.'라고 기록했다. 따라서 일지의 '등잔'은 한 점만 가리키므로 ②는 거짓이고, 그 한 점을 '새벽'으로도 지시했으므로 ③은 참이다."
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