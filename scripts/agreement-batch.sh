#!/usr/bin/env bash
# 다양한 전개 구조의 문단에 대해 골드 재현성을 측정한다.
# 각 문단: 골드 3회 독립 생성 → 5개 테스트 응답 × 3골드 평가 → 지표.
# 캐시가 있으면 재사용하므로 중단 후 재실행이 안전하다.
#
#   set -a; . ./.env; set +a; bash scripts/agreement-batch.sh
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use 24.18.0 >/dev/null

# setId  본문문단인덱스  # 영역 · 전개구조
PARAGRAPHS=(
  "69bbf88d8937cf14551903ca 0"  # 사회문화 · 정의+분류 (기준선, 측정 완료)
  "69bbf8f5a029f488d9e52296 2"  # 사회문화 · 예외+대조+인과
  "69bffacbfa5063deffe19cc6 4"  # 과학기술 · 대조+인과+예시
  "69bce4ece23376a28e12cb7c 3"  # 과학기술 · 인과+예시
  "69c011fd78128b2a9beddd5e 3"  # 인문예술 · 대조+인과
  "6a509b0686fd308968e16264 1"  # 미분류(기술) · 예외+인과+예시
)

for entry in "${PARAGRAPHS[@]}"; do
  read -r setId idx <<<"$entry"
  echo "════════════════════════════════════════════════════════════"
  echo "측정: $setId 문단 $idx"
  echo "════════════════════════════════════════════════════════════"
  npm run agreement -- "$setId" "$idx" 3 || {
    echo "!! $setId 문단 $idx 실패 — 다음으로 진행 (캐시는 보존됨)"
  }
done

echo "════════════════════════════════════════════════════════════"
echo "배치 완료. 요약: node scripts/agreement-summary.mjs"
