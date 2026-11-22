import type { Course, Instructor } from './types'
import { uid } from './types'

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 }
export const toNumber = (v: string) => (/^\d+$/.test(v) ? Number(v) : ROMAN[v.toUpperCase()] ?? 0)

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

/** "1st Semester" -> 1, "2nd" -> 2, "3rd Semester (Summer)" -> 3. Returns 0 when unknown. */
export function semesterNo(name: string): number {
  const n = name.match(/(\d)\s*(st|nd|rd|th)?/i)
  if (n) return Number(n[1])
  if (/first/i.test(name)) return 1
  if (/second/i.test(name)) return 2
  if (/third|summer/i.test(name)) return 3
  return 0
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
/** Course codes are compared ignoring case, spaces and dashes (SEng 2021 == seng2021). */
export const codeKey = (code: string) => norm(code)

/* ------------------------------------------------------------------ */
/* Instructor matching ("Shimels H." -> Shimels Hailu)                 */
/* ------------------------------------------------------------------ */

export function matchInstructor<T extends Pick<Instructor, 'id' | 'name' | 'deptId'>>(raw: string, list: T[], deptId?: string): T | undefined {
  const parts = raw.replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean).map((p) => p.toLowerCase())
  if (!parts.length) return undefined
  const full = norm(raw)
  const exact = list.find((i) => norm(i.name) === full)
  if (exact) return exact
  const hits = list.filter((i) => {
    const t = i.name.replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean).map((p) => p.toLowerCase())
    if (!t.length || t[0] !== parts[0]) return false
    const rest = parts.slice(1)
    if (!rest.length) return true
    // every remaining token in the source must be an initial or a prefix of a later name token
    return rest.every((r, k) => (t[k + 1] ? t[k + 1].startsWith(r) : false))
  })
  if (hits.length <= 1) return hits[0]
  return hits.find((h) => h.deptId === deptId) ?? hits[0]
}

/** True when two staff names are the same person, allowing "Shimels H." to equal "Shimels Hailu". */
export const samePerson = (a: string, b: string) =>
  !!a.trim() && !!b.trim() && (!!matchInstructor(a, [{ id: 'x', name: b, deptId: '' }]) || !!matchInstructor(b, [{ id: 'x', name: a, deptId: '' }]))

/* ------------------------------------------------------------------ */
/* PDF -> text lines                                                    */
/* ------------------------------------------------------------------ */

type PdfJs = {
  getDocument: (src: { data: Uint8Array }) => { promise: Promise<any> }
}

/**
 * Reads a PDF with pdf.js and rebuilds visual lines from the text positions.
 * Position-based rebuilding matters here: merged table cells (e.g. Lec. Hrs spanning two columns) come out of
 * plain text extraction in the wrong place, which would drop numbers from a row.
 */
export async function readPdfLines(data: ArrayBuffer, pdfjs: PdfJs): Promise<string[]> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise
  const lines: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const items = (content.items as any[])
      .filter((it) => typeof it.str === 'string' && it.str.trim() !== '')
      .map((it) => ({ s: it.str as string, x: it.transform[4] as number, y: it.transform[5] as number, w: (it.width as number) || 0 }))
      .sort((a, b) => b.y - a.y || a.x - b.x)
    const rows: { y: number; items: typeof items }[] = []
    for (const it of items) {
      const row = rows.find((r) => Math.abs(r.y - it.y) <= 3)
      if (row) row.items.push(it)
      else rows.push({ y: it.y, items: [it] })
    }
    rows.sort((a, b) => b.y - a.y)
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x)
      let text = ''
      let lastEnd = -Infinity
      for (const it of r.items) {
        text += (text && it.x - lastEnd > 1 ? ' ' : '') + it.s
        lastEnd = it.x + it.w
      }
      lines.push(text.replace(/\s+/g, ' ').trim())
    }
  }
  return lines
}

/* ------------------------------------------------------------------ */
/* Text lines -> sections of courses                                    */
/* ------------------------------------------------------------------ */

export interface ParsedSection {
  /** Year as written in the file, e.g. 2 for "YEAR II". 0 when the file has no year/semester headings. */
  year: number
  semester: number
  courses: Omit<Course, 'id' | 'instructorId'>[]
}
export interface ParsedBreakdown { sections: ParsedSection[]; warnings: string[] }

const HEAD = /year\s+([ivx]+|\d+)\s*[-–—,:]?\s*(?:semester|sem\.?)\s+([ivx]+|\d+)/i
const CODE = '[A-Za-z]{2,6}\\s?\\d{3,4}[A-Za-z]?'
const ROW = new RegExp(`^(\\d+)\\s+(${CODE})\\s+(.+?)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(.*)$`)
const ROW_START = new RegExp(`^\\d+\\s+${CODE}\\s`)
const TAIL = new RegExp(`^(none|n/?a|-|(?:${CODE}(?:\\s*(?:,|&|/|and)\\s*)?)+)\\s*(.*)$`, 'i')

const cleanPrereq = (v: string) =>
  /^(none|n\/?a|-)$/i.test(v.trim()) ? '' : v.trim().replace(/\s*(?:,|&|\/|\band\b)\s*/gi, ', ').replace(/,\s*$/, '').replace(/\s+/g, '')

export function parseBreakdownLines(lines: string[]): ParsedBreakdown {
  const sections: ParsedSection[] = []
  const warnings: string[] = []
  let current: ParsedSection | null = null

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim()
    if (!line) continue
    const h = line.match(HEAD)
    if (h) {
      current = { year: toNumber(h[1]), semester: toNumber(h[2]), courses: [] }
      sections.push(current)
      continue
    }
    if (!ROW_START.test(line)) continue
    const m = line.match(ROW)
    if (!m) { warnings.push(`Could not read this row: “${line.slice(0, 70)}”`); continue }
    if (!current) { current = { year: 0, semester: 0, courses: [] }; sections.push(current) }
    const tail = m[10].match(TAIL)
    current.courses.push({
      code: m[2].replace(/\s+/g, ''),
      title: m[3].trim(),
      ects: Number(m[4]), crHrs: Number(m[5]), lecHrs: Number(m[6]), labHrs: Number(m[7]), tutHrs: Number(m[8]), hs: Number(m[9]),
      prereq: tail ? cleanPrereq(tail[1]) : '',
      instructorName: (tail ? tail[2] : m[10]).trim(),
    })
  }
  return { sections: sections.filter((s) => s.courses.length), warnings }
}

export const blankCourse = (): Course => ({
  id: uid(), code: '', title: '', ects: 5, crHrs: 3, lecHrs: 2, labHrs: 3, tutHrs: 1, hs: 5, prereq: '', instructorId: '', instructorName: '',
})
