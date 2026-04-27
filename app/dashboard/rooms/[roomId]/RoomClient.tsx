'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Room,
  WishlistItem,
  WishlistItemReactionCounts,
  WishlistItemReactionValue,
  WishlistItemStatus,
  WishlistItemWithReactions,
} from '@/types'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import ProductModal from '@/components/ProductModal'
import ProductCard from '@/components/ProductCard'

interface Props {
  room: Room
  items: WishlistItemWithReactions[]
  userId: string
}

const EMPTY_REACTION_COUNTS: WishlistItemReactionCounts = {
  approve: 0,
  unsure: 0,
  dislike: 0,
}

const STATUS_FILTERS: { label: string; value: WishlistItemStatus | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Wishlist', value: 'Wishlist' },
  { label: 'Considering', value: 'Considering' },
  { label: 'Purchased', value: 'Purchased' },
  { label: 'Not buying', value: 'Not buying' },
]

function formatPrice(p: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(p)
}

function groupComparisonItems(items: WishlistItemWithReactions[]) {
  const groups = new Map<string, WishlistItemWithReactions[]>()

  for (const item of items) {
    const group = item.comparison_group?.trim()
    if (!group) continue
    groups.set(group, [...(groups.get(group) || []), item])
  }

  return Array.from(groups.entries())
    .map(([name, groupItems]) => ({
      name,
      items: groupItems.sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export default function RoomClient({ room, items: initialItems, userId }: Props) {
  const [items, setItems] = useState(initialItems)
  const [filter, setFilter] = useState<WishlistItemStatus | 'All'>('All')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<WishlistItem | null>(null)

  const filtered = filter === 'All' ? items : items.filter((i) => i.status === filter)
  const comparisonGroups = groupComparisonItems(filtered)
  const groupOptions = Array.from(
    new Set(items.map((item) => item.comparison_group?.trim()).filter((group): group is string => Boolean(group)))
  ).sort((a, b) => a.localeCompare(b))

  const roomTotal = items
    .filter((i) => i.status !== 'Not buying')
    .reduce((s, i) => s + (i.price || 0), 0)

  const wishlistTotal = items
    .filter((i) => i.status === 'Wishlist' || i.status === 'Considering')
    .reduce((s, i) => s + (i.price || 0), 0)

  const purchasedTotal = items
    .filter((i) => i.status === 'Purchased')
    .reduce((s, i) => s + (i.price || 0), 0)

  function withReactionDefaults(item: WishlistItem): WishlistItemWithReactions {
    return {
      ...item,
      reaction_counts: 'reaction_counts' in item ? item.reaction_counts : { ...EMPTY_REACTION_COUNTS },
      current_user_reaction: 'current_user_reaction' in item ? item.current_user_reaction : null,
    } as WishlistItemWithReactions
  }

  function handleSaved(item: WishlistItem) {
    const itemWithReactions = withReactionDefaults(item)
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === itemWithReactions.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = {
          ...itemWithReactions,
          reaction_counts: prev[idx].reaction_counts,
          current_user_reaction: prev[idx].current_user_reaction,
        }
        return updated
      }
      return [itemWithReactions, ...prev]
    })
    setShowModal(false)
    setEditItem(null)
  }

  function handleReactionChange(
    itemId: string,
    previousReaction: WishlistItemReactionValue | null,
    nextReaction: WishlistItemReactionValue | null
  ) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item

        const counts = { ...item.reaction_counts }
        if (previousReaction) counts[previousReaction] = Math.max(0, counts[previousReaction] - 1)
        if (nextReaction) counts[nextReaction] += 1

        return {
          ...item,
          reaction_counts: counts,
          current_user_reaction: nextReaction,
        }
      })
    )
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('wishlist_items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function handleEdit(item: WishlistItem) {
    setEditItem(item)
    setShowModal(true)
  }

  return (
    <div className="min-h-screen safe-bottom">
      <Header
        title={room.name}
        subtitle={`${items.length} item${items.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-950 text-sm font-semibold">
            Back
          </Link>
        }
      />

      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Room cost summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: roomTotal, color: '#2563eb' },
            { label: 'Purchased', value: purchasedTotal, color: '#16a34a' },
            { label: 'Wishlist', value: wishlistTotal, color: '#475467' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-3 text-center">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className="text-sm font-bold mt-1" style={{ color: s.color }}>
                {formatPrice(s.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Add product button */}
        <button
          onClick={() => { setEditItem(null); setShowModal(true) }}
          className="btn-primary"
        >
          Add product
        </button>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filter === f.value
                  ? 'bg-gray-950 text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Comparison groups */}
        {comparisonGroups.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-950">Compare options</h2>
              <span className="text-xs font-semibold text-gray-400">
                {comparisonGroups.length} group{comparisonGroups.length !== 1 ? 's' : ''}
              </span>
            </div>

            {comparisonGroups.map((group) => {
              const groupTotal = group.items.reduce((sum, item) => sum + (item.price || 0), 0)
              const cheapest = group.items.find((item) => item.price !== null)

              return (
                <div key={group.name} className="glass-card overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-950">{group.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {group.items.length} option{group.items.length !== 1 ? 's' : ''} compared
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Group total</p>
                        <p className="text-sm font-bold text-blue-600">{formatPrice(groupTotal)}</p>
                      </div>
                    </div>
                    {cheapest && (
                      <p className="mt-2 text-xs text-green-600 font-semibold">
                        Lowest price: {cheapest.title} at {formatPrice(cheapest.price || 0)}
                      </p>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left">
                      <thead>
                        <tr className="text-xs text-gray-400 uppercase tracking-wider">
                          <th className="px-4 py-2 font-bold">Product</th>
                          <th className="px-3 py-2 font-bold">Price</th>
                          <th className="px-3 py-2 font-bold">Retailer</th>
                          <th className="px-3 py-2 font-bold">Votes</th>
                          <th className="px-3 py-2 font-bold">Status</th>
                          <th className="px-3 py-2 font-bold">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => (
                          <tr key={item.id} className="border-t border-gray-100 align-top">
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleEdit(item)}
                                className="font-semibold text-gray-950 text-sm text-left hover:text-blue-600"
                              >
                                {item.title}
                              </button>
                            </td>
                            <td className="px-3 py-3 text-sm font-bold text-blue-600 whitespace-nowrap">
                              {item.price !== null ? formatPrice(item.price) : 'N/A'}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-600">
                              {item.retailer || 'N/A'}
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                              {item.reaction_counts.approve} approve, {item.reaction_counts.unsure} unsure, {item.reaction_counts.dislike} dislike
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-xs font-semibold px-2 py-1 rounded-md bg-gray-100 text-gray-600 whitespace-nowrap">
                                {item.status}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-500 max-w-[220px]">
                              {item.notes || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {/* Items */}
        {filtered.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <div className="w-10 h-10 rounded-md bg-gray-100 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold">No items yet</p>
            <p className="text-gray-400 text-sm mt-1">Tap &quot;Add product&quot; to start your wish list</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                userId={userId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={(id, status) => {
                  setItems((prev) =>
                    prev.map((i) => (i.id === id ? { ...i, status } : i))
                  )
                }}
                onReactionChange={handleReactionChange}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ProductModal
          roomId={room.id}
          houseId={room.house_id}
          userId={userId}
          groupOptions={groupOptions}
          editItem={editItem}
          onClose={() => { setShowModal(false); setEditItem(null) }}
          onSaved={handleSaved}
        />
      )}

      <BottomNav />
    </div>
  )
}
