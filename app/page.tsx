import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo */}
        <div className="mb-8">
          <div
            className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #4f9cf9 0%, #a78bfa 100%)' }}
          >
            <span className="text-4xl">🏠</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Home Wish List</h1>
          <p className="text-lg text-gray-500 font-medium">Plan your dream home, together.</p>
        </div>

        {/* Tagline */}
        <div className="glass-card p-6 w-full max-w-sm mb-8">
          <p className="text-gray-600 text-base leading-relaxed">
            Save products from any retailer, organise by room, track your budget,
            and share with your partner — all in one place.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Link href="/auth/signup" className="block">
            <button className="btn-primary">Get started free</button>
          </Link>
          <Link href="/auth/login" className="block">
            <button className="btn-secondary">Sign in</button>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-12 flex flex-col gap-3 w-full max-w-sm">
          {[
            { icon: '🛋️', title: 'Organised by room', desc: 'Bedroom, kitchen, bathroom and more' },
            { icon: '💰', title: 'Budget tracking', desc: 'See total cost per room and whole house' },
            { icon: '🔗', title: 'Paste any URL', desc: 'Auto-fetch product details from any store' },
            { icon: '👫', title: 'Share with partner', desc: 'Invite code to collaborate together' },
          ].map((f) => (
            <div key={f.title} className="glass-card p-4 flex items-center gap-4 text-left">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{f.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
