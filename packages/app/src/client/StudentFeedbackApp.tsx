import { useEffect, useState } from 'react';

import type { StudentStateReportView } from '../shared/contract.js';
import { fetchStudentPeriodicFeedback } from './api.js';

const dimensionLabel = {
  CORE_COMPREHENSION: '핵심 관계 이해',
  GROUNDED_PROBLEM_SOLVING: '근거를 갖춘 문제 해결',
  REPAIR_RECOVERY: '피드백 뒤 교정과 회복',
  SELF_MONITORING: '확신과 실제 수행의 점검',
};
const reliabilityLabel = { INSUFFICIENT: '아직 자료가 적어요', EARLY_PATTERN: '잠정적인 패턴이에요', REPEATED_PATTERN: '여러 학습에서 확인됐어요' };

export function StudentFeedbackApp(): React.JSX.Element {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [report, setReport] = useState<StudentStateReportView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReport(null); setError(null);
    fetchStudentPeriodicFeedback(days).then((value) => { if (active) setReport(value); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { active = false; };
  }, [days]);

  return <main className="student-feedback-shell">
    <header className="student-feedback-header"><div><p className="dialogue-kicker">COGAXIS / LEARNING REVIEW</p><h1>나의 읽기 학습 돌아보기</h1>
      <p>정답률 하나가 아니라, 도움 없이 이해한 부분과 피드백 뒤 수정한 과정을 함께 봅니다.</p></div>
      <a href="/dialogue">학습으로 돌아가기</a></header>
    <label className="student-feedback-window">관측 기간 <select value={days} onChange={(event) => setDays(Number(event.target.value) as 7 | 30 | 90)}>
      <option value={7}>최근 7일</option><option value={30}>최근 30일</option><option value={90}>최근 90일</option>
    </select></label>
    {error ? <section className="student-feedback-empty" role="alert"><h2>아직 피드백을 열 수 없어요</h2><p>{error}</p><a href="/dialogue">학습 계속하기</a></section>
      : !report ? <p role="status">학습 기록을 불러오는 중…</p> : <>
        <section className="student-feedback-summary"><h2>{report.feedback.headline}</h2>
          {report.feedback.strengths.length > 0 && <div><h3>지금까지 보인 강점 후보</h3><ul>{report.feedback.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          {report.feedback.focusAreas.length > 0 && <div><h3>다음에 연습할 후보</h3><ul>{report.feedback.focusAreas.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          <p className="student-feedback-next"><strong>다음 학습에서</strong>{report.feedback.nextAction}</p>
        </section>
        <section className="student-feedback-grid" aria-label="학습 상태 차원">{report.profile.dimensions.map((dimension) => <article key={dimension.dimension}>
          <header><h2>{dimensionLabel[dimension.dimension]}</h2><span>{reliabilityLabel[dimension.reliability]}</span></header>
          <div className="student-evidence-bars" aria-label={`${dimensionLabel[dimension.dimension]} 증거`}>
            <div><span>확인된 수행</span><strong>{dimension.positive}</strong></div>
            <div><span>다음 연습 단서</span><strong>{dimension.negative}</strong></div>
            <div><span>판단 유보</span><strong>{dimension.indeterminate}</strong></div>
          </div><small>{dimension.dimension === 'SELF_MONITORING'
            ? `서로 다른 문제 ${dimension.distinctContentCount}개에서 확신도를 비교`
            : `서로 다른 학습 자료 ${dimension.distinctContentCount}개 관측 · 상태 판단 가능 ${dimension.determinateDistinctContentCount}개`}</small>
        </article>)}</section>
        <details className="student-feedback-caveats"><summary>이 피드백을 해석할 때</summary><ul>{report.feedback.caveats.map((item) => <li key={item}>{item}</li>)}</ul></details>
      </>}
  </main>;
}
