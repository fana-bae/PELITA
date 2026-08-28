'use server'

import { createClient } from '@/lib/supabase/server'
import { addPoints } from '@/lib/actions/points'
import { POINTS } from '@/lib/utils/points'
import { calculateAllocation } from '@/lib/utils/money-calc'
import {
  sanitizeText,
  assertEnum,
  assertPositiveNumber,
  assertBoolean,
  ValidationError,
  ALLOWED,
} from '@/lib/utils/validate'
import { revalidatePath } from 'next/cache'

// ── Helper: dapatkan user yang sedang login ───────────────────
async function getAuthUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return user
}

// ============================================================
// GET Income Record — verifikasi user sendiri
// ============================================================
export async function getCurrentMonthIncome(userId) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (userId !== user.id) throw new Error('Forbidden')

  const now = new Date()

  const { data, error } = await supabase
    .from('income_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', now.getMonth() + 1)
    .eq('year', now.getFullYear())
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

// ============================================================
// SET / UPDATE Income — validasi input ketat
// ============================================================
export async function setIncome(amount, hasDebt, description = null) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  let validAmount, validHasDebt, validDescription
  try {
    // Batasi income: minimal Rp 1 s/d Rp 999 Miliar
    validAmount      = assertPositiveNumber(amount, {
      min: 1,
      max: 999_000_000_000,
      fieldName: 'Jumlah pendapatan',
    })
    validHasDebt     = assertBoolean(hasDebt, 'Status hutang')
    validDescription = sanitizeText(description, {
      maxLength: 200,
      fieldName: 'Keterangan',
      required: false,
    })
  } catch (err) {
    if (err instanceof ValidationError) throw new Error(err.message)
    throw err
  }

  const now = new Date()
  const alloc = calculateAllocation(validAmount, validHasDebt)

  const recordData = {
    user_id:      user.id,
    amount:       validAmount,
    month:        now.getMonth() + 1,
    year:         now.getFullYear(),
    has_debt:     validHasDebt,
    alloc_needs:  alloc.needs,
    alloc_debt:   alloc.debt,
    alloc_charity: alloc.charity,
    alloc_savings: alloc.savings,
    description:  validDescription,
  }

  const { data, error } = await supabase
    .from('income_records')
    .upsert(recordData, { onConflict: 'user_id,month,year' })
    .select()
    .single()

  if (error) throw error

  await supabase
    .from('profiles')
    .update({ has_debt: validHasDebt })
    .eq('id', user.id)

  await addPoints(user.id, 'money_log', POINTS.MONEY_LOG, { action: 'set_income' })

  revalidatePath('/money')
  revalidatePath('/dashboard')
  return data
}

// ============================================================
// GET Transactions — verifikasi user sendiri
// ============================================================
export async function getTransactions(userId, filters = {}) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (userId !== user.id) throw new Error('Forbidden')

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('trans_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.month && filters.year) {
    const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`
    const endDate = new Date(filters.year, filters.month, 0).toISOString().split('T')[0]
    query = query.gte('trans_date', startDate).lte('trans_date', endDate)
  }

  if (filters.category && ALLOWED.TX_CATEGORY.includes(filters.category)) {
    query = query.eq('category', filters.category)
  }

  if (filters.type && ALLOWED.TX_TYPE.includes(filters.type)) {
    query = query.eq('type', filters.type)
  }

  // Batasi jumlah hasil maksimum 500
  const limit = Math.min(Math.max(1, Number(filters.limit) || 100), 500)
  const { data, error } = await query.limit(limit)

  if (error) throw error
  return data || []
}

// ============================================================
// CREATE Transaction — validasi semua input
// ============================================================
export async function createTransaction(formData) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  let type, amount, category, note, trans_date
  try {
    type      = assertEnum(formData.type, ALLOWED.TX_TYPE, 'Tipe transaksi')
    amount    = assertPositiveNumber(formData.amount, {
      min: 1,
      max: 999_000_000_000,
      fieldName: 'Jumlah transaksi',
    })
    category  = assertEnum(formData.category, ALLOWED.TX_CATEGORY, 'Kategori')
    note      = sanitizeText(formData.note, { maxLength: 200, fieldName: 'Catatan', required: false })
    // Validasi tanggal — jangan lebih dari 1 tahun ke depan/belakang
    const dateStr = formData.date || new Date().toISOString().split('T')[0]
    const dateVal = new Date(dateStr)
    const now = new Date()
    const oneYearAgo  = new Date(now); oneYearAgo.setFullYear(now.getFullYear() - 1)
    const oneYearAhead = new Date(now); oneYearAhead.setFullYear(now.getFullYear() + 1)
    if (isNaN(dateVal) || dateVal < oneYearAgo || dateVal > oneYearAhead) {
      throw new ValidationError('Tanggal transaksi tidak valid')
    }
    trans_date = dateStr
  } catch (err) {
    if (err instanceof ValidationError) throw new Error(err.message)
    throw err
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({ user_id: user.id, type, amount, category, note, trans_date })
    .select()
    .single()

  if (error) throw error

  await addPoints(user.id, 'money_log', POINTS.MONEY_LOG, { tx_id: data.id })

  revalidatePath('/money')
  revalidatePath('/dashboard')
  return data
}

// ============================================================
// DELETE Transaction
// ============================================================
export async function deleteTransaction(txId) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', txId)
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath('/money')
}

// ============================================================
// GET Monthly Summary — verifikasi user sendiri
// ============================================================
export async function getMonthlySummary(userId, year, month) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (userId !== user.id) throw new Error('Forbidden')

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('transactions')
    .select('category, type, amount')
    .eq('user_id', user.id)
    .gte('trans_date', startDate)
    .lte('trans_date', endDate)

  if (error) throw error

  const summary = {
    totalIncome: 0,
    totalExpense: 0,
    byCategory: { needs: 0, debt: 0, charity: 0, savings: 0, other: 0 },
  }

  ;(data || []).forEach(tx => {
    if (tx.type === 'income') {
      summary.totalIncome += Number(tx.amount)
    } else {
      summary.totalExpense += Number(tx.amount)
      summary.byCategory[tx.category] = (summary.byCategory[tx.category] || 0) + Number(tx.amount)
    }
  })

  return summary
}

// ============================================================
// GET Financial Overview (Standard Money Tracker)
// ============================================================
export async function getFinancialOverview(userId) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (userId !== user.id) throw new Error('Forbidden')

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const { data: allTx, error } = await supabase
    .from('transactions')
    .select('type, amount, trans_date')
    .eq('user_id', user.id)

  if (error) throw error

  let totalIncome = 0
  let totalExpense = 0
  let monthlyIncome = 0
  let monthlyExpense = 0

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
    date: i + 1,
    income: 0,
    expense: 0
  }))

  ;(allTx || []).forEach(tx => {
    const amt = Number(tx.amount)
    if (tx.type === 'income') totalIncome += amt
    if (tx.type === 'expense') totalExpense += amt
    
    // Check if tx is in current month (using strict string matching to avoid timezone issues)
    // trans_date is 'YYYY-MM-DD'
    const [y, m, d] = tx.trans_date.split('-')
    if (Number(y) === currentYear && Number(m) === currentMonth) {
      if (tx.type === 'income') monthlyIncome += amt
      if (tx.type === 'expense') monthlyExpense += amt
      
      const dayIndex = Number(d) - 1
      if (dayIndex >= 0 && dayIndex < daysInMonth) {
        if (tx.type === 'income') dailyData[dayIndex].income += amt
        if (tx.type === 'expense') dailyData[dayIndex].expense += amt
      }
    }
  })

  const totalBalance = totalIncome - totalExpense

  let profitPercentage = 0
  let isProfit = true
  if (monthlyIncome > 0) {
    if (monthlyIncome >= monthlyExpense) {
      profitPercentage = ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100
      isProfit = true
    } else {
      profitPercentage = ((monthlyExpense - monthlyIncome) / monthlyIncome) * 100
      isProfit = false
    }
  } else if (monthlyExpense > 0) {
    profitPercentage = 100
    isProfit = false
  }

  return {
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    profitPercentage: Math.round(profitPercentage),
    isProfit,
    chartData: dailyData
  }
}
