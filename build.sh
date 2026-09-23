#!/usr/bin/env bash
# Build the Claude Code image (mauves-claude).
#
#   ./build.sh              build it (uses the Docker cache)
#   ./build.sh --no-cache   rebuild from scratch, e.g. to get the latest Claude Code
#
# Any arguments are passed on to "docker compose build".
set -euo pipefail
cd "$(dirname "$0")"
exec docker compose --profile claude build "$@" claude
