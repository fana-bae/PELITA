'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

// ── Konversi NIS ke synthetic email ──────────────────────────
function nisToEmail(nis) {
  // Gunakan domain .com standar agar lolos validasi email bawaan Supabase
  return `${nis.trim().toLowerCase()}@example.com`
}

// ── Validasi NIS di client (A/B + angka) ─────────────────────
function validateNIS(nis) {
  const cleaned = String(nis || '').trim().toUpperCase()
  if (!cleaned) return 'NIS tidak boleh kosong'
  if (!/^[AB]\d{3,14}$/.test(cleaned)) return 'NIS tidak valid'
  return null
}

// ── Filter input NIS: hanya huruf A/B dan angka, auto uppercase ──
function filterNIS(raw) {
  return raw.toUpperCase().replace(/[^AB0-9]/g, '').slice(0, 15)
}

// ═══════════════════════════════════════════════════════════════
// PASSWORD INPUT dengan toggle show/hide
// ═══════════════════════════════════════════════════════════════
function PasswordInput({ id, value, onChange, placeholder = 'Password', autoComplete }) {
  const [show, setShow] = useState(false)

  return (
    <div className={styles.inputWrapper}>
      <span className={styles.inputIcon}>🔒</span>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className={`${styles.inputField} ${styles.inputWithIcon} ${styles.inputWithToggle}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className={styles.eyeToggle}
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
        tabIndex={-1}
      >
        {show ? (
          /* Eye-off icon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          /* Eye icon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// LOGIN FORM
// ═══════════════════════════════════════════════════════════════
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const supabase = createClient()

  const [nis, setNis]           = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')

    const nisErr = validateNIS(nis)
    if (nisErr) { setError(nisErr); return }

    startTransition(async () => {
      const email = nisToEmail(nis)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('NIS atau password salah. Coba lagi.')
      } else {
        router.push(redirectTo)
        router.refresh()
      }
    })
  }

  return (
    <>
      <h2 className={styles.formHeading}>Masuk ke PELITA</h2>
      <p className={styles.formSubtext}>Gunakan NIS dan password pondokmu</p>

      {error && <div className={styles.errorBanner} id="auth-error-login">{error}</div>}

      <form onSubmit={handleLogin} style={{ width: '100%' }}>
        {/* NIS Input */}
        <div className={styles.inputWrapper}>
          <span className={styles.inputIcon}>🪪</span>
          <input
            id="input-login-nis"
            type="text"
            inputMode="text"
            className={`${styles.inputField} ${styles.inputWithIcon}`}
            placeholder="Masukkan NIS"
            value={nis}
            onChange={e => setNis(filterNIS(e.target.value))}
            required
            autoComplete="username"
            maxLength={15}
          />
        </div>

        {/* Password dengan eye toggle */}
        <PasswordInput
          id="input-login-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
        />

        <button
          id="btn-login"
          type="submit"
          className={styles.submitBtn}
          disabled={isPending}
          style={{ marginTop: '20px' }}
        >
          {isPending ? 'Masuk...' : 'MASUK'}
        </button>
      </form>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// REGISTER FORM
// ═══════════════════════════════════════════════════════════════
function RegisterForm({ onSuccess }) {
  const supabase = createClient()

  const [nis, setNis]             = useState('')
  const [fullName, setFullName]   = useState('')
  const [password, setPassword]   = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError]         = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleRegister(e) {
    e.preventDefault()
    setError('')

    // Validasi NIS
    const nisErr = validateNIS(nis)
    if (nisErr) { setError(nisErr); return }

    // Validasi nama
    if (!fullName.trim() || fullName.trim().length < 3) {
      setError('Nama lengkap minimal 3 karakter')
      return
    }

    // Validasi password
    if (password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }
    if (password !== confirmPw) {
      setError('Password dan konfirmasi tidak cocok')
      return
    }

    startTransition(async () => {
      const nisUpper = nis.toUpperCase()
      const email    = nisToEmail(nisUpper)

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim(), nis: nisUpper },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (signUpError) {
        if (
          signUpError.message?.includes('already registered') ||
          signUpError.message?.includes('User already registered')
        ) {
          setError('NIS ini sudah terdaftar. Silakan masuk.')
        } else {
          setError(signUpError.message || 'Pendaftaran gagal. Coba lagi.')
        }
        return
      }

      if (data?.user) {
        await supabase
          .from('profiles')
          .update({ nis: nisUpper, full_name: fullName.trim() })
          .eq('id', data.user.id)
      }

      onSuccess(nisUpper, fullName.trim())
    })
  }

  return (
    <>
      <h2 className={styles.formHeading}>Daftar Akun</h2>
      <p className={styles.formSubtext}>Gunakan NIS dari kartu ID pondokmu</p>

      {error && <div className={styles.errorBanner} id="auth-error-register">{error}</div>}

      <form onSubmit={handleRegister} style={{ width: '100%' }}>
        {/* NIS */}
        <div className={styles.inputWrapper}>
          <span className={styles.inputIcon}>🪪</span>
          <input
            id="input-register-nis"
            type="text"
            inputMode="text"
            className={`${styles.inputField} ${styles.inputWithIcon}`}
            placeholder="Masukkan NIS"
            value={nis}
            onChange={e => setNis(filterNIS(e.target.value))}
            required
            maxLength={15}
          />
        </div>

        {/* Nama Lengkap */}
        <div className={styles.inputWrapper}>
          <span className={styles.inputIcon}>👤</span>
          <input
            id="input-register-name"
            type="text"
            className={`${styles.inputField} ${styles.inputWithIcon}`}
            placeholder="Nama Lengkap"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            maxLength={100}
          />
        </div>

        {/* Password dengan eye toggle */}
        <PasswordInput
          id="input-register-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password (min. 6 karakter)"
          autoComplete="new-password"
        />

        {/* Konfirmasi Password */}
        <PasswordInput
          id="input-register-confirm"
          value={confirmPw}
          onChange={e => setConfirmPw(e.target.value)}
          placeholder="Ulangi Password"
          autoComplete="new-password"
        />

        <button
          id="btn-register"
          type="submit"
          className={styles.submitBtn}
          disabled={isPending}
          style={{ marginTop: '8px' }}
        >
          {isPending ? 'Mendaftar...' : 'DAFTAR SEKARANG'}
        </button>
      </form>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN AUTH COMPONENT
// ═══════════════════════════════════════════════════════════════
function AuthClientInner() {
  const [showRegister, setShowRegister] = useState(false)
  const [success, setSuccess]           = useState(null)

  // ── Success screen ─────────────────────────────────────────
  if (success) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successCard}>
          <span className={styles.successIcon}>🎉</span>
          <h2 className={styles.successTitle}>Selamat, {success.name}!</h2>
          <p className={styles.successDesc}>
            Akun dengan NIS <strong>{success.nis}</strong> berhasil dibuat.
            {' '}Silakan masuk menggunakan NIS dan passwordmu.
          </p>
          <button
            className={styles.successBtn}
            onClick={() => { setSuccess(null); setShowRegister(false) }}
            id="btn-back-to-login"
          >
            Masuk Sekarang
          </button>
        </div>
      </div>
    )
  }

  // ── Desktop layout (≥ 721px) ─────────────────────────────────
  const desktopLayout = (
    <div className={styles.authPage}>
      <div className={`${styles.container} ${showRegister ? styles.showRegister : ''}`}>

        {/* Login panel — LEFT */}
        <div className={`${styles.formSection} ${styles.loginSection}`}>
          <LoginForm />
        </div>

        {/* Register panel — RIGHT */}
        <div className={`${styles.formSection} ${styles.registerSection}`}>
          <RegisterForm onSuccess={(nis, name) => setSuccess({ nis, name })} />
        </div>

        {/* Sliding overlay */}
        <div className={styles.overlay}>
          <div className={styles.overlayShape1} />
          <div className={styles.overlayShape2} />
          <div className={styles.overlayShape3} />

          <div className={styles.overlayLogo}>
            <img src="/logo.jpg" alt="PELITA Logo" className={styles.overlayLogoImg} />
            <span className={styles.overlayLogoText}>PELITA</span>
          </div>

          {!showRegister ? (
            <>
              <h2 className={styles.overlayHeading}>Halo, Santri! 👋</h2>
              <p className={styles.overlayText}>
                Belum punya akun? Daftar pakai NIS dari kartu ID pondokmu.
              </p>
              <button className={styles.overlayBtn} onClick={() => setShowRegister(true)} id="btn-go-register">
                DAFTAR
              </button>
            </>
          ) : (
            <>
              <h2 className={styles.overlayHeading}>Sudah Punya Akun?</h2>
              <p className={styles.overlayText}>
                Masuk dengan NIS dan password yang sudah kamu buat.
              </p>
              <button className={styles.overlayBtn} onClick={() => setShowRegister(false)} id="btn-go-login">
                MASUK
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )

  // ── Mobile layout (≤ 720px) ──────────────────────────────────
  const mobileLayout = (
    <div className={styles.mobileLayout}>
      <div className={styles.mobileHeader}>
        <div className={styles.mobileHeaderShape1} />
        <div className={styles.mobileHeaderShape2} />
        <div className={styles.mobileLogo}>
          <img src="/logo.jpg" alt="PELITA Logo" className={styles.mobileLogoImg} />
          <span className={styles.mobileLogoText}>PELITA</span>
        </div>
        <p className={styles.mobileHeaderSub}>
          {showRegister ? 'Daftar dengan NIS pondokmu 🪪' : 'Selamat datang, Santri! 👋'}
        </p>
      </div>

      <div className={styles.mobileFormWrapper}>
        <div className={styles.mobileTabs}>
          <button
            className={`${styles.mobileTab} ${!showRegister ? styles.mobileTabActive : ''}`}
            onClick={() => setShowRegister(false)}
            id="mobile-tab-login" type="button"
          >
            Masuk
          </button>
          <button
            className={`${styles.mobileTab} ${showRegister ? styles.mobileTabActive : ''}`}
            onClick={() => setShowRegister(true)}
            id="mobile-tab-register" type="button"
          >
            Daftar
          </button>
        </div>

        {!showRegister
          ? <LoginForm />
          : <RegisterForm onSuccess={(nis, name) => setSuccess({ nis, name })} />
        }
      </div>
    </div>
  )

  return (
    <>
      <div className={styles.desktopOnly}>{desktopLayout}</div>
      <div className={styles.mobileOnly}>{mobileLayout}</div>
    </>
  )
}

export default function AuthClient() {
  return (
    <Suspense fallback={null}>
      <AuthClientInner />
    </Suspense>
  )
}
