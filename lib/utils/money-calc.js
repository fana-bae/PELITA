/**
 * Money Calculator — 60/20/10/10 Rule
 * Jika tidak ada hutang: 20% hutang dialihkan ke tabungan → 30% total tabungan
 */

export function calculateAllocation(income, hasDebt) {
  if (!income || income <= 0) {
    return {
      needs: 0,
      debt: 0,
      charity: 0,
      savings: 0,
    }
  }

  const needs = income * 0.6
  const debt = hasDebt ? income * 0.2 : 0
  const charity = income * 0.1
  const savings = hasDebt ? income * 0.1 : income * 0.3 // 10% or 30% if no debt

  return {
    needs: Math.round(needs),
    debt: Math.round(debt),
    charity: Math.round(charity),
    savings: Math.round(savings),
  }
}

export function formatCurrency(amount, currency = 'IDR') {
  if (amount === null || amount === undefined) return 'Rp 0'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getCategorySpending(transactions, category) {
  return transactions
    .filter(t => t.type === 'expense' && t.category === category)
    .reduce((sum, t) => sum + Number(t.amount), 0)
}

export function getRemainingBalance(allocation, transactions) {
  const categories = ['needs', 'debt', 'charity', 'savings']
  const result = {}

  categories.forEach(cat => {
    const spent = getCategorySpending(transactions, cat)
    result[cat] = (allocation[cat] || 0) - spent
  })

  return result
}

export function getSpendingPercentage(spent, allocated) {
  if (!allocated || allocated === 0) return 0
  return Math.min((spent / allocated) * 100, 100)
}

export const CATEGORY_CONFIG = {
  needs: {
    label: 'Kebutuhan',
    icon: '🏠',
    color: '#0AC682',
    percentage: 60,
    description: 'Makan, listrik, transportasi, dll',
  },
  debt: {
    label: 'Hutang',
    icon: '💳',
    color: '#FF5B5B',
    percentage: 20,
    description: 'Cicilan, pinjaman, dll',
  },
  charity: {
    label: 'Sedekah',
    icon: '🤲',
    color: '#F79FC3',
    percentage: 10,
    description: 'Zakat, infaq, sedekah',
  },
  savings: {
    label: 'Tabungan',
    icon: '🏦',
    color: '#3787FF',
    percentage: 10,
    description: 'Investasi, dana darurat',
  },
}

export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]
