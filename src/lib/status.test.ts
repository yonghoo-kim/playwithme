import { describe, it, expect } from 'vitest'
import { buildStatusUpsertRow } from './status'

describe('buildStatusUpsertRow', () => {
  it('builds a row with the given place_id', () => {
    const row = buildStatusUpsertRow('user-1', 'group-1', 'place-1')
    expect(row).toMatchObject({ user_id: 'user-1', group_id: 'group-1', place_id: 'place-1' })
  })

  it('builds a cleared row (place_id null) for going home', () => {
    const row = buildStatusUpsertRow('user-1', 'group-1', null)
    expect(row.place_id).toBeNull()
  })
})
