'use server'

import { createClient } from '@/lib/supabase/server'
import { addPoints } from '@/lib/actions/points'
import { POINTS } from '@/lib/utils/points'
import {
  sanitizeText,
  assertEnum,
  assertDate,
  assertTime,
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
// GET Tasks — verifikasi user sendiri
// ============================================================
export async function getTasks(userId, filters = {}) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (userId !== user.id) throw new Error('Forbidden')

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('due_date', { ascending: true })
    .order('due_time', { ascending: true })

  if (filters.date) {
    query = query.eq('due_date', filters.date)
  }

  if (filters.month && filters.year) {
    const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`
    const endDate = new Date(filters.year, filters.month, 0).toISOString().split('T')[0]
    query = query.gte('due_date', startDate).lte('due_date', endDate)
  }

  if (filters.completed !== undefined) {
    query = query.eq('completed', filters.completed)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// ============================================================
// GET Today's Tasks
// ============================================================
export async function getTodayTasks(userId) {
  const today = new Date().toISOString().split('T')[0]
  return getTasks(userId, { date: today })
}

// ============================================================
// GET Tasks for a specific month (calendar)
// ============================================================
export async function getTasksForMonth(userId, year, month) {
  return getTasks(userId, { year, month })
}

// ============================================================
// CREATE Task — validasi semua input
// ============================================================
export async function createTask(formData) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  let title, description, due_date, due_time, priority, category
  try {
    title       = sanitizeText(formData.title,       { maxLength: 200, fieldName: 'Judul tugas' })
    description = sanitizeText(formData.description, { maxLength: 500, fieldName: 'Deskripsi', required: false })
    due_date    = assertDate(formData.due_date,   'Tanggal deadline')
    due_time    = assertTime(formData.due_time,   'Waktu deadline')
    priority    = assertEnum(formData.priority || 'medium', ALLOWED.TASK_PRIORITY, 'Prioritas')
    category    = assertEnum(formData.category || 'other',  ALLOWED.TASK_CATEGORY, 'Kategori')
  } catch (err) {
    if (err instanceof ValidationError) throw new Error(err.message)
    throw err
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({ user_id: user.id, title, description, due_date, due_time, priority, category })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return data
}

// ============================================================
// UPDATE Task — validasi semua input
// ============================================================
export async function updateTask(taskId, formData) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  let title, description, due_date, due_time, priority, category
  try {
    title       = sanitizeText(formData.title,       { maxLength: 200, fieldName: 'Judul tugas' })
    description = sanitizeText(formData.description, { maxLength: 500, fieldName: 'Deskripsi', required: false })
    due_date    = assertDate(formData.due_date,   'Tanggal deadline')
    due_time    = assertTime(formData.due_time,   'Waktu deadline')
    priority    = assertEnum(formData.priority || 'medium', ALLOWED.TASK_PRIORITY, 'Prioritas')
    category    = assertEnum(formData.category || 'other',  ALLOWED.TASK_CATEGORY, 'Kategori')
  } catch (err) {
    if (err instanceof ValidationError) throw new Error(err.message)
    throw err
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ title, description, due_date, due_time, priority, category })
    .eq('id', taskId)
    .eq('user_id', user.id) // RLS + explicit check
    .select()
    .single()

  if (error) throw error

  revalidatePath('/tasks')
  return data
}

// ============================================================
// COMPLETE Task
// ============================================================
export async function completeTask(taskId) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const { data: task } = await supabase
    .from('tasks')
    .select('completed')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (!task) throw new Error('Tugas tidak ditemukan')

  const newCompleted = !task.completed

  const { error } = await supabase
    .from('tasks')
    .update({
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) throw error

  if (newCompleted) {
    await addPoints(user.id, 'task_done', POINTS.TASK_DONE, { task_id: taskId })
  } else {
    // Kurangi poin jika dibatalkan agar tidak bisa farming point
    await addPoints(user.id, 'task_undone', -POINTS.TASK_DONE, { task_id: taskId })
  }

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
}

// ============================================================
// DELETE Task
// ============================================================
export async function deleteTask(taskId) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath('/tasks')
  revalidatePath('/dashboard')
}

// ============================================================
// GET Upcoming tasks needing reminders (cron job use only)
// ============================================================
export async function getUpcomingTasksForReminder() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      profiles!inner(id),
      notification_settings!inner(task_reminder, task_reminder_minutes, push_subscription)
    `)
    .eq('completed', false)
    .eq('reminder_sent', false)
    .not('due_time', 'is', null)
    .not('due_date', 'is', null)

  if (error) throw error
  return data || []
}
