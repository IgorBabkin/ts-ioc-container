#!/usr/bin/env bash
# Starts, stops and restarts this repo's long-running dev processes.
# State lives in node_modules/.cache, so every checkout and worktree has its own.
set -euo pipefail

ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
STATE="$ROOT/node_modules/.cache/run-local"
ALL_TARGETS="tests types react bundler openapi-zod openapi-server"
DEFAULT_TARGETS="tests types"

usage() {
  cat <<EOF
Usage: dev.sh <start|watch|stop|restart|status|logs> [target...]

Targets: $ALL_TARGETS
start, watch and restart default to: $DEFAULT_TARGETS
stop, status and logs default to every target.
watch is start, then follows the logs; Ctrl-C leaves the targets running.
EOF
}

command_for() {
  case "$1" in
    tests) cmd=(pnpm --filter ts-ioc-container exec vitest watch) ;;
    types) cmd=(pnpm --filter ts-ioc-container run type-check:watch --preserveWatchOutput) ;;
    react) cmd=(pnpm --filter @ts-ioc-container/react exec vitest watch) ;;
    # The bundler has no nodemon of its own, so it borrows the one openapi-to-zod installs.
    bundler) cmd=(pnpm --filter @ts-ioc-container/openapi-to-zod exec nodemon --cwd ../bundler --watch lib --ext ts,hbs --exec 'pnpm run build') ;;
    openapi-zod) cmd=(pnpm --filter @ts-ioc-container/openapi-to-zod exec nodemon --watch lib --ext ts,hbs --exec 'pnpm run build') ;;
    openapi-server) cmd=(pnpm --filter @ts-ioc-container/openapi-to-server exec nodemon --watch lib --ext ts,hbs --exec 'pnpm run build') ;;
    *)
      echo "Unknown target: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
}

pid_file() { echo "$STATE/$1.pid"; }
log_file() { echo "$STATE/$1.log"; }

# Prints the process group of a running target; a stale pid file is removed.
running_pid() {
  local file pid
  file="$(pid_file "$1")"
  [ -f "$file" ] || return 1
  pid="$(cat "$file")"
  if kill -0 -- "-$pid" 2>/dev/null; then
    echo "$pid"
    return 0
  fi
  rm -f "$file"
  return 1
}

start_target() {
  local target="$1" pid
  command_for "$target"
  if pid="$(running_pid "$target")"; then
    echo "$target: already running (pid $pid)"
    return 0
  fi
  if [ ! -d "$ROOT/node_modules" ]; then
    echo "node_modules is missing: run pnpm install --frozen-lockfile first" >&2
    exit 1
  fi
  mkdir -p "$STATE"
  # Job control gives the process its own group, so stop reaches pnpm's children too.
  set -m
  (cd "$ROOT" && exec nohup "${cmd[@]}") >"$(log_file "$target")" 2>&1 </dev/null &
  pid=$!
  set +m
  echo "$pid" >"$(pid_file "$target")"
  sleep 1
  if running_pid "$target" >/dev/null; then
    echo "$target: started (pid $pid), log: $(log_file "$target")"
  else
    echo "$target: exited at once, log: $(log_file "$target")" >&2
    tail -n 20 "$(log_file "$target")" >&2
    return 1
  fi
}

stop_target() {
  local target="$1" pid i
  command_for "$target"
  if ! pid="$(running_pid "$target")"; then
    echo "$target: not running"
    return 0
  fi
  kill -TERM -- "-$pid" 2>/dev/null || true
  for i in 1 2 3 4 5 6 7 8 9 10; do
    kill -0 -- "-$pid" 2>/dev/null || break
    sleep 0.5
  done
  kill -KILL -- "-$pid" 2>/dev/null || true
  rm -f "$(pid_file "$target")"
  echo "$target: stopped"
}

status_target() {
  local target="$1" pid
  command_for "$target"
  if pid="$(running_pid "$target")"; then
    echo "$target: running (pid $pid), log: $(log_file "$target")"
  else
    echo "$target: stopped"
  fi
}

logs_target() {
  local target="$1" file
  command_for "$target"
  file="$(log_file "$target")"
  [ -f "$file" ] || return 0
  echo "== $target =="
  tail -n 40 "$file"
}

action="${1:-}"
[ $# -gt 0 ] && shift

case "$action" in
  start)
    for target in ${*:-$DEFAULT_TARGETS}; do start_target "$target"; done
    ;;
  watch)
    logs=()
    for target in ${*:-$DEFAULT_TARGETS}; do
      start_target "$target"
      logs+=("$(log_file "$target")")
    done
    exec tail -n 20 -F "${logs[@]}"
    ;;
  stop)
    for target in ${*:-$ALL_TARGETS}; do stop_target "$target"; done
    ;;
  restart)
    for target in ${*:-$DEFAULT_TARGETS}; do
      stop_target "$target"
      start_target "$target"
    done
    ;;
  status)
    for target in ${*:-$ALL_TARGETS}; do status_target "$target"; done
    ;;
  logs)
    for target in ${*:-$ALL_TARGETS}; do logs_target "$target"; done
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
