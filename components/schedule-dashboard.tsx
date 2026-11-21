'use client'

import { useMemo, useState } from 'react'
import { Bell, CalendarDays, CheckCircle2, Clock3, FileText, LayoutDashboard, BarChart3, Lock, LockOpen, Mail, MapPin, Pencil, Phone, Plus, Printer, Save, Search, SlidersHorizontal, Trash2, Settings2, AlertTriangle, CircleDashed } from 'lucide-react'
import { useApp } from '@/lib/store'
import { ethFull, ethLabel } from '@/lib/ethiopian'
import { STATUSES, fmtDate, scheduleLabel, scheduleStatus, uid, weekday, type Exam, type ExamStatus, type Schedule } from '@/lib/types'
import { Field, Logo, Modal, StatusBadge, ThemeToggle } from './ui-bits'
import { ManagePage } from './manage'
import { ReportsPage } from './reports'

export function ScheduleDashboard() {
  const { db, office, unlock, lock, selId, ready, toast } = useApp()
  const [view, setView] = useState<'schedule' | 'reports' | 'manage'>('schedule')
  const [pinOpen, setPinOpen] = useState(false)
  const sched = db.schedules.find((s) => s.id === selId)
  const s = db.settings
  const activeView = view === 'manage' && !office ? 'schedule' : view

  type V = 'schedule' | 'reports' | 'manage'
  const nav: { id: V; label: string; icon: typeof Lock }[] = [{ id: 'schedule', label: 'Exam schedule', icon: LayoutDashboard }, { id: 'reports', label: 'Reports', icon: BarChart3 }, ...(office ? [{ id: 'manage' as V, label: 'Manage', icon: Settings2 }] : [])]
  return (
    <div className="min-h-screen">
      <aside className="no-print fixed inset-y-0 left-0 z-20 hidden w-[250px] flex-col border-r border-line bg-card px-5 py-6 lg:flex">
        <div className="mb-9 flex items-center gap-3"><Logo size={44} /><div><p className="text-[13px] font-bold uppercase leading-tight tracking-tight">{s.university.replace(' University', '')}</p><p className="text-[10px] font-semibold tracking-[.16em] text-muted">UNIVERSITY · IoT</p></div></div>
        <p className="mb-3 px-2 text-[10px] font-bold tracking-[.14em] text-muted">ACADEMIC PORTAL</p>
        <nav className="flex flex-col gap-1" aria-label="Main navigation">
          {nav.map((n) => <button key={n.id} onClick={() => setView(n.id)} className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition ${activeView === n.id ? 'bg-soft text-brand' : 'text-muted hover:bg-soft'}`}><n.icon size={17} />{n.label}</button>)}
          <a href="#contacts" onClick={() => setView('schedule')} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-muted transition hover:bg-soft"><FileText size={17} /> Contacts & notices</a>
        </nav>
        <div className="mt-auto rounded-xl bg-soft p-4">
          <p className="text-xs font-semibold">Need help?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">Contact your department registrar for schedule questions.</p>
          {s.registrarPhone && <a className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-brand" href={`tel:${s.registrarPhone.replace(/\s/g, '')}`}><Phone size={12} />{s.registrarPhone}</a>}
          {s.registrarEmail && <a className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-brand" href={`mailto:${s.registrarEmail}`}><Mail size={12} />{s.registrarEmail}</a>}
        </div>
        <button onClick={() => (office ? (lock(), setView('schedule'), toast('Office mode locked')) : setPinOpen(true))} className="btn mt-4 w-full justify-start">{office ? <LockOpen size={15} /> : <Lock size={15} />}{office ? 'Office mode · Lock' : 'Office login'}</button>
      </aside>

      <div className="lg:pl-[250px]">
        <header className="no-print sticky top-0 z-10 flex h-[66px] items-center justify-between border-b border-line bg-card/90 px-4 backdrop-blur md:px-9">
          <div className="flex items-center gap-3">
            <span className="lg:hidden"><Logo size={34} /></span>
            <div className="hidden items-center gap-2 text-xs text-muted sm:flex"><span>{s.school}</span><span>/</span><span className="font-semibold text-fg">{{ manage: 'Manage', reports: 'Reports', schedule: 'Exam schedule' }[activeView]}</span></div>
            <span className="text-sm font-semibold sm:hidden">Exam schedule</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1 lg:hidden">{nav.map((n) => <button key={n.id} aria-label={n.label} onClick={() => setView(n.id)} className={`icon-btn ${activeView === n.id ? 'bg-soft text-brand' : ''}`}><n.icon size={17} /></button>)}</div>
            {sched && <span className="mr-1 hidden rounded-full border border-line px-3 py-1.5 text-[11px] font-medium text-muted md:inline-flex">{sched.academicYear}{sched.semester && ` · ${sched.semester}`}</span>}
            <ThemeToggle />
            <button className="icon-btn lg:hidden" aria-label={office ? 'Lock office mode' : 'Office login'} onClick={() => (office ? (lock(), setView('schedule')) : setPinOpen(true))}>{office ? <LockOpen size={17} /> : <Lock size={17} />}</button>
          </div>
        </header>

        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-9 md:py-10" id="schedule">
          {!ready ? null : activeView === 'manage' ? <ManagePage /> : activeView === 'reports' ? <ReportsPage /> : <SchedulePage sched={sched} />}
          <p className="mt-6 text-center text-[10px] text-muted">{s.university} · {s.institute}{office ? ' · Office mode: edits save to this browser' : ''}</p>
        </main>
      </div>
      {pinOpen && <PinModal onClose={() => setPinOpen(false)} onOk={(p) => (unlock(p) ? (setPinOpen(false), toast('Office mode unlocked'), true) : false)} />}
    </div>
  )
}

function PinModal({ onClose, onOk }: { onClose: () => void; onOk: (p: string) => boolean }) {
  const [pin, setPin] = useState(''); const [bad, setBad] = useState(false)
  return <Modal title="Office login" onClose={onClose}>
    <form onSubmit={(e) => { e.preventDefault(); setBad(!onOk(pin)) }}>
      <Field label="Office PIN"><input autoFocus type="password" className="input" value={pin} onChange={(e) => { setPin(e.target.value); setBad(false) }} /></Field>
      {bad && <p className="mt-2 text-xs text-bad">Incorrect PIN.</p>}
      <button className="btn btn-primary mt-5 w-full" type="submit">Unlock editing</button>
    </form>
  </Modal>
}

const stateTone: Record<string, string> = { Completed: 'st-Completed', 'In progress': 'st-Late-start', Upcoming: 'st-Not-updated' }

function SchedulePage({ sched }: { sched?: Schedule }) {
  const { db, update, office, selId, setSelId, toast } = useApp()
  const [deptF, setDeptF] = useState('all'); const [dateF, setDateF] = useState('all'); const [resF, setResF] = useState('all')
  const [tab, setTab] = useState('All exams'); const [q, setQ] = useState('')
  const [drafts, setDrafts] = useState<Record<string, ExamStatus>>({})
  const [editing, setEditing] = useState<Exam | 'new' | null>(null)
  const [alertsOpen, setAlertsOpen] = useState(false)

  const years = [...new Set(db.schedules.map((x) => x.academicYear))]
  const dept = (id: string) => db.departments.find((d) => d.id === id)
  const invName = (id: string) => db.invigilators.find((i) => i.id === id)?.name
  const exams = useMemo(() => [...(sched?.exams ?? [])].sort((a, b) => a.date.localeCompare(b.date) || a.session.localeCompare(b.session) || a.code.localeCompare(b.code)), [sched])
  const dates = [...new Set(exams.map((e) => e.date))]
  const filtered = exams.filter((e) => (deptF === 'all' || e.deptId === deptF) && (dateF === 'all' || e.date === dateF) && (resF === 'all' || e.status === resF) && (tab === 'All exams' || e.session === tab)
    && `${e.title} ${e.code} ${dept(e.deptId)?.name} ${e.group} ${e.room} ${ethLabel(e.date)} ${weekday(e.date)} ${e.invigilatorIds.map(invName).join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  const scope = exams.filter((e) => deptF === 'all' || e.deptId === deptF)
  const count = (st: ExamStatus) => scope.filter((e) => e.status === st).length
  const done = scope.filter((e) => e.status !== 'Not updated').length
  const status = scheduleStatus(sched)
  const alerts = exams.filter((e) => e.status === 'Missed' || e.status === 'Late start')
  const dirty = Object.keys(drafts).filter((id) => exams.find((e) => e.id === id)?.status !== drafts[id])

  const writeExams = (fn: (list: Exam[]) => Exam[]) => update((d) => ({ ...d, schedules: d.schedules.map((s) => (s.id === sched?.id ? { ...s, exams: fn(s.exams) } : s)) }))
  const saveStatuses = (ids: string[]) => {
    if (!sched) return
    const now = new Date().toISOString()
    const next = sched.exams.map((e) => (ids.includes(e.id) && drafts[e.id] ? { ...e, status: drafts[e.id], updatedAt: now } : e))
    const before = scheduleStatus(sched), after = scheduleStatus({ ...sched, exams: next })
    writeExams(() => next)
    setDrafts((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !ids.includes(k))))
    toast(after === 'Completed' && before !== 'Completed' ? `All exams recorded — "${sched.name}" is now Completed` : ids.length > 1 ? `${ids.length} results saved` : 'Result saved')
  }
  const saveExam = (e: Exam) => { writeExams((l) => (l.some((x) => x.id === e.id) ? l.map((x) => (x.id === e.id ? e : x)) : [...l, e])); setEditing(null); toast('Exam saved') }
  const delExam = (e: Exam) => confirm(`Delete ${e.code} · ${e.title}?`) && writeExams((l) => l.filter((x) => x.id !== e.id))

  if (!sched) return <div className="card p-12 text-center"><CircleDashed className="mx-auto mb-3 text-muted" /><p className="text-sm font-semibold">No schedules yet</p><p className="mt-1 text-xs text-muted">{office ? 'Open Manage → Schedules to add one.' : 'Check back soon.'}</p></div>

  const dates2 = exams.map((e) => e.date).sort()
  const period = dates2.length ? `${fmtDate(dates2[0]).replace(/, \d+$/, '')} – ${fmtDate(dates2.at(-1)!).replace(/, \d+$/, '')}` : '—'
  return <>
    <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-muted"><span className="size-1.5 rounded-full bg-gold" /> Registrar’s office <span>/</span> {sched.name}</div>
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-[28px] font-semibold tracking-tight md:text-[34px]">{sched.name} schedule</h1><span className={`badge ${stateTone[status]}`}>{status === 'Completed' && <CheckCircle2 size={12} className="mr-1" />}{status}</span></div>
        <p className="mt-1.5 text-[13px] text-muted">{db.settings.school} · Regular students · {sched.academicYear}{sched.semester && ` · ${sched.semester}`}</p>
      </div>
      <div className="no-print flex flex-wrap items-center gap-2">
        <select aria-label="Academic year" className="input !h-10 !w-auto" value={sched.academicYear} onChange={(e) => setSelId(db.schedules.filter((x) => x.academicYear === e.target.value).at(-1)!.id)}>{years.map((y) => <option key={y}>{y}</option>)}</select>
        <select aria-label="Schedule" className="input !h-10 !w-auto" value={selId} onChange={(e) => setSelId(e.target.value)}>{db.schedules.filter((x) => x.academicYear === sched.academicYear).map((x) => <option key={x.id} value={x.id}>{scheduleLabel(x)} · {scheduleStatus(x)}</option>)}</select>
        <div className="relative"><button className="btn" aria-label={`Follow-ups: ${alerts.length}`} onClick={() => setAlertsOpen((o) => !o)}><Bell size={15} />Follow-ups{alerts.length > 0 && <span className="grid size-5 place-items-center rounded-full bg-bad text-[10px] text-white">{alerts.length}</span>}</button></div>
        <button className="btn" onClick={() => window.print()}><Printer size={15} /> Print</button>
      </div>
    </div>

    {alertsOpen && <section aria-live="polite" className={`card mb-6 flex gap-3 p-4 text-xs ${alerts.length ? 'border-bad/40' : ''}`}><AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" /><div className="space-y-1.5"><p className="font-semibold">{alerts.length ? `${alerts.length} exam${alerts.length > 1 ? 's' : ''} need follow-up` : 'No follow-ups needed'}</p>{alerts.map((e) => { const d = dept(e.deptId); return <p key={e.id} className="text-muted"><b className="text-fg">{d?.short}</b> · {e.title} — {e.status}{d?.headPhone && <> · Head <a className="font-semibold text-brand" href={`tel:${d.headPhone.replace(/\s/g, '')}`}>{d.headPhone}</a></>}</p> })}</div></section>}

    <section className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat icon={<CalendarDays size={17} />} label="Exam period" value={period} note={`${dates.length} exam days · ${exams.length} exams`} />
      <Stat icon={<CheckCircle2 size={17} />} label="Completed" value={String(count('Completed'))} note={`${done} of ${scope.length} recorded`} bar={scope.length ? (done / scope.length) * 100 : 0} />
      <Stat icon={<AlertTriangle size={17} />} label="Missed / late" value={`${count('Missed')} / ${count('Late start')}`} note="Review and follow up" />
      <Stat icon={<CircleDashed size={17} />} label="Not updated" value={String(count('Not updated'))} note="Awaiting office status" />
    </section>

    <section className="card overflow-hidden">
      <div className="border-b border-line px-5 py-5 md:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div><h2 className="text-[15px] font-semibold">{sched.name} timetable</h2><p className="mt-1 text-xs text-muted">Find your exam date, session, room and invigilators.</p></div>
          <div className="flex w-full gap-2 md:max-w-[420px]"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exams" placeholder="Course, code, ህዳር 15, room…" className="input pl-9" /></div>
            {office && <button className="btn btn-primary no-print shrink-0" onClick={() => setEditing('new')}><Plus size={15} /> Add exam</button>}</div>
        </div>
        <div className="no-print mt-5 flex flex-wrap items-center gap-2"><SlidersHorizontal size={14} className="mr-1 text-muted" />
          <select aria-label="Filter by program" className="input !h-9 !w-auto !text-[11px]" value={deptF} onChange={(e) => setDeptF(e.target.value)}><option value="all">All programs</option>{db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <select aria-label="Filter by date" className="input !h-9 !w-auto !text-[11px]" value={dateF} onChange={(e) => setDateF(e.target.value)}><option value="all">All dates</option>{dates.map((d) => <option key={d} value={d}>{fmtDate(d).replace(/, \d+$/, '')} · {weekday(d)}</option>)}</select>
          <select aria-label="Filter by result" className="input !h-9 !w-auto !text-[11px]" value={resF} onChange={(e) => setResF(e.target.value)}><option value="all">All results</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
          <span className="ml-auto text-[11px] text-muted">Showing <strong className="text-fg">{filtered.length}</strong> exams</span>
        </div>
        <div className="no-print mt-5 flex gap-5 border-b border-line text-xs">{['All exams', 'Morning', 'Afternoon'].map((t) => <button key={t} onClick={() => setTab(t)} className={`-mb-px cursor-pointer border-b-2 pb-3 font-semibold transition ${tab === t ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-fg'}`}>{t}</button>)}</div>
      </div>

      {office && dirty.length > 0 && <div className="no-print flex items-center justify-between gap-3 border-b border-line bg-soft px-6 py-3 text-xs"><span><b>{dirty.length}</b> unsaved result{dirty.length > 1 ? 's' : ''}</span><button className="btn btn-primary btn-sm" onClick={() => saveStatuses(dirty)}><Save size={13} /> Save all</button></div>}

      <div className="overflow-x-auto"><table className="w-full min-w-[980px] border-collapse text-left">
        <thead><tr className="bg-soft/60"><th className="th px-6">Date & time</th><th className="th">Course</th><th className="th">Program & year</th><th className="th">Room</th><th className="th">Invigilators</th><th className="th">Result</th><th className="th">Session</th></tr></thead>
        <tbody className="divide-y divide-line">{filtered.map((e) => {
          const d = dept(e.deptId); const draft = drafts[e.id] ?? e.status; const changed = draft !== e.status
          return <tr key={e.id} className="align-top transition hover:bg-soft/40">
            <td className="whitespace-nowrap px-6 py-4"><p className="text-xs font-semibold">{fmtDate(e.date)}</p><p className="mt-1 text-[10px] text-muted">{weekday(e.date)} · {ethFull(e.date)}</p><p className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted"><Clock3 size={11} />{e.start} – {e.end} LT</p></td>
            <td className="px-4 py-4"><p className="text-[12px] font-semibold">{e.title}</p><p className="mt-1 text-[10px] font-medium tracking-wide text-muted">{e.code}</p></td>
            <td className="px-4 py-4"><p className="text-[11px] font-medium">{d?.name ?? '—'}</p><p className="mt-1 text-[10px] text-muted">{e.group}</p></td>
            <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 text-[11px]"><MapPin size={12} className="text-muted" />{e.room}</span></td>
            <td className="px-4 py-4 text-[11px]">{e.invigilatorIds.length ? e.invigilatorIds.map((i) => <p key={i} className="leading-5">{invName(i) ?? '—'}</p>) : <span className="text-muted">{office ? 'Not assigned' : '—'}</span>}</td>
            <td className="px-4 py-4">{office ? <div className="no-print flex items-center gap-1.5"><select aria-label={`Result for ${e.title}`} value={draft} onChange={(ev) => setDrafts((x) => ({ ...x, [e.id]: ev.target.value as ExamStatus }))} className={`input !h-8 !w-auto !px-2 !text-[10px] font-semibold st-${draft.replace(' ', '-')}`}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
              <button className="btn btn-primary btn-sm" disabled={!changed} onClick={() => saveStatuses([e.id])} aria-label={`Save result for ${e.title}`}><Save size={12} />Save</button></div> : <StatusBadge status={e.status} />}
              {e.updatedAt && e.status !== 'Not updated' && <p className="mt-1 text-[9px] text-muted">Updated {new Date(e.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>}</td>
            <td className="px-4 py-4"><span className={`badge ${e.session === 'Morning' ? 'st-Completed' : 'st-Late-start'}`}>{e.session}</span>
              {office && <div className="no-print mt-2 flex gap-1"><button className="icon-btn !size-7" aria-label="Edit exam" onClick={() => setEditing(e)}><Pencil size={13} /></button><button className="icon-btn !size-7 hover:!text-bad" aria-label="Delete exam" onClick={() => delExam(e)}><Trash2 size={13} /></button></div>}</td>
          </tr>
        })}</tbody></table>
        {filtered.length === 0 && <div className="px-6 py-16 text-center"><Search className="mx-auto mb-3 text-muted" size={22} /><p className="text-sm font-semibold">No exams found</p><p className="mt-1 text-xs text-muted">{exams.length ? 'Try changing your search or filters.' : office ? 'Click “Add exam” to start this schedule.' : 'This schedule has no exams yet.'}</p></div>}
      </div>
      <footer className="flex flex-col justify-between gap-2 border-t border-line px-5 py-4 text-[10px] text-muted sm:flex-row md:px-6"><span>{db.settings.footer}</span><span>Last updated by {db.settings.school} Registrar</span></footer>
    </section>

    <Contacts />
    {editing && <ExamDialog exam={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={saveExam} />}
  </>
}

function Stat({ icon, label, value, note, bar }: { icon: React.ReactNode; label: string; value: string; note: string; bar?: number }) {
  return <div className="card p-4"><div className="flex items-center gap-2 text-muted"><span className="grid size-7 place-items-center rounded-lg bg-soft text-brand">{icon}</span><span className="text-[11px] font-medium">{label}</span></div><p className="mt-3 text-[21px] font-semibold tracking-tight">{value}</p><p className="mt-1 text-[10px] text-muted">{note}</p>{bar !== undefined && <div className="mt-2 h-1 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${bar}%` }} /></div>}</div>
}

function ContactCard({ title, role, name, phone, email, info }: { title?: string; role: string; name: string; phone: string; email?: string; info?: string }) {
  return <div className="card p-5"><div className="mb-3 flex items-center gap-2"><span className="h-5 w-1 rounded-full bg-gold" /><h3 className="text-sm font-semibold">{title ?? role}</h3></div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{title ? role : 'Name'}</p><p className="mb-3 mt-0.5 text-[13px] font-medium">{name || 'Not set'}</p>
    <div className="flex flex-wrap gap-2">{phone ? <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn btn-sm"><Phone size={12} />{phone}</a> : <span className="text-[11px] text-muted">No phone listed</span>}
      {email && <a href={`mailto:${email}`} className="btn btn-sm"><Mail size={12} />{email}</a>}</div>
    {info && <p className="mt-3 whitespace-pre-line text-[11px] leading-relaxed text-muted">{info}</p>}</div>
}

function Contacts() {
  const { db } = useApp(); const s = db.settings
  return <section id="contacts" className="mt-8"><h2 className="mb-1 text-[15px] font-semibold">Contacts</h2><p className="mb-4 text-xs text-muted">Reach the right office for more information.</p>
    <div className="mb-3 grid gap-3 md:grid-cols-2"><ContactCard role="Dean" name={s.deanName} phone={s.deanPhone} /><ContactCard role="Registrar" name={s.registrarName} phone={s.registrarPhone} email={s.registrarEmail} /></div>
    <p className="mb-3 mt-6 text-[11px] font-bold uppercase tracking-[.14em] text-muted">Department heads</p>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{db.departments.map((d) => <ContactCard key={d.id} title={d.name} role="Department head" name={d.headName} phone={d.headPhone} email={d.email} info={d.info} />)}</div></section>
}

function ExamDialog({ exam, onClose, onSave }: { exam: Exam | null; onClose: () => void; onSave: (e: Exam) => void }) {
  const { db } = useApp()
  const [f, setF] = useState<Exam>(exam ?? { id: uid(), code: '', title: '', date: '', start: '', end: '', session: 'Morning', deptId: db.departments[0]?.id ?? '', group: '', room: '', invigilatorIds: [], status: 'Not updated' })
  const set = <K extends keyof Exam>(k: K, v: Exam[K]) => setF((x) => ({ ...x, [k]: v }))
  const toggle = (id: string) => set('invigilatorIds', f.invigilatorIds.includes(id) ? f.invigilatorIds.filter((i) => i !== id) : [...f.invigilatorIds, id])
  const ok = f.code && f.title && f.date && f.deptId
  return <Modal wide title={exam ? 'Edit exam' : 'Add exam'} onClose={onClose}>
    <form onSubmit={(e) => { e.preventDefault(); ok && onSave(f) }} className="grid gap-3 sm:grid-cols-2">
      <Field label="Course code"><input required className="input" value={f.code} onChange={(e) => set('code', e.target.value)} /></Field>
      <Field label="Course title"><input required className="input" value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
      <Field label="Date"><input required type="date" className="input" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
      <Field label="Session"><select className="input" value={f.session} onChange={(e) => set('session', e.target.value as Exam['session'])}><option>Morning</option><option>Afternoon</option></select></Field>
      <Field label="Start (local time)"><input className="input" placeholder="2:00" value={f.start} onChange={(e) => set('start', e.target.value)} /></Field>
      <Field label="End (local time)"><input className="input" placeholder="4:00" value={f.end} onChange={(e) => set('end', e.target.value)} /></Field>
      <Field label="Department"><select className="input" value={f.deptId} onChange={(e) => set('deptId', e.target.value)}>{db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
      <Field label="Year / section"><input className="input" placeholder="3rd Year · 1st Sem" value={f.group} onChange={(e) => set('group', e.target.value)} /></Field>
      <Field label="Room" className="sm:col-span-2"><input className="input" placeholder="Block 30 · Room 24" value={f.room} onChange={(e) => set('room', e.target.value)} /></Field>
      <div className="sm:col-span-2"><p className="mb-1.5 text-[11px] font-semibold text-muted">Invigilators</p>
        {db.invigilators.length === 0 ? <p className="text-xs text-muted">No invigilators yet — add them in Manage → Invigilators.</p> :
          <div className="flex flex-wrap gap-2">{db.invigilators.map((i) => { const on = f.invigilatorIds.includes(i.id); return <button type="button" key={i.id} aria-pressed={on} onClick={() => toggle(i.id)} className={`btn btn-sm ${on ? 'btn-primary' : ''}`}>{i.name || 'Unnamed'}</button> })}</div>}</div>
      <div className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={!ok}><Save size={14} /> Save exam</button></div>
    </form>
  </Modal>
}
