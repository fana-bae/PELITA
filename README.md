# 🌱 LifeTracker Pro

Aplikasi web all-in-one untuk tracking kebiasaan, tugas, keuangan, dan kompetisi leaderboard.

## ✨ Fitur Utama

- **Habit Tracker** — Good habits & bad habits dengan checklist harian, streak counter, weekly grid
- **Task Calendar** — Kalender interaktif untuk kelola tugas dengan prioritas dan notifikasi deadline
- **Leaderboard** — Sistem poin & gamifikasi, badge, kompetisi antar pengguna (most active & most lazy)
- **Money Tracker** — Auto-alokasi 60/20/10/10 (kebutuhan/hutang/sedekah/tabungan), catat transaksi, grafik
- **Push Notifications** — Reminder habit jam 08.00, keuangan jam 20.00, deadline tugas 30 menit sebelumnya

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email + Google) |
| Styling | CSS Modules + Vanilla CSS |
| Notifications | Web Push API + Vercel Cron Jobs |
| Deploy | Vercel |

## 🚀 Cara Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd lifetracker-pro
npm install
```

### 2. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka SQL Editor → paste isi file `supabase-schema.sql` → Run
3. Aktifkan Google Auth di Authentication → Providers (opsional)

### 3. Generate VAPID Keys (untuk Push Notifications)

```bash
npx web-push generate-vapid-keys
```

### 4. Setup Environment Variables

Buat file `.env.local` dari template:

```bash
cp .env.local.example .env.local
```

Isi dengan data dari Supabase Dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BxxxxxxX...
VAPID_PRIVATE_KEY=xxxxxxx...
VAPID_SUBJECT=mailto:kamu@email.com
CRON_SECRET=random-secret-string-yang-panjang
```

### 5. Jalankan Lokal

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 📦 Deploy ke Vercel

1. Push ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan Environment Variables yang sama di Vercel Dashboard
4. Deploy! Cron jobs otomatis aktif dari `vercel.json`

## 🗄️ Struktur Direktori

```
lifetracker-pro/
├── app/
│   ├── (auth)/          # Login & Register pages
│   ├── (app)/           # Protected app pages
│   │   ├── dashboard/
│   │   ├── habits/
│   │   ├── tasks/
│   │   ├── leaderboard/
│   │   ├── money/
│   │   └── settings/
│   └── api/
│       ├── auth/        # Auth callback & signout
│       └── cron/        # Push notification cron jobs
├── components/
│   └── layout/          # AppShell (sidebar + bottom nav)
├── lib/
│   ├── supabase/        # Client & server Supabase clients
│   ├── actions/         # Server Actions (habits, tasks, money)
│   └── utils/           # Calculators & helpers
├── public/
│   ├── sw.js            # Service Worker
│   └── manifest.json    # PWA Manifest
└── supabase-schema.sql  # Database schema
```

## 💰 Sistem Alokasi Keuangan

| Kategori | Persentase (Ada Hutang) | Persentase (Bebas Hutang) |
|----------|------------------------|--------------------------|
| 🏠 Kebutuhan | 60% | 60% |
| 💳 Hutang | 20% | 0% (dialihkan ke tabungan) |
| 🤲 Sedekah | 10% | 10% |
| 🏦 Tabungan | 10% | 30% |

## 🏆 Sistem Poin

| Aksi | Poin |
|------|------|
| ✅ Selesaikan good habit | +10 |
| 🚫 Resist bad habit | +5 |
| 📋 Selesaikan task | +15 |
| 💰 Catat transaksi | +3 |
| 🔑 Login harian | +2 |
| 🔥 Streak 7 hari | +50 bonus |
| 🔥 Streak 30 hari | +200 bonus |
