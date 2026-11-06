/** 지문·문항 칸. `ProblemLabApp`의 지문·문항·선지·이미지 표시 부분을 떼어 쓴다(기존 화면은 그대로 둔다). */
import { AnnotatedText } from '../annotated-text.js';
import type { ProblemContentView } from '../../shared/contract.js';
import type { FeedbackTextAnnotationView, FeedbackView, FeedbackWorkbenchView } from '../../shared/problem-feedback.js';
import { circled } from './logic.js';

export interface PaneMedia { mediaId: string; url: string; alt?: string | undefined; placement: { scope: 'PASSAGE' | 'SCENARIO' | 'CHOICE'; choiceId?: string | undefined } }
export interface PaneQuestion {
  title: string; exam: string; questionNumber: number; passageText: string; stem: string; scenarioText: string;
  choices: readonly { choiceId: string; position: number; text: string }[];
  media: readonly PaneMedia[];
  annotations: readonly FeedbackTextAnnotationView[];
}
type Highlights = FeedbackView['correctionHighlights'];

function Media({ items }: { items: readonly PaneMedia[] }) {
  return <>{items.map(m => <img key={m.mediaId} src={m.url} alt={m.alt || '문항 원자료 시각 자료'} loading="lazy" />)}</>;
}

export function PassagePane({ question, highlights = [] }: { question: PaneQuestion; highlights?: Highlights }): React.JSX.Element {
  return <section className="workbench-pane source-pane" aria-label="전체 지문">
    <header className="pane-header source-head"><div className="source-title"><h1 title={question.title}>{question.title}</h1><small>{question.exam}</small></div></header>
    <div className="source-scroll">
      <AnnotatedText text={question.passageText} annotations={question.annotations.filter(a => a.location === 'PASSAGE')} highlights={highlights.filter(a => a.location === 'PASSAGE')} />
      <Media items={question.media.filter(m => m.placement.scope === 'PASSAGE')} />
    </div>
  </section>;
}

export function QuestionPane({ question, selectedId, enabled, onPick, highlights = [] }: {
  question: PaneQuestion; selectedId: string | null; enabled: boolean; onPick: (choiceId: string) => void; highlights?: Highlights;
}): React.JSX.Element {
  const hasScenario = question.scenarioText !== '' || question.media.some(m => m.placement.scope === 'SCENARIO');
  const focusTarget = question.choices.find(c => c.choiceId === selectedId)?.choiceId ?? question.choices[0]?.choiceId;
  return <section className="workbench-pane question-pane" aria-label="문제와 선지">
    <header className="pane-header question-head"><h2>문제 {question.questionNumber}</h2><h3>{question.stem}</h3></header>
    <div className="lab-question-scroll">
      {hasScenario && <section className="lab-scenario"><h4>보기</h4>
        <AnnotatedText text={question.scenarioText} annotations={question.annotations.filter(a => a.location === 'SCENARIO')} highlights={highlights.filter(a => a.location === 'SCENARIO')} />
        <Media items={question.media.filter(m => m.placement.scope === 'SCENARIO')} /></section>}
      <div className="lab-choices-scroll"><ol className="lab-choices" role="radiogroup" aria-label="선지">{question.choices.map(c => {
        const selected = c.choiceId === selectedId;
        return <li key={c.choiceId} role="radio" aria-checked={selected} aria-disabled={!enabled} aria-label={`${circled(c.position)}번 선지`} aria-describedby={`diag-choice-text-${c.position}`}
          tabIndex={c.choiceId === focusTarget ? 0 : -1} data-selected={selected}
          onClick={() => { if (enabled) onPick(c.choiceId); }}
          onKeyDown={e => {
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (enabled) onPick(c.choiceId); return; }
            const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
            if (!step) return;
            e.preventDefault();
            const items = Array.from(e.currentTarget.parentElement!.querySelectorAll<HTMLElement>('[role=radio]:not([aria-disabled=true])'));
            items[(items.indexOf(e.currentTarget) + step + items.length) % items.length]?.focus();
          }}><span>{c.position}</span><div><p id={`diag-choice-text-${c.position}`}>{c.text}</p>
            <Media items={question.media.filter(m => m.placement.scope === 'CHOICE' && m.placement.choiceId === c.choiceId)} /></div></li>;
      })}</ol></div>
    </div>
  </section>;
}

type AnyMedia = { mediaId: string; url: string; alt?: string; placement: { scope: 'PASSAGE' | 'SCENARIO' | 'CHOICE'; choiceId?: string } };
const paneMedia = (media: readonly AnyMedia[]): PaneMedia[] => media.map(m => ({ mediaId: m.mediaId, url: m.url, alt: m.alt, placement: { scope: m.placement.scope, choiceId: m.placement.scope === 'CHOICE' ? m.placement.choiceId : undefined } }));
export function paneFromContent(content: ProblemContentView): PaneQuestion {
  return { title: content.title, exam: content.exam, questionNumber: content.questionNumber, passageText: content.passage, stem: content.stem, scenarioText: content.scenario,
    choices: content.choices, media: paneMedia(content.media as readonly AnyMedia[]), annotations: content.textAnnotations ?? [] };
}
export function paneFromFeedback(view: FeedbackWorkbenchView): PaneQuestion {
  return { title: view.title, exam: view.exam, questionNumber: view.questionNumber, passageText: view.question.passageText, stem: view.question.stem, scenarioText: view.question.scenarioText,
    choices: view.question.choices, media: paneMedia(view.question.media as readonly AnyMedia[]), annotations: view.question.textAnnotations };
}
