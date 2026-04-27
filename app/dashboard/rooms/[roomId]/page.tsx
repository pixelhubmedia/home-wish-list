import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RoomClient from './RoomClient'

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single()

  if (!room) redirect('/dashboard')

  // Verify membership
  const { data: membership } = await supabase
    .from('house_members')
    .select('id')
    .eq('house_id', room.house_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const { data: items } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })

  return <RoomClient room={room} items={items || []} userId={user.id} />
}
