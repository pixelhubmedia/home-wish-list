import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('house_members')
    .select('house_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const house = membership
    ? (await supabase.from('houses').select('*').eq('id', membership.house_id).single()).data
    : null

  return <SettingsClient user={{ id: user.id, email: user.email || '' }} house={house} />
}
