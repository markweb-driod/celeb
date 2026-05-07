import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CelebStarsHub | Celebrity Experiences',
  description: 'Book personalized celebrity experiences, premium fan moments, and unforgettable events.',
  themeColor: '#0d9488',
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  )
}
