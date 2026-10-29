import { Trees, ShoppingCart, MapPin, Home, Building2, Bike, type LucideIcon } from 'lucide-react'

const PLACE_ICONS: Record<string, LucideIcon> = {
  Trees,
  ShoppingCart,
  MapPin,
  Home,
  Building2,
  Bike,
}

export function getPlaceIcon(iconName: string): LucideIcon {
  return PLACE_ICONS[iconName] ?? MapPin
}

export type PlaceVisual =
  | { type: 'lucide'; Icon: LucideIcon }
  | { type: 'emoji'; emoji: string }

// Places rendered as a cute emoji instead of a Lucide icon (explicit
// exception to the "places are always Lucide" rule).
const PLACE_EMOJIS: Record<string, string> = {
  Playground: '🛝',
}

export function getPlaceVisual(iconName: string): PlaceVisual {
  const emoji = PLACE_EMOJIS[iconName]
  if (emoji) {
    return { type: 'emoji', emoji }
  }
  return { type: 'lucide', Icon: getPlaceIcon(iconName) }
}
