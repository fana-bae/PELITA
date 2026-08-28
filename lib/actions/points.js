'use server'

import { createClient } from '@/lib/supabase/server'
import { POINTS } from '@/lib/utils/points'

export async function addPoints(userId, action, points, metadata = null) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('add_points', {
    p_user_id: userId,
    p_action: action,
    p_points: points,
    p_metadata: metadata,
  })

  if (error) {
    console.error('Error adding points:', error)
    throw error
  }
}

export async function updateStreak(userId) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_days, last_active_date')
    .eq('id', userId)
    .single()

  if (!profile) return

  const today = new Date().toISOString().split('T')[0]
  const lastActive = profile.last_active_date

  let newStreak = profile.streak_days

  if (!lastActive) {
    newStreak = 1
  } else {
    const lastDate = new Date(lastActive)
    const todayDate = new Date(today)
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      newStreak += 1
    } else if (diffDays > 1) {
      newStreak = 1
    }
  }

  const updates = {
    streak_days: newStreak,
    last_active_date: today,
    updated_at: new Date().toISOString(),
  }

  await supabase.from('profiles').update(updates).eq('id', userId)

  if (newStreak === 7) {
    await addPoints(userId, 'streak_7', POINTS.STREAK_7)
  } else if (newStreak === 30) {
    await addPoints(userId, 'streak_30', POINTS.STREAK_30)
  }

  return newStreak
}
