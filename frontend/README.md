# StarBook Frontend (Next.js)

This frontend is prepared for Cloudflare Pages as a static Next.js app.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain/api/v1
```

3. Start dev server:

```bash
npm run dev
```

## Build for Cloudflare Pages

```bash
npm run build
```

This outputs static files to `out/` (via `output: 'export'` in Next config).

## Deploy to Cloudflare Pages

Use one of these methods.

### Method A: Cloudflare dashboard (recommended)

1. Push this frontend folder to GitHub/GitLab.
2. In Cloudflare Pages, create a new project from that repo.
3. Set build settings:
	- Framework preset: `Next.js (Static HTML Export)`
	- Build command: `npm run build`
	- Build output directory: `out`
4. Add environment variable:
	- `NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain/api/v1`
5. Deploy.

### Method B: Wrangler CLI

```bash
npm install -g wrangler
wrangler login
npm run build
wrangler pages project create starbook-frontend
wrangler pages deploy out --project-name starbook-frontend
```

## Route format note

This static deployment uses query-based IDs for dynamic pages:

- Celebrity profile: `/celebrity?id=123`
- Booking page: `/book?id=456`
