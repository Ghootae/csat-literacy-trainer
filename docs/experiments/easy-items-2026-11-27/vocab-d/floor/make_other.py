# other_sentence 확인용 codex 요청 파일 생성. 틀림 선지 중 other_sentence 가 있는 것마다 1회.
import json,os,re
HERE=os.path.dirname(os.path.abspath(__file__)); G=HERE+'/../gen/'
jobs=[]
for n in ['T-B','C-B']:
    it=json.load(open(G+f'{n}/item.json'))
    for c in it['choices']:
        o=(c.get('other_sentence') or '').strip()
        if not o: continue
        a,b=[x.strip() for x in o.split('=',1)]
        D=HERE+f'/other/{n}-{c["n"]}/'; os.makedirs(D,exist_ok=True)
        open(D+'PROMPT.md','w',encoding='utf8').write(f"다음 두 문장에서 앞 문장의 낱말을 바꾼 뒤 문장의 뜻이 같은가?\n\n앞 문장: {a}\n뒤 문장: {b}\n\n예 또는 아니오로 답하고 한 줄 이유를 적어 줘. 이 폴더의 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마. 파일은 쓰지 말고 답으로만 내 줘. 마지막 줄에 ```json {{\"answer\":\"예\"}} ``` 꼴로 한 번 적어 줘.\n")
        jobs.append(f'{n}-{c["n"]}')
open(HERE+'/other/run_other.sh','w').write('#!/bin/zsh\nH=$(cd $(dirname $0) && pwd)\n'+''.join(f'''(T=$(mktemp -d /tmp/other{j}.XXXX); cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/{j}/PROMPT.md > $T/log.txt 2>&1; echo "{j} exit=$?"; cp $T/answer.md $H/{j}/ANSWER.md) &\n''' for j in jobs)+'wait\n')
os.chmod(HERE+'/other/run_other.sh',0o755); print(jobs)
