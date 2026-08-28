import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNotes } from '@/lib/actions/notes'
import NotesClient from './NotesClient'

export const metadata = {
  title: 'Catatan | PELITA',
  description: 'Kelola ide dan catatan pribadi',
}

export default async function NotesPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const notes = await getNotes(user.id)

  return <NotesClient initialNotes={notes} userId={user.id} />
}
