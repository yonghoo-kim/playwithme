import { describe, it, expect } from 'vitest'
import { buildStatusUpsertRow } from './status'

describe('buildStatusUpsertRow', () => {
  it('builds a per-child row (no group) with the given place_id', () => {
    const row = buildStatusUpsertRow('child-1', 'place-1')
    expect(row).toMatchObject({ child_id: 'child-1', place_id: 'place-1' })
    expect(row).not.toHaveProperty('group_id')
  })

  it('builds a cleared row (place_id null) for going home', () => {
    const row = buildStatusUpsertRow('child-1', null)
    expect(row.place_id).toBeNull()
  })
})
