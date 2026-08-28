'use client'

import { useState, useTransition } from 'react'
import { createNote, updateNote, deleteNote } from '@/lib/actions/notes'
import styles from './Notes.module.css'

const COLORS = [
  { id: 'yellow', hex: '#FEF3C7' },
  { id: 'green', hex: '#D1FAE5' },
  { id: 'purple', hex: '#EDE9FE' },
  { id: 'pink', hex: '#FCE7F3' },
  { id: 'blue', hex: '#DBEAFE' },
  { id: 'orange', hex: '#FFEDD5' },
]

const TEMPLATES = [
  { title: 'Jurnal Pribadi', desc: 'Renungan dan evaluasi hari ini', category: 'Journal', color: 'purple', content: 'Hari ini saya merasa...\n\nYang berjalan baik:\n1. \n2. \n\nYang perlu diperbaiki:\n1. ' },
  { title: 'Ide Proyek', desc: 'Catat ide brilian Anda', category: 'Idea', color: 'yellow', content: 'Nama Proyek:\n\nMasalah yang diselesaikan:\n\nFitur Utama:\n1. \n2. \n3. ' },
  { title: 'Catatan Rapat', desc: 'Notulen dan hasil diskusi', category: 'Meeting', color: 'blue', content: 'Tanggal: \nTopik: \n\nHasil Diskusi:\n- \n- \n\nTindak Lanjut:\n[ ] ' },
  { title: 'Daftar Belanja', desc: 'Barang yang harus dibeli', category: 'List', color: 'green', content: '- [ ] \n- [ ] \n- [ ] ' },
]

export default function NotesClient({ initialNotes, userId }) {
  const [notes, setNotes] = useState(initialNotes)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [isPending, startTransition] = useTransition()
  
  const [form, setForm] = useState({
    title: '', content: '', category: 'General', color: 'yellow', is_pinned: false
  })

  // ── Actions ─────────────────────────────────────────────────
  function openCreateForm() {
    setForm({ title: '', content: '', category: 'General', color: 'yellow', is_pinned: false })
    setEditingId(null)
    setShowForm(true)
  }

  function openEditForm(note) {
    setForm({ 
      title: note.title, 
      content: note.content || '', 
      category: note.category, 
      color: note.color, 
      is_pinned: note.is_pinned 
    })
    setEditingId(note.id)
    setShowForm(true)
  }

  function useTemplate(template) {
    setForm({
      title: template.title,
      content: template.content,
      category: template.category,
      color: template.color,
      is_pinned: false
    })
    setEditingId(null)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    startTransition(async () => {
      if (editingId) {
        const updated = await updateNote(editingId, form)
        setNotes(prev => prev.map(n => n.id === editingId ? updated : n))
      } else {
        const newNote = await createNote(form)
        setNotes(prev => [newNote, ...prev])
      }
      setShowForm(false)
    })
  }

  async function handleDelete(id) {
    if (!confirm('Hapus catatan ini permanen?')) return
    setNotes(prev => prev.filter(n => n.id !== id))
    startTransition(async () => {
      await deleteNote(id)
    })
  }

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.header}>
        <h1 className={`${styles.title} font-poppins`}>My Notes</h1>
        <div className={styles.headerActions}>
          <button className="btn btn--blue" onClick={openCreateForm}>
            + Create Note
          </button>
        </div>
      </div>

      {/* Templates Section */}
      <div className={styles.templatesSection}>
        <h2 className={styles.sectionTitle}>Templates</h2>
        <div className={styles.templatesGrid}>
          {TEMPLATES.map((tmpl, idx) => (
            <div key={idx} className={styles.templateCard} onClick={() => useTemplate(tmpl)}>
              <span className={styles.templateIcon}>
                {tmpl.category === 'Idea' ? '💡' : tmpl.category === 'Journal' ? '📔' : tmpl.category === 'List' ? '📋' : '📝'}
              </span>
              <div>
                <div className={styles.templateTitle}>{tmpl.title}</div>
                <div className={styles.templateDesc}>{tmpl.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Masonry Grid Section */}
      <div className={styles.notesSection}>
        <div className={styles.masonryGrid}>
          {notes.map(note => (
            <div 
              key={note.id} 
              className={`${styles.noteCard} ${styles[`color-${note.color}`]}`}
              onClick={() => openEditForm(note)}
            >
              <div className={styles.noteHeader}>
                <span className={styles.noteTag}>{note.category}</span>
                {note.is_pinned && <span className={styles.pinIcon}>📌</span>}
              </div>
              
              <h3 className={styles.noteTitle}>{note.title}</h3>
              
              {note.content && (
                <div className={styles.noteContent}>
                  {note.content}
                </div>
              )}
              
              <div className={styles.noteFooter}>
                <span>
                  {new Date(note.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span style={{ fontSize: '1rem', cursor: 'pointer', padding: '4px' }}>📝</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal__header">
              <h2 className="modal__title">{editingId ? 'Edit Catatan' : 'Tulis Catatan'}</h2>
              <button className="modal__close" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className="input-group">
                <input
                  className="input"
                  style={{ fontSize: '1.25rem', fontWeight: 'bold', padding: '12px 16px' }}
                  placeholder="Judul Catatan..."
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="input-group">
                <textarea
                  className="input"
                  style={{ minHeight: '200px', resize: 'vertical' }}
                  placeholder="Ketik sesuatu yang brilian..."
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                />
              </div>

              <div className={styles.formRow}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Kategori / Tag</label>
                  <input
                    className="input"
                    placeholder="misal: Pribadi, Ide, Belajar"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    maxLength={20}
                  />
                </div>
                
                <div className="input-group">
                  <label className="input-label">Warna Kartu</label>
                  <div className={styles.colorPicker}>
                    {COLORS.map(c => (
                      <div 
                        key={c.id} 
                        className={`${styles.colorOption} ${form.color === c.id ? styles.active : ''}`}
                        style={{ backgroundColor: c.hex }}
                        onClick={() => setForm(f => ({ ...f, color: c.id }))}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="input-pin"
                  checked={form.is_pinned}
                  onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))}
                />
                <label htmlFor="input-pin" style={{ cursor: 'pointer', fontWeight: 600 }}>📌 Sematkan (Pin) ke Atas</label>
              </div>

              <div className={styles.formActions}>
                {editingId ? (
                   <button type="button" className="btn btn--danger" onClick={() => handleDelete(editingId)} disabled={isPending}>
                     Hapus
                   </button>
                ) : <div />}
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>Batal</button>
                  <button type="submit" className="btn btn--blue" disabled={isPending}>
                    {isPending ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
