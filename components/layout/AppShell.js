'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import StreakModal from '@/components/streak/StreakModal'
import styles from './AppShell.module.css'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '🏠', label: 'Beranda', id: 'nav-dashboard' },
  { href: '/notes',    icon: '📝', label: 'Catatan', id: 'nav-notes' },
  { href: '/habits',   icon: '✅', label: 'Habit',   id: 'nav-habits' },
  { href: '/tasks',    icon: '📅', label: 'Tugas',   id: 'nav-tasks' },
  { href: '/money',    icon: '💰', label: 'Uang',    id: 'nav-money' },
  { href: '/leaderboard', icon: '🏆', label: 'Rank', id: 'nav-leaderboard' },
]

export default function AppShell({ user, profile, children }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <div className={styles.shell}>
      {/* Sidebar — Desktop & Tablet */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarInner}>
          {/* Logo */}
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🕯️</span>
            <span className={styles.logoText}>Pelita</span>
          </div>

          {/* Profile */}
          <div className={styles.profileCard}>
            <div className={styles.avatar}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className={styles.profileInfo}>
              <p className={styles.profileName}>{displayName}</p>
              <p className={styles.profilePoints}>
                ⭐ {profile?.total_points || 0} pts
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className={styles.nav}>
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                id={item.id}
                className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {pathname === item.href && <span className={styles.navIndicator} />}
              </Link>
            ))}
          </nav>

          {/* Bottom: Settings & Logout */}
          <div className={styles.sidebarFooter}>
            <Link
              href="/settings"
              id="nav-settings"
              className={`${styles.navItem} ${pathname === '/settings' ? styles.navItemActive : ''}`}
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

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className={styles.main}>
        {/* Top Bar (Mobile) */}
        <header className={styles.topBar}>
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            id="btn-menu"
            aria-label="Menu"
          >
            <span />
            <span />
            <span />
          </button>

          <div className={styles.topLogo}>
            <span>🕯️</span>
            <span>Pelita</span>
          </div>

          <Link href="/settings" className={styles.topAvatar} id="topbar-avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} />
            ) : (
              <span>{initials}</span>
            )}
          </Link>
        </header>

        {/* Page Content */}
        <div className={styles.pageContent}>
          {children}
        </div>
      </main>

      {/* Bottom Nav — Mobile */}
      <nav className={styles.bottomNav}>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            id={`bottom-${item.id}`}
            className={`${styles.bottomNavItem} ${pathname === item.href ? styles.bottomNavItemActive : ''}`}
          >
            <span className={styles.bottomNavIcon}>{item.icon}</span>
            <span className={styles.bottomNavLabel}>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Login Streak Animation Modal */}
      <StreakModal />
    </div>
  )
}
