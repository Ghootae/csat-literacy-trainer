# 평가자 REPORT에서 JSON 블록을 읽고 형식 점검. 사용: import parse(path) / 직접 실행하면 전체 점검
import json, re, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
def parse(path):
    t = open(path).read(); blocks = re.findall(r'```json\s*(.*?)```', t, re.S)
    if not blocks: raise ValueError('JSON 블록 없음')
    data = json.loads(blocks[-1])
    if not isinstance(data, list): raise ValueError('최상위가 목록 아님')
    return data
def check(path, nitems=11):
    try: d = parse(path)
    except Exception as e: return [f'JSON 오류: {e}']
    probs = []
    if len(d) != nitems: probs.append(f'문항 {len(d)}개')
    for x in d:
        ch = x.get('choices', [])
        if sorted(c.get('n') for c in ch) != [1, 2, 3, 4, 5]: probs.append(f'{x.get("item")}: 선지 {len(ch)}개/번호 이상')
        for c in ch:
            if c.get('needsBogi') not in ('예', '아니오'): probs.append(f'{x.get("item")}-{c.get("n")}: needsBogi={c.get("needsBogi")!r}')
            if c.get('needsBogi') == '아니오' and c.get('facts') not in ('하나', '여럿'): probs.append(f'{x.get("item")}-{c.get("n")}: facts={c.get("facts")!r}')
    return probs
if __name__ == '__main__':
    for n in (1, 2):
        for k in (1, 2, 3, 4):
            p = f'{BASE}/codex/{n}/REPORT-eval{k}.md'
            if os.path.exists(p): print(n, k, check(p) or 'OK')
