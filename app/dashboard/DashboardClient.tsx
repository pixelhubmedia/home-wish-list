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
  userId: string
}

function formatPrice(p: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(p)
}

function calcTotal(items: WishlistItem[]) {
  return items.reduce((s, i) => s + (i.price || 0), 0)
}

export default function DashboardClient({ house, rooms: initialRooms, items, userId }: Props) {
  const router = useRouter()
  const [rooms, setRooms] = useState(initialRooms)
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [addingRoom, setAddingRoom] = useState(false)
  const [roomError, setRoomError] = useState('')
  const [copied, setCopied] = useState(false)

  const wishlistItems = items.filter(i => i.status !== 'Purchased' && i.status !== 'Not buying')
  const purchasedItems = items.filter(i => i.status === 'Purchased')
  const totalWishlist = calcTotal(wishlistItems)
  const totalPurchased = calcTotal(purchasedItems)
  const totalAll = calcTotal(items.filter(i => i.status !== 'Not buying'))

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

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Invite code */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Invite code</p>
            <p className="text-2xl font-bold text-blue-600 tracking-widest mt-0.5">{house.invite_code}</p>
          </div>
          <button
            onClick={copyInviteCode}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(79,156,249,0.15)',
              color: copied ? '#16a34a' : '#2563eb',
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Budget summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: totalAll, color: '#4f9cf9' },
            { label: 'Purchased', value: totalPurchased, color: '#22c55e' },
            { label: 'Remaining', value: totalWishlist, color: '#a78bfa' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-3 text-center">
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              <p className="text-base font-bold mt-1" style={{ color: stat.color }}>
                {formatPrice(stat.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Rooms */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800">Rooms</h2>
            <button
              onClick={() => setShowAddRoom(!showAddRoom)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(79,156,249,0.15)', color: '#2563eb' }}
            >
              + Add room
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
              <p className="text-4xl mb-2">🛋️</p>
              <p className="text-gray-500 text-sm">No rooms yet. Add your first room above.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {rooms.map((room) => (
                <Link key={room.id} href={`/dashboard/rooms/${room.id}`}>
                  <div className="glass-card p-4 flex items-center justify-between active:scale-[0.98] transition-transform">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{ background: 'linear-gradient(135deg, rgba(79,156,249,0.15), rgba(167,139,250,0.15))' }}
                      >
                        {getRoomIcon(room.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{room.name}</p>
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
                      <span className="text-gray-300">›</span>
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

function getRoomIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes('bed')) return '🛏️'
  if (n.includes('kitchen')) return '🍳'
  if (n.includes('bath')) return '🛁'
  if (n.includes('living')) return '🛋️'
  if (n.includes('dining')) return '🍽️'
  if (n.includes('office') || n.includes('study')) return '💻'
  if (n.includes('garden') || n.includes('outdoor')) return '🌿'
  if (n.includes('garage')) return '🚗'
  if (n.includes('hall') || n.includes('entry')) return '🚪'
  return '🏠'
}
