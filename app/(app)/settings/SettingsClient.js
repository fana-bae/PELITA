'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getUserBadge } from '@/lib/utils/points'
import styles from './Settings.module.css'

export default function SettingsClient({ user, profile, notifSettings }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [habitReminder, setHabitReminder] = useState(notifSettings?.habit_reminder ?? true)
  const [moneyReminder, setMoneyReminder] = useState(notifSettings?.money_reminder ?? true)
  const [taskReminder, setTaskReminder] = useState(notifSettings?.task_reminder ?? true)
  const [saved, setSaved] = useState(false)
  const [notifStatus, setNotifStatus] = useState('idle')

  const badge = getUserBadge(profile?.total_points || 0)
  const supabase = createClient()

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
    if (!('Notification' in window)) {
      setNotifStatus('unsupported')
      return
    }
    const permission = await Notification.requestPermission()
    setNotifStatus(permission === 'granted' ? 'granted' : 'denied')

    if (permission === 'granted' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        await supabase
          .from('notification_settings')
          .update({ push_subscription: sub.toJSON() })
          .eq('user_id', user.id)
      } catch (e) {
        console.error('Push subscription failed:', e)
      }
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className={`${styles.page} page-enter`}>
      <h1 className={`${styles.title} font-outfit`}>Pengaturan</h1>

      {/* Profile Card */}
      <div className={styles.profileCard}>
        <div className={styles.avatar}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" />
          ) : (
            <span>{(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div>
          <p className={styles.profileName}>{profile?.full_name || 'Pengguna Baru'}</p>
          <p className={styles.profileEmail}>{user.email}</p>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <span className="badge badge--primary">{badge.icon} {badge.label}</span>
            <span className="badge badge--dark">⭐ {profile?.total_points || 0} pts</span>
            <span className="badge badge--dark">🔥 {profile?.streak_days || 0} streak</span>
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>👤 Profil</h2>
        <form onSubmit={handleSaveProfile} className={styles.form}>
          <div className="input-group">
            <label className="input-label">Nama Lengkap</label>
            <input
              id="input-full-name"
              className="input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nama kamu"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Username</label>
            <input
              id="input-username"
              className="input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="@username"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input" value={user.email} disabled style={{ opacity: 0.6 }} />
          </div>
          <button id="btn-save-profile" type="submit" className="btn btn--primary" disabled={isPending}>
            {saved ? '✓ Tersimpan!' : isPending ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </form>
      </div>

      {/* Notifications */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🔔 Notifikasi</h2>

        {/* Permission Status */}
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
          <button
            id="btn-enable-notif"
            className="btn btn--blue btn--sm"
            onClick={requestNotifPermission}
          >
            Aktifkan
          </button>
        </div>

        <div className={styles.notifList}>
          <div className={styles.notifItem}>
            <div>
              <p className={styles.notifItemLabel}>🌅 Reminder Habit Pagi</p>
              <p className={styles.notifItemDesc}>Pengingat mengisi habit checklist jam 08.00</p>
            </div>
            <label className="toggle">
              <input
                id="toggle-habit-reminder"
                type="checkbox"
                checked={habitReminder}
                onChange={e => setHabitReminder(e.target.checked)}
              />
              <span className="toggle__slider" />
            </label>
          </div>

          <div className={styles.notifItem}>
            <div>
              <p className={styles.notifItemLabel}>💰 Reminder Money Malam</p>
              <p className={styles.notifItemDesc}>Pengingat catat pengeluaran jam 20.00</p>
            </div>
            <label className="toggle">
              <input
                id="toggle-money-reminder"
                type="checkbox"
                checked={moneyReminder}
                onChange={e => setMoneyReminder(e.target.checked)}
              />
              <span className="toggle__slider" />
            </label>
          </div>

          <div className={styles.notifItem}>
            <div>
              <p className={styles.notifItemLabel}>📅 Reminder Deadline Tugas</p>
              <p className={styles.notifItemDesc}>Notifikasi 30 menit sebelum deadline tugas</p>
            </div>
            <label className="toggle">
              <input
                id="toggle-task-reminder"
                type="checkbox"
                checked={taskReminder}
                onChange={e => setTaskReminder(e.target.checked)}
              />
              <span className="toggle__slider" />
            </label>
          </div>
        </div>

        <button id="btn-save-notif" className="btn btn--outline" onClick={handleSaveNotif} disabled={isPending}>
          {saved ? '✓ Tersimpan!' : 'Simpan Pengaturan Notifikasi'}
        </button>
      </div>

      {/* Danger Zone */}
      <div className={`${styles.section} ${styles.dangerZone}`}>
        <h2 className={styles.sectionTitle}>⚠️ Akun</h2>
        <button id="btn-logout" className="btn btn--danger" onClick={handleLogout}>
          🚪 Keluar dari Akun
        </button>
      </div>
    </div>
  )
}
