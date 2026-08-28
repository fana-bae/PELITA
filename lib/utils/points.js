// Client-safe utility functions for points & badges
// NO 'use server' here — these run on both client and server

export const POINTS = {
  GOOD_HABIT: 10,
  RESIST_BAD: 5,
  TASK_DONE: 15,
  MONEY_LOG: 3,
  DAILY_LOGIN: 2,
  STREAK_7: 50,
  STREAK_30: 200,
}

export function getUserBadge(totalPoints) {
  if (totalPoints >= 1000) return { label: 'Champion', icon: '🌟', color: '#FFC537' }
  if (totalPoints >= 500)  return { label: 'Konsisten', icon: '🔥', color: '#FF6B35' }
  if (totalPoints >= 100)  return { label: 'Produktif', icon: '⚡', color: '#3787FF' }
  return { label: 'Pemula', icon: '🏅', color: '#0AC682' }
}

export function getLevelProgress(totalPoints) {
  const levels = [0, 100, 500, 1000]
  const current = levels.findIndex(l => totalPoints < l)
  if (current === -1) return { level: 4, pct: 100, next: null }
  const prev = levels[current - 1] || 0
  const next = levels[current]
  return {
    level: current,
    pct: Math.floor(((totalPoints - prev) / (next - prev)) * 100),
    next,
  }
}
