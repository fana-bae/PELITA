'use client'

import { useState, useTransition } from 'react'
import { createTask, completeTask, deleteTask } from '@/lib/actions/tasks'
import styles from './Tasks.module.css'

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const DAYS_ID = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
const CATEGORIES = ['work','personal','health','finance','study','other']
const CATEGORY_LABELS = { work:'Pekerjaan', personal:'Personal', health:'Kesehatan', finance:'Keuangan', study:'Belajar', other:'Lainnya' }

// Jam untuk Time Grid (00:00 - 23:00)
const HOURS = Array.from({ length: 24 }).map((_, i) => `${String(i).padStart(2,'0')}:00`)
const HOUR_HEIGHT = 60 // px per hour

function getPillColor(task) {
  if (task.priority === 'high') return 'color-red'
  if (task.category === 'work') return 'color-blue'
  if (task.category === 'finance') return 'color-yellow'
  if (task.category === 'health') return 'color-green'
  return 'color-purple'
}

export default function TasksClient({ tasks: initialTasks, userId }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const [form, setForm] = useState({
    title: '', description: '', due_date: todayStr,
    due_time: '', priority: 'medium', category: 'other'
  })

  // ── Calendar State ──────────────────────────────────────────
  const [view, setView] = useState('month') // 'month', 'week', 'day'
  const [currentDate, setCurrentDate] = useState(new Date())

  // Helpers
  function getStartOfWeek(d) {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day
    return new Date(date.setDate(diff))
  }

  function navPrev() {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() - 1)
    if (view === 'week') d.setDate(d.getDate() - 7)
    if (view === 'day') d.setDate(d.getDate() - 1)
    setCurrentDate(d)
  }

  function navNext() {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + 1)
    if (view === 'week') d.setDate(d.getDate() + 7)
    if (view === 'day') d.setDate(d.getDate() + 1)
    setCurrentDate(d)
  }

  function goToday() {
    setCurrentDate(new Date())
  }

  // ── Filtering Tasks for Side Panel ────────────────────────
  const todaysTasks = tasks.filter(t => t.due_date === todayStr).sort((a,b) => (a.due_time || '').localeCompare(b.due_time || ''))
  const pendingTasks = tasks.filter(t => !t.completed && t.due_date !== todayStr).sort((a,b) => new Date(a.due_date) - new Date(b.due_date))
  const completedTasks = tasks.filter(t => t.completed).sort((a,b) => new Date(b.due_date) - new Date(a.due_date))

  // ── Actions ─────────────────────────────────────────────────
  function openAddForm(dateStr = todayStr) {
    setForm({ title: '', description: '', due_date: dateStr, due_time: '', priority: 'medium', category: 'other' })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    startTransition(async () => {
      const newTask = await createTask(form)
      setTasks(prev => [...prev, newTask])
      setShowForm(false)
    })
  }

  async function handleComplete(taskId) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    if (task.due_date !== todayStr) {
      alert(`Tugas ini hanya bisa dicentang pada tanggal ${task.due_date}.`)
      return
    }

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t))
    startTransition(async () => {
      await completeTask(taskId)
    })
  }

  async function handleDelete(taskId) {
    if (!confirm('Hapus tugas ini?')) return
    setTasks(prev => prev.filter(t => t.id !== taskId))
    startTransition(async () => {
      await deleteTask(taskId)
    })
  }

  const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  )

  const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  )

  // ── RENDERERS ───────────────────────────────────────────────

  function renderMonthView() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    // Create cells
    const cells = []
    
    // Empty cells before start of month
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className={`${styles.monthDayCell} ${styles.otherMonth}`} />)
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      const isToday = dateStr === todayStr
      const dayTasks = tasks.filter(t => t.due_date === dateStr)
      
      cells.push(
        <div key={day} className={`${styles.monthDayCell} ${isToday ? styles.monthDayToday : ''}`} onDoubleClick={() => openAddForm(dateStr)}>
          <span className={styles.monthDayNum}>{day}</span>
          <div className={styles.monthTaskList}>
            {dayTasks.map(task => (
              <div 
                key={task.id} 
                className={`${styles.taskBlock} ${styles[getPillColor(task)]} ${task.completed ? styles.taskDone : ''}`}
                onClick={() => handleComplete(task.id)}
                title={task.title}
              >
                {task.due_time && `${task.due_time.slice(0,5)} `}{task.title}
              </div>
            ))}
          </div>
        </div>
      )
    }
    
    // Fill remaining to complete grid (e.g. 35 or 42 cells)
    const remaining = 7 - (cells.length % 7)
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) {
        cells.push(<div key={`empty-end-${i}`} className={`${styles.monthDayCell} ${styles.otherMonth}`} />)
      }
    }

    return (
      <div className={styles.monthGrid}>
        <div className={styles.monthHeaderRow}>
          {DAYS_ID.map(d => <div key={d} className={styles.monthHeaderCell}>{d}</div>)}
        </div>
        <div className={styles.monthDaysGrid}>{cells}</div>
      </div>
    )
  }

  function renderTimeGrid(daysArray) {
    return (
      <div className={styles.timeGrid}>
        {/* Y-Axis: Hours */}
        <div className={styles.timeAxis}>
          {HOURS.map((hr, i) => (
            <div key={i} className={styles.timeLabel} style={{ top: `${i * HOUR_HEIGHT}px` }}>
              {hr}
            </div>
          ))}
        </div>

        {/* X-Axis: Days */}
        <div className={styles.dayColumns}>
          {/* Horizontal lines */}
          <div className={styles.hourLines}>
            {HOURS.map((_, i) => (
              <div key={i} className={styles.hourLine} style={{ top: `${i * HOUR_HEIGHT}px` }} />
            ))}
          </div>

          {daysArray.map((dateObj, colIndex) => {
            const dateStr = dateObj.toISOString().split('T')[0]
            const isToday = dateStr === todayStr
            const dayTasks = tasks.filter(t => t.due_date === dateStr)
            
            // All-day tasks (no time)
            const allDayTasks = dayTasks.filter(t => !t.due_time)
            // Timed tasks
            const timedTasks = dayTasks.filter(t => !!t.due_time)

            return (
              <div key={colIndex} className={`${styles.dayColumn} ${isToday ? styles.isToday : ''}`}>
                <div className={styles.dayHeader}>
                  <span className={styles.dayHeaderName}>{DAYS_ID[dateObj.getDay()]}</span>
                  <span className={styles.dayHeaderNum}>{dateObj.getDate()}</span>
                </div>
                
                {/* Render All Day Tasks below header? Or mixed in? We'll just put them at top of the column for now */}
                <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '2px', minHeight: '30px', borderBottom: '1px solid var(--border)' }}>
                  {allDayTasks.map(task => (
                     <div 
                      key={task.id} 
                      className={`${styles.taskBlock} ${styles[getPillColor(task)]} ${task.completed ? styles.taskDone : ''}`}
                      onClick={() => handleComplete(task.id)}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>

                {/* Timed tasks area */}
                <div style={{ position: 'relative', height: `${24 * HOUR_HEIGHT}px` }}>
                  {timedTasks.map(task => {
                    const [h, m] = task.due_time.split(':').map(Number)
                    const topPx = (h + m / 60) * HOUR_HEIGHT
                    // Hardcode height to 45px for now to represent an average task duration visually
                    const heightPx = 45 
                    
                    return (
                      <div
                        key={task.id}
                        className={`${styles.taskBlock} ${styles.taskBlockAbsolute} ${styles[getPillColor(task)]} ${task.completed ? styles.taskDone : ''}`}
                        style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                        onClick={() => handleComplete(task.id)}
                        title={`${task.due_time} - ${task.title}`}
                      >
                        <div>{task.due_time.slice(0,5)}</div>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderWeekView() {
    const start = getStartOfWeek(currentDate)
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
    return renderTimeGrid(days)
  }

  function renderDayView() {
    return renderTimeGrid([currentDate])
  }

  function getCalendarTitle() {
    const month = MONTHS_ID[currentDate.getMonth()]
    const year = currentDate.getFullYear()
    if (view === 'month') return `${month} ${year}`
    if (view === 'day') return `${currentDate.getDate()} ${month} ${year}`
    // Week view title
    const start = getStartOfWeek(currentDate)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    
    const startMonth = MONTHS_ID[start.getMonth()].slice(0,3)
    const endMonth = MONTHS_ID[end.getMonth()].slice(0,3)
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${month} ${year}`
    } else {
      return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${year}`
    }
  }

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.header}>
        <h1 className={`${styles.title} font-poppins`}>Tasks Calendar</h1>
        <button className="btn btn--blue" onClick={() => openAddForm()}>
          + Create Task
        </button>
      </div>

      <div className={styles.layout}>
        {/* ── KOLOM 1: KALENDER UTAMA ─────────────────────── */}
        <div className={styles.colMain}>
          <div className={styles.calHeader}>
            <div className={styles.calNav}>
              <button className={styles.navToday} onClick={goToday}>Today</button>
              <button className={styles.navBtn} onClick={navPrev}>‹</button>
              <button className={styles.navBtn} onClick={navNext}>›</button>
              <span className={styles.calTitle}>{getCalendarTitle()}</span>
            </div>
            <div className={styles.calViewSwitcher}>
              <button className={`${styles.viewBtn} ${view === 'month' ? styles.active : ''}`} onClick={() => setView('month')}>Month</button>
              <button className={`${styles.viewBtn} ${view === 'week' ? styles.active : ''}`} onClick={() => setView('week')}>Week</button>
              <button className={`${styles.viewBtn} ${view === 'day' ? styles.active : ''}`} onClick={() => setView('day')}>Day</button>
            </div>
          </div>
          
          <div className={styles.calBody}>
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
          </div>
        </div>

        {/* ── KOLOM 2: SIDE PANEL (KONTEN) ────────────────── */}
        <div className={styles.colSide}>
          
          <div className={styles.sideWidget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetTitle}>Hari Ini</span>
              <span className={styles.widgetBadge}>{todaysTasks.filter(t => !t.completed).length} Sisa</span>
            </div>
            <div className={styles.widgetContent}>
              {todaysTasks.length === 0 ? (
                <div className={styles.emptyState}>Tidak ada tugas untuk hari ini. 🎉</div>
              ) : (
                todaysTasks.map(task => (
                  <div key={task.id} className={styles.sideTaskItem}>
                    <div 
                      className={`${styles.checkCircle} ${task.completed ? styles.checkCircleDone : ''}`}
                      onClick={() => handleComplete(task.id)}
                    >
                      <CheckIcon />
                    </div>
                    <div className={styles.sideTaskInfo}>
                      <span className={`${styles.sideTaskTitle} ${task.completed ? styles.sideTaskTitleDone : ''}`}>
                        {task.title}
                      </span>
                      <div className={styles.sideTaskMeta}>
                        <div className={styles.priorityDot} style={{ background: task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : '#10B981' }} />
                        <span>{task.due_time ? `⏰ ${task.due_time.slice(0,5)}` : CATEGORY_LABELS[task.category]}</span>
                      </div>
                    </div>
                    <button 
                      className={styles.deleteBtn}
                      onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                      title="Hapus Tugas"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.sideWidget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetTitle}>Mendatang</span>
              <span className={styles.widgetBadge}>{pendingTasks.length} Tugas</span>
            </div>
            <div className={styles.widgetContent}>
              {pendingTasks.length === 0 ? (
                <div className={styles.emptyState}>Tidak ada tugas yang tertunda.</div>
              ) : (
                pendingTasks.map(task => (
                  <div key={task.id} className={styles.sideTaskItem}>
                    <div className={styles.checkCircle} onClick={() => handleComplete(task.id)}>
                      <CheckIcon />
                    </div>
                    <div className={styles.sideTaskInfo}>
                      <span className={styles.sideTaskTitle}>{task.title}</span>
                      <div className={styles.sideTaskMeta}>
                        <div className={styles.priorityDot} style={{ background: task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : '#10B981' }} />
                        <span>📅 {task.due_date}</span>
                      </div>
                    </div>
                    <button 
                      className={styles.deleteBtn}
                      onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                      title="Hapus Tugas"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Add Task Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">📋 Tambah Tugas</h2>
              <button className="modal__close" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className="input-group">
                <label className="input-label">Judul Tugas</label>
                <input
                  id="input-task-title"
                  className="input"
                  placeholder="Apa yang perlu diselesaikan?"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Tanggal</label>
                  <input
                    id="input-task-date"
                    type="date"
                    className="input"
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Waktu</label>
                  <input
                    id="input-task-time"
                    type="time"
                    className="input"
                    value={form.due_time}
                    onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Prioritas</label>
                  <select
                    id="input-task-priority"
                    className="input"
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="high">🔴 Tinggi</option>
                    <option value="medium">🟡 Sedang</option>
                    <option value="low">🟢 Rendah</option>
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Kategori</label>
                  <select
                    id="input-task-category"
                    className="input"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Deskripsi (opsional)</label>
                <textarea
                  id="input-task-desc"
                  className="input"
                  placeholder="Detail tambahan..."
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>Batal</button>
                <button type="submit" id="btn-submit-task" className="btn btn--blue" disabled={isPending}>
                  {isPending ? 'Menyimpan...' : 'Simpan Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
