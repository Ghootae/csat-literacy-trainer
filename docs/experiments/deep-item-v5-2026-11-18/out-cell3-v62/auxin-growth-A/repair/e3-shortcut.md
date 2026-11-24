**정답: V1 ③, V2 ④.** 두 문항 모두 부정 발문이므로, 내용상 거짓인 선지를 고른다.

- **V1:** 그래프의 0은 표지 IAA의 **검출량**이다. 가운데에 넣은 표지 IAA는 ㉠에서는 높은 쪽인 ⓑ 쪽으로, ㉡에서는 낮은 쪽인 ⓒ 쪽으로 이동했다. 지면 기준으로는 두 방향이 반대지만, 극성 수송의 기준인 **조각의 원래 상·하단**으로 보면 ⓑ와 ⓒ는 둘 다 원래 하단 쪽이다.
- **V2:** 수평으로 놓인 A의 줄기와 B의 뿌리에서는 모두 **아래쪽**에 옥신이 더 많이 분포한다. 두 기관이 반대 방향으로 굽는 까닭은 옥신이 모이는 쪽이 달라서가 아니라, 옥신이 많이 모인 아래쪽의 생장이 줄기에서는 촉진되고 뿌리에서는 억제되기 때문이다.

〈보기〉 관찰 수는 V1에서는 판정에 쓰인 조각별 검출 양상을, V2에서는 판정에 쓰인 식물별 열을 각각 하나로 셌다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 3,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "IAA가 주로 생성되던 쪽에 ⓒ보다 ⓓ가 더 가까웠겠군",
          "minimum_evidence": {
            "passage": "1문단: IAA는 주로 줄기 상단부에서 생성되고, 하단부 쪽으로 극성 수송된다.",
            "bogi": "㉡의 검출량은 낮은 쪽 ⓒ에서 양수이고 높은 쪽 ⓓ에서 0이다. 가운데에 넣은 표지 IAA가 ⓒ 쪽에서 검출되었으므로 ⓒ는 원래 하단 쪽, ⓓ는 원래 상단 쪽이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "IAA가 원래 상단부에서 주로 생성된다는 사실만으로는 ⓒ와 ⓓ 중 어느 쪽이 원래 상단에 가까운지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "두 조각 모두 지면에 가까운 끝에서 표지 IAA가 검출되겠군",
          "minimum_evidence": {
            "passage": "1문단: 극성 수송은 줄기의 원래 상단부에서 하단부 쪽으로 일어나며 중력과 무관하다.",
            "bogi": "표지 IAA가 검출된 ⓑ는 ㉠의 높은 쪽이고, ⓒ는 ㉡의 낮은 쪽이다. ㉠만 뒤집으면 ㉠의 원래 하단인 ⓑ 쪽이 지면에 가까워지고, ㉡의 ⓒ 쪽은 그대로 낮은 쪽에 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "극성 수송이 중력과 무관하다는 사실만으로는 뒤집기 전 두 조각의 원래 하단이 각각 지면 기준 어느 쪽인지 알 수 없다."
          },
          "steps": 4,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "ⓑ와 ⓒ는 서로 반대쪽 끝이겠군",
          "minimum_evidence": {
            "passage": "1문단: 줄기에서 IAA가 극성 수송되는 방향은 원래 상단부에서 하단부 쪽이다.",
            "bogi": "가운데에 넣은 표지 IAA가 ㉠에서는 ⓑ 쪽, ㉡에서는 ⓒ 쪽에서 검출되었다. 따라서 ⓑ와 ⓒ는 지면 기준 높낮이는 반대이지만 둘 다 원래 하단 쪽이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "IAA가 원래 하단 쪽으로 수송된다는 사실만으로는 ⓑ와 ⓒ가 각 조각에서 표지 IAA가 수송된 쪽인지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "ⓑ 쪽으로 수송되던 옥신의 일부가 그늘진 쪽의 생장을 촉진했겠군",
          "minimum_evidence": {
            "passage": "4문단: 줄기에 한쪽에서 빛을 비추면 극성 수송되던 옥신 일부가 그늘진 쪽으로 재분포하고, 그쪽의 옥신 농도가 높아져 생장이 촉진된다.",
            "bogi": "빛이 없는 조건에서 ㉠의 가운데에 넣은 표지 IAA는 ⓐ 쪽이 아니라 ⓑ 쪽에서 검출되었다. 따라서 ㉠의 기존 수송 방향은 ⓑ 쪽이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "굴광성 원리만으로 그늘진 쪽의 생장 촉진은 설명할 수 있지만, 기존 수송 방향이 ⓑ 쪽인지는 확인할 수 없다."
          },
          "steps": 3,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "두 조각 모두에서 표지 IAA가 가운데를 향해 극성 수송되겠군",
          "minimum_evidence": {
            "passage": "1문단: 줄기의 IAA 극성 수송은 원래 상단부에서 하단부 쪽으로 일어난다.",
            "bogi": "가운데에서 출발한 표지 IAA는 ㉠에서 ⓑ 쪽, ㉡에서 ⓒ 쪽으로 이동했다. 반대편인 ⓐ와 ⓓ는 각각 원래 상단 쪽이므로, 그곳에서 출발하면 수송 방향은 가운데를 향한다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "원래 상단에서 하단으로 수송된다는 사실만으로는 새 주입점인 ⓐ와 ⓓ가 각각 가운데의 어느 쪽에 있는지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "표지 IAA가 검출된 ⓑ는 지면 기준 높은 쪽이고 ⓒ는 낮은 쪽이다. 둘 다 원래 하단 쪽이므로 ③은 거짓이지만, ㉠만 뒤집으면 ⓑ 쪽도 지면에 가까워지므로 ②는 참이다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [3],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 4,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "오른쪽의 옥신 농도가 왼쪽보다 높아지겠군",
          "minimum_evidence": {
            "passage": "4문단: 한쪽에서 빛을 받은 줄기에서는 옥신이 그늘진 쪽으로 재분포해 그쪽 농도가 높아진다.",
            "bogi": "C열: 수직 줄기의 왼쪽에서만 빛을 비추므로 그늘진 쪽은 오른쪽이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "옥신이 그늘진 쪽으로 재분포한다는 사실만으로는 C의 오른쪽이 그늘인지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "녹말체가 이동하는 쪽과 D에서 포토트로핀이 활성화되는 쪽은 서로 다르겠군",
          "minimum_evidence": {
            "passage": "5문단: 수평으로 놓인 줄기와 뿌리의 녹말체는 아래쪽으로 이동한다. 4문단: 포토트로핀은 빛을 받은 쪽에서 활성화된다.",
            "bogi": "A열: 줄기가 수평이다. B열: 뿌리가 수평이다. D열: 줄기의 위쪽에서 빛을 비춘다. 따라서 비교하는 방향은 아래쪽과 위쪽이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "A와 B의 고정 자세와 D의 조명 방향을 확인하지 않고는 두 방향이 다른지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "옥신이 아래쪽에 더 많이 분포해 아래쪽 세포의 생장을 억제하겠군",
          "minimum_evidence": {
            "passage": "5문단: 수평으로 놓인 뿌리에서는 옥신이 아래쪽에 더 많이 분포하고, 뿌리의 옥신 감수성 때문에 아래쪽 세포의 생장이 억제된다.",
            "bogi": "B열: 뿌리가 수평으로 고정되어 있고 빛을 비추지 않는다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "수평 뿌리의 아래쪽에서 생장이 억제된다는 사실만으로는 B가 그 조건을 충족하는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "옥신이 더 많이 분포하는 쪽이 서로 다르기 때문에",
          "minimum_evidence": {
            "passage": "5문단: 줄기와 뿌리를 수평으로 놓으면 두 기관 모두 아래쪽에 옥신이 더 많이 분포한다.",
            "bogi": "A열: 빛을 비추지 않은 수평 줄기이다. B열: 빛을 비추지 않은 수평 뿌리이다. 두 기관 모두 아래쪽에 옥신이 더 많이 분포한다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "수평인 줄기와 뿌리의 옥신이 모두 아래쪽에 모인다는 사실만으로는 A와 B의 고정 자세를 알 수 없어 그 규칙을 적용할 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "빛에 따라서도, 중력에 따라서도 옥신이 아래쪽으로 재분포하겠군",
          "minimum_evidence": {
            "passage": "4문단: 빛 자극을 받은 줄기에서는 옥신이 그늘진 쪽으로 재분포한다. 5문단: 수평 줄기에서는 중력 자극에 따라 옥신이 아래쪽으로 재분포한다.",
            "bogi": "D열: 위쪽에서만 빛을 비춘 수평 줄기이다. 빛 자극에서 그늘진 쪽도 중력 자극에서 옥신이 모이는 쪽도 아래쪽이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "D의 자세와 빛을 비춘 쪽을 확인하지 않고는 두 자극이 모두 아래쪽 재분포를 유도하는지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "A도 B와 같은 수평 자세라는 점이 둘을 가른다. B에서 아래쪽에 옥신이 모여 생장이 억제된다는 ③은 참이지만, A도 아래쪽에 옥신이 모이므로 분포 방향이 서로 다르다는 ④는 거짓이다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [4],
      "weak": []
    }
  ]
}
```