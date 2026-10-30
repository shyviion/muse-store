import { useEffect, useState } from 'react'
import { getSiteSettings } from '../services/backend'

export function useSiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    const load = () => {
      void getSiteSettings().then(values => {
        if (active) setSettings(Object.fromEntries(Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === 'string')))
      }).catch(() => {})
    }
    load()
    window.addEventListener('focus', load)
    return () => { active = false; window.removeEventListener('focus', load) }
  }, [])

  return settings
}
