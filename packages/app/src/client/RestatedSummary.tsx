import type { SimpleDialogueView } from '../shared/dialogue-simple.js';

type Current = SimpleDialogueView['current'];

/** 오류가 남은 단계의 요약 카드(Q-0050): 틀린 구절은 취소선, 바로잡은 내용은 따로 붙인다. 원래 발화는 대화 기록에 그대로 있다. */
export function RestatedSummary({ current }: { current: Pick<Current, 'restatedSummary' | 'restatedCorrections'> }) {
  const { restatedSummary: text, restatedCorrections: fixes } = current;
  const corrected = text !== null && text !== '' && fixes.length > 0;
  const title = corrected ? '피드백을 반영한 정리' : '지금까지 내 요약';
  return <section className="simple-restated" aria-label={title}><small>{title}</small>
    {!corrected ? <p>{text === null ? '첫 요약을 보내면 여기에 정리돼.' : text === '' ? '아직 이 문단에 대한 내용이 없어.' : text}</p>
      : <div className="simple-restated-body"><p>{strike(text, fixes.map(f => f.studentQuote))}</p>
        <ul className="simple-restated-fixes">{fixes.map((f, i) => <li key={i}><del>{f.studentQuote}</del> → {f.correction}</li>)}</ul></div>}
  </section>;
}

function strike(text: string, quotes: string[]) {
  const found = quotes.map(q => q.trim()).filter(q => q && text.includes(q));
  if (!found.length) return text;
  const parts = text.split(new RegExp(`(${found.map(q => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`));
  return parts.map((part, i) => found.includes(part) ? <del key={i}>{part}</del> : part);
}
