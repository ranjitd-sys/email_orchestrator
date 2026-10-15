#!/usr/bin/env bash
#
# deploy-prod.sh — build + deploy the email orchestrator on the production VPS.
#
# Run this on the server (not in CI) for the first "get it live" milestone:
#   1. Repo is cloned to a dir (default: /srv/email) with a .env file present.
#   2. DNS A record for event.deepecom.shop points at this host.
#   3. Docker + docker compose installed.
#
# Usage:  bash scripts/deploy-prod.sh
# Env:    APP_DIR (defaults to the repo root inferred from this script)
#
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
COMPOSE="docker compose --env-file .env -f docker-compose.prod.yml"

cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "ERROR: $APP_DIR/.env not found. Create it with production values first:"
  echo "       DATABASE_URL, BREVO_WEBHOOK_SECRET, PORT=3000"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found on PATH. Install Docker first."
  exit 1
fi

echo "==> Building orchestrator image"
$COMPOSE build orchestrator

echo "==> Running database migrations"
$COMPOSE run --rm --no-deps orchestrator bun run packages/db/src/migrate.ts

echo "==> Starting services (orchestrator + caddy)"
$COMPOSE up -d

echo "==> Waiting for orchestrator healthcheck"
status=""
for _ in $(seq 1 30); do
  status="$($COMPOSE ps --format '{{.Name}} {{.Health}}' 2>/dev/null | grep orchestrator | awk '{print $2}' || echo starting)"
  [ "$status" = "healthy" ] && break
  sleep 2
done
echo "orchestrator status: ${status:-unknown}"

echo "==> Pruning dangling images"
docker image prune -f >/dev/null 2>&1 || true

echo
echo "Done. Next:"
echo "  - Verify:   curl https://event.deepecom.shop/health"
echo "  - Webhook:  point Brevo outbound webhook at"
echo "              https://event.deepecom.shop/webhooks/brevo/<BREVO_WEBHOOK_SECRET>"
echo "  - Logs:     $COMPOSE logs -f orchestrator"
