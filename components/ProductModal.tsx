'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WishlistItem, WishlistItemStatus, ProductMetadata } from '@/types'

interface Props {
  roomId: string
  houseId: string
  userId: string
  groupOptions?: string[]
  editItem: WishlistItem | null
  onClose: () => void
  onSaved: (item: WishlistItem) => void
}

const STATUSES: WishlistItemStatus[] = ['Wishlist', 'Considering', 'Purchased', 'Not buying']

export default function ProductModal({ roomId, houseId, userId, groupOptions = [], editItem, onClose, onSaved }: Props) {
  const [url, setUrl] = useState(editItem?.product_url || '')
  const [title, setTitle] = useState(editItem?.title || '')
  const [imageUrl, setImageUrl] = useState(editItem?.image_url || '')
  const [price, setPrice] = useState<string>(editItem?.price?.toString() || '')
  const [retailer, setRetailer] = useState(editItem?.retailer || '')
  const [comparisonGroup, setComparisonGroup] = useState(editItem?.comparison_group || '')
  const [notes, setNotes] = useState(editItem?.notes || '')
  const [status, setStatus] = useState<WishlistItemStatus>(editItem?.status || 'Wishlist')
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function fetchProduct() {
    if (!url.trim()) return
    setFetching(true)
    setFetchError('')

    try {
      const res = await fetch('/api/fetch-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      if (!res.ok) {
        setFetchError('Enter a valid product URL.')
        return
      }

      const data: ProductMetadata = await res.json()

      if (data.product_url) setUrl(data.product_url)
      if (data.title) setTitle(data.title)
      if (data.image_url) setImageUrl(data.image_url)
      if (data.price) setPrice(data.price.toString())
      if (data.retailer) setRetailer(data.retailer)

      if (!data.title && !data.image_url && !data.price) {
        setFetchError('This site blocked automatic details. Add the product manually.')
      }
    } catch {
      setFetchError('Could not fetch product details. Please fill in manually.')
    } finally {
      setFetching(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveError('')

    if (!title.trim()) {
      setSaveError('Please enter a product title.')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const payload = {
      room_id: roomId,
      house_id: houseId,
      user_id: userId,
      product_url: url.trim() || null,
      title: title.trim(),
      image_url: imageUrl.trim() || null,
      price: price ? parseFloat(price) : null,
      retailer: retailer.trim() || null,
      comparison_group: comparisonGroup.trim() || null,
      notes: notes.trim() || null,
      status,
      updated_at: new Date().toISOString(),
    }

    let data: WishlistItem | null = null
    let error = null

    if (editItem) {
      const res = await supabase
        .from('wishlist_items')
        .update(payload)
        .eq('id', editItem.id)
        .select()
        .single()
      data = res.data
      error = res.error
    } else {
      const res = await supabase
        .from('wishlist_items')
        .insert(payload)
        .select()
        .single()
      data = res.data
      error = res.error
    }

    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
    }

    if (data) onSaved(data)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg sm:max-h-[90vh] overflow-y-auto sm:rounded-lg rounded-t-lg bg-white shadow-xl"
        style={{
          maxHeight: '92dvh',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-gray-950">
              {editItem ? 'Edit product' : 'Add product'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 text-gray-500 text-lg hover:bg-gray-200"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3">
                {saveError}
              </div>
            )}

            {/* URL fetch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Product URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  className="input-field"
                  placeholder="Paste product link..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <button
                  type="button"
                  onClick={fetchProduct}
                  disabled={!url || fetching}
                  className="flex-shrink-0 px-4 py-2.5 rounded-md text-sm font-semibold transition-all disabled:opacity-50 bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {fetching ? '⟳' : 'Fetch'}
                </button>
              </div>
              {fetchError && <p className="text-orange-500 text-xs mt-1">{fetchError}</p>}
              {fetching && <p className="text-blue-500 text-xs mt-1">Fetching product details…</p>}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Product title *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. MALM Bed Frame"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL</label>
              <input
                type="url"
                className="input-field"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            {/* Price + Retailer */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (£)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Retailer</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. IKEA"
                  value={retailer}
                  onChange={(e) => setRetailer(e.target.value)}
                />
              </div>
            </div>

            {/* Comparison group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Compare with</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Sofa options"
                value={comparisonGroup}
                onChange={(e) => setComparisonGroup(e.target.value)}
                list="comparison-groups"
              />
              <datalist id="comparison-groups">
                {groupOptions.map((group) => (
                  <option key={group} value={group} />
                ))}
              </datalist>
              <p className="text-xs text-gray-400 mt-1">
                Use the same name on similar items to compare them together.
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      status === s
                        ? 'bg-gray-950 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                className="input-field resize-none"
                placeholder="Any notes about this item..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary mt-1" disabled={saving}>
              {saving ? 'Saving…' : editItem ? 'Save changes' : 'Add to wish list'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
