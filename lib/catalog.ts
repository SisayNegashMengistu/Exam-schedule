import { uid, type Block, type DB, type Exam, type Room, type TimeSlot } from './types'

export const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { id: 'slot-m-2-4', session: 'Morning', start: '2:00', end: '4:00' },
  { id: 'slot-m-4-6', session: 'Morning', start: '4:00', end: '6:00' },
  { id: 'slot-a-8-10', session: 'Afternoon', start: '8:00', end: '10:00' },
  { id: 'slot-a-10-12', session: 'Afternoon', start: '10:00', end: '12:00' },
]
export const DEFAULT_BATCHES = ['1st', '2nd', '3rd', '4th', '5th']

export const clock = (t: string) => {
  const m = String(t ?? '').trim().match(/(\d{1,2}):(\d{2})/)
  return m ? `${Number(m[1])}:${m[2]}` : ''
}
export const slotLabel = (s: { start: string; end: string }) => `${s.start} – ${s.end}`

export function placeLabel(db: Pick<DB, 'blocks' | 'rooms'>, e: Pick<Exam, 'blockId' | 'roomId' | 'room'>) {
  const b = db.blocks.find((x) => x.id === e.blockId)
  const r = db.rooms.find((x) => x.id === e.roomId)
  if (b && r) return `${b.name} · ${r.name}`
  return e.room || '—'
}

export function batchText(e: Pick<Exam, 'batch' | 'section' | 'group'>) {
  if (!e.batch && !e.section) return e.group || '—'
  return [e.batch ? `${e.batch} Year` : '', e.section ? `Section ${e.section}` : ''].filter(Boolean).join(' · ')
}

function splitPlace(room: string) {
  const clean = room.replace(/\s+/g, ' ').trim()
  if (!clean) return null
  const parts = clean.split(/\s*[·•|]\s*/).filter(Boolean)
  if (parts.length >= 2) return { block: parts[0], room: parts.slice(1).join(' · ') }
  return { block: 'Unassigned block', room: clean }
}

function splitGroup(group: string) {
  const batch = group.match(/\b(\d+)(st|nd|rd|th)\b/i)
  const section = group.match(/section\s*([A-Za-z0-9]+)/i)
  return {
    batch: batch ? `${batch[1]}${batch[2].toLowerCase()}` : '',
    section: section ? section[1] : '',
  }
}

/** Fill blocks, rooms, batches and time-frame links from exam text. Safe to run on every save. */
export function withCatalog(db: DB): DB {
  const timeSlots = db.timeSlots?.length ? db.timeSlots : DEFAULT_TIME_SLOTS
  const blocks: Block[] = [...(db.blocks ?? [])]
  const rooms: Room[] = [...(db.rooms ?? [])]
  const batches = [...(db.batches?.length ? db.batches : DEFAULT_BATCHES)]

  const blockNamed = (name: string) => {
    let b = blocks.find((x) => x.name.toLowerCase() === name.toLowerCase())
    if (!b) { b = { id: uid(), name }; blocks.push(b) }
    return b
  }
  const roomNamed = (blockId: string, name: string) => {
    let r = rooms.find((x) => x.blockId === blockId && x.name.toLowerCase() === name.toLowerCase())
    if (!r) { r = { id: uid(), blockId, name }; rooms.push(r) }
    return r
  }
  const rememberBatch = (label: string) => {
    if (label && !batches.some((b) => b.toLowerCase() === label.toLowerCase())) batches.push(label)
  }

  const schedules = (db.schedules ?? []).map((s) => ({
    ...s,
    semester: s.semester ?? '',
    exams: (s.exams ?? []).map((e) => {
      const next: Exam = { ...e, invigilatorIds: e.invigilatorIds ?? [] }
      if (!next.blockId || !blocks.some((b) => b.id === next.blockId) || !next.roomId || !rooms.some((r) => r.id === next.roomId)) {
        const place = splitPlace(next.room)
        if (place) {
          const b = blockNamed(place.block)
          const r = roomNamed(b.id, place.room)
          next.blockId = b.id
          next.roomId = r.id
        }
      }
      if (!next.batch || !next.section) {
        const g = splitGroup(next.group || '')
        if (!next.batch && g.batch) next.batch = g.batch
        if (!next.section && g.section) next.section = g.section
      }
      if (next.batch) rememberBatch(next.batch)
      const slotOk = next.slotId && timeSlots.some((t) => t.id === next.slotId)
      if (!slotOk) {
        const match = timeSlots.find((t) => clock(t.start) === clock(next.start) && clock(t.end) === clock(next.end))
        next.slotId = match?.id
      }
      if (next.students != null && Number.isNaN(Number(next.students))) next.students = undefined
      else if (next.students != null) next.students = Number(next.students)
      return next
    }),
  }))

  return { ...db, timeSlots, blocks, rooms, batches, schedules }
}
