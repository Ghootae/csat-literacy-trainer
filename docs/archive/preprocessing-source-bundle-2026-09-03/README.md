# Source Bundle 전처리 실험 archive

## 상태

- 2026-09-03에 시작한 볼록렌즈 Source Bundle 전처리 실험을 활성 생산선에서 철수했다.
- 이 폴더는 복구와 비용·판단 이력 확인을 위한 읽기 전용 archive다.
- 원래 상대 경로를 이 폴더 아래에 그대로 보존했다.
- 기존 골드와 공식 해설 enrichment는 이 archive로 이동하지 않았다.

## 보존 범위

- Source Bundle v1/v2 계약, 런타임, 테스트
- Passage·ITEM·시각 전처리 CLI와 프롬프트
- 드라이런 계획과 계획 hash
- 유료 API 원시 응답, metadata, 비용 기록
- 실패 응답과 검증 오류
- 재투영·후보 비교 결과

## 활성 상태

루트 `package.json`의 `problem-source:*` 명령과 파이프라인 공개 export는 제거했다. 이 archive의
TypeScript 파일은 프로젝트 빌드 대상이 아니며 API 실행 진입점으로 사용하지 않는다.

## 복구 원칙

다시 사용할 경우 개별 파일을 임의로 복사하지 말고, 당시 계획 hash와 원시 응답 계보를 확인한 뒤
별도의 구현 계획과 승인을 거쳐 활성 소스 경로로 복구한다.
