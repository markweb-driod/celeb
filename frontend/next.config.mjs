const nextConfig = {
  // Standalone output: self-contained build folder — ideal for Docker / VPS / Vercel
  output: 'standalone',

  images: {
    unoptimized: true,
  },

  // Allow HMR websocket when accessed through dev tunnels (Outray, ngrok, Cloudflare)
  allowedDevOrigins: ['*.outray.app', '*.ngrok-free.app', '*.ngrok.io', '*.trycloudflare.com'],

  turbopack: {
    root: process.cwd(),
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',         value: 'DENY' },
          { key: 'X-Content-Type-Options',   value: 'nosniff' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },

  async rewrites() {
    // All /api/v1/* calls from the browser are proxied server-to-server here.
    // Set BACKEND_URL in .env.production to the URL the Next.js SERVER can reach
    // the Laravel backend on (internal IP or public HTTPS — never exposed to browser).
    const backendUrl = process.env.BACKEND_URL ?? 'http://127.0.0.1:8001'
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
