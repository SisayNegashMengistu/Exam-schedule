'use client'
import { useMemo, useState } from 'react'
import { Search, UserCheck } from 'lucide-react'
import { batchText, placeLabel, slotLabel } from '@/lib/catalog'
import { useApp } from '@/lib/store'
import { scheduleLabel, type Exam } from '@/lib/types'

export function AssignPage() {
  const { db, update, selId, setSelId } = useApp()
  const sched = db.schedules.find((s) => s.id === selId)
  const staff = db.invigilators.filter((i) => i.name.trim())
  const [q, setQ] = useState('')
  const [batch, setBatch] = useState('all')
  const [block, setBlock] = useState('all')
  const [room, setRoom] = useState('all')
  const [slot, setSlot] = useState('all')
  const [openOnly, setOpenOnly] = useState(false)
  const [sort, setSort] = useState<'date' | 'course' | 'batch' | 'room'>('date')

  const rooms = db.rooms.filter((r) => block === 'all' || r.blockId === block)
  const exams = useMemo(() => {
    const list = (sched?.exams ?? []).filter((e) => {
      const blob = `${e.title} ${e.code} ${batchText(e)} ${placeLabel(db, e)}`.toLowerCase()
      return blob.includes(q.toLowerCase())
        && (batch === 'all' || e.batch === batch)
        && (block === 'all' || e.blockId === block)
        && (room === 'all' || e.roomId === room)
        && (slot === 'all' || e.slotId === slot)
        && (!openOnly || e.invigilatorIds.length === 0)
    })
    const cmp = {
      date: (a: Exam, b: Exam) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start, undefined, { numeric: true }) || a.code.localeCompare(b.code),
      course: (a: Exam, b: Exam) => a.title.localeCompare(b.title),
      batch: (a: Exam, b: Exam) => (a.batch ?? '').localeCompare(b.batch ?? '') || (a.section ?? '').localeCompare(b.section ?? ''),
      room: (a: Exam, b: Exam) => placeLabel(db, a).localeCompare(placeLabel(db, b)),
    }[sort]
    return [...list].sort(cmp)
  }, [sched, q, batch, block, room, slot, openOnly, sort, db])

  const busy = (exam: Exam, invId: string) => (sched?.exams ?? []).some((o) => o.id !== exam.id && o.date === exam.date && o.start === exam.start && o.end === exam.end && o.invigilatorIds.includes(invId))
  const toggle = (exam: Exam, invId: string) => {
    if (!sched) return
    const ids = exam.invigilatorIds.includes(invId) ? exam.invigilatorIds.filter((i) => i !== invId) : [...exam.invigilatorIds, invId]
    update((d) => ({ ...d, schedules: d.schedules.map((s) => s.id === sched.id ? { ...s, exams: s.exams.map((e) => e.id === exam.id ? { ...e, invigilatorIds: ids } : e) } : s) }))
  }

  if (staff.length === 0) return (
    <div className="card p-10 text-center">
      <UserCheck className="mx-auto mb-3 text-muted" />
      <h1 className="text-lg font-semibold">Add invigilators first</h1>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted">Upload or type the staff list in Manage → Invigilators. After that you can upload exam pages, then assign those staff to each block, room and time frame.</p>
    </div>
  )

  return <>
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-muted"><span className="size-1.5 rounded-full bg-gold" /> Registrar <span>/</span> Assignment</div>
        <h1 className="text-[28px] font-semibold tracking-tight">Assign invigilators</h1>
        <p className="mt-1 text-[13px] text-muted">{sched ? `${scheduleLabel(sched)} · ${sched.academicYear}` : 'Choose a schedule'} · {staff.length} staff</p>
      </div>
      <select aria-label="Schedule" className="input !h-10 !w-auto" value={selId} onChange={(e) => setSelId(e.target.value)}>{db.schedules.map((s) => <option key={s.id} value={s.id}>{s.academicYear} · {scheduleLabel(s)}</option>)}</select>
    </div>
    <div className="card mb-4 grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="relative block sm:col-span-2"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input pl-9" placeholder="Search course, batch, room" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <select aria-label="Batch" className="input" value={batch} onChange={(e) => setBatch(e.target.value)}><option value="all">All batches</option>{db.batches.map((b) => <option key={b}>{b}</option>)}</select>
      <select aria-label="Block" className="input" value={block} onChange={(e) => { setBlock(e.target.value); setRoom('all') }}><option value="all">All blocks</option>{db.blocks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <select aria-label="Room" className="input" value={room} onChange={(e) => setRoom(e.target.value)}><option value="all">All rooms</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <select aria-label="Time frame" className="input" value={slot} onChange={(e) => setSlot(e.target.value)}><option value="all">All time frames</option>{db.timeSlots.map((s) => <option key={s.id} value={s.id}>{s.session} · {slotLabel(s)}</option>)}</select>
      <select aria-label="Sort" className="input" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="date">Sort by date</option><option value="course">Sort by course</option><option value="batch">Sort by batch</option><option value="room">Sort by block / room</option></select>
      <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> Unassigned only</label>
    </div>
    <div className="card overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left">
        <thead><tr className="bg-soft/60"><th className="th px-5">Exam</th><th className="th">Batch</th><th className="th">Block & room</th><th className="th">Time frame</th><th className="th">Staff</th></tr></thead>
        <tbody className="divide-y divide-line">{exams.map((e) => {
          const clash = e.invigilatorIds.filter((id) => busy(e, id))
          return <tr key={e.id} className="align-top">
            <td className="px-5 py-3"><p className="text-xs font-semibold">{e.title}</p><p className="text-[10px] text-muted">{e.code} · {e.date}</p></td>
            <td className="px-4 py-3 text-[11px]">{batchText(e)}{e.students ? <p className="text-[10px] text-muted">{e.students} students</p> : null}</td>
            <td className="px-4 py-3 text-[11px]">{placeLabel(db, e)}</td>
            <td className="px-4 py-3 text-[11px]">{e.session}<p className="text-[10px] text-muted">{e.start} – {e.end}</p></td>
            <td className="px-4 py-3">
              <div className="flex max-w-md flex-wrap gap-1.5">{staff.map((i) => {
                const on = e.invigilatorIds.includes(i.id)
                return <button key={i.id} type="button" aria-pressed={on} onClick={() => toggle(e, i.id)} className={`btn btn-sm ${on ? 'btn-primary' : ''}`}>{i.name}</button>
              })}</div>
              {clash.length > 0 && <p className="mt-1 text-[10px] text-bad">Already on another exam in this time frame.</p>}
            </td>
          </tr>
        })}</tbody>
      </table>
      {exams.length === 0 && <p className="px-6 py-12 text-center text-xs text-muted">No exams match these filters.</p>}
      </div>
    </div>
    <p className="mt-3 text-[10px] text-muted">Assignments save immediately. A warning appears when the same staff member is on two exams at the same time.</p>
  </>
}
