# v5.8 대 v5.9 교정 질문 블라인드 묶음(D-0216). 진단 세트 E 5사례, sol, r1.
# 저장 출력만 쓴다(외부 전송 없음). 조건 이름은 KEY.json에만 적는다.
# 실행: 저장소 루트에서 python3 -I docs/experiments/question-rules-v59-2026-11-09/blind/build.py
import json, random

D = 'docs/experiments/question-rules-v59-2026-11-09'
OLD = 'docs/experiments/judge-model-explanation-2026-11-08/runs'
SESSION = 'sessions/diagnostic/d8743308-d746-4588-b403-954f2d7f3773.json'
CASES = [  # (사례, v5.8-sol r1 파일, v5.9-sol r1 파일)
    ('A-aud17', f'{OLD}/A-aud17__S-now__r1.json', f'{D}/runs-T1/A-aud17__v5.9-sol__r1.json'),
    ('A-horse5', f'{OLD}/A-horse5__S-now__r1.json', f'{D}/runs-T1/A-horse5__v5.9-sol__r1.json'),
    ('V1-plas10', f'{D}/runs-T1/V1-plas10__v5.8-sol__r1.json', f'{D}/runs-T1/V1-plas10__v5.9-sol__r1.json'),
    ('V2-plas10', f'{D}/runs-T1/V2-plas10__v5.8-sol__r1.json', f'{D}/runs-T1/V2-plas10__v5.9-sol__r1.json'),
    ('V3-aud16', f'{D}/runs-T1/V3-aud16__v5.8-sol__r1.json', f'{D}/runs-T1/V3-aud16__v5.9-sol__r1.json'),
]
KIND = {'A': '실제 학생 근거', 'V': '가상 근거'}
C = '①②③④⑤'
rng = random.Random(20261110)
sess = json.load(open(SESSION))['items']

out = ['# 교정 질문 비교 (블라인드)', '',
       '- 사례마다 같은 학생 근거에 대해 두 규칙이 만든 질문을 **가**·**나**로 보여 준다. 어느 쪽이 어느 규칙인지는 가렸고, 순서는 사례마다 무작위다.',
       '- 한 글자 안에 질문이 둘이면, 판정기가 오류를 두 개 찾아 질문도 둘 만든 것이다(화면에서는 하나씩 차례로 나온다).',
       '- "칠해지는 부분"은 질문과 함께 화면의 원문에 칠해지는 곳이다. 그림·표 근거는 칠해지지 않는다.',
       '- "판정기 메모"는 학생에게 보이지 않는다. "판정 이유가 납득되나"를 매길 때만 참고한다.',
       '- 매기는 법: 각 항목을 좋음 / 보통 / 나쁨 중 하나로 남기고, 마지막에 사례마다 더 나은 쪽(가·나·같음)을 적는다.', '']
key = {}

def block(cell):
    lines = []
    errs = (cell.get('rawOutput') or {}).get('errors') or []
    qs = [e for e in errs if e.get('question')]
    for i, e in enumerate(qs, 1):
        tag = f' (질문 {i}/{len(qs)})' if len(qs) > 1 else ''
        lines += [f'> {e["question"]}{tag}', '']
        for x in e.get('sourceEvidence') or []:
            if x.get('mediaId') or x.get('visualObservation'):
                lines.append('- 그림·표 근거(칠해지지 않음)')
            elif x.get('quote'):
                lines.append(f'- 칠해지는 부분: {x["quote"]}')
        lines += [f'- 판정기 메모: {e.get("description", "")}', '']
    return lines

for n, (case, f58, f59) in enumerate(CASES, 1):
    c58, c59 = json.load(open(f58)), json.load(open(f59))
    assert c58['rationaleText'] == c59['rationaleText'] and c58['choiceId'] == c59['choiceId'], case
    src = sess[c59['questionId']]['session']['source']
    out += [f'## 사례 {n}. {src["title"]} {src["questionNumber"]}번 ({KIND[case[0]]})', '', '<details><summary>지문 펼치기</summary>', '', src['passage'], '', '</details>', '']
    if src.get('scenario'):
        out += ['### <보기>', '', src['scenario'], '']
    for m in src.get('media') or []:
        out += [f'![자료]({m["url"]})', '']
    out += ['### 문항', '', src['stem'], '']
    for ch in src['choices']:
        mark = []
        if ch['choiceId'] == c59['choiceId']: mark.append('학생이 고른 선지')
        if ch['choiceId'] == src['answerChoiceId']: mark.append('정답')
        out.append(f'- {C[ch["position"]-1]} {ch["text"]}' + (f' **({", ".join(mark)})**' if mark else ''))
    out += ['', f'**학생 근거:** {c59["rationaleText"]}', '']
    pair = [('v5.8-sol r1', c58, f58), ('v5.9-sol r1', c59, f59)]
    rng.shuffle(pair)
    key[f'사례 {n}'] = {'case': case}
    for letter, (cond, cell, path) in zip('가나', pair):
        key[f'사례 {n}'][letter] = {'condition': cond, 'file': path}
        out += [f'### {letter}', ''] + block(cell)
    out += ['### 판정', '', '| 항목 | 가 | 나 |', '|---|---|---|',
            '| 무엇을 묻는지 바로 알겠나 |  |  |', '| 판정 이유가 납득되나 |  |  |',
            '| 꼭 필요한 만큼만 묻나 |  |  |', '| 문체가 자연스러운가 |  |  |', '',
            '- 더 나은 쪽(가 / 나 / 같음): ', '- 메모: ', '', '---', '']

out += ['# 부록: 막을지 판단할 질문 모양 (버전 비교 아님)', '',
        '셋 다 지금 질문 규칙을 어기지는 않는다. 학생에게 이런 질문이 나가도 되는지만 보면 된다.', '',
        '## 부록 1. 학생 말과 그 부정을 보기로 둔 질문 (도파민 13번, lab 회귀 D-A3, 다시 돌린 2회 모두)', '',
        '- 학생 근거: "①이 틀려요. 레보도파도 장벽을 못 통과하고, 입으로 먹은 도파민이 대신 뇌로 들어가서 운동을 돕는다고 생각해요."',
        '- 질문: "…레보도파는 혈액-뇌 장벽을 통과하는 거야, 못 통과하는 거야?"',
        '- 걱정: 두 갈래 중 하나를 찍어도 맞힌다(\'통과\'는 선지 말, \'못 통과\'는 학생 말이라 규칙상 허용).', '',
        '## 부록 2. 판단 기준을 일러 주는 질문 (mRNA 19번, lab T2 prob-8)', '',
        '- 학생 근거: "이온화 지질은 에탄올에 녹아 있음(에탄올 ph 7) -> 에탄올에 녹아 있으면 이온화 안 될 듯. 양전하 못 띠니까 mrna랑 결합 x"',
        '- 질문: "\\"양전하 못 띠니까\\"라고 했지. 에탄올의 pH만 보지 말고, 보기처럼 산성 용액과 혼합했을 때 이온화 지질의 전하는 어떻게 되는지 표시한 부분에서 찾아볼래?"',
        '- 걱정: "에탄올의 pH만 보지 말고"가 풀이 방향을 알려 준다.', '',
        '## 부록 3. 답 옆 낱말을 주는 질문 (경마 5번, 위 사례 2와 같은 학생 근거, 다른 회차)', '',
        '- 질문: "…표시한 부분에서 국민의 알 권리와 함께 침해 여부가 논의된 자유는 무엇이야?"',
        '- 걱정: 답("언론의 자유") 바로 옆 낱말("국민의 알 권리")을 질문에 넣어 찾기가 너무 쉽다.', '',
        '| 부록 | 막아야 한다 / 괜찮다 / 모르겠다 | 메모 |', '|---|---|---|', '| 1 |  |  |', '| 2 |  |  |', '| 3 |  |  |', '']

open(f'{D}/blind/QUESTIONS.md', 'w').write('\n'.join(out))
json.dump(key, open(f'{D}/blind/KEY.json', 'w'), ensure_ascii=False, indent=2)
print('ok', len(key))
