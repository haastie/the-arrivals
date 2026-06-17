import { useState } from 'react'
import type { Field } from './schemas'
import { Button, Card } from '../ui'

type Row = Record<string, unknown>

export function EntityForm({
  fields,
  initial,
  onSubmit,
  onCancel,
}: {
  fields: Field[]
  initial?: Row
  onSubmit: (row: Row) => Promise<void>
  onCancel?: () => void
}) {
  const [row, setRow] = useState<Row>(() => initial ?? {})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function set(key: string, value: unknown) {
    setRow((r) => ({ ...r, [key]: value }))
  }

  async function submit() {
    for (const f of fields) {
      if (f.required && (row[f.key] === undefined || row[f.key] === '')) {
        setErr(`Veld "${f.label}" is verplicht`)
        return
      }
    }
    setBusy(true)
    setErr(null)
    try {
      await onSubmit(row)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Opslaan mislukte')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      {fields.map((f) => (
        <label key={f.key} className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink/70">{f.label}</span>
          {f.type === 'textarea' ? (
            <textarea
              value={String(row[f.key] ?? '')}
              onChange={(e) => set(f.key, e.target.value)}
              rows={3}
              className="rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-glow"
            />
          ) : f.type === 'boolean' ? (
            <input
              type="checkbox"
              checked={Boolean(row[f.key])}
              onChange={(e) => set(f.key, e.target.checked)}
              className="h-5 w-5"
            />
          ) : f.type === 'number' ? (
            <input
              type="number"
              value={String(row[f.key] ?? '')}
              onChange={(e) => set(f.key, e.target.value === '' ? '' : Number(e.target.value))}
              className="rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-glow"
            />
          ) : f.type === 'select' ? (
            <select
              value={String(row[f.key] ?? '')}
              onChange={(e) => set(f.key, e.target.value)}
              className="rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-glow"
            >
              <option value="">- kies -</option>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === 'options' ? (
            <OptionsEditor
              value={(row[f.key] as string[]) ?? []}
              onChange={(v) => set(f.key, v)}
            />
          ) : (
            <input
              type="text"
              value={String(row[f.key] ?? '')}
              onChange={(e) => set(f.key, e.target.value)}
              className="rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-glow"
            />
          )}
          {f.help && <span className="text-xs text-ink/40">{f.help}</span>}
        </label>
      ))}
      {err && <p className="text-sm text-rose-mark">{err}</p>}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy}>
          {busy ? 'Opslaan…' : 'Opslaan'}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Annuleren
          </Button>
        )}
      </div>
    </Card>
  )
}

function OptionsEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {value.map((opt, i) => (
        <div key={i} className="flex gap-1.5">
          <input
            value={opt}
            onChange={(e) => {
              const c = [...value]
              c[i] = e.target.value
              onChange(c)
            }}
            className="flex-1 rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink outline-none"
          />
          <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="px-2 text-rose-mark">
            ✕
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...value, ''])} className="self-start text-sm text-clay underline">
        + optie
      </button>
    </div>
  )
}
