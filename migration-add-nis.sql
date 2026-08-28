-- ============================================================
-- MIGRATION: Tambah NIS ke tabel profiles yang sudah ada
-- Jalankan di Supabase SQL Editor jika database sudah ada sebelumnya
-- ============================================================

-- 1. Tambah kolom NIS (aman dijalankan berulang kali)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nis TEXT UNIQUE;

-- 2. Index untuk pencarian NIS yang cepat
CREATE INDEX IF NOT EXISTS idx_profiles_nis ON profiles(nis);

-- 3. Update fungsi handle_new_user untuk simpan NIS dari metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nis, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'nis',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    nis       = EXCLUDED.nis,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Verifikasi (opsional — lihat struktur tabel)
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'profiles' ORDER BY ordinal_position;
