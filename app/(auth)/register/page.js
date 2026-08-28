import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Daftar — PELITA',
  description: 'Buat akun PELITA gratis dan mulai perjalananmu.',
}

// Register is now integrated in the login page with slide animation
export default function RegisterPage() {
  redirect('/login')
}
