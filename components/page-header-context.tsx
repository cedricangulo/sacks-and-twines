/**
 * Allows sub-layouts to set the page title, action buttons, and back
 * link in the shell's fixed <header>. Uses a registration-based
 * pattern so concurrent setters (parallel routes, Suspense) don't
 * race — each setter gets a unique ID and only its own cleanup
 * removes its entry, leaving siblings intact.
 *
 * Why `use()` instead of `useContext`:
 *   `use()` is the React 19 replacement. It can be called inside
 *   conditionals and loops, which `useContext` cannot.
 *
 * Why memoized context value:
 *   An inline `value={{...}}` creates a new object every render,
 *   forcing every consumer to re-render. `useMemo` preserves the
 *   object identity until its dependencies change.
 *
 * Why refs for initial values + separate update effects:
 *   The registration effect runs only on mount/unmount so a setter's
 *   cleanup never removes another setter's entry. Refs capture the
 *   props at mount time without including them in deps. When props
 *   change, separate effects call `update()` which modifies the
 *   existing registration in-place, preserving insertion order so
 *   the most-recently-mounted setter always wins.
 */

"use client"

import {
  createContext,
  ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

interface PageHeaderState {
  title: string
  backHref: string | null
  actions: ReactNode
}

type RegistrationId = number

interface PageHeaderContextType extends PageHeaderState {
  register: (state: PageHeaderState) => RegistrationId
  update: (id: RegistrationId, state: Partial<PageHeaderState>) => void
  unregister: (id: RegistrationId) => void
}

const PageHeaderContext = createContext<PageHeaderContextType | null>(null)

/**
 * Provides page header state + registration API to descendants.
 * Tracks a Map of active registrations and derives the current
 * value from the most-recently-registered entry.
 */
export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [registrations, setRegistrations] = useState<
    Map<RegistrationId, PageHeaderState>
  >(new Map())
  const nextIdRef = useRef(0)

  const register = useCallback((state: PageHeaderState) => {
    const id = ++nextIdRef.current
    setRegistrations((prev) => {
      const next = new Map(prev)
      next.set(id, state)
      return next
    })
    return id
  }, [])

  const update = useCallback(
    (id: RegistrationId, state: Partial<PageHeaderState>) => {
      setRegistrations((prev) => {
        const next = new Map(prev)
        const existing = next.get(id)
        if (existing) {
          next.set(id, { ...existing, ...state })
        }
        return next
      })
    },
    []
  )

  const unregister = useCallback((id: RegistrationId) => {
    setRegistrations((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const value = useMemo(() => {
    const entries = Array.from(registrations.entries())
    const lastEntry = entries[entries.length - 1]
    const current: PageHeaderState = lastEntry
      ? lastEntry[1]
      : { title: "", backHref: null, actions: null }

    return { ...current, register, update, unregister }
  }, [registrations, register, update, unregister])

  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  )
}

/**
 * Reads the current page header state.
 * Uses `use()` (React 19) instead of `useContext` for branch-safe
 * context reads.
 */
export function usePageHeader() {
  const ctx = use(PageHeaderContext)
  if (!ctx)
    throw new Error("usePageHeader must be used within PageHeaderProvider")
  return ctx
}

interface PageHeaderSetterProps {
  title: string
  actions?: ReactNode
  backHref?: string | null
}

/**
 * Registers title/actions/backHref with the nearest ancestor
 * PageHeaderProvider on mount and removes them on unmount.
 *
 * Props are captured in refs for the registration effect (runs only
 * on mount/unmount). When props change, dedicated effects call
 * `update()` which modifies the setter's existing registration
 * in-place — no flickering or race conditions with other setters.
 */
export function PageHeaderSetter({
  title,
  actions,
  backHref,
}: PageHeaderSetterProps) {
  const { register, update, unregister } = usePageHeader()
  const idRef = useRef<RegistrationId | null>(null)
  const initialTitleRef = useRef(title)
  const initialActionsRef = useRef(actions)
  const initialBackHrefRef = useRef(backHref)

  useEffect(() => {
    const id = register({
      title: initialTitleRef.current,
      actions: initialActionsRef.current ?? null,
      backHref: initialBackHrefRef.current ?? null,
    })
    idRef.current = id
    return () => unregister(id)
  }, [register, unregister])

  useEffect(() => {
    if (idRef.current !== null) {
      update(idRef.current, { title })
    }
  }, [title, update])

  useEffect(() => {
    if (idRef.current !== null) {
      update(idRef.current, { actions: actions ?? null })
    }
  }, [actions, update])

  useEffect(() => {
    if (idRef.current !== null) {
      update(idRef.current, { backHref: backHref ?? null })
    }
  }, [backHref, update])

  return null
}
