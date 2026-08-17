import { useCallback, useEffect, useState } from 'react'
import { BarterIcon, BellIcon, OrdersIcon } from '../components/icons'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  InfoNote,
  LoadingBlock,
  PageHeader,
  cx,
  useToast,
} from '../components/ui'
import { ApiError, api } from '../lib/api'
import { byNewest, dateTime } from '../lib/format'
import { useT } from '../lib/i18n'
import { readState } from '../lib/readState'
import type { AppNotification } from '../lib/types'

export default function Notifications() {
  const t = useT()
  const toast = useToast()

  const [items, setItems] = useState<AppNotification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(() => readState.all())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMessage, setPushMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await api.notifications()
      setItems([...rows].sort(byNewest))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  function markRead(ids: string[]) {
    // The backend exposes no mark-read endpoint, so this is per-device state.
    readState.markRead(ids)
    setReadIds(readState.all())
  }

  async function enablePush() {
    if (!('Notification' in window)) {
      setPushMessage(t('pushUnsupported'))
      return
    }
    setPushBusy(true)
    try {
      const permission = await window.Notification.requestPermission()
      if (permission !== 'granted') {
        setPushMessage(t('pushBlocked'))
        return
      }
      // No VAPID/service worker in this build, so we register a stable
      // device-scoped endpoint the backend can key subscriptions on.
      let endpoint = localStorage.getItem('bt.pushEndpoint')
      if (!endpoint) {
        endpoint = `local-device:${crypto.randomUUID()}`
        localStorage.setItem('bt.pushEndpoint', endpoint)
      }
      await api.subscribeNotifications(endpoint)
      setPushMessage(t('pushEnabled'))
      toast.success(t('pushEnabled'))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('somethingWrong'))
    } finally {
      setPushBusy(false)
    }
  }

  const unread = items.filter((item) => !item.is_read && !readIds.has(item.id))

  return (
    <div>
      <PageHeader
        title={t('notificationsTitle')}
        subtitle={t('notificationsSubtitle')}
        action={
          <div className="flex gap-2">
            <Button size="sm" loading={pushBusy} onClick={() => void enablePush()}>
              <BellIcon size={14} />
              {t('enablePush')}
            </Button>
            {unread.length > 0 && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => markRead(items.map((item) => item.id))}
              >
                {t('markAllRead')}
              </Button>
            )}
          </div>
        }
      />

      {pushMessage && <InfoNote className="mb-4">{pushMessage}</InfoNote>}
      {error && <ErrorNote message={error} className="mb-4" />}

      {unread.length > 0 && (
        <p className="mb-3 text-sm text-muted">
          {t('unreadCount', { count: unread.length })}
        </p>
      )}

      {loading ? (
        <LoadingBlock label={t('loading')} />
      ) : items.length === 0 ? (
        <EmptyState title={t('noNotifications')} icon={<BellIcon size={24} />} />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isUnread = !item.is_read && !readIds.has(item.id)
            const Icon = item.type === 'barter' ? BarterIcon : OrdersIcon
            return (
              <Card
                key={item.id}
                className={cx('p-4 transition-colors', isUnread && 'border-brand-border bg-brand-soft/40')}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cx(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                      isUnread ? 'bg-brand-soft text-brand' : 'bg-surface text-muted',
                    )}
                  >
                    <Icon size={16} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                      <Badge tone={item.type === 'barter' ? 'blue' : 'neutral'}>
                        {item.type}
                      </Badge>
                      {isUnread && <span className="h-2 w-2 rounded-full bg-brand" />}
                    </div>
                    <p className="text-sm text-muted">{item.body}</p>
                    <p className="mt-1 text-xs text-muted">{dateTime(item.created_at)}</p>
                  </div>

                  {isUnread && (
                    <Button size="sm" variant="ghost" onClick={() => markRead([item.id])}>
                      {t('markAllRead')}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
