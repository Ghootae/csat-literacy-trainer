- **V1 정답: ⑤** — ①~④는 거짓, ⑤는 참이다.
- **V2 정답: ③** — ①·②·④·⑤는 거짓, ③은 참이다.

V1의 ①은 경계값에 주의해야 한다. A의 송신 주파수를 절반으로 줄이면 가청 범위의 **상한과 같아진다**. 지문은 초음파의 주파수를 가청 범위 **‘이상’**으로 규정하므로, 지문에 따르면 초음파 범위에서 벗어나지 않는다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 5,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "초음파의 주파수 범위에서 벗어나겠군",
          "minimum_evidence": {
            "passage": "초음파는 주파수가 인간의 가청 범위 이상인 음파이다. '이상'은 경계값을 포함한다.",
            "bogi": "A의 송신 주파수는 가청 범위 상한의 2배이다. 절반으로 줄이면 상한의 1배, 즉 상한과 같아지므로 지문이 규정한 초음파 범위에 포함된다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "A의 원래 송신 주파수가 가청 범위 상한의 몇 배인지 알아야 절반으로 줄인 값이 초음파 범위에 속하는지 판단할 수 있다."
          }
        },
        {
          "n": 2,
          "decisive_clause": "산란이 C보다 더 적게 발생하겠군",
          "minimum_evidence": {
            "passage": "주파수가 높을수록 산란이 많이 발생한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지는 더 높은 주파수를 산란 감소의 이유로 제시하지만, 지문에서 주파수 증가가 산란에 미치는 영향은 산란 증가이므로 인과 설명이 반대이다."
          }
        },
        {
          "n": 3,
          "decisive_clause": "표시 단계에서 초음파를 수신하고",
          "minimum_evidence": {
            "passage": "송수신 단계에서는 초음파를 발생시키고 수신하는 장치인 탐촉자를 이용한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "탐촉자의 초음파 수신은 송수신 단계에서 이루어지므로, 이를 표시 단계의 일로 서술한 첫 절에서 이미 거짓이다."
          }
        },
        {
          "n": 4,
          "decisive_clause": "음향 저항은 절반이겠군",
          "minimum_evidence": {
            "passage": "음향 저항은 매질의 밀도에 비례한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지 자체가 밀도는 두 배라고 했으므로, 비례 관계에 따라 음향 저항도 두 배여야 한다. 절반이라는 서술과 양립하지 않는다."
          }
        },
        {
          "n": 5,
          "decisive_clause": "더 어두운 파란색으로 표시되겠군",
          "minimum_evidence": {
            "passage": "적혈구의 이동 속도가 빠를수록 도플러 변위의 절댓값이 크다. 탐촉자에서 멀어지는 방향이면 도플러 변위가 음수이며 파란색으로 표시된다. 혈류 속도가 빠르면 더 밝게 표시된다.",
            "bogi": "E의 도플러 변위는 −200Hz, D는 −600Hz이다. 값 자체는 −200>−600이므로 E가 크다. 두 값 모두 음수이므로 파란색이고, 절댓값은 200<600이므로 E가 더 느려 더 어둡다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "D와 E의 도플러 변위의 실제 부호와 값이 필요하다. 지문의 일반 원리만으로 두 혈관의 대소 관계·색·밝기를 확정할 수 없다."
          }
        }
      ],
      "closest_rival": {
        "n": 1,
        "observation": "A의 송신 주파수 2배를 절반으로 줄이면 가청 범위 상한과 정확히 같아진다. 지문의 표현은 '초과'가 아니라 경계값을 포함하는 '이상'이므로 ①은 거짓이다."
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
          "decisive_clause": "도플러 각도는 같겠군",
          "minimum_evidence": {
            "passage": "도플러 각도는 피부에 입사하는 초음파가 혈류의 방향과 이루는 각도이다.",
            "bogi": "혈류 방향과 입사 초음파의 진행 방향이 이루는 각도가 처음에는 20°였으나 이후 40°가 되었다. 따라서 도플러 각도도 달라졌다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "탐촉자가 고정되었다는 사실만으로 도플러 각도가 같다고 확정할 수 없다. 혈류 방향 변화 전후에 초음파와 이루는 각도가 실제로 어떻게 달라졌는지에 관한 관찰이 필요하다."
          }
        },
        {
          "n": 2,
          "decisive_clause": "초음파가 한 번 진동하는 데 걸린 시간",
          "minimum_evidence": {
            "passage": "주파수는 1초에 음파가 진동하는 횟수이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "주파수는 단위 시간당 진동 횟수이지 한 번 진동하는 데 걸리는 시간이 아니므로 거짓이다."
          }
        },
        {
          "n": 3,
          "decisive_clause": "화면에 표시되기 전에 탐촉자에 저장되겠군",
          "minimum_evidence": {
            "passage": "표시 단계에서는 탐촉자에 저장된 혈류 정보를 영상 장치의 화면에 표시한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "표시하는 대상이 이미 '탐촉자에 저장된 정보'이므로, 혈류 정보의 저장은 화면 표시보다 앞선다."
          }
        },
        {
          "n": 4,
          "decisive_clause": "탐촉자에 도달했는지를 기준으로 산란이 일어났는지 판단",
          "minimum_evidence": {
            "passage": "산란은 반사되는 초음파가 여러 방향으로 흩어지는 것을 의미한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지가 전제한 '여러 방향으로 흩어짐' 자체가 산란이다. 탐촉자 도달 여부는 산란 발생 여부를 정하는 기준이 아니다."
          }
        },
        {
          "n": 5,
          "decisive_clause": "혈액과 적혈구의 음향 저항은 같겠군",
          "minimum_evidence": {
            "passage": "초음파는 혈액과 다른 음향 저항을 가진 적혈구를 만나 산란된다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "지문은 혈액과 적혈구의 음향 저항이 다르다고 명시하므로, 같다는 서술은 거짓이다."
          }
        }
      ],
      "closest_rival": {
        "n": 1,
        "observation": "탐촉자와 피부의 위치·자세는 그대로였지만, 혈류 방향과 입사 초음파가 이루는 각도는 20°에서 40°로 바뀌었다. 도플러 각도는 탐촉자의 자세만으로 정해지지 않는다."
      },
      "valid_answers": [3],
      "weak": []
    }
  ]
}
```