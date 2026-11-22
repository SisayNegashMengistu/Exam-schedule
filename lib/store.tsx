'use client'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { hashPassword } from './auth'
import { withCatalog } from './catalog'
import { seedDB } from './seed'
import type { Account, DB } from './types'

const KEY = 'ddu-soc-schedule:v2'
const USER_KEY = 'ddu-soc-user'

type Ctx = {
  db: DB; update: (fn: (d: DB) => DB) => void; resetAll: () => void; replaceAll: (d: DB) => void
  office: boolean; user: Account | null
  login: (username: string, password: string) => boolean
  logout: () => void
  changePassword: (current: string, next: string) => string | null
  resetPassword: (username: string, next: string) => string | null
  selId: string; setSelId: (id: string) => void
  toast: (msg: string, tone?: 'ok' | 'bad') => void; ready: boolean
}
const C = createContext<Ctx>(null as never)
export const useApp = () => useContext(C)

const merge = (p: Partial<DB>): DB => withCatalog({
  ...seedDB, ...p,
  settings: { ...seedDB.settings, ...p.settings },
  accounts: p.accounts?.length ? p.accounts : seedDB.accounts,
  blocks: p.blocks ?? [],
  rooms: p.rooms ?? [],
  timeSlots: p.timeSlots?.length ? p.timeSlots : seedDB.timeSlots,
  batches: p.batches?.length ? p.batches : seedDB.batches,
  schedules: (p.schedules ?? seedDB.schedules).map((s) => ({ ...s, semester: s.semester ?? '' })),
  departments: (p.departments ?? seedDB.departments).map((d: any) => ({ headName: d.deanName ?? '', headPhone: d.deanPhone ?? '', ...d })),
  invigilators: p.invigilators ?? seedDB.invigilators,
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => withCatalog(seedDB))
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<Account | null>(null)
  const [selId, setSelId] = useState('')
  const [msg, setMsg] = useState<{ t: string; tone: string } | null>(null)

  useEffect(() => {
    let next = withCatalog(seedDB)
    try { const raw = localStorage.getItem(KEY); if (raw) next = merge(JSON.parse(raw)) } catch {}
    setDb(next)
    try {
      const id = sessionStorage.getItem(USER_KEY)
      setUser(next.accounts.find((a) => a.id === id) ?? null)
    } catch {}
    setReady(true)
  }, [])
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify(db)) } catch {} }, [db, ready])
  useEffect(() => { if (!db.schedules.some((s) => s.id === selId)) setSelId(db.schedules.at(-1)?.id ?? '') }, [db.schedules, selId])
  useEffect(() => {
    setUser((u) => {
      if (!u) return u
      const fresh = db.accounts.find((a) => a.id === u.id)
      if (!fresh) return null
      if (fresh.passwordHash === u.passwordHash && fresh.username === u.username && fresh.name === u.name) return u
      return fresh
    })
  }, [db.accounts])

  const commit = (fn: (d: DB) => DB) => setDb((d) => withCatalog(fn(d)))
  const toast = useCallback((t: string, tone: 'ok' | 'bad' = 'ok') => { setMsg({ t, tone }); setTimeout(() => setMsg(null), 3200) }, [])

  const login = (username: string, password: string) => {
    const acc = db.accounts.find((a) => a.username.toLowerCase() === username.trim().toLowerCase())
    if (!acc || acc.passwordHash !== hashPassword(password) || acc.role !== 'editor') return false
    setUser(acc)
    try { sessionStorage.setItem(USER_KEY, acc.id) } catch {}
    return true
  }
  const logout = () => { setUser(null); try { sessionStorage.removeItem(USER_KEY) } catch {} }
  const changePassword = (current: string, next: string) => {
    if (!user) return 'Sign in first.'
    if (hashPassword(current) !== user.passwordHash) return 'Current password is incorrect.'
    if (next.trim().length < 6) return 'Use at least 6 characters.'
    const passwordHash = hashPassword(next)
    commit((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === user.id ? { ...a, passwordHash } : a)) }))
    return null
  }
  const resetPassword = (username: string, next: string) => {
    const acc = db.accounts.find((a) => a.username.toLowerCase() === username.trim().toLowerCase())
    if (!acc) return 'No account uses that username.'
    if (next.trim().length < 6) return 'Use at least 6 characters.'
    const passwordHash = hashPassword(next)
    commit((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === acc.id ? { ...a, passwordHash } : a)) }))
    return null
  }

  return (
    <C.Provider value={{
      db, update: commit, resetAll: () => setDb(withCatalog(seedDB)), replaceAll: (d) => setDb(merge(d)),
      office: !!user, user, login, logout, changePassword, resetPassword, selId, setSelId, toast, ready,
    }}>
      {children}
      {msg && <div role="status" className={`toast ${msg.tone === 'bad' ? 'toast-bad' : ''}`}>{msg.t}</div>}
    </C.Provider>
  )
}
