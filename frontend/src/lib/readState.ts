/**
 * Client-side read tracking for notifications.
 *
 * The backend has an `is_read` column but exposes no endpoint to set it, so
 * "read" is a local, per-device concept. We store the ids the user has seen
 * and treat a notification as unread when it is absent from that set (or when
 * the server ever does start reporting is_read = true).
 */

const KEY = 'bt.readNotifications'

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set()
  } catch {
    return new Set()
  }
}

function save(ids: Set<string>) {
  try {
    // Cap the stored set so it can't grow without bound on a long-lived device.
    const trimmed = Array.from(ids).slice(-500)
    localStorage.setItem(KEY, JSON.stringify(trimmed))
  } catch {
    // Storage full or unavailable — read state is a nicety, not critical.
  }
}

export const readState = {
  all: load,

  isRead(id: string, serverFlag = false): boolean {
    return serverFlag || load().has(id)
  },

  markRead(ids: string[]) {
    const current = load()
    for (const id of ids) current.add(id)
    save(current)
  },

  countUnread(items: Array<{ id: string; is_read: boolean }>): number {
    const read = load()
    return items.filter((item) => !item.is_read && !read.has(item.id)).length
  },
}
