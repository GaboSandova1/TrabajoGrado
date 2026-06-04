'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyzeLoaderFancy } from '@/components/AnalyzeLoaderFancy'
import { Pencil } from 'lucide-react'

interface AnalysisRecord {
  id: string
  productUrl: string
  productName: string
  analyzedAt: string
  reviewCount: number
  rating: number | null
}

interface HistoryRecord extends AnalysisRecord {
  type: 'analysis' | 'comparison'
  productUrl2?: string
  productName2?: string
  rating1?: number | null
  rating2?: number | null
  recommendation?: string
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { request, loading } = useApi()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [historyItems, setHistoryItems] = useState<HistoryRecord[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [ratingRange, setRatingRange] = useState('all')
  const [analysisDate, setAnalysisDate] = useState('')
  const [reviewsMin, setReviewsMin] = useState('')
  const [reviewsMax, setReviewsMax] = useState('')
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editCedula, setEditCedula] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editPhoto, setEditPhoto] = useState<File | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const pageSize = 5

  const apiBase = process.env.NEXT_PUBLIC_API_URL || ''

  const handleViewDetails = (record: AnalysisRecord) => {
    if (!record.productUrl) return
    window.open(record.productUrl, '_blank', 'noopener,noreferrer')
  }

  const openEditProfile = () => {
    if (!user) return
    setEditUsername(user.username || '')
    setEditEmail(user.email || '')
    setEditFirstName(user.firstName || '')
    setEditLastName(user.lastName || '')
    setEditCedula(user.cedula || '')
    setEditPhone(user.phone || '')
    setEditPhoto(null)
    setEditPhotoPreview(user.profilePicture || null)
    setEditError(null)
    setShowEditProfile(true)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditPhoto(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setEditPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError(null)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/

    if (!editUsername.trim() || !nameRegex.test(editUsername.trim())) {
      setEditError('El nombre de usuario solo puede contener letras')
      return
    }
    if (!editFirstName.trim() || !nameRegex.test(editFirstName.trim())) {
      setEditError('El nombre solo puede contener letras')
      return
    }
    if (!editLastName.trim() || !nameRegex.test(editLastName.trim())) {
      setEditError('El apellido solo puede contener letras')
      return
    }
    if (!editEmail.trim() || !emailRegex.test(editEmail.trim())) {
      setEditError('El correo no tiene un formato válido')
      return
    }
    if (editPhone && (!/^\d+$/.test(editPhone) || editPhone.length > 11)) {
      setEditError('El teléfono debe tener solo números y máximo 11 dígitos')
      return
    }
    if (editCedula && (!/^\d+$/.test(editCedula) || editCedula.length < 7 || editCedula.length > 8)) {
      setEditError('La cédula debe tener solo números y entre 7 y 8 dígitos')
      return
    }
    setSavingProfile(true)
    try {
      const token = localStorage.getItem('authToken')
      const formData = new FormData()
      formData.append('username', editUsername)
      formData.append('email', editEmail)
      formData.append('first_name', editFirstName)
      formData.append('last_name', editLastName)
      formData.append('cedula', editCedula)
      formData.append('phone', editPhone)
      if (editPhoto) {
        formData.append('photo', editPhoto)
      }

      const response = await fetch(`${apiBase}/api/profile/me`, {
        method: 'PATCH',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || data.message || 'No se pudo actualizar el perfil')
      }

      await refreshUser()
      setShowEditProfile(false)
    } catch (err: any) {
      setEditError(err.message || 'No se pudo actualizar el perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await request('/api/analysis/history/me')
        setHistoryItems(data.items || [])
      } catch (err) {
        console.error('Error fetching history:', err)
      }
    }

    fetchHistory()
  }, [request])

  const filteredHistory = historyItems.filter((record) => {
    const query = searchTerm.trim().toLowerCase()
    const matchesText =
      !query ||
      record.productName.toLowerCase().includes(query) ||
      record.productUrl.toLowerCase().includes(query) ||
      (record.productName2 || '').toLowerCase().includes(query) ||
      (record.productUrl2 || '').toLowerCase().includes(query)

    if (!matchesText) return false

    if (ratingRange !== 'all') {
      const ratingCandidates = [record.rating, record.rating1, record.rating2].filter(
        (value) => typeof value === 'number'
      ) as number[]
      if (ratingCandidates.length === 0) return false
      const inRange = ratingCandidates.some((value) => {
        if (ratingRange === '0-2') return value >= 0 && value < 2
        if (ratingRange === '2-3') return value >= 2 && value < 3
        if (ratingRange === '3-4') return value >= 3 && value < 4
        if (ratingRange === '4-5') return value >= 4 && value <= 5
        return true
      })
      if (!inRange) return false
    }

    if (analysisDate) {
      const recordDate = new Date(record.analyzedAt)
      const recordDay = recordDate.toLocaleDateString('en-CA')
      if (recordDay !== analysisDate) return false
    }

    if (record.type === 'analysis' && reviewsMin) {
      const minValue = Number(reviewsMin)
      if (!Number.isNaN(minValue) && record.reviewCount < minValue) return false
    }

    if (record.type === 'analysis' && reviewsMax) {
      const maxValue = Number(reviewsMax)
      if (!Number.isNaN(maxValue) && record.reviewCount > maxValue) return false
    }

    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const pagedHistory = filteredHistory.slice(startIndex, startIndex + pageSize)

  if (!user) return null

  return (
    <div className="p-3">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">Mi perfil</h1>
            {/* <p className="text-muted-foreground">Resumen de tu información y del historial de análisis</p> */}
        {/* Profile Section */}
        <Card className="mb-3">
          {/* <CardHeader>
            <CardTitle>My Profile</CardTitle>
          </CardHeader> */}
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6 items-center">
                <div className="flex justify-center md:justify-start">
                {user.profilePicture ? (
                  <div
                    role="button"
                    tabIndex={0}
                    className="relative w-32 h-32 cursor-pointer"
                    onClick={openEditProfile}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openEditProfile()
                      }
                    }}
                    aria-label="Editar perfil"
                  >
                    <Image
                      src={user.profilePicture}
                      alt={user.username}
                      width={128}
                      height={128}
                      className="w-32 h-32 rounded-2xl object-cover border border-border shadow"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openEditProfile}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background/90"
                    >
                      <Pencil size={14} className="mr-2" />
                      Editar perfil
                    </Button>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    className="relative w-32 h-32 rounded-2xl bg-muted flex items-center justify-center border border-border shadow cursor-pointer"
                    onClick={openEditProfile}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openEditProfile()
                      }
                    }}
                    aria-label="Editar perfil"
                  >
                    <span className="text-5xl text-muted-foreground">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openEditProfile}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background/90"
                    >
                      <Pencil size={14} className="mr-2" />
                      Editar perfil
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Usuario</p>
                  <p className="text-lg font-medium text-foreground">
                    {user.username}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="text-lg font-medium text-foreground">
                    {user.firstName || 'No definido'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cédula</p>
                  <p className="text-lg font-medium text-foreground">
                    {user.cedula || 'No definido'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Correo</p>
                  <p className="text-lg font-medium text-foreground">
                    {user.email}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Apellido</p>
                  <p className="text-lg font-medium text-foreground">
                    {user.lastName || 'No definido'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="text-lg font-medium text-foreground">
                    {user.phone || 'No definido'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History Section */}
        <Card>
          <CardHeader className="py-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold text-foreground">Historial</h1>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Input
                  type="text"
                  placeholder="Buscar por nombre o URL"
                  value={searchTerm}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="sm:w-64"
                />
                <select
                  value={ratingRange}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    setRatingRange(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-10 rounded-md border border-border bg-card px-2 text-xs text-foreground"
                >
                  <option value="all">Todos</option>
                  <option value="0-2">0 - 1.9 estrellas</option>
                  <option value="2-3">2 - 2.9 estrellas</option>
                  <option value="3-4">3 - 3.9 estrellas</option>
                  <option value="4-5">4 - 5 estrellas</option>
                </select>
                <Input
                  type="date"
                  value={analysisDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setAnalysisDate(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="sm:w-44"
                />
                <Input
                  type="text"
                  placeholder="Reseñas min"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={reviewsMin}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const nextValue = e.target.value.replace(/\D/g, '')
                    setReviewsMin(nextValue)
                    setCurrentPage(1)
                  }}
                  className="sm:w-36"
                />
                <Input
                  type="text"
                  placeholder="Reseñas max"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={reviewsMax}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const nextValue = e.target.value.replace(/\D/g, '')
                    setReviewsMax(nextValue)
                    setCurrentPage(1)
                  }}
                  className="sm:w-36"
                />
              </div>
            </div>
            {/* <CardTitle>Analysis History</CardTitle> */}
            {/* <CardDescription>
              Products you have analyzed
            </CardDescription> */}
          </CardHeader>
          <CardContent className="pt-0 pb-1">
            {loading && (
              <div className="flex justify-center py-10">
                <AnalyzeLoaderFancy />
              </div>
            )}

            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Tipo</TableHead>
                  <TableHead className="w-48">Producto 1</TableHead>
                  <TableHead className="w-48">Producto 2</TableHead>
                  <TableHead className="w-20">Rating 1</TableHead>
                  <TableHead className="w-20">Rating 2</TableHead>
                  <TableHead className="w-20">Reseñas</TableHead>
                  <TableHead className="w-28">Fecha</TableHead>
                  <TableHead className="w-28">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && pagedHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      No hay resultados para los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                          {record.type === 'comparison' ? 'Comparación' : 'Análisis'}
                        </span>
                      </TableCell>
                      <TableCell
                        className="font-medium"
                        title={record.productName}
                      >
                        <div className="max-w-65 truncate">
                          {record.productName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-65 truncate">
                          {record.productName2 || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.type === 'analysis'
                          ? typeof record.rating === 'number'
                            ? record.rating.toFixed(1)
                            : '-'
                          : typeof record.rating1 === 'number'
                          ? record.rating1.toFixed(1)
                          : 'N/D'}
                      </TableCell>
                      <TableCell>
                        {typeof record.rating2 === 'number' ? record.rating2.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell>{record.reviewCount || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(record.analyzedAt).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell className="w-28">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-linear-to-r from-amber-500 to-amber-500 text-white hover:from-amber-400 hover:to-amber-400 hover:text-white"
                          onClick={() => handleViewDetails(record)}
                        >
                          Ver detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {!loading && filteredHistory.length > pageSize && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>
              Actualiza tu información personal y tu foto de perfil.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProfile} className="space-y-4">
            {editError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-500">
                {editError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 text-center">
                Foto de perfil
              </label>
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  className="relative cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {editPhotoPreview ? (
                    <img
                      src={editPhotoPreview}
                      alt="Preview"
                      className="h-20 w-20 rounded-lg object-cover "
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">
                      Sin foto
                    </div>
                  )}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  hidden
                />
                {/* <span className="text-xs text-muted-foreground">Haz click en la foto para cambiarla</span> */}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Usuario</label>
              <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Correo</label>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nombre</label>
                <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Apellido</label>
                <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cédula</label>
                <Input
                  value={editCedula}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => setEditCedula(e.target.value.replace(/\D/g, ''))}
                  maxLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Teléfono</label>
                <Input
                  value={editPhone}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditProfile(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-linear-to-r from-amber-500 to-amber-500 text-white"
                disabled={savingProfile}
              >
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
