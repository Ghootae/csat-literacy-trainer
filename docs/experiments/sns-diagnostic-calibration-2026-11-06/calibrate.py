# SNS 진단 위치 보정 확인(D-0207). 외부 전송 없음. 실행: python3 -I docs/experiments/sns-diagnostic-calibration-2026-11-06/calibrate.py
# 방법: 메가스터디 정답률 → Rasch 난이도(b = -logit(p) * sqrt(1 + pi*sigma^2/8)) → 세트 E 정답 수로 θ(EAP, N(0, sigma^2))
#       → 기준 시험 45문항 예상 원점수 → 원점수 등급컷 보간으로 전국 백분위. 선택과목 집단마다 따로 계산해 백분위 평균.
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
ITEMS = json.load(open(os.path.join(HERE, 'megastudy-items.json'), encoding='utf-8'))['exams']
CUTS = json.load(open(os.path.join(HERE, 'grade-cuts.json'), encoding='utf-8'))
SETE = CUTS['setEItems']
SUBS = ('1004', '1005')
SUBNAME = {'1004': '화작', '1005': '언매'}
TOP = [4, 11, 23, 40, 60, 77, 89, 96]  # 등급별 누적 상위 비율(%)
L = lambda x: 1 / (1 + math.exp(-x))

def diff(p, sigma): return -math.log(p / (1 - p)) * math.sqrt(1 + math.pi * sigma ** 2 / 8)
def exam(seq, sub): return {int(n): (v['correctRate'] / 100, v['points']) for n, v in ITEMS[seq]['bySubject'][sub].items()}
def pct_of_raw(r, seq, sub):
    c = CUTS['exams'][seq]
    pts = [(100, 100)] + list(zip(c['cuts'][sub], c['percentile'])) + [(0, 0)]
    for (r1, p1), (r2, p2) in zip(pts, pts[1:]):
        if r2 <= r <= r1: return p1 if r1 == r2 else p2 + (p1 - p2) * (r - r2) / (r1 - r2)
    return 0.0
def grade(pct):
    top = 100 - pct
    return next((g for g, c in enumerate(TOP, 1) if top <= c), 9)
def expected_raw(th, seq, sub, sigma):
    return sum(w * L(th - diff(p, sigma)) for p, w in exam(seq, sub).values())
def eap(k, bs, sigma):
    order = sorted(range(len(bs)), key=lambda i: bs[i]); resp = [0] * len(bs)
    for i in order[:k]: resp[i] = 1  # Rasch에서는 정답 수가 충분통계량이라 어느 문항을 맞혔는지와 무관
    grid = [-4 + 8 * j / 400 for j in range(401)]
    lp = [-t * t / (2 * sigma * sigma) + sum(math.log(L(t - b) if r else 1 - L(t - b)) for r, b in zip(resp, bs)) for t in grid]
    m = max(lp); w = [math.exp(x - m) for x in lp]; s = sum(w)
    mean = sum(g * x for g, x in zip(grid, w)) / s
    cdf, lo, hi = 0, None, None
    for g, x in zip(grid, w):
        cdf += x / s
        if lo is None and cdf >= 0.1: lo = g
        if hi is None and cdf >= 0.9: hi = g
    return mean, lo, hi
def sete_b(sub, sigma):
    out = []
    for seq, ns in SETE.items():
        it = exam(seq, sub); out += [diff(it[n][0], sigma) for n in ns]
    return out

if __name__ == '__main__':
    print('# 1. 같은 θ를 기준 시험별로 옮긴 전국 백분위(등급). θ는 각 선택과목 메가스터디 이용자 평균 = 0')
    for sigma in (0.8, 1.0, 1.5):
        print(f'\n## sigma={sigma}')
        print('| θ | ' + ' | '.join(f'{CUTS["exams"][s]["label"]} {SUBNAME[u]}' for s in ('349', '334', '319') for u in SUBS) + ' |')
        print('|---' * 7 + '|')
        for th in (-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5, 2.0):
            cells = [f'{pct_of_raw(expected_raw(th, s, u, sigma), s, u):.1f} ({grade(pct_of_raw(expected_raw(th, s, u, sigma), s, u))})' for s in ('349', '334', '319') for u in SUBS]
            print(f'| {th:+.1f} | ' + ' | '.join(cells) + ' |')
    print('\n# 2. 메가스터디 이용자 평균 원점수(Σ정답률×배점)와 그 점수의 전국 백분위')
    for s in ('349', '334', '319'):
        for u in SUBS:
            r = sum(p * w for p, w in exam(s, u).values())
            print(f'- {CUTS["exams"][s]["label"]} {SUBNAME[u]}: {r:.1f}점 → 백분위 {pct_of_raw(r, s, u):.1f}')
    print('\n# 3. 세트 E 16문항 정답 수 → 2026학년도 수능 기준 위치(방안 (가): 두 집단 백분위 평균). sigma=1')
    print('| 정답 수 | 화작 백분위 | 언매 백분위 | 평균 백분위(등급) | 80% 범위(평균, 등급) |')
    print('|---|---|---|---|---|')
    for k in range(4, 17):
        res = {}
        for u in SUBS:
            m, lo, hi = eap(k, sete_b(u, 1.0), 1.0)
            res[u] = tuple(pct_of_raw(expected_raw(t, '349', u, 1.0), '349', u) for t in (m, lo, hi))
        avg = [sum(res[u][i] for u in SUBS) / 2 for i in range(3)]
        print(f'| {k} | {res["1004"][0]:.0f} | {res["1005"][0]:.0f} | {avg[0]:.0f} ({grade(avg[0])}) | {avg[1]:.0f}~{avg[2]:.0f} ({grade(avg[2])}~{grade(avg[1])}등급) |')
