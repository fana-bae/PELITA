import { createClient } from '@/lib/supabase/server'
import { getTasksForMonth } from '@/lib/actions/tasks'
import TasksClient from './TasksClient'

export const metadata = {
  title: 'Task Calendar — LifeTracker Pro',
}

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const tasks = await getTasksForMonth(user.id, now.getFullYear(), now.getMonth() + 1)

  return <TasksClient tasks={tasks} userId={user.id} />
}
