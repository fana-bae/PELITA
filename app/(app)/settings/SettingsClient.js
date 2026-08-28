'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getUserBadge } from '@/lib/utils/points'
import { useTheme } from '@/components/providers/ThemeProvider'
import styles from './Settings.module.css'

export default function SettingsClient({ user, profile, notifSettings }) {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [isPending, startTransition] = useTransition()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [habitReminder, setHabitReminder] = useState(notifSettings?.habit_reminder ?? true)
  const [moneyReminder, setMoneyReminder] = useState(notifSettings?.money_reminder ?? true)
  const [taskReminder, setTaskReminder] = useState(notifSettings?.task_reminder ?? true)
  const [saved, setSaved] = useState(false)
  const [notifStatus, setNotifStatus] = useState('idle')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const fileInputRef = useRef(null)

  const badge = getUserBadge(profile?.total_points || 0)
  const supabase = createClient()
  const initials = (profile?.full_name || user.email || 'U').charAt(0).toUpperCase()

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setAvatarError('File harus berupa gambar (jpg, png, webp)')
      return
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setAvatarError('Ukuran foto maksimal 2MB')
      return
    }

    setUploadingAvatar(true)
    setAvatarError('')

    try {
      const ext = file.name.split('.').pop()
      const fileName = `${user.id}/avatar.${ext}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Add cache-busting to force re-render
      const urlWithCache = `${publicUrl}?t=${Date.now()}`

      // Save to profile
      await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCache, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      setAvatarUrl(urlWithCache)
      router.refresh()
    } catch (err) {
      console.error(err)
      setAvatarError('Gagal mengunggah foto. Pastikan bucket "avatars" sudah dibuat di Supabase.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    startTransition(async () => {
      await supabase
        .from('profiles')
        .update({ full_name: fullName, username, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    })
  }

  async function handleSaveNotif() {
    startTransition(async () => {
      await supabase
        .from('notification_settings')
        .update({ habit_reminder: habitReminder, money_reminder: moneyReminder, task_reminder: taskReminder })
        .eq('user_id', user.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  async function requestNotifPermission() {
    if (!('Notification' in window)) { setNotifStatus('unsupported'); return }
    const permission = await Notification.requestPermission()
    setNotifStatus(permission === 'granted' ? 'granted' : 'denied')
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        await supabase.from('notification_settings')
          .update({ push_subscription: sub.toJSON() })
          .eq('user_id', user.id)
      } catch (e) { console.error('Push subscription failed:', e) }
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className={`${styles.page} page-enter`}>
      <h1 className={`${styles.title} font-outfit`}>Pengaturan</h1>

      {/* ── Avatar + Profile Summary ── */}
      <div className={styles.profileHero}>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatarLarge}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" />
            ) : (
              <span>{initials}</span>
            )}
            {uploadingAvatar && (
              <div className={styles.avatarOverlay}>
                <div className={styles.uploadSpinner} />
              </div>
            )}
          </div>
          <button
            className={styles.avatarEditBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            title="Ganti foto profil"
          >
            📷
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />
        </div>
        <div className={styles.profileHeroInfo}>
          <h2 className={styles.profileHeroName}>{profile?.full_name || 'Pengguna Baru'}</h2>
          <p className={styles.profileHeroEmail}>{user.email}</p>
          <div className={styles.profileBadges}>
            <span className="badge badge--primary">{badge.icon} {badge.label}</span>
            <span className="badge badge--dark">⭐ {profile?.total_points || 0} pts</span>
            <span className="badge badge--dark">🔥 {profile?.streak_days || 0} hari</span>
          </div>
        </div>
      </div>

      {avatarError && <p className={styles.errorMsg}>{avatarError}</p>}
      <p className={styles.avatarHint}>Klik ikon kamera untuk mengganti foto. Maks 2MB (JPG, PNG, WebP).</p>

      {/* ── Edit Profile ── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>👤 Profil</h2>
        <form onSubmit={handleSaveProfile} className={styles.form}>
          <div className="input-group">
            <label className="input-label">Nama Lengkap</label>
            <input id="input-full-name" className="input" value={fullName}
              onChange={e => setFullName(e.target.value)} placeholder="Nama kamu" />
          </div>
          <div className="input-group">
            <label className="input-label">Username</label>
            <input id="input-username" className="input" value={username}
              onChange={e => setUsername(e.target.value)} placeholder="@username" />
          </div>
          <div className="input-group">
            <label className="input-label">Email / NIS</label>
            <input className="input" value={user.email} disabled style={{ opacity: 0.5 }} />
          </div>
          <button id="btn-save-profile" type="submit" className="btn btn--primary" disabled={isPending}>
            {saved ? '✓ Tersimpan!' : isPending ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </form>
      </div>

      {/* ── Appearance ── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🎨 Tampilan</h2>
        <div className={styles.themeRow}>
          <div>
            <p className={styles.themeLabel}>{theme === 'dark' ? '🌙 Mode Gelap aktif' : '☀️ Mode Terang aktif'}</p>
            <p className={styles.themeSub}>Pilih tampilan yang nyaman untuk matamu</p>
          </div>
          <button onClick={toggleTheme} className={styles.themeBtn}>
            {theme === 'dark' ? '☀️ Terang' : '🌙 Gelap'}
          </button>
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🔔 Notifikasi</h2>
        <div className={styles.notifPermission}>
          <div>
            <p className={styles.notifPermLabel}>Status Izin Notifikasi</p>
            <p className={styles.notifPermDesc}>
              {notifStatus === 'granted' || (typeof window !== 'undefined' && Notification?.permission === 'granted')
                ? '✅ Notifikasi diizinkan'
                : notifStatus === 'denied'
                ? '❌ Notifikasi diblokir. Ubah di pengaturan browser.'
                : notifStatus === 'unsupported'
                ? '❌ Browser tidak mendukung notifikasi'
                : '⏳ Izin belum diberikan'}
            </p>
          </div>
          <button id="btn-enable-notif" className="btn btn--blue btn--sm" onClick={requestNotifPermission}>
            Aktifkan
          </button>
        </div>

        <div className={styles.notifList}>
          {[
            { id: 'habit', label: '🌅 Reminder Habit Pagi', desc: 'Pengingat mengisi habit checklist jam 08.00', val: habitReminder, set: setHabitReminder },
            { id: 'money', label: '💰 Reminder Money Malam', desc: 'Pengingat catat pengeluaran jam 20.00', val: moneyReminder, set: setMoneyReminder },
            { id: 'task',  label: '📅 Reminder Deadline Tugas', desc: 'Notifikasi 30 menit sebelum deadline', val: taskReminder, set: setTaskReminder },
          ].map(item => (
            <div key={item.id} className={styles.notifItem}>
              <div>
                <p className={styles.notifItemLabel}>{item.label}</p>
                <p className={styles.notifItemDesc}>{item.desc}</p>
              </div>
              <label className="toggle">
                <input id={`toggle-${item.id}-reminder`} type="checkbox"
                  checked={item.val} onChange={e => item.set(e.target.checked)} />
                <span className="toggle__slider" />
              </label>
            </div>
          ))}
        </div>

        <button id="btn-save-notif" className="btn btn--outline" onClick={handleSaveNotif} disabled={isPending}>
          {saved ? '✓ Tersimpan!' : 'Simpan Pengaturan Notifikasi'}
        </button>
      </div>

      {/* ── Danger Zone ── */}
      <div className={`${styles.section} ${styles.dangerZone}`}>
        <h2 className={styles.sectionTitle}>⚠️ Akun</h2>
        <button id="btn-logout" className="btn btn--danger" onClick={handleLogout}>
          🚪 Keluar dari Akun
        </button>
      </div>
    </div>
  )
}
