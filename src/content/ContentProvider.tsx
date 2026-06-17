import {
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from 'react'
import { fetchContentRows } from './fetchContent'
import { mapContent, type MappedContent } from './mapContent'

interface ContentState {
  content: MappedContent | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const Ctx = createContext<ContentState | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<MappedContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchContentRows()
      setContent(mapContent(rows))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kon content niet laden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return <Ctx.Provider value={{ content, loading, error, refetch }}>{children}</Ctx.Provider>
}

/** Geeft de geladen content. Gebruik binnen schermen die achter de laadcheck renderen. */
export function useContent(): MappedContent {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useContent buiten ContentProvider')
  if (!ctx.content) throw new Error('content nog niet geladen - render achter useContentState().loading')
  return ctx.content
}

/** Voor laad-/foutafhandeling en refetch (bv. in /admin). */
export function useContentState(): ContentState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useContentState buiten ContentProvider')
  return ctx
}
