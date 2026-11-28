**V1 정답: ④.** 갑의 저울은 광고와 달랐고, 갑은 저울을 받아 그 차이를 확인한 지 10일 뒤에 철회 의사를 전했다. 별도 철회의 두 기한을 모두 충족하므로, 갑이 저울 본체를 깨뜨렸어도 철회할 수 있다. ③에서 계약서면 수령일인 4월 1일부터 세면 17일이지만, 법정 기산일은 저울을 받은 4월 8일이다.

**V2 정답: ②.** 갑은 사업장 밖에서 구매를 권유받아 그 자리에서 신청했으므로 방문판매에 해당한다. ㉮가 더 필요 없다는 이유로 철회하는 것은 단순 변심이지만, 방문판매에서는 이 경우에도 판매업자가 반환 비용을 부담한다. ㉯는 용량 차이를 실제로 안 지 3일밖에 안 됐어도, 알 수 있었던 날부터는 31일이 지났고 공급받은 날부터도 넉 달이 지났다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 4,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "통신판매에 해당하겠군",
          "minimum_evidence": {
            "passage": "5문단: 사업장 밖에서 구매를 권유한 판매원이 소비자와 함께 사업장 안으로 이동해 그곳에서 구매 신청을 받으면 방문판매에 해당한다.",
            "bogi": "갑은 사업장 밖의 행사장 통로에서 구매를 권유받았다. 갑은 판매원과 함께 매장에 들어가 구매를 신청했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "인터넷에 판매 정보가 올라 있었다는 사실만으로는 거래 유형을 확정할 수 없다. 매장에 들어가기 전에 사업장 밖에서 구매를 권유받았다는 관찰이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "통신판매의 일반 철회 기간 안에 들겠군",
          "minimum_evidence": {
            "passage": "3문단: 통신판매의 일반 철회 기간은 7일이다.",
            "bogi": "을의 저울 수령일은 4월 8일이고, 철회 통보일은 4월 18일이다. 수령일부터 통보일까지 10일이 지났다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "일반 철회 기간이 7일임을 알아도 저울 수령일부터 철회 통보일까지 며칠이 지났는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "계약서면을 받은 날부터 계산할 때",
          "minimum_evidence": {
            "passage": "1문단: 계약서면을 먼저 받고 물품을 나중에 받았다면 일반 철회 기간은 물품을 받은 날부터 계산한다.",
            "bogi": "갑은 계약서면을 4월 1일에, 저울을 4월 8일에 받았다. 나중에 받은 것은 저울이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "계약서면 수령일을 기산일로 삼을 수 있는지 판정하려면 갑이 계약서면과 저울 중 어느 것을 나중에 받았는지 알아야 한다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "저울 본체를 깨뜨렸더라도 청약을 철회할 수 있겠군",
          "minimum_evidence": {
            "passage": "1문단: 물품이 광고와 다르면 공급일부터 3개월 이내이면서 차이를 알았거나 알 수 있었던 날부터 30일 이내에 철회할 수 있다. 이 경우 소비자 책임에 따른 훼손 제한은 적용되지 않는다.",
            "bogi": "갑은 4월 8일에 저울을 받았다. 광고상 최대 무게는 5kg이었다. 갑은 받은 날 실제로는 3kg까지만 잴 수 있음을 확인했다. 철회 통보일은 4월 18일이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "별도 철회에 훼손 제한이 적용되지 않는다는 사실만으로 철회 가능성이 확정되지는 않는다. 광고와 실제 성능이 다른지, 두 기한을 모두 지켰는지 확인해야 한다."
          },
          "steps": 6,
          "bogi_sources": 4,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "을이 반환 비용을 부담하겠군",
          "minimum_evidence": {
            "passage": "1문단: 광고와 다른 물품을 공급받아 그 차이를 이유로 철회할 때는 사업자가 반환 비용을 부담한다.",
            "bogi": "을의 저울은 광고상 5kg까지 잴 수 있었지만, 실제로는 3kg까지만 잴 수 있었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지의 '최대 무게의 차이'가 광고와 실제 성능 사이의 차이인지는 선지만으로 확정할 수 없다. 광고값과 실측값이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "갑은 계약서면보다 저울을 나중에 받았다. 따라서 일반 철회 기간을 4월 1일부터 계산한 ③은 틀리고, ④는 공급일과 차이 확인일인 4월 8일을 기준으로 별도 철회 기한을 충족한다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [4],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "일반 철회와 별도로 청약을 철회할 사유가 있겠군",
          "minimum_evidence": {
            "passage": "1문단: 물품이 표시·광고 내용이나 계약 내용과 다르게 공급되면 별도 철회 사유가 된다.",
            "bogi": "㉮의 실제 용량은 광고와 계약에 적힌 대로 500mL였다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "별도 철회 사유를 알아도 ㉮의 실제 용량이 광고·계약에 적힌 용량과 일치하는지는 알 수 없다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "㉮의 반환 비용은 판매업자가 부담하겠군",
          "minimum_evidence": {
            "passage": "2·4문단: 사업장 밖에서 구매를 권유하고 그 자리에서 구매 신청을 받으면 방문판매에 해당한다. 방문판매에서는 단순 변심으로 철회해도 판매업자가 반환 비용을 부담한다.",
            "bogi": "판매원은 사업장 밖에서 갑에게 구매를 권유했다. 갑은 그 자리에서 ㉮의 구매를 신청했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "'더 필요 없다'는 이유가 단순 변심임은 선지에서 알 수 있지만, 반환 비용 부담자를 정하려면 구매 권유와 신청이 어떻게 이루어졌는지 알아야 한다."
          },
          "steps": 4,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "일반 철회의 제한 사유에 해당하지 않겠군",
          "minimum_evidence": {
            "passage": "1문단: 소비자의 책임으로 물품이 훼손되면 일반 철회가 제한된다. 내용 확인을 위해 포장만 훼손한 경우는 예외다.",
            "bogi": "갑은 ㉯를 떨어뜨려 본체를 깨뜨렸다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지에는 ㉯가 훼손됐다고만 되어 있어, 소비자의 책임으로 물품 자체가 훼손된 것인지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "별도 철회 기한이 지나지 않았겠군",
          "minimum_evidence": {
            "passage": "1문단: 차이를 알았거나 알 수 있었던 날부터 30일 이내에 별도 철회를 해야 한다.",
            "bogi": "갑은 철회 의사를 전하기 31일 전부터 ㉯의 용량 차이를 알 수 있었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "30일 기준을 알아도 차이를 알 수 있었던 날부터 철회 통보일까지의 경과 일수가 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "별도 철회 기한 안에 들겠군",
          "minimum_evidence": {
            "passage": "1문단: 별도 철회는 물품을 공급받은 날부터 3개월 이내에 해야 한다.",
            "bogi": "갑이 철회 의사를 전했을 때 ㉯를 공급받은 지 넉 달이 지나 있었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "3개월 기준을 알아도 ㉯의 공급일부터 철회 통보일까지 얼마나 지났는지 알 수 없다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "갑은 통보 31일 전부터 ㉯의 차이를 알 수 있었다. 실제로 안 것은 통보 3일 전이지만, ④가 기준으로 삼은 '알 수 있었던 날'부터는 이미 30일이 지났다."
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