'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/Sidebar'
import { AnalyzeLoaderFancy } from '@/components/AnalyzeLoaderFancy'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface User {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  photo_url?: string
  is_active: boolean
  created_at: string
  role: string
}

export default function UserDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const { user: currentUser, isLoading: authLoading } = useAuth()
  const { request } = useApi()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    photo: null as File | null,
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && currentUser?.role !== 'manager') {
      router.push('/login')
    }
  }, [currentUser, authLoading, router])

  useEffect(() => {
    if (authLoading) return

    const fetchUser = async () => {
      try {
        setLoading(true)
        const response = await request(`/api/users/${userId}`)
        setUser(response)
        setEditData({
          username: response.username,
          email: response.email,
          firstName: response.firstName || '',
          lastName: response.lastName || '',
          photo: null,
        })
        if (response.photo_url) {
          setPhotoPreview(response.photo_url)
        }
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Error al cargar el usuario')
        console.error('Error fetching user:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [authLoading, request, userId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEditData((prev) => ({
        ...prev,
        photo: file,
      }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleToggleActive = async () => {
    if (!user) return

    try {
      setSubmitting(true)
      const response = await request(`/api/users/${userId}/activate`, {
        method: 'PATCH',
        body: {
          is_active: !user.is_active,
        },
      })
      setUser(response)
      setSuccess(`Usuario ${!user.is_active ? 'activado' : 'desactivado'} correctamente`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el estado del usuario')
      console.error('Error toggling user status:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!editData.username || !editData.email) {
      setError('Los campos de usuario y email son requeridos')
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem('authToken')
      const data = new FormData()
      data.append('username', editData.username)
      data.append('email', editData.email)
      if (editData.firstName) {
        data.append('first_name', editData.firstName)
      }
      if (editData.lastName) {
        data.append('last_name', editData.lastName)
      }
      if (editData.photo) {
        data.append('photo', editData.photo)
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: data,
        }
      )

      if (!response.ok) {
        throw new Error('Error al actualizar el usuario')
      }

      const updatedUser = await response.json()
      setUser(updatedUser)
      setEditData({
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        photo: null,
      })
      setIsEditing(false)
      setSuccess('Usuario actualizado correctamente')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el usuario')
      console.error('Error updating user:', err)
    } finally {
      setSubmitting(false)
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

  if (currentUser?.role !== 'manager') {
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

  if (!user) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Usuario no encontrado</p>
            <Link href="/manager/users">
              <Button className="mt-4 bg-linear-to-r from-amber-500 to-amber-500 text-white hover:from-amber-400 hover:to-amber-400">Volver a Usuarios</Button>
            </Link>
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
          <div className="flex items-center gap-4 mb-8">
            <Link href="/manager/users">
              <Button variant="outline">Volver</Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Detalles del Usuario</h1>
              <p className="text-muted-foreground mt-1">{user.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Info Card */}
            <Card className="bg-card border-border lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  {isEditing ? 'Editar Información' : 'Información del Usuario'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm">
                    {success}
                  </div>
                )}

                {isEditing ? (
                  <form onSubmit={handleSaveChanges} className="space-y-6">
                    {/* Photo Upload */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-foreground">
                        Foto de Perfil
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {photoPreview ? (
                            <img
                              src={photoPreview}
                              alt="Preview"
                              className="h-24 w-24 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">
                              Sin foto
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoChange}
                          accept="image/*"
                          hidden
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className='bg-linear-to-r from-amber-500 to-amber-500 text-white hover:from-amber-400 hover:to-amber-400'
                        >
                          Cambiar Foto
                        </Button>
                      </div>
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                      <label htmlFor="username" className="block text-sm font-medium text-foreground">
                        Nombre de Usuario
                      </label>
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        value={editData.username}
                        onChange={handleInputChange}
                        className="bg-input border-border text-foreground"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-medium text-foreground">
                        Correo Electrónico
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={editData.email}
                        onChange={handleInputChange}
                        className="bg-input border-border text-foreground"
                      />
                    </div>

                    {/* First Name */}
                    <div className="space-y-2">
                      <label htmlFor="firstName" className="block text-sm font-medium text-foreground">
                        Nombre
                      </label>
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={editData.firstName}
                        onChange={handleInputChange}
                        className="bg-input border-border text-foreground"
                      />
                    </div>

                    {/* Last Name */}
                    <div className="space-y-2">
                      <label htmlFor="lastName" className="block text-sm font-medium text-foreground">
                        Apellido
                      </label>
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={editData.lastName}
                        onChange={handleInputChange}
                        className="bg-input border-border text-foreground"
                      />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 pt-4">
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="bg-linear-to-r from-amber-500 to-amber-500 text-white hover:from-amber-400 hover:to-amber-400"
                      >
                        {submitting ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancelar
                      </Button>
                    </div>

                    {submitting && (
                      <div className="flex justify-center pt-2">
                        <AnalyzeLoaderFancy />
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="space-y-6">
                    {/* Photo Display */}
                    <div className="flex items-center gap-4">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt={user.username}
                          className="h-24 w-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center text-foreground text-2xl font-semibold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">ID del Usuario</p>
                        <p className="text-foreground font-medium break-all">{user.id}</p>
                      </div>
                    </div>

                    {/* Username */}
                    <div>
                      <p className="text-sm text-muted-foreground">Nombre de Usuario</p>
                      <p className="text-foreground font-medium">{user.username}</p>
                    </div>

                    {/* Email */}
                    <div>
                      <p className="text-sm text-muted-foreground">Correo Electrónico</p>
                      <p className="text-foreground font-medium">{user.email}</p>
                    </div>

                    {/* Full Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Nombre</p>
                        <p className="text-foreground font-medium">
                          {user.firstName || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Apellido</p>
                        <p className="text-foreground font-medium">
                          {user.lastName || '—'}
                        </p>
                      </div>
                    </div>

                    {/* Created At */}
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                      <p className="text-foreground font-medium">
                        {new Date(user.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>

                    {/* Edit Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="w-full bg-linear-to-r from-amber-500 to-amber-500 text-white hover:from-amber-400 hover:to-amber-400"
                    >
                      Editar Información
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Estado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Estado Actual</p>
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-semibold inline-block ${
                      user.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <Button
                  type="button"
                  onClick={handleToggleActive}
                  disabled={submitting}
                  className={user.is_active ? 'bg-red-500 hover:bg-red-500 w-full' : 'bg-green-500 hover:bg-green-600 w-full'}
                >
                  {submitting
                    ? 'Procesando...'
                    : user.is_active
                    ? 'Desactivar Usuario'
                    : 'Activar Usuario'}
                </Button>

                {submitting && (
                  <div className="flex justify-center pt-2">
                    <AnalyzeLoaderFancy />
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    {user.is_active
                      ? 'Desactivar usuario para vacaciones o despidos'
                      : 'Activar usuario nuevamente'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
