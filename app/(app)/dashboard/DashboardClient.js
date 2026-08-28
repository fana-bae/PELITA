'use client'

import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/money-calc'
import { getUserBadge } from '@/lib/utils/points'
import styles from './Dashboard.module.css'

const QUOTES = [
  "Kamu adalah hasil dari apa yang kamu lakukan berulang kali. — Aristotle",
  "Langkah kecil setiap hari membawa perubahan besar.",
  "Konsistensi adalah kunci keberhasilan jangka panjang.",
  "Mulai dari mana kamu berada, gunakan apa yang kamu punya.",
  "Kemajuan, bukan kesempurnaan.",
]

const PRIORITY_COLOR = { high: '#FF5B5B', medium: '#FFC537', low: '#0AC682' }

export default function DashboardClient({
  profile,
  habits,
  habitLogs,
  tasks,
  financeOverview,
  completedHabits,
  totalHabits,
  completedTasks,
  totalTasks,
  myRank,
}) {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 17 ? 'Selamat Siang' : 'Selamat Malam'

  const quote = QUOTES[now.getDay() % QUOTES.length]
  const badge = getUserBadge(profile?.total_points || 0)

  const habitProgress = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const overallProgress = Math.round((habitProgress + taskProgress) / 2)

  // Ring calculation
  const RING_R = 40
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R
  const ringOffset = RING_CIRCUMFERENCE - (overallProgress / 100) * RING_CIRCUMFERENCE

  const logMap = Object.fromEntries(habitLogs.map(l => [l.habit_id, l]))
  const displayName = profile?.full_name?.split(' ')[0] || 'Kawan'

  const upcomingTasks = tasks
    .filter(t => !t.completed)
    .slice(0, 4)

  return (
    <div className={`${styles.dashboard} page-enter`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <p className={styles.greeting}>{greeting} 👋</p>
          <h1 className={`${styles.name} font-outfit`}>
            Halo, {displayName}!
          </h1>
          <div className={styles.badgeRow}>
            <span className="badge badge--primary">
              {badge.icon} {badge.label}
            </span>
            <span className="badge badge--dark">
              🏆 Rank #{myRank}
            </span>
          </div>
        </div>

        {/* Progress Ring */}
        <div className={styles.progressRing}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              className="progress-ring__bg"
              cx="50" cy="50" r={RING_R}
            />
            <circle
              className="progress-ring__fill"
              cx="50" cy="50" r={RING_R}
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className={styles.ringCenter}>
            <span className={styles.ringPercent}>{overallProgress}%</span>
            <span className={styles.ringLabel}>hari ini</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.statsGrid}>
        <Link href="/habits" className={`${styles.statCard} ${styles.statGreen}`}>
          <span className={styles.statIcon}>✅</span>
          <div>
            <p className={styles.statValue}>{completedHabits}/{totalHabits}</p>
            <p className={styles.statLabel}>Habit</p>
          </div>
          <div className={styles.statBar}>
            <div style={{ width: `${habitProgress}%` }} className={styles.statBarFill} />
          </div>
        </Link>

        <Link href="/tasks" className={`${styles.statCard} ${styles.statBlue}`}>
          <span className={styles.statIcon}>📋</span>
          <div>
            <p className={styles.statValue}>{completedTasks}/{totalTasks}</p>
            <p className={styles.statLabel}>Tugas</p>
          </div>
          <div className={styles.statBar}>
            <div style={{ width: `${taskProgress}%`, background: 'var(--blue)' }} className={styles.statBarFill} />
          </div>
        </Link>

        <Link href="/leaderboard" className={`${styles.statCard} ${styles.statYellow}`}>
          <span className={styles.statIcon}>🏆</span>
          <div>
            <p className={styles.statValue}>#{myRank}</p>
            <p className={styles.statLabel}>Ranking</p>
          </div>
        </Link>

        <Link href="/money" className={`${styles.statCard} ${styles.statPink}`}>
          <span className={styles.statIcon}>💰</span>
          <div>
            <p className={styles.statValue}>
              {formatCurrency(financeOverview?.totalBalance || 0)}
            </p>
            <p className={styles.statLabel}>Sisa Uang</p>
          </div>
        </Link>
      </div>

      {/* Streak */}
      {profile?.streak_days > 0 && (
        <div className={styles.streakBanner}>
          <span className={styles.streakFire}>🔥</span>
          <div>
            <p className={styles.streakValue}>{profile.streak_days} hari streak!</p>
            <p className={styles.streakSub}>Pertahankan terus, kamu luar biasa!</p>
          </div>
          <span className={styles.streakPts}>+{profile.total_points || 0} pts</span>
        </div>
      )}

      {/* Today's Habits (preview) */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={`${styles.sectionTitle} font-outfit`}>Habit Hari Ini</h2>
          <Link href="/habits" className={styles.seeAll}>Lihat semua →</Link>
        </div>

        {habits.length === 0 ? (
          <div className={styles.emptyState}>
            <p>🌱 Belum ada habit. <Link href="/habits">Tambah sekarang!</Link></p>
          </div>
        ) : (
          <div className={styles.habitGrid}>
            {habits.slice(0, 4).map(habit => {
              const log = logMap[habit.id]
              const done = log?.completed || false
              return (
                <div
                  key={habit.id}
                  className={`${styles.habitCard} ${done ? styles.habitDone : ''}`}
                  style={{ '--habit-color': habit.color }}
                >
                  <span className={styles.habitIcon}>{habit.icon}</span>
                  <p className={styles.habitName}>{habit.name}</p>
                  <span className={styles.habitType}>
                    {habit.type === 'good' ? '✅' : '🚫'}
                  </span>
                  {done && <span className={styles.habitCheck}>✓</span>}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Today's Tasks */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={`${styles.sectionTitle} font-outfit`}>Tugas Hari Ini</h2>
          <Link href="/tasks" className={styles.seeAll}>Lihat semua →</Link>
        </div>

        {upcomingTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <p>🎉 Semua tugas selesai! <Link href="/tasks">Tambah tugas baru</Link></p>
          </div>
        ) : (
          <div className={styles.taskList}>
            {upcomingTasks.map(task => (
              <div key={task.id} className={styles.taskItem}>
                <div
                  className={styles.taskPriorityDot}
                  style={{ background: PRIORITY_COLOR[task.priority] }}
                />
                <div className={styles.taskInfo}>
                  <p className={styles.taskTitle}>{task.title}</p>
                  {task.due_time && (
                    <p className={styles.taskTime}>⏰ {task.due_time.slice(0, 5)}</p>
                  )}
                </div>
                <span className={`badge badge--${task.priority}`}>
                  {task.priority === 'high' ? 'Penting' : task.priority === 'medium' ? 'Sedang' : 'Rendah'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quote */}
      <div className={styles.quoteCard}>
        <span className={styles.quoteIcon}>💭</span>
        <p className={styles.quoteText}>{quote}</p>
      </div>
    </div>
  )
}
