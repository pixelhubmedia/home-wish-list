'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Room, WishlistItem, WishlistItemStatus } from '@/types'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import ProductModal from '@/components/ProductModal'
import ProductCard from '@/components/ProductCard'

interface Props {
  room: Room
  items: WishlistItem[]
  userId: string
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

export default function RoomClient({ room, items: initialItems, userId }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [filter, setFilter] = useState<WishlistItemStatus | 'All'>('All')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<WishlistItem | null>(null)

  const filtered = filter === 'All' ? items : items.filter((i) => i.status === filter)

  const roomTotal = items
    .filter((i) => i.status !== 'Not buying')
    .reduce((s, i) => s + (i.price || 0), 0)

  const wishlistTotal = items
    .filter((i) => i.status === 'Wishlist' || i.status === 'Considering')
    .reduce((s, i) => s + (i.price || 0), 0)

  const purchasedTotal = items
    .filter((i) => i.status === 'Purchased')
    .reduce((s, i) => s + (i.price || 0), 0)

  function handleSaved(item: WishlistItem) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = item
        return updated
      }
      return [item, ...prev]
    })
    setShowModal(false)
    setEditItem(null)
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
          <Link href="/dashboard" className="text-blue-500 text-sm font-semibold">
            ← Back
          </Link>
        }
      />

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Room cost summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: roomTotal, color: '#4f9cf9' },
            { label: 'Purchased', value: purchasedTotal, color: '#22c55e' },
            { label: 'Wishlist', value: wishlistTotal, color: '#a78bfa' },
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
          + Add product
        </button>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === f.value
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white/70 text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Items */}
        {filtered.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <p className="text-4xl mb-3">🛍️</p>
            <p className="text-gray-600 font-semibold">No items yet</p>
            <p className="text-gray-400 text-sm mt-1">Tap &quot;Add product&quot; to start your wish list</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={(id, status) => {
                  setItems((prev) =>
                    prev.map((i) => (i.id === id ? { ...i, status } : i))
                  )
                }}
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
          editItem={editItem}
          onClose={() => { setShowModal(false); setEditItem(null) }}
          onSaved={handleSaved}
        />
      )}

      <BottomNav />
    </div>
  )
}
