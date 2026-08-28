import { Inter, Outfit } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata = {
  title: 'Pelita — Track Habits, Tasks & Money',
  description: 'Aplikasi all-in-one untuk tracking kebiasaan baik & buruk, tugas harian, keuangan dengan aturan 60/20/10/10, dan kompetisi leaderboard.',
  keywords: 'habit tracker, task manager, money tracker, leaderboard, gamifikasi, pelita',
  authors: [{ name: 'Pelita' }],
  openGraph: {
    title: 'Pelita',
    description: 'Track habits, tasks & money. Compete with friends.',
    type: 'website',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0AC682',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
