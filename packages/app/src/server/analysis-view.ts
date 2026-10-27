import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** 문단 분석 화면 자료(D-0183) 파일 읽기. 파일이 없으면 null. 경로는 환경변수로 바꿀 수 있다. */
export function readAnalysisViewData(): Buffer | null {
  const path = resolve(process.cwd(), process.env['CSAT_ANALYSIS_VIEW_PATH'] ?? 'docs/experiments/analysis-view-2026-10-27/view-data.json');
  return existsSync(path) ? readFileSync(path) : null;
}
