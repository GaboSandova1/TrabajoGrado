'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/contexts/AuthContext'
import { useNotificationsList } from '@/hooks/useNotificationPolling'
import { apiFetch } from '@/lib/apiClient'
import { AnalyzeLoaderFancy } from '@/components/AnalyzeLoaderFancy'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface NotificationItem {
  id: string
  kind: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  task: { id: string; title: string } | null
}

export default function ManagerNotificationsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { request } = useApi()
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 4

  const { items: notifications, loading, error, reload } = useNotificationsList<NotificationItem[]>(
    () => apiFetch('/api/notifications'),
    !authLoading && user?.role === 'manager'
  )

  const unreadNotifications = (notifications ?? []).filter((item) => !item.is_read)
  const totalPages = Math.max(1, Math.ceil(unreadNotifications.length / pageSize))
  const pagedNotifications = unreadNotifications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  useEffect(() => {
    if (!authLoading && user?.role !== 'manager') {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    setCurrentPage(1)
  }, [unreadNotifications.length])

  const handleMarkAllRead = async () => {
    try {
      await request('/api/notifications/read-all', { method: 'PATCH' })
      reload()
      window.dispatchEvent(new Event('notifications-updated'))
    } catch (err: unknown) {
      console.error(err)
    }
  }

  const handleMarkRead = async (notificationId: string) => {
    try {
      await request(`/api/notifications/${notificationId}/read`, { method: 'PATCH' })
      reload()
      window.dispatchEvent(new Event('notifications-updated'))
    } catch (err: unknown) {
      console.error(err)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <AnalyzeLoaderFancy />
        </div>
      </div>
    )
  }

  if (user?.role !== 'manager') {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-500">No tienes permiso para acceder a esta página</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Notificaciones</h1>
          <p className="text-muted-foreground">Eventos recientes de tareas</p>
        </div>
        <Button variant="outline" onClick={handleMarkAllRead}>
          Marcar todo como leído
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          {unreadNotifications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No tienes notificaciones
            </div>
          ) : (
            <div className="space-y-3">
              {pagedNotifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-4 ${item.is_read ? 'border-border' : 'border-amber-500/40 bg-amber-500/10'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      {item.message && (
                        <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
                      )}
                    </div>
                    {!item.is_read && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkRead(item.id)}>
                        Marcar como leído
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {unreadNotifications.length > pageSize && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </main>
    </div>
  )
}
