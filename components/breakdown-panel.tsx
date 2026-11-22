'use client'
import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Plus, Trash2, Upload } from 'lucide-react'
import { blankCourse, codeKey, matchInstructor, ordinal, samePerson, parseBreakdownLines, readPdfLines, semesterNo, type ParsedBreakdown, type ParsedSection } from '@/lib/breakdown'
import { useApp } from '@/lib/store'
import { breakdownFor, fmtDate, uid, type Breakdown, type Course, type Instructor } from '@/lib/types'
import { Field } from './ui-bits'

const romanYear = (n: number) => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][n] ?? String(n)
const sectionLabel = (s: ParsedSection) => (s.year ? `Year ${romanYear(s.year)} · Semester ${romanYear(s.semester)}` : 'Single table') + ` (${s.courses.length} courses)`

export function BreakdownPanel() {
  const { db, update, selId, toast } = useApp()
  const file = useRef<HTMLInputElement>(null)
  const [deptId, setDeptId] = useState(db.departments[0]?.id ?? '')
  const [batch, setBatch] = useState(db.batches[1] ?? db.batches[0] ?? '')
  const [semesterId, setSemesterId] = useState(db.semesters[0]?.id ?? '')
  const [parsed, setParsed] = useState<(ParsedBreakdown & { fileName: string }) | null>(null)
  const [pick, setPick] = useState<string>('all')       // 'all' or an index into parsed.sections
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const dept = db.departments.find((d) => d.id === deptId)
  const semester = db.semesters.find((s) => s.id === semesterId)
  const current = breakdownFor(db, deptId, batch, semesterId)
  const ready = !!(dept && batch && semester)

  /* ---------- PDF upload ---------- */
  const load = async (f?: File) => {
    if (!f) return
    setError(''); setParsed(null); setBusy(true)
    try {
      if (!/\.pdf$/i.test(f.name)) throw new Error('Please choose a PDF file.')
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      const lines = await readPdfLines(await f.arrayBuffer(), pdfjs as never)
      const result = parseBreakdownLines(lines)
      if (!result.sections.length) throw new Error('No course rows were found. The PDF needs a table with: No, Course Code, Course Title, ECTS, Cr. Hrs, Lec, Lab, Tut, HS, Pre-request, Course Assigned To.')
      setParsed({ ...result, fileName: f.name })
      const hit = result.sections.findIndex((s) => s.year === 0 || (ordinal(s.year) === batch && s.semester === semesterNo(semester?.name ?? '')))
      setPick(hit >= 0 ? String(hit) : result.sections.length > 1 ? 'all' : '0')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not read that PDF.') }
    finally { setBusy(false); if (file.current) file.current.value = '' }
  }

  /* ---------- Build what would be saved (stable until inputs change) ---------- */
  const plan = useMemo(() => {
    if (!parsed || !ready) return null
    const chosen = pick === 'all' ? parsed.sections.map((s, i) => ({ s, i })) : [{ s: parsed.sections[Number(pick)], i: Number(pick) }]
    const pool: Instructor[] = [...db.instructors]
    const created: Instructor[] = []
    const targets: { batch: string; semesterId: string; label: string; breakdown: Breakdown; matched: number; total: number }[] = []
    const skipped: string[] = []
    for (const { s } of chosen) {
      if (!s) continue
      let b = batch, sem = semesterId
      if (pick === 'all') {
        if (!s.year) { b = batch; sem = semesterId }
        else {
          b = ordinal(s.year)
          const found = db.semesters.find((x) => semesterNo(x.name) === s.semester)
          if (!found) { skipped.push(`${sectionLabel(s)} — no semester “${ordinal(s.semester)}” exists. Add it under Manage → Semesters.`); continue }
          sem = found.id
        }
      }
      let matched = 0
      const courses: Course[] = s.courses.map((c) => {
        let inst = c.instructorName ? matchInstructor(c.instructorName, pool, deptId) : undefined
        if (c.instructorName && !inst) { inst = { id: uid(), name: c.instructorName, phone: '', deptId }; pool.push(inst); created.push(inst) }
        if (inst) matched++
        return { ...c, id: uid(), instructorId: inst?.id ?? '' }
      })
      targets.push({
        batch: b, semesterId: sem, matched, total: courses.length,
        label: `${b} Year · ${db.semesters.find((x) => x.id === sem)?.name ?? ''}`,
        breakdown: { id: uid(), deptId, batch: b, semesterId: sem, sourceFile: parsed.fileName, uploadedAt: new Date().toISOString().slice(0, 10), courses },
      })
    }
    return { targets, created, skipped }
  }, [parsed, pick, ready, batch, semesterId, deptId, db.instructors, db.semesters])

  const save = () => {
    if (!plan || !plan.targets.length) return
    update((d) => {
      const batches = [...d.batches]
      plan.targets.forEach((t) => { if (!batches.some((x) => x.toLowerCase() === t.batch.toLowerCase())) batches.push(t.batch) })
      let list = d.breakdowns
      plan.targets.forEach((t) => {
        const old = list.find((x) => x.deptId === t.breakdown.deptId && x.batch === t.batch && x.semesterId === t.semesterId)
        list = old ? list.map((x) => (x === old ? { ...t.breakdown, id: old.id } : x)) : [...list, t.breakdown]
      })
      return { ...d, batches, instructors: [...d.instructors, ...plan.created], breakdowns: list }
    })
    toast(`${plan.targets.length} course breakdown${plan.targets.length > 1 ? 's' : ''} saved${plan.created.length ? ` · ${plan.created.length} new instructors added` : ''}`)
    setParsed(null)
  }

  /* ---------- Editing the saved breakdown ---------- */
  const ensure = (d: typeof db): Breakdown[] => (breakdownFor(d, deptId, batch, semesterId) ? d.breakdowns : [...d.breakdowns, { id: uid(), deptId, batch, semesterId, courses: [] }])
  const mutate = (fn: (courses: Course[]) => Course[]) => update((d) => ({
    ...d,
    breakdowns: ensure(d).map((b) => (b.deptId === deptId && b.batch === batch && b.semesterId === semesterId ? { ...b, courses: fn(b.courses) } : b)),
  }))
  const patch = (id: string, p: Partial<Course>) => mutate((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)))
  const num = (c: Course, k: 'ects' | 'crHrs' | 'lecHrs' | 'labHrs' | 'tutHrs' | 'hs') => (
    <input aria-label={k} type="number" min={0} className="input !w-14 !px-2 text-center" value={c[k]} onChange={(e) => patch(c.id, { [k]: Number(e.target.value) || 0 })} />
  )
  const removeBreakdown = () => {
    if (!current || !confirm(`Delete the ${batch} Year · ${semester?.name} breakdown for ${dept?.name}?`)) return
    update((d) => ({ ...d, breakdowns: d.breakdowns.filter((b) => b.id !== current.id) }))
  }

  /* ---------- Exam / invigilator status for the selected schedule ---------- */
  const sched = db.schedules.find((s) => s.id === selId)
  const examFor = (c: Course) => sched?.exams.find((e) => e.deptId === deptId && codeKey(e.code) === codeKey(c.code) && (!e.batch || e.batch === batch))
  const invName = (id: string) => db.invigilators.find((i) => i.id === id)?.name ?? ''
  const instructorInvigilates = (c: Course, ids: string[]) => {
    const inst = db.instructors.find((i) => i.id === c.instructorId)
    return !!inst && ids.some((id) => samePerson(inst.name, invName(id)))
  }

  const courses = current?.courses ?? []
  const withInstructor = courses.filter((c) => c.instructorId).length
  const totals = courses.reduce((a, c) => ({ ects: a.ects + c.ects, cr: a.cr + c.crHrs }), { ects: 0, cr: 0 })
  // instructors from this department first, then everyone else
  const instructorOptions = [...db.instructors.filter((i) => i.deptId === deptId), ...db.instructors.filter((i) => i.deptId !== deptId)]

  return <div className="space-y-4">
    <div className="card p-5">
      <h3 className="text-sm font-semibold">1 · Choose department, batch and semester</h3>
      <p className="mb-4 mt-1 text-xs leading-relaxed text-muted">Each combination has its own course breakdown. Pick one, then upload the breakdown PDF for those students. You can also type courses in by hand.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Department"><select className="input" value={deptId} onChange={(e) => { setDeptId(e.target.value); setParsed(null) }}>{db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Batch (year)"><select className="input" value={batch} onChange={(e) => { setBatch(e.target.value); setParsed(null) }}>{db.batches.filter(Boolean).map((b) => <option key={b} value={b}>{b} Year</option>)}</select></Field>
        <Field label="Semester"><select className="input" value={semesterId} onChange={(e) => { setSemesterId(e.target.value); setParsed(null) }}>{db.semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      </div>
      {ready && <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        {current ? <><CheckCircle2 size={14} className="text-ok" /> {courses.length} courses saved{current.sourceFile ? ` from ${current.sourceFile}` : ''}{current.uploadedAt ? ` on ${current.uploadedAt}` : ''}.</> : <><FileText size={14} /> No breakdown yet for {dept?.short} · {batch} Year · {semester?.name}.</>}
      </p>}
    </div>

    <div className="card p-5">
      <h3 className="text-sm font-semibold">2 · Upload the course breakdown (PDF)</h3>
      <p className="mb-4 mt-1 text-xs leading-relaxed text-muted">The PDF may hold one table or all years and semesters (headings like “YEAR II SEMESTER I”). The system reads Course Code, Title, ECTS, Cr. Hrs, Lec/Lab/Tut hours, HS, Pre-request and “Course Assigned To”. Instructor names are matched to the Instructors list; unknown names are added automatically.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" disabled={!ready || busy} onClick={() => file.current?.click()}><Upload size={15} /> {busy ? 'Reading PDF…' : 'Choose PDF'}</button>
        <input ref={file} type="file" hidden accept="application/pdf,.pdf" onChange={(e) => load(e.target.files?.[0])} />
        {parsed && <span className="inline-flex items-center gap-1.5 text-xs text-muted"><FileText size={14} />{parsed.fileName}</span>}
      </div>
      {error && <p className="mt-3 text-xs text-bad">{error}</p>}
    </div>

    {parsed && plan && <div className="card overflow-hidden">
      <div className="space-y-3 border-b border-line p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Use from this file">
            <select className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
              {parsed.sections.map((s, i) => <option key={i} value={i}>{sectionLabel(s)}{parsed.sections.length > 1 ? ` → save as ${batch} Year · ${semester?.name}` : ''}</option>)}
              {parsed.sections.length > 1 && <option value="all">All {parsed.sections.length} sections → each into its own year &amp; semester</option>}
            </select>
          </Field>
          <button className="btn btn-primary" disabled={!plan.targets.length} onClick={save}>Save {plan.targets.length > 1 ? `${plan.targets.length} breakdowns` : 'breakdown'}</button>
        </div>
        {parsed.warnings.length > 0 && <div className="text-[11px] text-warn"><p className="flex items-center gap-1.5 font-semibold"><AlertTriangle size={13} /> {parsed.warnings.length} row(s) skipped</p>{parsed.warnings.slice(0, 4).map((w) => <p key={w} className="text-muted">{w}</p>)}</div>}
        {plan.skipped.map((w) => <p key={w} className="text-[11px] text-bad">{w}</p>)}
        {plan.targets.some((t) => breakdownFor(db, deptId, t.batch, t.semesterId)) && <p className="text-[11px] text-muted">Existing breakdowns for the same department, batch and semester will be replaced.</p>}
        {plan.created.length > 0 && <p className="text-[11px] text-muted">New instructors will be added: {plan.created.map((i) => i.name).join('; ')} — rename them in Manage → Instructors if you want full names.</p>}
      </div>
      <div className="max-h-96 overflow-auto">
        {plan.targets.map((t) => <div key={t.label}>
          <p className="sticky top-0 bg-soft px-4 py-2 text-[11px] font-semibold">{dept?.short} · {t.label} · {t.total} courses · {t.matched} with an instructor</p>
          <table className="w-full min-w-[760px] text-left text-[11px]"><thead><tr>{['Code', 'Title', 'ECTS', 'Cr', 'Lec', 'Lab', 'Tut', 'HS', 'Pre-request', 'Instructor'].map((h) => <th key={h} className="th !py-2">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{t.breakdown.courses.map((c) => <tr key={c.id}><td className="px-4 py-2 font-medium">{c.code}</td><td className="px-4 py-2">{c.title}</td><td className="px-4 py-2">{c.ects}</td><td className="px-4 py-2">{c.crHrs}</td><td className="px-4 py-2">{c.lecHrs}</td><td className="px-4 py-2">{c.labHrs}</td><td className="px-4 py-2">{c.tutHrs}</td><td className="px-4 py-2">{c.hs}</td><td className="px-4 py-2">{c.prereq || '—'}</td><td className="px-4 py-2">{c.instructorName || '—'}</td></tr>)}</tbody></table>
        </div>)}
      </div>
    </div>}

    {ready && <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div>
          <h3 className="text-sm font-semibold">3 · Courses, instructors and invigilators — {dept?.short} · {batch} Year · {semester?.name}</h3>
          <p className="mt-0.5 text-[11px] text-muted">{courses.length} courses · {withInstructor} with an instructor · {totals.ects} ECTS · {totals.cr} credit hours{sched ? ` · exam status from “${sched.name}”` : ''}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm" onClick={() => mutate((cs) => [...cs, blankCourse()])}><Plus size={13} /> Add course</button>
          {current && <button className="btn btn-sm btn-danger" onClick={removeBreakdown}><Trash2 size={13} /> Delete breakdown</button>}
        </div>
      </div>
      {courses.length === 0 ? <p className="px-6 py-10 text-center text-xs text-muted">No courses yet. Upload a PDF above or add a course.</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left">
          <thead><tr className="bg-soft/60">{['Code', 'Course title', 'ECTS', 'Cr', 'Lec', 'Lab', 'Tut', 'HS', 'Pre-request', 'Instructor', 'Exam & invigilators', ''].map((h) => <th key={h} className="th !py-2">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{courses.map((c) => {
            const ex = examFor(c)
            return <tr key={c.id} className="align-top">
              <td className="px-3 py-2"><input aria-label="Course code" className="input !w-24" value={c.code} onChange={(e) => patch(c.id, { code: e.target.value })} /></td>
              <td className="px-3 py-2"><input aria-label="Course title" className="input min-w-[200px]" value={c.title} onChange={(e) => patch(c.id, { title: e.target.value })} /></td>
              {(['ects', 'crHrs', 'lecHrs', 'labHrs', 'tutHrs', 'hs'] as const).map((k) => <td key={k} className="px-1 py-2">{num(c, k)}</td>)}
              <td className="px-3 py-2"><input aria-label="Pre-request" className="input !w-28" placeholder="None" value={c.prereq} onChange={(e) => patch(c.id, { prereq: e.target.value })} /></td>
              <td className="px-3 py-2">
                <select aria-label="Instructor" className="input min-w-[150px]" value={c.instructorId} onChange={(e) => patch(c.id, { instructorId: e.target.value })}>
                  <option value="">Not assigned</option>
                  {instructorOptions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                {!c.instructorId && c.instructorName && <p className="mt-1 text-[10px] text-muted">PDF: {c.instructorName}</p>}
              </td>
              <td className="px-3 py-2 text-[11px]">
                {!sched ? <span className="text-muted">No schedule selected</span> : !ex ? <span className="text-muted">No exam scheduled</span> : <>
                  <p className="font-semibold">{fmtDate(ex.date)} · {ex.start}–{ex.end}</p>
                  {ex.invigilatorIds.length ? <p className="text-muted">{ex.invigilatorIds.map(invName).filter(Boolean).join(', ')}</p> : <p className="text-warn">No invigilators yet</p>}
                  {instructorInvigilates(c, ex.invigilatorIds) && <p className="text-bad">Instructor is also invigilating</p>}
                </>}
              </td>
              <td className="px-3 py-2"><button className="btn btn-danger btn-sm" aria-label={`Remove ${c.code}`} onClick={() => mutate((cs) => cs.filter((x) => x.id !== c.id))}><Trash2 size={13} /></button></td>
            </tr>
          })}</tbody>
        </table></div>}
      <p className="border-t border-line px-4 py-3 text-[10px] text-muted">Assign invigilators to each exam from the “Assign invigilators” page — it shows the course instructor beside every exam and warns when an instructor is also set as an invigilator.</p>
    </div>}
  </div>
}
