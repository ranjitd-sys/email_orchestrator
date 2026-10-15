#!/usr/bin/env bash
#
# deploy-prod.sh — pull the orchestrator image from GHCR and (re)deploy on the VPS.
#
# Used both manually and by .github/workflows/deploy.yml. The image is built in CI
# and pushed to ghcr.io, so the VPS does NOT need the source, git, or a build.
#
# Prereqs on the VPS:
#   - Docker + docker compose installed
#   - Host Caddy reverse-proxying event.deepecom.shop -> 127.0.0.1:3000 (TLS there)
#   - /srv/email/docker-compose.prod.yml (shipped by CI via scp)
#   - /srv/email/.env with: DATABASE_URL, BREVO_WEBHOOK_SECRET, PORT=3000
#
# Env (supplied by CI via ssh-action `envs:` or exported manually):
#   IMAGE_TAG          image tag to pull (git sha); default "latest"
#   GHCR_USER          GitHub username (owner of the private image)
#   GHCR_PULL_TOKEN    PAT with read:packages (private image); omit if package is public
#   APP_DIR            repo/deploy dir on the VPS (default /srv/email)
#
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/email}"
COMPOSE="docker compose -f docker-compose.prod.yml"
export IMAGE_TAG="${IMAGE_TAG:-latest}"

cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "ERROR: $APP_DIR/.env not found (needs DATABASE_URL, BREVO_WEBHOOK_SECRET, PORT)"
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found on PATH. Install Docker first."
  exit 1
fi

if [ -n "${GHCR_PULL_TOKEN:-}" ]; then
  echo "==> Logging in to ghcr.io as ${GHCR_USER:?GHCR_USER required with GHCR_PULL_TOKEN}"
  echo "$GHCR_PULL_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
else
  echo "==> Skipping GHCR login (set GHCR_PULL_TOKEN if the image is private)"
fi

echo "==> Stopping any existing orchestrator (kill old before new)"
$COMPOSE down --remove-orphans || true

echo "==> Pulling image ghcr.io/ranjitd-sys/email_orchestrator:${IMAGE_TAG}"
$COMPOSE pull

echo "==> Running database migrations"
$COMPOSE run --rm --no-deps orchestrator bun run packages/db/src/migrate.ts

echo "==> Starting orchestrator"
$COMPOSE up -d --remove-orphans

echo "==> Waiting for orchestrator health"
status=""
for _ in $(seq 1 40); do
  status="$($COMPOSE ps --format '{{.Name}} {{.Health}}' 2>/dev/null | awk '/orchestrator/{print $2}')"
  [ "$status" = "healthy" ] && break
  sleep 2
done
echo "orchestrator status: ${status:-unknown}"

echo "==> Pruning dangling images"
docker image prune -f >/dev/null 2>&1 || true

echo
echo "Done. Verify:"
echo "  curl https://event.deepecom.shop/health"
echo "  $COMPOSE logs -f orchestrator"
