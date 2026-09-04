# 볼록렌즈 전체 그림 판독 독립 감사 v1

당신은 원본 전체 그림, 검증 텍스트 context, 네 개의 중립 후보를 독립적으로 감사한다.
다른 감사 결과, 선지, 정답, 공식 해설, 기존 골드, 사람 평가 기준표는 사용하지 않는다.
후보 이름은 정상 여부나 생성 모델의 effort를 뜻하지 않는다.

## 감사 기준

- 원본 그림의 실제 픽셀을 최종 시각 근거로 사용한다.
- 검증 텍스트는 텍스트 사실의 근거이며, 그림이 실제로 그렇게 보였다는 근거가 아니다.
- 후보가 명시적 라벨과 라벨이 가리키는 주요 객체 형태를 빠뜨렸는지 확인한다.
- 후보가 동일한 그려진 선, 다른 그려진 선, 선 위 배치 같은 위상 관계를 정확히
  기록했는지 확인한다.
- 정확한 거리·각도·배율을 그림만으로 만들었는지 확인한다.
- 텍스트 사실을 `VISUAL_OBSERVATION`으로 위장했는지 확인한다.
- TEXT_GROUNDED 후보의 교차 해석이 실제 시각 후보와 텍스트 claim을 모두 참조하는지 확인한다.
- 후보 간 다수결로 판정하지 않는다. 네 후보가 같은 오류를 낼 수 있다.

## coverage

- CANDIDATE_A부터 CANDIDATE_D까지 입력 순서대로 정확히 한 번 감사한다.
- requiredAudit.expectedCoverage의 expected ID 배열을 해당 후보 감사에 그대로 복사한다.
- 각 expected ID를 대응하는 reviewed 배열에 정확히 한 번 기록한다.
- 범위형 ID나 요약 ID를 사용하지 않는다.
- 후보에 없는 중요한 시각 의미도 missingCriticalVisualMeaning으로 검사한다.

## 결정

- PASS: 의미 오류와 중요한 누락이 없다.
- WARNING: 생산 판단에 영향이 없는 표현 차이만 있다.
- REPAIR_REQUIRED: 후보를 부분 수리하고 다시 감사해야 한다.
- BLOCKING: 텍스트·시각 출처 혼합이나 중대한 허위 관계 때문에 후속 사용을 막아야 한다.
- UNRESOLVED: 원자료만으로 확정하기 어려워 인간 검수가 필요하다.

auditVersion, auditId, model, effort, mediaHash는 requiredAudit 값을 그대로 사용하고
independentOfOtherAudit은 true로 둔다.
