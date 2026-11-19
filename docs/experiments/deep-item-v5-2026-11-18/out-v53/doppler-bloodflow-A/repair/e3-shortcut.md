**정답은 V1 ⑤, V2 ①입니다.** 두 문항 모두 내용상 거짓인 선지가 하나씩이므로 정상적으로 성립합니다.

- V1 ⑤: 피부 경계의 반사와 달리, 적혈구의 반사는 혈류 정보를 수신하는 데 필요합니다.
- V2 ①: 화면의 **색은 이동 방향**, **밝기는 이동 속도**에 따라 정해집니다.

아래에서 표의 관찰 수는 ‘한 열 안의 값 여러 개는 1’이라는 기준에 따라, 같은 대상 열에서 필요한 여러 값을 묶어 셌습니다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 5,
      "choices": [
        {
          "n": 1,
          "judgment": "참",
          "decisive_clause": "실제 측정에서 오차 값이 적은 범위에는 들어가겠군",
          "minimum_evidence": {
            "passage": "도플러 각도가 0°일 때 혈류 속도를 가장 정확하게 측정하며, 실제 측정에서는 오차 값이 적은 60° 미만을 유지해야 한다.",
            "bogi": "도플러 각도는 59°였다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "실제 측정 각도가 59°라는 관찰이 필요하다. 선지에는 실제 각도의 수치가 제시되어 있지 않다."
          },
          "steps": 2,
          "bogi_sources": 1
        },
        {
          "n": 2,
          "judgment": "참",
          "decisive_clause": "젤과 피부 사이의 음향 저항 차이는 공기와 피부 사이의 차이보다 작겠군",
          "minimum_evidence": {
            "passage": "음향 저항은 매질의 밀도에 비례한다.",
            "bogi": "젤은 피부와 밀도가 같고 공기보다 밀도가 컸다. 따라서 젤과 피부의 음향 저항 차이는 0이고, 공기와 피부의 차이는 0보다 크다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "젤과 피부의 밀도가 같다는 관찰이 필요하다. 선지에 있는 '젤이 공기보다 밀도가 크다'는 조건만으로는 두 경계의 음향 저항 차이를 비교할 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1
        },
        {
          "n": 3,
          "judgment": "참",
          "decisive_clause": "산란이 더 많이 발생하겠군",
          "minimum_evidence": {
            "passage": "주파수가 높을수록 산란이 많이 발생한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지가 다른 조건은 같고 송신 주파수만 높아진다고 명시했으므로, 주파수가 높을수록 산란이 많아진다는 한 사실로 참이라고 판정할 수 있다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 4,
          "judgment": "참",
          "decisive_clause": "적혈구는 이동하고 있었겠군",
          "minimum_evidence": {
            "passage": "일반적으로 송신 주파수와 수신 주파수는 같지만, 대상이 이동하면 두 주파수가 달라지는 도플러 효과가 나타난다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지 자체에 송신·수신 주파수가 달랐다는 조건이 있으므로, 지문이 설명한 도플러 효과에 따라 반사 대상인 적혈구가 이동했다고 판정할 수 있다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 5,
          "judgment": "거짓",
          "decisive_clause": "혈류 정보를 더 원활하게 수신하겠군",
          "minimum_evidence": {
            "passage": "산란은 반사되는 초음파가 여러 방향으로 흩어지는 것이며, 적혈구에서 산란된 초음파의 일부가 탐촉자로 되돌아온다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "추가적인 보기 관찰이 아니라 지문의 관계 두 개가 필요하다. 적혈구의 반사가 없어지면 산란도 없어지고, 산란파가 돌아오지 않으면 이를 통한 혈류 정보 수신도 이루어지지 않는다는 연결이 필요하다."
          },
          "steps": 2,
          "bogi_sources": 0
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "적혈구에서 흩어진 초음파의 일부가 탐촉자로 돌아왔다는 관찰이 가른다. 피부 경계의 반사 감소는 입사에 유리하지만, 적혈구의 반사는 수신 신호를 만드는 데 필요하다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [5],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 1,
      "choices": [
        {
          "n": 1,
          "judgment": "거짓",
          "decisive_clause": "같은 색으로 표시되겠군",
          "minimum_evidence": {
            "passage": "혈류가 탐촉자를 향하면 빨간색, 그 반대 방향이면 파란색으로 표시한다.",
            "bogi": "이동 방향 행에서 A는 탐촉자 쪽이고 B는 탐촉자 반대쪽이다. 따라서 A는 빨간색, B는 파란색이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "A와 B의 이동 방향이 서로 반대라는 관찰이 필요하다. 색이 방향에 따라 정해진다는 사실만으로는 두 경우의 색이 실제로 다른지 확정할 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2
        },
        {
          "n": 2,
          "judgment": "참",
          "decisive_clause": "파란색으로 표시되겠군",
          "minimum_evidence": {
            "passage": "혈류가 탐촉자 반대 방향으로 이동하면 파란색으로 표시한다.",
            "bogi": "B의 적혈구 이동 방향은 탐촉자 반대쪽이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "B의 적혈구가 탐촉자 반대쪽으로 이동한다는 관찰이 필요하다. 산란된 초음파가 돌아온다는 사실은 적혈구의 이동 방향을 알려 주지 않는다."
          },
          "steps": 1,
          "bogi_sources": 1
        },
        {
          "n": 3,
          "judgment": "참",
          "decisive_clause": "도플러 변위의 절댓값은 C에서 더 크겠군",
          "minimum_evidence": {
            "passage": "적혈구의 이동 속도가 빠를수록 도플러 변위의 절댓값이 크다.",
            "bogi": "B와 C의 연부 조직 내 초음파 속도는 모두 1,500 m/s이다. 적혈구 이동 속도는 B가 10 cm/s, C가 20 cm/s이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "B와 C의 연부 조직 내 초음파 속도가 같고, 적혈구 이동 속도는 C가 더 빠르다는 관찰이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2
        },
        {
          "n": 4,
          "judgment": "참",
          "decisive_clause": "수신 주파수는 송신 주파수와 같겠군",
          "minimum_evidence": {
            "passage": "이동하지 않는 대상에서 반사되어 돌아오는 초음파의 수신 주파수는 일반적으로 송신 주파수와 같다.",
            "bogi": "D의 적혈구는 이동하지 않는다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "D의 적혈구가 이동하지 않는다는 관찰이 필요하다. 초음파가 탐촉자로 돌아왔다는 선지의 조건만으로는 주파수의 일치 여부를 알 수 없다."
          },
          "steps": 1,
          "bogi_sources": 1
        },
        {
          "n": 5,
          "judgment": "참",
          "decisive_clause": "A에서 얻은 도플러 변위는 양수이고, C에서 얻은 도플러 변위는 음수이겠군",
          "minimum_evidence": {
            "passage": "적혈구가 탐촉자에 가까워지는 방향이면 도플러 변위가 양수이고, 반대 방향이면 음수이다.",
            "bogi": "이동 방향 행에서 A는 탐촉자 쪽이고 C는 탐촉자 반대쪽이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "A는 탐촉자 쪽으로, C는 탐촉자 반대쪽으로 이동한다는 관찰이 필요하다."
          },
          "steps": 1,
          "bogi_sources": 2
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "B의 적혈구 이동 방향이 탐촉자 반대쪽이라는 관찰이 가른다. 수신 초음파가 탐촉자로 돌아오는 방향과 적혈구의 이동 방향은 구별해야 하며, B는 파란색이다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [1],
      "weak": []
    }
  ]
}
```