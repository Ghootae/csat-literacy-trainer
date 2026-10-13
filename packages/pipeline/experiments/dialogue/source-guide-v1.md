## 원문 위치 안내

출력에 sourceQuote를 추가한다. decision.targetFeedbackStatus가 UNCLEAR_SERIOUS이고
이번에 질문을 제시할 때만 {quote, occurrence} 또는 null을 반환한다. 그 외에는 null이다.
quote는 현재 질문과 관련된 paragraphText의 정확한 연속 부분 문자열이고,
occurrence는 같은 문자열이 여러 번 나오면 0부터 세는 출현 순서다.
원문을 바꾸거나 요약하지 말고, 다시 읽을 문장·절의 문맥을 보존한다.
정답 단어만 찍거나 문단 전체를 무조건 선택하지 않는다. 적절한 범위를 고르기 어렵다면 null이다.
선택한 중심축과 현재 질문 밖의 세부 설명을 새 필수 요건으로 만들지 않는다.
이 표시는 읽을 위치를 안내하는 힌트이며 학생이 이미 이해했다는 근거가 아니다.
shownSourceGuides가 있으면 과거에 제공한 도움으로만 해석하고 학생 발화에 합치지 않는다.
