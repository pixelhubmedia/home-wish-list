'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { House, Room, WishlistItem } from '@/types'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'

interface Props {
  house: House
  rooms: Room[]
  items: WishlistItem[]
}

function formatPrice(p: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(p)
}

function calcTotal(items: WishlistItem[]) {
  return items.reduce((s, i) => s + (i.price || 0), 0)
}

export default function DashboardClient({ house, rooms: initialRooms, items }: Props) {
  const router = useRouter()
  const [rooms, setRooms] = useState(initialRooms)
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [addingRoom, setAddingRoom] = useState(false)
  const [roomError, setRoomError] = useState('')
  const [copied, setCopied] = useState(false)

  const wishlistItems = items.filter(i => i.status !== 'Purchased' && i.status !== 'Not buying')
  const wishlistOnlyItems = items.filter(i => i.status === 'Wishlist')
  const consideringItems = items.filter(i => i.status === 'Considering')
  const purchasedItems = items.filter(i => i.status === 'Purchased')
  const totalWishlist = calcTotal(wishlistItems)
  const totalWishlistOnly = calcTotal(wishlistOnlyItems)
  const totalConsidering = calcTotal(consideringItems)
  const totalPurchased = calcTotal(purchasedItems)
  const totalAll = calcTotal(items.filter(i => i.status !== 'Not buying'))
  const remainingItemsCount = wishlistItems.length
  const purchasedPercentage = totalAll > 0 ? Math.round((totalPurchased / totalAll) * 100) : 0
  const totalWithConsidering = totalWishlistOnly + totalConsidering
  const mostExpensiveRoom = rooms
    .map((room) => ({
      ...room,
      total: calcTotal(items.filter(i => i.room_id === room.id && i.status !== 'Not buying')),
    }))
    .sort((a, b) => b.total - a.total)[0]

  function roomCost(roomId: string) {
    return calcTotal(items.filter(i => i.room_id === roomId && i.status !== 'Not buying' && i.status !== 'Purchased'))
  }

  function roomItemCount(roomId: string) {
    return items.filter(i => i.room_id === roomId).length
  }

  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault()
    setRoomError('')
    if (!newRoomName.trim()) return
    setAddingRoom(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('rooms')
      .insert({ house_id: house.id, name: newRoomName.trim() })
      .select()
      .single()

    if (error) { setRoomError(error.message); setAddingRoom(false); return }
    if (data) setRooms([...rooms, data])
    setNewRoomName('')
    setShowAddRoom(false)
    setAddingRoom(false)
    router.refresh()
  }

  async function copyInviteCode() {
    await navigator.clipboard.writeText(house.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen safe-bottom">
      <Header title={house.name} subtitle="Your home wish list" />

      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Invite code */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Invite code</p>
            <p className="text-xl font-semibold text-gray-950 tracking-widest mt-0.5">{house.invite_code}</p>
          </div>
          <button
            onClick={copyInviteCode}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              copied ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Budget summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: totalAll, color: '#2563eb' },
            { label: 'Purchased', value: totalPurchased, color: '#16a34a' },
            { label: 'Remaining', value: totalWishlist, color: '#475467' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-3 text-center">
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              <p className="text-base font-bold mt-1" style={{ color: stat.color }}>
                {formatPrice(stat.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-950">Insights</h2>
            <span className="text-xs font-semibold text-gray-400">
              {purchasedPercentage}% purchased
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <p className="text-xs text-gray-500 font-medium">Most expensive room</p>
              <p className="font-semibold text-gray-950 mt-1 truncate">
                {mostExpensiveRoom && mostExpensiveRoom.total > 0 ? mostExpensiveRoom.name : 'No spend yet'}
              </p>
              <p className="text-sm font-bold text-blue-600 mt-1">
                {mostExpensiveRoom && mostExpensiveRoom.total > 0 ? formatPrice(mostExpensiveRoom.total) : formatPrice(0)}
              </p>
            </div>

            <div className="glass-card p-4">
              <p className="text-xs text-gray-500 font-medium">Remaining items</p>
              <p className="font-semibold text-gray-950 mt-1">
                {remainingItemsCount} item{remainingItemsCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-400 mt-1">Wishlist and considering</p>
            </div>

            <div className="glass-card p-4">
              <p className="text-xs text-gray-500 font-medium">Purchased progress</p>
              <p className="font-semibold text-gray-950 mt-1">{purchasedPercentage}% complete</p>
              <div className="h-2 rounded-full bg-gray-100 mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${purchasedPercentage}%` }}
                />
              </div>
            </div>

            <div className="glass-card p-4">
              <p className="text-xs text-gray-500 font-medium">Wishlist + considering</p>
              <p className="font-semibold text-gray-950 mt-1">{formatPrice(totalWithConsidering)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {formatPrice(totalWishlistOnly)} wishlist + {formatPrice(totalConsidering)} considering
              </p>
            </div>
          </div>
        </div>

        {/* Rooms */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-950">Rooms</h2>
            <button
              onClick={() => setShowAddRoom(!showAddRoom)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Add room
            </button>
          </div>

          {showAddRoom && (
            <form onSubmit={handleAddRoom} className="glass-card p-4 mb-3 flex gap-2">
              <input
                type="text"
                className="input-field"
                placeholder="Room name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.75rem 1rem' }} disabled={addingRoom}>
                {addingRoom ? '…' : 'Add'}
              </button>
            </form>
          )}
          {roomError && <p className="text-red-500 text-sm mb-2">{roomError}</p>}

          {rooms.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="w-10 h-10 rounded-md bg-gray-100 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No rooms yet. Add your first room above.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {rooms.map((room) => (
                <Link key={room.id} href={`/dashboard/rooms/${room.id}`}>
                  <div className="glass-card p-4 flex items-center justify-between hover:border-gray-300 active:scale-[0.99] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-semibold">
                        {getRoomInitial(room.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-950">{room.name}</p>
                        <p className="text-xs text-gray-500">
                          {roomItemCount(room.id)} item{roomItemCount(room.id) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-600">{formatPrice(roomCost(room.id))}</p>
                        <p className="text-xs text-gray-400">remaining</p>
                      </div>
                      <span className="text-gray-400">/</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

function getRoomInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || 'R'
}
