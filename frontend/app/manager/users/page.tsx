'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/Sidebar'
import { AnalyzeLoaderFancy } from '@/components/AnalyzeLoaderFancy'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  username: string
  email: string
  photo_url?: string
  is_active: boolean
  created_at: string
  role: string
}

export default function UsersPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { request } = useApi()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  useEffect(() => {
    if (!authLoading && user?.role !== 'manager') {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (authLoading) return

    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await request('/api/users')
        setUsers(response)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Error al cargar los usuarios')
        console.error('Error fetching users:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [authLoading, request])

  useEffect(() => {
    setCurrentPage(1)
  }, [users.length])

  const visibleUsers = users.filter((u) => u.role !== 'manager')
  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / pageSize))
  const pagedUsers = visibleUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Usuarios</h1>
              <p className="text-muted-foreground">Gestiona los empleados del sistema</p>
            </div>
            <Link href="/manager/users/create">
              <Button className="bg-linear-to-r from-amber-500 to-amber-500 text-white hover:from-amber-400 hover:to-amber-400">
                Nuevo usuario
              </Button>
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
              {error}
            </div>
          )}

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Lista de usuarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Foto</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Usuario</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Correo</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Estado</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                          No hay usuarios creados aún
                        </td>
                      </tr>
                    ) : (
                      pagedUsers.map((u) => (
                        <tr key={u.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4">
                            {u.photo_url ? (
                              <img
                                src={u.photo_url}
                                alt={u.username}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-foreground">
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-foreground font-medium">{u.username}</td>
                          <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                u.is_active
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {u.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/manager/users/${u.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-linear-to-r from-amber-500 to-amber-500 text-white hover:from-amber-400 hover:to-amber-400 hover:text-white"
                              >
                                Ver detalles
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {visibleUsers.length > pageSize && (
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
    </div>
  )
}
