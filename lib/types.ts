export type ExamStatus = 'Not updated' | 'Completed' | 'Missed' | 'Late start'
export const STATUSES: ExamStatus[] = ['Not updated', 'Completed', 'Missed', 'Late start']
export type Session = 'Morning' | 'Afternoon'
export type ScheduleStatus = 'Upcoming' | 'In progress' | 'Completed'

export interface Exam {
  id: string; code: string; title: string
  date: string            // ISO yyyy-mm-dd (Ethiopian date + weekday are computed)
  start: string; end: string; session: Session
  deptId: string; group: string; room: string
  invigilatorIds: string[]
  status: ExamStatus; updatedAt?: string
  blockId?: string; roomId?: string; slotId?: string
  batch?: string; section?: string; students?: number
}
export interface Schedule { id: string; name: string; academicYear: string; semester: string; exams: Exam[] }
export const scheduleLabel = (s: Schedule) => [s.semester, s.name].filter(Boolean).join(' · ')
export interface Dept {
  id: string; name: string; short: string
  headName: string; headPhone: string   // department head
  email: string; info: string
}
export interface Invigilator { id: string; name: string; phone: string; deptId: string }
/** An academic term such as "1st Semester", "2nd Semester" or "3rd Semester (Summer)". */
export interface Semester { id: string; name: string }
/** Teaching staff who are assigned to courses (separate from invigilators, who watch the exams). */
export interface Instructor { id: string; name: string; phone: string; deptId: string }
export interface Course {
  id: string; code: string; title: string
  ects: number; crHrs: number; lecHrs: number; labHrs: number; tutHrs: number; hs: number
  prereq: string
  instructorId: string      // matched / chosen instructor ('' = not assigned)
  instructorName: string    // name exactly as written in the uploaded breakdown (kept for reference)
}
/** The course breakdown for one department + batch (year) + semester. */
export interface Breakdown {
  id: string; deptId: string; batch: string; semesterId: string
  sourceFile?: string; uploadedAt?: string
  courses: Course[]
}
export interface Account { id: string; name: string; username: string; passwordHash: string; role: 'editor' }
export interface Block { id: string; name: string }
export interface Room { id: string; blockId: string; name: string }
export interface TimeSlot { id: string; session: Session; start: string; end: string }
export interface Settings {
  university: string; institute: string; school: string
  deanName: string; deanPhone: string
  registrarName: string; registrarPhone: string; registrarEmail: string
  footer: string; pin: string
}
export interface DB {
  settings: Settings
  accounts: Account[]
  blocks: Block[]
  rooms: Room[]
  timeSlots: TimeSlot[]
  batches: string[]
  semesters: Semester[]
  departments: Dept[]
  invigilators: Invigilator[]
  instructors: Instructor[]
  breakdowns: Breakdown[]
  schedules: Schedule[]
}

export const DEFAULT_SEMESTERS: Semester[] = [
  { id: 'sem-1', name: '1st Semester' },
  { id: 'sem-2', name: '2nd Semester' },
  { id: 'sem-3', name: '3rd Semester (Summer)' },
]
export const breakdownFor = (db: Pick<DB, 'breakdowns'>, deptId: string, batch: string, semesterId: string) =>
  db.breakdowns.find((b) => b.deptId === deptId && b.batch === batch && b.semesterId === semesterId)

export const uid = () => Math.random().toString(36).slice(2, 10)

/** Schedule status is always derived from its exams — it updates itself once every exam has a recorded result. */
export function scheduleStatus(s?: Schedule): ScheduleStatus {
  if (!s || s.exams.length === 0) return 'Upcoming'
  const recorded = s.exams.filter((e) => e.status !== 'Not updated').length
  if (recorded === s.exams.length) return 'Completed'
  const first = s.exams.map((e) => e.date).sort()[0]
  return recorded > 0 || first <= new Date().toISOString().slice(0, 10) ? 'In progress' : 'Upcoming'
}

export const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
export const weekday = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
