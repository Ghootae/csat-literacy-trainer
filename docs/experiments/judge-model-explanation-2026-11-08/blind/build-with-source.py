# 블라인드 질문 묶음에 지문·<보기>·문항·표시 부분을 붙여 다시 쓴다. 조건 이름은 넣지 않는다.
import json, sys
D = 'docs/experiments/judge-model-explanation-2026-11-08'
p = json.load(open('sessions/diagnostic/d8743308-d746-4588-b403-954f2d7f3773.json'))
key = json.load(open(f'{D}/blind/KEY.json'))['questions']
Q = {'A-cog16': 'consciousness-cognition-q16', 'A-horse5': 'horse-race-reporting-q5', 'A-aud17': 'audio-perceptual-coding-q17'}
C = '①②③④⑤'
out = ['# 질문 비교 (블라인드, 지문 포함)', '', '조건 이름은 가렸다. "표시한 부분"은 화면에서 원문에 칠해지는 곳이다. 판정기 메모는 학생에게 보이지 않는다.', '']
for case, q in Q.items():
    it = p['items'][q]; s = it['session']['source']
    out += [f'## {case} — {s["title"]} {s["questionNumber"]}번', '', '### 지문', '', s['passage'], '']
    if s.get('scenario'): out += ['### <보기>', '', s['scenario'], '']
    for m in s.get('media') or []:
        out += [f'### 자료 {m.get("mediaId","")}', '', json.dumps({k: v for k, v in m.items() if k not in ('dataUrl', 'path', 'src', 'base64')}, ensure_ascii=False), '']
    out += ['### 문항', '', s['stem'], '']
    for ch in s['choices']:
        mark = ' **(학생이 고른 선지, 정답)**' if ch['choiceId'] == it['first']['choiceId'] else ''
        out.append(f'- {C[ch["position"]-1]} {ch["text"]}{mark}')
    out += ['', f'**학생 근거:** {it["first"]["rationale"]["text"]}', '', '### 질문들', '']
    for letter, ref in key[case].items():
        cell = json.load(open(f'{D}/runs/{case}__{ref["condition"]}__r{ref["replicate"]}.json'))
        errs = cell['rawOutput']['errors'] if cell['rawOutput'] else []
        q_err = [e for e in errs if e.get('question')]
        if not q_err:
            q_txt = cell['rawOutput'].get('selectionMismatchQuestion'); q_err = [{'question': q_txt, 'sourceEvidence': [], 'description': '(선택–근거 충돌 질문)'}]
        for e in q_err:
            marks = [x.get('quote') or x.get('visualObservation') for x in e.get('sourceEvidence', [])]
            out += [f'#### {letter}', '', f'> {e["question"]}', '']
            for mk in marks: out.append(f'- 표시한 부분: {mk}')
            out += [f'- 판정기 메모: {e.get("description","")}', '', '- 무엇을 묻는지 바로 알겠나: 좋음 / 보통 / 나쁨', '- 판정 이유가 납득되나: 좋음 / 보통 / 나쁨',
                    '- 꼭 필요한 만큼만 묻나: 좋음 / 보통 / 나쁨', '- 문체가 자연스러운가: 좋음 / 보통 / 나쁨', '- 메모: ', '']
open(f'{D}/blind/QUESTIONS-with-source.md', 'w').write('\n'.join(out))
