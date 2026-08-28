-- ============================================================
-- MIGRATION: Hapus semua data akun lama (Email based)
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Menghapus semua user dari tabel auth.users
-- Karena profil terhubung dengan ON DELETE CASCADE, semua profil terkait juga otomatis terhapus.
-- PERHATIAN: Pastikan Anda memang ingin menghapus semua akun (reset data santri/user).
DELETE FROM auth.users;

-- (Opsional) Jika hanya ingin menghapus user yang tidak memiliki format NIS (hanya email lama):
-- DELETE FROM auth.users WHERE email NOT LIKE '%@santri.pelita';
