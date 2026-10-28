import { describe, it, expect } from 'vitest'
import { Trees, ShoppingCart, MapPin } from 'lucide-react'
import { getPlaceIcon } from './icons'

describe('getPlaceIcon', () => {
  it('maps a known icon_name to its Lucide component', () => {
    expect(getPlaceIcon('Trees')).toBe(Trees)
    expect(getPlaceIcon('ShoppingCart')).toBe(ShoppingCart)
  })

  it('falls back to MapPin for an unknown icon_name', () => {
    expect(getPlaceIcon('NotARealIcon')).toBe(MapPin)
  })
})
