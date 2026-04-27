'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    // If email confirmation is disabled in Supabase, redirect immediately
    setTimeout(() => router.push('/onboarding'), 1500)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-10 h-10 mx-auto rounded-md bg-gray-950 text-white flex items-center justify-center mb-4 text-sm font-semibold">
            HW
          </div>
          <h1 className="text-2xl font-semibold text-gray-950">Create account</h1>
          <p className="text-gray-500 mt-1 text-sm">Start planning your dream home</p>
        </div>

        <div className="glass-card p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                OK
              </div>
              <p className="font-semibold text-gray-950">Account created</p>
              <p className="text-gray-500 text-sm mt-1">Redirecting you now...</p>
            </div>
          ) : (
            <form onSubmit={handleSignUp} className="flex flex-col gap-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className="btn-primary mt-2" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-600 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
