-- ============================================================
-- Pelita — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nis TEXT UNIQUE,                   -- Nomor Induk Santri (login identifier)
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  total_points INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  last_active_date DATE,
  has_debt BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk lookup NIS yang cepat
CREATE INDEX IF NOT EXISTS idx_profiles_nis ON profiles(nis);

-- Auto-create profile on user signup
-- Menyimpan NIS dari metadata (di-set saat signUp di AuthClient)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nis, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'nis',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- HABITS
-- ============================================================
CREATE TABLE habits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('good', 'bad')) NOT NULL,
  category TEXT CHECK (category IN ('health', 'mind', 'productivity', 'lifestyle', 'finance', 'other')) DEFAULT 'other',
  icon TEXT DEFAULT '⭐',
  color TEXT DEFAULT '#0AC682',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HABIT DAILY LOGS
-- ============================================================
CREATE TABLE habit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(habit_id, log_date)
);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  due_time TIME,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  category TEXT CHECK (category IN ('work', 'personal', 'health', 'finance', 'study', 'other')) DEFAULT 'other',
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INCOME RECORDS (Monthly allocation)
-- ============================================================
CREATE TABLE income_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  month INT CHECK (month BETWEEN 1 AND 12) NOT NULL,
  year INT NOT NULL,
  has_debt BOOLEAN DEFAULT false,
  alloc_needs DECIMAL(15,2),    -- 60%
  alloc_debt DECIMAL(15,2),     -- 20% or 0
  alloc_charity DECIMAL(15,2),  -- 10%
  alloc_savings DECIMAL(15,2),  -- 10% or 30%
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  category TEXT CHECK (category IN ('needs', 'debt', 'charity', 'savings', 'other')) NOT NULL,
  note TEXT,
  trans_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POINTS LOG
-- ============================================================
CREATE TABLE points_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  points INT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATION SETTINGS
-- ============================================================
CREATE TABLE notification_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  habit_reminder BOOLEAN DEFAULT true,
  habit_reminder_time TIME DEFAULT '08:00',
  money_reminder BOOLEAN DEFAULT true,
  money_reminder_time TIME DEFAULT '20:00',
  task_reminder BOOLEAN DEFAULT true,
  task_reminder_minutes INT DEFAULT 30,
  push_subscription JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create notification settings on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Profiles: read all (for leaderboard), write own
CREATE POLICY "Profiles are publicly readable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Habits: only own
CREATE POLICY "Users manage own habits" ON habits USING (auth.uid() = user_id);

-- Habit logs: only own
CREATE POLICY "Users manage own habit logs" ON habit_logs USING (auth.uid() = user_id);

-- Tasks: only own
CREATE POLICY "Users manage own tasks" ON tasks USING (auth.uid() = user_id);

-- Income: only own
CREATE POLICY "Users manage own income" ON income_records USING (auth.uid() = user_id);

-- Transactions: only own
CREATE POLICY "Users manage own transactions" ON transactions USING (auth.uid() = user_id);

-- Points log: read all (leaderboard), insert own
CREATE POLICY "Points log is publicly readable" ON points_log FOR SELECT USING (true);
CREATE POLICY "Users insert own points" ON points_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notification settings: only own
CREATE POLICY "Users manage own notifications" ON notification_settings USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, log_date);
CREATE INDEX idx_habit_logs_habit_date ON habit_logs(habit_id, log_date);
CREATE INDEX idx_tasks_user_date ON tasks(user_id, due_date);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, trans_date);
CREATE INDEX idx_points_log_user ON points_log(user_id, created_at DESC);

-- ============================================================
-- LEADERBOARD VIEW
-- ============================================================
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.total_points,
  p.streak_days,
  p.last_active_date,
  RANK() OVER (ORDER BY p.total_points DESC) as rank,
  -- Points this week
  COALESCE(
    (SELECT SUM(pl.points)
     FROM points_log pl
     WHERE pl.user_id = p.id
     AND pl.created_at >= NOW() - INTERVAL '7 days'),
    0
  ) as weekly_points,
  -- Habits completed today
  COALESCE(
    (SELECT COUNT(*)
     FROM habit_logs hl
     WHERE hl.user_id = p.id
     AND hl.log_date = CURRENT_DATE
     AND hl.completed = true),
    0
  ) as habits_today
FROM profiles p
ORDER BY total_points DESC;

-- Grant access to view
GRANT SELECT ON leaderboard TO authenticated, anon;

-- ============================================================
-- FUNCTION: Add points to user
-- ============================================================
CREATE OR REPLACE FUNCTION add_points(
  p_user_id UUID,
  p_action TEXT,
  p_points INT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Insert points log
  INSERT INTO points_log (user_id, action, points, metadata)
  VALUES (p_user_id, p_action, p_points, p_metadata);

  -- Update total points on profile
  UPDATE profiles
  SET
    total_points = total_points + p_points,
    last_active_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
