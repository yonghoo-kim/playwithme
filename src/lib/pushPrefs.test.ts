import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applyPushPrefs,
  applyStatusPushPrefs,
  filterPushRecipients,
  filterStatusPushRecipients,
  loadPushPrefs,
  resetPushPrefsWarnings,
  type PushPrefs,
} from './pushPrefs'

const NIGHT = new Date('2026-11-01T14:00:00Z') // 23:00 KST
const DAY = new Date('2026-11-01T03:00:00Z') // 12:00 KST

function prefs(quiet: string[], mutes: Record<string, string[]> = {}): PushPrefs {
  return {
    quietUserIds: new Set(quiet),
    mutedGroupsByUser: new Map(
      Object.entries(mutes).map(([user, groups]) => [user, new Set(groups)])
    ),
  }
}

type Result = { data: unknown[] | null; error: { message: string } | null }

/** Minimal `from(table).select().in()` stand-in; records which tables were hit. */
function fakeSupabase(tables: Record<string, Result>) {
  const queried: string[] = []
  const client = {
    from: vi.fn((table: string) => ({
      select: () => ({
        in: () => {
          queried.push(table)
          return Promise.resolve(tables[table] ?? { data: [], error: null })
        },
      }),
    })),
  }
  return { client: client as unknown as SupabaseClient, queried }
}

describe('applyPushPrefs', () => {
  it('drops users in quiet hours', () => {
    expect(applyPushPrefs(['a', 'b', 'c'], prefs(['b']), null)).toEqual(['a', 'c'])
  })

  it('drops users who muted the pushing group', () => {
    expect(applyPushPrefs(['a', 'b'], prefs([], { a: ['g1'] }), 'g1')).toEqual(['b'])
  })

  it('keeps users who muted a different group', () => {
    expect(applyPushPrefs(['a', 'b'], prefs([], { a: ['g2'] }), 'g1')).toEqual(['a', 'b'])
  })

  it('ignores group mutes for a 1:1 push', () => {
    expect(applyPushPrefs(['a'], prefs([], { a: ['g1'] }), null)).toEqual(['a'])
  })

  it('dedupes and keeps order', () => {
    expect(applyPushPrefs(['b', 'a', 'b'], prefs([]), null)).toEqual(['b', 'a'])
  })
})

describe('applyStatusPushPrefs', () => {
  it('still notifies a friend through a shared group they did not mute', () => {
    const result = applyStatusPushPrefs(
      new Map([['a', ['g1', 'g2']]]),
      prefs([], { a: ['g1'] })
    )
    expect(result).toEqual(new Map([['a', ['g2']]]))
  })

  it('drops a friend whose every shared group is muted', () => {
    const result = applyStatusPushPrefs(
      new Map([
        ['a', ['g1', 'g2']],
        ['b', ['g1']],
      ]),
      prefs([], { a: ['g1', 'g2'] })
    )
    expect(Array.from(result.keys())).toEqual(['b'])
  })

  it('drops users in quiet hours', () => {
    const result = applyStatusPushPrefs(new Map([['a', ['g1']], ['b', ['g1']]]), prefs(['a']))
    expect(Array.from(result.keys())).toEqual(['b'])
  })

  it('keeps a recipient with no groups (child in no group) despite mutes', () => {
    const result = applyStatusPushPrefs(new Map([['a', []]]), prefs([], { a: ['g1'] }))
    expect(result).toEqual(new Map([['a', []]]))
  })
})

describe('loadPushPrefs', () => {
  beforeEach(() => {
    resetPushPrefsWarnings()
    vi.restoreAllMocks()
  })

  it('only looks up quiet hours at night', async () => {
    const { client, queried } = fakeSupabase({
      users: { data: [{ id: 'a', quiet_hours: true }], error: null },
    })
    const day = await loadPushPrefs(client, ['a'], DAY, false)
    expect(day.quietUserIds.size).toBe(0)
    expect(queried).toEqual([])

    const night = await loadPushPrefs(client, ['a'], NIGHT, false)
    expect(Array.from(night.quietUserIds)).toEqual(['a'])
  })

  it('skips users who turned quiet hours off', async () => {
    const { client } = fakeSupabase({
      users: {
        data: [
          { id: 'a', quiet_hours: true },
          { id: 'b', quiet_hours: false },
        ],
        error: null,
      },
    })
    const result = await loadPushPrefs(client, ['a', 'b'], NIGHT, false)
    expect(Array.from(result.quietUserIds)).toEqual(['a'])
  })

  it('collects group mutes per user', async () => {
    const { client } = fakeSupabase({
      group_mutes: {
        data: [
          { user_id: 'a', group_id: 'g1' },
          { user_id: 'a', group_id: 'g2' },
        ],
        error: null,
      },
    })
    const result = await loadPushPrefs(client, ['a'], DAY, true)
    expect(result.mutedGroupsByUser.get('a')).toEqual(new Set(['g1', 'g2']))
  })

  it('treats a missing column or table as no preferences and warns once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { client } = fakeSupabase({
      users: { data: null, error: { message: 'column users.quiet_hours does not exist' } },
      group_mutes: { data: null, error: { message: 'relation "group_mutes" does not exist' } },
    })
    const first = await loadPushPrefs(client, ['a'], NIGHT, true)
    await loadPushPrefs(client, ['a'], NIGHT, true)
    expect(first.quietUserIds.size).toBe(0)
    expect(first.mutedGroupsByUser.size).toBe(0)
    expect(warn).toHaveBeenCalledTimes(2) // once per source, not per call
  })

  it('does not query for nobody', async () => {
    const { client, queried } = fakeSupabase({})
    await loadPushPrefs(client, [], NIGHT, true)
    expect(queried).toEqual([])
  })
})

describe('filterPushRecipients', () => {
  beforeEach(() => resetPushPrefsWarnings())

  it('applies quiet hours and the group mute together', async () => {
    const { client } = fakeSupabase({
      users: {
        data: [
          { id: 'a', quiet_hours: true },
          { id: 'b', quiet_hours: false },
          { id: 'c', quiet_hours: false },
        ],
        error: null,
      },
      group_mutes: { data: [{ user_id: 'b', group_id: 'g1' }], error: null },
    })
    expect(
      await filterPushRecipients(client, ['a', 'b', 'c'], { groupId: 'g1', now: NIGHT })
    ).toEqual(['c'])
  })

  it('does not look up mutes for a 1:1 push', async () => {
    const { client, queried } = fakeSupabase({})
    await filterPushRecipients(client, ['a'], { groupId: null, now: DAY })
    expect(queried).toEqual([])
  })
})

describe('filterStatusPushRecipients', () => {
  it('loads prefs and filters the recipient map', async () => {
    const { client } = fakeSupabase({
      group_mutes: { data: [{ user_id: 'a', group_id: 'g1' }], error: null },
    })
    const result = await filterStatusPushRecipients(
      client,
      new Map([
        ['a', ['g1']],
        ['b', ['g1']],
      ]),
      DAY
    )
    expect(Array.from(result.keys())).toEqual(['b'])
  })
})
