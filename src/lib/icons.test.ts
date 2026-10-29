import { describe, it, expect } from 'vitest'
import { Trees, ShoppingCart, MapPin } from 'lucide-react'
import { getPlaceIcon, getPlaceVisual } from './icons'

describe('getPlaceIcon', () => {
  it('maps a known icon_name to its Lucide component', () => {
    expect(getPlaceIcon('Trees')).toBe(Trees)
    expect(getPlaceIcon('ShoppingCart')).toBe(ShoppingCart)
  })

  it('falls back to MapPin for an unknown icon_name', () => {
    expect(getPlaceIcon('NotARealIcon')).toBe(MapPin)
  })
})

describe('getPlaceVisual', () => {
  it('returns the slide emoji for Playground', () => {
    expect(getPlaceVisual('Playground')).toEqual({ type: 'emoji', emoji: '🛝' })
  })

  it('returns the Lucide icon for a known lucide icon_name', () => {
    expect(getPlaceVisual('Trees')).toEqual({ type: 'lucide', Icon: Trees })
  })

  it('falls back to the MapPin Lucide icon for an unknown icon_name', () => {
    expect(getPlaceVisual('NotARealIcon')).toEqual({ type: 'lucide', Icon: MapPin })
  })
})
