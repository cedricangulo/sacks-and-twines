import { setEnabled, setVolume } from "cuelume"

const STORAGE_ENABLED = "cuelume:enabled"
const STORAGE_VOLUME = "cuelume:volume"

export function setCuelumeEnabled(enabled: boolean) {
  setEnabled(enabled)
  try {
    localStorage.setItem(STORAGE_ENABLED, String(enabled))
  } catch {
    // ignore
  }
}

export function setCuelumeVolume(volume: number) {
  setVolume(volume)
  try {
    localStorage.setItem(STORAGE_VOLUME, String(volume))
  } catch {
    // ignore
  }
}

export { STORAGE_ENABLED, STORAGE_VOLUME }
