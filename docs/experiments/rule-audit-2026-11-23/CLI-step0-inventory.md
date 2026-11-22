# 규칙 감사 0단계: 기출 자료 목록 (CLI 지시문)

```
규칙 감사 0단계: 기출 자료 목록 (웹 결정 2026-11-23 00:38, 계획 docs/experiments/rule-audit-2026-11-23/PLAN-rule-audit.md)

0. API 호출 없음. 규칙·기준 파일(rules-*, kind-*, eval-repair.mjs 등)은 고치지 않는다.
   오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)의 커밋 안 된 변경은 건드리지 않는다.
   커밋 전에 .git 잠금 파일(index.lock)이 있으면 풀릴 때까지 기다린다.
1. 저장소 안에서 평가원·수능(6월·9월 모의평가, 수능) 독서 3점 〈보기〉 문항을 모두 찾는다. 최소한 다음을 뒤진다:
   docs/experiments/set-pattern-2026-11-18/BOGI-ANATOMY.md, docs/experiments/bogi-distractor-tagging-2026-11-22/ (items/, KEY.md),
   docs/experiments/deep-item-v5-2026-11-18/passages/, content/ 아래 기출 자료, 그 밖에 grep으로 걸리는 기출 문항 파일.
   교육청(고1~고3) 문항은 따로 표에 적되 본 목록과 합쳐 세지 않는다.
2. 문항마다 한 줄: 문항 키(시행 연월·시험·문항 번호, 예 2024-09-평가원-12), 저장소 안 id들(bt-…, gongsun-… 등, 같은 문항이면 한 줄로 합침), 갈래(사례·관점·표·그래프·기타), 발문 방향(부정 A/긍정 B), 지문 번호(같은 지문 문항끼리 묶이게), 파일 위치, 사용 이력(해부 9 / 태깅 22 / 수리 검사기 보정 / 칸 판정 기출 기준 / 규칙 대조 / 없음, 여럿이면 모두).
   사용 이력은 PROGRESS-hard.md, REVIEW-rules-*.md, REPORT-*.md, eval-repair 보정 기록에서 문항 번호·id로 찾는다. 못 찾으면 '확인 못 함'으로 적는다.
   갈래·발문이 애매하면 '애매'로 적고 이유를 한 줄 붙인다.
3. 확인용 문항을 고른다: 갈래(사례·관점·표)마다 2개. 사용 이력 '없음' 중 최근 학년도부터. 모자라면 있는 만큼만 고르고 모자란 수를 적는다.
   같은 지문의 문항은 본 감사와 확인용에 나눠 들어가지 않게 지문 단위로 고른다.
   확인용 문항은 목록에 키·id·갈래만 적고 문항 내용·선지는 다른 문서에 옮기지 않는다.
4. 저장: docs/experiments/rule-audit-2026-11-23/INVENTORY.md (표 셋: 본 감사용, 확인용, 교육청 보충) + inventory.json (같은 내용).
   맨 위에 요약: 평가원·수능 총 문항 수, 갈래×발문 칸별 수(본 감사용/확인용), 사용 이력 '없음' 수, 교육청 수.
   모든 문항 파일을 찾았다고 확신할 수 없으면 뒤진 위치 목록을 함께 적는다.
5. 커밋할 파일(먼저 목록을 보여 준다):
   docs/experiments/rule-audit-2026-11-23/ 의 PLAN-rule-audit.md, CLI-step0-inventory.md, INVENTORY.md, inventory.json
   docs/handoffs/WORKING-RULES.md (웹이 3절 2번·4-1절을 고친 판)
   그 밖의 수정·미추적 파일은 넣지 않는다.
   Ghootae가 이 목록의 커밋과 푸시를 승인했다(이 지시문을 붙여 넣은 것이 승인이다).
   메시지 예: "규칙 감사 0단계: 기출 자료 목록 + 감사 계획 결정 + WORKING-RULES 판정 읽기·갈래 확장 대조"
   커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
6. 보고: 요약 표, '애매'·'확인 못 함' 줄 목록, 확인용 6개의 키, git log -1 --oneline, 푸시 결과. 그리고 멈춘다.
```

- **추정 비용:** API 비용 없음(파일 찾기·정리·커밋만).
- **최소 실행 검토:** 목록 만들기는 다음 단계 전부의 분모라 줄일 수 없다. 문항 내용을 새로 판정하지 않고, 앞 단계 기록(태깅·해부)을 그대로 재사용한다.
