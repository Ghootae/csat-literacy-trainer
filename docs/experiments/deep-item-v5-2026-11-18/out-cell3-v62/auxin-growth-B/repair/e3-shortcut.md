- **V1: ⑤.** ⓓ의 농도가 ⓒ보다 높으므로 그늘진 쪽은 ⓓ에 해당한다. 그래프에서 ⓓ의 길이 증가량은 ⓒ보다 작다. 다만 **②는 거짓으로 확정할 수 없다.** 빛을 받은 쪽이 ⓓ라는 것은 알 수 있지만, ⓓ가 생장 억제 구간인지는 제시되지 않았다. 따라서 ⑤만 자료로 뒷받침되지만, ‘나머지 넷은 거짓’이라는 조건은 충족되지 않는다. ⑤의 ‘덜 촉진’은 ⓒ와의 상대 비교이며, ⓓ에서 무처리 때보다 생장이 촉진된다는 뜻으로까지 확정할 수는 없다.
- **V2: ②.** A는 빛이 닿는 왼쪽으로 굽는다. B에서는 양쪽 농도가 모두 최고 생장점 이전의 촉진 범위에 있고, 왼쪽 농도(6)가 오른쪽(2)보다 높으므로 왼쪽 생장이 더 촉진된다.

그래프의 축 정의는 관찰을 읽는 기준으로 삼고, 점의 순서·구간의 증감·최고점 표시는 별도 관찰로 셌다. 표는 같은 기관 열의 여러 값을 한 관찰로 묶었다. V1의 ②는 정오를 확정할 수 없어 `steps`와 `bogi_sources`를 `null`로 표기했다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 5,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "생장을 촉진한 경우는 ⓐ이겠군",
          "minimum_evidence": {
            "passage": "2문단: 옥신은 세포벽을 산성화하여 세포 생장을 유도한다.",
            "bogi": "농도 순서는 ⓐ<ⓑ이고, ⓐ에서 ⓑ로 갈 때 길이 증가량이 커진다. 따라서 ⓐ에서 옥신이 생장을 촉진했다면 ⓑ에서도 촉진한 것이므로, 둘 중 ⓐ만 촉진 사례로 고를 수 없다. ⓐ가 0μmol/L일 필요는 없다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "옥신의 산성화 작용만으로는 두 점을 구별할 수 없다. ⓐ와 ⓑ의 농도 순서 및 길이 증가량의 변화가 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "빛을 받은 쪽에서는 옥신 때문에 생장이 억제되겠군",
          "minimum_evidence": {
            "passage": "4문단: 빛을 받은 쪽보다 그늘진 쪽에 옥신이 더 많이 분포한다. 3문단: 최고 생장점 이후 촉진 정도가 낮아져도, 일정 농도에 이르러야 생장이 억제된다.",
            "bogi": "ⓓ<ⓔ이므로 빛을 받은 쪽은 ⓓ이다. ⓓ는 최고점 ⓒ의 오른쪽이지만, ⓓ의 길이 증가량이 무처리 때보다 작은지 또는 ⓓ가 억제 구간에 속하는지는 제시되지 않았다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "빛에 따른 재분포 원리만으로는 빛을 받은 쪽의 농도 표지를 정할 수 없고, 그 농도가 억제 구간인지도 알 수 없다."
          },
          "steps": null,
          "bogi_sources": null,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "더 높은 값이 줄기의 생장 반응이 시작되는 농도에 더 가깝겠군",
          "minimum_evidence": {
            "passage": "3문단: 생장 반응이 시작된 뒤 농도가 증가하면 촉진 정도가 높아져 최고 생장점에 이른다.",
            "bogi": "ⓒ는 최고점이고 농도 순서는 ⓒ<ⓓ<ⓔ이다. 반응이 시작되는 농도는 ⓒ보다 낮으므로, 두 값 중 더 낮은 ⓓ가 시작 농도에 더 가깝다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "시작 농도가 최고 생장점보다 낮다는 사실만으로는 ⓓ와 ⓔ가 최고 생장점의 어느 쪽에 있는지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "녹말체는 농도가 ⓑ의 값인 쪽으로 이동했겠군",
          "minimum_evidence": {
            "passage": "5문단: 수평으로 놓인 줄기에서 녹말체는 아래쪽으로 이동하고 옥신도 아래쪽에 더 많이 분포한다.",
            "bogi": "ⓑ<ⓒ이므로 옥신 농도가 더 높은 아래쪽은 ⓒ 쪽이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "녹말체와 옥신이 모두 아래쪽에 모인다는 사실만으로는 ⓑ와 ⓒ 중 어느 쪽이 더 높은 농도인지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "그늘진 쪽의 생장은 옥신 농도가 ⓒ의 값일 때보다 덜 촉진되겠군",
          "minimum_evidence": {
            "passage": "4문단: 한쪽에서 빛을 받은 줄기에서는 그늘진 쪽에 옥신이 더 많이 분포한다.",
            "bogi": "ⓒ<ⓓ이므로 그늘진 쪽은 ⓓ이다. ⓒ에서 ⓓ로 갈 때 같은 시간 동안의 길이 증가량이 감소하므로, ⓓ의 생장 효과는 ⓒ보다 작다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "그늘진 쪽의 농도가 더 높다는 사실만으로는 ⓒ와 ⓓ 중 어느 쪽이 그늘인지, 그쪽의 길이 증가량이 더 작은지 알 수 없다."
          },
          "steps": 4,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "ⓓ의 길이 증가량이 ⓒ보다 작다는 관찰은 ⑤의 상대 비교에는 충분하지만, ②의 생장 억제를 확정하는 데는 충분하지 않다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [5],
      "weak": [2]
    },
    {
      "version": "V2",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "D가 생장 반응을 시작하기에는 낮겠군",
          "minimum_evidence": {
            "passage": "3문단: 생장 반응이 시작되는 옥신 농도는 뿌리가 눈보다 낮다.",
            "bogi": "C는 눈이고 D는 뿌리이다. 선지의 앞 절대로 D의 농도가 C의 시작 농도와 같다면, 그 농도는 이미 D의 시작 농도보다 높다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "기관별 시작 농도의 순서를 알아도 C와 D가 각각 어떤 기관인지 모르면 그 순서를 적용할 수 없다."
          },
          "steps": 2,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "A가 굽는 쪽은 B에서 옥신이 생장을 더 촉진하는 쪽과 같겠군",
          "minimum_evidence": {
            "passage": "4문단: 줄기는 빛이 닿는 쪽으로 굽는다. 3문단: 최고 생장점 이전의 촉진 범위에서는 농도가 높을수록 생장이 더 촉진된다.",
            "bogi": "줄기 A에는 왼쪽에서 빛이 닿는다. 줄기 B의 왼쪽 농도는 6, 오른쪽은 2이다. 두 값 모두 줄기의 최고 생장점 이전 촉진 범위인 2~8에 속하므로 B에서는 왼쪽 생장이 더 촉진된다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "A의 빛 방향과 B의 양쪽 농도 및 그 농도가 속하는 반응 구간을 모르면 두 방향의 일치를 확인할 수 없다."
          },
          "steps": 5,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "두 줄기에서 옥신이 생장을 더 촉진하는 쪽도 같겠군",
          "minimum_evidence": {
            "passage": "3문단: 최고 생장점 이전의 촉진 범위에서는 농도가 높을수록 생장이 더 촉진된다.",
            "bogi": "왼쪽과 오른쪽 농도는 A가 (4, 8), E가 (4, 3)이다. 네 값 모두 최고 생장점 이전의 촉진 범위인 2~8에 속한다. 따라서 A는 오른쪽, E는 왼쪽이 더 촉진된다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "왼쪽 농도가 같다는 정보만으로는 각 줄기에서 어느 쪽 농도가 더 높은지 알 수 없다. 두 오른쪽 농도와 반응 구간이 필요하다."
          },
          "steps": 5,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "극성 수송 경로를 따라 오른쪽에서 왼쪽으로 이동했겠군",
          "minimum_evidence": {
            "passage": "4문단: 한쪽 빛을 받은 줄기에서 밝은 쪽에서 그늘진 쪽으로 일어나는 옥신 이동은 기존의 극성 수송을 따르던 옥신 일부의 재분포이다.",
            "bogi": "B는 오른쪽에 빛이 닿는 줄기이다. 오른쪽에서 왼쪽으로의 이동은 빛을 받은 쪽에서 그늘진 쪽으로의 재분포에 해당한다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "극성 수송과 재분포를 구별하더라도, 표 없이는 B의 오른쪽에서 왼쪽으로의 이동이 줄기의 밝은 쪽에서 그늘진 쪽으로의 이동인지 확인할 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "오른쪽이 왼쪽보다 더 자라겠군",
          "minimum_evidence": {
            "passage": "3문단: 최고 생장점 이전의 촉진 범위에서는 농도가 높을수록 생장이 더 촉진된다.",
            "bogi": "E의 왼쪽 농도는 4, 오른쪽은 3이고, 둘 다 최고 생장점 이전의 촉진 범위인 2~8에 속한다. 빛이 닿는 쪽이 바뀌어도 농도가 그대로라는 조건에서는 왼쪽이 더 자란다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "농도와 생장의 관계를 알아도 E의 좌우 농도와 그 값들이 속하는 반응 구간을 모르면 어느 쪽이 더 자라는지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "두 줄기의 왼쪽 농도는 4로 같지만, 오른쪽 농도는 A에서 4보다 높고 E에서 4보다 낮다."
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