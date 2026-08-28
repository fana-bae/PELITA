import { Suspense } from 'react'
import AuthClient from './LoginClient'

export const metadata = {
  title: 'Masuk — Pelita',
  description: 'Login ke Pelita untuk mulai track habit, tugas, dan keuanganmu.',
}

// Suspense diperlukan karena AuthClient menggunakan useSearchParams()
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthClient />
    </Suspense>
  )
}
