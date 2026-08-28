import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

// Runs every 5 minutes to check for upcoming task deadlines
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Setup VAPID di runtime, bukan build time
  const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT
  if (!vapidPublic || !vapidPrivate || vapidPublic.startsWith('placeholder')) {
    return NextResponse.json({ message: 'VAPID not configured', sent: 0 })
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const supabase = await createAdminClient()
  const now = new Date()

  // Find tasks due in the next 30-35 minutes that haven't been reminded
  const windowStart = new Date(now.getTime() + 25 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 35 * 60 * 1000)

  const todayStr = now.toISOString().split('T')[0]
  const startTime = windowStart.toTimeString().slice(0, 5)
  const endTime = windowEnd.toTimeString().slice(0, 5)

  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id, title, user_id, due_time,
      notification_settings!inner(task_reminder, push_subscription)
    `)
    .eq('completed', false)
    .eq('reminder_sent', false)
    .eq('due_date', todayStr)
    .gte('due_time', startTime)
    .lte('due_time', endTime)
    .eq('notification_settings.task_reminder', true)
    .not('notification_settings.push_subscription', 'is', null)

  if (!tasks?.length) {
    return NextResponse.json({ message: 'No upcoming tasks', sent: 0 })
  }

  let sent = 0
  for (const task of tasks) {
    const sub = task.notification_settings?.push_subscription
    if (!sub) continue

    const payload = JSON.stringify({
      title: '⏰ Deadline Tugas Mendekati!',
      body: `"${task.title}" deadline dalam 30 menit`,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      url: '/tasks',
      tag: `task-${task.id}`,
    })

    try {
      await webpush.sendNotification(sub, payload)
      // Mark as reminded
      await supabase.from('tasks').update({ reminder_sent: true }).eq('id', task.id)
      sent++
    } catch (e) {
      console.error(`Task reminder failed for ${task.id}:`, e)
    }
  }

  return NextResponse.json({ message: 'Task reminders sent', sent })
}
