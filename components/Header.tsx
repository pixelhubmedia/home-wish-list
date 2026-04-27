'use client'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  back?: string
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-950 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  )
}
