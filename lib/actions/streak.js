'use server'

import { createClient } from '@/lib/supabase/server'
import { addPoints } from '@/lib/actions/points'
import { POINTS } from '@/lib/utils/points'

async function getAuthUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return user
}

export async function checkAndUpdateStreak() {
  const supabase = await createClient()
  
  try {
    const user = await getAuthUser(supabase)
    
    // Get current profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('streak_days, last_active_date')
      .eq('id', user.id)
      .single()
      
    if (profileErr) throw profileErr

    // We use timezone-aware dates based on server/user (using UTC ISO for consistency, but local date is better. We'll use YYYY-MM-DD from server's current date)
    // To avoid timezone issues, let's get the date string in the local timezone of the server
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    // Yesterday
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const lastActive = profile.last_active_date
    let currentStreak = profile.streak_days || 0

    // 1. Sudah login hari ini?
    if (lastActive === todayStr) {
      return { status: 'none', streak: currentStreak }
    }

    // 2. Login kemarin? (Streak berlanjut)
    if (lastActive === yesterdayStr) {
      const newStreak = currentStreak + 1
      
      // Update database
      await supabase
        .from('profiles')
        .update({ 
          streak_days: newStreak, 
          last_active_date: todayStr,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        
      // Give points for consistency (e.g. +5 pts for daily login)
      await addPoints(user.id, 'daily_login', 5, { streak: newStreak })
      
      // Bonus points for weekly streak milestone
      if (newStreak % 7 === 0) {
         await addPoints(user.id, 'weekly_streak', 50, { streak: newStreak })
      }
        
      return { status: 'continue', streak: newStreak }
    }

    // 3. Login pertama kali atau bolong (Streak pecah)
    // Update database
    await supabase
      .from('profiles')
      .update({ 
        streak_days: 1, 
        last_active_date: todayStr,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      
    // Give base points
    await addPoints(user.id, 'daily_login', 5, { streak: 1 })

    // Return status 'broken' only if they actually lost a streak > 0
    if (currentStreak > 0 && lastActive && lastActive !== todayStr && lastActive !== yesterdayStr) {
      return { status: 'broken', streak: 1, oldStreak: currentStreak }
    }

    // First time ever logging in (or no streak to lose)
    return { status: 'continue', streak: 1 }

  } catch (err) {
    console.error('Error checking streak:', err)
    return { status: 'error' }
  }
}
