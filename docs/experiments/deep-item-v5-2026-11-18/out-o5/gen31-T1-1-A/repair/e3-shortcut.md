- **V1 정답: ⑤.** ㉣에는 활성형 XIII 인자와 피브린 그물이 모두 있다. 따라서 표에 나온 상태에서 공유 결합 형성을 촉진할 수 있는 시료에서 ㉣을 제외한 것이 잘못이다. ㉤의 섬유가 **이후에** 그물을 이룰 수 있다는 ④는 적절하다.
- **V2 정답: ④.** 칼슘 이온은 활성형 X 인자가 포함된 복합체의 형성을 돕지만, XIII 인자의 경우에는 절단된 인자가 **활성형이 되는 과정**에 관여한다. ②는 두 인자가 이후 효소로 작용할 수 있다는 진술이므로 적절하다.

근거 수를 셀 때 표의 같은 시료 열에서 읽은 값은 한 관찰로 묶었다. 거짓 선지는 판정을 끝내는 데 필요한 반례까지만 근거에 넣었다.

```json
{
  "items": [
    {
      "version": "V1",
      "answer": 5,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "피브린 섬유의 재료가 생기겠군",
          "minimum_evidence": {
            "passage": "5문단: 트롬빈이 피브리노겐을 절단하면 피브린 섬유의 재료인 피브린이 생긴다.",
            "bogi": "㉠ 열: 피브리노겐이 있다. 트롬빈이 작용한다는 것은 선지의 조건이다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "트롬빈은 XIII 인자에도 작용하므로, 트롬빈이 작용한다는 조건만으로는 부족하다. ㉠에 피브리노겐이 있는지 확인해야 한다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "같은 종류겠군",
          "minimum_evidence": {
            "passage": "5문단: 트롬빈은 피브리노겐을 절단하며, XIII 인자도 절단한다.",
            "bogi": "㉡ 열: 트롬빈과 피브리노겐이 있고, XIII 인자는 비활성형으로 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "두 절단 반응을 맡는 효소가 모두 트롬빈이라는 일반 관계는 알 수 있지만, ㉡에서 두 반응이 성립하는지는 트롬빈과 두 기질의 존재를 확인해야 한다."
          },
          "steps": 3,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "활성형 안정화 인자는 생기지만 새 피브린은 생기지 않겠군",
          "minimum_evidence": {
            "passage": "5문단: 트롬빈이 XIII 인자를 절단하면, 절단된 인자는 칼슘 이온이 관여하는 과정을 거쳐 활성형이 된다. 피브린은 트롬빈이 피브리노겐을 절단하여 만든다.",
            "bogi": "㉢ 열: 비활성형 XIII 인자는 있고 피브리노겐은 없다. 표 앞 문장: 모든 시료에 처음부터 칼슘 이온이 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "트롬빈을 넣는다는 조건만으로는 부족하다. ㉢의 비활성형 XIII 인자와 칼슘 이온의 존재, 피브리노겐의 부재를 확인해야 한다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "처음에 있던 피브린 섬유들이 얽혀 그물을 이룰 수 있겠군",
          "minimum_evidence": {
            "passage": "6문단: 피브린 섬유들은 서로 얽혀 그물을 이룬다.",
            "bogi": "㉤ 열의 피브린 상태: 섬유(그물 없음)."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "기존 섬유가 있다면 새 피브린 없이도 그물을 이룰 수 있지만, ㉤에 그 재료인 섬유가 처음부터 있었는지는 확인해야 한다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "㉣이 아니라",
          "minimum_evidence": {
            "passage": "5·6문단: XIII 인자는 피브린 안정화 인자이며, 활성형 안정화 인자는 그물 속 피브린 분자 사이의 공유 결합 형성을 촉진한다.",
            "bogi": "㉣ 열: XIII 인자가 활성형이고 피브린은 그물 상태이다. 이 두 조건으로 ㉣을 배제한 진술이 거짓임이 확정된다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "공유 결합 형성을 촉진하는 조건은 지문에서 알 수 있지만, ㉣에 활성형 XIII 인자와 피브린 그물이 함께 있는지는 표를 확인해야 한다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 4,
        "observation": "㉤의 ‘섬유(그물 없음)’은 반응 전 관찰이다. ④는 그 섬유가 이후에 얽힐 가능성을 말하고, ⑤는 그물이 아직 없는 바로 그 상태에서의 반응을 말한다."
      },
      "mirror_pair": {
        "exists": false
      },
      "valid_answers": [5],
      "weak": []
    },
    {
      "version": "V2",
      "answer": 4,
      "choices": [
        {
          "n": 1,
          "decisive_clause": "복합체와 프로트롬빈이 한곳에 모여 반응할 수 있겠군",
          "minimum_evidence": {
            "passage": "4문단: 활성화된 혈소판 막 표면은 활성형 X 인자가 포함된 복합체와 프로트롬빈이 모여 반응할 자리를 제공한다.",
            "bogi": "첫 문장: 첫 칸에 활성화된 혈소판의 막이 있다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "첫 칸의 혈소판 막이 지문의 반응 장소에 해당하려면 활성화된 혈소판의 막이라는 관찰이 필요하다."
          },
          "steps": 1,
          "bogi_sources": 1,
          "task": "짝짓기",
          "bogi_only": false
        },
        {
          "n": 2,
          "decisive_clause": "모두 이후 반응에서 효소로 작용할 수 있겠군",
          "minimum_evidence": {
            "passage": "3·4문단: 일부가 절단되어 만들어진 활성형 X 인자는 프로트롬빈을 절단한다. 5문단: 절단된 XIII 인자는 칼슘 이온이 관여하는 과정을 거쳐 효소로 작용하는 활성형이 된다.",
            "bogi": "둘째 문장: ⓐ와 ⓑ에서 각각 일부가 절단된 X 인자와 XIII 인자를 관찰했다. 셋째 문장: 두 시점 모두 첫 칸에 칼슘 이온이 있었다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "인자 이름과 시점 기호만으로는 활성화 조건을 확인할 수 없다. 두 인자의 절단 상태와 특히 ⓑ에서의 칼슘 이온 존재를 확인해야 한다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 3,
          "decisive_clause": "피브린 분자 사이에 공유 결합이 생겼기 때문일 수 있겠군",
          "minimum_evidence": {
            "passage": "6문단: 공유 결합으로 연결된 피브린 그물은 기계적 안정성이 높아져 외부의 힘에도 쉽게 흐트러지지 않는다.",
            "bogi": "넷째 문장: 칸막이가 닫힌 동안 그물이 두 차례 같은 힘을 받았다. 다섯째 문장: 두 번째에 덜 흐트러졌다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "덜 흐트러졌다는 말만으로는 힘이 약해진 경우와 구별할 수 없다. 두 차례 가해진 힘이 같았다는 관찰이 필요하다."
          },
          "steps": 3,
          "bogi_sources": 2,
          "task": "원리 적용",
          "bogi_only": false
        },
        {
          "n": 4,
          "decisive_clause": "이미 활성형인 상태에서 칼슘 이온의 도움을 받아 복합체를 이루겠군",
          "minimum_evidence": {
            "passage": "5문단: 절단된 XIII 인자에 대해 칼슘 이온이 관여하는 단계는 이미 활성형인 인자의 복합체 형성이 아니라 활성형이 되는 과정이다.",
            "bogi": ""
          },
          "one_fact_shortcut": {
            "possible": true,
            "proof": "5문단에서 XIII 인자는 칼슘 이온이 관여하는 과정을 거쳐 활성형이 되므로, 지문에 제시된 칼슘 이온의 역할을 두 인자 모두에서 활성화 이후의 복합체 형성으로 설명한 것은 틀리다."
          },
          "steps": 1,
          "bogi_sources": 0,
          "task": "내용 확인",
          "bogi_only": false
        },
        {
          "n": 5,
          "decisive_clause": "피브린 그물은 혈소판 마개를 보강해 마개가 틈을 막는 데 도움을 주었겠군",
          "minimum_evidence": {
            "passage": "1·6문단: 피브린 그물은 혈소판 마개를 보강하고, 보강된 마개는 손상 부위를 막아 혈액이 새지 않게 한다.",
            "bogi": "마지막 문장: 칸막이가 열린 뒤 그물이 마개와 맞닿았고, 틈으로 혈액이 더 이상 새지 않았다."
          },
          "one_fact_shortcut": {
            "possible": false,
            "proof": "지문의 일반적인 지혈 경로만으로 그 일이 모형에서도 일어났다고 판단할 수는 없다. 그물과 마개의 접촉 및 누출 중단 관찰이 필요하다."
          },
          "steps": 2,
          "bogi_sources": 1,
          "task": "원리 적용",
          "bogi_only": false
        }
      ],
      "closest_rival": {
        "n": 2,
        "observation": "ⓑ에서 관찰된 것은 ‘일부가 절단된’ XIII 인자이다. 절단 뒤 칼슘 이온이 관여하여 이후 효소로 작용할 수 있다는 ②와, 칼슘 이온의 도움을 받는 단계에 이미 활성형이라고 설명한 ④를 구별해야 한다."
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