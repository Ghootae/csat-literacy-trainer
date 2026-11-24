# 순서표 ③-1 비용 합산: 실행: python3 docs/experiments/set-pattern-2026-11-18/cell3/cost.py [out폴더 ...]  (입력 $2·출력 $10 / 1M, cached도 입력으로 쳐서 보수적)
import json, glob, sys, collections
V5='docs/experiments/deep-item-v5-2026-11-18/'
dirs=sys.argv[1:] or ['out-cell3-v62','out-cell3-v62-regen']
def c(u): return (u['input_tokens']*2+u['output_tokens']*10)/1e6
tot=0; st=collections.Counter()
for d in dirs:
    for f in glob.glob(V5+d+'/**/usage.json',recursive=True):
        part='생성' if f.count('/')==V5.count('/')+2 else ('수리' if '/repair/' in f else '노출 수리' if '/leakfix/' in f else '기타')
        for e in json.load(open(f)):
            x=c(e['usage']); st[(d,f.split(d+'/')[1].split('/')[0],part)]+=x; tot+=x
for k,v in sorted(st.items()): print(k, round(v,3))
print('합계', round(tot,3))
