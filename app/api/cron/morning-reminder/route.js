import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

// This runs at 01:00 UTC = 08:00 WIB via vercel.json cron
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

  // Get all users with habit_reminder enabled and push subscription
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('user_id, push_subscription')
    .eq('habit_reminder', true)
    .not('push_subscription', 'is', null)

  if (!settings?.length) {
    return NextResponse.json({ message: 'No subscribers', sent: 0 })
  }

  let sent = 0
  const payload = JSON.stringify({
    title: '🌅 Selamat Pagi!',
    body: 'Jangan lupa isi habit checklist hari ini 🌱',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    url: '/habits',
    tag: 'morning-reminder',
  })

  for (const setting of settings) {
    try {
      await webpush.sendNotification(setting.push_subscription, payload)
      sent++
    } catch (e) {
      console.error(`Push failed for user ${setting.user_id}:`, e)
      // Remove invalid subscription
      if (e.statusCode === 410) {
        await supabase
          .from('notification_settings')
          .update({ push_subscription: null })
          .eq('user_id', setting.user_id)
      }
    }
  }

  return NextResponse.json({ message: 'Morning reminders sent', sent })
}
