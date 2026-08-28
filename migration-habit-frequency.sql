-- migration-habit-frequency.sql
-- Menambahkan kolom frequency dan frequency_target ke tabel habits

ALTER TABLE habits
ADD COLUMN IF NOT EXISTS frequency text DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS frequency_target integer DEFAULT 1;

-- Update data lama jika ada yang null
UPDATE habits SET frequency = 'daily' WHERE frequency IS NULL;
UPDATE habits SET frequency_target = 1 WHERE frequency_target IS NULL;

-- Untuk migrasi supabase, cukup jalankan ini di SQL Editor.
