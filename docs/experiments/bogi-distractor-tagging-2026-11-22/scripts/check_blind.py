# 단계 C4: 블라인드 점검 → BLIND-CHECK.md
import json, os, re, glob
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
EXP = os.path.abspath(os.path.join(BASE, '..')); PDIR = f'{EXP}/deep-item-v5-2026-11-18/passages/'
manifest = {m['id']: m for m in json.load(open(f'{BASE}/items/_manifest.json'))}
key = [l.strip('|\n').split(' | ') for l in open(f'{BASE}/KEY.md') if re.match(r'\| [12] \|', l)]
key = [[c.strip() for c in r] for r in key]
SYMS = list('가나다라마바사아자차카')
out = ['# 블라인드 점검 (BLIND-CHECK)', '', '`scripts/check_blind.py`가 만든다.', '']; fails = []
sets = {}; titles = {}
for pid in manifest:
    titles[pid] = json.load(open(f'{PDIR}{manifest[pid]["passage"]}/meta.json'))['title']
LEAK = ['학년도', '평가원', '수능', '교육청', '모의평가']
leak_report = []; year_report = []; body_title = []
for n in (1, 2):
    rows = [r for r in key if r[0] == str(n)]
    txt = open(f'{BASE}/codex/{n}/BLIND-{n}.md').read(); prm = open(f'{BASE}/codex/{n}/CODEX-PROMPT-{n}.md').read()
    kinds = [manifest[r[2]]['kind'] for r in rows]
    cnt = {k: kinds.count(k) for k in ('case', 'view', 'table')}
    ok1 = len(rows) == 11 and all(3 <= v <= 4 for v in cnt.values()); out.append(f'- 묶음 {n}: 문항 {len(rows)}개, 갈래 {cnt} → ' + ('통과' if ok1 else '**FAIL**'))
    if not ok1: fails.append(f'묶음 {n} 구성')
    files = sorted(os.listdir(f'{BASE}/codex/{n}'))
    if files != [f'BLIND-{n}.md', f'CODEX-PROMPT-{n}.md']: fails.append(f'codex/{n} 파일 목록 {files}')
    # 내용 일치
    bad = []
    for i, r in enumerate(rows):
        it = json.load(open(f'{BASE}/items/{r[2]}.json'))['items'][0]
        passage = open(f'{PDIR}{manifest[r[2]]["passage"]}/passage.txt').read().rstrip('\n')
        sec = txt.split(f'## 지문 {i + 1}\n\n', 1)[1]
        sec = re.split(r'\n## 지문 \d+\n', sec)[0]
        exp = passage + '\n\n' + f'### 문항 {SYMS[i]}\n\n{it["stem"]}\n\n〈보기〉\n{it["bogi"]}\n\n' + '\n'.join(it['choices'])
        if sec.rstrip('\n') != exp: bad.append(f'{SYMS[i]}({r[2]})')
    out.append(f'  - 지문·발문·〈보기〉·선지 글자 일치: ' + ('통과' if not bad else '**FAIL** ' + ', '.join(bad)))
    if bad: fails.append(f'묶음 {n} 내용 불일치 {bad}')
    # 새는 정보
    for name, t in (('BLIND', txt), ('PROMPT', prm)):
        for w in LEAK:
            if w in t: leak_report.append(f'{name}-{n}: "{w}" {t.count(w)}회')
        for r in rows:
            for s in (r[3], r[3][:8]):
                if s and s in t: leak_report.append(f'{name}-{n}: "{s}" 포함')
            tt = titles[r[2]]
            if tt in t:
                pt = open(f'{PDIR}{manifest[r[2]]["passage"]}/passage.txt').read()
                if name == 'BLIND' and t.count(tt) == pt.count(tt): body_title.append(f'{name}-{n}: 지문 제목 문구 "{tt}"가 원래 지문 본문 안에 {pt.count(tt)}회 있음({r[2]}). 우리가 넣은 것이 아님')
                else: leak_report.append(f'{name}-{n}: 제목 "{tt}" 포함')
        for m in re.finditer(r'(19|20)\d\d\s*년', t): year_report.append(f'{name}-{n}: "{m.group(0)}" … {t[max(0,m.start()-12):m.end()+8]!r}')
    # 정답 표기
    if re.search(r'정답\s*[:：]?\s*[①-⑤1-5]', txt): leak_report.append(f'BLIND-{n}: 정답 표기 의심')
out += ['', '## 출처 누출 점검', '', '- 금지어(학년도·평가원·수능·교육청·모의평가), 세트 id(전체·앞 8자), 지문 제목(meta.json title), 정답 표기: ' + ('없음 → 통과' if not leak_report else '**FAIL**')]
for x in leak_report: out.append('  - ' + x)
if leak_report: fails.append('출처 누출')
out += ['', '## 지문 본문에 원래 들어 있는 제목 문구(보고만)', ''] + (['- ' + x for x in body_title] or ['- 없음'])
out += ['', '## 지문 본문 속 연도 표기(원래 본문에 있는 것, 보고만)', ''] + (['- ' + x for x in year_report] or ['- 없음'])
out += ['', f'결과: ' + ('모두 통과' if not fails else 'FAIL: ' + '; '.join(fails))]
open(f'{BASE}/BLIND-CHECK.md', 'w').write('\n'.join(out) + '\n'); print(out[-1])
