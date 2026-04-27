import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <nav className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-gray-950 text-white flex items-center justify-center text-sm font-semibold">
              HW
            </div>
            <span className="font-semibold text-gray-950">Home Wish List</span>
          </div>
          <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-gray-950">
            Sign in
          </Link>
        </nav>

        <section className="py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-600 mb-4">Home planning for shared decisions</p>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-normal text-gray-950 leading-tight">
              Build a practical buying plan for every room.
            </h1>
            <p className="text-lg text-gray-600 mt-5 leading-8">
              Save products, compare options, track spend, and make decisions with your partner before you buy.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8 max-w-md">
              <Link href="/auth/signup" className="flex-1">
                <button className="btn-primary">Get started</button>
              </Link>
              <Link href="/auth/login" className="flex-1">
                <button className="btn-secondary">Sign in</button>
              </Link>
            </div>
          </div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { title: 'Rooms', desc: 'Keep purchases organised by space.' },
              { title: 'Budget', desc: 'Track costs before you commit.' },
              { title: 'Compare', desc: 'Review similar products side by side.' },
              { title: 'Decide', desc: 'Use partner votes to agree faster.' },
            ].map((f) => (
              <div key={f.title} className="glass-card p-5">
                <p className="font-semibold text-gray-950 text-sm">{f.title}</p>
                <p className="text-gray-500 text-sm mt-2 leading-6">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
