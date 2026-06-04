'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
// import { Sidebar } from '@/components/Sidebar'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/contexts/AuthContext'
import { AnalyzeLoaderFancy } from '@/components/AnalyzeLoaderFancy'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Eye } from 'lucide-react'

interface TaskItem {
  id: string
  title: string
  description: string
  status: string
  due_date: string | null
  created_at: string
  updated_at: string
  created_by: { id: string; username: string; email: string } | null
}

export default function EmployeeTasksPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { request } = useApi()
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewTask, setViewTask] = useState<TaskItem | null>(null)
  const pageSize = 6
  const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize))
  const pagedTasks = tasks.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const formatDate = (value: string | null) => {
    if (!value) return '-'
    const parts = value.split('-')
    if (parts.length !== 3) return value
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  const statusClasses = (status: string) => {
    if (status === 'pending') return 'bg-amber-500/20 text-amber-400'
    if (status === 'in_progress') return 'bg-blue-500/20 text-blue-400'
    return 'bg-green-500/20 text-green-400'
  }

  const statusLabel = (status: string) => {
    if (status === 'pending') return 'Pendiente'
    if (status === 'in_progress') return 'En progreso'
    return 'Finalizada'
  }

  useEffect(() => {
    if (!authLoading && user?.role !== 'employee') {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const data = await request('/api/tasks/me')
      setTasks(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Error cargando tareas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    fetchTasks()
  }, [authLoading])

  useEffect(() => {
    setCurrentPage(1)
  }, [tasks.length])

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await request(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: { status },
      })
      fetchTasks()
    } catch (err: any) {
      setError(err.message || 'No se pudo actualizar la tarea')
    }
  }

  const openViewTask = (task: TaskItem) => {
    setViewTask(task)
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-background">
        {/* <Sidebar /> */}
        <div className="flex-1 flex items-center justify-center">
          <AnalyzeLoaderFancy />
        </div>
      </div>
    )
  }

  if (user?.role !== 'employee') {
    return (
      <div className="flex h-screen bg-background">
        {/* <Sidebar /> */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500">No tienes permiso para acceder a esta página</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* <Sidebar /> */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Mis tareas</h1>
            <p className="text-muted-foreground">Controla las tareas asignadas</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Tareas asignadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground w-180">Título</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground w-36">Estado</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground w-36">Fecha límite</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-muted-foreground">
                          No tienes tareas asignadas
                        </td>
                      </tr>
                    ) : (
                      pagedTasks.map((task) => (
                        <tr key={task.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4 w-xl">
                            <p className="text-foreground font-medium truncate max-w-lg" title={task.title}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p
                                className="text-xs text-muted-foreground mt-1 truncate max-w-lg"
                                title={task.description}
                              >
                                {task.description}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 w-24">
                            <Select
                              value={task.status}
                              onValueChange={(value) => handleStatusChange(task.id, value)}
                            >
                              <SelectTrigger
                                size="sm"
                                className={`h-8 rounded-full border-transparent px-3 text-xs font-semibold ${statusClasses(
                                  task.status
                                )}`}
                              >
                                <SelectValue>{statusLabel(task.status)}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>No iniciado</SelectLabel>
                                  <SelectItem value="pending">
                                    <span
                                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses(
                                        'pending'
                                      )}`}
                                    >
                                      Pendiente
                                    </span>
                                  </SelectItem>
                                </SelectGroup>
                                <SelectSeparator />
                                <SelectGroup>
                                  <SelectLabel>Activo</SelectLabel>
                                  <SelectItem value="in_progress">
                                    <span
                                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses(
                                        'in_progress'
                                      )}`}
                                    >
                                      En progreso
                                    </span>
                                  </SelectItem>
                                </SelectGroup>
                                <SelectSeparator />
                                <SelectGroup>
                                  <SelectLabel>Cerrado</SelectLabel>
                                  <SelectItem value="done">
                                    <span
                                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses(
                                        'done'
                                      )}`}
                                    >
                                      Finalizada
                                    </span>
                                  </SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground w-36">
                            {formatDate(task.due_date)}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openViewTask(task)}
                              title="Ver tarea"
                            >
                              <Eye size={16} />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {tasks.length > pageSize && (
                  <div className="mt-4 flex items-center justify-between">
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
            </CardContent>
          </Card>
        </div>
      </main>
      <Dialog open={!!viewTask} onOpenChange={(open) => (!open ? setViewTask(null) : null)}>
        {viewTask && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalle de la tarea</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Título</p>
                <p className="text-foreground font-medium">{viewTask.title}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Descripción</p>
                <p className="text-foreground">{viewTask.description || '-'}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <p className="text-foreground">
                    {viewTask.status === 'pending' && 'Pendiente'}
                    {viewTask.status === 'in_progress' && 'En progreso'}
                    {viewTask.status === 'done' && 'Finalizada'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha límite</p>
                  <p className="text-foreground">{formatDate(viewTask.due_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Creada por</p>
                  <p className="text-foreground">{viewTask.created_by?.username || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Correo</p>
                  <p className="text-foreground">{viewTask.created_by?.email || '-'}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
