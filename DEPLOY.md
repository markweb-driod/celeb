# CelebStarsHub — Deployment Guide

> **Server:** `root@kada` — both frontend and backend on the **same server**.  
> Backend path: `/var/www/html/celeb-backend/backend`  
> Frontend path: `/var/www/html/celeb-frontend`

---

## Architecture overview

```
Browser
  │
  ▼
Nginx (port 443) on kada
  ├── celebstarshub.com      →  Next.js (127.0.0.1:3010)
  └── api.celebstarshub.com  →  PHP-FPM  (/var/www/html/celeb-backend/backend/public)
                                          also listens on 127.0.0.1:8080 (internal only)
                                                    ▲
                                          Next.js proxies /api/v1/* here
                                          (no SSL overhead — loopback only)
```

Next.js proxies `/api/v1/*` to `http://127.0.0.1:8080` internally — never leaves the server.  
Browsers only ever talk to Nginx on port 443.

---

## 1. Server requirements

| Requirement | Minimum |
|---|---|
| OS | Ubuntu 22.04 LTS |
| PHP | 8.2 with `pdo_mysql mbstring xml curl zip bcmath` |
| Node.js | 20 LTS |
| MySQL | 8.0+ |
| Nginx | 1.18+ |
| Composer | 2.x |
| PM2 | `npm i -g pm2` |

---

## 2. MySQL — create an isolated database

```sql
-- Run as root in MySQL
CREATE DATABASE celebstarshub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'celebstarshub'@'localhost' IDENTIFIED BY 'STRONG_DB_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON celebstarshub.* TO 'celebstarshub'@'localhost';
FLUSH PRIVILEGES;
```

---

## 3. Deploy the Laravel backend

### 3a. Upload files

```bash
# From your local machine:
rsync -avz --exclude='vendor' --exclude='.env' \
  ./backend/ root@kada:/var/www/html/celeb-backend/backend/
```

### 3b. Install dependencies and set permissions

```bash
cd /var/www/html/celeb-backend/backend

composer install --no-dev --optimize-autoloader --no-interaction

chown -R www-data:www-data /var/www/html/celeb-backend/backend
chmod -R 755 /var/www/html/celeb-backend/backend
chmod -R 775 /var/www/html/celeb-backend/backend/storage
chmod -R 775 /var/www/html/celeb-backend/backend/bootstrap/cache
```

### 3c. Create and fill in .env

```bash
cp .env.example .env
nano .env
```

Fill in every value:

```dotenv
APP_KEY=                        # run: php artisan key:generate --show
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

### 3d. Run the deploy script

```bash
cd /var/www/html/celeb-backend/backend
composer run deploy
```

This runs in order:
1. `composer install --no-dev --optimize-autoloader`
2. `php artisan storage:link --force`
3. `php artisan migrate --force --graceful`
4. `php artisan db:seed --class=ServiceCategorySeeder --force`
5. `php artisan config:cache`
6. `php artisan route:cache`
7. `php artisan event:cache`
8. `php artisan view:cache`
9. `php artisan queue:restart`

### 3e. Nginx config for Laravel

Create `/etc/nginx/sites-available/celeb-api`:

```nginx
# Internal-only HTTP listener — used by Next.js to proxy /api/v1/* without SSL overhead
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

# Public HTTPS — for browsers and external tools
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

### 3f. Queue worker via PM2

```bash
cat > /var/www/html/celeb-backend/backend/ecosystem.queue.config.js << 'EOF'
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

pm2 start /var/www/html/celeb-backend/backend/ecosystem.queue.config.js
pm2 save
pm2 startup   # run the printed command to survive reboots
```

---

## 4. Deploy the Next.js frontend

### 4a. Build locally (on your dev machine)

Edit `frontend/.env.production` first:

```dotenv
NEXT_PUBLIC_API_BASE_URL=/api/v1
BACKEND_URL=http://127.0.0.1:8080
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_REPLACE_ME
```

Then build:

```bash
cd frontend
npm ci
npm run build
cp -r .next/static  .next/standalone/.next/static
cp -r public        .next/standalone/public
```

### 4b. Upload to server

```bash
rsync -avz --delete ./frontend/.next/standalone/ root@kada:/var/www/html/celeb-frontend/
```

### 4c. Create .env on the server

```bash
cat > /var/www/html/celeb-frontend/.env << 'EOF'
NEXT_PUBLIC_API_BASE_URL=/api/v1
BACKEND_URL=http://127.0.0.1:8080
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_REPLACE_ME
EOF
```

> `BACKEND_URL=http://127.0.0.1:8080` — Next.js proxies API calls to Laravel over loopback. Never leaves the server, no SSL needed.

### 4d. Run frontend with PM2

```bash
cat > /var/www/html/celeb-frontend/ecosystem.config.js << 'EOF'
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

pm2 start /var/www/html/celeb-frontend/ecosystem.config.js
pm2 save
```

### 4e. Nginx config for Next.js

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

    # Static assets served directly by Nginx
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

    # Everything else to Next.js
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

## 5. Verify everything works

```bash
# Backend internal check (as Next.js would call it)
curl -s http://127.0.0.1:8080/api/v1/categories | jq .

# Backend public HTTPS
curl -s https://api.celebstarshub.com/up

# Test login
curl -s -X POST https://api.celebstarshub.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fan@demo.com","password":"password"}' | jq .access_token

# Frontend (proxies through Next.js → 127.0.0.1:8080 → Laravel)
curl -s https://celebstarshub.com/api/v1/categories | jq .
```

---

## 6. Re-deploying after code changes

### Backend update

```bash
cd /var/www/html/celeb-backend/backend
git pull
composer run deploy
```

### Frontend update

```bash
# Local machine:
cd frontend
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public       .next/standalone/public
rsync -avz --delete .next/standalone/ root@kada:/var/www/html/celeb-frontend/

# Server:
pm2 restart celeb-frontend
```

---

## 7. PM2 cheatsheet

```bash
pm2 list                        # all running processes
pm2 logs celeb-frontend         # tail frontend logs
pm2 logs celeb-queue            # tail queue worker logs
pm2 restart celeb-frontend
pm2 restart celeb-queue
pm2 save                        # persist list across reboots
```

---

## 8. Cron — Laravel scheduler

```bash
crontab -e
```

Add:

```cron
* * * * * cd /var/www/html/celeb-backend/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## 9. Co-existing with other projects

- **Nginx**: each project has its own `server {}` block — no conflicts.
- **MySQL**: each project has its own database and user — no shared credentials.
- **PM2**: run projects on different ports (3010 for CelebStarsHub, 3011+ for others).
- **PHP-FPM**: shared across all PHP projects — no extra config needed.

---

## 10. Quick reference

### Ports

| Service | Port | Scope |
|---|---|---|
| Nginx HTTPS | 443 | Public |
| Nginx HTTP (redirect) | 80 | Public |
| Next.js Node | 3010 | Internal (127.0.0.1) |
| Laravel (internal proxy) | 8080 | Internal (127.0.0.1) |
| Laravel PHP-FPM | Unix socket | Internal |
| MySQL | 3306 | Internal |

### Paths

| Component | Path |
|---|---|
| Laravel root | `/var/www/html/celeb-backend/backend` |
| Laravel public | `/var/www/html/celeb-backend/backend/public` |
| Laravel storage | `/var/www/html/celeb-backend/backend/storage` |
| Next.js root | `/var/www/html/celeb-frontend` |
| Next.js static | `/var/www/html/celeb-frontend/.next/static` |

### Demo accounts (staging only — do NOT seed in production)

| Role | Email | Password |
|---|---|---|
| Fan | `fan@demo.com` | `password` |
| Celebrity | `celebrity@demo.com` | `password` |
| Celebrity | `celebrity2@demo.com` | `password` |
| Celebrity | `celebrity3@demo.com` | `password` |
| Celebrity | `celebrity4@demo.com` | `password` |