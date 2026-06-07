'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchUnreadNotificationCount } from '@/lib/apiClient'

const DEFAULT_INTERVAL_MS = 5000

export function useNotificationPolling(enabled = true, intervalMs = DEFAULT_INTERVAL_MS) {
  const [unreadCount, setUnreadCount] = useState(0)
  const lastCountRef = useRef(0)

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await fetchUnreadNotificationCount()
      setUnreadCount(count)

      if (count !== lastCountRef.current) {
        lastCountRef.current = count
        window.dispatchEvent(new Event('notifications-updated'))
      }
      return count
    } catch {
      return lastCountRef.current
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    refreshUnreadCount()
    const interval = setInterval(refreshUnreadCount, intervalMs)

    const handleManualRefresh = () => {
      refreshUnreadCount()
    }
    window.addEventListener('notifications-updated', handleManualRefresh)

    return () => {
      clearInterval(interval)
      window.removeEventListener('notifications-updated', handleManualRefresh)
    }
  }, [enabled, intervalMs, refreshUnreadCount])

  return { unreadCount, refreshUnreadCount }
}

export function useNotificationsList<T>(
  fetcher: () => Promise<T>,
  enabled = true,
  intervalMs = DEFAULT_INTERVAL_MS
) {
  const [items, setItems] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await fetcherRef.current()
      setItems(data)
      setError(null)
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Error al cargar las notificaciones')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    load(false)
    const interval = setInterval(() => load(true), intervalMs)

    const handleRefresh = () => load(true)
    window.addEventListener('notifications-updated', handleRefresh)

    return () => {
      clearInterval(interval)
      window.removeEventListener('notifications-updated', handleRefresh)
    }
  }, [enabled, intervalMs, load])

  return { items, loading, error, reload: () => load(false) }
}
