'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { Moon, Sun, X } from 'lucide-react'
import type { ExamStatus } from '@/lib/types'

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="no-print fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} className={`card max-h-[92vh] w-full overflow-y-auto p-6 ${wide ? 'max-w-2xl' : 'max-w-sm'}`}>
        <div className="mb-5 flex items-center justify-between"><h3 className="text-base font-semibold">{title}</h3><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={17} /></button></div>
        {children}
      </div>
    </div>
  )
}

export const Field = ({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) => (
  <label className={`block ${className}`}><span className="mb-1.5 block text-[11px] font-semibold text-muted">{label}</span>{children}</label>
)

export const StatusBadge = ({ status }: { status: ExamStatus }) => (
  <span className={`badge st-${status.replace(' ', '-')}`}>{status}</span>
)

export function Logo({ size = 40 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="Dire Dawa University seal" width={size} height={size} className="shrink-0 rounded-full" />
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), [])
  const flip = () => {
    const next = !dark; setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('ddu-theme', next ? 'dark' : 'light') } catch {}
  }
  return <button className="icon-btn" onClick={flip} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title={dark ? 'Light theme' : 'Dark theme'}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
}
