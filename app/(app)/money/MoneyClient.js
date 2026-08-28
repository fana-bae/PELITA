'use client'

import { useState, useTransition } from 'react'
import { formatCurrency, calculateAllocation } from '@/lib/utils/money-calc'
import { createTransaction, deleteTransaction } from '@/lib/actions/money'
import styles from './Money.module.css'

const CATEGORY_ICONS = {
  needs: '🛒', debt: '💳', charity: '🤝', savings: '🏦', other: '📦', income: '💵'
}

const CATEGORY_LABELS = {
  needs: 'Kebutuhan Pokok',
  debt: 'Cicilan/Hutang',
  charity: 'Sedekah/Amal',
  savings: 'Tabungan/Investasi',
  other: 'Lainnya',
}

// ── Smooth cubic bezier path builder ─────────────────────────
function buildSmoothPath(points, tension = 0.4) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1] || curr
    const prevPrev = points[i - 2] || prev
    // Control points
    const cp1x = prev.x + (curr.x - prevPrev.x) * tension
    const cp1y = prev.y + (curr.y - prevPrev.y) * tension
    const cp2x = curr.x - (next.x - prev.x) * tension
    const cp2y = curr.y - (next.y - prev.y) * tension
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`
  }
  return d
}

function SmoothLineChart({ data }) {
  if (!data || data.length === 0) return null

  // Filter to just days that have passed (or have data)
  const today = new Date().getDate()
  const visibleData = data.slice(0, today)
  
  if (visibleData.length === 0) return null

  const maxVal = Math.max(...visibleData.map(d => Math.max(d.income, d.expense, 1)), 1)
  const W = 1000
  const H = 220
  const padX = 20
  const padY = 24

  const getX = (i) => padX + (i / Math.max(visibleData.length - 1, 1)) * (W - padX * 2)
  const getY = (val) => H - padY - (val / maxVal) * (H - padY * 2)

  const incomePoints = visibleData.map((d, i) => ({ x: getX(i), y: getY(d.income) }))
  const expensePoints = visibleData.map((d, i) => ({ x: getX(i), y: getY(d.expense) }))

  const incomePath = buildSmoothPath(incomePoints)
  const expensePath = buildSmoothPath(expensePoints)

  // Area fills (closed path)
  const incomeArea = incomePath + ` L ${getX(visibleData.length - 1)} ${H - padY} L ${getX(0)} ${H - padY} Z`
  const expenseArea = expensePath + ` L ${getX(visibleData.length - 1)} ${H - padY} L ${getX(0)} ${H - padY} Z`

  // Y axis labels
  const yLabels = [maxVal, maxVal * 0.5, 0]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {yLabels.map((v, i) => (
        <g key={i}>
          <line x1={padX} y1={getY(v)} x2={W - padX} y2={getY(v)} stroke="#E2E8F0" strokeWidth="1" />
        </g>
      ))}

      {/* Area fills */}
      <path d={expenseArea} fill="url(#expenseGrad)" />
      <path d={incomeArea} fill="url(#incomeGrad)" />

      {/* Lines */}
      <path d={expensePath} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={incomePath} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots on data points with value */}
      {visibleData.map((d, i) => (
        <g key={i}>
          {d.income > 0 && (
            <circle cx={getX(i)} cy={getY(d.income)} r="3.5" fill="#fff" stroke="#10B981" strokeWidth="2" />
          )}
          {d.expense > 0 && (
            <circle cx={getX(i)} cy={getY(d.expense)} r="3.5" fill="#fff" stroke="#F59E0B" strokeWidth="2" />
          )}
        </g>
      ))}

      {/* X-axis date labels (show every ~5 days) */}
      {visibleData.map((d, i) => {
        if (i === 0 || (i + 1) % 5 === 0 || i === visibleData.length - 1) {
          return (
            <text key={i} x={getX(i)} y={H - 4} textAnchor="middle" fontSize="22" fill="#94A3B8">
              {d.date}
            </text>
          )
        }
        return null
      })}
    </svg>
  )
}

export default function MoneyClient({ financeOverview, transactions, userId }) {
  const [isPending, startTransition] = useTransition()
  const [showTxModal, setShowTxModal] = useState(false)
  const [showCalcModal, setShowCalcModal] = useState(false)
  const [txType, setTxType] = useState('expense')

  const [txForm, setTxForm] = useState({
    type: 'expense', amount: '', category: 'needs', note: '',
    date: new Date().toISOString().split('T')[0]
  })

  const [calcInput, setCalcInput] = useState('')
  const [calcHasDebt, setCalcHasDebt] = useState(false)
  const alloc = calculateAllocation(Number(calcInput) || 0, calcHasDebt)

  function openModal(type) {
    setTxType(type)
    setTxForm(f => ({ ...f, type, category: type === 'income' ? 'other' : 'needs' }))
    setShowTxModal(true)
  }

  async function handleTxSubmit(e) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await createTransaction({ ...txForm, type: txType })
        setShowTxModal(false)
        setTxForm({ type: 'expense', amount: '', category: 'needs', note: '', date: new Date().toISOString().split('T')[0] })
      } catch (err) {
        alert(err.message)
      }
    })
  }

  async function handleDelete(id) {
    if (!confirm('Hapus transaksi ini?')) return
    startTransition(async () => { await deleteTransaction(id) })
  }

  const balance = financeOverview.totalBalance
  const balanceColor = balance >= 0 ? '#34D399' : '#F87171' // Bright green/red for dark background

  return (
    <div className={`${styles.page} page-enter`}>

      {/* ── Balance Hero Card ── */}
      <div className={styles.heroCard}>
        <div className={styles.heroLeft}>
          <p className={styles.heroLabel}>Total Saldo</p>
          <h1 className={styles.heroBalance} style={{ color: balanceColor }}>
            {formatCurrency(balance)}
          </h1>
          <p className={styles.heroSub}>
            {financeOverview.isProfit
              ? `↑ Profit ${financeOverview.profitPercentage}% bulan ini`
              : `↓ Defisit ${financeOverview.profitPercentage}% bulan ini`}
          </p>
        </div>
        <div className={styles.heroRight}>
          <button className={styles.btnIncome} onClick={() => openModal('income')}>
            + Pemasukan
          </button>
          <button className={styles.btnExpense} onClick={() => openModal('expense')}>
            + Pengeluaran
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.incomeCard}`}>
          <div className={styles.summaryTop}>
            <div className={`${styles.summaryIcon} ${styles.incomeIcon}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            </div>
            <span className={styles.summaryChange}>Pemasukan</span>
          </div>
          <p className={styles.summaryVal}>{formatCurrency(financeOverview.monthlyIncome)}</p>
          <p className={styles.summaryMeta}>Bulan ini</p>
        </div>
        <div className={`${styles.summaryCard} ${styles.expenseCard}`}>
          <div className={styles.summaryTop}>
            <div className={`${styles.summaryIcon} ${styles.expenseIcon}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            </div>
            <span className={styles.summaryChange}>Pengeluaran</span>
          </div>
          <p className={styles.summaryVal}>{formatCurrency(financeOverview.monthlyExpense)}</p>
          <p className={styles.summaryMeta}>Bulan ini</p>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <div>
            <h2 className={styles.chartTitle}>Tren Keuangan Bulanan</h2>
            <p className={styles.chartSub}>{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className={styles.chartLegend}>
            <span className={styles.legendDot} style={{ background: '#10B981' }} /> Pemasukan
            <span className={styles.legendDot} style={{ background: '#F59E0B' }} /> Pengeluaran
          </div>
        </div>
        <div className={styles.chartArea}>
          <SmoothLineChart data={financeOverview.chartData} />
        </div>
      </div>

      {/* ── Quick Action ── */}
      <button className={styles.calcBtn} onClick={() => setShowCalcModal(true)}>
        <span>🧮</span>
        <div>
          <p className={styles.calcBtnTitle}>Kalkulator Management Keuangan Abah Yai</p>
          <p className={styles.calcBtnSub}>Simulasikan alokasi gaji bulanan Anda</p>
        </div>
        <span className={styles.calcBtnArrow}>›</span>
      </button>

      {/* ── Transaction History ── */}
      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <h2 className={styles.chartTitle}>Riwayat Transaksi</h2>
          <span className={styles.txCount}>{transactions.length} transaksi</span>
        </div>
        <div className={styles.txList}>
          {transactions.map(tx => (
            <div key={tx.id} className={styles.txItem}>
              <div className={styles.txLeft}>
                <div className={`${styles.txIcon} ${tx.type === 'income' ? styles.txIconInc : styles.txIconExp}`}>
                  {tx.type === 'income' ? CATEGORY_ICONS.income : CATEGORY_ICONS[tx.category] || CATEGORY_ICONS.other}
                </div>
                <div>
                  <p className={styles.txCat}>{tx.type === 'income' ? 'Pemasukan' : CATEGORY_LABELS[tx.category] || 'Lainnya'}</p>
                  <p className={styles.txDate}>
                    {new Date(tx.trans_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {tx.note && <> · <em>{tx.note}</em></>}
                  </p>
                </div>
              </div>
              <div className={styles.txRight}>
                <p className={`${styles.txAmount} ${tx.type === 'income' ? styles.inc : styles.exp}`}>
                  {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
                </p>
                <button onClick={() => handleDelete(tx.id)} className={styles.txDelete} title="Hapus">✕</button>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className={styles.emptyState}>
              <p>💸 Belum ada transaksi. Mulai catat sekarang!</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Add Transaction ── */}
      {showTxModal && (
        <div className="modal-overlay" onClick={() => setShowTxModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal__header">
              <h2 className="modal__title">{txType === 'income' ? '+ Tambah Pemasukan' : '+ Tambah Pengeluaran'}</h2>
              <button className="modal__close" onClick={() => setShowTxModal(false)}>✕</button>
            </div>
            <form onSubmit={handleTxSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className={`btn ${txType === 'expense' ? 'btn--primary' : 'btn--ghost'}`}
                  style={{ flex: 1 }} onClick={() => setTxType('expense')}>Pengeluaran</button>
                <button type="button" className={`btn ${txType === 'income' ? 'btn--primary' : 'btn--ghost'}`}
                  style={{ flex: 1, ...(txType === 'income' ? { background: '#10B981' } : {}) }}
                  onClick={() => setTxType('income')}>Pemasukan</button>
              </div>
              <div className="input-group">
                <label className="input-label">Jumlah (Rp)</label>
                <input type="number" className="input" required min="1"
                  value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              {txType === 'expense' && (
                <div className="input-group">
                  <label className="input-label">Kategori Pengeluaran</label>
                  <select className="input" value={txForm.category} onChange={e => setTxForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="needs">🛒 Kebutuhan Pokok (Makan, Listrik, Sewa)</option>
                    <option value="debt">💳 Cicilan / Hutang</option>
                    <option value="savings">🏦 Tabungan / Investasi</option>
                    <option value="charity">🤝 Sedekah / Amal</option>
                    <option value="other">📦 Keinginan / Lainnya</option>
                  </select>
                </div>
              )}
              <div className="input-group">
                <label className="input-label">Tanggal</label>
                <input type="date" className="input" required
                  value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Catatan (Opsional)</label>
                <input type="text" className="input" maxLength={50} placeholder="misal: Bayar kos, Beli makan siang..."
                  value={txForm.note} onChange={e => setTxForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn--blue" disabled={isPending}>
                {isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Calculator ── */}
      {showCalcModal && (
        <div className="modal-overlay" onClick={() => setShowCalcModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal__header">
              <h2 className="modal__title">🧮 Kalkulator Management Keuangan Abah Yai</h2>
              <button className="modal__close" onClick={() => setShowCalcModal(false)}>✕</button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--dark-3)', marginBottom: '20px' }}>
              Masukkan gaji/pemasukan Anda. Hasilnya adalah template alokasi yang direkomendasikan — <strong>tidak tersimpan</strong>.
            </p>
            <div className="input-group">
              <label className="input-label">Simulasikan Pemasukan (Rp)</label>
              <input type="number" className="input" placeholder="Contoh: 5.000.000"
                value={calcInput} onChange={e => setCalcInput(e.target.value)} autoFocus />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0 20px' }}>
              <input type="checkbox" id="calcDebt" checked={calcHasDebt} onChange={e => setCalcHasDebt(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              <label htmlFor="calcDebt" style={{ fontSize: '0.875rem', cursor: 'pointer', color: 'var(--dark-2)' }}>Saya punya cicilan/hutang bulanan</label>
            </div>
            <div className={styles.calcGrid}>
              {[
                { label: 'Kebutuhan Pokok', pct: '60%', icon: '🛒', val: alloc.needs, color: '#3B82F6' },
                { label: 'Cicilan/Hutang', pct: calcHasDebt ? '20%' : '0%', icon: '💳', val: alloc.debt, color: '#EF4444' },
                { label: 'Tabungan/Investasi', pct: calcHasDebt ? '10%' : '30%', icon: '🏦', val: alloc.savings, color: '#10B981' },
                { label: 'Sedekah/Amal', pct: '10%', icon: '🤝', val: alloc.charity, color: '#F59E0B' },
              ].map((item, i) => (
                <div key={i} className={styles.calcItem} style={{ borderLeft: `4px solid ${item.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                    <div>
                      <p className={styles.calcLabel}>{item.label}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--dark-3)' }}>{item.pct} dari pemasukan</p>
                    </div>
                  </div>
                  <span className={styles.calcVal} style={{ color: item.color }}>{formatCurrency(item.val)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
