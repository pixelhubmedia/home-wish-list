import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Find user's house membership
  const { data: membership } = await supabase
    .from('house_members')
    .select('house_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/onboarding')

  const { data: house } = await supabase
    .from('houses')
    .select('*')
    .eq('id', membership.house_id)
    .single()

  if (!house) redirect('/onboarding')

  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .eq('house_id', house.id)
    .order('created_at', { ascending: true })

  const { data: items } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('house_id', house.id)

  return (
    <DashboardClient
      house={house}
      rooms={rooms || []}
      items={items || []}
      userId={user.id}
    />
  )
}
