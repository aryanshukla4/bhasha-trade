const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const rupeesPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export function money(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return Number.isInteger(value) ? rupees.format(value) : rupeesPrecise.format(value)
}

export function number(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-IN').format(value)
}

/** The API sends ISO-8601 with a timezone; invalid input degrades to a dash. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function timeOnly(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

/** Sort helper — newest first, tolerant of unparsable dates. */
export function byNewest<T extends { created_at?: string }>(a: T, b: T): number {
  const left = a.created_at ? Date.parse(a.created_at) : 0
  const right = b.created_at ? Date.parse(b.created_at) : 0
  return (Number.isNaN(right) ? 0 : right) - (Number.isNaN(left) ? 0 : left)
}

/** IDs are `prefix_<32 hex>`; show something a human can read out loud. */
export function shortId(id: string): string {
  const tail = id.includes('_') ? id.slice(id.indexOf('_') + 1) : id
  return tail.slice(0, 6).toUpperCase()
}

export function percent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase())
}
