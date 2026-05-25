import { getInitials as libGetInitials } from "./utils"

export function getInitials(name?: string | null) {
  if (!name) return "?"
  return libGetInitials(name)
}

export function avatarFallbackText(name?: string | null, max = 2) {
  const initials = getInitials(name)
  return initials ? initials.slice(0, max) : "?"
}
