import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Daftar path internal yang diizinkan sebagai redirect tujuan
const ALLOWED_REDIRECT_PREFIXES = [
  '/dashboard',
  '/habits',
  '/tasks',
  '/money',
  '/leaderboard',
  '/settings',
]

/**
 * Validasi bahwa `next` adalah path internal yang aman.
 * Mencegah Open Redirect ke domain eksternal.
 */
function isSafeRedirect(next) {
  if (!next) return false
  // Harus dimulai dengan '/' dan tidak mengandung '//' (protocol-relative URL)
  if (!next.startsWith('/') || next.startsWith('//')) return false
  // Tidak boleh mengandung ':' (cegah javascript: atau http://)
  if (next.includes(':')) return false
  // Harus ke salah satu route yang diizinkan
  return ALLOWED_REDIRECT_PREFIXES.some(prefix => next.startsWith(prefix))
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? ''

  // Validasi redirect tujuan — fallback ke /dashboard jika tidak aman
  const safeNext = isSafeRedirect(nextParam) ? nextParam : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  // Jangan bocorkan detail error — redirect ke login saja
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
