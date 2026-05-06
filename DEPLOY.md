# CelebStarsHub — Deployment Guide

> **Server structure confirmed:** `root@kada:/var/www/html/celeb-backend/backend`  
> Backend lives at `/var/www/html/celeb-backend/backend/`  
> Frontend lives at `/var/www/html/celeb-frontend/`

---

## Architecture overview

```
Browser
  │
  ▼
Nginx (port 443)
  ├── celebstarshub.com      →  Next.js Node process  (127.0.0.1:3010)
  └── api.celebstarshub.com  →  PHP-FPM / Laravel     (/var/www/html/celeb-backend/backend/public)
```

Both apps run on **one server** behind Nginx.  
Other projects are not affected — each has its own `server {}` block and database.  
Next.js runs as a PM2-managed Node process.  
Laravel is served by PHP-FPM (shared with your other PHP projects).  
The queue worker also runs under PM2.

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

> This database is isolated from your other projects.

---

## 3. Deploy the Laravel backend

### 3a. Upload files to the server

```bash
# Option A — rsync from local machine
rsync -avz --exclude='vendor' --exclude='.env' \
  ./backend/ root@kada:/var/www/html/celeb-backend/backend/

# Option B — git clone on the server
git clone https://github.com/YOUR_ORG/celebstarshub.git /var/www/html/celeb-backend
# Backend code is inside the backend/ subfolder
```

### 3b. Create and fill in .env

```bash
cd /var/www/html/celeb-backend/backend
cp .env.example .env
nano .env
```

Fill in every `REPLACE_ME` value:

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

### 3c. Run the deploy script

```bash
cd /var/www/html/celeb-backend/backend
composer run deploy
```

This single command runs (in order):
1. `composer install --no-dev --optimize-autoloader`
2. `php artisan storage:link --force`
3. `php artisan migrate --force --graceful`
4. `php artisan db:seed --class=ServiceCategorySeeder --force`
5. `php artisan config:cache`
6. `php artisan route:cache`
7. `php artisan event:cache`
8. `php artisan view:cache`
9. `php artisan queue:restart`

### 3d. Set file permissions

```bash
chown -R www-data:www-data /var/www/html/celeb-backend/backend
chmod -R 755 /var/www/html/celeb-backend/backend
chmod -R 775 /var/www/html/celeb-backend/backend/storage
chmod -R 775 /var/www/html/celeb-backend/backend/bootstrap/cache
```

### 3e. Nginx config for the Laravel backend

Create `/etc/nginx/sites-available/celeb-api`:

```nginx
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

    location ~ /\.(?!well-known).* {
        deny all;
    }

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

```bash
cd frontend

# Edit .env.production first — set real values:
#   BACKEND_URL=https://api.celebstarshub.com
#   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

npm ci
npm run build
```

### 4b. Assemble the standalone bundle

Next.js standalone does **not** bundle static files — copy them in:

```bash
# From the frontend/ directory:
cp -r .next/static  .next/standalone/.next/static
cp -r public        .next/standalone/public
```

### 4c. Upload to server

```bash
rsync -avz --delete ./frontend/.next/standalone/ root@kada:/var/www/html/celeb-frontend/
```

### 4d. Create .env on the server

```bash
cat > /var/www/html/celeb-frontend/.env << 'EOF'
NEXT_PUBLIC_API_BASE_URL=/api/v1
BACKEND_URL=https://api.celebstarshub.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_REPLACE_ME
EOF
```

> `BACKEND_URL` is server-side only — never exposed to the browser. The Next.js process uses it to proxy `/api/v1/*` requests to Laravel.

### 4e. Run frontend with PM2

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

> Using port **3010** avoids clashing with other Node projects on the server. Change it if 3010 is already taken.

### 4f. Nginx config for the Next.js frontend

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

    # Serve Next.js static assets directly — no Node process hit needed
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

    # Everything else goes to the Next.js Node process
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
# Backend health check
curl -s https://api.celebstarshub.com/up

# Test login endpoint
curl -s -X POST https://api.celebstarshub.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fan@demo.com","password":"password"}' | jq .access_token

# Frontend → backend proxy
curl -s https://celebstarshub.com/api/v1/categories | jq .
```

---

## 6. Re-deploying after code changes

### Backend update

```bash
cd /var/www/html/celeb-backend/backend
git pull
composer run deploy   # install, migrate, recache, queue:restart — all in one
```

### Frontend update

```bash
# On your local machine:
cd frontend
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public       .next/standalone/public
rsync -avz --delete .next/standalone/ root@kada:/var/www/html/celeb-frontend/

# On the server:
pm2 restart celeb-frontend
```

---

## 7. PM2 cheatsheet

```bash
pm2 list                        # all running processes
pm2 logs celeb-frontend         # tail frontend logs
pm2 logs celeb-queue            # tail queue worker logs
pm2 restart celeb-frontend      # zero-downtime restart
pm2 restart celeb-queue
pm2 stop all                    # stop everything
pm2 save                        # persist process list across reboots
```

---

## 8. Cron — Laravel scheduler

```bash
crontab -e   # as www-data user
```

Add:

```cron
* * * * * cd /var/www/html/celeb-backend/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## 9. Co-existing with other projects

- **Nginx**: each project has its own `server {}` block → no conflicts.
- **MySQL**: each project has its own database + user → no shared credentials.
- **PM2**: all Node processes run side-by-side; use different ports (e.g. 3010 for CelebStarsHub, 3011 for the next project).
- **PHP-FPM**: shared across all PHP projects — no extra pool config needed.

---

## 10. Quick reference

### Ports used by CelebStarsHub

| Service | Port | Scope |
|---|---|---|
| Nginx HTTPS | 443 | Public |
| Nginx HTTP (redirect) | 80 | Public |
| Next.js Node process | 3010 | Internal only |
| Laravel PHP-FPM | Unix socket | Internal only |
| MySQL | 3306 | Internal only |

### Server paths

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
