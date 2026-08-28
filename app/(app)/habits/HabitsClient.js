'use client'

import { useState, useTransition } from 'react'
import { toggleHabitLog, createHabit, deleteHabit } from '@/lib/actions/habits'
import styles from './Habits.module.css'

const CATEGORIES = [
  { value: 'all', label: 'Semua Kategori', icon: '✨' },
  { value: 'spiritual', label: 'Spiritual', icon: '🕌' },
  { value: 'health', label: 'Kesehatan', icon: '💪' },
  { value: 'mind', label: 'Mental', icon: '🧠' },
  { value: 'productivity', label: 'Produktivitas', icon: '⚡' },
  { value: 'lifestyle', label: 'Gaya Hidup', icon: '🌱' },
  { value: 'finance', label: 'Keuangan', icon: '💰' },
  { value: 'other', label: 'Lainnya', icon: '⭐' },
]

const FREQUENCIES = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
]

const GOOD_ICONS = ['💪', '🏃', '📖', '💧', '🧘', '🥗', '😴', '✍️', '🎯', '🙏', '🌿', '🎵', '🕌', '🕋']
const BAD_ICONS = ['🚭', '🚫', '❌', '🍔', '📵', '😤', '🍷', '💸', '🎰', '😴', '🛋️', '📺']

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

// Helper to get dates for current week (Mon-Sun)
function getCurrentWeekDates() {
  const curr = new Date()
  const week = []
  // Get Monday as first day of week
  const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1)
  for (let i = 0; i < 7; i++) {
    const day = new Date(curr.setDate(first + i))
    week.push(day.toISOString().split('T')[0])
  }
  return week
}

export default function HabitsClient({ habits: initialHabits, habitLogs, userId }) {
  const [activeTab, setActiveTab] = useState('good')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeFreq, setActiveFreq] = useState('daily')
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('good')
  
  const [habits, setHabits] = useState(initialHabits)
  const [logs, setLogs] = useState(habitLogs)
  const [isPending, startTransition] = useTransition()
  
  const [formData, setFormData] = useState({
    name: '', type: 'good', category: 'health', icon: '💪', description: '', frequency: 'daily', frequency_target: 1
  })

  // Group logs by habit_id and log_date
  const logMap = {}
  logs.forEach(l => {
    if (!logMap[l.habit_id]) logMap[l.habit_id] = {}
    logMap[l.habit_id][l.log_date] = l.completed
  })

  const today = new Date().toISOString().split('T')[0]
  const currentWeek = getCurrentWeekDates()

  // Filter habits
  const filteredHabits = habits.filter(h => 
    h.type === activeTab && 
    (activeCategory === 'all' || h.category === activeCategory) &&
    (h.frequency || 'daily') === activeFreq
  )

  const goodHabits = habits.filter(h => h.type === 'good')
  const badHabits = habits.filter(h => h.type === 'bad')
  const goodDone = goodHabits.filter(h => logMap[h.id]?.[today]).length
  const badDone = badHabits.filter(h => logMap[h.id]?.[today]).length

  async function handleToggle(habitId, targetDate) {
    // Optimistic update
    setLogs(prev => {
      const existingIdx = prev.findIndex(l => l.habit_id === habitId && l.log_date === targetDate)
      if (existingIdx >= 0) {
        const newLogs = [...prev]
        newLogs[existingIdx] = { ...newLogs[existingIdx], completed: !newLogs[existingIdx].completed }
        return newLogs
      } else {
        return [...prev, { habit_id: habitId, completed: true, log_date: targetDate }]
      }
    })

    startTransition(async () => {
      try {
        await toggleHabitLog(habitId, activeTab, targetDate)
      } catch (e) {
        console.error(e)
        alert('Gagal mengupdate habit')
        // Revert UI will happen on next refresh if we don't fully manage rollback, 
        // but simple reload is safe enough for demo
      }
    })
  }

  async function handleCreateHabit(e) {
    e.preventDefault()
    startTransition(async () => {
      try {
        const newHabit = await createHabit({ ...formData, type: formType })
        setHabits(prev => [...prev, newHabit])
        setShowForm(false)
        setFormData({ name: '', type: 'good', category: 'health', icon: '💪', description: '', frequency: 'daily', frequency_target: 1 })
      } catch (e) {
        console.error(e)
        alert('Gagal membuat habit')
      }
    })
  }

  async function handleDelete(habitId) {
    if (!confirm('Hapus habit ini?')) return
    startTransition(async () => {
      await deleteHabit(habitId)
      setHabits(prev => prev.filter(h => h.id !== habitId))
    })
  }

  function openForm(type) {
    setFormType(type)
    setFormData(prev => ({
      ...prev,
      type,
      icon: type === 'good' ? '💪' : '🚭',
    }))
    setShowForm(true)
  }

  // Calculate category stats
  const catStats = CATEGORIES.slice(1).map(cat => ({
    ...cat,
    count: habits.filter(h => h.type === activeTab && h.category === cat.value).length
  }))

  return (
    <div className={`${styles.page} page-enter`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={`${styles.title} font-outfit`}>Habit Tracker</h1>
          <p className={styles.subtitle}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Type Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'good' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('good')}
        >
          <span>✅ Habit Baik</span>
          <span className={styles.tabBadge}>{goodDone}/{goodHabits.length} Hari Ini</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'bad' ? styles.tabActiveBad : ''}`}
          onClick={() => setActiveTab('bad')}
        >
          <span>🚫 Habit Buruk</span>
          <span className={styles.tabBadge}>{badDone}/{badHabits.length} Hari Ini</span>
        </button>
      </div>

      {/* Main Layout: Habits (Left) + Categories (Right) */}
      <div className={styles.mainLayout}>
        
        {/* Left Column: Habit List */}
        <div className={styles.habitsCol}>
          
          {/* Frequency Filters */}
          <div className={styles.freqFilters}>
            {FREQUENCIES.map(f => (
              <button
                key={f.value}
                className={`${styles.freqBtn} ${activeFreq === f.value ? styles.freqBtnActive : ''}`}
                onClick={() => setActiveFreq(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className={styles.habitList}>
            {filteredHabits.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyIcon}>{activeTab === 'good' ? '🌱' : '🛡️'}</p>
                <p className={styles.emptyTitle}>Belum ada habit {activeFreq}</p>
                <button className="btn btn--primary" onClick={() => openForm(activeTab)}>
                  + Tambah Habit
                </button>
              </div>
            ) : (
              <div className={styles.habitTable}>
                {/* Table Header: Days of Week for Daily, or just progress for Weekly/Monthly */}
                {activeFreq === 'daily' && (
                  <div className={styles.tableHeader}>
                    <div className={styles.thName}>Habits</div>
                    <div className={styles.thDays}>
                      {DAYS.map(d => <div key={d} className={styles.thDay}>{d.charAt(0)}</div>)}
                    </div>
                  </div>
                )}

                {/* Table Body */}
                {filteredHabits.map(habit => {
                  const target = habit.frequency_target || 1
                  let completedCount = 0
                  
                  if (activeFreq === 'daily') {
                    // Count how many days in current week are completed
                    currentWeek.forEach(date => {
                      if (logMap[habit.id]?.[date]) completedCount++
                    })
                  } else {
                    // For weekly/monthly, just check if it's done this week/month (simplified)
                    // Currently we just count any logs in the current period.
                    // For simplicity in this UI, we just show a button to check it off today.
                    completedCount = Object.keys(logMap[habit.id] || {}).length
                  }

                  return (
                    <div key={habit.id} className={styles.tableRow}>
                      <div className={styles.trName}>
                        <span className={styles.habitEmoji}>{habit.icon}</span>
                        <div className={styles.habitInfo}>
                          <span className={styles.habitTitle}>{habit.name}</span>
                          <span className={styles.habitDesc}>
                            {activeFreq === 'daily' ? 'Setiap Hari' : `${target}x / ${activeFreq === 'weekly' ? 'Minggu' : 'Bulan'}`}
                          </span>
                        </div>
                      </div>

                      {activeFreq === 'daily' ? (
                        <div className={styles.trDays}>
                          {currentWeek.map(date => {
                            const isDone = logMap[habit.id]?.[date]
                            const isFuture = new Date(date) > new Date(today)
                            return (
                              <button
                                key={date}
                                disabled={isFuture || isPending}
                                onClick={() => handleToggle(habit.id, date)}
                                className={`${styles.dayCheck} ${isDone ? styles.dayCheckDone : ''} ${isFuture ? styles.dayCheckFuture : ''}`}
                              >
                                {isDone ? '✓' : ''}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className={styles.trProgress}>
                          <button
                            onClick={() => handleToggle(habit.id, today)}
                            disabled={isPending}
                            className={`${styles.dayCheck} ${logMap[habit.id]?.[today] ? styles.dayCheckDone : ''}`}
                          >
                            {logMap[habit.id]?.[today] ? '✓' : '+'}
                          </button>
                          <span className={styles.progressText}>{completedCount}/{target}</span>
                        </div>
                      )}

                      <button className={styles.deleteBtn} onClick={() => handleDelete(habit.id)}>🗑️</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          <button className={styles.addBtn} onClick={() => openForm(activeTab)}>
            + Tambah {activeTab === 'good' ? 'Habit Baik' : 'Habit Buruk'}
          </button>
        </div>

        {/* Right Column: Categories */}
        <div className={styles.categoriesCol}>
          <div className={styles.catHeader}>
            <h3>Kategori</h3>
          </div>
          <div className={styles.catList}>
            <button
              className={`${styles.catCard} ${activeCategory === 'all' ? styles.catCardActive : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              <span className={styles.catIcon}>✨</span>
              <div className={styles.catInfo}>
                <span className={styles.catName}>Semua</span>
                <span className={styles.catCount}>{habits.filter(h => h.type === activeTab).length} habit</span>
              </div>
              <span className={styles.catArrow}>›</span>
            </button>

            {catStats.map(cat => (
              <button
                key={cat.value}
                className={`${styles.catCard} ${activeCategory === cat.value ? styles.catCardActive : ''}`}
                onClick={() => setActiveCategory(cat.value)}
              >
                <span className={styles.catIcon}>{cat.icon}</span>
                <div className={styles.catInfo}>
                  <span className={styles.catName}>{cat.label}</span>
                  <span className={styles.catCount}>{cat.count} habit</span>
                </div>
                <span className={styles.catArrow}>›</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Add Habit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                {formType === 'good' ? '✅ Tambah Habit Baik' : '🚫 Tambah Habit Buruk'}
              </h2>
              <button className="modal__close" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateHabit} className={styles.form}>
              <div className="input-group">
                <label className="input-label">Nama Habit</label>
                <input
                  className="input"
                  placeholder={formType === 'good' ? 'Contoh: Sholat Dhuha' : 'Contoh: Begadang'}
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Frekuensi</label>
                  <select
                    className="input"
                    value={formData.frequency}
                    onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                  >
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan</option>
                    <option value="monthly">Bulanan</option>
                  </select>
                </div>
                {formData.frequency !== 'daily' && (
                  <div className="input-group" style={{ width: '100px' }}>
                    <label className="input-label">Target (Kali)</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={formData.frequency_target}
                      onChange={e => setFormData(prev => ({ ...prev, frequency_target: e.target.value }))}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="input-group">
                <label className="input-label">Kategori</label>
                <div className={styles.categoryGrid}>
                  {CATEGORIES.slice(1).map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      className={`${styles.categoryBtn} ${formData.category === cat.value ? styles.categoryBtnActive : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Ikon</label>
                <div className={styles.iconGrid}>
                  {(formType === 'good' ? GOOD_ICONS : BAD_ICONS).map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={`${styles.iconBtn} ${formData.icon === icon ? styles.iconBtnActive : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, icon }))}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button
                  type="submit"
                  className={`btn ${formType === 'good' ? 'btn--primary' : 'btn--outline'}`}
                  disabled={isPending}
                  style={formType === 'bad' ? { borderColor: 'var(--yellow)', color: 'var(--yellow-dark)', background: 'var(--yellow-light)' } : {}}
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Habit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
