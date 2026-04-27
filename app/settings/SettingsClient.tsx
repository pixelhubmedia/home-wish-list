'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { House } from '@/types'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'

interface Props {
  user: { id: string; email: string }
  house: House | null
}

export default function SettingsClient({ user, house }: Props) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  async function copyInviteCode() {
    if (!house) return
    await navigator.clipboard.writeText(house.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen safe-bottom">
      <Header title="Settings" />

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Account */}
        <div className="glass-card p-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Account</h2>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f9cf9, #a78bfa)' }}
            >
              {user.email[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{user.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">Signed in</p>
            </div>
          </div>
        </div>

        {/* House info */}
        {house && (
          <div className="glass-card p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your home</h2>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs text-gray-500">House name</p>
                <p className="font-semibold text-gray-800 mt-0.5">{house.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Invite code</p>
                <div className="flex items-center gap-3">
                  <div className="glass-card px-4 py-2.5 flex-1 text-center">
                    <span className="text-xl font-bold tracking-[0.3em] text-blue-600">
                      {house.invite_code}
                    </span>
                  </div>
                  <button
                    onClick={copyInviteCode}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(79,156,249,0.15)',
                      color: copied ? '#16a34a' : '#2563eb',
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Share this code with your partner so they can join your home.
                </p>
              </div>
            </div>
          </div>
        )}

        {!house && (
          <div className="glass-card p-5 text-center">
            <p className="text-gray-500 text-sm mb-3">You haven&apos;t set up a home yet.</p>
            <a
              href="/onboarding"
              className="text-blue-500 font-semibold text-sm"
            >
              Set up your home →
            </a>
          </div>
        )}

        {/* Sign out */}
        <div className="glass-card p-2">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full py-3.5 rounded-xl text-base font-semibold transition-all"
            style={{ color: '#dc2626' }}
          >
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 pb-2">Home Wish List · Made with ❤️</p>
      </div>

      <BottomNav />
    </div>
  )
}
