'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/Sidebar'
import { AnalyzeLoaderFancy } from '@/components/AnalyzeLoaderFancy'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export default function CreateUserPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { request } = useApi()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    Cedula: '',
    photo: null as File | null,
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (authLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <AnalyzeLoaderFancy />
        </div>
      </div>
    )
  }

  if (!authLoading && user?.role !== 'manager') {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'Cedula') {
      // Solo permitir dígitos positivos
      const numericValue = value.replace(/\D/g, '')
      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({
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

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

    // Validaciones básicas
    if (!formData.username || !formData.email || !formData.email) {
      setError('Todos los campos son requeridos')
      return
    }

    try {
      setLoading(true)
      const data = new FormData()
      data.append('username', formData.username)
      data.append('email', formData.email)
      if (formData.firstName) data.append('first_name', formData.firstName)
      if (formData.lastName) data.append('last_name', formData.lastName)
      if (formData.photo) data.append('photo', formData.photo)
      if (formData.Cedula) data.append('cedula', formData.Cedula)

      // Generar y agregar la contraseña aleatoria
      const randomPassword = generateRandomPassword(8)
      data.append('password', randomPassword)

      const token = localStorage.getItem('authToken')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: data,
        }
      )

        if (!response.ok) {
          // Manejo de error
          const errorData = await response.json()
          setError(errorData.detail || 'Error creando usuario')
          throw new Error(errorData.detail || 'Error creando usuario')
        }

        setSuccess(true)
        setTimeout(() => {
          router.push('/manager/users')
        }, 1500)
    } catch (err: any) {
        setError(err.message || 'Error creando usuario')
        console.error('Error creating user:', err)
      } finally {
        setLoading(false)
      }
    }



  return (
    <div className="flex h-screen bg-background relative">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]">
          <div className="px-6 py-10 w-full">
            {/* ...existing code... */}
            <Card className="bg-card/80 border-border backdrop-blur max-w-5xl mx-auto">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10">
                  {/* ...existing code... */}
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        Nuevo empleado
                      </p>
                      <h1 className="text-3xl font-semibold text-foreground mt-2">
                        Crear cuenta
                      </h1>
                      <p className="text-muted-foreground mt-2">
                        Para mantenerte conectado con el sistema, completa los datos básicos.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-foreground">
                        Foto de perfil
                      </label>
                      <label
                        htmlFor="photo"
                        className="group relative flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-muted-foreground"
                      >
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Tocar para subir
                          </div>
                        )}
                      </label>
                      <input
                        id="photo"
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoChange}
                        accept="image/*"
                        hidden
                      />
                    </div>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-6">
                     {error && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm">
                        Usuario creado exitosamente. Redirigiendo...
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className="block text-sm font-medium text-foreground">
                          Nombre
                        </label>
                        <Input
                          id="firstName"
                          name="firstName"
                          type="text"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          placeholder="Juan"
                          className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="lastName" className="block text-sm font-medium text-foreground">
                          Apellido
                        </label>
                        <Input
                          id="lastName"
                          name="lastName"
                          type="text"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          placeholder="Perez"
                          className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="username" className="block text-sm font-medium text-foreground">
                        Nombre de usuario
                      </label>
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="juan.perez"
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-medium text-foreground">
                        Correo electrónico
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="juan@example.com"
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-linear-to-r from-amber-500 to-amber-500 text-white hover:from-amber-400 hover:to-amber-400"
                      >
                        {loading ? 'Creando...' : 'Crear cuenta'}
                      </Button>
                      <Link href="/manager/users" className="sm:self-center">
                        <Button variant="outline" className="w-full">
                          Cancelar
                        </Button>
                      </Link>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Loader Overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <AnalyzeLoaderFancy />
          </div>
        )}
      </main>
    </div>
  )
}
