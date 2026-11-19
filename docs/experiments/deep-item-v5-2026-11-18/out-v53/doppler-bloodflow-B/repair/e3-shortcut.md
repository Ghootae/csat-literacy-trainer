## 판정 결과

- **V1: ⑤** — 도플러 변위의 절댓값은 A가 2 kHz, B가 1 kHz이므로 B가 더 느리고 어둡게 표시된다.
- **V2: ③** — 수신 주파수는 ㉮가 3,001,000 Hz, ㉯가 3,000,500 Hz이다. 도플러 변위의 절댓값은 각각 1,000 Hz, 500 Hz이므로 ㉮의 혈류가 더 빠르다.

V1의 ④는 선지 자체가 제시한 ‘같은 주파수·D의 적혈구가 더 큼’이라는 전제와 산란에 관한 지문 규칙만으로 거짓임을 확정할 수 있다. 따라서 이 선지의 최소 〈보기〉 관찰 수는 0으로 처리했다.

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
          "decisive_clause": "오차 값이 적은 각도의 범위에 들어가겠군",
          "minimum_evidence": {
            "passage": "실제 측정에서는 오차 값이 적은 60° 미만의 도플러 각도를 유지해야 한다.",
            "bogi": "D의 도플러 각도는 60°이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "D의 도플러 각도가 몇 도인지 알아야 한다."
          },
          "steps": 1,
          "step_trace": [
            "D의 60°에 '60° 미만'이라는 범위 조건을 적용하면 범위에 포함되지 않는다."
          ],
          "bogi_sources": 1
        },
        {
          "n": 2,
          "judgment": "거짓",
          "decisive_clause": "도플러 변위의 절댓값도 서로 같겠군",
          "minimum_evidence": {
            "passage": "도플러 변위는 송신 주파수와 수신 주파수의 차이이다.",
            "bogi": "B와 C의 송신 주파수는 각각 1,000, 1,001 kHz이고, 수신 주파수는 모두 999 kHz이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "수신 주파수가 같더라도 송신 주파수에 따라 변위가 달라지므로, B와 C의 송신 주파수가 필요하다."
          },
          "steps": 2,
          "step_trace": [
            "송수신 주파수의 차이로부터 변위의 절댓값을 B는 1 kHz, C는 2 kHz로 구한다.",
            "두 절댓값을 비교하면 서로 다르다."
          ],
          "bogi_sources": 2
        },
        {
          "n": 3,
          "judgment": "거짓",
          "decisive_clause": "표시 단계에서 얻었겠군",
          "minimum_evidence": {
            "passage": "송수신 단계에서 수신 초음파의 도플러 변위를 얻고, 이를 통해 얻은 혈류 정보를 탐촉자에 저장한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "송수신 주파수의 차이에 관한 정보는 송수신 단계에서 얻으므로, 이를 표시 단계에서 얻었다는 설명은 거짓이다."
          },
          "steps": 1,
          "step_trace": [
            "주파수 차이 정보의 획득을 송수신 단계에 대응시키면 선지의 단계 지정이 틀렸음을 알 수 있다."
          ],
          "bogi_sources": 0
        },
        {
          "n": 4,
          "judgment": "거짓",
          "decisive_clause": "산란은 D에서 더 많이 발생하겠군",
          "minimum_evidence": {
            "passage": "산란체의 크기가 작을수록 산란이 많이 발생한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지 자체가 송신 주파수는 같고 D의 적혈구가 더 크다고 전제하므로, 크기가 작은 C에서 산란이 더 많이 발생해야 한다."
          },
          "steps": 1,
          "step_trace": [
            "선지가 제시한 동일 주파수·크기 관계에 '작을수록 산란이 많다'를 적용하면 선지의 결론과 반대가 된다."
          ],
          "bogi_sources": 0
        },
        {
          "n": 5,
          "judgment": "참",
          "decisive_clause": "B의 혈류는 화면에 A의 혈류보다 어둡게 표시되겠군",
          "minimum_evidence": {
            "passage": "도플러 변위는 송수신 주파수의 차이이며, 그 절댓값이 클수록 혈류 속도가 빠르다. 혈류 속도가 빠르면 화면에 더 밝게 표시한다.",
            "bogi": "A와 B의 송신 주파수는 모두 1,000 kHz이고, 수신 주파수는 각각 998, 999 kHz이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "A와 B의 송수신 주파수를 확인하여 도플러 변위의 절댓값을 비교해야 한다."
          },
          "steps": 4,
          "step_trace": [
            "송수신 주파수의 차이로부터 변위의 절댓값을 A는 2 kHz, B는 1 kHz로 구한다.",
            "변위의 절댓값은 A가 B보다 크다고 비교한다.",
            "도플러 변위와 속도의 관계를 적용하면 A의 혈류가 더 빠르다.",
            "속도와 밝기의 관계를 적용하면 B의 혈류가 더 어둡게 표시된다."
          ],
          "bogi_sources": 2
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "송신 주파수 행에서 C는 B와 달리 1,001 kHz이다. 따라서 수신 주파수가 같아도 B와 C의 도플러 변위 절댓값은 같지 않다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [
        5
      ],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 3,
      "choices": [
        {
          "n": 1,
          "judgment": "거짓",
          "decisive_clause": "피부를 먼저 통과하고",
          "minimum_evidence": {
            "passage": "산란된 초음파 중 일부는 연부 조직, 피부를 차례로 지나 탐촉자로 돌아온다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "탐촉자로 돌아오는 초음파는 피부보다 연부 조직을 먼저 통과하므로, 선지의 순서는 반대이다."
          },
          "steps": 1,
          "step_trace": [
            "귀환 경로인 '연부 조직 → 피부'를 선지의 순서와 대조한다."
          ],
          "bogi_sources": 0
        },
        {
          "n": 2,
          "judgment": "거짓",
          "decisive_clause": "수신 주파수도 ㉯가 ㉮보다 높겠군",
          "minimum_evidence": {
            "passage": "주파수는 1초에 음파가 진동하는 횟수이다.",
            "bogi": "㉮의 수신 초음파는 1초 동안 3,001,000번, ㉯의 수신 초음파는 2초 동안 6,001,000번 진동했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "각 지점의 진동 횟수를 센 시간과 진동 횟수가 필요하다. 총횟수만으로 주파수의 대소를 정할 수 없다."
          },
          "steps": 2,
          "step_trace": [
            "진동 횟수를 초당 횟수로 환산하면 ㉮는 3,001,000 Hz, ㉯는 3,000,500 Hz이다.",
            "두 주파수를 비교하면 ㉯가 아니라 ㉮가 더 높다."
          ],
          "bogi_sources": 2
        },
        {
          "n": 3,
          "judgment": "참",
          "decisive_clause": "혈류 속도는 ㉮가 ㉯보다 크겠군",
          "minimum_evidence": {
            "passage": "주파수는 초당 진동 횟수이다. 도플러 변위는 송수신 주파수의 차이이며, 그 절댓값이 클수록 혈류 속도가 빠르다. 도플러 변위를 통해 얻은 혈류 속도와 방향 정보는 탐촉자에 저장된다.",
            "bogi": "송신 주파수는 두 지점 모두 3,000,000 Hz이다. ㉮의 수신 초음파는 1초 동안 3,001,000번 진동했다. ㉯의 수신 초음파는 2초 동안 6,001,000번 진동했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "정보의 저장은 지문만으로 확인되지만, 두 지점의 속도 비교에는 송신 주파수와 시간당 수신 진동 횟수가 필요하다."
          },
          "steps": 5,
          "step_trace": [
            "수신 초음파로 얻은 혈류 속도 정보가 탐촉자에 저장된다는 지문 사실을 확인한다.",
            "수신 진동 횟수를 주파수로 환산하면 ㉮는 3,001,000 Hz, ㉯는 3,000,500 Hz이다.",
            "공통 송신 주파수와의 차이로부터 변위의 절댓값을 각각 1,000 Hz, 500 Hz로 구한다.",
            "도플러 변위의 절댓값은 ㉮가 ㉯보다 크다고 비교한다.",
            "변위의 절댓값과 속도의 관계를 적용하면 ㉮의 혈류가 더 빠르다."
          ],
          "bogi_sources": 3
        },
        {
          "n": 4,
          "judgment": "거짓",
          "decisive_clause": "도플러 각도는 원래와 같겠군",
          "minimum_evidence": {
            "passage": "도플러 각도는 피부에 입사하는 초음파의 방향과 혈류의 방향이 이루는 각도이다.",
            "bogi": "㉯의 원래 도플러 각도는 30°이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "가정한 상황의 각도는 0°임을 알 수 있지만, 원래 각도와 같은지 판단하려면 ㉯의 원래 각도가 필요하다."
          },
          "steps": 2,
          "step_trace": [
            "초음파와 혈류가 같은 방향이라는 표현을 도플러 각도 0°로 바꿔 읽는다.",
            "변경 후 0°와 원래 30°를 비교하면 같지 않다."
          ],
          "bogi_sources": 1
        },
        {
          "n": 5,
          "judgment": "거짓",
          "decisive_clause": "반사되는 초음파의 양도 두 지점에서 같겠군",
          "minimum_evidence": {
            "passage": "음향 저항은 매질의 밀도에 비례한다. 두 매질의 음향 저항 차이가 클수록 경계면에서 더 많은 초음파가 반사된다.",
            "bogi": "㉮의 연부 조직·혈액 밀도는 각각 2, 4이고, ㉯의 연부 조직·혈액 밀도는 각각 4, 8이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "밀도 비가 같다는 것만으로 밀도 차이나 음향 저항 차이가 같은지는 정해지지 않는다. 두 지점의 실제 밀도 값이 필요하다."
          },
          "steps": 4,
          "step_trace": [
            "연부 조직과 혈액의 밀도 차이를 구하면 ㉮는 2, ㉯는 4이다.",
            "두 밀도 차이를 비교하면 ㉯가 더 크다.",
            "밀도와 음향 저항의 비례 관계를 적용하면 음향 저항 차이도 ㉯가 더 크다.",
            "음향 저항 차이와 반사량의 관계를 적용하면 ㉯에서 더 많이 반사되므로 두 지점의 반사량은 같지 않다."
          ],
          "bogi_sources": 2
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "㉯의 6,001,000번은 '2초 동안'의 진동 횟수이다. 초당 횟수로 바꾸면 수신 주파수는 ㉯가 더 낮아져 ②는 거짓이고, 변위 절댓값도 더 작아져 ③은 참이다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [
        3
      ],
      "weak": []
    }
  ]
}
```