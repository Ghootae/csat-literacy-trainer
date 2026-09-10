---
id: D-0001
status: accepted
date: 2026-08-10
scope: paragraph-evaluation
supersedes: none
---

# 핵심 의미 관계 보존을 기본 채점축으로 사용

## 결정

자유형 문단 요약은 세부 논항의 개수가 아니라 문단을 조직하는 핵심 의미 관계가 보존됐는지를
기본 채점축으로 사용한다. 명제 evidence와 `argumentCoverage`는 근거·피드백·디버깅에 쓸 수
있지만 기본 점수로 사용하지 않는다.

## 근거

- 좋은 요약은 세부를 정당하게 생략하므로 슬롯 충족 개수는 압축 품질과 일치하지 않는다.
- `argumentCoverage`는 분해 방식에 따라 흔들렸고 사람 이중 라벨링에서도 안정적인 구성개념이
  아니었다.
- 관계 보존 판정은 관계 유형과 질의 분해 변화에 더 잘 견뎠고, 과대평가 0건을 중심으로 한
  회귀 기준을 세울 수 있었다.

## 폐기한 대안

- 골드 명제 또는 논항의 충족 개수를 점수로 합산
- `argumentCoverage`와 표현 방식을 관계 보존 등급에 합쳐 단일 세부 라벨로 운영

## 재검토 조건

새 점수축이 합리적인 재분해와 독립 인간 라벨링에서 안정적이며 관계 보존축과 구별되는 교육적
타당도를 보일 때만 재검토한다.

## 근거 자료

- [`PROJECT-BRIEFING.md`](../../docs/PROJECT-BRIEFING.md)
- [`n2-deconfound-2026-08-10.md`](../../docs/experiments/n2-deconfound-2026-08-10.md)
