## 판정 결과

- **V1: ③** — ① 거짓, ② 거짓, ③ 참, ④ 거짓, ⑤ 거짓
- **V2: ④** — ① 거짓, ② 거짓, ③ 거짓, ④ 참, ⑤ 거짓

**계산 기준**
- 표에서는 같은 시료 열의 여러 값을 함께 사용해도 관찰 1개로 세었다.
- 지문 규칙만으로 선지를 반박할 수 있으면 `bogi_sources`는 0이다.
- V2④는 제조 초기 pH가 5라는 관찰만으로도 판정할 수 있다. ‘pH 5에서 양이온화된다’는 별도 관찰은 지문의 산성·양이온화 규칙으로 대체할 수 있으므로 최소 근거에서 제외했다.
- 주요 단계는 V1③이 **엔도솜 대응 → 두 시료의 상태 연결 → 방출 → 리보솜 결합**, V2④가 **가정된 pH 확인 → 산성 판정 → 양이온화 → 물과 혼합**, V2⑤가 **제조 방향 확인 → 방출 기전 확인 → 산성화를 pH 하강으로 변환 → 방향 비교**이다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 3,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "분자가 작아",
          "minimum_evidence": {
            "passage": "mRNA는 분자의 크기가 크고 음전하를 띠어 세포에 거의 흡수되지 않는다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "지문은 mRNA의 분자 크기가 크다고 했으므로, 작아서 흡수되지 않는다는 설명은 거짓이다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 2,
          "decisive_clause": "소수성 꼬리가 바깥을",
          "minimum_evidence": {
            "passage": "인지질의 친수성 머리는 수용액에 접하고, 소수성 꼬리는 서로 몰려 있는 상태로 배열된다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "수용액에 접하는 쪽은 친수성 머리이므로, 소수성 꼬리가 바깥을 향한다는 배열은 거꾸로이다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 3,
          "decisive_clause": "㉣의 mRNA가 리보솜과 결합할 수 있겠군",
          "minimum_evidence": {
            "passage": "세포막이 함입되면 엔도솜이 형성된다. 엔도솜 막이 불안정해지면 mRNA가 세포질로 방출되고, 방출된 mRNA는 리보솜과 결합한다.",
            "bogi": "㉣ 열: mRNA의 위치가 '막 안'이고 mRNA 동반 세포막 함입이 '있음'. ㉤ 열: 함입된 막의 상태가 '불안정'."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "㉣의 mRNA가 함입된 막 안에 있고 ㉤의 막이 불안정하다는 관찰을 확인해야 하며, 막 불안정에 따른 방출과 방출 후 리보솜 결합도 연결해야 한다."
          },
          "steps": 4,
          "bogi_sources": 2
        },
        {
          "n": 4,
          "decisive_clause": "항체가 합성되겠군",
          "minimum_evidence": {
            "passage": "mRNA에 담긴 유전 정보에 따라 리보솜에서 단백질이 합성된다.",
            "bogi": "설명 문장: 각 시료의 mRNA에는 같은 바이러스 단백질의 유전 정보가 담겨 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "㉢의 mRNA가 어떤 단백질의 유전 정보를 담는지 알아야 한다. 보기에서 바이러스 단백질을 암호화한다고 확인해야 항체라는 설명을 반박할 수 있다."
          },
          "steps": 1,
          "bogi_sources": 1
        },
        {
          "n": 5,
          "decisive_clause": "이온화 지질에서 유래한 것이겠군",
          "minimum_evidence": {
            "passage": "내포 작용은 세포막의 일부가 외부 물질과 함께 세포질로 함입되는 현상이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "함입되는 막은 세포막의 일부이므로, mRNA를 감쌌던 이온화 지질에서 유래했다는 설명은 거짓이다."
          },
          "steps": 1,
          "bogi_sources": 0
        }
      ],
      "closest_rival": {
        "n": 5,
        "observation": "㉣의 'mRNA 동반 세포막 함입'이 '있음'이다. 이 관찰에서 문제의 막은 함입된 세포막이며, mRNA를 감싼 이온화 지질과 구별된다."
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
      "answer": 4,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "세포핵 속 리보솜에서",
          "minimum_evidence": {
            "passage": "mRNA는 세포핵에서 전사되어 세포질로 내보내진 후 리보솜을 통해 단백질 합성에 쓰인다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "지문이 제시한 단백질 합성 장소는 세포핵이 아니라 세포질의 리보솜이다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 2,
          "decisive_clause": "결합한 mRNA보다 체내 효소로부터 더 잘 보호되겠군",
          "minimum_evidence": {
            "passage": "지질 나노 입자는 체내에서 쉽게 분해되는 mRNA를 보호하기 위해 이용된다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "지질의 기능이 mRNA 보호이므로, 지질과 결합하지 않은 mRNA가 결합한 mRNA보다 더 잘 보호된다는 설명은 보호 관계를 뒤집은 것이다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 3,
          "decisive_clause": "전기적 반발력이 생기는 것을 막지 못해",
          "minimum_evidence": {
            "passage": "양이온성 지질은 음전하를 띤 mRNA와 세포막 사이의 전기적 반발력이 발생하는 것을 막는다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "양이온성 지질이 전기적 반발을 막는다는 지문 규칙과 정면으로 충돌한다. 체내 투과 제한을 반발 방지 실패로 설명할 수 없다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 4,
          "decisive_clause": "물과 섞일 수 있겠군",
          "minimum_evidence": {
            "passage": "pH 7보다 낮은 용액은 산성이다. 낮은 pH에서는 이온화 지질이 양이온화된다. 전하를 띠는 물질은 친수성 물질로서 물과 섞인다.",
            "bogi": "제조 문장: ㉯를 제조할 때 용액의 pH를 5에서 8로 바꾸었다. 따라서 제조 초기 pH는 5이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "제조 초기 pH가 얼마인지 선지만으로는 알 수 없다. 보기에서 초기값 5를 확인한 뒤 산성, 양이온화, 물과의 혼합을 연결해야 한다."
          },
          "steps": 4,
          "bogi_sources": 1
        },
        {
          "n": 5,
          "decisive_clause": "㉯를 제조할 때 용액의 pH가 변한 방향과 같겠군",
          "minimum_evidence": {
            "passage": "엔도솜 내부의 산성화에 따라 막이 불안정해지고 mRNA가 방출된다. 산성화는 pH가 낮아지는 방향의 변화이다.",
            "bogi": "제조 문장: ㉯를 제조할 때 용액의 pH를 5에서 8로 바꾸었으므로 제조 시에는 pH가 상승했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "방출 기전이 산성화라는 사실만으로는 제조 때의 변화 방향을 알 수 없다. 보기의 5→8을 확인해야 하강과 상승이 반대임을 판정할 수 있다."
          },
          "steps": 4,
          "bogi_sources": 1
        }
      ],
      "closest_rival": {
        "n": 5,
        "observation": "㉯의 제조 pH가 5→8로 상승했다는 관찰이다. 이 초기값 5는 ④의 양이온화 판단을 뒷받침하지만, 상승 방향은 방출을 유도하는 산성화의 하강 방향과 반대여서 ⑤를 배제한다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [
        4
      ],
      "weak": []
    }
  ]
}
```