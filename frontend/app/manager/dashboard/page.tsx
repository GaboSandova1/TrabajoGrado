'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/contexts/AuthContext'
import { AnalyzeLoaderFancy } from '@/components/AnalyzeLoaderFancy'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface DashboardStats {
  total_products_analyzed: number
  active_users: number
  inactive_users: number
  total_users: number
  time_series?: { date: string; count: number }[]
}

export default function ManagerDashboard() {
  const { theme } = useTheme();
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { request } = useApi()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [daysRange, setDaysRange] = useState('30')
  const [analysisSeries, setAnalysisSeries] = useState<{ name: string; value: number }[]>([])
  const [filteredProducts, setFilteredProducts] = useState<number | null>(null)

  useEffect(() => {
    if (!authLoading && user?.role !== 'manager') {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const buildSeries = (response: DashboardStats) => {
    if (response.time_series && response.time_series.length > 0) {
      return response.time_series.map((item) => ({
        name: item.date,
        value: item.count,
      }))
    }
    return [{ name: 'Análisis', value: response.total_products_analyzed || 0 }]
  }

  useEffect(() => {
    if (authLoading) return

    const fetchDashboardStats = async () => {
      try {
        setChartLoading(true)
        if (!stats) setLoading(true)
        const response = await request(`/api/dashboard/stats?days=${daysRange}`)
        setStats(response)
        setFilteredProducts(response.total_products_analyzed ?? 0)
        setAnalysisSeries(buildSeries(response))
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Error al cargar el panel')
        console.error('Error fetching dashboard stats:', err)
      } finally {
        setLoading(false)
        setChartLoading(false)
      }
    }

    fetchDashboardStats()
  }, [authLoading, daysRange, request])

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

  const chartData = [
    {
      name: 'Usuarios activos',
      value: stats?.active_users || 0,
    },
    {
      name: 'Usuarios inactivos',
      value: stats?.inactive_users || 0,
    },
  ]

  const barChartData = analysisSeries.length
    ? analysisSeries
    : [
        {
          name: 'Análisis',
          value: stats?.total_products_analyzed || 0,
        },
      ]

  const COLORS = ['#3b82f6', '#ef4444']

  // Definir colores de ejes y ticks según el tema
  const axisColor = theme === 'light' ? '#222' : 'rgba(255,255,255,0.5)';
  const gridColor = theme === 'light' ? '#bdbdbd' : 'rgba(255,255,255,0.1)';
  const tooltipBg = theme === 'light' ? '#222' : '#1f2937';
  const tooltipBorder = theme === 'light' ? '#d1d5db' : '#374151';
  const formatChartDate = (value: string | number) => {
    if (typeof value !== 'string') return value
    const parts = value.split('-')
    if (parts.length !== 3) return value
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }
  const formatChartTick = (value: string | number) => {
    if (typeof value !== 'string') return value
    const parts = value.split('-')
    if (parts.length !== 3) return value
    const [, month, day] = parts
    return `${day}/${month}`
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Panel</h1>
            <p className="text-muted-foreground">Información general del sistema</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Productos analizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {(filteredProducts ?? stats?.total_products_analyzed) || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total en el sistema</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de usuarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats?.total_users || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Empleados registrados</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Usuarios activos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {stats?.active_users || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Trabajando ahora</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Usuarios inactivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {stats?.inactive_users || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Vacaciones o despedidos</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
            {/* <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Distribución de Usuarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartLoading && (
                  <div className="mb-3 flex justify-center">
                    <AnalyzeLoaderFancy />
                  </div>
                )}
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card> */}

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Total de análisis
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Días</span>
                  <select
                    value={daysRange}
                    onChange={(e) => setDaysRange(e.target.value)}
                    className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
                  >
                    <option value="7">7</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="60">60</option>
                    <option value="90">90</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {chartLoading && (
                  <div className="mb-3 flex justify-center">
                    <AnalyzeLoaderFancy />
                  </div>
                )}
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart key={daysRange} data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="name"
                      stroke={axisColor}
                      tick={{ fill: axisColor }}
                      tickFormatter={formatChartTick}
                    />
                    <YAxis stroke={axisColor} tick={{ fill: axisColor }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}
                      itemStyle={{ color: '#22c55e' }}
                      labelStyle={{ color: theme === 'light' ? '#fff' : '#fff' }}
                      labelFormatter={(value: string | number) => formatChartDate(value)}
                    />
                    <Bar dataKey="value" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
