**정답: ③.** 〈보기〉의 청구 경로를 제시된 순서대로 읽으면, 갑은 을의 미납에 대해 병에게 곧바로 지급을 청구했다. 연대 보증 특약이 없는 병이 을에게 강제 집행 대상 재산이 있음을 증명했다면 지급을 거절할 수 있다. ③은 이를 반대로 진술했다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 3,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "을은 손해 배상을 받을 권리가 없다",
          "minimum_evidence": {
            "passage": "3문단: 하자에 대한 담보 책임의 내용은 원칙적으로 손해 배상이다. 매수인이 계약 체결 당시 하자를 알 수 있었으면 담보 책임은 인정되지 않는다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "〈보기〉는 필요 없지만, 담보 책임이 배제된다는 사실에 더해 하자에 따른 손해 배상이 그 책임의 내용이라는 관계가 필요하다."
          },
          "steps": 2,
          "bogi_sources": 0,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "을은 그 대금의 환불을 받을 권리가 없다",
          "minimum_evidence": {
            "passage": "3문단: 하자로 인해 계약 목적을 달성할 수 없을 때 예외적으로 계약을 파기하고 대금 환불을 청구할 수 있다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지가 계약 목적을 달성할 수 있다고 가정했으므로, 하자를 이유로 한 대금 환불의 예외 요건을 충족하지 않는다."
          },
          "steps": 1,
          "bogi_sources": 0,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "1,000만 원의 지급을 거절할 수 없다",
          "minimum_evidence": {
            "passage": "7문단: 채권자가 주채무자에게 먼저 청구하지 않고 보증인에게 곧바로 청구하면, 보증인은 주채무자의 강제 집행 대상 재산을 증명해 이행을 거절할 수 있다. 연대 보증 특약은 이 권리를 포기하는 약정이다.",
            "bogi": "① 갑은 을의 대금 채무에 관해 병과 보증 계약을 맺었다. ② 마지막 문장에서 갑은 을의 미납에 대해 병에게 지급을 청구한다. 서술상 병에게 곧바로 청구한 것으로 읽히며, 을에 대한 선행 청구가 없었다고 별도로 명시하지는 않았다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "갑이 채권자, 을이 주채무자, 병이 보증인이라는 관계와, 갑이 을의 미납에 대해 병에게 곧바로 청구했다는 상황이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "보증 계약의 무효를 주장할 수 없다",
          "minimum_evidence": {
            "passage": "6문단: 계약서를 작성하지 않은 보증 계약은 무효이지만, 보증 채무를 이행한 보증인은 그 무효를 주장할 수 없다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "병이 을 대신 대금을 지급했다는 것은 보증 채무를 이행했다는 뜻이므로, 계약서 미작성을 이유로 무효를 주장할 수 없다."
          },
          "steps": 2,
          "bogi_sources": 0,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "제2조를 어떤 방법으로 해석하든 병은 갑에게 1,000만 원을 지급할 의무가 없다",
          "minimum_evidence": {
            "passage": "6문단: 보증인의 서명이나 기명 날인이 없는 보증 계약은 무효이다. 8문단: 특별법 제2조의 해석 쟁점은 연대 보증인에게 그 법을 적용할지 여부이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "〈보기〉는 필요 없지만, 민법상 형식 위반으로 계약이 무효라는 사실과 특별법 제2조의 해석이 보호 대상의 범위에 관한 것이라는 구분이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 0,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 5,
        "observation": "③과 달리 ⑤에는 병의 서명도 날인도 없다. 따라서 ⑤는 연대 보증인의 거절권을 따지기 전에 보증 계약 자체가 무효이다."
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