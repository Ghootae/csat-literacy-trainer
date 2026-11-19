**정답은 V1 ⑤, V2 ③이다.** 두 문항 모두 내용상 참인 선지가 하나씩이며, 근거가 부족한 선지는 없다.

- **V1:** ㉤의 도플러 변위는 ㉡보다 수치상 크지만(+200 > −400), 절댓값은 작다(200 < 400). 따라서 혈류 속도는 더 느리고 화면에는 더 어둡게 표시된다.
- **V2:** ㉮에서는 적혈구와 탐촉자 사이의 거리가 줄었으므로 혈류가 탐촉자를 향한다. 획득한 혈류 정보는 탐촉자에 저장되므로, 영상 장치를 켜면 빨간색으로 표시할 수 있다.

아래 단계 수에서는 **비교, 지문 관계 적용, 표현의 개념 전환을 각각 1단계**로 센다. 절댓값의 대소 비교는 한 번의 비교로 처리한다. 표의 서로 다른 부위 열은 각각 별개의 〈보기〉 관찰로 센다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 5,
      "choices": [
        {
          "n": 1,
          "judgment": "거짓",
          "decisive_clause": "초음파를 수신하는 것은 표시 단계에",
          "minimum_evidence": {
            "passage": "초음파의 발생과 수신은 송수신 단계에 속한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "초음파 수신은 송수신 단계라는 사실만으로, 이를 표시 단계에 배정한 선지를 거짓으로 판정할 수 있다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 2,
          "judgment": "거짓",
          "decisive_clause": "㉤은 ㉡보다 혈류 속도가 빨라",
          "minimum_evidence": {
            "passage": "적혈구의 이동 속도가 빠를수록 도플러 변위의 절댓값이 크다.",
            "bogi": "도플러 변위 행: ㉤은 +200 Hz, ㉡은 −400 Hz이다. 절댓값은 ㉤이 더 작다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉤과 ㉡의 도플러 변위 절댓값을 비교할 관찰이 필요하다."
          },
          "steps": 2,
          "bogi_sources": 2
        },
        {
          "n": 3,
          "judgment": "거짓",
          "decisive_clause": "㉣보다 ㉤에서 더 작겠군",
          "minimum_evidence": {
            "passage": "젤은 공기와 피부 사이의 음향 저항 차이를 줄인다. 두 매질의 음향 저항 차이가 클수록 경계면에서 초음파가 더 많이 반사된다.",
            "bogi": "피부의 젤 행: ㉣에는 젤이 있고, ㉤에는 젤이 없다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉣과 ㉤의 젤 도포 여부가 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2
        },
        {
          "n": 4,
          "judgment": "거짓",
          "decisive_clause": "㉤에서는 ㉢보다 초음파의 산란이 적게 일어나겠군",
          "minimum_evidence": {
            "passage": "주파수가 높을수록 산란이 많이 발생한다.",
            "bogi": "송신 주파수 행: ㉤은 8,000 kHz, ㉢은 4,000 kHz이다. 적혈구의 크기가 같다는 조건은 선지에 제시되어 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉤과 ㉢의 송신 주파수 대소 관계가 필요하다."
          },
          "steps": 2,
          "bogi_sources": 2
        },
        {
          "n": 5,
          "judgment": "참",
          "decisive_clause": "도플러 변위의 수치가 크고, 화면에는 더 어둡게 표시되겠군",
          "minimum_evidence": {
            "passage": "적혈구의 이동 속도가 빠를수록 도플러 변위의 절댓값이 크며, 혈류 속도가 빠르면 화면에 더 밝게 표시한다.",
            "bogi": "도플러 변위 행: ㉤은 +200 Hz, ㉡은 −400 Hz이다. 수치는 +200이 −400보다 크지만, 절댓값은 200이 400보다 작다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉤과 ㉡의 도플러 변위 수치 및 절댓값을 비교할 관찰이 필요하다."
          },
          "steps": 4,
          "bogi_sources": 2
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "㉤의 도플러 변위 절댓값은 200 Hz로, ㉡의 400 Hz보다 작다. 따라서 ㉤은 더 빠르거나 밝은 것이 아니라 더 느리고 어둡다."
      },
      "mirror_pair": {
        "exists": true,
        "choices": [2, 5],
        "why": "두 선지는 모두 ㉤을 ㉡과 비교하면서 화면 밝기를 각각 '더 밝게'와 '더 어둡게'로 반대로 판단한다. 다만 앞부분의 진술은 서로 다르다."
      },
      "valid_answers": [5],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 3,
      "choices": [
        {
          "n": 1,
          "judgment": "거짓",
          "decisive_clause": "도플러 변위가 음의 값을 갖겠군",
          "minimum_evidence": {
            "passage": "적혈구가 탐촉자에 가까워지는 방향으로 이동하면 도플러 변위는 양의 값을 갖는다.",
            "bogi": "혈류 방향이 달라지는 동안 ㉮의 적혈구와 탐촉자 사이의 거리는 줄었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "방향이 달라지는 동안 적혈구가 탐촉자에 가까워졌는지 멀어졌는지 알아야 한다."
          },
          "steps": 2,
          "bogi_sources": 1
        },
        {
          "n": 2,
          "judgment": "거짓",
          "decisive_clause": "㉯의 연부 조직보다 음향 저항이 작겠군",
          "minimum_evidence": {
            "passage": "음향 저항은 매질의 밀도에 비례한다.",
            "bogi": "연부 조직의 밀도는 ㉮가 ㉯의 2배이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉮와 ㉯의 연부 조직 밀도 관계가 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1
        },
        {
          "n": 3,
          "judgment": "참",
          "decisive_clause": "저장된 혈류 정보를 빨간색으로 표시할 수 있겠군",
          "minimum_evidence": {
            "passage": "획득한 혈류 속도와 방향 정보는 탐촉자에 저장된다. 표시 단계에서는 저장된 정보를 표시하며, 혈류가 탐촉자를 향하면 빨간색으로 나타낸다.",
            "bogi": "㉮의 적혈구와 탐촉자 사이의 거리가 줄었다. 두 탐촉자는 돌아온 초음파를 수신하여 혈류의 속도와 방향 정보를 얻었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉮의 혈류가 탐촉자를 향했다는 관찰과, 표시할 혈류 정보를 획득했다는 관찰이 필요하다."
          },
          "steps": 4,
          "bogi_sources": 2
        },
        {
          "n": 4,
          "judgment": "거짓",
          "decisive_clause": "㉯에서 송신된 초음파보다 2배의 시간이 걸리겠군",
          "minimum_evidence": {
            "passage": "주파수는 1초에 음파가 진동하는 횟수이다. 따라서 주파수가 2배이면 한 번 진동하는 데 걸리는 시간은 절반이다.",
            "bogi": "㉮의 송신 주파수는 ㉯의 2배이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉮와 ㉯의 송신 주파수 비율이 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1
        },
        {
          "n": 5,
          "judgment": "거짓",
          "decisive_clause": "피부를 거치지 않고",
          "minimum_evidence": {
            "passage": "적혈구에서 산란된 초음파 중 일부는 연부 조직과 피부를 지나 탐촉자로 되돌아온다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "돌아오는 초음파가 연부 조직과 피부를 지난다는 사실만으로, 피부를 거치지 않는다는 선지를 거짓으로 판정할 수 있다."
          },
          "steps": 1,
          "bogi_sources": 0
        }
      ],
      "closest_rival": {
        "n": 1,
        "observation": "방향이 달라지는 동안에도 ㉮의 적혈구와 탐촉자 사이의 거리는 줄었다. 따라서 도플러 변위는 양수이고, 표시 색은 빨간색이다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [3],
      "weak": []
    }
  ]
}
```