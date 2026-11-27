import json,os
HERE=os.path.dirname(os.path.abspath(__file__)); G=HERE+'/../gen/'; I=HERE+'/../inputs/'
CIRC='①②③④⑤'
for n in ['T-B','C-B']:
    it=json.load(open(G+f'{n}/item.json')); p=open(I+f"{n}-marked.txt",encoding='utf8').read()
    ch='  \n'.join(f"{CIRC[c['n']-1]} {c['text']}" for c in it['choices'])
    D=HERE+f'/{n}/'; os.makedirs(D,exist_ok=True)
    open(D+'BLIND.md','w',encoding='utf8').write(f"# 풀이지\n\n# 지문\n\n{p}\n\n## 문항\n**[문항 1]** {it['stem']}\n\n{ch}\n")
    open(D+'run_floor.sh','w').write(f'''#!/bin/zsh
H=$(cd $(dirname $0) && pwd)
for r in 1 2; do
  T=$(mktemp -d /tmp/floor{n}r$r.XXXX); cp $H/BLIND.md $T/
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/../FLOOR-PROMPT.md > $T/log.txt 2>&1; echo "{n} r$r exit=$?"; cp $T/answer.md $H/SOLVE-r$r.md) &
done
wait
''')
    os.chmod(D+'run_floor.sh',0o755)
