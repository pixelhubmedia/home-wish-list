'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '🏠', label: 'Home' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="glass mx-4 mb-4 rounded-2xl"
        style={{ boxShadow: '0 8px 32px rgba(31,38,135,0.15)' }}
      >
        <div className="flex items-center justify-around py-2 px-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-all ${
                  active ? 'bg-blue-50' : ''
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className={`text-xs font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
