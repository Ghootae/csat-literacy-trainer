# 순서표 ② 2회차(앵커 더함) 블라인드 생성 (2026-11-24). 1회차 BLIND-cell2.md의 5문항 블록을 글자 그대로 옮기고,
# 정보 비대칭 지문과 기출 13번(마)은 cell1-v62/blind/BLIND-cell1.md 블록을 그대로 옮긴다. 순서만 새로 무작위. 출처 표시 없음.
import json, random, re, os, shutil
HERE=os.path.dirname(os.path.abspath(__file__)); B1=os.path.abspath(HERE+'/../blind')+'/'; C1=os.path.abspath(HERE+'/../../cell1-v62/blind')+'/'
V5=os.path.abspath(HERE+'/../../../deep-item-v5-2026-11-18')+'/'
def split(txt):
    parts=re.split(r'(?m)^(?=\*\*\[문항 )',txt); return parts[0],{re.match(r'\*\*\[문항 (.)\]',p).group(1):p for p in parts[1:]}
t2=open(B1+'BLIND-cell2.md',encoding='utf8').read(); pre2,it2=split(t2)
t1=open(C1+'BLIND-cell1.md',encoding='utf8').read(); pre1,it1=split(t1)
pass1=pre2[pre2.index('# 지문: 조세'):]            # 지문 1 제목~'## 문항'
# cell1 BLIND는 지문 1 문항들 뒤에 지문 2가 이어지므로, 지문 1 제목~'## 문항'까지만 쓴다
pass2=t1[t1.index('# 지문 1: 정보 비대칭'):t1.index('**[문항 가]**')]
pass2=pass2.replace('# 지문 1: 정보 비대칭','# 지문 2: 정보 비대칭')
K2={k['item']:k for k in json.load(open(B1+'KEY-cell2.json'))}; K1={k['item']:k for k in json.load(open(C1+'KEY-cell1.json'))}
g13=json.load(open(V5+'calib-gold/infoasym-13.json'))['items'][0]['answer']
assert K1['마']['source'].startswith('기출 13번') and K1['마']['answer']=='①②③④⑤'[g13-1]
order=list('가나다라마'); random.Random(20261129).shuffle(order)
new={o:str(i+1) for i,o in enumerate(order)}   # 1회차 라벨 -> 새 번호
hdr='''# 블라인드 풀이지: 〈보기〉 문항 6개 (사회 경제 표·그래프, 사회 관점) (2026-11-24, 순서표 ② 2회차)

지문 두 개에 〈보기〉 문항이 모두 6개 있습니다(첫째 지문 5개, 둘째 지문 1개). 서로 비슷한 문항이 있을 수 있지만 문항마다 따로 판정하세요. 출처는 가렸고 순서는 섞었습니다. 기출 문항이 섞여 있을 수 있습니다. 〈보기〉가 그래프인 문항은 그림을 PNG로 첨부했고(파일 이름 = pic-문항.png, 예: pic-1.png), 같은 그림을 글로 옮긴 "그래프 읽기 판"을 문항에 함께 적었습니다. 그림이 없는 〈보기〉(표 또는 글)는 글만 있습니다.

문항마다 아래를 적어 주세요. 답과 등급을 모두 정한 뒤에 정답표를 여세요.
'''
hdr+=t2[t2.index('- 고른 답'):t2.index('# 지문: 조세')]
out=[hdr.rstrip('\n')+'\n\n',pass1]
key=['# KEY (순서표 ② 2회차, 앵커 더함, 2026-11-24)\n','| 문항 | 지문 | 출처 | 정답 | 그림 |','|---|---|---|---|---|']; kj=[]; pics=[]
for o in order:
    n=new[o]; blk=it2[o]; blk=re.sub(r'\*\*\[문항 .\]\*\*',f'**[문항 {n}]**',blk,1).replace(f'pic-{o}.png',f'pic-{n}.png')
    out.append(blk.rstrip('\n')+'\n\n')
    k=K2[o]; has=k['hasImage']
    if has: shutil.copy(B1+f'imgs/pic-{o}.png',HERE+f'/img/pic-{n}.png'); pics.append(f'pic-{n}.png')
    key.append(f"| {n} | 지문 1 | {k['source']} | {k['answer']} | {'있음' if has else '없음'} |")
    kj.append({'item':n,'passage':1,'pid':k['pid'],'source':k['source'],'answer':k['answer'],'stem':k['stem'],'hasImage':has})
out.append(pass2)
m6=it1['마'][:it1['마'].index('\n# 지문 2:')]
blk=re.sub(r'\*\*\[문항 .\]\*\*','**[문항 6]**',m6,1).rstrip()+'\n\n---\n'
out.append(blk)
key.append(f"| 6 | 지문 2 | {K1['마']['source']} | {K1['마']['answer']} | 없음 |")
kj.append({'item':'6','passage':2,'pid':K1['마']['pid'],'source':K1['마']['source'],'answer':K1['마']['answer'],'stem':K1['마']['stem'],'hasImage':False})
open(HERE+'/BLIND-cell2-r2.md','w',encoding='utf8').write(''.join(out)); open(HERE+'/KEY-cell2-r2.md','w',encoding='utf8').write('\n'.join(key)+'\n')
json.dump(kj,open(HERE+'/KEY-cell2-r2.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
p1=open(B1+'CODEX-PROMPT-cell2.md',encoding='utf8').read()
p=p1.replace('작업 폴더의 BLIND-cell2.md를 풀고 판정해 줘. 지문이 하나이고 〈보기〉 문항이 모두 5개야.','작업 폴더의 BLIND-cell2-r2.md를 풀고 판정해 줘. 지문이 둘이고 〈보기〉 문항이 모두 6개야(첫째 지문 5개, 둘째 지문 1개).')
p=re.sub(r'\(pic-가\.png, pic-나\.png, pic-마\.png\)','('+', '.join(sorted(pics))+')',p)
p=p.replace('표 〈보기〉 문항은 그림 없이 글(표)만 있어.','표·글 〈보기〉 문항은 그림 없이 글만 있어.').replace('(가~마)','(1~6)').replace('"item":"가"','"item":"1"')
assert 'cell2.md' not in p.replace('cell2-r2.md','') and '가~마' not in p
open(HERE+'/CODEX-PROMPT-cell2-r2.md','w',encoding='utf8').write(p)
print(open(HERE+'/KEY-cell2-r2.md',encoding='utf8').read())
