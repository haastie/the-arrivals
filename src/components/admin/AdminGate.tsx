import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminCheck } from '../../lib/admin-api'
import { loadAdminSecret, saveAdminSecret } from '../../lib/admin-identity'
import { Button, Card, Notice, Screen } from '../ui'

export function AdminGate({ children }: { children: (secret: string) => ReactNode }) {
  const [params] = useSearchParams()
  const [secret, setSecret] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const candidate = params.get('key') ?? loadAdminSecret()
    if (!candidate) {
      setChecking(false)
      return
    }
    adminCheck(candidate)
      .then((ok) => {
        if (ok) {
          saveAdminSecret(candidate)
          setSecret(candidate)
        }
        setChecking(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Fout')
        setChecking(false)
      })
  }, [params])

  async function tryKey() {
    setError(null)
    try {
      if (await adminCheck(input.trim())) {
        saveAdminSecret(input.trim())
        setSecret(input.trim())
      } else {
        setError('Ongeldige sleutel')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout')
    }
  }

  if (checking) {
    return (
      <Screen className="justify-center">
        <p className="text-center text-paper/50">Controleren…</p>
      </Screen>
    )
  }
  if (secret) return <>{children(secret)}</>
  return (
    <Screen className="justify-center">
      <Card className="flex flex-col gap-3">
        <h1 className="font-display text-xl font-bold">Admin</h1>
        <p className="text-sm text-ink/60">Voer de admin-sleutel in (of open /admin?key=...).</p>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="admin_secret"
          className="rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-glow"
        />
        {error && <Notice tone="error">{error}</Notice>}
        <Button onClick={tryKey}>Openen</Button>
      </Card>
    </Screen>
  )
}
