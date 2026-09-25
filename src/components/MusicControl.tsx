import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { musicSnapshot, setMusicVolume, subscribeMusic, toggleMusic } from '../music'

export function MusicControl() {
  const { t } = useTranslation()
  const [state, setState] = useState(musicSnapshot)

  useEffect(() => {
    const stop = subscribeMusic(() => setState(musicSnapshot()))
    return () => {
      stop()
    }
  }, [])

  const audible = state.playing && !state.muted

  return (
    <div className="music-box">
      <button
        type="button"
        className={state.muted ? 'music-toggle is-muted' : audible ? 'music-toggle playing' : 'music-toggle'}
        aria-pressed={audible}
        aria-label={state.muted ? t('musicOff') : t('musicOn')}
        onClick={() => toggleMusic()}
      >
        <span className="disc" aria-hidden="true" />
        {state.muted && <span className="mute-mark" aria-hidden="true" />}
      </button>
      <div className="music-volume">
        <span className="music-fill" style={{ width: `${Math.round(state.volume * 100)}%` }} />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(state.volume * 100)}
          aria-label={t('musicVolume')}
          onInput={(event) => setMusicVolume(Number(event.currentTarget.value) / 100)}
          onChange={(event) => setMusicVolume(Number(event.currentTarget.value) / 100)}
        />
      </div>
    </div>
  )
}
