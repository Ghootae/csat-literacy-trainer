import { useEffect, useRef, useState } from 'react';
import type { ProblemDeveloperInspection, ProblemSessionView } from '../shared/contract.js';
import { fetchProblemInspection } from './api.js';
import './problem-evaluation-drawer.css';

const phaseLabels: Record<ProblemSessionView['phase'], string> = {
  AWAITING_INITIAL_CHOICE: '최초 선택 대기', AWAITING_RATIONALE: '근거 입력 대기',
  PROCESSING: '평가 처리 중', EVALUATION_ERROR: '시스템 오류 · 재개 가능',
  AWAITING_RESPONSE: '질문 답변 대기', AWAITING_RESELECTION: '재선택 대기', COMPLETED: '풀이 종료',
};
const labels: Record<string, string> = {
  SUPPORTED: '근거 타당', UNCERTAIN: '근거 확인 불가 / 불충분', CLEAR_ERROR: '명시적 오류',
  INSUFFICIENT_EVIDENCE: '판단 증거 불충분', NOT_PROVIDED: '근거 미제출', NOT_EVALUATED: '별도 평가 안 함',
  ASK_DIAGNOSTIC: '확인 질문', ASK_CORRECTIVE: '교정 질문', REQUEST_RESELECTION: '재선택 요청',
  DIRECT_COACHING: '상세 코칭', EXPLAIN_ITEM_BOUNDARY: '문항 경계 안내', COMPLETE: '종료',
  PATH_UNCLEAR: '추론 경로 불명확', PATH_CLARIFIED: '추론 경로 파악',
  CORRECTED: '수정 확인', NOT_CORRECTED: '수정 미확인',
};
const label = (value: string) => labels[value] ?? value;
const tone = (value: string) => value === 'SUPPORTED' || value === 'CORRECTED' ? 'positive'
  : value === 'CLEAR_ERROR' ? 'negative' : 'neutral';

export function ProblemEvaluationDrawer({ session, close }: {
  session: ProblemSessionView; close: () => void;
}): React.JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const [inspection, setInspection] = useState<ProblemDeveloperInspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    let active = true;
    setInspection(null);
    setError(null);
    void fetchProblemInspection(session.sessionId).then((value) => {
      if (active) { setInspection(value); setSelected(null); }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => { active = false; };
  }, [session, refresh]);
  const current = inspection?.session;
  const evaluations = inspection?.evaluations ?? [];
  const index = selected ?? evaluations.length - 1;
  const evaluation = evaluations[index];
  return <dialog ref={dialog} className="learning-drawer problem-evaluation-drawer" aria-label="응답 평가" onCancel={close}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }}>
    <header><div><small>DEVELOPER / READ ONLY</small><h2>응답 평가</h2></div><button onClick={close} aria-label="응답 평가 닫기">닫기 ×</button></header>
    <p className="evaluation-note">현재 운영 v3의 저장된 판정입니다. 조회만 하며 재채점하거나 풀이 상태를 바꾸지 않습니다.</p>
    <button onClick={() => setRefresh((value) => value + 1)}>상태 새로고침</button>
    {error ? <p role="alert">평가 상태를 불러오지 못했습니다. {error}</p> : !current ? <p role="status">평가 상태를 불러오는 중…</p> : <>
      <section className="evaluation-overview" aria-label="현재 진행 상태">
        <span className={`evaluation-badge ${current.phase === 'EVALUATION_ERROR' ? 'negative' : 'neutral'}`}>{phaseLabels[current.phase]}</span>
        <dl><div><dt>제출한 선택</dt><dd>{current.selectedChoiceId === null ? '아직 제출하지 않음' : `${current.content.choices.find((choice) => choice.choiceId === current.selectedChoiceId)?.position ?? '?'}번`}</dd></div>
          <div><dt>선택 횟수</dt><dd>{current.selectionProgress.current} / {current.selectionProgress.maximum}</dd></div>
          <div><dt>이번 선택 질문</dt><dd>{current.attemptQuestionBudget.used} / {current.attemptQuestionBudget.maximum}</dd></div></dl>
        {current.evaluation.message && <p role="alert">{current.evaluation.message} 학생 사고 오류와 별개인 시스템 상태입니다.</p>}
      </section>
      <section aria-label="판정 이력"><h3>판정 이력 <small>{evaluations.length}건</small></h3>
        {!evaluations.length ? <p className="evaluation-note">저장된 모델 판정이 없습니다. 입력 대기나 근거 미제출을 교정 실패로 간주하지 않습니다.</p> : <>
          <div className="evaluation-turns" aria-label="판정 선택">{evaluations.map((entry, i) => <button key={i} aria-pressed={index === i} onClick={() => setSelected(i)}>{i + 1}차 · {label(entry.assessment)}</button>)}</div>
          {evaluation && <article className="evaluation-card">
            <h4>{index + 1}차 {evaluation.mode === 'DIAGNOSE_PATH' ? '추론 경로 진단' : '정답 근거 평가'}</h4>
            <span className={`evaluation-badge ${tone(evaluation.assessment)}`}>{label(evaluation.assessment)}</span>
            <p>{evaluation.reason}</p>
            <h4>판정에 사용한 학생 발화</h4>{evaluation.studentEvidence.map((evidence, i) => <blockquote key={i}>{evidence.quote}<small>{evidence.observationId}</small></blockquote>)}
            {evaluation.reconstructedPath && <><h4>모델이 재구성한 학생 추론</h4><p>{evaluation.reconstructedPath}</p><small>학생 원문과 구별되는 모델의 해석입니다.</small></>}
            <dl>{evaluation.learningState && <div><dt>학습 상태</dt><dd>{label(evaluation.learningState)}</dd></div>}
              {evaluation.divergenceLayer && <div><dt>오류 분류</dt><dd>{evaluation.divergenceLayer}</dd></div>}
              {evaluation.nextAction && <div><dt>모델의 다음 행동 제안</dt><dd>{label(evaluation.nextAction)}</dd></div>}</dl>
            <p className="evaluation-note">실제 진행은 위 ‘현재 진행 상태’를 기준으로 확인하세요. 과거 판정은 현재 답변의 판정이 아닙니다.</p>
            <details><summary>원문 근거 · 판정 필드</summary><pre>{JSON.stringify(evaluation, null, 2)}</pre></details>
          </article>}
        </>}
      </section>
      {current.result && <section className="evaluation-card" aria-label="최종 평가"><h3>최종 평가</h3>
        <div className="evaluation-result-badges"><span className={`evaluation-badge ${current.result.correct ? 'positive' : 'negative'}`}>{current.result.correct ? '최종 선택 정답' : '최종 선택 오답'}</span><span className={`evaluation-badge ${tone(current.result.rationaleAssessment)}`}>{label(current.result.rationaleAssessment)}</span></div>
        <p>정답 선택과 근거 검증은 별개입니다.</p>
        <dl><div><dt>학생 스스로 해결</dt><dd>{current.result.resolvedByStudent ? '예' : '아니요'}</dd></div><div><dt>정답 공개</dt><dd>{current.result.answerRevealed ? '예' : '아니요'}</dd></div></dl>
        <details><summary>종료 판정 필드</summary><pre>{JSON.stringify(current.result, null, 2)}</pre></details>
      </section>}
    </>}
  </dialog>;
}
