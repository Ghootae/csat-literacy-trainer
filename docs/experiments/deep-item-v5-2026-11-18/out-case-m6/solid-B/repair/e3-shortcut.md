**정답: V1 ②, V2 ⑤**

- **V1:** 반응물이 처음 화학 흡착되는 곳은 지지체 자체가 아니라 그 위에 분산된 금속 입자의 표면이다. 따라서 ㉮에서는 지지체 바깥쪽, ㉯에서는 구멍 안쪽에서 흡착이 일어난다. ④의 생성물은 확인 당시 금속 입자에 붙어 있었으므로 아직 탈착되지 않았다.
- **V2:** 초기 흡착 세기 8은 적정 범위인 3~5보다 높고, 후반의 4는 그 범위 안에 있다. 따라서 후반에는 흡착이 너무 강한 조건에서 벗어났으며, 흡착이 약한 조건에도 들지 않았다. ②의 전자 밀도 변화는 지문이 흡착 세기 조절과 연결하는 변화다. 그 변화가 소결까지 억제했다는 결론은 자료가 뒷받침하지 않는다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 2,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "고체 촉매에 필요한 성분이 빠져",
          "minimum_evidence": {
            "passage": "4문단: 활성 성분은 필수지만 증진제는 없어도 된다.",
            "bogi": "㉮에는 증진제가 있고 ㉯에는 없다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "활성 성분만 필수라는 사실을 알아도, 선지에는 ㉯에 빠졌다는 성분이 무엇인지 나와 있지 않다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false,
          "fact_sensitive": false,
          "fact_change": "증진제는 필수 성분이 아니다(4문단). 증진제 유무만 바꿔서는 ①이 참이 되지 않으며, ㉯에 활성 성분이 없다고 바꾸면 ㉯가 활성화 에너지를 2로 낮췄다는 나머지 관찰과 양립하지 않는다."
        },
        {
          "n": 2,
          "decisive_clause": "㉮에서는 지지체 바깥쪽이고 ㉯에서는 구멍 안쪽이지만, 두 시료 모두 반응물이 직접 붙는 곳은 지지체 자체가 아니라 금속 입자의 표면",
          "minimum_evidence": {
            "passage": "3문단: 지지체에 분산한 작은 금속 입자를 활성 성분으로 쓴다. 2문단: 반응물은 먼저 활성 성분의 표면에 화학 흡착된다.",
            "bogi": "두 시료 모두 지지체에 작은 금속 입자를 분산했다. 그 입자의 분산 위치는 ㉮가 지지체 바깥 면, ㉯가 구멍 안쪽 면이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "활성 성분 표면에 먼저 흡착된다는 사실만으로는 두 시료의 금속 입자가 각각 어디에 분산되었는지 알 수 없다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "㉮의 금속 입자를 바깥 면이 아니라 구멍 안쪽 면에만 분산함 → ㉮의 최초 흡착 위치도 구멍 안쪽이므로 ②는 거짓이다."
        },
        {
          "n": 3,
          "decisive_clause": "㉮를 쓸 때의 활성화 에너지에도 못 미치겠군",
          "minimum_evidence": {
            "passage": "",
            "bogi": "㉮를 쓸 때 활성화 에너지는 4이다. 선지가 가정한 운동 에너지 6은 4보다 크다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "촉매가 활성화 에너지를 바꾼다는 사실만으로는 ㉮ 사용 시의 활성화 에너지가 6보다 큰지 작은지 알 수 없다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "내용 확인",
          "bogi_only": true,
          "fact_sensitive": true,
          "fact_change": "㉮를 쓸 때 활성화 에너지가 4가 아니라 9임 → 6은 무촉매 값 8에 못 미치고, 8보다 높은 ㉮의 값 9에도 못 미치므로 ③은 참이다."
        },
        {
          "n": 4,
          "decisive_clause": "그 생성물을 내는 반응은 완결되었겠군",
          "minimum_evidence": {
            "passage": "2문단: 생성물이 활성 성분 표면에서 탈착되어야 반응이 완결된다.",
            "bogi": "㉯에서 처음 확인된 생성물은 구멍 안의 금속 입자에 붙어 있었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "탈착이 완결의 조건이라는 사실만으로는 처음 확인된 생성물이 그때 탈착된 상태였는지 알 수 없다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": false,
          "fact_change": "반응 완결의 조건은 생성물의 탈착이다(2문단). 처음부터 탈착된 생성물을 확인했다고 바꾸면 완결 결론은 맞지만, 별도 분리 공정이 필요 없다는 사실이 완결의 근거가 되는 것은 아니다."
        },
        {
          "n": 5,
          "decisive_clause": "㉯가 분자의 운동 에너지를 높였기 때문",
          "minimum_evidence": {
            "passage": "1문단: 촉매는 활성화 에너지가 다른 반응 경로를 제공한다. 선지는 비교하는 분자의 운동 에너지를 3으로 고정했다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "운동 에너지를 3으로 고정해 비교하므로, 촉매 사용에 따른 문턱 통과 여부의 차이는 분자의 운동 에너지가 아니라 반응 경로의 활성화 에너지 차이에서 생긴다."
          },
          "steps": 1,
          "bogi_sources": 0,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": false,
          "fact_change": "촉매는 활성화 에너지가 다른 반응 경로를 제공한다(1문단). 〈보기〉의 활성화 에너지 값을 바꿔도 선지가 3으로 고정한 운동 에너지가 높아진 것은 아니다."
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "처음 확인한 생성물이 구멍 안 금속 입자에 붙어 있었다. 이는 금속 표면에서 생성물이 생겼다는 것과 그 표면에서 탈착되어 반응이 완결됐다는 것을 구분해 준다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [2],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 5,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "흡착된 반응물들이 서로 달라붙는 소결",
          "minimum_evidence": {
            "passage": "3문단: 소결은 작은 금속 입자들이 서로 달라붙어 큰 입자를 이루는 현상이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "소결에서 서로 달라붙는 것은 금속 표면에 흡착된 반응물이 아니라 작은 금속 입자다."
          },
          "steps": 1,
          "bogi_sources": 0,
          "task": "내용 확인",
          "bogi_only": false,
          "fact_sensitive": false,
          "fact_change": "작은 금속 입자들이 서로 달라붙어 큰 입자를 이루는 현상을 소결이라 한다(3문단)."
        },
        {
          "n": 2,
          "decisive_clause": "그 변화를 통해 소결을 억제했겠군",
          "minimum_evidence": {
            "passage": "4문단: 증진제의 표면 구조 변화는 소결 억제와, 전자 밀도 변화는 흡착 세기 조절과 연결된다.",
            "bogi": "후반에 관찰된 금속 표면의 변화는 전자 밀도의 변화였다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "선지의 ‘그 변화’가 표면 구조 변화인지 전자 밀도 변화인지 〈보기〉를 읽어야 알 수 있다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "후반의 표면 관찰을 전자 밀도 변화에서 금속 입자끼리 달라붙는 것을 막는 표면 구조 변화로 바꿈 → 증진제가 그 변화를 일으켰다는 선지의 조건 아래에서는 그 변화를 통한 소결 억제가 성립한다."
        },
        {
          "n": 3,
          "decisive_clause": "가동 초기에는 가동 후반보다 흡착된 반응물이 표면에서 더 빠르게 생성물로 바뀌었겠군",
          "minimum_evidence": {
            "passage": "2문단: 흡착이 너무 강하면 흡착된 반응물이 지나치게 안정화되어 표면 반응이 느려진다.",
            "bogi": "적정 범위는 3~5, 초기값은 8, 후반값은 4이다. 초기에는 흡착이 지나치게 강했고 후반에는 적정했다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "초기 흡착이 더 강하다는 말만으로는 그것이 적정 범위를 넘었는지, 후반 흡착은 어느 범위에 속하는지 알 수 없다."
          },
          "steps": 4,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": false,
          "fact_change": "흡착이 지나치게 강하면 표면 반응이 느려지고, 약하면 흡착량이 적어진다(2문단). 범위나 측정값을 바꿔 현재의 반증을 없애더라도, 흡착이 더 강했던 초기의 표면 전환이 더 빠르다는 결론은 이 자료로 뒷받침되지 않는다."
        },
        {
          "n": 4,
          "decisive_clause": "금속 활성 성분의 전체 표면적을 늘리는 효과",
          "minimum_evidence": {
            "passage": "3문단: 작은 금속 입자들이 붙어 큰 입자가 되는 것은 소결이며, 소결되면 전체 표면적은 줄어든다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "〈보기〉의 추가 관찰은 필요 없지만, 선지에 묘사된 입자 합체가 소결이라는 정의와 소결이 전체 표면적을 줄인다는 관계를 이어야 한다."
          },
          "steps": 2,
          "bogi_sources": 0,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": false,
          "fact_change": "입자가 소결되면 금속 활성 성분의 전체 표면적은 줄어든다(3문단)."
        },
        {
          "n": 5,
          "decisive_clause": "흡착 세기가 초기보다 낮아져, 흡착된 반응물이 지나치게 안정화되어 표면에서의 반응이 느려지는 조건에서는 벗어났고 흡착이 약해 흡착량이 적어지는 조건에는 들지 않았겠군",
          "minimum_evidence": {
            "passage": "2문단: 너무 강한 흡착은 흡착된 반응물을 지나치게 안정화해 표면 반응을 늦추고, 약한 흡착은 흡착량을 줄인다.",
            "bogi": "적정 범위는 3~5, 초기값은 8, 후반값은 4이다. 8에서 4로 낮아져 적정 범위에 들었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "흡착 세기가 낮아졌다는 말만으로는 후반값이 여전히 너무 높은지, 적정한지, 오히려 너무 낮은지 알 수 없다."
          },
          "steps": 5,
          "bogi_sources": 3,
          "task": "원리 적용",
          "bogi_only": false,
          "fact_sensitive": true,
          "fact_change": "후반의 흡착 세기를 4에서 2로 바꿈 → 초기보다 낮아지고 과강 조건에서는 벗어나지만, 약한 흡착 조건에 들어가므로 ⑤는 거짓이다."
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "후반에 달라졌다고 관찰한 것은 금속 표면의 전자 밀도다. 지문은 이 변화를 흡착 세기 조절에 연결하며, 소결 억제에 연결하는 변화는 표면 구조 변화다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [5],
      "weak": [2]
    }
  ]
}
```