'use client'
import { useRef, useState } from 'react'
import { Building2, CalendarRange, Copy, Download, Plus, Settings2, Trash2, Upload, Users } from 'lucide-react'
import { useApp } from '@/lib/store'
import { scheduleStatus, uid, type DB, type Dept, type Invigilator, type Schedule, type Settings } from '@/lib/types'
import { Field } from './ui-bits'
import { ImportPanel } from './import-panel'

const TABS = [
  { id: 'schedules', label: 'Schedules', icon: CalendarRange },
  { id: 'departments', label: 'Departments & contacts', icon: Building2 },
  { id: 'import', label: 'Import exams', icon: Upload },
  { id: 'invigilators', label: 'Invigilators', icon: Users },
  { id: 'settings', label: 'Settings & data', icon: Settings2 },
] as const

export function ManagePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('schedules')
  return (
    <div>
      <div className="mb-6"><h1 className="text-[28px] font-semibold tracking-tight">Manage</h1><p className="mt-1 text-[13px] text-muted">Everything shown to students is editable here. Changes save automatically.</p></div>
      <div className="mb-6 flex flex-wrap gap-2">{TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`btn ${tab === t.id ? 'btn-primary' : ''}`}><t.icon size={15} />{t.label}</button>)}</div>
      {tab === 'schedules' && <Schedules />}
      {tab === 'departments' && <Departments />}
      {tab === 'import' && <ImportPanel />}
      {tab === 'invigilators' && <Invigilators />}
      {tab === 'settings' && <SettingsPanel />}
    </div>
  )
}

function Schedules() {
  const { db, update, selId, setSelId, toast } = useApp()
  const patch = (id: string, p: Partial<Schedule>) => update((d) => ({ ...d, schedules: d.schedules.map((s) => (s.id === id ? { ...s, ...p } : s)) }))
  const add = () => { const s: Schedule = { id: uid(), name: 'New schedule', academicYear: db.schedules.at(-1)?.academicYear ?? '', semester: '', exams: [] }; update((d) => ({ ...d, schedules: [...d.schedules, s] })); setSelId(s.id); toast('Schedule added — rename it, then add exams from the Schedule page') }
  const dup = (s: Schedule) => { const n: Schedule = { ...s, id: uid(), name: s.name + ' (copy)', exams: s.exams.map((e) => ({ ...e, id: uid(), status: 'Not updated', updatedAt: undefined })) }; update((d) => ({ ...d, schedules: [...d.schedules, n] })); setSelId(n.id); toast('Schedule duplicated with results reset') }
  const del = (s: Schedule) => { if (confirm(`Delete "${s.name}" and its ${s.exams.length} exams?`)) update((d) => ({ ...d, schedules: d.schedules.filter((x) => x.id !== s.id) })) }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Add a schedule for every exam period (mid, final, re-exam…) and academic year. Students pick the year and schedule from the Schedule page.</p>
      {db.schedules.map((s) => (
        <div key={s.id} className="card grid items-end gap-3 p-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Field label="Schedule name"><input className="input" value={s.name} onChange={(e) => patch(s.id, { name: e.target.value })} /></Field>
          <Field label="Semester (e.g. 2nd Semester)"><input className="input" value={s.semester} onChange={(e) => patch(s.id, { semester: e.target.value })} /></Field>
          <Field label="Academic year (e.g. 2027 / 2020 E.C.)"><input className="input" value={s.academicYear} onChange={(e) => patch(s.id, { academicYear: e.target.value })} /></Field>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted">{s.exams.length} exams · {scheduleStatus(s)}</span>
            <button className="btn btn-sm" onClick={() => { setSelId(s.id); toast('Selected — open Schedule to edit exams') }}>{selId === s.id ? 'Selected' : 'Select'}</button>
            <button className="btn btn-sm" title="Duplicate" onClick={() => dup(s)}><Copy size={13} /></button>
            <button className="btn btn-sm btn-danger" title="Delete" onClick={() => del(s)}><Trash2 size={13} /></button>
          </div>
        </div>
      ))}
      <button className="btn btn-primary" onClick={add}><Plus size={15} /> New schedule</button>
    </div>
  )
}

function Departments() {
  const { db, update } = useApp()
  const patch = (id: string, p: Partial<Dept>) => update((d) => ({ ...d, departments: d.departments.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
  const add = () => update((d) => ({ ...d, departments: [...d.departments, { id: uid(), name: 'New department', short: 'ND', headName: '', headPhone: '', email: '', info: '' }] }))
  const del = (x: Dept) => { const used = db.schedules.some((s) => s.exams.some((e) => e.deptId === x.id)); if (used) return alert('This department has exams assigned. Reassign or delete them first.'); if (confirm(`Delete ${x.name}?`)) update((d) => ({ ...d, departments: d.departments.filter((y) => y.id !== x.id) })) }
  const F = (x: Dept, k: keyof Dept, label: string, ph = '') => <Field label={label}><input className="input" placeholder={ph} value={x[k]} onChange={(e) => patch(x.id, { [k]: e.target.value })} /></Field>
  return (
    <div className="space-y-4">
      {db.departments.map((x) => (
        <div key={x.id} className="card p-5">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold">{x.name}</h3><button className="btn btn-sm btn-danger" onClick={() => del(x)}><Trash2 size={13} /> Delete</button></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {F(x, 'name', 'Department name')}{F(x, 'short', 'Short name')}{F(x, 'email', 'Email', 'dept@ddu.edu.et')}
            {F(x, 'headName', 'Department head name')}{F(x, 'headPhone', 'Department head phone', '+251 …')}
          </div>
          <Field label="More information (office hours, location, notes)" className="mt-3"><textarea rows={2} className="input" value={x.info} onChange={(e) => patch(x.id, { info: e.target.value })} /></Field>
        </div>
      ))}
      <button className="btn btn-primary" onClick={add}><Plus size={15} /> Add department</button>
    </div>
  )
}

function Invigilators() {
  const { db, update } = useApp()
  const patch = (id: string, p: Partial<Invigilator>) => update((d) => ({ ...d, invigilators: d.invigilators.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
  const add = () => update((d) => ({ ...d, invigilators: [...d.invigilators, { id: uid(), name: '', phone: '', deptId: '' }] }))
  const del = (id: string) => update((d) => ({ ...d, invigilators: d.invigilators.filter((x) => x.id !== id), schedules: d.schedules.map((s) => ({ ...s, exams: s.exams.map((e) => ({ ...e, invigilatorIds: e.invigilatorIds.filter((i) => i !== id) })) })) }))
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Add staff here once, then assign them to exams from the Schedule page (Edit an exam → Invigilators).</p>
      {db.invigilators.map((x) => (
        <div key={x.id} className="card grid items-end gap-3 p-4 md:grid-cols-[1.3fr_1fr_1fr_auto]">
          <Field label="Full name"><input className="input" value={x.name} onChange={(e) => patch(x.id, { name: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={x.phone} onChange={(e) => patch(x.id, { phone: e.target.value })} /></Field>
          <Field label="Department"><select className="input" value={x.deptId} onChange={(e) => patch(x.id, { deptId: e.target.value })}><option value="">Any / external</option>{db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          <button className="btn btn-danger" aria-label="Remove" onClick={() => del(x.id)}><Trash2 size={14} /></button>
        </div>
      ))}
      {db.invigilators.length === 0 && <div className="card p-8 text-center text-xs text-muted">No invigilators yet.</div>}
      <button className="btn btn-primary" onClick={add}><Plus size={15} /> Add invigilator</button>
    </div>
  )
}

function SettingsPanel() {
  const { db, update, replaceAll, resetAll, toast } = useApp()
  const file = useRef<HTMLInputElement>(null)
  const set = (k: keyof Settings, v: string) => update((d) => ({ ...d, settings: { ...d.settings, [k]: v } }))
  const S = (k: keyof Settings, label: string, type = 'text') => <Field label={label}><input type={type} className="input" value={db.settings[k]} onChange={(e) => set(k, e.target.value)} /></Field>
  const exportJson = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })); a.download = `ddu-schedule-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click() }
  const importJson = async (f?: File) => { if (!f) return; try { const d = JSON.parse(await f.text()) as DB; if (!Array.isArray(d.schedules) || !Array.isArray(d.departments)) throw 0; replaceAll(d); toast('Data imported') } catch { toast('Not a valid backup file', 'bad') } }
  return (
    <div className="space-y-4">
      <div className="card p-5"><h3 className="mb-4 text-sm font-semibold">Institution & contacts</h3>
        <div className="grid gap-3 sm:grid-cols-2">{S('university', 'University name')}{S('institute', 'Institute')}{S('school', 'School')}{S('footer', 'Table footer note')}</div></div>
      <div className="card p-5"><h3 className="mb-4 text-sm font-semibold">Dean & Registrar</h3>
        <div className="grid gap-3 sm:grid-cols-2">{S('deanName', 'Dean name')}{S('deanPhone', 'Dean phone')}{S('registrarName', 'Registrar name')}{S('registrarPhone', 'Registrar phone')}{S('registrarEmail', 'Registrar email', 'email')}</div></div>
      <div className="card p-5"><h3 className="mb-1 text-sm font-semibold">Office PIN</h3><p className="mb-3 text-xs text-muted">Unlocks editing on this device. This is a convenience lock for the interface, not strong security.</p><div className="max-w-xs">{S('pin', 'PIN')}</div></div>
      <div className="card p-5"><h3 className="mb-1 text-sm font-semibold">Backup & publishing</h3>
        <p className="mb-4 text-xs leading-relaxed text-muted">Edits are stored in this browser. To make your changes visible to everyone, export the data and paste it into <code>lib/seed.ts</code>, or connect a shared database. Import restores a backup.</p>
        <div className="flex flex-wrap gap-2"><button className="btn" onClick={exportJson}><Download size={15} /> Export JSON</button><button className="btn" onClick={() => file.current?.click()}><Upload size={15} /> Import JSON</button><input ref={file} type="file" accept="application/json" hidden onChange={(e) => importJson(e.target.files?.[0])} />
          <button className="btn btn-danger" onClick={() => confirm('Reset everything to the original data?') && (resetAll(), toast('Reset to original data'))}>Reset to original</button></div></div>
    </div>
  )
}
