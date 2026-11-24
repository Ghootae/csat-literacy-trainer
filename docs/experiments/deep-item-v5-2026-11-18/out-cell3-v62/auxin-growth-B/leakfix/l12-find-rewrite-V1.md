```json
{
  "version": "V1",
  "leaks": [
    {
      "no": 10,
      "sentence": "- ⓒ → ⓓ: 감소",
      "relation": "같음·다름",
      "whyLeaks": "⑤에서 비교하는 두 점의 높이를 읽지 않아도 ⓓ의 길이 증가량이 ⓒ보다 작다고 바로 알려 준다."
    },
    {
      "no": 12,
      "sentence": "- ⓒ: 최고점",
      "relation": "지시 대상",
      "whyLeaks": "최고점을 ⓒ로 직접 지정해 ⓓ가 ⓒ보다 낮다는 비교를 대신한다."
    }
  ],
  "changes": [],
  "graphSpec": {
    "xAxis": {
      "label": "옥신 농도",
      "unit": "μmol/L",
      "ticks": [{"at": 0, "label": "0"}]
    },
    "yAxis": {
      "label": "같은 시간 동안 줄기의 길이 증가량",
      "unit": "mm",
      "values": [0, 2, 4, 4.5]
    },
    "series": [
      {
        "id": "s1",
        "label": null,
        "style": "solid",
        "curve": "linear",
        "points": [
          {"x": 0, "y": 2, "mark": "ⓐ"},
          {"x": 1, "y": 3, "mark": "ⓑ"},
          {"x": 1.75, "y": 4.5, "mark": "ⓒ"},
          {"x": 2, "y": 5},
          {"x": 3, "y": 4, "mark": "ⓓ"},
          {"x": 4, "y": 1, "mark": "ⓔ"}
        ]
      }
    ],
    "shade": []
  },
  "summary": "곡선의 모양은 그대로 두고 ⓒ를 최고점 왼쪽으로 옮겼다. 학생은 ⓒ(4.5 mm)와 ⓓ(4 mm)의 값을 비교해 ⑤를 판단하고, ⓓ가 무처리 기준인 ⓐ(2 mm)보다 높다는 점에서 ②의 생장 억제 해석을 배제할 수 있다."
}
```