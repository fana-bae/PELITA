'use server'

import { createClient } from '@/lib/supabase/server'
import { addPoints, updateStreak } from '@/lib/actions/points'
import { POINTS } from '@/lib/utils/points'
import {
  sanitizeText,
  assertEnum,
  assertBoolean,
  ValidationError,
  ALLOWED,
} from '@/lib/utils/validate'
import { revalidatePath } from 'next/cache'

// ── Helper: dapatkan user yang sedang login (atau throw) ──────
async function getAuthUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return user
}

// ============================================================
// GET Habits — verifikasi userId milik user sendiri
// ============================================================
export async function getHabits(userId) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  // Pastikan hanya bisa minta data milik sendiri
  if (userId !== user.id) throw new Error('Forbidden')

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

// ============================================================
// GET Today's Habit Logs — verifikasi user sendiri
// ============================================================
export async function getTodayHabitLogs(userId) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (userId !== user.id) throw new Error('Forbidden')

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('log_date', today)

  if (error) throw error
  return data || []
}

// ============================================================
// GET Current Month's Habit Logs
// ============================================================
export async function getCurrentMonthHabitLogs(userId) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (userId !== user.id) throw new Error('Forbidden')

  const curr = new Date()
  const tzOffset = curr.getTimezoneOffset() * 60000
  // First day of current month
  const firstDay = new Date(curr.getFullYear(), curr.getMonth(), 1)
  const startDateStr = new Date(firstDay.getTime() - tzOffset).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('log_date', startDateStr)

  if (error) throw error
  return data || []
}

// ============================================================
// GET Weekly Habit Logs — verifikasi user sendiri
// ============================================================
export async function getWeeklyHabitLogs(userId, habitId) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (userId !== user.id) throw new Error('Forbidden')

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 6)

  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('habit_id', habitId)
    .gte('log_date', startDate.toISOString().split('T')[0])
    .lte('log_date', endDate.toISOString().split('T')[0])

  if (error) throw error
  return data || []
}

// ============================================================
// CREATE Habit — validasi semua input
// ============================================================
export async function createHabit(formData) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  // 🛡️ Validasi input 🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️
  let name, type, category, icon, color, description, frequency, frequency_target
  try {
    name             = sanitizeText(formData.name,        { maxLength: 100, fieldName: 'Nama habit' })
    type             = assertEnum(formData.type,          ALLOWED.HABIT_TYPE, 'Tipe habit')
    category         = assertEnum(formData.category || 'other', ALLOWED.HABIT_CATEGORY, 'Kategori')
    icon             = sanitizeText(formData.icon || '🔥', { maxLength: 10, fieldName: 'Ikon', required: false }) || '🔥'
    color            = /^#[0-9A-Fa-f]{6}$/.test(formData.color || '') ? formData.color : '#0AC682'
    description      = sanitizeText(formData.description, { maxLength: 300, fieldName: 'Deskripsi', required: false })
    frequency        = assertEnum(formData.frequency || 'daily', ALLOWED.HABIT_FREQUENCY, 'Frekuensi')
    frequency_target = parseInt(formData.frequency_target, 10) || 1
  } catch (err) {
    if (err instanceof ValidationError) throw new Error(err.message)
    throw err
  }

  const { data, error } = await supabase
    .from('habits')
    .insert({ user_id: user.id, name, type, category, icon, color, description, frequency, frequency_target })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/habits')
  return data
}

// ============================================================
// UPDATE Habit — validasi semua input
// ============================================================
export async function updateHabit(habitId, formData) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  let name, category, icon, color, description, frequency, frequency_target
  try {
    name             = sanitizeText(formData.name,        { maxLength: 100, fieldName: 'Nama habit' })
    category         = assertEnum(formData.category || 'other', ALLOWED.HABIT_CATEGORY, 'Kategori')
    icon             = sanitizeText(formData.icon || '🔥', { maxLength: 10, fieldName: 'Ikon', required: false }) || '🔥'
    color            = /^#[0-9A-Fa-f]{6}$/.test(formData.color || '') ? formData.color : '#0AC682'
    description      = sanitizeText(formData.description, { maxLength: 300, fieldName: 'Deskripsi', required: false })
    frequency        = assertEnum(formData.frequency || 'daily', ALLOWED.HABIT_FREQUENCY, 'Frekuensi')
    frequency_target = parseInt(formData.frequency_target, 10) || 1
  } catch (err) {
    if (err instanceof ValidationError) throw new Error(err.message)
    throw err
  }

  const { data, error } = await supabase
    .from('habits')
    .update({ name, category, icon, color, description, frequency, frequency_target })
    .eq('id', habitId)
    .eq('user_id', user.id) // RLS + explicit user check
    .select()
    .single()

  if (error) throw error

  revalidatePath('/habits')
  return data
}

// ============================================================
// DELETE Habit (soft delete)
// ============================================================
export async function deleteHabit(habitId) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const { error } = await supabase
    .from('habits')
    .update({ is_active: false })
    .eq('id', habitId)
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath('/habits')
}

// ============================================================
// TOGGLE Habit Log — TANPA console.log
// ============================================================
export async function toggleHabitLog(habitId, habitType, targetDate = null) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase) // 🛡️ tidak ada lagi console.log!

  // Validasi habitType
  try {
    assertEnum(habitType, ALLOWED.HABIT_TYPE, 'Tipe habit')
  } catch (err) {
    if (err instanceof ValidationError) throw new Error(err.message)
    throw err
  }

  const logDate = targetDate || new Date().toISOString().split('T')[0]

  // Verifikasi habit milik user ini
  const { data: habit } = await supabase
    .from('habits')
    .select('id, type')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single()

  if (!habit) throw new Error('Habit tidak ditemukan')

  // Check if log exists
  const { data: existing } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .eq('log_date', logDate)
    .single()

  if (existing) {
    const newCompleted = !existing.completed

    const { error } = await supabase
      .from('habit_logs')
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq('id', existing.id)
      .eq('user_id', user.id)

    if (error) throw error

    if (newCompleted) {
      const points = habitType === 'good' ? POINTS.GOOD_HABIT : POINTS.RESIST_BAD
      const action = habitType === 'good' ? 'good_habit' : 'resist_bad'
      await addPoints(user.id, action, points, { habit_id: habitId })
      await updateStreak(user.id)
    }
  } else {
    const { error } = await supabase
      .from('habit_logs')
      .insert({
        habit_id: habitId,
        user_id: user.id,
        log_date: logDate,
        completed: true,
        completed_at: new Date().toISOString(),
      })

    if (error) throw error

    const points = habitType === 'good' ? POINTS.GOOD_HABIT : POINTS.RESIST_BAD
    const action = habitType === 'good' ? 'good_habit' : 'resist_bad'
    await addPoints(user.id, action, points, { habit_id: habitId })
    await updateStreak(user.id)
  }

  revalidatePath('/habits')
  revalidatePath('/dashboard')
}
