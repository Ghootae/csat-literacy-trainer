# 선지 연결 동결 (세트 E, 16문항 80선지)

- 동결본: `frozen-3runs/`(`freeze-choice-link.mjs`, 덮어쓰기 없음, `--fixed ../supplement-fixed.json`). 2026-11-06 코드 에이전트.
- 입력 회차: `runs-final/`(복사본, `SOURCES.txt`). 플라스틱·오디오·경마식 3회차는 원 3회차가 응답 없는 오류(시간 초과 1, 연결 오류 2)라 사용자 승인("3요청 재전송 승인")으로 다시 보낸 `runs/<key>/r3-rerun`을 썼다. 동결 스크립트가 `r<n>` 폴더만 읽어 스크립트를 고치지 않고 복사로 맞췄다.
- 결과: 위반 0, 미결(UNRESOLVED_TYPE) 0. 2회차 기준 잠정 시험(`frozen/`)의 미결 4건(플라스틱 q10 ①②⑤, 오디오 q17 ④)은 3회차가 들어와 다수결로 풀렸다.
- 해설 불일치(DIFFER) 1건, 덮어쓰지 않음:
  - 의식과 인지 q15 ①("감각과 지각 모두 물질세계에서 이루어지기 때문에"): 3회 모두 ADDED_CONTENT(원문에 없는 이유 추가). EBSi는 "객관주의 입장의 일부이며 그 입장도 감각과 지각을 구분한다"고 설명하지만, 원문 (나)에는 감각·지각의 발생 세계를 그렇게 규정한 문장이 없다. 오답 판단(FALSE)은 해설과 같고 이유 설명만 다르며, 원문 근거로는 연결 쪽이 맞다고 본다.
  - 잠정 시험의 오디오 q17 ④ DIFFER는 3회 동결본에서 사라졌다.
- 비틂 분포(FALSE 조각): 의식과 인지 NEGATION 11·SUBSTITUTION 3·HOLDER_SWAP 3·ADDED_CONTENT 2 / 플라스틱 PAIR_SWAP 3·SUBSTITUTION 2·NEGATION·SCOPE_EXTEND·DIRECTION 각 1 / 오디오 8종 13조각 / 경마식 DIRECTION 5·NEGATION 4·SUBSTITUTION 1.
- 비용: 첫 실행 $1.3586(12요청, 9건 성공) + 재전송 $0.2839(3요청) = $1.6425(상한 $3.0 안).
