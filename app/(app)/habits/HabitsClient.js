'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { toggleHabitLog, createHabit, deleteHabit } from '@/lib/actions/habits'
import styles from './Habits.module.css'

const CATEGORIES = [
  { value: 'health', label: 'Kesehatan', icon: '💪' },
  { value: 'mind', label: 'Mental', icon: '🧠' },
  { value: 'productivity', label: 'Produktivitas', icon: '⚡' },
  { value: 'lifestyle', label: 'Gaya Hidup', icon: '🌱' },
  { value: 'finance', label: 'Keuangan', icon: '💰' },
  { value: 'other', label: 'Lainnya', icon: '⭐' },
]

const GOOD_ICONS = ['💪', '🏃', '📖', '💧', '🧘', '🥗', '😴', '✍️', '🎯', '🙏', '🌿', '🎵']
const BAD_ICONS = ['🚭', '🚫', '❌', '🍔', '📵', '😤', '🍷', '💸', '🎰', '😴', '🛋️', '📺']

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export default function HabitsClient({ habits: initialHabits, habitLogs, userId }) {
  const [activeTab, setActiveTab] = useState('good')
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('good')
  const [habits, setHabits] = useState(initialHabits)
  const [logs, setLogs] = useState(habitLogs)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    name: '', type: 'good', category: 'health', icon: '💪', description: ''
  })

  const logMap = Object.fromEntries(logs.map(l => [l.habit_id, l]))
  const goodHabits = habits.filter(h => h.type === 'good')
  const badHabits = habits.filter(h => h.type === 'bad')
  const displayHabits = activeTab === 'good' ? goodHabits : badHabits

  const goodDone = goodHabits.filter(h => logMap[h.id]?.completed).length
  const badDone = badHabits.filter(h => logMap[h.id]?.completed).length

  // Get last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  async function handleToggle(habitId, habitType) {
    // Optimistic update
    setLogs(prev => {
      const existing = prev.find(l => l.habit_id === habitId)
      if (existing) {
        return prev.map(l => l.habit_id === habitId
          ? { ...l, completed: !l.completed }
          : l
        )
      } else {
        return [...prev, { habit_id: habitId, completed: true, log_date: new Date().toISOString().split('T')[0] }]
      }
    })

    startTransition(async () => {
      try {
        await toggleHabitLog(habitId, habitType)
      } catch (e) {
        console.error(e)
        // Revert on error
        setLogs(prev => prev.map(l =>
          l.habit_id === habitId ? { ...l, completed: !l.completed } : l
        ))
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
        setFormData({ name: '', type: 'good', category: 'health', icon: '💪', description: '' })
      } catch (e) {
        console.error(e)
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

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          id="tab-good-habits"
          className={`${styles.tab} ${activeTab === 'good' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('good')}
        >
          <span>✅ Habit Baik</span>
          <span className={styles.tabBadge}>{goodDone}/{goodHabits.length}</span>
        </button>
        <button
          id="tab-bad-habits"
          className={`${styles.tab} ${activeTab === 'bad' ? styles.tabActiveBad : ''}`}
          onClick={() => setActiveTab('bad')}
        >
          <span>🚫 Habit Buruk</span>
          <span className={styles.tabBadge}>{badDone}/{badHabits.length}</span>
        </button>
      </div>

      {/* Progress Bar */}
      {displayHabits.length > 0 && (
        <div className={styles.progressSection}>
          <div className={styles.progressInfo}>
            <span>{activeTab === 'good' ? 'Habit selesai' : 'Berhasil ditahan'}</span>
            <span className={styles.progressCount}>
              {activeTab === 'good' ? goodDone : badDone} / {displayHabits.length}
            </span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${activeTab === 'bad' ? styles.progressFillBad : ''}`}
              style={{
                width: `${displayHabits.length > 0
                  ? ((activeTab === 'good' ? goodDone : badDone) / displayHabits.length) * 100
                  : 0}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Habit List */}
      <div className={styles.habitList}>
        {displayHabits.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyIcon}>{activeTab === 'good' ? '🌱' : '🛡️'}</p>
            <p className={styles.emptyTitle}>
              {activeTab === 'good' ? 'Belum ada habit baik' : 'Belum ada habit buruk yang dilacak'}
            </p>
            <p className={styles.emptyDesc}>
              {activeTab === 'good'
                ? 'Tambahkan kebiasaan positif yang ingin kamu bangun'
                : 'Tambahkan kebiasaan buruk yang ingin kamu hentikan'}
            </p>
            <button
              id={`btn-add-${activeTab}-habit`}
              className="btn btn--primary"
              onClick={() => openForm(activeTab)}
            >
              + Tambah Habit
            </button>
          </div>
        ) : (
          displayHabits.map(habit => {
            const log = logMap[habit.id]
            const done = log?.completed || false

            return (
              <div
                key={habit.id}
                className={`${styles.habitCard} ${done ? (activeTab === 'bad' ? styles.habitCardDoneBad : styles.habitCardDone) : ''}`}
              >
                <div className={styles.habitLeft}>
                  <button
                    id={`toggle-habit-${habit.id}`}
                    className={`${styles.checkBtn} ${done ? (activeTab === 'bad' ? styles.checkBtnBad : styles.checkBtnDone) : ''}`}
                    onClick={() => handleToggle(habit.id, habit.type)}
                    disabled={isPending}
                  >
                    {done ? '✓' : ''}
                  </button>
                  <span className={styles.habitEmoji}>{habit.icon}</span>
                  <div className={styles.habitInfo}>
                    <p className={`${styles.habitName} ${done ? styles.habitNameDone : ''}`}>
                      {habit.name}
                    </p>
                    <div className={styles.habitMeta}>
                      <span className={`badge badge--${activeTab === 'good' ? 'primary' : 'yellow'}`}>
                        {CATEGORIES.find(c => c.value === habit.category)?.icon} {CATEGORIES.find(c => c.value === habit.category)?.label}
                      </span>
                      {done && (
                        <span className={styles.pointsEarned}>
                          +{activeTab === 'good' ? 10 : 5} pts
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.habitRight}>
                  {/* Weekly mini grid */}
                  <div className={styles.weekGrid}>
                    {DAYS.map((day, i) => (
                      <div key={i} className={styles.weekDay}>
                        <div className={`${styles.weekDot} ${i === 6 && done ? (activeTab === 'bad' ? styles.weekDotBad : styles.weekDotDone) : ''}`} />
                        <span className={styles.weekLabel}>{day}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    id={`delete-habit-${habit.id}`}
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(habit.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Button */}
      {displayHabits.length > 0 && (
        <button
          id={`btn-add-${activeTab}-fab`}
          className={styles.addBtn}
          onClick={() => openForm(activeTab)}
        >
          + Tambah {activeTab === 'good' ? 'Habit Baik' : 'Habit Buruk'}
        </button>
      )}

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
                  id="input-habit-name"
                  className="input"
                  placeholder={formType === 'good' ? 'Contoh: Minum 8 gelas air' : 'Contoh: Tidak merokok'}
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Kategori</label>
                <div className={styles.categoryGrid}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      id={`category-${cat.value}`}
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

              <div className="input-group">
                <label className="input-label">Deskripsi (opsional)</label>
                <input
                  id="input-habit-desc"
                  className="input"
                  placeholder="Catatan singkat..."
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-habit"
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
