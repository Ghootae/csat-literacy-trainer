# 단계 D: PLAN 4절(4-0~4-g)·5절(5-a~5-f) 집계 → REPORT-bogi-distractor-tagging.md. API 호출 없음. 해석·권고는 쓰지 않는다.
import json, os, re, statistics, itertools
from parse_eval import parse
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
EXP = os.path.abspath(os.path.join(BASE, '..')); GOLD3 = f'{EXP}/deep-item-v5-2026-11-18/calib3-gold/'; OLD4 = f'{EXP}/deep-item-v5-2026-11-18/calib4-gold/'
SC_REASON = '정답이 〈보기〉 없이 지문 한 사실로 판정됨'; CIRC = '①②③④⑤'; KINDS = ('case', 'view', 'table')
manifest = {m['id']: m for m in json.load(open(f'{BASE}/items/_manifest.json'))}
# ---- KEY
key = {}
for l in open(f'{BASE}/KEY.md'):
    c = [x.strip() for x in l.strip().strip('|').split('|')]
    if c and c[0] in ('1', '2'): key[(int(c[0]), c[1])] = dict(id=c[2], set=c[3], num=c[4], label=c[5], kind=c[6], answer=int(c[7]), dirn=c[8])
# ---- SELECTION 구조·출처
sel = {}
for l in open(f'{BASE}/SELECTION.md'):
    c = [x.strip() for x in l.strip().strip('|').split('|')]
    if len(c) == 10 and re.fullmatch(r'[0-9a-f]{24}', c[2]): sel[c[2]] = dict(struct=c[8], layer=c[5], field=c[7])
def src(label): return '평가원·수능' if ('수능' in label or '평가원' in label) else '교육청'
# ---- 항목
items = {}
for (b, sym), k in key.items():
    it = items.setdefault(k['id'], dict(id=k['id'], kind=k['kind'], answer=k['answer'], set=k['set'], num=k['num'], label=k['label'], dirn=k['dirn'], bundle=b, sym=sym))
    it['struct'] = sel[k['set']]['struct']; it['src'] = src(k['label']); it['ev'] = []; it['e3'] = {}
    for run in ('run1', 'run2'):
        d = json.load(open(f'{BASE}/e3/{run}/{k["id"]}/eval.json'))['before']['V1']
        it['e3'][run] = dict(wrong=set(d['easyChoices']), ans=any(SC_REASON in r for r in d['reasons']), solver=d['solverAnswer'])
    for e in (1, 2, 3, 4):
        p = f'{BASE}/codex/{b}/REPORT-eval{e}.md'
        data = {x['item']: x for x in parse(p)}[sym]
        ea = data['answer']; ea = CIRC.index(ea) + 1 if isinstance(ea, str) and ea in CIRC else int(ea)
        marks = {}; why = {}
        for c in data['choices']:
            n = int(c['n']); a = c.get('needsBogi'); f = c.get('facts')
            if a == '아니오' and f == '하나': marks[n] = 'narrow'
            elif a == '아니오' and f == '여럿': marks[n] = 'broad'
            elif a == '예': marks[n] = 'none'
            elif a == '아니오': marks[n] = 'amb'   # B 칸이 형식에 안 맞음
            else: marks[n] = 'amb'
            why[n] = (a, f, c.get('why', ''))
        it['ev'].append(dict(k=e, ans=ea, marks=marks, why=why, drop=(ea != it['answer'])))
def thr(r): return r // 2 + 1
for it in items.values():
    live = [e for e in it['ev'] if not e['drop']]; r = len(live)
    it['r'] = r; it['excluded'] = r <= 2
    cnt = {n: sum(1 for e in live if e['marks'][n] == 'narrow') for n in range(1, 6)}
    cntb = {n: sum(1 for e in live if e['marks'][n] in ('narrow', 'broad')) for n in range(1, 6)}
    it['cnt'] = cnt; it['cntb'] = cntb
    it['ev_main'] = {n for n in cnt if cnt[n] >= thr(r)} if r > 2 else set()
    it['ev_sub'] = {n for n in cnt if cnt[n] >= 2} if r > 2 else set()
    it['amb'] = sum(1 for e in it['ev'] for n in range(1, 6) if e['marks'][n] == 'amb')
    for run in ('run1', 'run2'):
        e3 = it['e3'][run]; e3['all'] = set(e3['wrong']) | ({it['answer']} if e3['ans'] else set())
inc = [i for i in items.values() if not i['excluded']]
def wr(s, it): return len(s - {it['answer']})
def vals(kind, src_, basis):
    out = []
    for it in inc:
        if kind and it['kind'] != kind: continue
        s = {'r1': it['e3']['run1']['all'], 'r2': it['e3']['run2']['all'], 'main': it['ev_main'], 'sub': it['ev_sub']}[src_]
        out.append(wr(s, it) if basis == 'wrong' else len(s))
    return out
SRC = [('r1', 'e3 run1'), ('r2', 'e3 run2'), ('main', '평가자 주(3명+)'), ('sub', '평가자 보조(2명+)')]
def second(v): s = sorted(v, reverse=True); return s[1] if len(s) > 1 else None
R = []
def P(x=''): R.append(x)
def tbl(h, rows): P('| ' + ' | '.join(h) + ' |'); P('|' + '---|' * len(h)); [P('| ' + ' | '.join(str(c) for c in r) + ' |') for r in rows]
# ---- 4-d
def table4d(basis):
    rng = range(0, 5 if basis == 'wrong' else 6); h = ['갈래', '문항', '기준'] + [f'값{v}' for v in rng] + ['최댓값', '중앙값', '둘째 값', '수리(오답4)', '경고(오답3)', 'C23 어김(선지≥2)']
    rows = []
    for kind in KINDS + (None,):
        for s, nm in SRC:
            v = vals(kind, s, basis); allv = vals(kind, s, 'all'); wv = vals(kind, s, 'wrong')
            rows.append([kind or '전체', len(v), nm] + [v.count(x) for x in rng] + [max(v), statistics.median(v), second(v), sum(1 for x in wv if x == 4), sum(1 for x in wv if x == 3), sum(1 for x in allv if x >= 2)])
    tbl(h, rows)
P('# 기출 오답 태깅 보고서 (단계 D, 2026-11-22)'); P()
P('- 값과 5절 기준의 충족 여부만 적는다. 뜻풀이·권고는 쓰지 않는다. 계산은 `scripts/aggregate.py`.')
P('- e3 값은 `e3/run*/<id>/eval.json`(모델 gpt-6.2-sol, high), 평가자 값은 `codex/<n>/REPORT-eval<k>.md`의 JSON 블록(gpt-6.1-sol 4명 × 2묶음), 정답·갈래는 `KEY.md`.')
P('- 평가자 지름길 표시 = A "아니오" + B "하나". A 칸·B 칸이 형식에 맞지 않으면 "애매"로 세고 지름길로 세지 않는다. 다수결: 주 = 남은 인원 절반 초과(4명이면 3명 이상), 보조 = 2명 이상.')
P('- 4-c: 평가자 답이 기출 정답과 다르면 그 평가자의 그 문항 판정을 뺀다. 남은 평가자가 2명 이하면 그 문항을 집계에서 뺀다.')
drops = [(i['id'], e['k'], e['ans'], i['answer']) for i in items.values() for e in i['ev'] if e['drop']]
exc = [i['id'] for i in items.values() if i['excluded']]
P(f'- 평가자 답이 정답과 달라 판정을 뺀 경우: {len(drops)}건 ' + ('(' + ', '.join(f'{a} 평가자{b}: 답 {c}/정답 {d}' for a, b, c, d in drops) + ')' if drops else '') + f'. 집계에서 빠진 문항: ' + (', '.join(exc) or '없음') + f'. 집계 문항 {len(inc)}개(case {sum(1 for i in inc if i["kind"]=="case")}, view {sum(1 for i in inc if i["kind"]=="view")}, table {sum(1 for i in inc if i["kind"]=="table")}).')
e3wrong = [(i['id'], run, i['e3'][run]['solver'], i['answer']) for i in items.values() for run in ('run1', 'run2') if i['e3'][run]['solver'] != i['answer']]
P('- e3 답이 기출 정답과 다른 경우(값은 그대로 셈): ' + ('; '.join(f'{a} {b}: e3 {c}/정답 {d}' for a, b, c, d in e3wrong) or '없음') + '.'); P()
P('## 1. 4-d 갈래별 분포 (오답 기준: 오답 4개 중 지름길 수)'); P(); table4d('wrong'); P()
P('### 1-2. 4-d 갈래별 분포 (선지 전체 기준: 정답 포함 5개 중 지름길 수)'); P(); table4d('all'); P()
# ---- 4-e
def cell(it, n, which):
    c1 = n in it['e3']['run1']['wrong']; c2 = n in it['e3']['run2']['wrong']; e3n = int(c1) + int(c2)
    return e3n, (n in it[which])
def table4e(which, label):
    P(f'### {label}'); P(); rows = []
    for kind in KINDS + (None,):
        cnt = {}; tot = 0
        for it in inc:
            if kind and it['kind'] != kind: continue
            for n in range(1, 6):
                if n == it['answer']: continue
                e3n, evy = cell(it, n, which); cnt[(e3n, evy)] = cnt.get((e3n, evy), 0) + 1; tot += 1
        g = lambda a, b: cnt.get((a, b), 0)
        rows.append([kind or '전체', tot, g(2, True), g(2, False), g(0, True), g(0, False), g(1, True), g(1, False)])
    tbl(['갈래', '오답 선지 수', '둘 다(e3 두 번 + 평가자)', 'e3만(e3 두 번, 평가자 아님)', '평가자만=놓침(e3 0번 + 평가자)', '둘 다 없음(e3 0번, 평가자 아님)', 'e3 한 번만 + 평가자', 'e3 한 번만, 평가자 아님'], rows); P()
P('## 2. 4-e 오답 선지 단위 2×2 (평가자 보조 기준 2명+ = 5-e 정의)'); P()
table4e('ev_sub', '2-1. 평가자 보조 기준(2명+)'); table4e('ev_main', '2-2. 평가자 주 기준(3명+)')
# 기준선
def agree3():
    a = t = 0
    for it in inc:
        for n in range(1, 6):
            if n == it['answer']: continue
            a += ((n in it['e3']['run1']['wrong']) == (n in it['e3']['run2']['wrong'])); t += 1
    return a, t
def agreeev():
    out = []
    for p, q in itertools.combinations((1, 2, 3, 4), 2):
        a = t = 0
        for it in inc:
            ep, eq = it['ev'][p - 1], it['ev'][q - 1]
            if ep['drop'] or eq['drop']: continue
            for n in range(1, 6):
                if n == it['answer']: continue
                a += ((ep['marks'][n] == 'narrow') == (eq['marks'][n] == 'narrow')); t += 1
        out.append((p, q, a, t))
    return out
a3, t3 = agree3(); ae = agreeev(); ev_rates = [a / t for _, _, a, t in ae]; ev_mean = sum(ev_rates) / len(ev_rates); e3_rate = a3 / t3
P('### 2-3. 기준선 (오답 선지 단위 일치율)'); P()
P(f'- e3 run1·run2 선지 일치율: {a3}/{t3} = {e3_rate:.3f}'); P('- 평가자 쌍별 일치율(지름길 표시 여부, 오답 선지, 둘 다 판정이 남은 문항): ' + ', '.join(f'{p}-{q} {a}/{t}={a/t:.3f}' for p, q, a, t in ae) + f' → 평균 {ev_mean:.3f}'); P()
# ---- 5절
P('## 3. 5절 기준 값'); P()
P('상태 규칙: 충족 = 기준 조건에 해당, 미충족 = 해당하지 않음, 경계 = 한 문항의 값이 1 달랐다면 상태가 바뀜(5-f. 한 문항씩 ±1 바꿔 다시 계산해 확인).'); P()
def status_robust(fn, value_lists_by_kind):
    base = fn(value_lists_by_kind); flip = False
    for k, lst in value_lists_by_kind.items():
        for i in range(len(lst)):
            for dlt in (-1, 1):
                nv = lst[i] + dlt
                if nv < 0: continue
                alt = {kk: list(vv) for kk, vv in value_lists_by_kind.items()}; alt[k][i] = nv
                if fn(alt) != base: flip = True
    return ('경계' if flip else ('충족' if base else '미충족')), base
rows5 = []; notes5 = []
# 5-a
for kind in KINDS:
    e3max = max(vals(kind, 'r1', 'wrong') + vals(kind, 'r2', 'wrong')); evm = max(vals(kind, 'main', 'wrong')); evs = max(vals(kind, 'sub', 'wrong'))
    fn = lambda L, kind=kind: max(L['r1'] + L['r2']) == 4
    st, _ = status_robust(fn, {'r1': vals(kind, 'r1', 'wrong'), 'r2': vals(kind, 'r2', 'wrong')})
    branch = '' if e3max < 4 else (f'; 평가자 최댓값 주 {evm}·보조 {evs}: ' + ('3~4(기출 자체 꼴 분기)' if evm >= 3 else '2 이하(e3 과잉 탐지 분기)'))
    rows5.append(['5-a 수리 문턱 후보(e3)', kind, f'e3 오답 지름길 최댓값(run1·run2 통틀어) {e3max} → 후보 {e3max + 1}{branch}', f'{st} (충족 = 최댓값 4)'])
# 5-b
for kind in KINDS:
    v = vals(kind, 'main', 'all'); rows5.append(['5-b C23 상한 후보(평가자 주, 정답 포함)', kind, f'둘째 값 {second(v)}, 중앙값 {statistics.median(v)}, 최댓값 {max(v)}', '값만(충족 판정 없음)'])
# 5-c
for kind in KINDS:
    v = vals(kind, 'main', 'all'); n = len(v); cnt = sum(1 for x in v if x >= 2)
    fn = lambda L: sum(1 for x in L['v'] if x >= 2) * 2 >= len(L['v'])
    st, _ = status_robust(fn, {'v': v}); rows5.append(['5-c C23 "1개" 재검토 신호', kind, f'어김(선지≥2) {cnt}/{n}문항 (기준: 절반 이상)', st])
# 5-d
def meds(L): return {k: statistics.median(L[k]) for k in KINDS}
def fn5d(L): m = meds(L); return max(abs(m[a] - m[b]) for a, b in itertools.combinations(KINDS, 2)) >= 2
Lmain = {k: vals(k, 'main', 'all') for k in KINDS}; st, _ = status_robust(fn5d, Lmain); m = meds(Lmain)
pairs = {(a, b): m[a] - m[b] for a, b in itertools.combinations(KINDS, 2)}; bp = max(pairs, key=lambda p: abs(pairs[p]))
dirs = []
for s, nm in (('r1', 'e3 run1'), ('r2', 'e3 run2')):
    me = {k: statistics.median(vals(k, s, 'all')) for k in KINDS}; d = me[bp[0]] - me[bp[1]]; dirs.append(f'{nm} 중앙값 {me[bp[0]]}-{me[bp[1]]}={d:+}')
rows5.append(['5-d 갈래별 기준 신호(평가자 주, 정답 포함)', '전체', '중앙값 ' + ', '.join(f'{k} {m[k]}' for k in KINDS) + '; 쌍 차이 ' + ', '.join(f'{a}-{b} {v:+}' for (a, b), v in pairs.items()) + f'; 가장 큰 쌍 {bp[0]}-{bp[1]}에서 ' + ' / '.join(dirs), st + ' (충족 = 두 갈래 중앙값 차이 2 이상; e3 같은 방향이면 "강한 신호")'])
# 5-e
missed = []; e3only = []
for it in inc:
    for n in range(1, 6):
        if n == it['answer']: continue
        e3n, evy = cell(it, n, 'ev_sub')
        if e3n == 0 and evy: missed.append((it, n))
        if e3n == 2 and it['cnt'][n] <= 1: e3only.append((it, n))
mi = {}; [mi.setdefault(i['id'], i['kind']) for i, _ in missed]
eo = {}; [eo.setdefault(i['id'], i['kind']) for i, _ in e3only]
def f_missed(c, k): return (c >= 3 and k >= 2)
def rob_count(c, thr_): return ('경계' if (c == thr_ or c == thr_ - 1) else ('충족' if c >= thr_ else '미충족'))
st_m = f_missed(len(mi), len(set(mi.values())))
st_m = ('경계' if (f_missed(len(mi) + 1, len(set(mi.values())) + 1) != st_m or f_missed(max(len(mi) - 1, 0), len(set(mi.values()))) != st_m) else ('충족' if st_m else '미충족'))
rows5.append(['5-e-① 놓침(평가자 2명+, e3 두 번 다 통과)', '전체', f'{len(mi)}문항·{len(set(mi.values()))}갈래 ({", ".join(f"{k}:{v}" for k, v in mi.items())}); 선지 {len(missed)}개', st_m + ' (기준: 3문항 이상·2갈래 이상)'])
rows5.append(['5-e-② e3만(e3 두 번 다 지름길, 평가자 1명 이하)', '전체', f'{len(eo)}문항 ({", ".join(f"{k}:{v}" for k, v in eo.items())}); 선지 {len(e3only)}개', rob_count(len(eo), 3) + ' (기준: 3문항 이상)'])
diff = e3_rate - ev_mean
rows5.append(['5-e-③ e3 run1·run2 선지 일치율 < 평가자 쌍별 평균', '전체', f'e3 {e3_rate:.3f} vs 평가자 {ev_mean:.3f} (차 {diff:+.3f})', ('경계' if abs(diff) < 0.02 else ('충족' if diff < 0 else '미충족')) + ' (0.02 이내면 경계)'])
tbl(['기준', '갈래', '값', '상태'], rows5); P()
P('5-f: 위 표의 "경계"는 한 문항의 값이 1 달랐다면 상태가 바뀌는 항목이다. 표본 추가 여부는 이 보고서에서 정하지 않는다.'); P()
json.dump(dict(missed=[(i['id'], n) for i, n in missed], e3only=[(i['id'], n) for i, n in e3only]), open(f'{BASE}/aggregate-out.json', 'w'), ensure_ascii=False)
# ---- 4-0 문항별
P('## 4. 4-0 문항별 값'); P()
P('열: 지름길 오답 수(0~4) / 지름길 선지 수(정답 포함, 0~5). e3는 run1·run2 각각, 평가자는 주(3명+, 4-c 반영)·보조(2명+). 평가자 답 칸은 4명의 답(정답과 다르면 ✗).'); P()
rows = []
for it in sorted(items.values(), key=lambda i: (KINDS.index(i['kind']), i['id'])):
    ea = ' '.join(f'{e["ans"]}' + ('✗' if e['drop'] else '') for e in it['ev'])
    if it['excluded']: rows.append([it['kind'], it['id'], it['answer'], ea, '(집계 제외: 남은 평가자 2명 이하)', '', '', '', '']); continue
    f = lambda s: f'{wr(s, it)}/{len(s)}'
    rows.append([it['kind'], it['id'], it['answer'], ea, f(it['e3']['run1']['all']), f(it['e3']['run2']['all']), f(it['ev_main']), f(it['ev_sub']), it['amb']])
tbl(['갈래', 'id', '정답', '평가자 답 1~4', 'e3 run1', 'e3 run2', '평가자 주', '평가자 보조', '애매 칸 수'], rows); P()
# ---- 4-f
P('## 5. 4-f 나눠 본 값 (평균 지름길 수: 오답 기준 / 선지 전체 기준)'); P()
def group_rows(keyf, title):
    gs = {}
    for it in inc: gs.setdefault(keyf(it), []).append(it)
    rows = []
    for g, L in sorted(gs.items()):
        def mean(s, basis): return sum((wr({'r1': i['e3']['run1']['all'], 'r2': i['e3']['run2']['all'], 'main': i['ev_main'], 'sub': i['ev_sub']}[s], i) if basis == 'wrong' else len({'r1': i['e3']['run1']['all'], 'r2': i['e3']['run2']['all'], 'main': i['ev_main'], 'sub': i['ev_sub']}[s])) for i in L) / len(L)
        rows.append([g, len(L)] + [f'{mean(s, "wrong"):.2f} / {mean(s, "all"):.2f}' for s, _ in SRC])
    P(f'### {title}'); P(); tbl(['구분', '문항'] + [nm for _, nm in SRC], rows); P()
group_rows(lambda i: i['src'], '5-1. 출처 (평가원·수능 / 교육청(고1~고3 모두))')
group_rows(lambda i: i['dirn'], '5-2. 발문 방향')
group_rows(lambda i: i['struct'], '5-3. 지문 구조 유형 (S/P 코드, 없으면 -)')
P('### 5-4. 기존 4문항: 이번 6.2 값과 옛 6.1(calib4-gold) 값'); P()
OLDN = {'disclosure-12': 'disclosure-12', 'gongsun-12': 'gongsun-12', 'bt-6a213e93': 'infoasym-13', 'meaning-23': 'meaning-23'}; rows = []
for pid, on in OLDN.items():
    od = json.load(open(f'{OLD4}{on}/eval.json'))['before']['V1']; it = items[pid]
    f = lambda s: f'{wr(s, it)}/{len(s)}'
    rows.append([pid, f'{len(od["easyChoices"])}/{len(od["easyChoices"]) + int(any(SC_REASON in r for r in od["reasons"]))} (e3 답 {od["solverAnswer"]})', f(it['e3']['run1']['all']), f(it['e3']['run2']['all']), f(it['ev_main']), f(it['ev_sub'])])
tbl(['id', '옛 6.1 e3', '6.2 e3 run1', '6.2 e3 run2', '평가자 주', '평가자 보조'], rows); P()
# ---- 인용
def quote(it, n):
    for e in it['ev']:
        a, f, w = e['why'][n]
        P(f'  - 평가자{e["k"]}' + (' (답이 정답과 달라 판정 제외)' if e['drop'] else '') + f' [A {a} / B {f or "-"}]: "{w}"')
P('## 6. 놓침·e3만 선지 인용 (평가자 원문 C 칸 그대로)'); P()
P(f'### 6-1. 놓침 {len(missed)}개 (평가자 2명 이상이 지름길, e3는 두 번 다 통과)'); P()
for it, n in missed:
    P(f'- {it["kind"]} {it["id"]} 묶음{it["bundle"]}-{it["sym"]} 선지 {CIRC[n-1]} (정답 {it["answer"]}; 평가자 지름길 표시 {it["cnt"][n]}명)'); quote(it, n)
P(); P(f'### 6-2. e3만 {len(e3only)}개 (e3는 두 번 다 지름길, 평가자는 1명 이하)'); P()
for it, n in e3only:
    P(f'- {it["kind"]} {it["id"]} 묶음{it["bundle"]}-{it["sym"]} 선지 {CIRC[n-1]} (정답 {it["answer"]}; 평가자 지름길 표시 {it["cnt"][n]}명)'); quote(it, n)
P()
# 인용이 표 원문과 같은지
mis = 0; tot = 0; txtcache = {}
for it, n in missed + e3only:
    for e in it['ev']:
        t = txtcache.setdefault((it['bundle'], e['k']), open(f'{BASE}/codex/{it["bundle"]}/REPORT-eval{e["k"]}.md').read()); tot += 1
        if e['why'][n][2] not in t: mis += 1
P(f'인용 점검: JSON의 C 문구가 같은 평가자 보고 원문에 그대로 있는지 {tot - mis}/{tot}.'); P()
# ---- 4-g
P('## 7. 4-g 참고 줄 (도플러·mRNA, 본 집계에서 제외)'); P()
rows = []
for nm, f in (('도플러 12번', 'doppler-12'), ('mRNA 19번', 'mrna-19')):
    d = json.load(open(f'{GOLD3}{f}/eval.json'))['before']['V1']
    rows.append([nm, f'지름길 오답 {len(d["easyChoices"])}개 {d["easyChoices"]}', '정답 지름길 ' + ('예' if any(SC_REASON in r for r in d['reasons']) else '아니오'), f'e3 답 {d["solverAnswer"]}', '; '.join(d['reasons']) or '사유 없음'])
tbl(['문항', '옛 6.1 e3(calib3-gold)', '정답', 'e3 답', '사유'], rows); P()
P('deep-item-v5-2026-11-18/blind/REPORT-graph-r3-eval1~4.md의 "보기 없이 풀리는 선지" 칸(기출 12번 = 지문 1 나, 기출 19번 = 지문 2 나; KEY-graph-r3.md):'); P()
rows = []
for k in (1, 2, 3, 4):
    lines = open(f'{EXP}/deep-item-v5-2026-11-18/blind/REPORT-graph-r3-eval{k}.md').read().split('\n'); idx = None; got = {}
    for l in lines:
        if not l.strip().startswith('|'): continue
        c = [x.strip() for x in l.strip().strip('|').split('|')]
        if '보기 없이 풀리는 선지' in c: idx = c.index('보기 없이 풀리는 선지'); continue
        if idx is not None and len(c) > idx and c[0] in ('1', '2') and c[1] == '나': got[c[0]] = (c[2], c[3], c[idx])
    rows.append([f'평가자{k}', f'답 {got["1"][0]} / {got["1"][1]} / 보기 없이 풀리는 선지: {got["1"][2]}', f'답 {got["2"][0]} / {got["2"][1]} / 보기 없이 풀리는 선지: {got["2"][2]}'])
tbl(['평가자', '기출 도플러 12번(지문 1 나)', '기출 mRNA 19번(지문 2 나)'], rows); P()
# ---- 평가자 답
P('## 8. 부록: 평가자 형식 점검'); P(); P(f'- 4×2회 모두 JSON 블록이 있고 문항 11개·선지 5개를 채웠다(재실행 없음). 애매(A·B 칸이 형식에 안 맞음) 칸 합계: {sum(i["amb"] for i in items.values())}.'); P()
open(f'{BASE}/REPORT-bogi-distractor-tagging.md', 'w').write('\n'.join(R) + '\n'); print('done', len(R))
