const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Allow HMR websocket connections when accessing through tunnels (e.g. Outray, ngrok, Cloudflare)
  allowedDevOrigins: ['*.outray.app', '*.ngrok-free.app', '*.ngrok.io', '*.trycloudflare.com'],
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8001/api/v1/:path*',
      },
    ]
  },
}

export default nextConfig
