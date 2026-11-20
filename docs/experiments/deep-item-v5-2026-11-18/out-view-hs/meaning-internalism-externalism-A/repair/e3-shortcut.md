**정답은 V1 ⑤, V2 ①이다.** 두 문항 모두 부정 발문이므로 내용상 거짓인 선지를 골랐다.

아래 관찰 수는 **최소 판정 경로**를 기준으로 셌다. 선지에 이미 제시된 사건을 중복 확인하기 위한 관찰은 제외하고, 정오 확정에 추가로 필요한 〈보기〉의 관찰만 계산했다.

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
          "decisive_clause": "인식 중 일부를 일기의 기술구로 드러냈다",
          "minimum_evidence": {
            "passage": "[1문단] 기술구는 지시체에 대한 인식을 기술한 설명이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지에서 일기의 표현을 기술구라고 전제했으므로, 그것을 대상에 대한 인식을 드러낸 설명으로 이해하는 것은 기술구의 정의에 부합한다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 2,
          "judgment": "참",
          "decisive_clause": "외부 세계의 대상을 의미의 기준으로 삼은 일",
          "minimum_evidence": {
            "passage": "[4문단] 의미는 대상의 실제적 본성에 의해 결정되며, 실제적 본성은 과학적 발견으로 알려지는 본질적 구조이다.",
            "bogi": "‘2020년에 옛 표본과 최근 표본의 구조가 처음 분석되었다.’ 보고서가 대상의 구조를 분석한 자료임을 확인할 수 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "분석 보고서라는 명칭만으로는 그 내용이 무엇인지 확정할 수 없다. 보고서가 대상의 구조를 분석한 자료라는 관찰이 필요하다."
          },
          "steps": 2,
          "bogi_sources": 1
        },
        {
          "n": 3,
          "judgment": "참",
          "decisive_clause": "분석으로 확인된 실제적 본성에 맞는다",
          "minimum_evidence": {
            "passage": "[4문단] 실제적 본성은 대상의 본질적 구조이며, 자연종 명사의 의미는 실제적 본성에 의해 결정된다.",
            "bogi": "‘분석 결과, 두 표본은 같은 구조를 지니고 있었다.’ 겉모습의 차이에도 두 표본의 실제적 본성은 같다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "두 표본의 구조가 같은지 다른지 알아야 동일한 단어를 계속 사용한 것이 실제적 본성에 부합하는지 판정할 수 있다."
          },
          "steps": 2,
          "bogi_sources": 1
        },
        {
          "n": 4,
          "judgment": "참",
          "decisive_clause": "대상을 바탕으로 객관적 의미를 찾는 새로운 관점을 보여 주었다",
          "minimum_evidence": {
            "passage": "[4문단] 대상의 본질적 구조인 실제적 본성이 의미를 결정한다. [5문단] 퍼트넘은 대상을 기반으로 객관적 의미를 찾는 새로운 관점을 제시했다는 평가를 받는다.",
            "bogi": "‘2020년에 옛 표본과 최근 표본의 구조가 처음 분석되었다.’ 해설사가 따른 보고서가 대상의 구조에 관한 자료임을 확인할 수 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "보고서에 따라 설명을 고쳤다는 사실만으로는 대상에 근거한 수정인지 알 수 없다. 보고서가 대상의 구조에 관한 분석 자료라는 관찰이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 1
        },
        {
          "n": 5,
          "judgment": "거짓",
          "decisive_clause": "2020년에 옛 표본도 포함하여 구조를 분석한 일을 계기로 처음 성립했다",
          "minimum_evidence": {
            "passage": "[2문단] 인간의 생각이나 느낌이 아니라 외부 세계의 지시체 자체가 의미를 결정한다.",
            "bogi": "‘1930년에 광부가 자연에서 표본을 채취해 ‘석영’이라고 적어 두었다.’ 2020년 이전부터 자연의 특정 대상을 지시하는 단어 사용이 있었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "외재주의만으로 특정 단어의 의미가 언제 처음 성립했는지 확정할 수는 없다. 이 사례에서는 2020년 이전에 이미 자연 표본을 ‘석영’이라고 지시했다는 관찰이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 1
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "1930년에 이미 자연 표본을 ‘석영’이라고 적었다. 따라서 2020년의 분석을 통한 설명 보완은 인정할 수 있지만, 그때 의미가 처음 성립했다고 볼 수는 없다. ④는 설명의 보완을, ⑤는 의미의 최초 성립을 말한다."
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
      "answer": 1,
      "choices": [
        {
          "n": 1,
          "judgment": "거짓",
          "decisive_clause": "경력 안내원이 ‘옥’이라는 단어를 사용할 때만",
          "minimum_evidence": {
            "passage": "[2문단] 의미는 인간의 생각이나 느낌이 아니라 외부 세계의 지시체 자체에 의해 결정된다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "두 지역의 단어가 지시하는 대상에 따른 의미 차이는 사용자의 경력이나 인식에 종속되지 않으므로, 그 차이를 경력 안내원의 사용에만 한정하는 것은 외재주의에 어긋난다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 2,
          "judgment": "참",
          "decisive_clause": "기술구의 내용을 아는 것이 ‘옥’이라는 단어의 의미를 아는 것",
          "minimum_evidence": {
            "passage": "[1문단] 의미 내재주의에 따르면 의미를 안다는 것은 곧 기술구를 아는 것이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "기술구를 아는 것이 의미를 아는 것이라는 의미 내재주의의 설명을 관람객의 경우에 그대로 적용할 수 있다."
          },
          "steps": 1,
          "bogi_sources": 0
        },
        {
          "n": 3,
          "judgment": "참",
          "decisive_clause": "두 지역에서 쓰는 ‘옥’이라는 단어의 의미는 서로 다르다",
          "minimum_evidence": {
            "passage": "[4문단] 실제적 본성은 대상의 본질적 구조이며, 자연종 명사의 의미는 실제적 본성에 의해 결정된다.",
            "bogi": "‘과학자들이 분석한 결과, 두 광물의 구조도 서로 다른 것으로 드러났다.’ 같은 기술구와 별개로 두 광물의 실제적 본성은 다르다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "기술구가 같다는 사실만으로는 외재주의에서 의미의 동일 여부를 판단할 수 없다. 두 광물의 구조가 서로 다르다는 관찰이 필요하다."
          },
          "steps": 2,
          "bogi_sources": 1
        },
        {
          "n": 4,
          "judgment": "참",
          "decisive_clause": "전문가의 지식에 의존하는 언어적 노동 분업",
          "minimum_evidence": {
            "passage": "[4문단] 일반인이 전문가의 지식에 따라 단어를 사용하는 것과 같은 언어적 협업을 언어적 노동 분업이라고 한다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "선지가 전제한 ‘과학자들의 안내문에 따라 안내원들이 단어를 사용하는 일’은 전문가의 안내에 의존하는 언어적 협업이므로 언어적 노동 분업에 해당한다."
          },
          "steps": 2,
          "bogi_sources": 0
        },
        {
          "n": 5,
          "judgment": "참",
          "decisive_clause": "대상에 근거해 객관적 의미를 찾는 관점을 보여 주었다",
          "minimum_evidence": {
            "passage": "[4문단] 대상의 본질적 구조인 실제적 본성이 의미를 결정한다. [5문단] 퍼트넘은 대상을 기반으로 객관적 의미를 찾는 새로운 관점을 제시했다는 평가를 받는다.",
            "bogi": "‘과학자들이 분석한 결과, 두 광물의 구조도 서로 다른 것으로 드러났다.’ 공개된 분석 보고서가 대상의 구조에 관한 자료임을 확인할 수 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "missing_observation": "분석 보고서를 공개했다는 사실만으로는 대상에 근거한 의미 탐구인지 확정할 수 없다. 보고서가 두 광물의 구조를 분석한 자료라는 관찰이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 1
        }
      ],
      "closest_rival": {
        "n": 3,
        "observation": "분석 결과 두 광물의 구조가 서로 달랐다. 따라서 기술구가 같아도 두 지역의 단어 의미는 다르며, 이 차이는 경력 안내원이 아는지 여부와 무관하다. ③은 참이고, 이를 경력 안내원에게만 한정한 ①은 거짓이다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [
        1
      ],
      "weak": []
    }
  ]
}
```