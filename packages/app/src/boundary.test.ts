/**
 * 프로세스 경계 import 규칙 (계획서 `D4. 웹 전환 가드`).
 *
 * 세 규칙 모두 **소스를 읽어 검사한다.** 타입 시스템은 이것을 강제하지 못한다 —
 * `@csat/pipeline`은 워크스페이스로 연결돼 있어 클라이언트에서도 해석되고,
 * `node:fs`는 어느 파일에서든 import 된다. 규칙을 깨는 것은 컴파일이 아니라 이 테스트다.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)));

function sources(sub: string): { file: string; text: string }[] {
  const dir = resolve(SRC, sub);
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts'))
    .map((f) => ({ file: `${sub}/${f}`, text: readFileSync(resolve(dir, f), 'utf8') }));
}

/** 주석·문자열이 아니라 실제 import 문만 본다. */
function imports(text: string): string[] {
  return [...text.matchAll(/^\s*import\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]!);
}

describe('D4 규칙 1 — 파일시스템 접근은 리포지토리 구현체 안에만', () => {
  // 웹으로 옮길 때 저장소만 교체하면 되도록. 이 둘이 리포지토리다.
  const REPOSITORIES = ['server/content.ts', 'server/session.ts'];

  it('다른 서버 파일은 node:fs를 import 하지 않는다', () => {
    const offenders = sources('server')
      .filter((s) => !REPOSITORIES.includes(s.file))
      .filter((s) => imports(s.text).some((m) => m.startsWith('node:fs')));
    expect(offenders.map((o) => o.file)).toEqual([]);
  });
});

describe('D4 규칙 2 — 클라이언트 번들이 채점 코드를 import 하지 않는다', () => {
  it('클라이언트는 @csat/pipeline을 import 하지 않는다', () => {
    const offenders = sources('client').filter((s) =>
      imports(s.text).some((m) => m.startsWith('@csat/')),
    );
    expect(offenders.map((o) => o.file)).toEqual([]);
  });

  it('클라이언트는 server/를 import 하지 않는다', () => {
    const offenders = sources('client').filter((s) =>
      imports(s.text).some((m) => m.includes('/server/') || m.startsWith('../server')),
    );
    expect(offenders.map((o) => o.file)).toEqual([]);
  });

  it('shared/도 채점 패키지를 끌어오지 않는다 — 끌어오면 클라이언트가 함께 묶인다', () => {
    const offenders = sources('shared').filter((s) =>
      imports(s.text).some((m) => m.startsWith('@csat/')),
    );
    expect(offenders.map((o) => o.file)).toEqual([]);
  });
});

describe('D4 규칙 3 — LLM 클라이언트가 클라이언트 번들에서 도달 불가', () => {
  it('클라이언트는 anthropic SDK에 닿지 않는다', () => {
    const reachable = [...sources('client'), ...sources('shared')];
    const offenders = reachable.filter((s) =>
      imports(s.text).some((m) => m.includes('anthropic') || m.includes('openai')),
    );
    expect(offenders.map((o) => o.file)).toEqual([]);
  });

  it('클라이언트 소스에 API 키를 읽는 코드가 없다', () => {
    const offenders = [...sources('client'), ...sources('shared')].filter((s) =>
      /process\.env|API_KEY/.test(s.text),
    );
    expect(offenders.map((o) => o.file)).toEqual([]);
  });
});

describe('semantic-view runtime wiring은 제출 경로에만 있다', () => {
  const server = readFileSync(resolve(SRC, 'server/index.ts'), 'utf8');

  it('attempt는 feature flag를 평가 경계에 전달하고 evaluator/지연만 로그한다', () => {
    const attemptRoute = server.slice(
      server.indexOf("url.pathname.startsWith('/api/attempt/')"),
      server.indexOf("url.pathname.startsWith('/api/title/')"),
    );
    expect(server).toContain("process.env['PROPOSITION_EVIDENCE_EVALUATOR']");
    expect(attemptRoute).toContain('runEvaluation(gold, queries');
    expect(attemptRoute).toContain('propositionEvidenceEvaluator: attemptPropositionEvaluator');
    expect(attemptRoute).not.toContain('TITLE_EVAL_CONFIG');
    expect(server).toContain('evaluator=${evaluated.propositionEvaluation.evaluator}');
    expect(server).toContain('latency=${evaluated.propositionEvaluation.latencyMs}ms');
  });

  it('title 평가 호출에는 proposition feature flag를 전달하지 않는다', () => {
    const titleRoute = server.slice(server.indexOf("url.pathname.startsWith('/api/title/')"));
    const titleCall = titleRoute.match(/runEvaluation\([^;]+\);/)?.[0] ?? '';
    expect(titleCall).toContain('content.titleQueries');
    expect(titleCall).not.toContain('propositionEvidenceEvaluator');
    expect(titleCall).toContain('queryEvaluation: TITLE_EVAL_CONFIG');
  });
});
