-- ============================================================
-- Pelita — Migration: Update Leaderboard View
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop the existing view
DROP VIEW IF EXISTS leaderboard;

-- Create the updated view
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.total_points,
  p.streak_days,
  p.last_active_date,
  RANK() OVER (ORDER BY p.total_points DESC, p.streak_days DESC) as rank,
  
  -- Points this week (Reset every Monday 00:00)
  COALESCE(
    (SELECT SUM(pl.points)
     FROM points_log pl
     WHERE pl.user_id = p.id
     AND pl.created_at >= date_trunc('week', NOW())),
    0
  ) as weekly_points,
  
  -- Points this month (Reset every 1st of month)
  COALESCE(
    (SELECT SUM(pl.points)
     FROM points_log pl
     WHERE pl.user_id = p.id
     AND pl.created_at >= date_trunc('month', NOW())),
    0
  ) as monthly_points,
  
  -- Tasks completed (all time)
  COALESCE(
    (SELECT COUNT(*)
     FROM tasks t
     WHERE t.user_id = p.id
     AND t.completed = true),
    0
  ) as completed_tasks

FROM profiles p
ORDER BY p.total_points DESC, p.streak_days DESC;

-- Grant access to the view
GRANT SELECT ON leaderboard TO authenticated, anon;
