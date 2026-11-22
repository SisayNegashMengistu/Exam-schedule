'use client'
import { useRef, useState } from 'react'
import { BookOpenCheck, Building2, CalendarRange, CalendarDays, Clock3, Copy, Download, GraduationCap, Presentation, Plus, Settings2, Trash2, Upload, Users } from 'lucide-react'
import { readSheet } from 'read-excel-file/browser'
import { ordinal } from '@/lib/breakdown'
import { slotLabel } from '@/lib/catalog'
import { useApp } from '@/lib/store'
import { scheduleStatus, uid, type Block, type DB, type Dept, type Instructor, type Invigilator, type Schedule, type Session, type Settings, type TimeSlot } from '@/lib/types'
import { Field } from './ui-bits'
import { ImportPanel } from './import-panel'
import { BreakdownPanel } from './breakdown-panel'

const TABS = [
  { id: 'schedules', label: 'Schedules', icon: CalendarRange },
  { id: 'semesters', label: 'Semesters', icon: CalendarDays },
  { id: 'places', label: 'Blocks & rooms', icon: Building2 },
  { id: 'times', label: 'Time frames', icon: Clock3 },
  { id: 'batches', label: 'Batches', icon: GraduationCap },
  { id: 'departments', label: 'Departments & contacts', icon: Building2 },
  { id: 'breakdown', label: 'Course breakdown', icon: BookOpenCheck },
  { id: 'instructors', label: 'Instructors', icon: Presentation },
  { id: 'import', label: 'Import exams', icon: Upload },
  { id: 'invigilators', label: 'Invigilators', icon: Users },
  { id: 'settings', label: 'Settings & data', icon: Settings2 },
] as const

export function ManagePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('schedules')
  return (
    <div>
      <div className="mb-6"><h1 className="text-[28px] font-semibold tracking-tight">Manage</h1><p className="mt-1 text-[13px] text-muted">Set up semesters, upload each department's course breakdown (PDF), assign instructors to courses, then add invigilators and upload the exam pages.</p></div>
      <div className="mb-6 flex flex-wrap gap-2">{TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`btn ${tab === t.id ? 'btn-primary' : ''}`}><t.icon size={15} />{t.label}</button>)}</div>
      {tab === 'schedules' && <Schedules />}
      {tab === 'semesters' && <Semesters />}
      {tab === 'places' && <Places />}
      {tab === 'times' && <TimeFrames />}
      {tab === 'batches' && <Batches />}
      {tab === 'departments' && <Departments />}
      {tab === 'breakdown' && <BreakdownPanel />}
      {tab === 'instructors' && <Instructors />}
      {tab === 'import' && <ImportPanel />}
      {tab === 'invigilators' && <Invigilators />}
      {tab === 'settings' && <SettingsPanel />}
    </div>
  )
}

function Schedules() {
  const { db, update, selId, setSelId, toast } = useApp()
  const patch = (id: string, p: Partial<Schedule>) => update((d) => ({ ...d, schedules: d.schedules.map((s) => (s.id === id ? { ...s, ...p } : s)) }))
  const add = () => { const s: Schedule = { id: uid(), name: 'New schedule', academicYear: db.schedules.at(-1)?.academicYear ?? '', semester: db.semesters[0]?.name ?? '', exams: [] }; update((d) => ({ ...d, schedules: [...d.schedules, s] })); setSelId(s.id); toast('Schedule added — rename it, then add exams from the Schedule page') }
  const dup = (s: Schedule) => { const n: Schedule = { ...s, id: uid(), name: s.name + ' (copy)', exams: s.exams.map((e) => ({ ...e, id: uid(), status: 'Not updated', updatedAt: undefined })) }; update((d) => ({ ...d, schedules: [...d.schedules, n] })); setSelId(n.id); toast('Schedule duplicated with results reset') }
  const del = (s: Schedule) => { if (confirm(`Delete "${s.name}" and its ${s.exams.length} exams?`)) update((d) => ({ ...d, schedules: d.schedules.filter((x) => x.id !== s.id) })) }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Add a schedule for every exam period (mid, final, re-exam…) and academic year. Students pick the year and schedule from the Schedule page.</p>
      {db.schedules.map((s) => (
        <div key={s.id} className="card grid items-end gap-3 p-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Field label="Schedule name"><input className="input" value={s.name} onChange={(e) => patch(s.id, { name: e.target.value })} /></Field>
          <Field label="Semester"><select className="input" value={s.semester} onChange={(e) => patch(s.id, { semester: e.target.value })}><option value="">Not set</option>{[...db.semesters.map((x) => x.name), ...(s.semester && !db.semesters.some((x) => x.name === s.semester) ? [s.semester] : [])].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
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
  const del = (x: Dept) => { const used = db.schedules.some((s) => s.exams.some((e) => e.deptId === x.id)); if (used) return alert('This department has exams assigned. Reassign or delete them first.'); if (db.breakdowns.some((b) => b.deptId === x.id)) return alert('This department has course breakdowns. Delete them first (Manage → Course breakdown).'); if (confirm(`Delete ${x.name}?`)) update((d) => ({ ...d, departments: d.departments.filter((y) => y.id !== x.id) })) }
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

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
    else if (c === '"') q = true
    else if (c === ',' || c === ';' || c === '\t') { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = '' }
    else cur += c
  }
  row.push(cur); rows.push(row); return rows
}

function Invigilators() {
  const { db, update, toast } = useApp()
  const file = useRef<HTMLInputElement>(null)
  const patch = (id: string, p: Partial<Invigilator>) => update((d) => ({ ...d, invigilators: d.invigilators.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
  const add = () => update((d) => ({ ...d, invigilators: [...d.invigilators, { id: uid(), name: '', phone: '', deptId: '' }] }))
  const del = (id: string) => update((d) => ({ ...d, invigilators: d.invigilators.filter((x) => x.id !== id), schedules: d.schedules.map((s) => ({ ...s, exams: s.exams.map((e) => ({ ...e, invigilatorIds: e.invigilatorIds.filter((i) => i !== id) })) })) }))
  const template = () => {
    const body = 'Name,Phone,Department\r\nAbebe Kebede,+251911000000,Computer Science\r\nSara Ali,+251922000000,Information Technology\r\n'
    const a = document.createElement('a'); a.download = 'invigilators-template.csv'; a.href = URL.createObjectURL(new Blob(['\ufeff' + body], { type: 'text/csv' })); a.click()
  }
  const load = async (f?: File) => {
    if (!f) return
    try {
      const raw = /\.xlsx$/i.test(f.name) ? ((await readSheet(f)) as (string | number | null)[][]) : parseCsv(await f.text())
      const hi = raw.findIndex((r) => r.some((c) => /name/i.test(String(c ?? ''))))
      if (hi < 0) throw new Error('Add a header row with Name, Phone and Department.')
      const col = (re: RegExp) => raw[hi].findIndex((c) => re.test(String(c ?? '')))
      const nameI = col(/name/i), phoneI = col(/phone|mobile/i), deptI = col(/department|program/i)
      let added = 0
      update((d) => {
        const list = [...d.invigilators]
        raw.slice(hi + 1).forEach((r) => {
          const name = String(r[nameI] ?? '').replace(/\s+/g, ' ').trim()
          if (!name) return
          const phone = phoneI >= 0 ? String(r[phoneI] ?? '').trim() : ''
          const deptName = deptI >= 0 ? String(r[deptI] ?? '').trim().toLowerCase() : ''
          const deptId = d.departments.find((x) => x.name.toLowerCase() === deptName || x.short.toLowerCase() === deptName)?.id ?? ''
          const hit = list.find((x) => x.name.trim().toLowerCase() === name.toLowerCase())
          if (hit) { hit.phone = phone || hit.phone; hit.deptId = deptId || hit.deptId; return }
          list.push({ id: uid(), name, phone, deptId }); added++
        })
        return { ...d, invigilators: list }
      })
      toast(added ? `${added} invigilators added` : 'Staff list updated')
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not read that file', 'bad') }
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Add staff here, or upload a CSV / Excel list. Exam page upload stays locked until at least one invigilator has a name. Then use Assign invigilators to put staff on each exam.</p>
      <div className="flex flex-wrap gap-2"><button className="btn" onClick={() => file.current?.click()}><Upload size={15} /> Upload staff list</button><button className="btn" onClick={template}><Download size={15} /> Template</button><input ref={file} hidden type="file" accept=".csv,.tsv,.xlsx,text/csv" onChange={(e) => { load(e.target.files?.[0]); e.target.value = '' }} /></div>
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

function Semesters() {
  const { db, update, toast } = useApp()
  const rename = (id: string, name: string) => update((d) => {
    const old = d.semesters.find((x) => x.id === id)?.name
    return { ...d, semesters: d.semesters.map((x) => (x.id === id ? { ...x, name } : x)), schedules: d.schedules.map((sc) => (old && sc.semester === old ? { ...sc, semester: name } : sc)) }
  })
  const del = (id: string) => {
    const sem = db.semesters.find((x) => x.id === id)
    if (!sem) return
    if (db.breakdowns.some((b) => b.semesterId === id)) return alert('Course breakdowns exist for this semester. Delete them first (Manage → Course breakdown).')
    if (db.schedules.some((sc) => sc.semester === sem.name)) return alert('A schedule uses this semester. Change that schedule first.')
    update((d) => ({ ...d, semesters: d.semesters.filter((x) => x.id !== id) }))
  }
  const count = (id: string) => db.breakdowns.filter((b) => b.semesterId === id).length
  return <div className="space-y-3">
    <p className="text-xs text-muted">Semesters are used by course breakdowns and exam schedules. The usual set is 1st, 2nd and 3rd (summer). Renaming a semester also renames it on schedules that use it. Tip: start the name with its number (e.g. “3rd Semester (Summer)”) so PDF headings such as “SEMESTER I” map to the right one.</p>
    {db.semesters.map((x) => <div key={x.id} className="card flex items-end gap-3 p-4">
      <Field label="Semester name" className="flex-1"><input className="input" value={x.name} onChange={(e) => rename(x.id, e.target.value)} /></Field>
      <span className="pb-2.5 text-[11px] text-muted">{count(x.id)} breakdowns</span>
      <button className="btn btn-danger" aria-label={`Delete ${x.name}`} onClick={() => del(x.id)}><Trash2 size={14} /></button>
    </div>)}
    <button className="btn btn-primary" onClick={() => { update((d) => ({ ...d, semesters: [...d.semesters, { id: uid(), name: `${ordinal(d.semesters.length + 1)} Semester` }] })); toast('Semester added — rename it if needed') }}><Plus size={15} /> Add semester</button>
  </div>
}

function Instructors() {
  const { db, update, toast } = useApp()
  const file = useRef<HTMLInputElement>(null)
  const patch = (id: string, p: Partial<Instructor>) => update((d) => ({ ...d, instructors: d.instructors.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
  const load = (id: string) => db.breakdowns.reduce((n, b) => n + b.courses.filter((c) => c.instructorId === id).length, 0)
  const del = (id: string) => update((d) => ({
    ...d, instructors: d.instructors.filter((x) => x.id !== id),
    breakdowns: d.breakdowns.map((b) => ({ ...b, courses: b.courses.map((c) => (c.instructorId === id ? { ...c, instructorId: '' } : c)) })),
  }))
  const template = () => {
    const body = 'Name,Phone,Department\r\nShimels Hailu,+251911000000,Software Engineering\r\nSinodos Girma,+251922000000,Software Engineering\r\n'
    const a = document.createElement('a'); a.download = 'instructors-template.csv'; a.href = URL.createObjectURL(new Blob(['\ufeff' + body], { type: 'text/csv' })); a.click()
  }
  const upload = async (f?: File) => {
    if (!f) return
    try {
      const raw = /\.xlsx$/i.test(f.name) ? ((await readSheet(f)) as (string | number | null)[][]) : parseCsv(await f.text())
      const hi = raw.findIndex((r) => r.some((c) => /name/i.test(String(c ?? ''))))
      if (hi < 0) throw new Error('Add a header row with Name, Phone and Department.')
      const col = (re: RegExp) => raw[hi].findIndex((c) => re.test(String(c ?? '')))
      const nameI = col(/name/i), phoneI = col(/phone|mobile/i), deptI = col(/department|program/i)
      let added = 0, updated = 0
      update((d) => {
        const list = d.instructors.map((x) => ({ ...x }))
        added = 0; updated = 0
        raw.slice(hi + 1).forEach((r) => {
          const name = String(r[nameI] ?? '').replace(/\s+/g, ' ').trim()
          if (!name) return
          const phone = phoneI >= 0 ? String(r[phoneI] ?? '').trim() : ''
          const dn = deptI >= 0 ? String(r[deptI] ?? '').trim().toLowerCase() : ''
          const deptId = d.departments.find((x) => x.name.toLowerCase() === dn || x.short.toLowerCase() === dn)?.id ?? ''
          const hit = list.find((x) => x.name.trim().toLowerCase() === name.toLowerCase())
          if (hit) { hit.phone = phone || hit.phone; hit.deptId = deptId || hit.deptId; updated++; return }
          list.push({ id: uid(), name, phone, deptId }); added++
        })
        return { ...d, instructors: list }
      })
      toast(`${added} instructors added, ${updated} updated`)
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not read that file', 'bad') }
  }
  return <div className="space-y-3">
    <p className="text-xs text-muted">Add instructors one by one or upload a list (CSV / Excel with Name, Phone, Department). Existing names are updated, not duplicated. Instructors are also added when you upload a course breakdown PDF. Assign them to courses in Course breakdown, or straight from the Assign invigilators page. Invigilators are a separate list.</p>
    <div className="flex flex-wrap gap-2"><button className="btn" onClick={() => file.current?.click()}><Upload size={15} /> Upload instructor list</button><button className="btn" onClick={template}><Download size={15} /> Template</button><input ref={file} hidden type="file" accept=".csv,.tsv,.xlsx,text/csv" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} /></div>
    {db.instructors.map((x) => <div key={x.id} className="card grid items-end gap-3 p-4 md:grid-cols-[1.3fr_1fr_1fr_auto_auto]">
      <Field label="Full name"><input className="input" value={x.name} onChange={(e) => patch(x.id, { name: e.target.value })} /></Field>
      <Field label="Phone"><input className="input" value={x.phone} onChange={(e) => patch(x.id, { phone: e.target.value })} /></Field>
      <Field label="Department"><select className="input" value={x.deptId} onChange={(e) => patch(x.id, { deptId: e.target.value })}><option value="">Any / external</option>{db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
      <span className="pb-2.5 text-[11px] text-muted">{load(x.id)} courses</span>
      <button className="btn btn-danger" aria-label="Remove" onClick={() => del(x.id)}><Trash2 size={14} /></button>
    </div>)}
    {db.instructors.length === 0 && <div className="card p-8 text-center text-xs text-muted">No instructors yet. Upload a list, upload a course breakdown, or add one.</div>}
    <button className="btn btn-primary" onClick={() => update((d) => ({ ...d, instructors: [...d.instructors, { id: uid(), name: '', phone: '', deptId: '' }] }))}><Plus size={15} /> Add instructor</button>
  </div>
}

function Places() {
  const { db, update } = useApp()
  const usedBlock = (id: string) => db.schedules.some((s) => s.exams.some((e) => e.blockId === id))
  const usedRoom = (id: string) => db.schedules.some((s) => s.exams.some((e) => e.roomId === id))
  const addBlock = () => update((d) => ({ ...d, blocks: [...d.blocks, { id: uid(), name: 'New block' }] }))
  const delBlock = (b: Block) => {
    if (usedBlock(b.id)) return alert('Exams are already placed in this block.')
    if (confirm(`Delete ${b.name} and its rooms?`)) update((d) => ({ ...d, blocks: d.blocks.filter((x) => x.id !== b.id), rooms: d.rooms.filter((r) => r.blockId !== b.id) }))
  }
  return <div className="space-y-4">
    <p className="text-xs text-muted">Blocks and rooms used by the current exams are listed here. Add more, then pick them when you schedule an exam.</p>
    {db.blocks.map((b) => <div key={b.id} className="card p-5">
      <div className="mb-3 flex items-end gap-2"><Field label="Block" className="flex-1"><input className="input" value={b.name} onChange={(e) => update((d) => ({ ...d, blocks: d.blocks.map((x) => x.id === b.id ? { ...x, name: e.target.value } : x) }))} /></Field><button className="btn btn-danger" onClick={() => delBlock(b)}><Trash2 size={14} /></button></div>
      <div className="space-y-2">{db.rooms.filter((r) => r.blockId === b.id).map((r) => <div key={r.id} className="flex gap-2"><input aria-label={`${b.name} room`} className="input" value={r.name} onChange={(e) => update((d) => ({ ...d, rooms: d.rooms.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x) }))} /><button className="btn btn-danger" onClick={() => { if (usedRoom(r.id)) return alert('An exam is already in this room.'); update((d) => ({ ...d, rooms: d.rooms.filter((x) => x.id !== r.id) })) }}><Trash2 size={14} /></button></div>)}</div>
      <button className="btn btn-sm mt-3" onClick={() => update((d) => ({ ...d, rooms: [...d.rooms, { id: uid(), blockId: b.id, name: 'Room 1' }] }))}><Plus size={13} /> Add room</button>
    </div>)}
    <button className="btn btn-primary" onClick={addBlock}><Plus size={15} /> Add block</button>
  </div>
}

function TimeFrames() {
  const { db, update } = useApp()
  const patch = (id: string, p: Partial<TimeSlot>) => update((d) => ({ ...d, timeSlots: d.timeSlots.map((s) => s.id === id ? { ...s, ...p } : s) }))
  return <div className="space-y-3">
    <p className="text-xs text-muted">Morning exams use frames such as 2:00–4:00 and 4:00–6:00. Afternoon exams use 8:00–10:00 and 10:00–12:00. Add or rename frames and they show up on the schedule, assignment and report screens.</p>
    {db.timeSlots.map((s) => <div key={s.id} className="card grid items-end gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
      <Field label="Session"><select className="input" value={s.session} onChange={(e) => patch(s.id, { session: e.target.value as Session })}><option>Morning</option><option>Afternoon</option></select></Field>
      <Field label="Start"><input className="input" value={s.start} onChange={(e) => patch(s.id, { start: e.target.value })} /></Field>
      <Field label="End"><input className="input" value={s.end} onChange={(e) => patch(s.id, { end: e.target.value })} /></Field>
      <button className="btn btn-danger" aria-label={`Remove ${slotLabel(s)}`} onClick={() => update((d) => ({ ...d, timeSlots: d.timeSlots.filter((x) => x.id !== s.id) }))}><Trash2 size={14} /></button>
    </div>)}
    <button className="btn btn-primary" onClick={() => update((d) => ({ ...d, timeSlots: [...d.timeSlots, { id: uid(), session: 'Morning', start: '2:00', end: '4:00' }] }))}><Plus size={15} /> Add time frame</button>
  </div>
}

function Batches() {
  const { db, update } = useApp()
  return <div className="space-y-3">
    <p className="text-xs text-muted">Batches such as 2nd and 3rd year. A batch that is already used by an exam is kept automatically.</p>
    {db.batches.map((b, i) => <div key={`${b}-${i}`} className="card flex items-end gap-2 p-4">
      <Field label="Batch" className="flex-1"><input className="input" value={b} onChange={(e) => update((d) => ({ ...d, batches: d.batches.map((x, n) => n === i ? e.target.value : x) }))} /></Field>
      <button className="btn btn-danger" onClick={() => update((d) => ({ ...d, batches: d.batches.filter((_, n) => n !== i) }))}><Trash2 size={14} /></button>
    </div>)}
    <button className="btn btn-primary" onClick={() => update((d) => ({ ...d, batches: [...d.batches, ''] }))}><Plus size={15} /> Add batch</button>
  </div>
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
      <div className="card p-5"><h3 className="mb-1 text-sm font-semibold">Registrar account</h3><p className="text-xs leading-relaxed text-muted">Editing is limited to the signed-in editor. Change the password from the header. Reset password is on the sign-in page and applies on this device.</p></div>
      <div className="card p-5"><h3 className="mb-1 text-sm font-semibold">Backup & publishing</h3>
        <p className="mb-4 text-xs leading-relaxed text-muted">Edits are stored in this browser. To make your changes visible to everyone, export the data and paste it into <code>lib/seed.ts</code>, or connect a shared database. Import restores a backup.</p>
        <div className="flex flex-wrap gap-2"><button className="btn" onClick={exportJson}><Download size={15} /> Export JSON</button><button className="btn" onClick={() => file.current?.click()}><Upload size={15} /> Import JSON</button><input ref={file} type="file" accept="application/json" hidden onChange={(e) => importJson(e.target.files?.[0])} />
          <button className="btn btn-danger" onClick={() => confirm('Reset everything to the original data?') && (resetAll(), toast('Reset to original data'))}>Reset to original</button></div></div>
    </div>
  )
}
