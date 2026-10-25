import { useEffect, useRef, useState } from 'react';
import type { FeedbackInspection, FeedbackWorkbenchView } from '../shared/problem-feedback.js';
import { inspectFeedback } from './problem-feedback-api.js';
import './problem-evaluation-drawer.css';

const labels: Record<string, string> = {
  VALID: '참', INVALID: '거짓', UNKNOWN: '확인 불가', RECONSTRUCTABLE: '재구성 가능',
  SUPPORTED: '근거 타당', INSUFFICIENT: '근거 불충분', ERROR: '명시적 오류',
  REPAIRED: '수정 확인', REMAINING: '오류 남음', UNCONFIRMED: '수정 확인 불가',
  CONSISTENT: '일치', MISMATCH: '불일치', CONTENT: '내용 오류', SELECTION_EXECUTION: '선택 실행 오류',
};
const label = (s: string) => labels[s] ?? s;
export function FeedbackDrawer({ view, close }: { view: FeedbackWorkbenchView; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<FeedbackInspection | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { const el = ref.current; el?.showModal(); return () => el?.close(); }, []);
  useEffect(() => {
    let active = true; setData(null); setError('');
    void inspectFeedback(view.sessionId).then(next => { if (active) { setData(next); setSelected(null); } })
      .catch((reason: unknown) => { if (active) setError(String(reason)); });
    return () => { active = false; };
  }, [view.sessionId, view.revision, view.evaluationStatus, refresh]);
  const index = selected ?? (data?.assessments.length ?? 0) - 1;
  const assessment = data?.assessments[index];
  return <dialog ref={ref} className="learning-drawer problem-evaluation-drawer" aria-label="응답 평가" onCancel={close}>
    <header><div><small>DEVELOPER / FEEDBACK</small><h2>응답 평가</h2></div><button onClick={close} aria-label="응답 평가 닫기">닫기 ×</button></header>
    <p className="evaluation-note">저장된 평가를 조회합니다. 학생 발화와 모델의 해석은 구분하며, 조회로 재채점하지 않습니다.</p>
    <button onClick={() => setRefresh(n => n + 1)}>상태 새로고침</button>
    <section className="evaluation-overview"><h3>현재 진행</h3><p>{view.evaluationStatus === 'RETRYABLE_ERROR' ? '시스템 평가 오류 · 학생 오류 아님' : view.evaluationStatus === 'PROCESSING' ? '평가 처리 중' : view.phase === 'COMPLETED' ? '풀이 종료' : '학생 입력 대기'}</p>
      <dl><div><dt>선택 횟수</dt><dd>{view.selectionCount} / {view.maxSelections}</dd></div><div><dt>교정 질문</dt><dd>{view.questionsAsked} / 최초 오류 {view.questionTargets}개</dd></div><div><dt>감점 대상 선택</dt><dd>{view.penaltyEligibleSelections}회 · 실제 차감 {view.pointsDeducted}</dd></div></dl>
    </section>
    {error ? <p role="alert">조회 실패: {error}</p> : !data ? <p role="status">평가 불러오는 중…</p> : <>
      <section className="evaluation-card"><h3>선택과 근거의 결론</h3><p>이 발문은 <strong>{label(data.choiceImpliedVerdict)}인 선지</strong>를 선택하는 유형입니다.</p>
        {data.comparisons.length === 0 ? <p>아직 비교한 결론이 없습니다.</p> : data.comparisons.map((c, i) => <p key={c.observationId}>{i + 1}차 근거 결론: {label(c.rationaleImpliedVerdict)} · 선택 의미와 {label(c.selectionRationaleConsistency)}</p>)}
        <small>교정 답변을 과거 선택과 비교해 새 실행 오류로 만들지 않습니다.</small></section>
      <h3>판정 이력 · {data.assessments.length}건</h3>
      {!data.assessments.length && <p>아직 모델 판정이 없습니다. 미제출은 교정 실패가 아닙니다.</p>}
      <div className="evaluation-turns">{data.assessments.map((a, i) => <button key={i} aria-pressed={index === i} onClick={() => setSelected(i)}>{i + 1}차 {a.mode === 'SELECTION' ? '선택 평가' : '교정 평가'}</button>)}</div>
      {assessment && <article className="evaluation-card"><h3>{index + 1}차 판정</h3>
        {assessment.contentAssessment && <span className={`evaluation-badge ${assessment.contentAssessment === 'SUPPORTED' ? 'positive' : assessment.contentAssessment === 'ERROR' ? 'negative' : 'neutral'}`}>{label(assessment.contentAssessment)}</span>}
        <p>{assessment.reason}</p><h4>판정에 사용한 학생 발화</h4>{assessment.studentEvidence.map((e, i) => <blockquote key={i}>{e.quote}<small>{e.observationId}</small></blockquote>)}
        {assessment.mode === 'SELECTION' && <><h4>모델이 재구성한 학생 추론</h4>{assessment.reconstructedPath.length ? <ol>{assessment.reconstructedPath.map((p, i) => <li key={i}>{p}</li>)}</ol> : <p>재구성 확인 불가</p>}<p>근거에서 도출한 결론: {label(assessment.verdict ?? 'UNKNOWN')}</p></>}
        {assessment.repairs.map(r => <p key={r.errorId}>{r.errorId} · {label(r.status)}</p>)}
        <details><summary>판정 상세 필드</summary><pre>{JSON.stringify(assessment.raw, null, 2)}</pre></details>
      </article>}
      {!!data.errors.length && <section className="evaluation-card"><h3>누적 교정 상태</h3>{data.errors.map(e => <div className="lab-error-state" key={e.errorId}><span className={`evaluation-badge ${e.status === 'REPAIRED' ? 'positive' : 'neutral'}`}>{label(e.status)}</span><p>{e.errorId} · {label(e.kind)} · {e.description}</p><small>{e.skipped ? '앞선 답변에서 수정되어 질문 생략' : e.asked ? '질문 제시됨' : '질문 대기'}</small></div>)}{data.additionalErrors.map(e => <p key={e.errorId}>새 오류 · {e.description} · {label(e.status)} (질문 추가 없음)</p>)}</section>}
    </>}
    {view.result && <section className="evaluation-card" aria-label="최종 평가"><h3>최종 평가</h3><div className="evaluation-result-badges"><span className="evaluation-badge">{view.result.choiceCorrect ? '선택 정답' : '선택 오답'}</span><span className={`evaluation-badge ${view.result.rationaleVerified ? 'positive' : 'neutral'}`}>{view.result.rationaleVerified ? '근거 검증' : '근거 미검증'}</span></div><p>{view.result.outcome === 'COACHING_TERMINATED' ? '상세 코칭·정답 공개로 종료' : '정답으로 종료'}</p><p>실제 교정 성공: {view.result.correctionSucceeded ? '예' : '아니요 / 해당 없음'}<br />정답 공개: {view.result.answerRevealed ? '예' : '아니요'}</p></section>}
  </dialog>;
}
