#!/bin/bash
# CelebStarsHub — one-command deploy
# Usage: ssh root@kada "bash /var/www/html/celeb-backend/deploy.sh"
#
# Repo is cloned at /var/www/html/celeb-backend  (the whole monorepo)
#   backend source  → /var/www/html/celeb-backend/backend
#   frontend source → /var/www/html/celeb-backend/frontend
#   frontend serve  → /var/www/html/celeb-frontend   (standalone output)

set -euo pipefail

REPO_DIR="/var/www/html/celeb-backend"
BACKEND_DIR="$REPO_DIR/backend"
FRONTEND_SRC="$REPO_DIR/frontend"
FRONTEND_SERVE="/var/www/html/celeb-frontend"

echo "===> [1/5] Pull latest code"
cd "$REPO_DIR"
git pull

# ── Backend ──────────────────────────────────────────────────────────────────

echo "===> [2/5] Backend — install dependencies"
cd "$BACKEND_DIR"
composer install --no-dev --optimize-autoloader --no-interaction

echo "===> [3/5] Backend — migrate + cache"
php artisan migrate --force --graceful
php artisan config:cache
php artisan route:cache
php artisan event:cache
php artisan view:cache
php artisan queue:restart

# ── Frontend ─────────────────────────────────────────────────────────────────

echo "===> [4/5] Frontend — build"
cd "$FRONTEND_SRC"
npm ci --omit=dev
npm run build

# Copy static assets into standalone bundle (required for Next.js standalone output)
cp -r .next/static  .next/standalone/.next/static
cp -r public        .next/standalone/public

echo "===> [5/5] Frontend — deploy standalone + restart PM2"
rsync -a --delete .next/standalone/ "$FRONTEND_SERVE/"

# Preserve the .env file that lives in the serve directory
if [[ ! -f "$FRONTEND_SERVE/.env" ]]; then
  echo "WARNING: $FRONTEND_SERVE/.env not found — create it before the app will work"
fi

pm2 restart celeb-frontend

echo ""
echo "Deploy complete!"
echo "  Backend:  $BACKEND_DIR"
echo "  Frontend: $FRONTEND_SERVE (PM2: celeb-frontend)"
