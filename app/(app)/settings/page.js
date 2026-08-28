import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export const metadata = { title: 'Pengaturan — LifeTracker Pro' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: notifSettings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <SettingsClient
      user={user}
      profile={profile}
      notifSettings={notifSettings}
    />
  )
}
