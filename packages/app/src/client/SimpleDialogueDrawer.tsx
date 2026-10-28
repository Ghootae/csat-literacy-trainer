import { useEffect, useRef, useState } from 'react';
import type { SimpleAttemptInspection, SimpleInspection, SimpleMessageView, SimpleStepInspection } from '../shared/dialogue-simple.js';
import { inspectSimple, saveSimpleMemo } from './simple-dialogue-api.js';
import './problem-evaluation-drawer.css';

const outcomeLabel: Record<string, string> = {
  CAPTURED: '핵심을 잡음', NO_RESPONSE: '응답 없음으로 넘어감', GAP_REVEALED: '구멍을 알려 주고 마침', ERRORS_REVEALED: '오류를 바로잡고 마침',
};
const attemptStatusLabel = (a: SimpleAttemptInspection) =>
  a.status === 'DONE' ? `완료 · ${outcomeLabel[a.state.outcome ?? ''] ?? a.state.outcome}` : a.status === 'ABANDONED' ? '중단' : '진행 중';
const AUTOSAVE_MS = 1000;

/** 대화 말풍선. 학생 발화 인용(quote), 번호 목록(items), 부분별 문단 핵심 상자(parts)가 있으면 함께 그린다. */
export function SimpleBubble({ message: m }: { message: SimpleMessageView }) {
  return <div className={`chat-message ${m.role}${m.kind === 'WAIT_DONE' ? ' simple-wait-done' : ''}`}><small className="simple-label">{m.label}</small>
    {m.quote && <blockquote className="simple-bubble-quote">“{m.quote}”</blockquote>}
    <p>{m.text}</p>{m.items && <ol className="simple-bubble-items">{m.items.map((q, i) => <li key={i}>{q}</li>)}</ol>}{m.parts && <div className="simple-bubble-box"><ol>{m.parts.map((q, i) => <li key={i}>{q}</li>)}</ol></div>}</div>;
}

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
  const out = step.output as { category: string; reason: string; coreParts: { description: string; sourceQuote: string }[]; corePartsCovered: boolean[];
    errors: { studentQuote: string; correction: string; sourceQuote: string; corePartIndex: number; gapIndex: number | null; feedback: string }[];
    gaps: { corePartIndex: number; description: string; sourceQuote: string; question: string; asksOneThing: boolean }[]; targetErrorResolved: boolean | null; targetGapReadings: string[] | null; targetGapsFilled: boolean[] | null; restatedSummary: string; corePartSummaries: string[]; closingFeedback: string | null; coreSourceQuote: string | null };
  return <article className="evaluation-card simple-step">
    <h3>{step.stepIndex + 1}단계 · {step.stage}</h3>
    <blockquote>{step.studentText}</blockquote>
    <p><strong>분류</strong> {out.category}{out.targetErrorResolved !== null && ` · 고치게 한 오류 해결=${String(out.targetErrorResolved)}`}{out.targetGapsFilled !== null && ` · 물은 빈 곳 채움: [${out.targetGapsFilled.join(', ')}]`}</p>
    <p><strong>기대 행동</strong> {step.expectedAction} · <strong>적용 행동</strong> {step.action}{step.expectedAction === step.action ? '' : ' (불일치)'}</p>
    <p>{out.reason}</p>
    {!!out.coreParts.length && <div className="simple-quote"><small>핵심 부분 (이 문단의 기준)</small>{out.coreParts.map((c, i) => <p key={i}>부분 {i + 1}: {c.description} · 원문 “{c.sourceQuote}”</p>)}</div>}
    <p><strong>핵심 부분 담음</strong> {out.corePartsCovered.length ? out.corePartsCovered.map((c, i) => `부분 ${i + 1}: ${c ? '담음' : '못 담음'}`).join(' · ') : '(기준 부분 없음)'}</p>
    {out.targetGapReadings && out.targetGapsFilled && <div className="simple-quote">{out.targetGapReadings.map((r, i) => <p key={i}>질문 {i + 1}번 · 학생 답 읽기: {r || '(읽을 답 없음)'} · 채움={String(out.targetGapsFilled![i])}</p>)}</div>}
    {out.errors.map((e, i) => <div key={i} className="simple-quote"><small>오류 {i + 1} · 부분 {e.corePartIndex + 1}{e.gapIndex !== null && ` · 질문 ${e.gapIndex + 1}번`}</small><p>학생: “{e.studentQuote}”</p><p>정정: {e.correction}</p><p>원문: “{e.sourceQuote}”</p>{e.feedback && <p>바로잡기 말: {e.feedback}</p>}</div>)}
    {out.gaps.map((g, i) => <div key={i} className="simple-quote"><small>구멍 {i + 1} · 부분 {g.corePartIndex + 1} · 한 가지만 묻기={g.asksOneThing ? '예' : '아니오'}</small><p>{g.description}</p><p>질문: {g.question}</p><p>원문: “{g.sourceQuote}”</p></div>)}
    <p><strong>다시 정리한 요약</strong> {out.restatedSummary || '(없음)'}</p>
    {!!out.corePartSummaries.length && <div><strong>핵심 부분 문장</strong><ol>{out.corePartSummaries.map((s, i) => <li key={i}>{s}</li>)}</ol></div>}
    {out.closingFeedback && <p><strong>마무리 피드백</strong> {out.closingFeedback}</p>}
    {out.coreSourceQuote && <p><strong>핵심 근거 문장</strong> “{out.coreSourceQuote}”</p>}
    <p><strong>학생에게 보인 말</strong> {step.message}</p>
    {!!step.validationFailures.length && <details open><summary>검증 실패 이력 · {step.validationFailures.length}회</summary>
      {step.validationFailures.map((f, i) => <div key={i}><ul>{f.problems.map((p, j) => <li key={j}>{p}</li>)}</ul><pre>{JSON.stringify(f.rawOutput, null, 2)}</pre></div>)}</details>}
    <small>{step.call.model} · {step.call.promptVersion} · {step.call.durationMs}ms · 입력 {step.call.inputTokens} / 출력 {step.call.outputTokens} / 캐시 {step.call.cachedTokens} 토큰 · 호출 {step.call.attempts}회</small>
    <details><summary>원출력</summary><pre>{JSON.stringify(step.output, null, 2)}</pre></details>
    <MemoField label="이 단계의 인상 메모" initial={memo} save={save} />
  </article>;
}

export function SimpleDialogueDrawer({ sessionId, paragraphIndex, attemptNumber, attemptCount, close }:
  { sessionId: string; paragraphIndex: number; attemptNumber: number; attemptCount: number; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<SimpleInspection | null>(null);
  const [selected, setSelected] = useState(attemptNumber);
  const [error, setError] = useState('');
  useEffect(() => { const el = ref.current; el?.showModal(); return () => el?.close(); }, []);
  useEffect(() => {
    let active = true; setData(null); setError(''); setSelected(attemptNumber);
    inspectSimple(sessionId, paragraphIndex).then(next => { if (active) setData(next); }).catch((reason: unknown) => { if (active) setError(String(reason)); });
    return () => { active = false; };
  }, [sessionId, paragraphIndex, attemptNumber, attemptCount]);
  const memo = (attempt: number | null, stepIndex: number | null) => (text: string) => saveSimpleMemo(sessionId, { paragraphIndex, attemptNumber: attempt, stepIndex, text });
  const attempt = data?.attempts.find(a => a.attemptNumber === selected) ?? data?.attempts.at(-1);
  return <dialog ref={ref} className="learning-drawer problem-evaluation-drawer" aria-label="단계별 판정" onCancel={close}>
    <header><div><small>DEVELOPER / SIMPLE-HOLISTIC</small><h2>문단 {paragraphIndex + 1} 단계별 판정</h2></div><button onClick={close} aria-label="단계별 판정 닫기">닫기 ×</button></header>
    {error ? <p role="alert">조회 실패: {error}</p> : !data || !attempt ? <p role="status">불러오는 중…</p> : <>
      <MemoField key={`paragraph-${paragraphIndex}`} label="문단 전체 인상 메모" initial={data.memos.paragraph} save={memo(null, null)} />
      <nav className="simple-attempt-tabs" aria-label="시도 선택">{data.attempts.map(a =>
        <button key={a.attemptNumber} aria-pressed={a.attemptNumber === attempt.attemptNumber} onClick={() => setSelected(a.attemptNumber)}>
          시도 {a.attemptNumber} · {attemptStatusLabel(a)}</button>)}</nav>
      <section className="evaluation-overview"><p>{attemptStatusLabel(attempt)} · 질문 {attempt.state.questionsAsked} / 2 · 다시 쓰기 {attempt.state.retryUsed ? '사용' : '미사용'}</p>
        <div className="simple-transcript" aria-label="이 시도의 대화">{!attempt.messages.length && <p>아직 대화가 없습니다.</p>}
          {attempt.messages.map((m, i) => <SimpleBubble key={i} message={m} />)}</div></section>
      <MemoField key={`attempt-${attempt.attemptNumber}`} label="이 시도의 인상 메모" initial={attempt.memos.attempt} save={memo(attempt.attemptNumber, null)} />
      {!attempt.steps.length && <p>아직 모델 판정이 없습니다.</p>}
      {attempt.steps.map(step => <Step key={`${attempt.attemptNumber}-${step.stepIndex}`} step={step} memo={attempt.memos.steps[step.stepIndex] ?? ''} save={memo(attempt.attemptNumber, step.stepIndex)} />)}
    </>}
  </dialog>;
}
