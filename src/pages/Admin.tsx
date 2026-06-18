import { useState, type ReactNode } from 'react'
import { useContentState } from '../content/content'
import { supabaseConfigured } from '../lib/supabase'
import { AdminGate } from '../components/admin/AdminGate'
import { EntityForm } from '../components/admin/EntityForm'
import {
  questionFields,
  stopFields,
  cardFields,
  activityFields,
  restaurantFields,
  settingsFields,
} from '../components/admin/schemas'
import {
  adminUpsertQuestion,
  adminDeleteQuestion,
  adminUpsertStop,
  adminDeleteStop,
  adminUpsertCard,
  adminDeleteCard,
  adminUpsertActivity,
  adminDeleteActivity,
  adminUpsertRestaurant,
  adminDeleteRestaurant,
  adminUpdateSettings,
} from '../lib/admin-api'
import type { Meta, Question, Stop } from '../content/types'
import type { Restaurant } from '../data/jacksonHeightsMap'
import { SetupNeeded } from '../components/SetupNeeded'
import { Button, Card, Screen } from '../components/ui'

type Tab = 'questions' | 'stops' | 'cards' | 'activities' | 'restaurants' | 'settings'
type Row = Record<string, unknown>

export default function Admin() {
  if (!supabaseConfigured) return <SetupNeeded />
  return <AdminGate>{(secret) => <AdminConsole secret={secret} />}</AdminGate>
}

function AdminConsole({ secret }: { secret: string }) {
  const { content, refetch } = useContentState()
  const [tab, setTab] = useState<Tab>('questions')
  const [editing, setEditing] = useState<Row | null>(null)

  if (!content) {
    return (
      <Screen className="justify-center">
        <p className="text-paper/50">Laden…</p>
      </Screen>
    )
  }

  const groupOptions = [
    { value: 'warmup', label: 'Warm-up' },
    ...content.stops.map((s) => ({ value: s.id, label: `Stop ${s.number} · ${s.name}` })),
  ]
  const stopOptions = content.stops.map((s) => ({ value: s.id, label: `Stop ${s.number} · ${s.name}` }))

  async function save(fn: () => Promise<void>) {
    await fn()
    await refetch()
    setEditing(null)
  }

  const tabs: Tab[] = ['questions', 'stops', 'cards', 'activities', 'restaurants', 'settings']

  return (
    <Screen>
      <h1 className="font-display mb-3 text-xl font-bold text-paper">Admin · content</h1>
      <div className="mb-4 flex flex-wrap gap-1 rounded-2xl bg-paper/10 p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setEditing(null)
            }}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
              tab === t ? 'bg-amber-glow text-ink' : 'text-paper/60'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'questions' && (
        <Section
          title="Vragen"
          onNew={() => setEditing({ group_id: 'warmup', type: 'mc', points: 1, active: true, options: [] })}
        >
          {editing && (
            <EntityForm
              fields={questionFields(groupOptions)}
              initial={editing}
              onSubmit={(row) => save(() => adminUpsertQuestion(secret, row))}
              onCancel={() => setEditing(null)}
            />
          )}
          {[
            ...content.warmup.questions.map((q) => ({ q, group: 'warmup' })),
            ...content.stops.flatMap((s) => s.questions.map((q) => ({ q, group: s.id }))),
          ].map(({ q, group }) => (
            <RowItem
              key={q.id}
              title={q.prompt}
              subtitle={`${q.type} · ${q.points}p${q.isTimeline ? ' · 🕰️' : ''}`}
              onEdit={() => setEditing(dbQuestion(q, group))}
              onDelete={() => save(() => adminDeleteQuestion(secret, q.id))}
            />
          ))}
        </Section>
      )}

      {tab === 'stops' && (
        <Section title="Stops" onNew={() => setEditing({ optional: false })}>
          {editing && (
            <EntityForm
              fields={stopFields}
              initial={editing}
              onSubmit={(row) => save(() => adminUpsertStop(secret, row))}
              onCancel={() => setEditing(null)}
            />
          )}
          {content.stops.map((s) => (
            <RowItem
              key={s.id}
              title={`${s.number} · ${s.name}`}
              subtitle={s.era}
              onEdit={() => setEditing(dbStop(s))}
              onDelete={() => save(() => adminDeleteStop(secret, s.id))}
            />
          ))}
        </Section>
      )}

      {tab === 'cards' && (
        <Section title="Warm-up-kaartjes" onNew={() => setEditing({})}>
          {editing && (
            <EntityForm
              fields={cardFields}
              initial={editing}
              onSubmit={(row) => save(() => adminUpsertCard(secret, row))}
              onCancel={() => setEditing(null)}
            />
          )}
          {content.warmup.backgroundCards.map((c) => (
            <RowItem
              key={c.id}
              title={c.title}
              subtitle={c.body.slice(0, 60)}
              onEdit={() => setEditing({ ...c })}
              onDelete={() => save(() => adminDeleteCard(secret, c.id))}
            />
          ))}
        </Section>
      )}

      {tab === 'activities' && (
        <Section title="Activiteiten" onNew={() => setEditing({})}>
          {editing && (
            <EntityForm
              fields={activityFields(stopOptions)}
              initial={editing}
              onSubmit={(row) => save(() => adminUpsertActivity(secret, row))}
              onCancel={() => setEditing(null)}
            />
          )}
          {content.stops
            .flatMap((s) => (s.activities ?? []).map((a) => ({ a, s })))
            .map(({ a, s }) => (
              <RowItem
                key={a.id}
                title={a.title}
                subtitle={`Stop ${s.number}`}
                onEdit={() => setEditing({ ...a, stop_id: s.id })}
                onDelete={() => save(() => adminDeleteActivity(secret, a.id))}
              />
            ))}
        </Section>
      )}

      {tab === 'restaurants' && (
        <Section
          title="Restaurants (eten-kaart)"
          onNew={() => setEditing({ active: true, quotes: [], x: 50, y: 50 })}
        >
          {editing && (
            <EntityForm
              fields={restaurantFields}
              initial={editing}
              onSubmit={(row) => save(() => adminUpsertRestaurant(secret, row))}
              onCancel={() => setEditing(null)}
            />
          )}
          {content.restaurants.map((r) => (
            <RowItem
              key={r.id}
              title={r.name}
              subtitle={`${r.cuisine} · ${r.communityId}`}
              onEdit={() => setEditing(dbRestaurant(r))}
              onDelete={() => save(() => adminDeleteRestaurant(secret, r.id))}
            />
          ))}
        </Section>
      )}

      {tab === 'settings' && (
        <EntityForm
          fields={settingsFields}
          initial={dbSettings(content.meta, content.warmup.intro)}
          onSubmit={(row) => save(() => adminUpdateSettings(secret, row))}
        />
      )}
    </Screen>
  )
}

function Section({ title, onNew, children }: { title: string; onNew: () => void; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-paper">{title}</h2>
        <Button onClick={onNew} className="px-3 py-2 text-sm">
          + Nieuw
        </Button>
      </div>
      {children}
    </div>
  )
}

function RowItem({
  title,
  subtitle,
  onEdit,
  onDelete,
}: {
  title: string
  subtitle?: string
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{title}</p>
        {subtitle && <p className="truncate text-xs text-ink/50">{subtitle}</p>}
      </div>
      <Button variant="outline" onClick={onEdit} className="px-3 py-2 text-sm">
        Bewerk
      </Button>
      <button
        onClick={() => {
          if (confirm('Verwijderen?')) onDelete()
        }}
        className="px-2 text-rose-mark"
      >
        ✕
      </button>
    </Card>
  )
}

// Domein → DB-rij vormen voor het bewerkformulier
function dbQuestion(q: Question, group: string): Row {
  return {
    id: q.id,
    group_id: group,
    type: q.type,
    prompt: q.prompt,
    options: q.options ?? [],
    correct_index: q.correctIndex ?? '',
    model_answer: q.modelAnswer ?? '',
    points: q.points,
    is_timeline: q.isTimeline ?? false,
    discussion: q.discussion ?? false,
    active: true,
  }
}
function dbStop(s: Stop): Row {
  return {
    id: s.id,
    number: s.number,
    name: s.name,
    optional: s.optional ?? false,
    location: s.location,
    era: s.era,
    layer: s.layer,
    food: s.food ?? '',
    intro: s.intro,
    reveal: s.reveal,
    background: s.background,
  }
}
function dbRestaurant(r: Restaurant): Row {
  return {
    id: r.id,
    name: r.name,
    community_id: r.communityId,
    lang_group: r.langGroup,
    cuisine: r.cuisine,
    price: r.price,
    address: r.address,
    x: r.x,
    y: r.y,
    rating: r.rating,
    rating_count: r.ratingCount,
    rating_source: r.ratingSource,
    consensus: r.consensus,
    dish: r.dish,
    dish_source: r.dishSource,
    quotes: r.quotes,
    tour: r.tour,
    active: true,
  }
}
function dbSettings(meta: Meta, warmupIntro: string): Row {
  return {
    title: meta.title,
    subtitle: meta.subtitle,
    date: meta.date,
    central_question: meta.centralQuestion,
    opening_line: meta.openingLine,
    closing_line: meta.closingLine,
    warmup_intro: warmupIntro,
    mc_points: meta.scoring.mcPoints,
    open_points: meta.scoring.openPoints,
    timeline_note: meta.scoring.timelineNote,
  }
}
