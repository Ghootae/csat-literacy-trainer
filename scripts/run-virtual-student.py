#!/usr/bin/env python3
"""가상 학생(reading-error-2026-11-18의 S-xx)을 진단 개발 서버에 실제로 풀게 한다(피드백 대화 없음).

사용(저장소 루트, 개발 서버 CSAT_DIAGNOSTIC_DEV=1 이 5174/5173에 떠 있어야 한다):
  python3 scripts/run-virtual-student.py S-58 [--cap 1.0] [--base http://localhost:5173]

답·근거는 docs/experiments/reading-error-2026-11-18/students.py·codes.json에서 읽고, build.py와 같은 규칙으로 정한다:
  - students.py의 S[학생].resp에 있는 문항은 그 (선택, 근거 또는 None).
  - 없는 문항은 정답을 고르고, 문항 순서 i가 i%3==2이면 근거 없음(None), 아니면 GOOD[문항] 근거.
  - 근거가 None이면 OMITTED(첫 응답에 근거 없음). build.py에 없는 값은 이 스크립트가 정한다: confidence=SURE, solveMs=60000, rationaleMs=20000(근거 있을 때).
진행: 새 참가자 → 4지문 모두 개발자 건너뛰기(요약) → 문항 확정(confirm) → answers-done → 판정이 끝나길 기다림 →
      지문 마무리(finish) → 결과 조회(오답 카드·읽기 습관 생성을 시작) → 끝날 때까지 기다림.
비용: 이벤트 기록(sessions/diagnostic/events.jsonl)의 토큰으로 이 참가자의 누적 비용을 추정한다(입력 $2/1M, 출력 $10/1M, run-one.mjs와 같은 가정 단가).
      --cap(기본 $1)을 넘으면 더 이상 새 요청을 보내지 않고 멈춘다(이미 나간 호출은 막을 수 없다).
"""
import argparse, json, os, sys, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXP = os.path.join(ROOT, 'docs/experiments/reading-error-2026-11-18')
sys.path.insert(0, EXP)
from students import S, ANS, QID, GOOD  # noqa: E402

PASSAGES = ['consciousness-cognition', 'horse-race-reporting', 'plastic-polymerization', 'audio-perceptual-coding']
EVENTS = os.path.join(ROOT, 'sessions/diagnostic/events.jsonl')


def call(base, method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(base + path, data=data, method=method, headers={'content-type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise SystemExit(f'{method} {path} → {e.code} {e.read().decode()[:300]}')


def spent(participant_id):
    """이 참가자 이벤트에 들어 있는 모든 호출 메타데이터(inputTokens·outputTokens)의 추정 비용."""
    total = 0.0; calls = 0
    def walk(x):
        nonlocal total, calls
        if isinstance(x, dict):
            if 'inputTokens' in x and 'outputTokens' in x:
                # 같은 호출 메타데이터가 attempts[0]에 한 번 더 들어 있으므로 안쪽은 세지 않는다.
                total += x['inputTokens'] * 2e-6 + x['outputTokens'] * 1e-5; calls += 1
                return
            for v in x.values(): walk(v)
        elif isinstance(x, list):
            for v in x: walk(v)
    if os.path.exists(EVENTS):
        with open(EVENTS, encoding='utf8') as f:
            for line in f:
                if participant_id not in line: continue
                try: e = json.loads(line)
                except ValueError: continue
                if e.get('participantId') == participant_id: walk(e)
    return total, calls


def answers_for(student):
    """build.py와 같은 규칙으로 문항별 (선택 위치, 근거 또는 None)."""
    code = json.load(open(os.path.join(EXP, 'codes.json')))[student]   # 예: S-58 → H1
    st = S[code]; order = list(ANS); result = {}
    for i, k in enumerate(order):
        if k in st['resp']:
            ch, rat, _ = st['resp'][k]
        else:
            ch = ANS[k]
            rat = None if i % 3 == 2 else GOOD[k]
        result[f"{QID[k[0]]}-q{k[1:]}"] = (ch, rat)
    return code, result


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('student'); ap.add_argument('--cap', type=float, default=1.0); ap.add_argument('--base', default='http://localhost:5173'); ap.add_argument('--resume', help='이미 답을 낸 참가자 id: 답 제출을 건너뛰고 판정 대기부터 이어 간다')
    a = ap.parse_args(); base = a.base + '/api/diagnostic/participant'
    code, plan = answers_for(a.student)
    print(f'{a.student} = {code}: {len(plan)}문항 중 근거 없음 {sum(1 for c, r in plan.values() if r is None)}개')
    pid = a.resume or call(a.base + '/api/diagnostic', 'POST', '/participant')['participantId']
    print('참가자', pid, '(이어서)' if a.resume else '')

    def guard():
        cost, n = spent(pid)
        if cost >= a.cap:
            raise SystemExit(f'비용 상한 ${a.cap:.2f} 도달(추정 ${cost:.3f}, 호출 {n}회). 새 요청을 멈춥니다. 참가자 {pid}')
        return cost

    for passage_id in ([] if a.resume else PASSAGES):
        call(base, 'POST', f'/{pid}/dev/passage/{passage_id}/skip', {'to': 'ANSWERING'})
        questions = call(base, 'GET', f'/{pid}/passage/{passage_id}/questions')['questions']
        for q in questions:
            ch, rat = plan[q['questionId']]
            choice = next(c for c in q['content']['choices'] if c['position'] == ch)
            body = {'choiceId': choice['choiceId'], 'solveMs': 60000,
                    'rationale': {'mode': 'OMITTED'} if rat is None else {'mode': 'PROVIDED', 'text': rat},
                    'rationaleMs': None if rat is None else 20000, 'confidence': 'SURE' if rat is None else None}
            call(base, 'POST', f"/{pid}/item/{q['questionId']}/confirm", body)
        call(base, 'POST', f'/{pid}/passage/{passage_id}/answers-done')
        print(f'  {passage_id}: 답 {len(questions)}문항 제출')

    # 첫 선택 판정이 모두 끝나길 기다린 뒤 지문을 마무리한다(피드백 대화 없음).
    for passage_id in PASSAGES:
        for _ in range(120):
            guard()
            card = call(base, 'GET', f'/{pid}/passage/{passage_id}/summary-card')
            if card['judging'] == 0: break
            time.sleep(5)
        else: raise SystemExit(f'{passage_id} 판정이 끝나지 않음')
        if call(base, 'GET', f'/{pid}')['passages'][PASSAGES.index(passage_id)]['status'] == 'DONE': continue
        try:
            call(base, 'POST', f'/{pid}/passage/{passage_id}/finish')
        except SystemExit as e:
            print('  finish 실패 → 개발자 건너뛰기로 마무리:', e)
            call(base, 'POST', f'/{pid}/dev/passage/{passage_id}/skip', {'to': 'DONE'})
        print(f'  {passage_id}: 판정 끝, 마무리')

    # 결과 조회가 오답 카드·읽기 습관 생성을 시작한다. 모두 끝날 때까지 기다린다.
    last = None
    for _ in range(120):
        guard()
        res = call(base, 'GET', f'/{pid}/result')
        cards = [i['card']['status'] for i in res['items']]; habit = res['readingHabit']['status']
        state = (habit, cards.count('pending'), res['position']['status'] if 'position' in res else None)
        if state != last: print('  대기:', {'habit': habit, 'cards': {s: cards.count(s) for s in set(cards)}, 'position': state[2]}); last = state
        if habit != 'pending' and 'pending' not in cards: break
        time.sleep(8)
    cost, n = spent(pid)
    print(json.dumps({'participantId': pid, 'readingHabit': habit, 'cards': {s: cards.count(s) for s in set(cards)}, 'estimatedCostUsd': round(cost, 3), 'recordedCalls': n}, ensure_ascii=False))
    print("브라우저 콘솔: localStorage.setItem('csat-diagnostic-participant', '%s'); location.reload();" % pid)


if __name__ == '__main__':
    main()
