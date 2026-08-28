import { createClient } from '@/lib/supabase/server'
import { getHabits, getTodayHabitLogs } from '@/lib/actions/habits'
import HabitsClient from './HabitsClient'

export const metadata = {
  title: 'Habit Tracker — LifeTracker Pro',
  description: 'Track good and bad habits daily',
}

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [habits, habitLogs] = await Promise.all([
    getHabits(user.id),
    getTodayHabitLogs(user.id),
  ])

  return <HabitsClient habits={habits} habitLogs={habitLogs} userId={user.id} />
}
