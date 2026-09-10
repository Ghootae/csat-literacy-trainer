# 체크포인트

체크포인트는 누적 프로젝트 요약이 아니라 한 작업에서 생긴 **상태 변화만** 기록한다. 현재
상태를 복원할 때는 먼저 `../CURRENT_STATE.md`를 읽고, 특정 결정의 변화 과정이 필요할 때만
체크포인트를 연다.

파일명은 `YYYY-MM-DD-short-slug.md` 형식을 쓴다. 같은 날 이름이 겹치면 더 구체적인 slug를
사용한다.

새 파일은 다음 명령으로 만든다.

```bash
node scripts/new-memory-checkpoint.mjs short-slug
```

작성 항목은 `../templates/checkpoint.md`를 따른다.
