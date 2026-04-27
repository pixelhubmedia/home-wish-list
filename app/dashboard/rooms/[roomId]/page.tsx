import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RoomClient from './RoomClient'
import { WishlistItemReactionCounts, WishlistItemReactionValue } from '@/types'

const EMPTY_REACTION_COUNTS: WishlistItemReactionCounts = {
  approve: 0,
  unsure: 0,
  dislike: 0,
}

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

  const itemIds = (items || []).map((item) => item.id)
  const { data: reactions } = itemIds.length > 0
    ? await supabase
      .from('wishlist_item_reactions')
      .select('item_id, user_id, reaction')
      .in('item_id', itemIds)
    : { data: [] }

  const reactionMap = new Map<string, {
    counts: WishlistItemReactionCounts
    currentUserReaction: WishlistItemReactionValue | null
  }>()

  for (const item of items || []) {
    reactionMap.set(item.id, {
      counts: { ...EMPTY_REACTION_COUNTS },
      currentUserReaction: null,
    })
  }

  for (const reaction of reactions || []) {
    const summary = reactionMap.get(reaction.item_id)
    if (!summary) continue
    const value = reaction.reaction as WishlistItemReactionValue
    summary.counts[value] += 1
    if (reaction.user_id === user.id) {
      summary.currentUserReaction = value
    }
  }

  const itemsWithReactions = (items || []).map((item) => {
    const summary = reactionMap.get(item.id)
    return {
      ...item,
      reaction_counts: summary?.counts || { ...EMPTY_REACTION_COUNTS },
      current_user_reaction: summary?.currentUserReaction || null,
    }
  })

  return <RoomClient room={room} items={itemsWithReactions} userId={user.id} />
}
