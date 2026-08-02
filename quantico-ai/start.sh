#!/usr/bin/env bash
# Quantico-AI Agency — startup script
# Loads secrets from /home/workspace/.secrets/env if present, then starts the gateway

set -euo pipefail

SECRETS_FILE="/home/workspace/.secrets/env"

if [ -f "$SECRETS_FILE" ]; then
  echo "[boot] Loading secrets from $SECRETS_FILE"
  set -a
  source "$SECRETS_FILE"
  set +a
else
  echo "[boot] WARNING: $SECRETS_FILE not found — gateway auth will be disabled"
fi

export GATEWAY_PORT="${GATEWAY_PORT:-3199}"
export ZO_WORKSPACE_URL="${ZO_WORKSPACE_URL:-https://noncryptical-plentiful-porter.ngrok-free.dev}"

echo "[boot] Starting Quantico-AI Agency on port $GATEWAY_PORT"
exec bun run src/index.ts
