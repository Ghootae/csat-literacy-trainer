---
date: 2026-09-09
scope: problem-gold-assets
base_commit: 6852686c2f975f6e628d33564b44d818c39e8d98
---

# 문항 골드 자산 상태를 정본화

## 새로 확인된 것

- 2026-09-03 prospective 표본은 24지문에서 한 문항씩 선택했으며 원천 입력과 API 원응답은
  24개 모두 보존돼 있다.
- 원응답 스키마 통과는 2개였고, 결정론적 정규화 75건 뒤 후보 23개가 스키마를 통과했다.
- 볼록 렌즈 11번 한 문항은 복수 정답이 생기는 의미 오류 때문에 후보를 만들지 못했다.
- 사람 검토 파일 23개는 후보·충분근거 후보의 해시와 모두 일치하지만 상태는 전부 `PENDING`다.
  사람 승인, 승인 승격 파일, 웹앱 연결 자산은 모두 0개다.
- 24개 생성 입력에는 공식 정답은 있었지만 공식 해설 본문은 없었다. 원천 enrichment의
  공식 해설 참조 메타데이터도 생성 로더가 전달하지 않았다.
- 문단 골드 60개가 속한 11지문은 표본 문항과 모두 연결되며 후보 10개, 후보 실패 1개,
  승인 0개다.

## 생성한 것

- 문항 골드의 표본 선택, 생성 조건, 자동 정규화, 검토·승격 단계, 산출물 수량, 해시,
  공식 해설·시각 자료 한계와 11지문 교집합을 기록한 자산 원장
- `CURRENT_STATE.md`의 문제 골드 자산 수량과 `INDEX.md`의 정본 링크

## 기존 상태에서 바뀌지 않은 것

- 문제 골드는 계속 `PARKED_OFFLINE`이며 학생용 문제 풀이 런타임의 선행 조건이 아니다.
- 문제 풀이 런타임은 원문 직접 정책을 유지한다.
- 이번 작업은 후보 승인, 재생성, 안전 게이트 실행 또는 웹앱 배포를 하지 않았다.

## 근거

- [`문항 골드 자산 원장`](../../docs/PROBLEM-GOLD-ASSET-REGISTER-2026-09-09.md)
- [`24문항 생성 보고서`](../../docs/experiments/problem-gold-prospective-blind-2026-09-03/REPORT.md)
- [`생산 요약`](../../docs/experiments/problem-gold-prospective-blind-2026-09-03/gold-production/production-summary.json)
- [`승인 요약`](../../docs/experiments/problem-gold-prospective-blind-2026-09-03/gold-production/approval-summary.json)
- [`공식 해설 감사`](../../docs/experiments/problem-gold-prospective-blind-2026-09-03/OFFICIAL-EXPLANATION-AUDIT.md)
- [`시각 자료 감사`](../../docs/experiments/problem-gold-prospective-blind-2026-09-03/VISUAL-RECOGNITION-AUDIT.md)
