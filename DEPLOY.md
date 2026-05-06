# CelebStarsHub — Deployment Guide

## Architecture overview

```
Browser
  │
  ▼
[Nginx — celebstarshub.com]          port 443 (HTTPS)
  ├── /api/v1/*  → PHP-FPM (Laravel) via /var/www/html/celeb-backend/backend/public
  └── /*         → Next.js (Node)    via http://127.0.0.1:3010
```

Both apps live on **one VPS** behind **one Nginx** server.  
Other projects on the same server are not affected — each gets its own `server {}` block.  
The Next.js app runs as a persistent process managed by **PM2**.  
The Laravel app is served by **PHP-FPM** (same as your other PHP projects).  
The queue worker also runs under PM2.

---

## 1. Server requirements

| Requirement | Minimum |
|---|---|
| OS | Ubuntu 22.04 LTS |
| PHP | 8.2+ with extensions: `pdo_mysql mbstring xml curl zip bcmath` |
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
CREATE USER 'celeb_user'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON celebstarshub.* TO 'celeb_user'@'localhost';
FLUSH PRIVILEGES;
```

> This database is isolated from your other projects.

---

## 3. Deploy the Laravel backend

### 3a. Upload and install

```bash
# Upload to server (choose one method)
git clone https://github.com/YOUR_ORG/celeb-backend.git /var/www/html/celeb-backend/backend
# OR  rsync -avz ./backend/ user@server:/var/www/html/celeb-backend/backend/

cd /var/www/html/celeb-backend/backend

# Install PHP dependencies (no dev packages in production)
composer install --no-dev --optimize-autoloader --no-interaction

# Set permissions (adjust www-data to your FPM user)
chown -R www-data:www-data /var/www/html/celeb-backend/backend
chmod -R 755 /var/www/html/celeb-backend/backend
chmod -R 775 /var/www/html/celeb-backend/backend/storage
chmod -R 775 /var/www/html/celeb-backend/backend/bootstrap/cache
```

### 3b. Create and fill in .env

```bash
cp .env.example .env
nano .env   # fill in ALL the values below
```

**Required values to fill in:**

```dotenv
APP_KEY=                    # generate with:  php artisan key:generate --show
APP_URL=https://api.celebstarshub.com
FRONTEND_URL=https://celebstarshub.com

DB_HOST=127.0.0.1
DB_DATABASE=celebstarshub
DB_USERNAME=celeb_user
DB_PASSWORD=STRONG_PASSWORD_HERE

STRIPE_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

PUSHER_APP_ID=...
PUSHER_APP_KEY=...
PUSHER_APP_SECRET=...
PUSHER_APP_CLUSTER=mt1

MAIL_HOST=...
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=noreply@celebstarshub.com
```

### 3c. Run the deploy script

```bash
# This runs: composer install, storage:link, migrate, seed categories,
# config/route/event/view cache, queue:restart
composer run deploy
```

### 3d. Nginx config for the Laravel backend

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

    # SSL — use Certbot / Let's Encrypt
    ssl_certificate     /etc/letsencrypt/live/api.celebstarshub.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.celebstarshub.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;  # adjust PHP version if needed
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

# Issue SSL certificate
certbot --nginx -d api.celebstarshub.com
```

### 3e. Queue worker via PM2

```bash
# Create PM2 process file
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
pm2 startup   # follow the printed command to make PM2 survive reboots
```

---

## 4. Deploy the Next.js frontend

### 4a. Build the frontend (on your local machine or a CI server)

```bash
cd frontend

# Fill in .env.production with real values first:
#   BACKEND_URL=https://api.celebstarshub.com  (or internal IP if same server)
#   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

npm ci
npm run build
# Output is in .next/standalone/
```

### 4b. Assemble the standalone bundle

The Next.js standalone build does **not** include static assets — you must copy them manually:

```bash
# After npm run build, from the frontend/ directory:
cp -r .next/static     .next/standalone/.next/static
cp -r public           .next/standalone/public
```

### 4c. Upload to server

```bash
rsync -avz --delete ./frontend/.next/standalone/ user@server:/var/www/html/celeb-frontend/
```

### 4d. Create .env on the server

```bash
# On the server
cat > /var/www/html/celeb-frontend/.env << 'EOF'
NEXT_PUBLIC_API_BASE_URL=/api/v1
BACKEND_URL=http://127.0.0.1:8000    # internal, if both on same server
                                      # or https://api.celebstarshub.com if separate
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_REPLACE_ME
EOF
```

> `BACKEND_URL` is **never sent to the browser** — it's used by the Next.js server process only to proxy `/api/v1/*` calls server-to-server to Laravel.

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

> Port **3010** is used here — change it to any free port. Using a non-standard port (not 3000) avoids conflicts with other Node projects on the server.

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

    # Next.js static assets — serve directly from Nginx (no Node hit needed)
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

    # Everything else — proxy to Next.js Node process
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
# Backend health
curl https://api.celebstarshub.com/up
# → {"status":"ok"} or HTTP 200

# Test login
curl -s -X POST https://api.celebstarshub.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fan@demo.com","password":"password"}' | jq .access_token

# Frontend proxying backend correctly
curl -s https://celebstarshub.com/api/v1/categories | jq .
```

---

## 6. Re-deploying after code changes

### Backend update

```bash
cd /var/www/html/celeb-backend/backend
git pull
composer run deploy   # migrate + recache + queue:restart
```

### Frontend update (rebuild locally, push to server)

```bash
# Local machine:
cd frontend
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public       .next/standalone/public
rsync -avz --delete .next/standalone/ user@server:/var/www/html/celeb-frontend/

# Server:
pm2 restart celeb-frontend
```

---

## 7. PM2 cheatsheet

```bash
pm2 list                    # see all running processes
pm2 logs celeb-frontend     # tail frontend logs
pm2 logs celeb-queue        # tail queue worker logs
pm2 restart celeb-frontend  # restart without downtime
pm2 restart celeb-queue
pm2 stop all                # stop everything
```

---

## 8. Cron — Laravel scheduler

Add one line to the server's crontab (`crontab -e` as the `www-data` user or root):

```cron
* * * * * cd /var/www/html/celeb-backend/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## 9. Co-existing with other projects

- Each project gets its own `server {}` block in `/etc/nginx/sites-available/` — they do not interfere.
- Each project has its own MySQL database and user — no shared credentials.
- PM2 runs all Node processes side-by-side. Use different ports per project (e.g. 3010 for CelebStarsHub, 3011 for your next project).
- PHP-FPM is shared across all PHP projects — no extra config needed, Nginx just points each project to the same FPM socket.

---

## 10. Quick reference — ports used by CelebStarsHub

| Service | Port | Scope |
|---|---|---|
| Nginx HTTPS | 443 | Public |
| Nginx HTTP (redirect) | 80 | Public |
| Next.js Node process | 3010 | Internal (127.0.0.1 only) |
| Laravel PHP-FPM | Unix socket | Internal |
| MySQL | 3306 | Internal |
