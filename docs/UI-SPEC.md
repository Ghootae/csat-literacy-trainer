# 학습 UI 스펙 (첫 슬라이스)

무엇을 화면에 어떻게 보여줄지는 `docs/STUDENT-LOOP-DESIGN.md`가 정한다.
이 문서는 **그것을 어떤 구조로 구현할 것인가**를 다룬다.

> **상태 (2026-08-07):** 착수. 계획서(`.omc/plans/consensus-csat-literacy.md`)의 `G(학습 UI)`.

## 1. 첫 슬라이스 범위

```
넣는다   원문 제시 → 섹션 입력 → 판정 → 결과 화면 → 수정 → 재평가 → 종료
뺀다     세션(여러 문단 연속) · 2단계 표제 · 보상 누적 · 로그인
```

**2단계 표제는 애초에 불가능하다** — N3(지문 층위 골드)가 미구현이다.
세션·누적은 지금 만들면 검증 없이 구조가 굳는다.

**이 UI를 지금 만드는 목적은 관찰 대상 3건을 판단하는 것이다**
(부당한 강등 / 힌트가 문답 훈련을 유발하는가 / 관계 서술어가 있는데 `주제만`).
셋 다 실제 학생 응답이 있어야 판단되고, 문단 하나로 충분히 나온다.

## 2. 구조 — 프로세스 경계는 선택이 아니다

계획서 `D4. 웹 전환 가드`가 3패키지(`core`/`pipeline`/`app`)와 import 규칙 3종을 요구한다.

```
packages/app/
  src/server/    Node HTTP — 채점·골드 접근. LLM 키가 여기에만 있다
  src/client/    Vite + React + TS
  src/shared/    두 쪽이 공유하는 **뷰 계약 타입만**
```

| 규칙 | 이유 |
|---|---|
| 파일시스템 접근은 리포지토리 구현체 밖에 없다 | 웹 전환 시 저장소 교체 |
| 클라이언트 번들이 채점 코드를 import 하지 않는다 | **프로세스 경계 강제** |
| LLM 클라이언트가 클라이언트 번들에서 도달 불가 | 키 유출 방지 |

`shared/contract.ts`는 판정값 유니온을 **자체 정의**한다. `pipeline`에서 가져오면 클라이언트가
채점 패키지에 묶인다. 대신 단위 테스트로 `pipeline`의 정의와 일치하는지 검사해 드리프트를 막는다.

## 3. API 계약 — **골드를 클라이언트에 보내지 않는다**

§4.1.3의 "미달 영역 골드 노출 0"은 UI 관례가 아니라 **전송 계약**이어야 한다.
브라우저에 보낸 것은 개발자 도구로 볼 수 있으므로, **애초에 보내지 않는 것**만이 보장이다.

```ts
// 서버 → 클라이언트. 화면에 그릴 것만 담는다.
interface RegionView {
  regionId: string;
  verdict: Verdict;              // 5값
  sentenceIds: string[];         // 원문 하이라이트 좌표
  feedback: string;              // 힌트(미달) 또는 확인(관계보존)
  said: string[];                // 학생 자신의 조각 인용
  canRevise: boolean;            // 아직 안 쓴 "다듬기" 버튼이 있는가
  forced: boolean;               // 모순 — 건너뛸 수 없음

  revealed: boolean;             // 정답을 공개하는 상태인가
  label?: string;                // revealed일 때만
  propositions?: PropView[];     // revealed일 때만
}
```

`label`·`propositions`가 **선택 필드**인 것이 핵심이다. 미달이고 아직 시도하지 않았으면
서버가 채우지 않는다 — 클라이언트는 숨길 것이 아니라 **갖고 있지 않다.**

`revealed`가 되는 경우는 둘뿐이다(§2.1): 관계보존이거나, 수정을 시도했으나 미달이거나.

### 엔드포인트

```
GET  /api/passage/:id        원문 + 문장 분할.  골드·질의 없음
POST /api/attempt            { sections: string[] }              → RegionView[]
POST /api/revise             { sections: string[], regionId }    → RegionView[]
```

**`revise`도 전체 재평가한다**(§2.1). `regionId`는 어느 영역을 겨냥했는지 기록하고
"다듬기" 소진을 표시하기 위한 것이지 평가 범위를 좁히지 않는다.

## 4. 콘텐츠와 기록

```
content/<paragraphId>/        커밋한다 — 재현 가능해야 한다
  passage.json   원문 + 문장 분할
  gold.json      명제·위계·슬롯
  queries.json   영역·질의

sessions/<ownerId>/<ts>.json  gitignore — 개인 데이터이고 무한히 늘어난다
```

세 파일이 **한 묶음**이어야 한다. 지금까지 골드는 `.omc/agreement`, 질의셋은
`fixtures/generated-queries`, 원문은 `data/`(gitignore)로 흩어져 있어 조립할 방법이 없었다.

**세션 기록이 이번 UI의 진짜 산출물이다.** 관찰 대상 3건은 응답 없이는 판단할 수 없다.

```ts
interface Session {
  ownerId: string;             // D4 — 로컬은 "local" 고정
  paragraphId: string;
  attempts: Attempt[];         // 배열이어야 한다
}
interface Attempt {
  at: string;
  sections: string[];
  targetRegionId?: string;     // 수정이면 겨냥한 영역
  regions: { regionId: string; verdict: Verdict }[];
}
```

**`attempts`가 배열인 것이 요구사항이다.** v1→v2→v3의 판정 변화를 봐야 "부당한 강등"을
판단할 수 있는데, 최종 상태만 남기면 그 정보가 사라진다.
