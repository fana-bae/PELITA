import { createClient } from '@/lib/supabase/server'
import { getTasks } from '@/lib/actions/tasks'
import TasksClient from './TasksClient'

export const metadata = {
  title: 'Task Calendar — LifeTracker Pro',
}

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const tasks = await getTasks(user.id)

  return <TasksClient tasks={tasks} userId={user.id} />
}
