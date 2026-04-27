'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  WishlistItemReactionValue,
  WishlistItemStatus,
  WishlistItemWithReactions,
} from '@/types'

interface Props {
  item: WishlistItemWithReactions
  userId: string
  onEdit: (item: WishlistItemWithReactions) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: WishlistItemStatus) => void
  onReactionChange: (
    itemId: string,
    previousReaction: WishlistItemReactionValue | null,
    nextReaction: WishlistItemReactionValue | null
  ) => void
}

const STATUS_COLORS: Record<WishlistItemStatus, { bg: string; text: string }> = {
  Wishlist: { bg: '#eff6ff', text: '#2563eb' },
  Considering: { bg: '#fffbeb', text: '#b45309' },
  Purchased: { bg: '#f0fdf4', text: '#15803d' },
  'Not buying': { bg: '#fef2f2', text: '#b91c1c' },
}

const STATUSES: WishlistItemStatus[] = ['Wishlist', 'Considering', 'Purchased', 'Not buying']
const REACTIONS: {
  value: WishlistItemReactionValue
  label: string
  activeClass: string
}[] = [
  { value: 'approve', label: 'Approve', activeClass: 'bg-green-600 text-white border-green-600' },
  { value: 'unsure', label: 'Unsure', activeClass: 'bg-amber-500 text-white border-amber-500' },
  { value: 'dislike', label: 'Dislike', activeClass: 'bg-red-600 text-white border-red-600' },
]

function formatPrice(p: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(p)
}

export default function ProductCard({
  item,
  userId,
  onEdit,
  onDelete,
  onStatusChange,
  onReactionChange,
}: Props) {
  const [deleting, setDeleting] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [reacting, setReacting] = useState<WishlistItemReactionValue | null>(null)

  async function handleDelete() {
    if (!confirm('Remove this item?')) return
    setDeleting(true)
    onDelete(item.id)
  }

  async function handleStatusChange(status: WishlistItemStatus) {
    const supabase = createClient()
    await supabase.from('wishlist_items').update({ status }).eq('id', item.id)
    onStatusChange(item.id, status)
    setShowStatusMenu(false)
  }

  async function handleReactionClick(reaction: WishlistItemReactionValue) {
    const previousReaction = item.current_user_reaction
    const nextReaction = previousReaction === reaction ? null : reaction
    const supabase = createClient()

    setReacting(reaction)

    if (nextReaction) {
      const { error } = await supabase
        .from('wishlist_item_reactions')
        .upsert(
          { item_id: item.id, user_id: userId, reaction: nextReaction },
          { onConflict: 'item_id,user_id' }
        )

      if (!error) onReactionChange(item.id, previousReaction, nextReaction)
    } else {
      const { error } = await supabase
        .from('wishlist_item_reactions')
        .delete()
        .eq('item_id', item.id)
        .eq('user_id', userId)

      if (!error) onReactionChange(item.id, previousReaction, null)
    }

    setReacting(null)
  }

  const statusStyle = STATUS_COLORS[item.status]

  return (
    <div className="glass-card overflow-hidden">
      {/* Image */}
      {item.image_url && (
        <div className="relative w-full h-44 bg-gray-100">
          <Image
            src={item.image_url}
            alt={item.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-950 text-base leading-snug flex-1">{item.title}</h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            {item.price !== null && (
              <span className="text-base font-bold text-blue-600">{formatPrice(item.price)}</span>
            )}
          </div>
        </div>

        {/* Retailer + status */}
        <div className="flex items-center gap-2 mb-3">
          {item.retailer && (
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
              {item.retailer}
            </span>
          )}
          {item.comparison_group && (
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
              {item.comparison_group}
            </span>
          )}
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="text-xs font-semibold px-2 py-0.5 rounded-md transition-all"
            style={{ background: statusStyle.bg, color: statusStyle.text }}
          >
            {item.status}
          </button>
        </div>

        {/* Status menu */}
        {showStatusMenu && (
          <div className="glass-card p-2 mb-3 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all"
                style={{
                  background: item.status === s ? STATUS_COLORS[s].bg : '#f3f4f6',
                  color: item.status === s ? STATUS_COLORS[s].text : '#6b7280',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <p className="text-sm text-gray-500 mb-3 bg-gray-50 rounded-md p-2 leading-relaxed">
            {item.notes}
          </p>
        )}

        {/* Partner reactions */}
        <div className="mb-3">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Partner votes</p>
          <div className="grid grid-cols-3 gap-2">
            {REACTIONS.map((reaction) => {
              const active = item.current_user_reaction === reaction.value
              return (
                <button
                  key={reaction.value}
                  onClick={() => handleReactionClick(reaction.value)}
                  disabled={reacting !== null}
                  className={`px-2 py-2 rounded-md border text-xs font-semibold transition-all disabled:opacity-60 ${
                    active ? reaction.activeClass : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{reaction.label}</span>
                  <span className="ml-1">{item.reaction_counts[reaction.value]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {item.product_url && (
            <a
              href={item.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 rounded-md text-sm font-semibold text-center transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              View product
            </a>
          )}
          <button
            onClick={() => onEdit(item)}
            className="px-4 py-2 rounded-md text-sm font-semibold transition-all bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-2 rounded-md text-sm font-semibold transition-all bg-red-50 text-red-600 hover:bg-red-100"
          >
            {deleting ? '…' : '✕'}
          </button>
        </div>
      </div>
    </div>
  )
}
