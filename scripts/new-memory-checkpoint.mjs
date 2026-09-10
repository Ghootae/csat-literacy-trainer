import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import process from 'node:process';

const slug = process.argv[2];

if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error('사용법: node scripts/new-memory-checkpoint.mjs short-slug');
  console.error('slug에는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.');
  process.exit(1);
}

const root = process.cwd();
const date = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const checkpointDirectory = join(root, 'memory', 'checkpoints');
const target = join(checkpointDirectory, `${date}-${slug}.md`);

if (existsSync(target)) {
  console.error(`이미 존재합니다: ${target}`);
  process.exit(1);
}

let baseCommit = 'uncommitted';
try {
  baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  // Git 밖에서도 템플릿 생성은 허용한다.
}

const templatePath = join(root, 'memory', 'templates', 'checkpoint.md');
if (!existsSync(templatePath)) {
  console.error(`템플릿이 없습니다: ${templatePath}`);
  process.exit(1);
}

const content = readFileSync(templatePath, 'utf8')
  .replaceAll('YYYY-MM-DD', date)
  .replace('git-commit-or-uncommitted', baseCommit);

mkdirSync(checkpointDirectory, { recursive: true });
writeFileSync(target, content, { flag: 'wx' });
console.log(target);
