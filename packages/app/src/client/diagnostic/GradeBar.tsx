/** 등급 띠(D-0219, D-0222, D-0225): 지문 결과 화면과 세트 결과 화면이 함께 쓴다. 큰 띠 위에는 확률 곡선(선만)을 그린다. */
import { useState } from 'react';
import { gradeAtFraction, gradeCurvePath, gradeGradient } from './logic.js';

export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * 9개 등급 확률을 부드럽게 이은 그라데이션으로 칠하고, 커서(또는 누름)가 있는 등급의 확률을 보인다.
 * `small`이면 말풍선·눈금 없이 낮은 띠만 그린다(지문별 누적 줄용).
 */
export function GradeBar({ grade, small = false }: { grade: { probabilities: number[] } | null; small?: boolean }): React.JSX.Element {
  const [hover, setHover] = useState<{ grade: number; x: number } | null>(null);
  const percent = (g: number) => Math.round(grade!.probabilities[g - 1]! * 100);
  const point = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!grade || small) return;
    const box = e.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    setHover({ grade: gradeAtFraction(fraction), x: fraction * 100 });
  };
  const label = grade ? `등급별 확률: ${GRADES.map(g => `${g}등급 ${percent(g)}%`).join(', ')}` : '등급은 모든 문제의 결과를 열면 보여 줘';
  const style = grade ? { backgroundImage: gradeGradient(grade.probabilities) } : undefined;
  if (small) return <div className="diag-gradebar diag-gradebar-small" data-testid="grade-bar-small" role="img" data-filled={grade !== null} aria-label={label} style={style} />;
  return <>
    <div className="diag-gradebar-wrap" onPointerMove={point} onPointerDown={point} onPointerLeave={() => setHover(null)}>
      {grade && <svg className="diag-gradecurve" data-testid="grade-curve" viewBox="0 0 900 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d={gradeCurvePath(grade.probabilities)} fill="none" stroke="var(--diag-ink)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>}
      <div className="diag-gradebar" data-testid="grade-bar" role="img" data-filled={grade !== null} aria-label={label} style={style} />
      {grade && hover && <div className="diag-gradetip" role="status" data-testid="grade-tip" style={{ left: `${hover.x}%`, transform: `translateX(${hover.x < 12 ? '0' : hover.x > 88 ? '-100%' : '-50%'})` }}>{hover.grade}등급일 확률 {percent(hover.grade)}%</div>}
    </div>
    <div className="diag-gradeticks" aria-hidden="true">{GRADES.map(g => <span key={g}>{g}등급</span>)}</div>
  </>;
}
