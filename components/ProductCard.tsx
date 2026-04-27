'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { WishlistItem, WishlistItemStatus } from '@/types'

interface Props {
  item: WishlistItem
  onEdit: (item: WishlistItem) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: WishlistItemStatus) => void
}

const STATUS_COLORS: Record<WishlistItemStatus, { bg: string; text: string }> = {
  Wishlist: { bg: 'rgba(79,156,249,0.15)', text: '#2563eb' },
  Considering: { bg: 'rgba(251,191,36,0.15)', text: '#d97706' },
  Purchased: { bg: 'rgba(34,197,94,0.15)', text: '#16a34a' },
  'Not buying': { bg: 'rgba(239,68,68,0.15)', text: '#dc2626' },
}

const STATUSES: WishlistItemStatus[] = ['Wishlist', 'Considering', 'Purchased', 'Not buying']

function formatPrice(p: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(p)
}

export default function ProductCard({ item, onEdit, onDelete, onStatusChange }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

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
          <h3 className="font-semibold text-gray-800 text-base leading-snug flex-1">{item.title}</h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            {item.price !== null && (
              <span className="text-base font-bold text-blue-600">{formatPrice(item.price)}</span>
            )}
          </div>
        </div>

        {/* Retailer + status */}
        <div className="flex items-center gap-2 mb-3">
          {item.retailer && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">
              {item.retailer}
            </span>
          )}
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="text-xs font-semibold px-2 py-0.5 rounded-lg transition-all"
            style={{ background: statusStyle.bg, color: statusStyle.text }}
          >
            {item.status} ↕
          </button>
        </div>

        {/* Status menu */}
        {showStatusMenu && (
          <div className="glass-card p-2 mb-3 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                style={{
                  background: item.status === s ? STATUS_COLORS[s].bg : 'rgba(0,0,0,0.04)',
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
          <p className="text-sm text-gray-500 mb-3 bg-gray-50 rounded-xl p-2 leading-relaxed">
            {item.notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {item.product_url && (
            <a
              href={item.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-center transition-all"
              style={{ background: 'rgba(79,156,249,0.15)', color: '#2563eb' }}
            >
              View product
            </a>
          )}
          <button
            onClick={() => onEdit(item)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(0,0,0,0.05)', color: '#374151' }}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}
          >
            {deleting ? '…' : '✕'}
          </button>
        </div>
      </div>
    </div>
  )
}
