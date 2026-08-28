import { createClient } from '@/lib/supabase/server'
import { getHabits, getTodayHabitLogs } from '@/lib/actions/habits'
import { getTodayTasks } from '@/lib/actions/tasks'
import { getFinancialOverview } from '@/lib/actions/money'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [habits, habitLogs, tasks, financeOverview] = await Promise.all([
    getHabits(user.id),
    getTodayHabitLogs(user.id),
    getTodayTasks(user.id),
    getFinancialOverview(user.id),
  ])

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Calculate today's progress
  const logMap = Object.fromEntries(habitLogs.map(l => [l.habit_id, l]))
  const completedHabits = habits.filter(h => logMap[h.id]?.completed).length
  const totalHabits = habits.length

  const completedTasks = tasks.filter(t => t.completed).length
  const totalTasks = tasks.length

  // Get leaderboard rank
  const { data: leaderboard } = await supabase
    .from('leaderboard')
    .select('id, rank')
    .limit(100)

  const myRank = leaderboard?.find(l => l.id === user.id)?.rank || '—'

  return (
    <DashboardClient
      profile={profile}
      habits={habits}
      habitLogs={habitLogs}
      tasks={tasks}
      financeOverview={financeOverview}
      completedHabits={completedHabits}
      totalHabits={totalHabits}
      completedTasks={completedTasks}
      totalTasks={totalTasks}
      myRank={myRank}
    />
  )
}
