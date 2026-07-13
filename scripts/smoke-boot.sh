#!/usr/bin/env bash
# Tier-2 smoke test: launch the built app and verify it stays up.
#   fresh   — empty user profile (#38-style startup)
#   runtime — account generated at test time (greenfield)
#   stored  — committed fixture in test/fixtures/smoke-account (brownfield)
#
# Success: process still alive after 10 seconds.
# Failure: exit code 1 or process dies before then.
#
# Set SMOKE_SKIP_BUILD=1 to skip yarn build (e.g. when test:smoke already built).
set -euo pipefail

PROFILE="${1:-fresh}"
case "$PROFILE" in
  fresh | runtime | stored) ;;
  *)
    echo "Usage: $0 [fresh|runtime|stored]"
    exit 1
    ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

USER_DATA_DIR="$(mktemp -d -t paperweight-smoke-XXXXXX)"
cleanup() {
  if [ -n "${APP_PID:-}" ] && kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi
  rm -rf "$USER_DATA_DIR"
}
trap cleanup EXIT

echo "Smoke boot ($PROFILE) with profile: $USER_DATA_DIR"

if [ "${SMOKE_SKIP_BUILD:-}" != "1" ]; then
  yarn build
fi

ELECTRON="$ROOT/node_modules/.bin/electron"
if [ ! -x "$ELECTRON" ]; then
  echo "Electron binary not found — run yarn install first"
  exit 1
fi

case "$PROFILE" in
  runtime)
    echo "Generating runtime account fixture..."
    ELECTRON_RUN_AS_NODE=1 TSX_TSCONFIG_PATH=tsconfig.node.json "$ELECTRON" --import tsx scripts/generate-smoke-fixture.ts "$USER_DATA_DIR"
    ;;
  stored)
    FIXTURE_DIR="$ROOT/test/fixtures/smoke-account"
    if [ ! -f "$FIXTURE_DIR/manifest.json" ]; then
      echo "Stored fixture missing at $FIXTURE_DIR — run: yarn fixture:regenerate"
      exit 1
    fi
    echo "Using stored fixture from $FIXTURE_DIR"
    cp -a "$FIXTURE_DIR/." "$USER_DATA_DIR/"
    ;;
esac

LAUNCH_CMD=("$ELECTRON" . "--user-data-dir=$USER_DATA_DIR" --disable-gpu --no-sandbox)

if command -v xvfb-run >/dev/null 2>&1; then
  xvfb-run -a "${LAUNCH_CMD[@]}" &
else
  "${LAUNCH_CMD[@]}" &
fi
APP_PID=$!

for _ in $(seq 1 10); do
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    set +e
    wait "$APP_PID"
    EXIT=$?
    set -e
    echo "Smoke boot FAILED ($PROFILE): process exited early with code $EXIT"
    exit 1
  fi
  sleep 1
done

echo "Smoke boot OK ($PROFILE): app survived 10s"
exit 0
