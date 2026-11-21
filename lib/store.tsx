'use client'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { seedDB } from './seed'
import type { DB } from './types'

const KEY = 'ddu-soc-schedule:v2'
const PIN_KEY = 'ddu-soc-office'

type Ctx = {
  db: DB; update: (fn: (d: DB) => DB) => void; resetAll: () => void; replaceAll: (d: DB) => void
  office: boolean; unlock: (pin: string) => boolean; lock: () => void
  selId: string; setSelId: (id: string) => void
  toast: (msg: string, tone?: 'ok' | 'bad') => void; ready: boolean
}
const C = createContext<Ctx>(null as never)
export const useApp = () => useContext(C)

// Also migrates data saved by the previous version (dean/registrar fields on departments -> department head).
const merge = (p: Partial<DB>): DB => ({
  ...seedDB, ...p,
  settings: { ...seedDB.settings, ...p.settings },
  schedules: (p.schedules ?? seedDB.schedules).map((s) => ({ ...s, semester: s.semester ?? '' })),
  departments: (p.departments ?? seedDB.departments).map((d: any) => ({ headName: d.deanName ?? '', headPhone: d.deanPhone ?? '', ...d })),
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(seedDB)
  const [ready, setReady] = useState(false)
  const [office, setOffice] = useState(false)
  const [selId, setSelId] = useState('')
  const [msg, setMsg] = useState<{ t: string; tone: string } | null>(null)

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setDb(merge(JSON.parse(raw))) } catch {}
    try { setOffice(sessionStorage.getItem(PIN_KEY) === '1') } catch {}
    setReady(true)
  }, [])
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify(db)) } catch {} }, [db, ready])
  useEffect(() => { if (!db.schedules.some((s) => s.id === selId)) setSelId(db.schedules.at(-1)?.id ?? '') }, [db.schedules, selId])

  const toast = useCallback((t: string, tone: 'ok' | 'bad' = 'ok') => { setMsg({ t, tone }); setTimeout(() => setMsg(null), 3200) }, [])
  const unlock = (pin: string) => {
    if (pin !== db.settings.pin) return false
    setOffice(true); try { sessionStorage.setItem(PIN_KEY, '1') } catch {}; return true
  }
  const lock = () => { setOffice(false); try { sessionStorage.removeItem(PIN_KEY) } catch {} }

  return (
    <C.Provider value={{ db, update: setDb, resetAll: () => setDb(seedDB), replaceAll: (d) => setDb(merge(d)), office, unlock, lock, selId, setSelId, toast, ready }}>
      {children}
      {msg && <div role="status" className={`toast ${msg.tone === 'bad' ? 'toast-bad' : ''}`}>{msg.t}</div>}
    </C.Provider>
  )
}
