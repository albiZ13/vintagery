import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    Abbigliamento: '👗', Accessori: '👜', Vinili: '🎵', Libri: '📚',
    Mobili: '🪑', Gioielli: '💍', Ceramiche: '🏺', 'Oggetti da cucina': '🍳',
    Arte: '🖼️', Giocattoli: '🎲', Fotografia: '📷', 'Elettronica vintage': '📻',
    Borse: '👝', Scarpe: '👠',
  }
  return map[category] ?? '🛍️'
}

const AVATAR_COLORS = ['#8B4513','#C9913A','#6B7280','#059669','#7C3AED','#DC2626','#2563EB']

export function avatarColor(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export function getFrequencyLabel(freq: string | null): string {
  const map: Record<string, string> = {
    settimanale: 'Ogni settimana', mensile: 'Ogni mese',
    occasionale: 'Occasionale', annuale: 'Annuale',
  }
  return freq ? (map[freq] ?? freq) : 'Da definire'
}
