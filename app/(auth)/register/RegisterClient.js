'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

export default function RegisterClient() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleRegister(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Password tidak cocok.')
      return
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }

    startTransition(async () => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    })
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successState}>
            <span className={styles.successIcon}>📧</span>
            <h2 className={styles.successTitle}>Cek Email Kamu!</h2>
            <p className={styles.successDesc}>
              Kami telah mengirimkan link konfirmasi ke <strong>{email}</strong>.
              Klik link tersebut untuk mengaktifkan akun kamu.
            </p>
            <Link href="/login" id="link-to-login" className="btn btn--primary">
              Kembali ke Login
            </Link>
          </div>
        </div>
        <div className={styles.decoration}>
          <div className={styles.decoCircle1} />
          <div className={styles.decoCircle2} />
          <div className={styles.decoCircle3} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🌱</span>
          <span className={styles.logoText}>LifeTracker Pro</span>
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>Buat Akun Baru</h1>
          <p className={styles.subtitle}>Gratis selamanya. Mulai perjalananmu!</p>
        </div>

        {error && (
          <div className={styles.errorBanner} id="auth-error">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleRegister} className={styles.form}>
          <div className="input-group">
            <label className="input-label">Nama Lengkap</label>
            <input
              id="input-fullname"
              type="text"
              className="input"
              placeholder="Nama kamu"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              id="input-email"
              type="email"
              className="input"
              placeholder="email@kamu.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              id="input-password"
              type="password"
              className="input"
              placeholder="Min. 6 karakter"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Konfirmasi Password</label>
            <input
              id="input-confirm-password"
              type="password"
              className="input"
              placeholder="Ulangi password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <button
            id="btn-register"
            type="submit"
            className={`btn btn--primary ${styles.submitBtn}`}
            disabled={isPending}
          >
            {isPending ? 'Mendaftar...' : 'Daftar Sekarang'}
          </button>
        </form>

        <div className={styles.divider}><span>atau</span></div>

        <button
          id="btn-google-register"
          className={`btn btn--outline ${styles.googleBtn}`}
          onClick={handleGoogleLogin}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Daftar dengan Google
        </button>

        <p className={styles.switchLink}>
          Sudah punya akun?{' '}
          <Link href="/login" id="link-login">Masuk di sini</Link>
        </p>
      </div>

      <div className={styles.decoration}>
        <div className={styles.decoCircle1} />
        <div className={styles.decoCircle2} />
        <div className={styles.decoCircle3} />
      </div>
    </div>
  )
}
