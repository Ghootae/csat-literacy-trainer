import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const memoryRoot = join(root, 'memory');
const errors = [];

const requiredFiles = [
  'AGENTS.md',
  'memory/README.md',
  'memory/CURRENT_STATE.md',
  'memory/WORK_TREE.md',
  'memory/DECISIONS.md',
  'memory/OPEN_QUESTIONS.md',
  'memory/INDEX.md',
  'memory/templates/decision.md',
  'memory/templates/checkpoint.md',
];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) errors.push(`필수 파일 없음: ${file}`);
}

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });
}

function frontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  return Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map((line) => line.match(/^([a-z_]+):\s*(.+)$/))
      .filter(Boolean)
      .map((parts) => [parts[1], parts[2].trim()]),
  );
}

const decisionDirectory = join(memoryRoot, 'decisions');
const decisionFiles = markdownFiles(decisionDirectory);
const decisionIds = new Set();
const acceptedStatuses = new Set([
  'proposed',
  'accepted',
  'rejected',
  'superseded',
  'deprecated',
]);
const decisionIndex = existsSync(join(memoryRoot, 'DECISIONS.md'))
  ? readFileSync(join(memoryRoot, 'DECISIONS.md'), 'utf8')
  : '';

for (const file of decisionFiles) {
  const text = readFileSync(file, 'utf8');
  const meta = frontMatter(text);
  const display = relative(root, file);
  if (!meta) {
    errors.push(`front matter 없음: ${display}`);
    continue;
  }
  for (const field of ['id', 'status', 'date', 'scope', 'supersedes']) {
    if (!meta[field]) errors.push(`${display}: ${field} 필드 없음`);
  }
  if (!/^D-\d{4}$/.test(meta.id ?? '')) {
    errors.push(`${display}: 잘못된 결정 ID ${meta.id ?? '(없음)'}`);
  }
  if (decisionIds.has(meta.id)) errors.push(`중복 결정 ID: ${meta.id}`);
  decisionIds.add(meta.id);
  if (!acceptedStatuses.has(meta.status)) {
    errors.push(`${display}: 잘못된 상태 ${meta.status ?? '(없음)'}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date ?? '')) {
    errors.push(`${display}: 날짜는 YYYY-MM-DD 형식이어야 함`);
  }
  if (meta.id && !file.split('/').at(-1).startsWith(meta.id)) {
    errors.push(`${display}: 파일명이 결정 ID로 시작하지 않음`);
  }
  if (meta.id && !decisionIndex.includes(`\`${meta.id}\``)) {
    errors.push(`${display}: memory/DECISIONS.md 색인에 없음`);
  }
}

const currentState = join(memoryRoot, 'CURRENT_STATE.md');
if (existsSync(currentState)) {
  const text = readFileSync(currentState, 'utf8');
  const lineCount = text.split(/\r?\n/).length;
  if (lineCount > 200) {
    errors.push(`memory/CURRENT_STATE.md가 ${lineCount}줄임: 최대 200줄`);
  }
  // D-0171: 줄이 길어지며 커지는 것을 막는 크기 상한
  const byteCount = Buffer.byteLength(text, 'utf8');
  if (byteCount > 20 * 1024) {
    errors.push(`memory/CURRENT_STATE.md가 ${byteCount}바이트임: 최대 20KB`);
  }
}

const filesToCheck = [join(root, 'AGENTS.md'), ...markdownFiles(memoryRoot)].filter(existsSync);
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

for (const file of filesToCheck) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(linkPattern)) {
    const rawTarget = match[1].trim();
    if (/^(https?:|mailto:|#)/.test(rawTarget)) continue;
    const targetWithoutAnchor = rawTarget.split('#')[0];
    if (!targetWithoutAnchor) continue;
    const target = resolve(dirname(file), decodeURIComponent(targetWithoutAnchor));
    if (!existsSync(target)) {
      errors.push(`${relative(root, file)}: 깨진 링크 ${rawTarget}`);
    }
  }
}

const checkpointDirectory = join(memoryRoot, 'checkpoints');
for (const file of markdownFiles(checkpointDirectory)) {
  if (file.endsWith('/README.md')) continue;
  const name = file.split('/').at(-1);
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*\.md$/.test(name)) {
    errors.push(`${relative(root, file)}: 체크포인트 파일명 형식 오류`);
  }
}

if (errors.length > 0) {
  console.error('프로젝트 메모리 검증 실패');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const checkpointCount = markdownFiles(checkpointDirectory).filter(
    (file) => !file.endsWith('/README.md'),
  ).length;
  console.log(
    `프로젝트 메모리 검증 통과: 결정 ${decisionFiles.length}개, 체크포인트 ${checkpointCount}개`,
  );
}
