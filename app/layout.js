import { Inter, Outfit } from 'next/font/google'
import ThemeProvider from '@/components/providers/ThemeProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata = {
  title: 'PELITA — Track Habits, Tasks & Money',
  description: 'Aplikasi all-in-one untuk tracking kebiasaan baik & buruk, tugas harian, keuangan dengan aturan 60/20/10/10, dan kompetisi leaderboard.',
  keywords: 'habit tracker, task manager, money tracker, leaderboard, gamifikasi, pelita',
  authors: [{ name: 'PELITA' }],
  openGraph: {
    title: 'PELITA',
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
    <html lang="id" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pelita-theme')||'light';document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
