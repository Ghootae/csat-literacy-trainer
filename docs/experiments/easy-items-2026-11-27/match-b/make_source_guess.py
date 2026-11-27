# 5단계 출처 추정: M01~M16 의 지문+문항만(머리말·채점 항목 없음) 주고 출처만 묻는다. 채점 세션과 별도.
import os,json
HERE=os.path.dirname(os.path.abspath(__file__))
PROMPT='''작업 폴더의 BLIND.md에 지문 하나와 문항 1개가 있어. 이 폴더의 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마. 문항을 풀 필요는 없고 아래만 답해 줘.

이 문항은 실제 수능·모의평가에 나온 문항입니까, 누군가 새로 만든 문항입니까? 답: 실제 / 만든 것 / 모르겠음. 한 줄 이유. 이 지문이나 문항을 본 적이 있다고 기억하면 그렇다고 적으세요.

출력: ```json 블록 하나로: {"guess":"실제","reason":"...","remembered":false} (guess는 실제/만든 것/모르겠음 중 하나, remembered는 본 적이 있다고 기억하면 true). 파일은 쓰지 말고 답으로만 내 줘.
'''
for i in range(1,17):
    k=f'M{i:02d}'; t=open(f'{HERE}/{k}/BLIND.md',encoding='utf8').read(); body=t[t.index('# 지문'):]
    D=f'{HERE}/source-guess/{k}/'; os.makedirs(D,exist_ok=True)
    open(D+'BLIND.md','w',encoding='utf8').write(body); open(D+'PROMPT.md','w',encoding='utf8').write(PROMPT)
    open(D+'run_guess.sh','w').write(f'''#!/bin/zsh
H=$(cd $(dirname $0) && pwd)
for r in 1 2; do
  T=$(mktemp -d /tmp/guess{k}r$r.XXXX); cp $H/BLIND.md $T/
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/PROMPT.md > $T/log.txt 2>&1; echo "{k} r$r exit=$?"; cp $T/answer.md $H/GUESS-r$r.md) &
done
wait
''')
    os.chmod(D+'run_guess.sh',0o755)
print('ok'); print(open(f'{HERE}/source-guess/M01/BLIND.md',encoding='utf8').read()[:60])
