## 정답
- **V1: ⑤** — 적혈구에서 생기는 산란은 수신할 혈류 정보를 제공하므로, 그 원인인 음향 저항 차이를 없애는 것은 수신에 유리하지 않다.
- **V2: ①** — 도플러 변위의 **값은 B가 크지만**, 혈류 속도가 빨라 화면에서 **더 밝은 것은 A**이다.

아래 관찰 수는 산문에서는 문장별로, 표에서는 측정 열별로 셌다. 같은 열의 여러 값은 하나로 묶었다. 추론 단계에는 필요한 비교·계산·개념 변환을 별도로 반영했다.

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
          "decisive_clause": "적혈구의 이동에 따른 도플러 효과",
          "minimum_evidence": {
            "passage": "측정 대상이 이동하여 송신 주파수와 수신 주파수가 달라지는 현상을 도플러 효과라고 한다. 적혈구에서 산란되어 돌아오는 초음파에도 이 효과가 발생한다.",
            "bogi": "‘두 부위의 적혈구는 모두 탐촉자를 향해 이동했다.’에서 A의 적혈구도 이동함을 확인한다. 이 이동에 지문 규칙을 적용하면 주파수 차이의 발생을 설명할 수 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "A의 적혈구가 이동한다는 관찰이나 A에서 송수신 주파수가 다르다는 관찰이 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1
        },
        {
          "n": 2,
          "judgment": "참",
          "decisive_clause": "경계면에서 초음파가 더 많이 반사되는 쪽은 B",
          "minimum_evidence": {
            "passage": "음향 저항은 매질의 밀도에 비례한다. 두 매질의 음향 저항 차이가 클수록 경계면에서 더 많은 초음파가 반사된다.",
            "bogi": "밀도는 A가 9와 9, B가 2와 6이다. 별도 문장에서 모든 매질의 밀도와 음향 저항 사이 비례상수가 같다고 했다. A의 밀도는 각각 더 높지만, 밀도 차이는 A가 0, B가 4이므로 음향 저항 차이는 B가 더 크다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "A와 B의 두 매질 밀도 및 비례상수가 같다는 조건이 필요하다. 밀도의 절대적 크기만으로 반사량을 판정할 수 없다."
          },
          "steps": 5,
          "bogi_sources": 2
        },
        {
          "n": 3,
          "judgment": "참",
          "decisive_clause": "두 각도 모두 실제 측정에서 유지해야 하는 범위에는 들겠군",
          "minimum_evidence": {
            "passage": "도플러 각도가 0°일 때 가장 정확하게 측정한다. 실제 측정에서는 60° 미만을 유지해야 한다.",
            "bogi": "첫 문장에서 A와 B의 도플러 각도가 모두 59°라고 했다. 59°는 0°가 아니면서 60° 미만이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "A와 B의 실제 도플러 각도가 필요하다. 지문의 각도 기준만으로 두 측정이 그 기준을 충족하는지는 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1
        },
        {
          "n": 4,
          "judgment": "참",
          "decisive_clause": "화면에서 더 밝게 표시되는 쪽은 B",
          "minimum_evidence": {
            "passage": "혈류가 탐촉자를 향하면 빨간색으로 표시하고, 혈류 속도가 빠르면 더 밝게 표시한다.",
            "bogi": "‘두 부위의 적혈구는 모두 탐촉자를 향해 이동했다.’와 ‘적혈구는 A보다 B에서 더 빠르게 이동했다.’를 연결한다. 두 부위는 모두 빨간색이고 B가 더 밝다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "두 부위의 이동 방향과 상대적인 이동 속도가 필요하다."
          },
          "steps": 2,
          "bogi_sources": 2
        },
        {
          "n": 5,
          "judgment": "거짓",
          "decisive_clause": "혈류 정보를 수신하는 데 더 유리하겠군",
          "minimum_evidence": {
            "passage": "초음파는 혈액과 음향 저항이 다른 적혈구를 만나 산란된다. 산란은 반사된 초음파가 여러 방향으로 흩어지는 것이며, 그중 탐촉자로 돌아온 초음파로 혈류 정보를 얻는다. 음향 저항 차이가 클수록 반사가 많다.",
            "bogi": "마지막 문장에서 ㉡은 적혈구에서 여러 방향으로 흩어진 초음파 중 탐촉자로 돌아온 초음파라고 했다. 따라서 ㉡은 수신해야 할 산란 회파이다. 적혈구와 혈액의 음향 저항 차이를 없애는 것은 이 회파의 발생을 줄이는 쪽이지 수신에 유리한 조치가 아니다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "㉡이 적혈구에서 산란되어 돌아온 수신용 회파라는 관찰이 필요하다. ㉡의 정체를 모르면 줄여야 할 불필요한 반사인지, 확보해야 할 신호인지 구분할 수 없다."
          },
          "steps": 4,
          "bogi_sources": 1
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "밀도 문장에서 A는 9와 9로 차이가 0이고, B는 2와 6으로 차이가 4이다. 반사량을 결정하는 것은 밀도의 절대적 크기가 아니라 음향 저항의 차이이므로 ②는 참이다."
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
          "decisive_clause": "도플러 변위의 값이 더 큰 측정의 혈류가 화면에서 더 밝게 표시되겠군",
          "minimum_evidence": {
            "passage": "탐촉자에서 멀어지는 적혈구의 도플러 변위는 음수이고 가까워지는 적혈구의 도플러 변위는 양수이다. 혈류 속도가 빠르면 화면에서 더 밝게 표시한다.",
            "bogi": "A열은 멀어짐·20 cm/s이고 B열은 가까워짐·10 cm/s이다. 따라서 도플러 변위의 값은 양수인 B가 음수인 A보다 크지만, 화면에서는 속도가 빠른 A가 더 밝다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "A와 B의 이동 방향 및 이동 속도가 필요하다. ‘값’과 ‘절댓값’이 다르다는 사실만으로는 이 두 측정에서 실제로 어느 쪽이 더 밝은지 확정할 수 없다."
          },
          "steps": 5,
          "bogi_sources": 2
        },
        {
          "n": 2,
          "judgment": "참",
          "decisive_clause": "도플러 변위의 절댓값은 C가 B보다 크겠군",
          "minimum_evidence": {
            "passage": "적혈구의 이동 속도가 빠를수록 도플러 변위의 절댓값이 크다.",
            "bogi": "B열과 C열의 연부 조직 내 초음파 속도는 모두 1,500 m/s이다. 적혈구의 이동 속도는 B가 10 cm/s, C가 20 cm/s이므로 C의 도플러 변위 절댓값이 더 크다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "B와 C에서 초음파의 속도가 같다는 관찰 및 적혈구의 상대적인 이동 속도가 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2
        },
        {
          "n": 3,
          "judgment": "참",
          "decisive_clause": "B보다 D에서 더 많이 산란되겠군",
          "minimum_evidence": {
            "passage": "산란체의 크기가 작거나 초음파의 주파수가 높을수록 산란이 많이 발생한다.",
            "bogi": "첫 문장에서 적혈구의 크기가 모두 같다고 했다. 송신 주파수는 B열이 4 MHz, D열이 8 MHz이므로 같은 크기의 적혈구를 만나는 초음파는 D에서 더 많이 산란된다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "B와 D의 적혈구 크기가 같다는 조건과 송신 주파수의 대소가 필요하다."
          },
          "steps": 3,
          "bogi_sources": 3
        },
        {
          "n": 4,
          "judgment": "참",
          "decisive_clause": "양(+)의 값을 갖겠군",
          "minimum_evidence": {
            "passage": "적혈구가 탐촉자에 가까워지는 방향으로 이동하면 도플러 변위는 양수이다.",
            "bogi": "B열의 적혈구 이동 방향은 ‘가까워짐’이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "B의 적혈구가 탐촉자에 가까워지는지 멀어지는지에 관한 관찰이 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1
        },
        {
          "n": 5,
          "judgment": "참",
          "decisive_clause": "화면에서는 A의 혈류가 더 밝겠군",
          "minimum_evidence": {
            "passage": "혈류가 탐촉자에서 멀어지면 파란색으로 표시한다. 혈류 속도가 빠르면 더 밝게 표시한다.",
            "bogi": "A열과 D열의 이동 방향은 모두 ‘멀어짐’이다. 적혈구의 이동 속도는 A가 20 cm/s, D가 10 cm/s이므로 둘 다 파란색이지만 A가 더 밝다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "A와 D의 이동 방향 및 상대적인 이동 속도가 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "이동 방향 행에서 A는 ‘멀어짐’, B는 ‘가까워짐’이다. 따라서 ①의 부호를 포함한 도플러 변위 ‘값’ 비교를 ②의 ‘절댓값’ 비교와 동일하게 처리하면 안 된다."
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