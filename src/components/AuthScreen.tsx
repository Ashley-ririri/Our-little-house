import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { formatTime, periodOf } from '../time'
import { LanguageToggle } from './LanguageToggle'
import { MusicControl } from './MusicControl'
import { RoomScene } from './RoomScene'
import { TimeButton } from './TimeButton'

const ORDER = ['real', 'dawn', 'day', 'dusk', 'night'] as const

export function AuthScreen() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<(typeof ORDER)[number]>('real')
  const now = new Date()
  const period = preview === 'real' ? periodOf(now) : preview
  const ready = email.trim().includes('@') && password.length >= 6

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !ready || busy) return
    setBusy(true)
    setNote(null)
    const credentials = { email: email.trim(), password }
    const result = mode === 'signup'
      ? await supabase.auth.signUp(credentials)
      : await supabase.auth.signInWithPassword(credentials)
    setBusy(false)
    if (result.error) {
      setNote(t('authFailed'))
      return
    }
    if (mode === 'signup' && !result.data.session) setNote(t('authCheckEmail'))
  }

  return (
    <div className="shell" data-period={period}>
      <form className="panel" onSubmit={(event) => void submit(event)}>
        <LanguageToggle />
        <p className="eyebrow">HOME</p>
        <h2>{t('authTitle')}</h2>
        <p className="hint">{note ?? t('authHint')}</p>
        <label className="field">
          {t('authEmail')}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="field">
          {t('authPassword')}
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button className="btn wide" type="submit" disabled={!ready || busy}>
          {busy ? t('authBusy') : mode === 'signup' ? t('authSignUp') : t('authLogin')}
        </button>
        <p className="panel-foot">
          <button
            type="button"
            onClick={() => {
              setMode((current) => (current === 'login' ? 'signup' : 'login'))
              setNote(null)
            }}
          >
            {mode === 'login' ? t('authNoAccount') : t('authHasAccount')}
          </button>
        </p>
      </form>
      <RoomScene
        period={period}
        unlockedIds={[]}
        catOutfitId={null}
        month={now.getMonth() + 1}
        day={now.getDate()}
        caption={t('systemMsg')}
        chrome={
          <header className="topbar">
            <div>
              <p className="eyebrow">{t('noNameYet')}</p>
              <h1>{t('emptyRoom')}</h1>
            </div>
            <div className="top-tools">
              <MusicControl />
              <TimeButton
                period={period}
                preview={preview !== 'real'}
                time={formatTime(now)}
                onCycle={() => setPreview((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length])}
              />
            </div>
          </header>
        }
      />
    </div>
  )
}
