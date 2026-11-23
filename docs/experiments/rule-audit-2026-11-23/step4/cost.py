# usage.json 합산. 단가 입력 $2·출력 $10 / 1M (REPORT-cell4-social-A.md), 캐시 적중 0 가정 아님: cached는 입력으로 동일 처리(보수적).
import json,glob,sys,collections
R='docs/experiments/'
groups={'v6 생성':R+'deep-item-v5-2026-11-18/out-step4-v6/**/usage.json','v5 생성':R+'deep-item-v5-2026-11-18/out-step4-v5/**/usage.json','확인용 e3':R+'rule-audit-2026-11-23/step4/confirm/e3/**/usage.json'}
extra=glob.glob(R+'deep-item-v5-2026-11-18/out-step4-*-regen/**/usage.json',recursive=True)
tot=0
for g,pat in groups.items():
    fs=glob.glob(pat,recursive=True); s=0;stage=collections.Counter()
    for f in fs:
        for e in json.load(open(f)):
            u=e['usage']; c=(u['input_tokens']*2+u['output_tokens']*10)/1e6; s+=c; stage[f.split('/')[-2] if 'leakfix' in f or 'repair' in f else 'gen']+=c
    print(g,len(fs),'파일 $%.2f'%s,{k:round(v,2) for k,v in stage.items()}); tot+=s
print('regen',len(extra)); print('합계 $%.2f'%tot)
