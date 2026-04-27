'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_ROOMS = ['Bedroom', 'Kitchen', 'Bathroom', 'Living Room', 'Dining Room']

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function OnboardingPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [houseName, setHouseName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!houseName.trim()) {
      setError('Please enter a house name.')
      return
    }
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Generate the house ID client-side so we can insert member + rooms
    // without needing to SELECT the house back (SELECT policy requires membership)
    const houseId = crypto.randomUUID()

    const { error: houseError } = await supabase
      .from('houses')
      .insert({ id: houseId, name: houseName.trim(), invite_code: generateInviteCode(), owner_id: user.id })

    if (houseError) {
      setError(houseError.message)
      setLoading(false)
      return
    }

    // Add owner as member (must happen before any SELECT on houses)
    const { error: memberError } = await supabase.from('house_members').insert({
      house_id: houseId,
      user_id: user.id,
      role: 'owner',
    })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    // Create default rooms
    const rooms = DEFAULT_ROOMS.map((name) => ({ house_id: houseId, name }))
    await supabase.from('rooms').insert(rooms)

    router.push('/dashboard')
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!inviteCode.trim()) {
      setError('Please enter an invite code.')
      return
    }
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Find house by invite code
    const { data: house, error: houseError } = await supabase
      .from('houses')
      .select('*')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single()

    if (houseError || !house) {
      setError('House not found. Check your invite code.')
      setLoading(false)
      return
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('house_members')
      .select('id')
      .eq('house_id', house.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      router.push('/dashboard')
      return
    }

    // Join the house
    const { error: joinError } = await supabase.from('house_members').insert({
      house_id: house.id,
      user_id: user.id,
      role: 'member',
    })

    if (joinError) {
      setError(joinError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-10 h-10 mx-auto rounded-md bg-gray-950 text-white flex items-center justify-center mb-4 text-sm font-semibold">
            HW
          </div>
          <h1 className="text-2xl font-semibold text-gray-950">Set up your home</h1>
          <p className="text-gray-500 mt-1 text-sm">Create a new house or join an existing one</p>
        </div>

        {/* Tabs */}
        <div className="glass-card p-1 mb-4 flex gap-1">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all ${
              tab === 'create'
                ? 'bg-gray-950 text-white'
                : 'text-gray-500'
            }`}
          >
            Create house
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all ${
              tab === 'join'
                ? 'bg-gray-950 text-white'
                : 'text-gray-500'
            }`}
          >
            Join house
          </button>
        </div>

        <div className="glass-card p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3 mb-4">
              {error}
            </div>
          )}

          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">House name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Our First Home"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-gray-400">
                We&apos;ll add Bedroom, Kitchen, Bathroom, Living Room &amp; Dining Room automatically.
              </p>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating…' : 'Create house'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Invite code</label>
                <input
                  type="text"
                  className="input-field uppercase tracking-widest"
                  placeholder="e.g. A1B2C3"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  required
                />
              </div>
              <p className="text-xs text-gray-400">
                Ask your partner to share the invite code from their dashboard settings.
              </p>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Joining…' : 'Join house'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
