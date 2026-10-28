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
