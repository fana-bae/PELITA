'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/providers/ThemeProvider'
import StreakModal from '@/components/streak/StreakModal'
import styles from './AppShell.module.css'

const NAV_ITEMS = [
  { href: '/dashboard',   icon: '🏠', label: 'Beranda',  id: 'nav-dashboard' },
  { href: '/notes',       icon: '📝', label: 'Catatan',  id: 'nav-notes' },
  { href: '/habits',      icon: '✅', label: 'Habit',    id: 'nav-habits' },
  { href: '/tasks',       icon: '📅', label: 'Tugas',    id: 'nav-tasks' },
  { href: '/money',       icon: '💰', label: 'Uang',     id: 'nav-money' },
  { href: '/leaderboard', icon: '🏆', label: 'Rank',     id: 'nav-leaderboard' },
]

function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`${styles.themeToggle} ${compact ? styles.themeToggleCompact : ''}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Mode Terang' : 'Mode Gelap'}
    >
      <span className={styles.themeToggleIcon}>{isDark ? '☀️' : '🌙'}</span>
      {!compact && <span>{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>}
    </button>
  )
}

export default function AppShell({ user, profile, children }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const firstName   = displayName.split(' ')[0]
  const initials    = displayName.charAt(0).toUpperCase()

  return (
    <div className={styles.shell}>

      {/* ── Sidebar — Desktop ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarInner}>

          {/* Logo */}
          <div className={styles.logo}>
            <img src="/logo.png" alt="PELITA Logo" className={styles.logoImg} />
            <span className={styles.logoText}>PELITA</span>
          </div>

          {/* Profile Card */}
          <Link href="/settings" prefetch={true} className={styles.profileCard} onClick={() => setSidebarOpen(false)}>
            <div className={styles.avatar}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className={styles.profileInfo}>
              <p className={styles.profileName}>{firstName}</p>
              <p className={styles.profilePoints}>⭐ {profile?.total_points || 0} pts · 🔥 {profile?.streak_days || 0} hari</p>
            </div>
            <span className={styles.profileArrow}>›</span>
          </Link>

          {/* Navigation */}
          <nav className={styles.nav}>
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  id={item.id}
                  prefetch={true}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                  {active && <span className={styles.navIndicator} />}
                </Link>
              )
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className={styles.sidebarFooter}>
            <ThemeToggle />
            <Link
              href="/settings"
              id="nav-settings"
              prefetch={true}
              className={`${styles.navItem} ${pathname === '/settings' ? styles.navItemActive : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className={styles.navIcon}>⚙️</span>
              <span className={styles.navLabel}>Pengaturan</span>
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className={styles.logoutBtn} id="btn-logout">
                <span>🚪</span>
                <span>Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main Content ── */}
      <main className={styles.main}>

        {/* Top Bar (Mobile / Tablet) */}
        <header className={styles.topBar}>
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            id="btn-menu"
            aria-label="Menu"
          >
            <span className={sidebarOpen ? styles.menuLineTop : ''} />
            <span className={sidebarOpen ? styles.menuLineHide : ''} />
            <span className={sidebarOpen ? styles.menuLineBottom : ''} />
          </button>

          <div className={styles.topLogo}>
            <img src="/logo.png" alt="PELITA Logo" className={styles.topLogoImg} />
            <span>PELITA</span>
          </div>

          <div className={styles.topBarRight}>
            <ThemeToggle compact />
            <Link href="/settings" className={styles.topAvatar} id="topbar-avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} />
              ) : (
                <span>{initials}</span>
              )}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className={styles.pageContent}>
          {children}
        </div>
      </main>

      {/* ── Removed Bottom Nav (Using Hamburger Menu Instead) ── */}

      <StreakModal />
    </div>
  )
}
