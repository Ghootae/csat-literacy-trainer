# 단계 B3: items/*.json 자동 점검 → CHECK.md. 하나라도 걸린 문항은 e3를 돌리지 않는다. API 호출 없음.
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
EXP = os.path.abspath(os.path.join(BASE, '..'))
Q = f'{EXP}/set-pattern-2026-11-18/data/questions/'
PDIR = f'{EXP}/deep-item-v5-2026-11-18/passages/'
manifest = json.load(open(f'{BASE}/items/_manifest.json'))
SYM = re.compile(r'[㉠-㉻ⓐ-ⓩ]|\[[A-E]\]|\([가나다]\)')
SYM_STRIP = re.compile(r'[㉠-㉻ⓐ-ⓩ]')
PARTICLE = ('에서', '은', '는', '이', '가', '을', '를', '의', '와', '과', '로')
def norm(t): return re.sub(r'\s+', ' ', SYM_STRIP.sub('', t.replace('<보기>', '〈보기〉').replace('<보 기>', '〈보기〉'))).strip()
res = {}; out = ['# 입력 자동 점검 (CHECK, 단계 B3)', '', '`scripts/check_items.py`가 만든다. 하나라도 걸린 문항(FAIL)은 e3를 돌리지 않는다.', '',
       '| id | (1) 기호 | (2) 선지·정답·조사 | (3) 원문 일치 | (4) 표 글자 일치 | (5) ⓐⓑ | 결과 |', '|---|---|---|---|---|---|---|']
details = []; allowed = []
ALLOWED_EXTRA = {'gongsun-12': '(ⓐ~ⓔ는 밑줄 친 부분을 가리키는 표시)'}
for m in manifest:
    pid = m['id']; it = json.load(open(f'{BASE}/items/{pid}.json'))['items'][0]
    passage = open(f'{PDIR}{m["passage"]}/passage.txt').read()
    db = json.load(open(f'{Q}{m["setId"]}.json')); q = [x for x in db['questions'] if x['number'] == m['number']][0]
    r = {}
    # (1)
    avail = passage + '\n' + it['bogi']
    missing = sorted({s for s in SYM.findall(it['stem'] + '\n' + it['bogi'] + '\n' + '\n'.join(it['choices'])) if s not in avail})
    r['1'] = ('OK', '') if not missing else ('FAIL', '지문·〈보기〉에 없는 기호: ' + ' '.join(missing))
    # (2)
    probs = []
    if len(it['choices']) != 5: probs.append(f'선지 {len(it["choices"])}개')
    if it['answer'] not in (1, 2, 3, 4, 5): probs.append(f'정답 {it["answer"]}')
    for c in it['choices']:
        body = re.sub(r'^[①-⑤]\s*', '', c)
        for pt in PARTICLE:   # 조사 바로 뒤가 공백·따옴표·문장부호일 때만(갑·을·병 같은 이름 "을이"는 통과, C0)
            if body.startswith(pt) and (len(body) == len(pt) or re.match(r'[\s\'"‘’“”｢｣「」.,·:;!?()\[\]]', body[len(pt)])):
                probs.append('조사로 시작: ' + c[:12]); break
    r['2'] = ('OK', '') if not probs else ('FAIL', '; '.join(probs))
    # (3)
    probs = []
    db_stem = ' '.join(b['text'] for b in q['prompt_blocks'] if b['type'] == 'stem').strip()
    if norm(it['stem']) != norm(db_stem): probs.append(f'발문 다름: {it["stem"][:30]} / {db_stem[:30]}')
    for i, c in enumerate(q['choices']):
        mine = norm(it['choices'][i]); orig = norm(f"{c['label']} {c['text']}")
        if pid == 'bt-69bbf8bd': mine = mine.replace('｢○○｣', '', 1)   # 허용: 복원(추정)
        if mine != orig: probs.append(f'선지{i+1} 다름: {mine[:25]} / {orig[:25]}')
    if m['kind'] != 'table':
        sup = '\n'.join(b['text'] for b in q['prompt_blocks'] if b['type'] == 'supplement')
        mine = it['bogi']
        if pid in ALLOWED_EXTRA and mine.endswith('\n' + ALLOWED_EXTRA[pid]):
            mine = mine[: -len('\n' + ALLOWED_EXTRA[pid])]; allowed.append(f'{pid}: 〈보기〉 끝 "{ALLOWED_EXTRA[pid]}" 한 줄 외에는 원문과 같음 → 허용(기존 입력 그대로, 2-b)')
        if norm(mine) != norm(sup): probs.append('〈보기〉 글 다름')
    r['3'] = ('OK', '') if not probs else ('FAIL', '; '.join(probs))
    # (4)
    if m['kind'] == 'table':
        body = open(f'{BASE}/bogi-transcribed/{pid}.md').read().split('\n\n', 1)[1].rstrip('\n')
        r['4'] = ('OK', '') if it['bogi'] == body else ('FAIL', '글자 다름')
    else: r['4'] = ('해당 없음', '')
    # (5)
    if pid == 'bt-6a213e93': r['5'] = ('OK', '') if ('ⓐ' in passage and 'ⓑ' in passage) else ('FAIL', '지문에 ⓐ·ⓑ 없음')
    else: r['5'] = ('해당 없음', '')
    res[pid] = r
    ok = all(v[0] != 'FAIL' for v in r.values())
    out.append(f'| {pid} | ' + ' | '.join(r[k][0] for k in '12345') + f' | {"통과" if ok else "**FAIL**"} |')
    for k in '12345':
        if r[k][0] == 'FAIL': details.append(f'- {pid} (점검 {k}): {r[k][1]}')
n_fail = sum(1 for r in res.values() if any(v[0] == 'FAIL' for v in r.values()))
out += ['', '## 허용한 차이', ''] + ['- ' + a for a in allowed] + ['', f'요약: {len(res)}문항 중 통과 {len(res) - n_fail}, FAIL {n_fail}.', '']
if details: out += ['## FAIL 상세', ''] + details + ['']
out += ['## 점검 규칙', '', '- (1) 기호: ㉠~㉻, ⓐ~ⓩ, [A]~[E], (가)·(나)·(다) 중 발문·〈보기〉·선지에 나온 것이 지문 또는 그 문항의 〈보기〉에 있는가.',
        '- (2) 선지 5개, 정답 1~5, 선지가 조사(에서·은·는·이·가·을·를·의·와·과·로)로 시작하지 않음(선지 앞 번호 제외, 문자 그대로 시작 여부).',
        '- (3) 발문·선지(와 글 〈보기〉)가 suneung_db 원문과 같음. 비교 때 〈보기〉 표기와 밑줄 기호는 양쪽에서 지우고, 공백은 하나로 접는다. case 4의 "｢○○｣"는 복원(추정)으로 허용.',
        '- (4) 표 〈보기〉가 `bogi-transcribed/<id>.md`의 "원 이미지:" 줄 뒤 본문(끝 줄바꿈 제외)과 글자 단위로 같음.',
        '- (5) bt-6a213e93 지문에 ⓐ·ⓑ가 있음.']
open(f'{BASE}/CHECK.md', 'w').write('\n'.join(out) + '\n')
json.dump({k: {a: b[0] for a, b in v.items()} for k, v in res.items()}, open(f'{BASE}/items/_check.json', 'w'), indent=1)
print(f'통과 {len(res) - n_fail} / FAIL {n_fail}'); print('\n'.join(details))
