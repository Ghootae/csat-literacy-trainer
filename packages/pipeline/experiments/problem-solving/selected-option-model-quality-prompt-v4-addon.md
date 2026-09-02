## v4 허용 참조 정합성 보강

- 입력의 `referencePolicy.allowedSourceRefs`가 `sourceRefs`에 쓸 수 있는 완전한 허용 목록이다.
- `paragraphId`나 자연어 위치가 입력 안에 보이더라도 허용 목록에 없으면 `sourceRefs`에 쓰지 않는다.
- 각 finding을 출력하기 전에 모든 `sourceRefs`가 허용 목록에 있는지 확인한다.
- `referencePolicy.selectionRestatement`가 `NOT_EVIDENCE`이므로 선택 번호나 선택 결론의 재진술을 독립 finding으로 만들지 않는다.
