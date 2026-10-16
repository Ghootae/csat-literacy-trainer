import { useEffect, useRef, useState } from 'react';
import type { SimpleInspection, SimpleStepInspection } from '../shared/dialogue-simple.js';
import { inspectSimple, saveSimpleMemo } from './simple-dialogue-api.js';
import './problem-evaluation-drawer.css';

const outcomeLabel: Record<string, string> = {
  CAPTURED: '핵심을 잡음', NO_RESPONSE: '응답 없음으로 넘어감', GAP_REVEALED: '구멍을 알려 주고 마침', ERRORS_REVEALED: '오류를 바로잡고 마침',
};
const AUTOSAVE_MS = 1000;

/** 입력이 멈춘 뒤 1초 또는 포커스를 잃을 때 자동 저장한다. */
function MemoField({ label, initial, save }: { label: string; initial: string; save: (text: string) => Promise<unknown> }) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<'saved' | 'dirty' | 'saving' | 'error'>(initial ? 'saved' : 'dirty');
  const saved = useRef(initial);
  const latest = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flush = () => {
    clearTimeout(timer.current);
    if (latest.current === saved.current) return;
    const value = latest.current; setStatus('saving');
    save(value).then(() => { saved.current = value; setStatus(latest.current === value ? 'saved' : 'dirty'); }).catch(() => setStatus('error'));
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return <label className="simple-memo">{label}
    <textarea value={text} placeholder="인상 메모" onBlur={flush} onChange={e => {
      latest.current = e.target.value; setText(e.target.value); setStatus('dirty');
      clearTimeout(timer.current); timer.current = setTimeout(flush, AUTOSAVE_MS);
    }} />
    <small role="status">{status === 'saved' && saved.current ? '저장됨' : status === 'saving' ? '저장 중…' : status === 'error' ? '저장 실패 — 다시 입력하거나 포커스를 옮겨 주세요' : ''}</small>
  </label>;
}

function Step({ step, memo, save }: { step: SimpleStepInspection; memo: string; save: (text: string) => Promise<unknown> }) {
  const out = step.output as { category: string; reason: string; errors: { studentQuote: string; correction: string; sourceQuote: string }[];
    gap: { description: string; sourceQuote: string } | null; targetErrorResolved: boolean | null; coreSummary: string | null };
  return <article className="evaluation-card simple-step">
    <h3>{step.stepIndex + 1}단계 · {step.stage}</h3>
    <blockquote>{step.studentText}</blockquote>
    <p><strong>분류</strong> {out.category}{out.targetErrorResolved !== null && ` · 고치게 한 오류 해결=${String(out.targetErrorResolved)}`}</p>
    <p><strong>기대 행동</strong> {step.expectedAction} · <strong>적용 행동</strong> {step.action}{step.expectedAction === step.action ? '' : ' (불일치)'}</p>
    <p>{out.reason}</p>
    {out.errors.map((e, i) => <div key={i} className="simple-quote"><small>오류 {i + 1}</small><p>학생: “{e.studentQuote}”</p><p>정정: {e.correction}</p><p>원문: “{e.sourceQuote}”</p></div>)}
    {out.gap && <div className="simple-quote"><small>구멍</small><p>{out.gap.description}</p><p>원문: “{out.gap.sourceQuote}”</p></div>}
    {out.coreSummary && <p><strong>핵심 정리</strong> {out.coreSummary}</p>}
    <p><strong>학생에게 보인 말</strong> {step.message}</p>
    {!!step.validationFailures.length && <details open><summary>검증 실패 이력 · {step.validationFailures.length}회</summary>
      {step.validationFailures.map((f, i) => <div key={i}><ul>{f.problems.map((p, j) => <li key={j}>{p}</li>)}</ul><pre>{JSON.stringify(f.rawOutput, null, 2)}</pre></div>)}</details>}
    <small>{step.call.model} · {step.call.promptVersion} · {step.call.durationMs}ms · 입력 {step.call.inputTokens} / 출력 {step.call.outputTokens} / 캐시 {step.call.cachedTokens} 토큰 · 호출 {step.call.attempts}회</small>
    <details><summary>원출력</summary><pre>{JSON.stringify(step.output, null, 2)}</pre></details>
    <MemoField label="이 단계의 인상 메모" initial={memo} save={save} />
  </article>;
}

export function SimpleDialogueDrawer({ sessionId, paragraphIndex, close }: { sessionId: string; paragraphIndex: number; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<SimpleInspection | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { const el = ref.current; el?.showModal(); return () => el?.close(); }, []);
  useEffect(() => {
    let active = true; setData(null); setError('');
    inspectSimple(sessionId, paragraphIndex).then(next => { if (active) setData(next); }).catch((reason: unknown) => { if (active) setError(String(reason)); });
    return () => { active = false; };
  }, [sessionId, paragraphIndex]);
  const memo = (stepIndex: number | null) => (text: string) => saveSimpleMemo(sessionId, { paragraphIndex, stepIndex, text });
  return <dialog ref={ref} className="learning-drawer problem-evaluation-drawer" aria-label="단계별 판정" onCancel={close}>
    <header><div><small>DEVELOPER / SIMPLE-HOLISTIC</small><h2>문단 {paragraphIndex + 1} 단계별 판정</h2></div><button onClick={close} aria-label="단계별 판정 닫기">닫기 ×</button></header>
    {error ? <p role="alert">조회 실패: {error}</p> : !data ? <p role="status">불러오는 중…</p> : <>
      <section className="evaluation-overview"><p>{data.state.done ? outcomeLabel[data.state.outcome ?? ''] ?? data.state.outcome : '진행 중'} · 질문 {data.state.questionsAsked} / 2 · 다시 쓰기 {data.state.retryUsed ? '사용' : '미사용'}</p></section>
      <MemoField label="문단 전체 인상 메모" initial={data.memos.paragraph} save={memo(null)} />
      {!data.steps.length && <p>아직 모델 판정이 없습니다.</p>}
      {data.steps.map(step => <Step key={step.stepIndex} step={step} memo={data.memos.steps[step.stepIndex] ?? ''} save={memo(step.stepIndex)} />)}
    </>}
  </dialog>;
}
