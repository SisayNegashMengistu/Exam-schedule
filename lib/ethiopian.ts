const MONTHS = ['መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን']

/** Gregorian ISO date -> Ethiopian date (e.g. 2026-11-24 -> ህዳር 15, 2019). */
export function toEthiopian(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d)
  const newYear = (Y: number) => Date.UTC(Y, 8, (Y + 1) % 4 === 0 ? 12 : 11)
  let Y = y
  if (t < newYear(Y)) Y--
  const diff = Math.round((t - newYear(Y)) / 864e5)
  return { day: (diff % 30) + 1, month: MONTHS[Math.floor(diff / 30)], year: Y - 7 }
}
export const ethLabel = (iso: string) => { const e = toEthiopian(iso); return `${e.month} ${e.day}` }
export const ethFull = (iso: string) => { const e = toEthiopian(iso); return `${e.month} ${e.day}, ${e.year} E.C.` }
