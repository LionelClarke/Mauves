#!/usr/bin/env bash
# Run Claude Code in its own container, mauves-claude (macOS).
#
#   ./claude.sh                 start an interactive Claude session in the project
#   ./claude.sh -c              continue the last conversation
#   ./claude.sh "explain the model"   start with a first message
#   ./claude.sh --shell         open a shell in the container instead
#
# Any arguments are passed on to the claude command.
set -euo pipefail

SERVICE="claude"
cd "$(dirname "$0")"

say() { printf '%s\n' "$*"; }

# 1. Docker Desktop must be running.
if ! command -v docker >/dev/null 2>&1; then
  say "Docker isn't installed. Get Docker Desktop from https://www.docker.com/products/docker-desktop/"
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  say "Starting Docker Desktop..."
  open -a Docker || { say "Couldn't start Docker Desktop. Start it yourself and try again."; exit 1; }
  for _ in $(seq 1 60); do
    docker info >/dev/null 2>&1 && break
    sleep 2
  done
  docker info >/dev/null 2>&1 || { say "Docker Desktop didn't start within 2 minutes."; exit 1; }
fi

# 2. The image must exist (built the first time; ./build.sh rebuilds it).
if [ -z "$(docker images -q mauves-claude 2>/dev/null)" ]; then
  say "Building the Claude Code image..."
  ./build.sh
fi

# 3. Run Claude (or a shell) in the project folder, in a fresh container removed on exit.
# (docker compose run uses a terminal by default; -T turns it off when piped)
NO_TTY=""
if [ ! -t 0 ] || [ ! -t 1 ]; then NO_TTY="-T"; fi

if [ "${1:-}" = "--shell" ]; then
  # shellcheck disable=SC2086
  exec docker compose --profile claude run --rm $NO_TTY "$SERVICE" bash
fi

# shellcheck disable=SC2086
exec docker compose --profile claude run --rm $NO_TTY \
  -e TERM="${TERM:-xterm-256color}" -e COLORTERM="${COLORTERM:-truecolor}" \
  "$SERVICE" claude "$@"
