# json 블록이 없거나 빈 회차만 한 번 다시 돌린다 (같은 명령). 사용: python3 rerun_failed.py  (이 폴더에서)
import os,re,subprocess,glob,sys
H=os.path.dirname(os.path.abspath(__file__))
def ok(p):
    if not os.path.exists(p): return False
    t=open(p,encoding='utf8').read(); return bool(re.findall(r'```json\s*(.*?)```',t,re.S))
jobs=[]
for d in sorted(glob.glob(H+'/C*/')):
    key=os.path.basename(d.rstrip('/')); pic=os.path.exists(d+'pic-1.png')
    for r in (1,2):
        for i in range(1,5):
            p=d+f'REPORT-eval-r{r}-{i}.md'
            if not ok(p): jobs.append((key,r,i,d,pic))
print('재시도 대상',[(k,r,i) for k,r,i,_,_ in jobs])
procs=[]
for key,r,i,d,pic in jobs:
    T=subprocess.check_output(['mktemp','-d',f'/tmp/cjre{key}r{r}{i}.XXXX']).decode().strip()
    subprocess.check_call(['cp',d+'BLIND.md',T+'/']); 
    if pic: subprocess.check_call(['cp',d+'pic-1.png',T+'/'])
    cmd=['codex','exec']+(['-i','pic-1.png'] if pic else [])+['-m','gpt-6.1-sol','-s','read-only','--skip-git-repo-check','--ephemeral','-C',T,'-o',T+'/answer.md','-']
    procs.append((key,r,i,d,T,subprocess.Popen(cmd,cwd=T,stdin=open(d+'CODEX-PROMPT.md','rb'),stdout=open(T+'/log.txt','wb'),stderr=subprocess.STDOUT)))
for key,r,i,d,T,p in procs:
    rc=p.wait(); print(key,f'r{r}-{i} retry exit={rc}')
    if os.path.exists(T+'/answer.md'): subprocess.check_call(['cp',T+'/answer.md',d+f'REPORT-eval-r{r}-{i}.md'])
print('재시도 후 남은 실패',[(k,r,i) for k,r,i,d,_ in jobs if not ok(d+f'REPORT-eval-r{r}-{i}.md')])
