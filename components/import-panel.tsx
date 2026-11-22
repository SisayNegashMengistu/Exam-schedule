'use client'
import { useRef, useState } from 'react'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { readSheet } from 'read-excel-file/browser'
import { useApp } from '@/lib/store'
import { uid, type Dept, type Exam, type Schedule } from '@/lib/types'
import { Field } from './ui-bits'

type Cell = string | number | boolean | Date | null | undefined
const HEADERS = ['Department', 'Batch - Section', 'Block - Room', 'Course Code', 'Course Title', 'Date', 'Time (LT)', 'Session', 'Invigilators']
const SAMPLE = [['Computer Science', '3rd Year · 1st Sem', 'Block 30 · Room 2', 'CoSc3081', 'Internet Programming I', '2026-11-24', '4:00-6:00', 'Morning', ''], ['', '', '', 'CoSc3025', 'Python Programming', 'Wed, Nov 25, 2026', '2:00-4:00 LT', '', 'Abebe Kebede; Sara Ali']]

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
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function parseDate(v: Cell): string {
  if (v instanceof Date) return iso(new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()))
  const s = String(v ?? '').trim().replace(/^[A-Za-z]{3,9},\s*/, '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s); return isNaN(+d) ? '' : iso(d)
}

export function ImportPanel() {
  const { db, update, setSelId, toast } = useApp()
  const file = useRef<HTMLInputElement>(null)
  const [target, setTarget] = useState('new')
  const [meta, setMeta] = useState({ name: 'Mid-exam', semester: '1st Semester', academicYear: '' })
  const [rows, setRows] = useState<Exam[]>([]); const [newDepts, setNewDepts] = useState<Dept[]>([])
  const [problems, setProblems] = useState<string[]>([]); const [fileName, setFileName] = useState('')

  const template = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const a = document.createElement('a'); a.download = 'exam-schedule-template.csv'
    a.href = URL.createObjectURL(new Blob(['\ufeff' + [HEADERS, ...SAMPLE].map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv' })); a.click()
  }

  const load = async (f?: File) => {
    if (!f) return
    setFileName(f.name); setRows([]); setProblems([]); setNewDepts([])
    try {
      const raw: Cell[][] = /\.xlsx$/i.test(f.name) ? ((await readSheet(f)) as Cell[][]) : parseCsv(await f.text())
      const hi = raw.findIndex((r) => r.some((c) => /course\s*code|^code$/i.test(String(c ?? ''))))
      if (hi < 0) throw new Error('Could not find a header row containing “Course Code”. Download the template to see the expected columns.')
      const col = (re: RegExp, not?: RegExp) => raw[hi].findIndex((c) => re.test(String(c ?? '')) && !(not && not.test(String(c ?? ''))))
      const ix = { dept: col(/department/i), group: col(/batch|section|year/i), room: col(/block|room/i), code: col(/code/i), title: col(/title|course name/i), date: col(/^\s*date/i, /ethiopian/i), time: col(/time/i), session: col(/session/i), inv: col(/invigilator|instructor/i) }
      if ([ix.dept, ix.code, ix.title, ix.date].some((i) => i < 0)) throw new Error('Missing a required column (Department, Course Code, Course Title, Date).')
      const depts = [...db.departments]; const created: Dept[] = []; const out: Exam[] = []; const errs: string[] = []; const seen = new Set<string>()
      let dept = '', group = '', room = ''
      raw.slice(hi + 1).forEach((r, n) => {
        const g = (i: number) => (i < 0 ? '' : String(r[i] ?? '').replace(/\s+/g, ' ').trim())
        // Merged cells in registrar files leave Department / Batch / Room blank below the first row: carry them down.
        if (g(ix.dept)) dept = g(ix.dept); if (g(ix.group)) group = g(ix.group); if (g(ix.room)) room = g(ix.room)
        const code = g(ix.code), title = g(ix.title)
        if (!code && !title) return
        const date = parseDate(r[ix.date]); const t = g(ix.time).match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/)
        if (!date) return void errs.push(`Row ${hi + n + 2}: ${code || title} — date not recognised`)
        let d = depts.find((x) => x.name.toLowerCase() === dept.toLowerCase())
        if (!d) { d = { id: uid(), name: dept, short: dept.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3), headName: '', headPhone: '', email: '', info: '' }; depts.push(d); created.push(d) }
        const key = [d.id, group, code, date].join('|'); if (seen.has(key)) return; seen.add(key)
        const sess = /^aft/i.test(g(ix.session)) ? 'Afternoon' : /^morn/i.test(g(ix.session)) ? 'Morning' : Number((t?.[1] ?? '2').split(':')[0]) >= 8 ? 'Afternoon' : 'Morning'
        const names = g(ix.inv).split(/[;|]/).map((x) => x.trim().toLowerCase()).filter(Boolean)
        out.push({ id: uid(), code, title, date, start: t?.[1] ?? '', end: t?.[2] ?? '', session: sess, deptId: d.id, group, room, status: 'Not updated',
          invigilatorIds: db.invigilators.filter((i) => names.includes(i.name.trim().toLowerCase())).map((i) => i.id) })
      })
      setRows(out); setNewDepts(created); setProblems(errs)
    } catch (e) { setProblems([e instanceof Error ? e.message : 'Could not read this file.']) }
  }

  const staffReady = db.invigilators.some((i) => i.name.trim())
  const confirm_ = () => {
    if (!staffReady) return toast('Add invigilators before uploading exam pages', 'bad')
    if (target === 'new') {
      if (!meta.academicYear.trim()) return toast('Enter the academic year first', 'bad')
      const s: Schedule = { id: uid(), name: meta.name || 'Exam', academicYear: meta.academicYear.trim(), semester: meta.semester, exams: rows }
      update((d) => ({ ...d, departments: [...d.departments, ...newDepts], schedules: [...d.schedules, s] })); setSelId(s.id)
    } else update((d) => ({ ...d, departments: [...d.departments, ...newDepts], schedules: d.schedules.map((s) => (s.id === target ? { ...s, exams: [...s.exams, ...rows] } : s)) }))
    toast(`${rows.length} exams imported`); setRows([]); setFileName(''); if (file.current) file.current.value = ''
  }

  return <div className="space-y-4">
    {!staffReady && <div className="card border-warn/40 p-4 text-xs"><p className="font-semibold">Add invigilators first</p><p className="mt-1 text-muted">Upload stays closed until staff are on the Invigilators tab. After the list is in, upload the exam pages here, then assign those staff from Assign invigilators.</p></div>}
    <div className="card p-5">
      <h3 className="text-sm font-semibold">Import a timetable</h3>
      <p className="mb-4 mt-1 text-xs leading-relaxed text-muted">Upload an Excel (.xlsx) or CSV file for any academic year or semester. Columns: Department, Batch - Section, Block - Room, Course Code, Course Title, Date, Time (LT), Session (optional), Invigilators (optional). Department, batch and room may be left blank under the first row of a group, as in the registrar’s layout. Ethiopian date columns are ignored because they are calculated automatically.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Import into"><select className="input" value={target} onChange={(e) => setTarget(e.target.value)}><option value="new">A new schedule</option>{db.schedules.map((s) => <option key={s.id} value={s.id}>Add to: {s.name} · {s.semester} · {s.academicYear}</option>)}</select></Field>
        {target === 'new' && <>
          <Field label="Academic year"><input className="input" placeholder="2027 / 2020 E.C." value={meta.academicYear} onChange={(e) => setMeta({ ...meta, academicYear: e.target.value })} /></Field>
          <Field label="Semester"><input className="input" placeholder="2nd Semester" value={meta.semester} onChange={(e) => setMeta({ ...meta, semester: e.target.value })} /></Field>
          <Field label="Schedule name"><input className="input" placeholder="Final exam" value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} /></Field></>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-primary" onClick={() => file.current?.click()}><Upload size={15} /> Choose file</button><button className="btn" onClick={template}><Download size={15} /> Download template</button>
        <input ref={file} type="file" hidden accept=".xlsx,.csv,.tsv,text/csv" onChange={(e) => load(e.target.files?.[0])} />{fileName && <span className="inline-flex items-center gap-1.5 text-xs text-muted"><FileSpreadsheet size={14} />{fileName}</span>}</div>
    </div>
    {problems.length > 0 && <div className="card border-bad/40 p-4 text-xs"><p className="mb-1 font-semibold text-bad">{problems.length} problem{problems.length > 1 ? 's' : ''}</p>{problems.slice(0, 8).map((p) => <p key={p} className="text-muted">{p}</p>)}</div>}
    {rows.length > 0 && <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4"><div><p className="text-sm font-semibold">{rows.length} exams ready to import</p>{newDepts.length > 0 && <p className="mt-0.5 text-[11px] text-muted">New departments will be created: {newDepts.map((d) => d.name).join(', ')}</p>}</div><button className="btn btn-primary" disabled={!staffReady} onClick={confirm_}>Import {rows.length} exams</button></div>
      <div className="max-h-80 overflow-auto"><table className="w-full min-w-[760px] text-left text-[11px]"><thead className="sticky top-0 bg-soft"><tr>{['Code', 'Title', 'Date', 'Time', 'Department', 'Group', 'Room'].map((h) => <th key={h} className="th !py-2">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{rows.map((e) => <tr key={e.id}><td className="px-4 py-2 font-medium">{e.code}</td><td className="px-4 py-2">{e.title}</td><td className="px-4 py-2">{e.date}</td><td className="px-4 py-2">{e.start}–{e.end} {e.session}</td><td className="px-4 py-2">{[...db.departments, ...newDepts].find((d) => d.id === e.deptId)?.name}</td><td className="px-4 py-2">{e.group}</td><td className="px-4 py-2">{e.room}</td></tr>)}</tbody></table></div></div>}
  </div>
}
