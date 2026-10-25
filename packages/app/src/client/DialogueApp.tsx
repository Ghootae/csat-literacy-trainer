import { useEffect, useRef, useState } from 'react';
import type { DialogueDeveloperInspection, DialogueDeveloperPassage, DialoguePassageSummary, DialogueSessionView, DialogueStepView, DialogueMode, StudentStateReportView } from '../shared/contract.js';
import { advanceDialogueSession, fetchAppCapabilities, fetchDialoguePassages, fetchDialogueSession, navigateDialogueSession, requestDialogueQuestion,
  startLinkedProblemSession, startDialogueSession, submitDialogueResponse, submitDialogueRevision, fetchDeveloperMap, fetchDeveloperInspection, fetchStudentStateReport, openDeveloperDialogue } from './api.js';

const outcomeLabel = { UNSTARTED: '미시작', ACTIVE: '진행 중', PASS: '확인 완료', UNRESOLVED: '확인 미완료', SKIPPED: '넘어감' };
const axisLabel = { PENDING: '응답 전', PASS: '확인했어요', UNCLEAR_OK: '원하면 더 보완해요', UNCLEAR_SERIOUS: '더 확인하고 싶어요', ERROR: '원문과 다시 비교해요' };
const routeLabel = { SILENT_PASS: '확인했어요', OPTIONAL_REPAIR: '큰 흐름 확인 · 선택적 보완', ASK: '더 확인하고 싶어요', ERROR_QUESTION: '오류 교정 질문' };
const modeLabel = { v4: '기존 V4', 'conditional-meta-v1': '구체 인정 L1 + 조건부 L2', 'v4-boundary-show': 'V4 + 경계 보여 주기' };
const assetNotice = { OK: '', MISSING: '밑줄 자산 없음', HASH_MISMATCH: '밑줄 자산 해시 불일치' };
const stateDimensionLabel = { CORE_COMPREHENSION: '독립 핵심 이해', GROUNDED_PROBLEM_SOLVING: '근거 기반 문제 해결', REPAIR_RECOVERY: '교정·회복', SELF_MONITORING: '자기 점검' };
const reliabilityLabel = { INSUFFICIENT: '자료 부족', EARLY_PATTERN: '잠정적 패턴', REPEATED_PATTERN: '반복 확인' };
const number = (id: string) => id.match(/-q(\d+)$/u)?.[1] ?? '연결';
const verdictLabel = (status: DialogueStepView['status']) => status === 'PASS' ? '이해 확인' : status === 'ERROR' ? '한 부분 다시 보기' : '조금 더 확인';
const getSaved = (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } };
const save = (key: string, value: string) => { try { sessionStorage.setItem(key, value); } catch { /* Server transcript still survives navigation. */ } };

function Drawer({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className="learning-drawer" aria-label={title} onCancel={close}>
    <header><h2>{title}</h2><button onClick={close} aria-label={`${title} 닫기`}>닫기 ×</button></header>{children}
  </dialog>;
}
function JsonDetail({ label, value }: { label: string; value: unknown }) {
  return <details className="inspector-json"><summary>{label}</summary><pre>{JSON.stringify(value, null, 2)}</pre></details>;
}
function ReadingText({ text, guide }: { text: string; guide: DialogueStepView['sourceGuide'] }) {
  if (!guide || text.slice(guide.start, guide.end) !== guide.quote) return <p>{text}</p>;
  return <p>{text.slice(0, guide.start)}<mark title="현재 질문과 관련된 원문">{guide.quote}</mark>{text.slice(guide.end)}</p>;
}
function BoundaryShowCard({ view, last, busy, onRevise, onNext }: {
  view: NonNullable<DialogueSessionView['boundaryShow']>; last: boolean; busy: boolean;
  onRevise: (text: string) => void; onNext: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  if (view.action === 'PASS_THROUGH') return <section className="boundary-show" aria-label="통과"><p>잘 정리했어. 다음 문단으로 넘어가자.</p>
    <button className="primary" disabled={busy} onClick={onNext}>{last ? '문단 학습 마치기' : '다음 문단'}</button></section>;
  const parts: React.ReactNode[] = []; let at = 0;
  view.underlines.forEach((u, i) => { parts.push(view.centralObject.slice(at, u.start), <u key={i} data-axes={u.axisIds.join(' ')}>{view.centralObject.slice(u.start, u.end)}</u>); at = u.end; });
  parts.push(view.centralObject.slice(at));
  return <section className="boundary-show" aria-label="경계 보여 주기">
    <h3>내 요약</h3><p className="boundary-initial">{view.initialResponse}</p>
    <h3>이 문단에서 담아야 할 것</h3><p className="boundary-central">{parts}</p>
    {view.assetStatus !== 'OK' && <small className="muted" role="note">개발자 표시: {assetNotice[view.assetStatus]}</small>}
    <p>{view.guidance === 'ERROR' ? '밑줄 친 부분, 원문과 다르게 이해한 것 같아. 원문에서 다시 확인해 봐.' : '밑줄 친 부분을 원문에서 다시 확인해 봐.'}</p>
    {view.revision !== null && <p className="boundary-revision" role="status">고쳐 쓴 요약을 남겼어.</p>}
    {editing && <div><textarea aria-label="고쳐 쓴 요약" value={text} onChange={(e) => setText(e.target.value)} disabled={busy} />
      <button disabled={busy || !text.trim()} onClick={() => { onRevise(text); setText(''); setEditing(false); }}>고쳐 쓴 요약 남기기</button></div>}
    <div><button className="primary" disabled={busy} onClick={onNext}>{last ? '문단 학습 마치기' : '다음 문단'}</button>
      {!editing && <button disabled={busy} onClick={() => setEditing(true)}>요약 고쳐 쓰기</button>}</div>
  </section>;
}
function CurrentUnderstanding({ session, open, onToggle }: {
  session: DialogueSessionView;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  return <details className="current-understanding" open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
    <summary>현재 이해 · 중심 내용 {session.axisBoxes?.filter((a) => a.policyRoute ? ['SILENT_PASS', 'OPTIONAL_REPAIR'].includes(a.policyRoute) : a.status === 'PASS').length ?? 0} / {session.axisBoxes?.length ?? 0} 확인</summary>
    <div className="understanding-scroll"><div className="dialogue-axis-grid" aria-label="중심 내용 확인">{session.axisBoxes?.map((a, i) =>
      <article key={a.axisId} className={`dialogue-axis-box axis-${a.policyRoute === 'SILENT_PASS' || a.policyRoute === 'OPTIONAL_REPAIR' ? 'pass' : a.status.toLowerCase()}`}><strong>중심 내용 {i + 1}</strong><span>{a.policyRoute ? routeLabel[a.policyRoute] : axisLabel[a.status]}</span><p>{a.revealedText ?? (a.policyRoute === 'OPTIONAL_REPAIR' ? '큰 흐름은 확인했어요. 원하면 더 보완할 수 있어요.' : '아직 공개되지 않은 내용입니다.')}</p></article>)}</div>
      {session.step?.effectiveResponse && <section className="dialogue-effective-response" aria-label="누적 응답"><strong>지금까지 내 응답을 이렇게 이해했어요</strong><p>{session.step.effectiveResponse}</p></section>}
    </div>
  </details>;
}

export function DialogueApp(): React.JSX.Element {
  const developer = window.location.pathname.startsWith('/dialogue/dev');
  const base = developer ? '/dialogue/dev' : '/dialogue';
  const [passages, setPassages] = useState<readonly DialoguePassageSummary[] | null>(null);
  const [studentFeedbackEnabled, setStudentFeedbackEnabled] = useState(false);
  const [session, setSession] = useState<DialogueSessionView | null>(null);
  const [map, setMap] = useState<readonly DialogueDeveloperPassage[]>([]);
  const [inspection, setInspection] = useState<DialogueDeveloperInspection | null>(null);
  const [attempts, setAttempts] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<DialogueMode>(() => { const saved = getSaved('csat.dialogue.dev.mode'); return developer && (saved === 'conditional-meta-v1' || saved === 'v4-boundary-show') ? saved : 'v4'; });
  const attemptKey = (passageId: string, selectedMode = mode) => developer ? `${selectedMode}:${passageId}` : passageId;
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<'map' | 'progress' | 'state' | null>(null);
  const [stateContext, setStateContext] = useState<'student' | 'developer'>('student');
  const [stateWindowDays, setStateWindowDays] = useState<7 | 30 | 90>(30);
  const [stateReport, setStateReport] = useState<StudentStateReportView | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState('chat');
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null);
  const [understandingOpen, setUnderstandingOpen] = useState(() => window.matchMedia('(min-width: 901px)').matches);
  const chatRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const current = session?.visibleParagraphs.find((p) => p.state === 'CURRENT');
  const draftKey = session && current ? `csat.dialogue.draft.${session.sessionId}.${current.paragraphId}` : null;
  function showError(reason: unknown) { setError(reason instanceof Error ? reason.message : String(reason)); }
  function accept(next: DialogueSessionView) {
    setSession(next); setSelectedTurn(null);
    save(`${base}.session.${next.passageId}`, next.sessionId);
    if (developer) { setMode(next.mode ?? 'v4'); save('csat.dialogue.dev.mode', next.mode ?? 'v4'); }
    setAttempts((old) => ({ ...old, [attemptKey(next.passageId, next.mode ?? 'v4')]: next.sessionId }));
    window.history.replaceState(null, '', `${base}?sessionId=${encodeURIComponent(next.sessionId)}`);
  }
  async function run(work: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try { await work(); } catch (reason) { showError(reason); }
    finally { inFlight.current = false; setBusy(false); }
  }
  useEffect(() => {
    let active = true;
    fetchDialoguePassages().then((p) => { if (active) setPassages(p); }).catch(showError);
    if (!developer) fetchAppCapabilities().then((value) => { if (active) setStudentFeedbackEnabled(value.studentFeedbackEnabled); }).catch(() => { /* Optional navigation stays hidden. */ });
    if (developer) fetchDeveloperMap().then((p) => { if (active) setMap(p); }).catch(showError);
    const id = new URLSearchParams(window.location.search).get('sessionId');
    if (id) fetchDialogueSession(id).then((s) => { if (active) accept(s); }).catch(showError);
    return () => { active = false; };
  }, []);
  useEffect(() => { setDraft(draftKey ? getSaved(draftKey) ?? '' : ''); }, [draftKey]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 901px)');
    const update = () => setUnderstandingOpen(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!developer || !session) return;
    let active = true; setInspection(null); setInspectError(null);
    fetchDeveloperInspection(session.sessionId).then((v) => { if (active) setInspection(v); }).catch((e) => { if (active) setInspectError(String(e)); });
    fetchDeveloperMap().then((v) => { if (active) setMap(v); }).catch(showError);
    return () => { active = false; };
  }, [session, developer]);
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [session?.transcript?.length, session?.step?.question, understandingOpen]);
  useEffect(() => {
    if (!developer || drawer !== 'state') return;
    let active = true; setStateReport(null); setStateError(null);
    fetchStudentStateReport(stateContext, stateWindowDays).then((report) => { if (active) setStateReport(report); })
      .catch((reason) => { if (active) setStateError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { active = false; };
  }, [developer, drawer, stateContext, stateWindowDays]);
  function edit(value: string) { setDraft(value); if (draftKey) save(draftKey, value); }
  async function open(passageId: string, index = 0, fresh = false) {
    await run(async () => {
      if (developer) accept(await openDeveloperDialogue(passageId, index, fresh ? undefined : attempts[attemptKey(passageId)], fresh, mode));
      else {
        const saved = fresh ? null : getSaved(`${base}.session.${passageId}`);
        accept(saved ? await fetchDialogueSession(saved) : await startDialogueSession(passageId));
      }
      setDrawer(null); setMobilePane('chat');
    });
  }
  async function submit() {
    if (!session || !draft.trim() || busy) return;
    await run(async () => { const next = await submitDialogueResponse(session.sessionId, { text: draft.trim() }); edit(''); accept(next); });
  }
  async function navigate(index: number) {
    if (session) await run(async () => { accept(await navigateDialogueSession(session.sessionId, index)); });
  }
  async function nextParagraph() { if (session) await run(async () => accept(await advanceDialogueSession(session.sessionId))); }
  async function revise(text: string) { if (session) await run(async () => accept(await submitDialogueRevision(session.sessionId, text))); }
  async function ask() { if (session) await run(async () => accept(await requestDialogueQuestion(session.sessionId))); }
  async function problem() {
    if (!session) return;
    if (developer && session.nextProblemQuestionId) {
      window.location.assign(`/problem/lab?questionId=${encodeURIComponent(session.nextProblemQuestionId)}&returnTo=${encodeURIComponent(`${base}?sessionId=${session.sessionId}`)}`);
      return;
    }
    await run(async () => {
      const p = await startLinkedProblemSession(session.sessionId);
      save(`csat.problem.${p.content.questionId}`, p.sessionId);
      window.location.assign(`/problem?sessionId=${encodeURIComponent(p.sessionId)}&dialogueSessionId=${encodeURIComponent(session.sessionId)}${developer ? `&returnTo=${encodeURIComponent(`${base}?sessionId=${session.sessionId}`)}` : ''}`);
    });
  }
  function exit() { if (busy) return; setSession(null); setInspection(null); setError(null); window.history.replaceState(null, '', base); }
  function newTest() {
    if (!session || busy || !window.confirm('기존 기록은 유지하고 이 지문의 새 테스트를 시작할까요?')) return;
    void open(session.passageId, session.currentParagraphIndex, true);
  }
  const navigationDrawer = drawer === 'map' && developer ? <Drawer title="학습 맵" close={() => setDrawer(null)}>
    <p className="muted">이동은 완료 처리가 아닙니다. 문단과 문항을 자유롭게 열어 테스트하세요.</p>
    {map.map((p) => {
      const modeSessions = p.sessions.filter((s) => (s.mode ?? 'v4') === mode);
      const id = attempts[attemptKey(p.passageId)] ?? modeSessions[0]?.sessionId;
      const progress = modeSessions.find((s) => s.sessionId === id)?.progress ?? [];
      return <section key={p.passageId} className="map-passage"><h3>{p.title}</h3>
        {!!modeSessions.length && <label>테스트 기록<select aria-label={`${p.title} 테스트 기록`} value={id} disabled={busy}
          onChange={(e) => setAttempts((old) => ({ ...old, [attemptKey(p.passageId)]: e.target.value }))}>
          {modeSessions.map((s, i) => <option key={s.sessionId} value={s.sessionId}>{i === 0 ? '최근' : '이전'} · {s.sessionId.slice(0, 8)}</option>)}
        </select></label>}
        <ul>{p.paragraphs.map((paragraph, index) => <li key={paragraph.paragraphId}><button disabled={busy}
          aria-current={session?.sessionId === id && current?.paragraphId === paragraph.paragraphId ? 'location' : undefined}
          onClick={() => void open(p.passageId, index)}><span>문단 {paragraph.position}</span><small>{outcomeLabel[progress[index]?.outcome ?? 'UNSTARTED']}</small></button></li>)}</ul>
        <div className="map-problems"><strong>연결 문항</strong>{p.questionIds.map((q) => <a key={q}
          aria-disabled={busy} onClick={(e) => { if (busy) e.preventDefault(); }}
          href={`/problem/lab?questionId=${encodeURIComponent(q)}&returnTo=${encodeURIComponent(session ? `${base}?sessionId=${session.sessionId}` : base)}`}>{number(q)}번 문제 ↗</a>)}
          <small>지문 단위 연결 · 문단별 연결은 미정의</small></div>
      </section>;
    })}
  </Drawer> : drawer === 'progress' && session ? <Drawer title="학습 진행" close={() => setDrawer(null)}>
    <p>이해 확인과 진행 선택은 별도로 기록합니다. 능력 점수가 아닙니다.</p>
    <progress max={session.paragraphCount} value={session.progress?.filter((p) => p.outcome === 'PASS' || p.studentContinued).length ?? 0} />
    <ol className="progress-list">{session.progress?.map((p) => <li key={p.paragraphId}><span>문단 {p.position}</span><strong>{outcomeLabel[p.outcome]}{p.studentContinued && p.outcome !== 'SKIPPED' ? ' · 넘어감' : ''}</strong></li>)}</ol>
  </Drawer> : drawer === 'state' && developer ? <Drawer title="학생 상태 리포트" close={() => setDrawer(null)}>
    <div className="student-state-context" role="group" aria-label="상태 리포트 기록 구분">
      <button aria-pressed={stateContext === 'student'} onClick={() => setStateContext('student')}>학생 학습</button>
      <button aria-pressed={stateContext === 'developer'} onClick={() => setStateContext('developer')}>개발자 캘리브레이션</button>
    </div>
    <label className="student-state-window">관측 기간 <select value={stateWindowDays} onChange={(event) => setStateWindowDays(Number(event.target.value) as 7 | 30 | 90)}>
      <option value={7}>최근 7일</option><option value={30}>최근 30일</option><option value={90}>최근 90일</option>
    </select></label>
    <p className="muted">두 기록은 섞이지 않습니다. 이 리포트는 능력 점수나 등급 예측이 아닙니다.</p>
    {stateError ? <p className="err" role="alert">{stateError}</p> : !stateReport ? <p>증거를 불러오는 중…</p> : <>
      <section className="student-state-feedback"><h3>{stateReport.feedback.headline}</h3>
        {stateReport.profile.requestedWindow && <small>{new Date(stateReport.profile.requestedWindow.from).toLocaleDateString('ko-KR')}–{new Date(stateReport.profile.requestedWindow.to).toLocaleDateString('ko-KR')}</small>}
        {stateReport.feedback.strengths.length > 0 && <><h4>강점 후보</h4><ul>{stateReport.feedback.strengths.map((item) => <li key={item}>{item}</li>)}</ul></>}
        {stateReport.feedback.focusAreas.length > 0 && <><h4>다음 연습 후보</h4><ul>{stateReport.feedback.focusAreas.map((item) => <li key={item}>{item}</li>)}</ul></>}
        <p><strong>다음 행동</strong><br />{stateReport.feedback.nextAction}</p></section>
      <section className="student-state-grid" aria-label="학생 상태 차원">
        {stateReport.profile.dimensions.map((dimension) => <article key={dimension.dimension}>
          <header><h3>{stateDimensionLabel[dimension.dimension]}</h3><span>{reliabilityLabel[dimension.reliability]}</span></header>
          <dl><div><dt>긍정</dt><dd>{dimension.positive}</dd></div><div><dt>부정</dt><dd>{dimension.negative}</dd></div><div><dt>불확정</dt><dd>{dimension.indeterminate}</dd></div><div><dt>전체 콘텐츠</dt><dd>{dimension.distinctContentCount}</dd></div><div><dt>판단 콘텐츠</dt><dd>{dimension.determinateDistinctContentCount}</dd></div></dl>
          <details><summary>도움 단계별 증거</summary><pre>{JSON.stringify(dimension.assistanceCounts, null, 2)}</pre></details>
        </article>)}
      </section>
      <details className="student-state-limitations"><summary>해석 한계</summary><ul>{stateReport.profile.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details>
    </>}
  </Drawer> : null;
  if (!passages) return <main className="dialogue-shell"><p>불러오는 중…</p>{error && <p role="alert">{error}</p>}</main>;
  if (!session || !current) return <main className="dialogue-shell dialogue-start">
    <header className="dialogue-hero"><p className="dialogue-kicker">COGAXIS / {developer ? 'PERSONAL LAB' : 'READING'}</p>
      <h1>{developer ? '원문과 대화를 나란히, 판단은 투명하게.' : '읽은 내용을 설명하고, 이어서 문제를 풀어보세요.'}</h1>
      <p>{developer ? '개인 테스트용 개발자 화면입니다. 골드·내부 평가가 노출되며, 이 주소는 인증 수단이 아닙니다.' : '자기 말로 설명하고, 필요한 부분만 함께 확인해요.'}</p>
      {developer && <><label>판정 모드 <select aria-label="판정 모드" value={mode} disabled={busy} onChange={(e) => { const next = e.target.value as DialogueMode; setMode(next); save('csat.dialogue.dev.mode', next); }}>
        <option value="v4">기존 V4</option><option value="conditional-meta-v1">구체 인정 L1 + 조건부 L2 · 실험</option><option value="v4-boundary-show">V4 + 경계 보여 주기 · 실험</option>
      </select></label><p>실험 모드는 L1 SERIOUS 축에만 L2를 호출합니다. 테스트 도중 모드는 고정되며 기록은 모드별로 분리됩니다.</p><button onClick={() => setDrawer('map')}>학습 맵</button> <button onClick={() => setDrawer('state')}>상태 리포트</button></>}</header>
      {!developer && studentFeedbackEnabled && <a className="student-feedback-link" href="/progress">학습 돌아보기</a>}
    <section className="dialogue-passage-list" aria-label="학습할 지문">{passages.filter((p) => p.available).map((p) =>
      <article className="dialogue-passage-card" key={p.passageId}><div><h2>{p.title}</h2><p>{p.exam}</p><span>{p.paragraphCount}개 문단 · 연결 문항</span></div>
        <button className="primary" disabled={busy} onClick={() => void open(p.passageId)}>학습 시작</button>
        {!developer && getSaved(`${base}.session.${p.passageId}`) && <button disabled={busy} onClick={() => { if (window.confirm('기존 기록을 유지하고 새로 시작할까요?')) void open(p.passageId, 0, true); }}>새로 시작</button>}
      </article>)}</section>{error && <p className="err" role="alert">{error}</p>}{navigationDrawer}
  </main>;
  const transcript = session.transcript ?? [];
  const turnIndex = selectedTurn ?? Math.max(0, transcript.length - 1);
  const selected = inspection?.turns[turnIndex];
  const selectedEvaluation = selected?.evaluation as { status?: string; decisionSummary?: string; routing?: { accepted: boolean; axes: { axisId: string; route: keyof typeof routeLabel; metaFulfilled: boolean | null }[] } } | undefined;
  const guide = session.step?.sourceGuide;
  const followUp = !!session.step?.question;
  const canRespond = session.canRespond !== false;
  const composeLabel = canRespond
    ? followUp ? '질문에 답하거나, 내 뜻과 다르게 이해한 부분을 알려주세요.' : '이 문단의 중심 내용과 관계를 설명해 주세요.'
    : session.canRequestQuestion ? '보완하기를 누르면 이 자리에서 확인 질문에 답할 수 있어요.' : '현재는 답변 입력을 기다리지 않고 있어요.';
  return <main className={`reading-workbench ${developer ? 'is-developer' : 'is-student'}`} data-pane={mobilePane}>
    <header className="workbench-header"><div><p className="dialogue-kicker">COGAXIS / {developer ? 'PERSONAL LAB' : 'READING'}</p><h1>{session.title}</h1></div>
      <div className="workbench-actions"><span>문단 {current.position} / {session.paragraphCount}</span>
        <button disabled={busy} onClick={() => setDrawer(developer ? 'map' : 'progress')}>{developer ? '학습 맵' : '학습 진행'}</button>
        {!developer && studentFeedbackEnabled && <a className="student-feedback-link" href="/progress">학습 돌아보기</a>}
        {developer && <><button disabled={busy} onClick={() => setDrawer('state')}>상태 리포트</button><button disabled={busy} onClick={newTest}>새 테스트</button></>}<button disabled={busy} onClick={exit}>나가기</button></div>
    </header>
    {developer && <p className="developer-notice">{modeLabel[session.mode ?? 'v4']} · 개인 테스트 · 골드와 내부 판정이 공개됩니다. 모드 변경은 나가기 후 가능합니다.</p>}
    <nav className="workbench-tabs" aria-label="학습 화면 전환">{[['source', '원문'], ['chat', '대화'], ...(developer ? [['inspect', '검사']] : [])].map(([id, label]) =>
      <button key={id} aria-pressed={mobilePane === id} onClick={() => setMobilePane(id!)}>{label}</button>)}</nav>
    <div className="workbench-columns">
      <section className="source-pane workbench-pane" aria-label="원문"><header className="pane-header"><h2>원문</h2><small>{session.exam}</small></header>
        <div className="source-scroll"><nav className="dialogue-navigation" aria-label="문단 이동">
          <button disabled={busy || session.currentParagraphIndex === 0} onClick={() => void navigate(session.currentParagraphIndex - 1)}>이전 문단</button>
          {session.currentParagraphIndex < session.visibleParagraphs.length - 1 && <button disabled={busy} onClick={() => void navigate(session.currentParagraphIndex + 1)}>다음 기록 보기</button>}
        </nav>
        {session.visibleParagraphs.map((p) => p.paragraphId === current.paragraphId ? <article className="dialogue-paragraph current" key={p.paragraphId}>
          <span className="paragraph-chip">문단 {p.position}</span>{guide && <span className="guide-caption">옅은 표시: 현재 질문과 관련된 원문</span>}
          <ReadingText text={p.text} guide={guide} /></article> : <details className="previous-paragraph" key={p.paragraphId}><summary>문단 {p.position}<small>다시 읽기</small></summary><ReadingText text={p.text} guide={null} /><button disabled={busy} onClick={() => void navigate(p.position - 1)}>이 문단의 대화 보기</button></details>)}
        </div>
      </section>
      <section className="chat-pane workbench-pane" aria-label="응답과 피드백"><header className="pane-header"><h2>생각을 나누는 공간</h2><small>문단 {current.position}</small></header>
        {!developer && <CurrentUnderstanding session={session} open={understandingOpen} onToggle={setUnderstandingOpen} />}
        <div className="chat-scroll" ref={chatRef} aria-label="대화 기록" aria-live="polite">
          {session.studentContinued && <p className="chat-notice">추가 답변 없이 넘어간 문단입니다. 당시 판정은 그대로 남아 있어요.</p>}
          {!transcript.length && !developer && <p className="chat-welcome">원문을 읽고 이해한 중심 내용과 관계를 자기 말로 설명해 주세요. 짧게 적어도 괜찮아요.</p>}
          {transcript.map((entry, i) => {
            const feedbackStep = entry.feedbackStep ?? entry.step;
            return developer ? <div className="chat-round" key={i}>
              <div className="chat-message student"><small>{i + 1}차 응답</small><p>{entry.answer}</p></div>
              <div className={`chat-message tutor status-${feedbackStep.status.toLowerCase()} ${turnIndex === i ? 'is-selected' : ''}`}>
                <small><span>{i + 1}차 피드백 · {feedbackStep.policyAccepted ? '이해 확인' : verdictLabel(feedbackStep.status)}</span><button aria-label={`${i + 1}차 평가 보기`} onClick={() => { setSelectedTurn(i); setMobilePane('inspect'); }}>{i + 1}차 평가 ↗</button></small>
                {session.boundaryShow && i === transcript.length - 1 && !entry.step.question ? null : <p>{feedbackStep.feedback}</p>}
              </div>
              {entry.step.question && <div className="chat-message tutor question-message">
                <small><span>{i + 1}차 확인 질문</span><span>{entry.step.questionType === 'CORRECTIVE' ? '교정' : '진단'}</span></small>
                <p>{entry.step.question}</p>
              </div>}
            </div> : <div className="chat-round" key={i}>
              <div className="chat-message student"><small>나</small><p>{entry.answer}</p></div>
              <div className={`chat-message tutor status-${entry.step.status.toLowerCase()}`}>
                <small>{verdictLabel(entry.step.status)}</small><p>{entry.step.feedback}</p>{entry.step.question && <div className="dialogue-question"><span>{entry.step.questionType === 'CORRECTIVE' ? '다시 생각해 볼 질문' : '확인 질문'}</span><p>{entry.step.question}</p></div>}
              </div>
            </div>;
          })}
          {session.boundaryShow && session.status !== 'COMPLETED' && <BoundaryShowCard key={`${session.sessionId}:${current.paragraphId}`} view={session.boundaryShow} last={session.currentParagraphIndex + 1 >= session.paragraphCount} busy={busy} onRevise={(text) => void revise(text)} onNext={() => void nextParagraph()} />}
          {busy && <p role="status" className="chat-notice">처리 중이에요. 작성한 답변은 유지됩니다…</p>}
        </div>
        <footer className="chat-footer">{error && <p className="err" role="alert">{error}</p>}
          {(developer || canRespond) && <div className={`dialogue-compose ${!canRespond ? 'is-waiting' : ''}`}><label htmlFor="dialogue-response">{composeLabel}</label>
            <textarea id="dialogue-response" value={draft} onChange={(e) => edit(e.target.value)} disabled={busy || !canRespond} placeholder={canRespond ? '내 생각을 적어보세요…' : '보완 질문을 요청하면 입력할 수 있어요.'}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void submit(); } }} />
            <div className="dialogue-compose-row"><small>확인 질문 {session.step?.questionsAnswered ?? 0} / {session.step?.maxQuestions ?? 3} · ⌘/Ctrl + Enter</small><button className="primary" disabled={busy || !canRespond || !draft.trim()} onClick={() => void submit()}>{busy ? '판정 중…' : '제출'}</button></div>
          </div>}
          {session.status !== 'COMPLETED' && !session.boundaryShow ? <div className="chat-progress-actions"><p>{session.step?.policyAccepted && !session.canRequestQuestion && !followUp ? '다음 문단으로 넘어갈 수 있어요.' : '보완하거나, 답하지 않고 다음으로 넘어갈 수 있어요.'}</p><div>
            {session.canRequestQuestion && <button disabled={busy} onClick={() => void ask()}>{developer ? '보완하기' : '더 보완하기'}</button>}
            <button disabled={busy} onClick={() => void nextParagraph()}>{session.currentParagraphIndex + 1 < session.paragraphCount ? '다음 문단' : '문단 학습 마치기'}</button></div></div>
            : <div className="chat-progress-actions"><p>문단 학습을 마쳤습니다. 이해 확인과 넘어간 기록을 구분해 저장했어요.</p>{session.nextProblemQuestionId && <button className="primary" disabled={busy} onClick={() => void problem()}>{number(session.nextProblemQuestionId)}번 문제 풀기</button>}</div>}
          {session.status === 'UNRESOLVED' && !session.boundaryShow && <p className="chat-notice">이번 문단의 확인 질문은 여기까지입니다.</p>}
        </footer>
      </section>
      {developer && <aside className="inspect-pane workbench-pane" aria-label="개발자 검사"><header className="pane-header"><h2>현재 이해 · 골드 · 평가</h2><small>개발자 전용</small></header>
        <div className="inspector-scroll"><CurrentUnderstanding session={session} open={understandingOpen} onToggle={setUnderstandingOpen} />
          {inspectError ? <p role="alert">{inspectError}</p> : !inspection ? <p>검사 자료를 불러오는 중…</p> : <>
          <section className="inspector-gold"><h3>문단 {current.position} · 중심축</h3><p className="muted">통과 기준은 중심축입니다. 상세 관계는 추가 필수 항목이 아닙니다.</p>
            {inspection.gold.centralAxes.map((a) => <article key={a.id}><small>{a.id} · 구체 축</small><p>{a.description}</p>{inspection.metaAxes?.find((m) => m.id === a.id) && <><small>기능적 메타 축 · L1 SERIOUS일 때만 평가</small><p>{inspection.metaAxes.find((m) => m.id === a.id)?.metaAxis}</p></>}</article>)}
            <JsonDetail label="상세 관계 · 참조용" value={inspection.gold.coreRelations} /><JsonDetail label="골드 전체 · 버전" value={{ ...inspection.gold, goldRef: inspection.goldRef }} />
          </section><section className="inspector-evaluation"><h3>평가 결과</h3>
            {inspection.turns.length ? <><label>검토할 턴<select value={turnIndex} onChange={(e) => setSelectedTurn(Number(e.target.value))}>{inspection.turns.map((_, i) => <option key={i} value={i}>{i + 1}차 응답</option>)}</select></label>
              <p className="inspector-student">{selected?.answer}</p><strong>{selectedEvaluation?.status}</strong><p className="evaluation-summary">{selectedEvaluation?.decisionSummary}</p>
              {selectedEvaluation?.routing && <section aria-label="결합 정책 결과"><h4>최종 처리 · {selectedEvaluation.routing.accepted ? '기본 이해 인정' : '질문 제시'}</h4>{selectedEvaluation.routing.axes.map((a) => <p key={a.axisId}>{a.axisId} · {routeLabel[a.route]} · L2 {a.metaFulfilled === null ? '미호출' : a.metaFulfilled ? '충족' : '미충족'}</p>)}<small>아래 원래 L1 판정은 덮어쓰지 않고 보존합니다.</small></section>}
              {selected?.evaluationBeforeQuestion !== undefined && <JsonDetail label="보완 질문 전 판정 · 보존 기록" value={selected.evaluationBeforeQuestion} />}
              <JsonDetail label="판정 · 축 상태 · 학생 근거" value={selected?.evaluation} /><JsonDetail label="모델 원출력 · 코드 검증 · 호출 정보" value={selected?.call} />{selected?.questionCall !== undefined && <JsonDetail label="선택적 보완 호출" value={selected.questionCall} />}</>
              : <p className="muted">응답을 제출하면 이곳에서 판정과 근거를 확인할 수 있어요.</p>}
          </section></>}
        </div>
      </aside>}
    </div>{navigationDrawer}
  </main>;
}
