# 문단 기능 다시 붙이기

한 세트의 구조 추출 결과에 통일 어휘의 기능을 붙인다.

## 입력
- 통일 어휘: 묶음, 기능(name, definition, versus), 글 종류(name, definition)
- 세트: set_id, 글 전체의 목적과 논리(화제어 없이), 문단마다 p, point(말하고자 하는 바), function과 secondary(처음 붙인 이름), move(내용의 움직임). (가)(나) 세트는 글마다 kind와 purpose도 있다.

## 규칙
1. 문단마다 주된 기능(label) 하나를 어휘에서 고른다. 처음 붙인 이름의 글자를 따르지 말고, point와 move를 글 전체의 목적에 비추어 보고 그 문단이 하는 일로 고른다.
2. 두 번째 기능(label2)은 그 문단이 분명히 두 가지 일을 할 때만 고른다. label과 같은 기능은 고르지 않는다. 아니면 null.
3. 맞는 기능이 없으면 가장 가까운 것을 label에 넣고, misfit에 왜 맞지 않는지와 붙이고 싶은 이름을 한 문장으로 적는다. 맞으면 misfit은 null.
4. (가)(나) 세트는 글마다 kind를 어휘의 글 종류에서 고른다. 단일 지문은 kinds를 null로 둔다.
5. 어휘에 없는 이름을 label, label2, kind에 쓰지 않는다.

## 출력 (JSON 하나만)
{
  "set_id": "",
  "paragraphs": [ { "p": "1", "label": "", "label2": null, "misfit": null } ],
  "kinds": { "가": "", "나": "" }
}
