import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Routes yang butuh autentikasi
const PROTECTED_ROUTES = ['/dashboard', '/habits', '/tasks', '/money', '/leaderboard', '/settings']

// Routes yang hanya boleh diakses saat BELUM login
const AUTH_ROUTES = ['/login', '/register']

export async function proxy(request) {
  const { pathname } = request.nextUrl

  let supabaseResponse = NextResponse.next({ request })

  // Buat Supabase client dengan akses ke cookie request/response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // PENTING: Gunakan getUser() bukan getSession()
  // getUser() memverifikasi JWT ke Supabase Auth server → tidak bisa dipalsukan
  const { data: { user } } = await supabase.auth.getUser()

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

  // ── Belum login → redirect ke /login ─────────────────────────
  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Sudah login → jangan akses /login atau /register ─────────
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── Root path → redirect ke dashboard atau login ──────────────
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(user ? '/dashboard' : '/login', request.url)
    )
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Jalankan proxy di semua path KECUALI:
     * - _next/static (file statis Next.js)
     * - _next/image (optimasi gambar)
     * - file publik: favicon, manifest, icon, sw.js
     * - api/auth (endpoint auth punya logik sendiri)
     * - api/cron (cron jobs punya CRON_SECRET auth sendiri)
     */
    '/((?!_next/static|_next/image|favicon|manifest|icons|sw\\.js|api/auth|api/cron).*)',
  ],
}
