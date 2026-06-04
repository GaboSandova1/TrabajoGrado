'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/contexts/AuthContext'
import { AnalyzeLoaderFancy } from '@/components/AnalyzeLoaderFancy'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface UserInfo {
  id: string | null
  username: string
  email: string
}

interface AnalysisRecord {
  id: string
  productUrl: string
  productName: string
  reviewCount: number
  analyzedAt: string
  rating: number | null
  type: 'analysis' | 'comparison'
  productName2?: string
  productUrl2?: string
  rating1?: number | null
  rating2?: number | null
  recommendation?: string
  user: UserInfo
}

export default function ManagerHistoryPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { request, loading } = useApi()
  const [historyItems, setHistoryItems] = useState<AnalysisRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 7

  useEffect(() => {
    if (!authLoading && user?.role !== 'manager') {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (authLoading) return

    const fetchHistory = async () => {
      try {
        const data = await request('/api/analysis/history')
        setHistoryItems(data.items || [])
      } catch (err) {
        console.error('Error fetching history:', err)
      }
    }

    fetchHistory()
  }, [authLoading, request])

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
            <p className="text-red-500">No tienes permiso para acceder a este panel</p>
          </div>
        </div>
      </div>
    )
  }

  const filteredItems = historyItems.filter((record) => {
    const query = searchTerm.trim().toLowerCase()
    const matchesText =
      !query ||
      record.productName.toLowerCase().includes(query) ||
      record.productUrl.toLowerCase().includes(query) ||
      (record.productName2 || '').toLowerCase().includes(query) ||
      (record.productUrl2 || '').toLowerCase().includes(query)

    if (!matchesText) return false

    if (typeFilter !== 'all' && record.type !== typeFilter) return false

    if (dateFilter) {
      const recordDay = new Date(record.analyzedAt).toLocaleDateString('en-CA')
      if (recordDay !== dateFilter) return false
    }

    if (userFilter) {
      const userText = `${record.user?.username || ''} ${record.user?.email || ''}`
        .trim()
        .toLowerCase()
      if (!userText.includes(userFilter.trim().toLowerCase())) return false
    }

    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const pagedItems = filteredItems.slice(startIndex, startIndex + pageSize)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Historial global</h1>
            <p className="text-muted-foreground">
              Seguimiento de análisis y comparaciones realizados por los empleados
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Historial de actividad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Input
                  type="text"
                  placeholder="Buscar por producto o URL"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="sm:w-64"
                />
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-10 rounded-md border border-border bg-card px-2 text-xs text-foreground"
                >
                  <option value="all">Todos</option>
                  <option value="analysis">Análisis</option>
                  <option value="comparison">Comparación</option>
                </select>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="sm:w-44"
                />
                <Input
                  type="text"
                  placeholder="Filtrar por empleado o correo"
                  value={userFilter}
                  onChange={(e) => {
                    setUserFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="sm:w-56"
                />
              </div>
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Tipo</TableHead>
                    <TableHead className="w-48">Producto 1</TableHead>
                    <TableHead className="w-48">Producto 2</TableHead>
                    <TableHead className="w-20">Rating 1</TableHead>
                    <TableHead className="w-20">Rating 2</TableHead>
                    <TableHead className="w-20">Reseñas</TableHead>
                    <TableHead className="w-32">Empleado</TableHead>
                    <TableHead className="w-36">Correo</TableHead>
                    <TableHead className="w-28">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-muted-foreground">
                        No hay actividad registrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedItems.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                            {record.type === 'comparison' ? 'Comparación' : 'Análisis'}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium" title={record.productName}>
                          <div className="max-w-65 truncate">
                            {record.productName || 'Producto 1'}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium" title={record.productName2}>
                          <div className="max-w-65 truncate">
                            {record.productName2 || 'Producto 2'}
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
                          {typeof record.rating2 === 'number' ? record.rating2.toFixed(1) : 'N/D'}
                        </TableCell>
                        <TableCell>{record.reviewCount || '-'}</TableCell>
                        <TableCell>{record.user?.username || 'Admin'}</TableCell>
                        <TableCell className="text-muted-foreground" title={record.user?.email}>
                          <div className="max-w-36 truncate">
                            {record.user?.email || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(record.analyzedAt).toLocaleDateString('es-ES')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {filteredItems.length > pageSize && (
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
      </main>
    </div>
  )
}
