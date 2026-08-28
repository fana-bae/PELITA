import { createClient } from '@/lib/supabase/server'
import { getFinancialOverview, getTransactions } from '@/lib/actions/money'
import MoneyClient from './MoneyClient'

export const metadata = { title: 'Money Tracker — PELITA' }

export default async function MoneyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [financeOverview, transactions] = await Promise.all([
    getFinancialOverview(user.id),
    getTransactions(user.id, { limit: 100 }), // Fetch recent 100 tx
  ])

  return (
    <MoneyClient
      financeOverview={financeOverview}
      transactions={transactions}
      userId={user.id}
    />
  )
}
