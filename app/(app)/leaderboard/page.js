import { createClient } from '@/lib/supabase/server'
import LeaderboardClient from './LeaderboardClient'

export const metadata = { title: 'Leaderboard — PELITA' }

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get leaderboard (top 100)
  const { data: leaderboard } = await supabase
    .from('leaderboard')
    .select('*')
    .limit(100)

  return (
    <LeaderboardClient
      initialLeaderboard={leaderboard || []}
      currentUserId={user.id}
    />
  )
}
