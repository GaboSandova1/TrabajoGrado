'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/contexts/AuthContext'
import { AnalyzeLoaderFancy } from '@/components/AnalyzeLoaderFancy'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { validateTaskForm } from '@/lib/validation'

interface UserOption {
  id: string
  username: string
  email: string
}

interface TaskItem {
  id: string
  title: string
  description: string
  status: string
  due_date: string | null
  created_at: string
  updated_at: string
  assigned_to: UserOption
  created_by: UserOption | null
}

export default function ManagerTasksPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { request } = useApi()
  const [users, setUsers] = useState<UserOption[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [viewTask, setViewTask] = useState<TaskItem | null>(null)
  const [editTask, setEditTask] = useState<TaskItem | null>(null)
  const [deleteTask, setDeleteTask] = useState<TaskItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAssignedTo, setEditAssignedTo] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const pageSize = 5
  const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize))
  const pagedTasks = tasks.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const formatDate = (value: string | null) => {
    if (!value) return '-'
    const parts = value.split('-')
    if (parts.length !== 3) return value
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  useEffect(() => {
    if (!authLoading && user?.role !== 'manager') {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [usersData, tasksData] = await Promise.all([
        request('/api/users'),
        request('/api/tasks'),
      ])
      setUsers(usersData)
      setTasks(tasksData)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Error al cargar las tareas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    fetchData()
  }, [authLoading])

  useEffect(() => {
    setCurrentPage(1)
  }, [tasks.length])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    const formError = validateTaskForm(title, assignedTo, description, dueDate)
    if (formError) {
      setCreateError(formError)
      return
    }

    try {
      await request('/api/tasks', {
        method: 'POST',
        body: {
          title,
          description,
          assigned_to: assignedTo,
          due_date: dueDate || null,
        },
      })
      setTitle('')
      setDescription('')
      setAssignedTo('')
      setDueDate('')
      setShowCreateTask(false)
      fetchData()
    } catch (err: any) {
      setCreateError(err.message || 'No se pudo crear la tarea')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await request(`/api/tasks/${taskId}/delete`, { method: 'DELETE' })
      setDeleteTask(null)
      fetchData()
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar la tarea')
    }
  }

  const openViewTask = (task: TaskItem) => {
    setViewTask(task)
  }

  const openEditTask = (task: TaskItem) => {
    setEditTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description || '')
    setEditAssignedTo(task.assigned_to?.id || '')
    setEditDueDate(task.due_date || '')
  }

  const openDeleteTask = (task: TaskItem) => {
    setDeleteTask(task)
  }

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTask) return

    const formError = validateTaskForm(
      editTitle,
      editAssignedTo,
      editDescription,
      editDueDate
    )
    if (formError) {
      setError(formError)
      return
    }

    try {
      await request(`/api/tasks/${editTask.id}`, {
        method: 'PATCH',
        body: {
          title: editTitle,
          description: editDescription,
          assigned_to: editAssignedTo,
          due_date: editDueDate || null,
        },
      })
      setEditTask(null)
      fetchData()
    } catch (err: any) {
      setError(err.message || 'No se pudo actualizar la tarea')
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
          <div className="text-center">
            <p className="text-red-500">No tienes permiso para acceder a esta página</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-7">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-foreground mb-2">Tareas</h1>
            <p className="text-muted-foreground">Asigna tareas a los empleados</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
              {error}
            </div>
          )}

          <div className="mb-6 flex items-center justify-end">
            <Button
              type="button"
              className="bg-linear-to-r from-amber-500 to-amber-500 text-white"
              onClick={() => {
                setCreateError(null)
                setShowCreateTask(true)
              }}
            >
              <Plus size={18} className="mr-2" />
              Crear nueva tarea
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Tareas asignadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground w-160">Título</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Empleado</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground w-30">Estado</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground w-36">Fecha límite</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                          No hay tareas creadas aún
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
                          <td className="py-3 px-4 text-muted-foreground">
                            {task.assigned_to.username}
                          </td>
                          <td className="py-3 px-4 w-24">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                task.status === 'pending'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : task.status === 'in_progress'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-green-500/20 text-green-400'
                              }`}
                            >
                              {task.status === 'pending' && 'Pendiente'}
                              {task.status === 'in_progress' && 'En progreso'}
                              {task.status === 'done' && 'Finalizada'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground w-36">
                            {formatDate(task.due_date)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openViewTask(task)}
                                title="Ver tarea"
                              >
                                <Eye size={16} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditTask(task)}
                                title="Editar tarea"
                              >
                                <Pencil size={16} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openDeleteTask(task)}
                                disabled={task.created_by?.id !== user?.id}
                                title={
                                  task.created_by?.id === user?.id
                                    ? 'Eliminar tarea'
                                    : 'Solo puedes eliminar tus tareas'
                                }
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
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
                  <p className="text-xs text-muted-foreground">Empleado</p>
                  <p className="text-foreground">{viewTask.assigned_to?.username}</p>
                </div>
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
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
      <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            {createError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-500">
                {createError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Analizar producto X y buscar proveedor más barato"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-25 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                placeholder="Detalles de la tarea"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Asignar a</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground"
                >
                  <option value="">Selecciona un usuario</option>
                  {users
                    .filter((u) => u.role === 'employee' && u.is_active)
                    .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Fecha límite</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateError(null)
                  setShowCreateTask(false)
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-linear-to-r from-amber-500 to-amber-500 text-white">
                Crear tarea
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editTask} onOpenChange={(open) => (!open ? setEditTask(null) : null)}>
        {editTask && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar tarea</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Título</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Descripción</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full min-h-25 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Asignar a</label>
                  <select
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground"
                  >
                    <option value="">Selecciona un usuario</option>
                    {users
                      .filter((u) => u.role === 'employee' && u.is_active)
                      .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Fecha límite</label>
                  <Input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditTask(null)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-linear-to-r from-amber-500 to-amber-500 text-white">
                  Guardar cambios
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
      <Dialog open={!!deleteTask} onOpenChange={(open) => (!open ? setDeleteTask(null) : null)}>
        {deleteTask && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar tarea</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              ¿Estas seguro de que quieres borrar la tarea "{deleteTask.title}"? Esta accion no se puede deshacer.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteTask(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-red-500 text-white hover:bg-red-400"
                onClick={() => handleDeleteTask(deleteTask.id)}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
