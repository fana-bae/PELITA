/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development'

const SUPABASE_HOSTNAME = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co'

const securityHeaders = [
  // ── Cegah Clickjacking (web di-embed di iframe orang lain)
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // ── Cegah MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // ── XSS Protection (browser lama)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // ── Jangan kirim Referer ke domain lain
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // ── Paksa HTTPS (1 tahun, termasuk subdomain)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // ── Matikan fitur browser yang tidak diperlukan
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // ── Content Security Policy
  // Whitelist sumber yang sah untuk script, style, gambar, font
  {
    key: 'Content-Security-Policy',
    value: [
      // Hanya dari domain sendiri (dan Supabase untuk koneksi data)
      `default-src 'self'`,
      // Script: dev butuh unsafe-eval untuk React DevTools; production strict
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      // Style: sendiri + inline + Google Fonts
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      // Font: sendiri + Google Fonts
      `font-src 'self' https://fonts.gstatic.com`,
      // Gambar: sendiri + data URI + Google (avatar) + Supabase Storage
      `img-src 'self' data: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://${SUPABASE_HOSTNAME}`,
      // Koneksi API: sendiri + Supabase
      `connect-src 'self' https://${SUPABASE_HOSTNAME} wss://${SUPABASE_HOSTNAME}`,
      // Push notifications
      `worker-src 'self'`,
      // Frame: tidak ada iframe sama sekali
      `frame-src 'none'`,
      // Object (Flash, dll): tidak ada
      `object-src 'none'`,
      // Upgrade semua HTTP ke HTTPS
      `upgrade-insecure-requests`,
    ].join('; '),
  },
]

const nextConfig = {
  // ── Security Headers untuk semua halaman
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  // ── Allowed image domains
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },

  // ── Sembunyikan informasi server Next.js dari response header
  poweredByHeader: false,
}

module.exports = nextConfig
