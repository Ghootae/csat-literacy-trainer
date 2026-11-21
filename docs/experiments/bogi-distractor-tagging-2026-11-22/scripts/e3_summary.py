# 단계 B5: e3 결과 → E3-SUMMARY.md. 판정 없이 값만 적는다. API 호출 없음.
import json, os
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
EXP = os.path.abspath(os.path.join(BASE, '..'))
manifest = json.load(open(f'{BASE}/items/_manifest.json')); chk = json.load(open(f'{BASE}/items/_check.json'))
OLD = {'disclosure-12': 'disclosure-12', 'gongsun-12': 'gongsun-12', 'bt-6a213e93': 'infoasym-13', 'meaning-23': 'meaning-23'}
SC_REASON = '정답이 〈보기〉 없이 지문 한 사실로 판정됨'
PRICE = {'in': 2.0, 'cached': 0.10, 'out': 10.0}  # $/1M 토큰
def load(path):
    p = f'{path}/eval.json'
    return json.load(open(p))['before']['V1'] if os.path.exists(p) else None
def cost(path):
    p = f'{path}/usage.json'
    if not os.path.exists(p): return 0, 0, 0, 0.0
    i = c = o = 0
    for e in json.load(open(p)):
        u = e['usage']; i += u['input_tokens']; c += u['input_tokens_details'].get('cached_tokens', 0); o += u['output_tokens']
    return i, c, o, ((i - c) * PRICE['in'] + c * PRICE['cached'] + o * PRICE['out']) / 1e6
def fmt_run(d, ans):
    if d is None: return None
    sa = d['solverAnswer']
    return dict(ans=f'{sa}' + ('' if sa == ans else ' ✗(정답 ' + str(ans) + ')'), easy=','.join(map(str, d['easyChoices'])) or '-',
                ac=('예' if any(SC_REASON in r for r in d['reasons']) else '아니오'), steps='/'.join(map(str, d['steps'])),
                note=' · '.join(d['reasons'] + ['[경고] ' + w for w in d['warnings']]))
rows = []; tot = {'run1': [0, 0, 0, 0.0], 'run2': [0, 0, 0, 0.0]}
o = ['# E3 요약 (단계 B5)', '', '판정 없이 값만 적는다. `scripts/e3_summary.py`가 `e3/run{1,2}/<id>/eval.json`·`usage.json`에서 만든다. 모델 gpt-6.2-sol, 추론 강도 high(`eval-repair.mjs` 기본값, 로그 첫 줄에서 확인).', '',
     '- 지름길 오답 번호 = `easyChoices`(오답 중 `one_fact_shortcut.possible`이 참이고 `minimum_evidence.bogi`가 빈 선지). 정답 지름길 = 사유에 "' + SC_REASON + '"가 있음.',
     '- steps는 선지 ①~⑤의 추론 단계 수. e3 답이 기출 정답과 다르면 ✗로 표시했다(값은 그대로 센다).', '',
     '| 갈래 | id | 정답 | e3 답 run1 | e3 답 run2 | 지름길 오답 run1 | 지름길 오답 run2 | 정답 지름길 run1/run2 | steps run1 | steps run2 | 옛 6.1(calib4-gold) 지름길 오답 / 정답 지름길 / e3 답 |', '|---|---|---|---|---|---|---|---|---|---|---|']
notes = []; skipped = []
for m in manifest:
    pid = m['id']
    if any(v == 'FAIL' for v in chk[pid].values()):
        skipped.append(pid); o.append(f'| {m["kind"]} | {pid} | {m["answer"]} | (점검 FAIL로 미실행) | | | | | | | |'); continue
    r1 = fmt_run(load(f'{BASE}/e3/run1/{pid}'), m['answer']); r2 = fmt_run(load(f'{BASE}/e3/run2/{pid}'), m['answer'])
    old = ''
    if pid in OLD:
        od = load(f'{EXP}/deep-item-v5-2026-11-18/calib4-gold/{OLD[pid]}')
        if od: x = fmt_run(od, m['answer']); old = f'{x["easy"]} / {x["ac"]} / {x["ans"]}'
    g = lambda r, k: r[k] if r else '(없음)'
    o.append(f'| {m["kind"]} | {pid} | {m["answer"]} | {g(r1,"ans")} | {g(r2,"ans")} | {g(r1,"easy")} | {g(r2,"easy")} | {g(r1,"ac")}/{g(r2,"ac")} | {g(r1,"steps")} | {g(r2,"steps")} | {old} |')
    notes.append((pid, r1, r2))
    for run in ('run1', 'run2'):
        t = cost(f'{BASE}/e3/{run}/{pid}')
        for k in range(4): tot[run][k] += t[k]
o += ['', '## 경고·사유 요약 (검사 규칙이 낸 문구 그대로)', '']
for pid, r1, r2 in notes:
    for tag, r in (('run1', r1), ('run2', r2)):
        o.append(f'- {pid} {tag}: ' + (r['note'] if r and r['note'] else '(사유·경고 없음)'))
o += ['', '## 토큰·비용', '', f'단가(gpt-6.2-sol): 입력 $2, 캐시 적중 입력 $0.10, 출력 $10 / 1M 토큰. 출처: `docs/experiments/set-pattern-2026-11-18/REPORT-cell-gen62.md` 3절("단가 $2/$0.10/$10"). 캐시 기록 토큰은 입력 단가로 셌다(가정). `usage.json`의 input_tokens에서 cached_tokens를 뺀 값을 입력으로 센다.', '',
      '| 회차 | 입력 토큰 | 캐시 적중 | 출력 토큰 | 비용($) |', '|---|---|---|---|---|']
gt = [0, 0, 0, 0.0]
for run in ('run1', 'run2'):
    t = tot[run]; o.append(f'| {run} | {t[0]:,} | {t[1]:,} | {t[2]:,} | {t[3]:.3f} |')
    for k in range(4): gt[k] += t[k]
o.append(f'| 합계 | {gt[0]:,} | {gt[1]:,} | {gt[2]:,} | {gt[3]:.3f} |')
n = len(notes)
o += ['', f'실행 문항 {n}개 × 2회. 문항당 평균 ${gt[3] / max(n, 1) / 2:.3f}/회. 미실행: ' + (', '.join(skipped) or '없음') + '.']
open(f'{BASE}/E3-SUMMARY.md', 'w').write('\n'.join(o) + '\n')
print(f'합계 ${gt[3]:.3f}', skipped)
