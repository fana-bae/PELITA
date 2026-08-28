import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

// Runs at 13:00 UTC = 20:00 WIB
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Setup VAPID di sini (runtime), bukan di module level (build time)
  const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT
  if (!vapidPublic || !vapidPrivate || vapidPublic.startsWith('placeholder')) {
    return NextResponse.json({ message: 'VAPID not configured', sent: 0 })
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const supabase = await createAdminClient()

  const { data: settings } = await supabase
    .from('notification_settings')
    .select('user_id, push_subscription')
    .eq('money_reminder', true)
    .not('push_subscription', 'is', null)

  if (!settings?.length) {
    return NextResponse.json({ message: 'No subscribers', sent: 0 })
  }

  let sent = 0
  const payload = JSON.stringify({
    title: '💰 Reminder Keuangan',
    body: 'Sudah catat pengeluaran hari ini? Yuk catat sekarang!',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    url: '/money',
    tag: 'evening-reminder',
  })

  for (const setting of settings) {
    try {
      await webpush.sendNotification(setting.push_subscription, payload)
      sent++
    } catch (e) {
      if (e.statusCode === 410) {
        await supabase
          .from('notification_settings')
          .update({ push_subscription: null })
          .eq('user_id', setting.user_id)
      }
    }
  }

  return NextResponse.json({ message: 'Evening reminders sent', sent })
}
