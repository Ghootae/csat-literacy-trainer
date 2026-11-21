# 단계 C1~C3: 블라인드 2묶음·질문문·KEY. 씨앗 20261122, 단계 A와 별개 Random. API 호출 없음.
import json, os, random, re
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
EXP = os.path.abspath(os.path.join(BASE, '..')); PDIR = f'{EXP}/deep-item-v5-2026-11-18/passages/'
SYMS = list('가나다라마바사아자차카'); N = 11
manifest = json.load(open(f'{BASE}/items/_manifest.json'))
rng = random.Random(20261122)
bundles = {1: [], 2: []}
for kind, start in (('case', 1), ('view', 2), ('table', 1)):
    ms = [m for m in manifest if m['kind'] == kind]; ms.sort(key=lambda m: m['id']); rng.shuffle(ms)
    for i, m in enumerate(ms): bundles[(start - 1 + i) % 2 + 1].append(m)
for n in (1, 2):
    assert len(bundles[n]) == N, (n, len(bundles[n])); rng.shuffle(bundles[n])
plan = open(f'{BASE}/PLAN.md').read()
prompt = re.search(r'### 3\.1[^\n]*\n\n```\n(.*?)\n```', plan, re.S).group(1)
key = ['# KEY (코덱스 작업 폴더 밖, 평가자에게 주지 않는다)', '', '| 묶음 | 기호 | id | 세트 id | 원래 번호 | 시험 라벨 | 갈래 | 정답 | 발문 방향 |', '|---|---|---|---|---|---|---|---|---|']
db = {x['set_id']: x for x in json.load(open(f'{EXP}/megastudy-rate-coverage-2026-11-05/db-sets.json'))}
for n in (1, 2):
    os.makedirs(f'{BASE}/codex/{n}', exist_ok=True)
    b = [f'# 풀이지 {n}: 〈보기〉 문항 {N}개', '', f'지문이 {N}개 있고 지문마다 〈보기〉 문항이 하나씩 있습니다. 출처는 알려 드리지 않습니다. 문항마다 직접 풀어 답을 고른 뒤, 선지마다 질문문의 A·B·C를 적어 주세요.', '']
    for i, m in enumerate(bundles[n]):
        it = json.load(open(f'{BASE}/items/{m["id"]}.json'))['items'][0]
        passage = open(f'{PDIR}{m["passage"]}/passage.txt').read().rstrip('\n')
        b += [f'## 지문 {i + 1}', '', passage, '', f'### 문항 {SYMS[i]}', '', it['stem'], '', '〈보기〉', it['bogi'], ''] + it['choices'] + ['']
        key.append(f'| {n} | {SYMS[i]} | {m["id"]} | {m["setId"]} | {m["number"]} | {db[m["setId"]]["label"]} | {m["kind"]} | {m["answer"]} | {"적절하지 않은" if "적절하지 않" in it["stem"] else "적절한"} |')
    open(f'{BASE}/codex/{n}/BLIND-{n}.md', 'w').write('\n'.join(b).rstrip('\n') + '\n')
    open(f'{BASE}/codex/{n}/CODEX-PROMPT-{n}.md', 'w').write(prompt.replace('<n>', str(n)).replace('{n}', str(n)).replace('{N}', str(N)) + '\n')
open(f'{BASE}/KEY.md', 'w').write('\n'.join(key) + '\n')
print({n: [m['kind'] for m in bundles[n]] for n in (1, 2)})
