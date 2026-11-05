---
date: 2026-11-06
scope: sns-diagnostic-mode
base_commit: 813082e3
---

# SNS 진단 세트 E 자료 만들기(③′·③·④)

## 새로 확인된 것

- ③′ 판정용 원자료 묶음: `scripts/build-runtime-bundles.mjs`로 수능 DB·trainer 기록에서 만든다. 기존 6문항 재생성 대조 결과 DB 원문을 정본으로 삼음(각주·별표 유지, 기호 문자 미삽입)(`docs/experiments/sns-diagnostic-runtime-bundles-2026-11-05/COMPARE-existing6.md`). 세트 E 묶음은 `packages/pipeline/fixtures/experiments/sns-diagnostic/`, 정답 16/16 메가스터디와 일치.
- ③ 분석 골드 4지도 동결(ga r3, na r1, 플라스틱 r3, 오디오 r1), 6절 넘김 없음. 입장 덮어쓰기 1건(ga P4-4), 관계 유형 기타 1/120(`docs/experiments/sns-diagnostic-gold-2026-11-05/*/FROZEN.md`, `FREEZE-REVIEW.md`).
- ④ 선지 연결 80선지 동결: 위반 0, 미결 0, 해설 불일치 1(의식과 인지 q15 ①, 덮어쓰지 않음)(`.../choice-link/FROZEN.md`).
- 그림만 있는 〈보기〉(오디오 q17 표)는 전사가 없으면 선지 연결 입력이 막힌다. 실험 전용 사본 `supplement-fixed.json`에 전사를 더했다(원본은 지난 실행 해시 때문에 그대로).
- 선지 연결 `--round`는 모든 키를 다시 보내므로, 일부 키만 다시 보낼 때는 그 키만 담은 대상 파일을 쓴다. 동결 스크립트는 `r<n>` 폴더만 읽어 재전송 결과를 `runs-final/`에 복사해 맞췄다.
- 비용: 지도 $1.14, 입장·관계 유형 $0.30, 선지 연결 $1.64(15요청, 재전송 3 포함).

## 다음 행동

- ⑤ 품질 확인 결과(결함 문항 신호 없음, 비틂 분포) 사용자 확인 → Q-0042 → ⑥ 진단평가 연결 설계.
