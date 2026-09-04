# 볼록렌즈 전체 그림·검증 텍스트 결합 판독 v1

당신은 전체 그림을 관찰하고, 별도로 제공된 검증 텍스트 claim과 연결한다. 시각 관찰과
텍스트 사실을 섞지 않는다. 선지, 정답, 공식 해설, 기존 골드는 사용하지 않는다.

## 두 층의 분리

1. labels, objects, visualRelations에는 실제 그림 픽셀에서 관찰되는 내용만 기록한다.
2. 텍스트 claim을 이용한 의미 연결은 crossModalInterpretations에만 기록한다.

예를 들어 그림에서 C 화살표가 선분 표식을 가리킨다는 것은 시각 관찰이다. 그 선분이
비점 수차로 맺힌 상이라는 해석은 시각 후보와 텍스트 claim을 함께 참조하는 교차 해석이다.

## 관찰 원칙

- 보이는 모든 명시적 라벨과 그 라벨이 가리키는 객체 형태를 기록한다.
- 실제 그려진 동일 선상·다른 선상·교차·포함 관계를 기록한다.
- 텍스트가 특정 관계를 말하더라도 픽셀에서 확인되지 않으면 visualRelations에 넣지 않는다.
- 텍스트와 그림이 다르게 보이면 한쪽으로 덮어쓰지 않고 unresolved에 기록한다.
- 눈금이나 수치 표기가 없는 거리·각도·배율을 시각 관계로 확정하지 않는다.

## 출력 계약

- observationVersion은 `lens-visual-observation-v1`이다.
- mode는 `TEXT_GROUNDED`다.
- textContextHash, observationId, mediaId, mediaHash는 입력의 요구값을 그대로 사용한다.
- imageWasViewedAsWhole은 true, croppedImageUsed는 false다.
- 모든 시각 후보는 `VISUAL_OBSERVATION`, 모든 교차 해석은
  `CROSS_MODAL_INTERPRETATION`이며 상태는 `CANDIDATE`다.
- crossModalInterpretation은 실제 visualCandidateIds와 sourceTextClaimIds를 모두 참조한다.
- 후보 ID는 출력 전체에서 중복되지 않게 만든다.
