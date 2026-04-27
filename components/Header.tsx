'use client'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  back?: string
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-white/40">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  )
}
