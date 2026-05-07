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
git fetch origin
git reset --hard FETCH_HEAD

# ── Backend ──────────────────────────────────────────────────────────────────

echo "===> [2/5] Backend — install dependencies"
cd "$BACKEND_DIR"

# Guard: fail loudly if .env is missing or APP_KEY is blank
if [[ ! -f ".env" ]]; then
  echo "ERROR: $BACKEND_DIR/.env does not exist. Create it before deploying."
  exit 1
fi
if ! grep -q '^APP_KEY=base64:' .env; then
  echo "ERROR: APP_KEY is not set in .env. Run: php artisan key:generate"
  exit 1
fi

composer install --no-dev --optimize-autoloader --no-interaction

echo "===> [3/5] Backend — permissions + migrate + cache"
# New files from git pull are root-owned; fix so PHP-FPM (www-data) can read/write
chown -R www-data:www-data .
chmod -R 755 .
chmod -R 775 storage bootstrap/cache

php artisan storage:link --force
php artisan migrate --force --graceful
php artisan db:seed --class=ServiceCategorySeeder --force
php artisan config:cache
php artisan route:cache
php artisan event:cache
php artisan view:cache
php artisan queue:restart

# ── Frontend ─────────────────────────────────────────────────────────────────

echo "===> [4/5] Frontend — build"
cd "$FRONTEND_SRC"
npm ci
npm run build

# Copy static assets into standalone bundle (required for Next.js standalone output)
cp -r .next/static  .next/standalone/.next/static
cp -r public        .next/standalone/public

echo "===> [5/5] Frontend — deploy standalone + restart PM2"
mkdir -p "$FRONTEND_SERVE"

# --exclude='.env' and ecosystem.config.js so server-side config is never overwritten
rsync -a --delete \
  --exclude='.env' \
  --exclude='ecosystem.config.cjs' \
  .next/standalone/ "$FRONTEND_SERVE/"

if [[ ! -f "$FRONTEND_SERVE/.env" ]]; then
  echo "WARNING: $FRONTEND_SERVE/.env not found — create it before the app will work"
fi

# startOrRestart: starts the process if it doesn't exist yet, restarts if it does
pm2 startOrRestart "$FRONTEND_SERVE/ecosystem.config.cjs" --only celeb-frontend
pm2 save

echo ""
echo "Deploy complete!"
echo "  Backend:  $BACKEND_DIR"
echo "  Frontend: $FRONTEND_SERVE (PM2: celeb-frontend)"
