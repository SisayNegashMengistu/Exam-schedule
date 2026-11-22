/** Browser-only lock for the registrar account. Not a substitute for a server login. */
export function hashPassword(password: string) {
  let h = 2166136261
  const s = `ddu:${password}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
