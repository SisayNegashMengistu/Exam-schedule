'use client'
import { useState } from 'react'
import { KeyRound, LogIn } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Field, Logo, Modal, ThemeToggle } from './ui-bits'

export function LoginPage({ onBrowse }: { onBrowse: () => void }) {
  const { login, resetPassword, toast } = useApp()
  const [mode, setMode] = useState<'sign' | 'reset'>('sign')
  const [username, setUsername] = useState('sc.reg@ddu.edu.et')
  const [password, setPassword] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')

  const signIn = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!login(username, password)) setError('Username or password is incorrect.')
  }
  const reset = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (next !== again) return setError('The new passwords do not match.')
    const err = resetPassword(username, next)
    if (err) return setError(err)
    toast('Password reset. Sign in with the new password.')
    setPassword(''); setNext(''); setAgain(''); setMode('sign')
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <Logo size={52} />
          <div>
            <p className="text-sm font-bold uppercase tracking-tight">Dire Dawa University</p>
            <p className="text-[11px] font-semibold tracking-[.14em] text-muted">SCHOOL OF COMPUTING · REGISTRAR</p>
          </div>
        </div>
        <div className="card p-6 md:p-8">
          <h1 className="text-[26px] font-semibold tracking-tight">{mode === 'sign' ? 'Sign in' : 'Reset password'}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {mode === 'sign'
              ? 'The registrar account can edit schedules, assign invigilators and publish reports.'
              : 'Set a new password for this device. The account keeps editor access.'}
          </p>
          {mode === 'sign' ? (
            <form onSubmit={signIn} className="mt-6 space-y-3">
              <Field label="Username"><input required autoComplete="username" className="input" value={username} onChange={(e) => { setUsername(e.target.value); setError('') }} /></Field>
              <Field label="Password"><input required type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} /></Field>
              {error && <p className="text-xs text-bad">{error}</p>}
              <button className="btn btn-primary mt-2 w-full" type="submit"><LogIn size={15} /> Sign in</button>
              <button type="button" className="btn w-full" onClick={() => { setMode('reset'); setError('') }}><KeyRound size={15} /> Reset password</button>
            </form>
          ) : (
            <form onSubmit={reset} className="mt-6 space-y-3">
              <Field label="Username"><input required autoComplete="username" className="input" value={username} onChange={(e) => { setUsername(e.target.value); setError('') }} /></Field>
              <Field label="New password"><input required type="password" autoComplete="new-password" className="input" value={next} onChange={(e) => { setNext(e.target.value); setError('') }} /></Field>
              <Field label="Confirm new password"><input required type="password" autoComplete="new-password" className="input" value={again} onChange={(e) => { setAgain(e.target.value); setError('') }} /></Field>
              {error && <p className="text-xs text-bad">{error}</p>}
              <button className="btn btn-primary mt-2 w-full" type="submit">Save new password</button>
              <button type="button" className="btn w-full" onClick={() => { setMode('sign'); setError('') }}>Back to sign in</button>
            </form>
          )}
        </div>
        <button className="btn mt-4 w-full" onClick={onBrowse}>View the timetable without signing in</button>
        <p className="mt-4 text-center text-[10px] leading-relaxed text-muted">Editor sign-in is stored in this browser. Students can open the schedule without an account.</p>
      </div>
    </div>
  )
}

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { changePassword, toast, user } = useApp()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (next !== again) return setError('The new passwords do not match.')
    const err = changePassword(current, next)
    if (err) return setError(err)
    toast('Password changed')
    onClose()
  }
  return <Modal title="Change password" onClose={onClose}>
    <form onSubmit={save} className="space-y-3">
      <p className="text-xs text-muted">{user?.username} · Editor</p>
      <Field label="Current password"><input required type="password" autoComplete="current-password" className="input" value={current} onChange={(e) => { setCurrent(e.target.value); setError('') }} /></Field>
      <Field label="New password"><input required type="password" autoComplete="new-password" className="input" value={next} onChange={(e) => { setNext(e.target.value); setError('') }} /></Field>
      <Field label="Confirm new password"><input required type="password" autoComplete="new-password" className="input" value={again} onChange={(e) => { setAgain(e.target.value); setError('') }} /></Field>
      {error && <p className="text-xs text-bad">{error}</p>}
      <button className="btn btn-primary w-full" type="submit">Update password</button>
    </form>
  </Modal>
}
