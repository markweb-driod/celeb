# CelebStarsHub — Deployment Guide

> **Server:** `root@kada` — frontend and backend on the **same server**
> - Backend: `/var/www/html/celeb-backend/backend`
> - Frontend: `/var/www/html/celeb-frontend`

---

## Architecture

```
Browser
  │
  └─► Nginx :443
        ├─ celebstarshub.com      ─► Next.js  (127.0.0.1:3010)
        │                                │
        │                                │ proxy /api/v1/* (server-to-server)
        │                                ▼
        └─ api.celebstarshub.com  ─► PHP-FPM / Laravel
                                       also on 127.0.0.1:8080 (internal only)
```

Next.js proxies `/api/v1/*` to `http://127.0.0.1:8080` — never leaves the server, no SSL needed internally.

---

## 1. Server requirements

| Requirement | Version |
|---|---|
| OS | Ubuntu 22.04 LTS |
| PHP | 8.2 + extensions: `pdo_mysql mbstring xml curl zip bcmath` |
| Node.js | 20 LTS |
| MySQL | 8.0+ |
| Nginx | 1.18+ |
| Composer | 2.x |
| PM2 | `npm i -g pm2` |

---

## 2. MySQL — isolated database

```sql
CREATE DATABASE celebstarshub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'celebstarshub'@'localhost' IDENTIFIED BY 'STRONG_DB_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON celebstarshub.* TO 'celebstarshub'@'localhost';
FLUSH PRIVILEGES;
```

---

## 3. Backend — Laravel

### 3a. Get code on server

The repo lives at `/var/www/html/celeb-backend` (monorepo root).
Files are already present on the server — connect the directory to GitHub:

```bash
cd /var/www/html/celeb-backend

git init
git remote add origin git@github.com:YOU/celebstarshub.git

# Add GitHub's deploy key first (see section 6), then:
git fetch origin
git reset --hard FETCH_HEAD   # safe: .env is gitignored, won't be touched
```

### 3b. Install dependencies & run first deploy

```bash
cd /var/www/html/celeb-backend/backend
composer install --no-dev --optimize-autoloader --no-interaction
```

Then create `.env` (section 3d) and run the deploy script (section 3e).

### 3c. Set permissions

```bash
chown -R www-data:www-data /var/www/html/celeb-backend/backend
chmod -R 755 /var/www/html/celeb-backend/backend
chmod -R 775 /var/www/html/celeb-backend/backend/storage
chmod -R 775 /var/www/html/celeb-backend/backend/bootstrap/cache
```

### 3d. Create .env

```bash
cp /var/www/html/celeb-backend/backend/.env.example \
   /var/www/html/celeb-backend/backend/.env

nano /var/www/html/celeb-backend/backend/.env
```

Fill in every value:

```dotenv
APP_KEY=                        # php artisan key:generate --show
APP_URL=https://api.celebstarshub.com
FRONTEND_URL=https://celebstarshub.com

DB_HOST=127.0.0.1
DB_DATABASE=celebstarshub
DB_USERNAME=celebstarshub
DB_PASSWORD=STRONG_DB_PASSWORD_HERE

STRIPE_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

PUSHER_APP_ID=...
PUSHER_APP_KEY=...
PUSHER_APP_SECRET=...
PUSHER_APP_CLUSTER=mt1

MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=noreply@celebstarshub.com
```

### 3e. Run deploy script

```bash
cd /var/www/html/celeb-backend/backend
composer run deploy
```

Runs in order:
1. `composer install --no-dev --optimize-autoloader`
2. `php artisan storage:link --force`
3. `php artisan migrate --force --graceful`
4. `php artisan db:seed --class=ServiceCategorySeeder --force`
5. `php artisan config:cache`
6. `php artisan route:cache`
7. `php artisan event:cache`
8. `php artisan view:cache`
9. `php artisan queue:restart`

### 3f. Nginx config for Laravel

Create `/etc/nginx/sites-available/celeb-api`:

```nginx
# Internal listener — used by Next.js proxy (no SSL, loopback only)
server {
    listen 127.0.0.1:8080;
    server_name api.celebstarshub.com;

    root /var/www/html/celeb-backend/backend/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300;
    }

    location ~ /\.(?!well-known).* { deny all; }
}

# Public HTTPS — for browsers
server {
    listen 80;
    server_name api.celebstarshub.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.celebstarshub.com;

    root /var/www/html/celeb-backend/backend/public;
    index index.php;

    ssl_certificate     /etc/letsencrypt/live/api.celebstarshub.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.celebstarshub.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300;
    }

    location ~ /\.(?!well-known).* { deny all; }

    client_max_body_size 50M;
    access_log /var/log/nginx/celeb-api.access.log;
    error_log  /var/log/nginx/celeb-api.error.log;
}
```

```bash
ln -s /etc/nginx/sites-available/celeb-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d api.celebstarshub.com
```

### 3g. Queue worker via PM2

> **Note:** The file must use `.cjs` extension because `backend/package.json` has `"type":"module"`.

```bash
cat > /var/www/html/celeb-backend/backend/ecosystem.queue.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'celeb-queue',
    script: 'php',
    args: 'artisan queue:work --sleep=3 --tries=3 --max-time=3600',
    cwd: '/var/www/html/celeb-backend/backend',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    env: { PHP_ENV: 'production' }
  }]
}
EOF

pm2 start /var/www/html/celeb-backend/backend/ecosystem.queue.config.cjs
pm2 save
pm2 startup   # run the printed command to persist across reboots
```

---

## 4. Frontend — Next.js

The frontend is **built on the server** by `deploy.sh`. You do not build or upload it from your local machine.

### 4a. frontend/.env.production (committed to repo)

This file is baked into the Next.js bundle at build time. `BACKEND_URL` is server-side only:

```dotenv
NEXT_PUBLIC_API_BASE_URL=/api/v1
BACKEND_URL=http://127.0.0.1:8080
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_REPLACE_ME
```

> `BACKEND_URL` must be the **internal loopback** (`127.0.0.1:8080`), not the public HTTPS URL.
> Both services are on the same server — no SSL needed for this internal hop.

### 4b. Create .env on server (one time)

This file lives in the **serve directory** (not the source), so it survives deploys:

```bash
cat > /var/www/html/celeb-frontend/.env << 'EOF'
NEXT_PUBLIC_API_BASE_URL=/api/v1
BACKEND_URL=http://127.0.0.1:8080
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_REPLACE_ME
EOF
```

### 4c. Run with PM2 (one time)

> **Note:** `.cjs` extension is required — Next.js `package.json` does not set `"type":"module"` but the ecosystem file must be CommonJS.

```bash
cat > /var/www/html/celeb-frontend/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'celeb-frontend',
    script: 'node',
    args: 'server.js',
    cwd: '/var/www/html/celeb-frontend',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    env: {
      NODE_ENV: 'production',
      PORT: 3010,
      HOSTNAME: '127.0.0.1'
    }
  }]
}
EOF

pm2 start /var/www/html/celeb-frontend/ecosystem.config.cjs
pm2 save
```

### 4f. Nginx config for Next.js

Create `/etc/nginx/sites-available/celeb-frontend`:

```nginx
server {
    listen 80;
    server_name celebstarshub.com www.celebstarshub.com;
    return 301 https://celebstarshub.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name celebstarshub.com www.celebstarshub.com;

    ssl_certificate     /etc/letsencrypt/live/celebstarshub.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/celebstarshub.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Static files served directly by Nginx
    location /_next/static/ {
        alias /var/www/html/celeb-frontend/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location /public/ {
        alias /var/www/html/celeb-frontend/public/;
        expires 7d;
        access_log off;
    }

    # Everything else to Next.js Node process
    location / {
        proxy_pass         http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    client_max_body_size 10M;
    access_log /var/log/nginx/celeb-frontend.access.log;
    error_log  /var/log/nginx/celeb-frontend.error.log;
}
```

```bash
ln -s /etc/nginx/sites-available/celeb-frontend /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d celebstarshub.com -d www.celebstarshub.com
```

---

## 5. Verify

```bash
# Laravel internal (how Next.js talks to it)
curl -s http://127.0.0.1:8080/api/v1/categories | jq .

# Laravel public
curl -s https://api.celebstarshub.com/up

# Login test
curl -s -X POST https://api.celebstarshub.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fan@demo.com","password":"password"}' | jq .access_token

# Frontend → Next.js → 127.0.0.1:8080 → Laravel
curl -s https://celebstarshub.com/api/v1/categories | jq .
```

---

## 6. Re-deploy

Everything is deployed from GitHub with a single command:

```bash
ssh root@kada "bash /var/www/html/celeb-backend/deploy.sh"
```

The script (`deploy.sh` at repo root) does:
1. `git fetch origin main && git reset --hard origin/main` — clean pull, no conflict errors
2. Guard: aborts if `backend/.env` is missing or `APP_KEY` is blank
3. `composer install --no-dev` + `chown/chmod` to fix permissions for PHP-FPM
4. `php artisan migrate`, `db:seed ServiceCategorySeeder`, `config:cache`, `route:cache`, `event:cache`, `view:cache`, `queue:restart`
5. `npm ci && npm run build` in the frontend source (`/var/www/html/celeb-backend/frontend`)
6. `rsync` standalone output → `/var/www/html/celeb-frontend` (skips `.env` and `ecosystem.config.cjs`)
7. `pm2 startOrRestart` + `pm2 save`

### GitHub SSH deploy key (one time)

```bash
# On server — generate a key
ssh-keygen -t ed25519 -C "deploy@kada" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
# Add the printed public key to: GitHub repo → Settings → Deploy keys → Add key

# Tell SSH to use it for GitHub
cat >> ~/.ssh/config << 'EOF'
Host github.com
  IdentityFile ~/.ssh/github_deploy
  StrictHostKeyChecking no
EOF
```

### Local workflow

```bash
# Make changes locally, commit and push:
git add .
git commit -m "your change"
git push

# Deploy to server:
ssh root@kada "bash /var/www/html/celeb-backend/deploy.sh"
```

---

## 7. PM2 commands

```bash
pm2 list
pm2 logs celeb-frontend
pm2 logs celeb-queue
pm2 restart celeb-frontend
pm2 restart celeb-queue
pm2 save
```

---

## 8. Laravel cron

```bash
crontab -e
```

Add:

```
* * * * * cd /var/www/html/celeb-backend/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## 9. Sharing server with other projects

- **Nginx**: one `server {}` block per project — no conflicts
- **MySQL**: one database + one user per project — no shared credentials
- **PM2**: one process per Node app on a different port (3010 for this project, 3011+ for others)
- **PHP-FPM**: shared across all PHP projects, no changes needed

---

## 10. Quick reference

### Ports

| Service | Port | Scope |
|---|---|---|
| Nginx HTTPS | 443 | Public |
| Nginx HTTP | 80 | Public (redirects to HTTPS) |
| Next.js | 3010 | Internal only |
| Laravel (proxy target) | 8080 | Internal only |
| Laravel PHP-FPM | Unix socket | Internal only |
| MySQL | 3306 | Internal only |

### Paths on server

| | Path |
|---|---|
| Laravel root | `/var/www/html/celeb-backend/backend` |
| Laravel public | `/var/www/html/celeb-backend/backend/public` |
| Laravel storage | `/var/www/html/celeb-backend/backend/storage` |
| Frontend root | `/var/www/html/celeb-frontend` |
| Frontend static | `/var/www/html/celeb-frontend/.next/static` |

### Demo accounts — staging only, do NOT seed in production

| Role | Email | Password |
|---|---|---|
| Fan | fan@demo.com | password |
| Celebrity | celebrity@demo.com | password |
| Celebrity | celebrity2@demo.com | password |
| Celebrity | celebrity3@demo.com | password |
| Celebrity | celebrity4@demo.com | password |
