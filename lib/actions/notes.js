'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeText, ValidationError } from '@/lib/utils/validate'

async function getAuthUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return user
}

export async function getNotes(userId) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  if (userId !== user.id) throw new Error('Forbidden')

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createNote(formData) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  let title, content, category, color
  try {
    title = sanitizeText(formData.title, { maxLength: 255, fieldName: 'Judul' })
    content = sanitizeText(formData.content, { maxLength: 5000, fieldName: 'Konten', required: false })
    category = sanitizeText(formData.category || 'general', { maxLength: 50 })
    color = sanitizeText(formData.color || 'blue', { maxLength: 20 })
  } catch (err) {
    if (err instanceof ValidationError) throw new Error(err.message)
    throw err
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      title,
      content,
      category,
      color,
      is_pinned: formData.is_pinned || false
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/notes')
  return data
}

export async function updateNote(noteId, formData) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  let title, content, category, color
  try {
    title = sanitizeText(formData.title, { maxLength: 255, fieldName: 'Judul' })
    content = sanitizeText(formData.content, { maxLength: 5000, fieldName: 'Konten', required: false })
    category = sanitizeText(formData.category || 'general', { maxLength: 50 })
    color = sanitizeText(formData.color || 'blue', { maxLength: 20 })
  } catch (err) {
    if (err instanceof ValidationError) throw new Error(err.message)
    throw err
  }

  const { data, error } = await supabase
    .from('notes')
    .update({
      title,
      content,
      category,
      color,
      is_pinned: formData.is_pinned || false,
      updated_at: new Date().toISOString()
    })
    .eq('id', noteId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/notes')
  return data
}

export async function deleteNote(noteId) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath('/notes')
}
