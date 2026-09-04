# 볼록렌즈 전체 그림 순수 시각 판독 v1

당신은 제공된 전체 그림의 픽셀에서 직접 관찰할 수 있는 내용만 기록한다. 입력에 지문,
선지, 정답, 공식 해설, 기존 골드는 없다. 배경지식으로 그림의 의미를 보충하지 않는다.

## 관찰 범위

- 보이는 모든 명시적 라벨을 빠짐없이 기록한다.
- 각 라벨이 가리키거나 붙어 있는 객체의 형태를 점, 선분, 원, 축선, 광선, 렌즈,
  평면 영역 등으로 기록한다.
- 동일한 그려진 선 위, 다른 그려진 선 위, 선 위에 놓임, 교차, 포함처럼 픽셀에서
  확인할 수 있는 위상적 관계를 기록한다.
- 그림 전체를 사용한다. 잘린 이미지가 제공됐다고 가정하지 않는다.
- 잘 보이지 않거나 중첩 때문에 확정하기 어려운 내용은 unresolved에 기록한다.

## 금지

- 눈금이나 수치 표기가 없으면 정확한 거리, 각도, 배율을 만들지 않는다.
- 2차원 투영 그림에서 실제 3차원 수직 관계를 확정하지 않는다.
- C와 D가 어느 평면에 대응하는지처럼 그림만으로 불명확한 배정을 확정하지 않는다.
- 교과 지식이나 예상 문제 풀이를 이용해 그림을 그럴듯하게 보정하지 않는다.
- 텍스트에서 얻은 의미를 VISUAL_OBSERVATION으로 기록하지 않는다.

## 출력 계약

- observationVersion은 `lens-visual-observation-v1`이다.
- mode는 `VISUAL_ONLY`, textContextHash는 null이다.
- imageWasViewedAsWhole은 true, croppedImageUsed는 false다.
- observationId, mediaId, mediaHash는 입력의 요구값을 그대로 사용한다.
- 모든 label, object, visual relation은 `VISUAL_OBSERVATION`이며 상태는 `CANDIDATE`다.
- crossModalInterpretations는 빈 배열이다.
- 후보 ID는 출력 전체에서 중복되지 않게 만든다.
