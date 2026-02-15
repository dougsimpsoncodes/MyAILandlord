#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

PORT="${E2E_PORT:-8081}"
BASE_URL="${E2E_BASE_URL:-http://localhost:${PORT}}"
STATE_DIR="${E2E_SERVER_STATE_DIR:-.tmp}"
PID_FILE="${STATE_DIR}/myailandlord-web-${PORT}.pid"
SERVER_LOG="${E2E_SERVER_LOG:-/tmp/myailandlord-playwright-web-${PORT}.log}"
EXPO_CI="${E2E_EXPO_CI:-0}"

info() { printf "[info] %s\n" "$*"; }
warn() { printf "[warn] %s\n" "$*"; }
fail() { printf "[fail] %s\n" "$*"; }

is_local_base_url() {
  case "$BASE_URL" in
    http://localhost:*|http://127.0.0.1:*|http://[::1]:*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

listener_pid() {
  lsof -nP -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
}

is_running_pid() {
  local pid="$1"
  [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1
}

wait_for_server() {
  local max_tries="${1:-90}"
  local i
  for ((i=1; i<=max_tries; i++)); do
    if curl -fsS --max-time 3 "$BASE_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}


spawn_detached_expo() {
  local ci_mode="$1"

  PORT="$PORT" SERVER_LOG="$SERVER_LOG" EXPO_CI="$ci_mode" node <<'NODE'
const { spawn } = require('child_process');
const fs = require('fs');

const port = process.env.PORT;
const logPath = process.env.SERVER_LOG;
const expoCi = process.env.EXPO_CI === '1';

const outFd = fs.openSync(logPath, 'a');
const env = { ...process.env };

if (expoCi) {
  env.CI = '1';
} else {
  delete env.CI;
}

const child = spawn('npx', ['expo', 'start', '--web', '--port', port], {
  detached: true,
  stdio: ['ignore', outFd, outFd],
  env,
});

child.unref();
console.log(child.pid);
NODE
}

start_server() {
  if ! is_local_base_url; then
    info "Using external base URL: $BASE_URL"
    if ! wait_for_server 30; then
      fail "External base URL is not healthy: $BASE_URL"
      exit 1
    fi
    info "External base URL is healthy: $BASE_URL"
    return 0
  fi

  mkdir -p "$STATE_DIR"

  local pid=""
  local started_by_script="0"
  if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE" 2>/dev/null || true)
  fi

  if is_running_pid "$pid"; then
    info "Managed web server already running (pid $pid)"
  else
    local port_pid
    port_pid=$(listener_pid)
    if [ -n "$port_pid" ]; then
      info "Web server already listening on $BASE_URL (pid $port_pid)"
      warn "Existing listener is unmanaged; stop it manually when needed."
    else
      info "Starting Expo web server on port $PORT"
      pid=$(spawn_detached_expo "$EXPO_CI")
      started_by_script="1"
      info "Started web server bootstrap pid $pid (log: $SERVER_LOG, E2E_EXPO_CI=$EXPO_CI)"
    fi
  fi

  if ! wait_for_server 90; then
    fail "Web server did not become healthy at $BASE_URL"
    if [ -f "$SERVER_LOG" ]; then
      warn "Tail of server log ($SERVER_LOG):"
      tail -n 80 "$SERVER_LOG" || true
    fi
    exit 1
  fi

  if [ "$started_by_script" = "1" ]; then
    local running_pid
    running_pid=$(listener_pid)
    if [ -n "$running_pid" ]; then
      echo "$running_pid" >"$PID_FILE"
      info "Managed web server pid: $running_pid"
    fi
  fi

  info "Server is healthy: $BASE_URL"
}

stop_server() {
  if ! is_local_base_url; then
    warn "Refusing to stop external base URL: $BASE_URL"
    return 0
  fi

  local pid=""
  if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE" 2>/dev/null || true)
  fi

  if is_running_pid "$pid"; then
    info "Stopping managed web server pid $pid"
    kill "$pid" >/dev/null 2>&1 || true
    sleep 1
    if is_running_pid "$pid"; then
      warn "PID $pid still running after SIGTERM; sending SIGKILL"
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
  else
    info "No running managed PID found in $PID_FILE"
  fi

  rm -f "$PID_FILE"

  local port_pid
  port_pid=$(listener_pid)
  if [ -n "$port_pid" ]; then
    warn "Port $PORT is still in use by pid $port_pid (not stopped automatically)."
    warn "If this is stale, stop it manually with: kill $port_pid"
  else
    info "Port $PORT is free."
  fi
}

status_server() {
  local pid=""
  if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE" 2>/dev/null || true)
  fi

  local port_pid
  port_pid=$(listener_pid)

  if [ -n "$port_pid" ]; then
    info "Listening on $BASE_URL (pid $port_pid)"
    if curl -fsS --max-time 3 "$BASE_URL" >/dev/null 2>&1; then
      info "Health check OK"
    else
      warn "Health check FAILED"
    fi
  else
    info "No process listening on $BASE_URL"
  fi

  if [ -n "$pid" ]; then
    if is_running_pid "$pid"; then
      info "Managed PID file: $PID_FILE (pid $pid)"
    else
      warn "Stale managed PID file: $PID_FILE (pid $pid is not running)"
    fi
  fi

  if [ -f "$SERVER_LOG" ]; then
    info "Server log: $SERVER_LOG"
  fi
}

print_logs() {
  if [ ! -f "$SERVER_LOG" ]; then
    fail "No server log found at $SERVER_LOG"
    exit 1
  fi
  local lines="${E2E_SERVER_LOG_LINES:-120}"
  tail -n "$lines" "$SERVER_LOG"
}

usage() {
  cat <<EOF
Usage: ./scripts/e2e-web-server.sh <start|stop|restart|status|logs>

Environment:
  E2E_PORT              Web port (default: 8081)
  E2E_BASE_URL          Base URL (default: http://localhost:\$E2E_PORT)
  E2E_SERVER_STATE_DIR  PID state dir (default: .tmp)
  E2E_SERVER_LOG        Log path (default: /tmp/myailandlord-playwright-web-\$E2E_PORT.log)
  E2E_EXPO_CI            Set to 1 to force CI mode (default: 0 for persistent server)
EOF
}

cmd="${1:-status}"

case "$cmd" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    stop_server
    start_server
    ;;
  status)
    status_server
    ;;
  logs)
    print_logs
    ;;
  *)
    usage
    exit 1
    ;;
esac
