#!/bin/zsh
# 교사 시연용 서버·터널·잠자기 방지를 한 번에 켜고 끈다 (ops-guide.md 0~1절).
# 사용: demo.sh start | stop | status
DEMO=/Users/mac/Projects/csat-literacy-teacher-demo
RUN=$DEMO/.omc/run
PUBLIC_URL=https://dialogue.cogaxis.net/dialogue/lab
mkdir -p $RUN

listening() { lsof -nP -iTCP:$1 -sTCP:LISTEN -t 2>/dev/null | head -1; }
tunnel_pid() { pgrep -f "cloudflared tunnel --url http://127.0.0.1:5273 run csat-dialogue" | head -1; }

start_bg() { # 포트 이름 명령…
  local port=$1 name=$2; shift 2
  if [[ -n $(listening $port) ]]; then echo "  $name($port): 이미 켜져 있음"; return; fi
  (cd $DEMO && nohup env "$@" > $RUN/$name.log 2>&1 &)
  echo "  $name($port): 켜는 중"
}

status() {
  for pair in 5274:문단API 5275:문제API 5273:화면; do
    local port=${pair%%:*} name=${pair#*:}
    [[ -n $(listening $port) ]] && echo "  $name($port): 켜짐" || echo "  $name($port): 꺼짐"
  done
  [[ -n $(tunnel_pid) ]] && echo "  터널: 켜짐" || echo "  터널: 꺼짐"
  [[ -f $RUN/caffeinate.pid ]] && kill -0 $(cat $RUN/caffeinate.pid) 2>/dev/null && echo "  잠자기 방지: 켜짐" || echo "  잠자기 방지: 꺼짐"
}

case $1 in
  start)
    echo "시연용 서버"
    start_bg 5274 문단API CSAT_DEVELOPER_MODE=1 CSAT_PROBLEM_LAB_PUBLIC=1 PORT=5274 node --env-file=.env packages/app/dist/server/index.js
    start_bg 5275 문제API CSAT_DEVELOPER_MODE=1 CSAT_PROBLEM_LAB_PUBLIC=1 CSAT_PROBLEM_LAB_API_PORT=5275 node --env-file=.env packages/app/dist/server/problem-feedback-entry.js
    start_bg 5273 화면 CSAT_API_PORT=5274 CSAT_PROBLEM_LAB_API_PORT=5275 npx vite --config packages/app/vite.config.ts --port 5273 --strictPort
    sleep 6
    if [[ $(curl -s -o /dev/null -w '%{http_code}' -H 'Host: dialogue.cogaxis.net' -H 'content-type: application/json' \
          -X POST -d '{}' http://127.0.0.1:5273/api/developer/dialogue-simple/session) == 400 ]]; then
      echo "  로컬 점검: 통과"
    else
      echo "  로컬 점검: 실패 — $RUN 의 로그를 확인하세요"; exit 1
    fi
    echo "터널"
    if [[ -n $(tunnel_pid) ]]; then echo "  이미 켜져 있음"
    else nohup cloudflared tunnel --url http://127.0.0.1:5273 run csat-dialogue > $RUN/tunnel.log 2>&1 &; echo "  켜는 중"; fi
    echo "잠자기 방지"
    if [[ -f $RUN/caffeinate.pid ]] && kill -0 $(cat $RUN/caffeinate.pid) 2>/dev/null; then echo "  이미 켜져 있음"
    else nohup caffeinate -dis > /dev/null 2>&1 & echo $! > $RUN/caffeinate.pid; echo "  켜짐 (전원 어댑터를 연결해 두세요)"; fi
    sleep 8
    echo "공개 주소 점검"
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 $PUBLIC_URL)
    [[ $code == 200 ]] && echo "  $PUBLIC_URL → 200 (준비 완료. 휴대폰 데이터로도 한 번 열어 보세요)" \
                       || echo "  $PUBLIC_URL → $code (터널 연결을 기다리는 중일 수 있어요. 잠시 뒤 'demo.sh status'와 브라우저로 다시 확인)"
    ;;
  stop)
    echo "터널·잠자기 방지·시연용 서버를 끕니다"
    [[ -n $(tunnel_pid) ]] && kill $(tunnel_pid) && echo "  터널: 끔"
    [[ -f $RUN/caffeinate.pid ]] && kill $(cat $RUN/caffeinate.pid) 2>/dev/null && rm -f $RUN/caffeinate.pid && echo "  잠자기 방지: 끔"
    for port in 5273 5274 5275; do pid=$(listening $port); [[ -n $pid ]] && kill $pid && echo "  $port: 끔"; done
    ;;
  status) status ;;
  *) echo "사용: $0 start | stop | status"; exit 1 ;;
esac
