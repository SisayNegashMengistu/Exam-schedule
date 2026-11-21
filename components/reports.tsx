'use client'
import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, CircleDashed, Clock3, Download, Printer, Search } from 'lucide-react'
import { useApp } from '@/lib/store'
import { ethFull } from '@/lib/ethiopian'
import { STATUSES, fmtDate, scheduleLabel, scheduleStatus, weekday, type Exam, type ExamStatus, type Schedule } from '@/lib/types'
import { StatusBadge } from './ui-bits'

type Row = Exam & { sched: Schedule }
const COLOR: Record<ExamStatus, string> = { Completed: 'var(--ok)', Missed: 'var(--bad)', 'Late start': 'var(--warn)', 'Not updated': 'var(--line)' }
const GROUPS = { none: 'No grouping', dept: 'Department', status: 'Status', date: 'Date', inv: 'Invigilator' } as const

export function ReportsPage() {
  const { db, selId } = useApp()
  const cur = db.schedules.find((s) => s.id === selId)
  const [scope, setScope] = useState<'current' | 'year' | 'all'>('current')
  const [deptF, setDeptF] = useState('all'); const [statusF, setStatusF] = useState('all'); const [invF, setInvF] = useState('all')
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [q, setQ] = useState('')
  const [group, setGroup] = useState<keyof typeof GROUPS>('none')

  const dept = (id: string) => db.departments.find((d) => d.id === id)
  const invNames = (e: Exam) => e.invigilatorIds.map((i) => db.invigilators.find((x) => x.id === i)?.name).filter(Boolean) as string[]

  // `base` ignores the department & status filters so the department dashboard always shows every department.
  const base = useMemo(() => {
    const list = db.schedules.filter((s) => scope === 'all' || (scope === 'year' ? s.academicYear === cur?.academicYear : s.id === cur?.id))
    return list.flatMap((s) => s.exams.map((e) => ({ ...e, sched: s })))
      .filter((e) => (!from || e.date >= from) && (!to || e.date <= to) && (invF === 'all' || e.invigilatorIds.includes(invF))
        && `${e.title} ${e.code} ${invNames(e).join(' ')}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.date.localeCompare(b.date) || a.code.localeCompare(b.code))
  }, [db, scope, cur, from, to, invF, q]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = base.filter((e) => (deptF === 'all' || e.deptId === deptF) && (statusF === 'all' || e.status === statusF))
  const n = (list: Row[], st: ExamStatus) => list.filter((e) => e.status === st).length

  const groups = useMemo(() => {
    const m = new Map<string, Row[]>()
    const add = (k: string, r: Row) => m.set(k, [...(m.get(k) ?? []), r])
    rows.forEach((r) => {
      if (group === 'none') add('', r)
      else if (group === 'dept') add(dept(r.deptId)?.name ?? '—', r)
      else if (group === 'status') add(r.status, r)
      else if (group === 'date') add(`${fmtDate(r.date)} · ${weekday(r.date)}`, r)
      else (invNames(r).length ? invNames(r) : ['Unassigned']).forEach((k) => add(k, r))
    })
    return [...m.entries()]
  }, [rows, group]) // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const head = ['Schedule', 'Academic year', 'Course name', 'Course code', 'Date', 'Ethiopian date', 'Time', 'Department', 'Year/section', 'Room', 'Invigilators', 'Status', 'Last updated']
    const body = rows.map((e) => [e.sched.name, e.sched.academicYear, e.title, e.code, e.date, ethFull(e.date), `${e.start}-${e.end}`, dept(e.deptId)?.name ?? '', e.group, e.room, invNames(e).join('; '), e.status, e.updatedAt ?? ''].map(String).map(esc).join(','))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\ufeff' + [head.map(esc).join(','), ...body].join('\r\n')], { type: 'text/csv;charset=utf-8' }))
    a.download = `exam-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const scopeLabel = scope === 'all' ? 'All schedules' : scope === 'year' ? `All schedules · ${cur?.academicYear}` : `${cur ? scheduleLabel(cur) : ''} · ${cur?.academicYear}`
  const Sel = ({ label, value, set, children }: { label: string; value: string; set: (v: string) => void; children: React.ReactNode }) => <label className="block"><span className="mb-1 block text-[10px] font-semibold text-muted">{label}</span><select className="input !h-9 !text-[11px]" value={value} onChange={(e) => set(e.target.value)}>{children}</select></label>
  const stats: [string, ExamStatus | null, React.ReactNode, number][] = [['Total exams', null, <CircleDashed key="a" size={17} />, base.length], ['Completed', 'Completed', <CheckCircle2 key="b" size={17} />, n(base, 'Completed')], ['Missed', 'Missed', <AlertTriangle key="c" size={17} />, n(base, 'Missed')], ['Late start', 'Late start', <Clock3 key="d" size={17} />, n(base, 'Late start')]]

  return <>
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-muted"><span className="size-1.5 rounded-full bg-gold" /> Registrar’s office <span>/</span> Reports</div>
        <h1 className="text-[28px] font-semibold tracking-tight md:text-[34px]">Exam reports</h1><p className="mt-1.5 text-[13px] text-muted">{db.settings.school} · {scopeLabel}</p></div>
      <div className="no-print flex gap-2"><button className="btn" onClick={exportCsv} disabled={!rows.length}><Download size={15} /> Export CSV</button><button className="btn btn-primary" onClick={() => window.print()}><Printer size={15} /> Print / PDF</button></div>
    </div>

    <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stats.map(([label, st, icon, v]) => <div key={label} className="card p-4"><div className="flex items-center gap-2 text-muted"><span className="grid size-7 place-items-center rounded-lg bg-soft" style={st ? { color: COLOR[st] === 'var(--line)' ? undefined : COLOR[st] } : { color: 'var(--brand)' }}>{icon}</span><span className="text-[11px] font-medium">{label}</span></div><p className="mt-3 text-[26px] font-semibold tracking-tight">{v}</p><p className="mt-1 text-[10px] text-muted">{st && base.length ? `${Math.round((v / base.length) * 100)}% of exams` : `${n(base, 'Not updated')} not updated`}</p></div>)}</section>

    <h2 className="mb-3 text-[15px] font-semibold">By department</h2>
    <section className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{db.departments.map((d) => { const list = base.filter((e) => e.deptId === d.id); const rec = list.length - n(list, 'Not updated')
      return <button key={d.id} onClick={() => setDeptF(deptF === d.id ? 'all' : d.id)} className={`card cursor-pointer p-5 text-left transition hover:border-brand ${deptF === d.id ? 'border-brand ring-2 ring-brand/20' : ''}`}>
        <div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-semibold">{d.name}</h3><p className="mt-0.5 text-[10px] text-muted">{list.length} exams · {rec} recorded</p></div><span className="text-lg font-semibold text-brand">{list.length ? Math.round((n(list, 'Completed') / list.length) * 100) : 0}%</span></div>
        <div className="my-4 flex h-2 overflow-hidden rounded-full bg-soft">{STATUSES.filter((x) => x !== 'Not updated').map((st) => <div key={st} style={{ width: `${list.length ? (n(list, st) / list.length) * 100 : 0}%`, background: COLOR[st] }} />)}</div>
        <div className="grid grid-cols-4 gap-2 text-center">{STATUSES.map((st) => <div key={st}><p className="text-base font-semibold" style={{ color: st === 'Not updated' ? undefined : COLOR[st] }}>{n(list, st)}</p><p className="text-[9px] text-muted">{st}</p></div>)}</div>
      </button> })}</section>

    <section className="card overflow-hidden">
      <div className="no-print border-b border-line p-5 md:p-6">
        <h2 className="mb-4 text-[15px] font-semibold">Generate report</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Sel label="Schedules" value={scope} set={(v) => setScope(v as typeof scope)}><option value="current">Selected schedule</option><option value="year">All in this academic year</option><option value="all">All schedules</option></Sel>
          <Sel label="Department" value={deptF} set={setDeptF}><option value="all">All departments</option>{db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Sel>
          <Sel label="Status" value={statusF} set={setStatusF}><option value="all">All statuses</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</Sel>
          <Sel label="Invigilator" value={invF} set={setInvF}><option value="all">All invigilators</option>{db.invigilators.map((i) => <option key={i.id} value={i.id}>{i.name || 'Unnamed'}</option>)}</Sel>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold text-muted">From date</span><input type="date" className="input !h-9 !text-[11px]" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="block"><span className="mb-1 block text-[10px] font-semibold text-muted">To date</span><input type="date" className="input !h-9 !text-[11px]" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <Sel label="Group by" value={group} set={(v) => setGroup(v as typeof group)}>{Object.entries(GROUPS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Sel>
          <label className="relative block"><span className="mb-1 block text-[10px] font-semibold text-muted">Course name / code / invigilator</span><Search size={14} className="absolute bottom-2.5 left-3 text-muted" /><input className="input !h-9 pl-9 !text-[11px]" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" /></label>
        </div>
        <p className="mt-4 text-[11px] text-muted">{rows.length} exam{rows.length === 1 ? '' : 's'} in this report{(deptF !== 'all' || statusF !== 'all' || invF !== 'all' || from || to || q) && <button className="ml-2 font-semibold text-brand" onClick={() => { setDeptF('all'); setStatusF('all'); setInvF('all'); setFrom(''); setTo(''); setQ('') }}>Clear filters</button>}</p>
      </div>
      <div className="hidden px-6 pt-6 print:block"><p className="text-lg font-bold">{db.settings.university} · {db.settings.school}</p><p className="text-xs">Exam report · {scopeLabel} · generated {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left">
        <thead><tr className="bg-soft/60"><th className="th px-6">Course name</th><th className="th">Code</th><th className="th">Date</th><th className="th">Department</th><th className="th">Invigilators</th><th className="th">Status</th></tr></thead>
        <tbody className="divide-y divide-line">{groups.map(([key, list]) => [
          group !== 'none' && <tr key={'g' + key} className="bg-soft/40"><td colSpan={6} className="px-6 py-2.5 text-[11px] font-bold">{key} <span className="font-medium text-muted">· {list.length} exam{list.length === 1 ? '' : 's'}</span></td></tr>,
          ...list.map((e) => <tr key={key + e.sched.id + e.id} className="align-top">
            <td className="px-6 py-3.5"><p className="text-xs font-semibold">{e.title}</p>{scope !== 'current' && <p className="mt-0.5 text-[10px] text-muted">{scheduleLabel(e.sched)} · {e.sched.academicYear}</p>}</td>
            <td className="px-4 py-3.5 text-[11px] font-medium text-muted">{e.code}</td>
            <td className="whitespace-nowrap px-4 py-3.5"><p className="text-[11px] font-semibold">{fmtDate(e.date)}</p><p className="text-[10px] text-muted">{weekday(e.date)} · {e.start}–{e.end}</p></td>
            <td className="px-4 py-3.5"><p className="text-[11px]">{dept(e.deptId)?.name}</p><p className="text-[10px] text-muted">{e.group}</p></td>
            <td className="px-4 py-3.5 text-[11px]">{invNames(e).length ? invNames(e).join(', ') : <span className="text-muted">Unassigned</span>}</td>
            <td className="px-4 py-3.5"><StatusBadge status={e.status} /></td></tr>)])}</tbody></table>
        {rows.length === 0 && <div className="px-6 py-16 text-center"><p className="text-sm font-semibold">No exams match these filters</p><p className="mt-1 text-xs text-muted">Widen the date range or clear filters.</p></div>}
      </div>
    </section>
    {scope === 'all' && <p className="mt-3 text-[10px] text-muted no-print">Schedule states: {db.schedules.map((s) => `${scheduleLabel(s)} ${s.academicYear} (${scheduleStatus(s)})`).join(' · ')}</p>}
  </>
}
