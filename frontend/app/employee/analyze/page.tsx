'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AnalyzeLoaderFancy } from '@/components/AnalyzeLoaderFancy'

interface AnalysisResult {
  productName: string
  productUrl: string
  rating: number
  reviewCount: number
  summary: string
  positiveAspects: string[]
  negativeAspects: string[]
  keyInsights: string[]
}

export default function AnalyzePage() {
  const [productUrl, setProductUrl] = useState('')
  const [reviewCount, setReviewCount] = useState('10')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const { request, loading } = useApi()

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!productUrl.trim()) {
      setError('Por favor ingresa una URL de producto de Amazon.')
      return
    }

    try {
      const data = await request('/api/products/analyze', {
        method: 'POST',
        body: {
          product_url: productUrl.trim(),
          review_count: Number(reviewCount),
        },
        timeoutMs: 180000,
      })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo analizar el producto.')
    }
  }

  return (
    <div className={`p-8 ${result ? '' : 'min-h-screen flex items-center'}`}>
      <div className="max-w-4xl mx-auto w-full">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Analizar producto</CardTitle>
            <CardDescription>
              Ingresa una URL de producto de Amazon y elige cuántas reseñas analizar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAnalyze} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  URL del producto
                </label>
                <Input
                  type="url"
                  placeholder="https://www.amazon.com/dp/ASIN"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Cantidad de reseñas
                  </label>
                  <Select value={reviewCount} onValueChange={setReviewCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 reseñas</SelectItem>
                      <SelectItem value="25">25 reseñas</SelectItem>
                      <SelectItem value="50">50 reseñas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    className="w-full bg-linear-to-r from-amber-500 to-amber-500 text-white hover:from-amber-400 hover:to-amber-400"
                    disabled={loading}
                  >
                    {loading ? 'Analizando...' : 'Analizar'}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        {loading && !result && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <AnalyzeLoaderFancy />
          </div>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>{result.productName}</CardTitle>
              <CardDescription>
                Análisis basado en {result.reviewCount} reseñas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="bg-primary/10 rounded-lg p-6">
                <p className="text-sm text-muted-foreground mb-2">Valoración general</p>
                <p className="text-4xl font-bold text-primary">
                  {typeof result.rating === 'number' ? result.rating.toFixed(1) : 'N/D'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">de 5 estrellas</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Resumen</h3>
                <p className="text-foreground/80">{result.summary}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Aspectos positivos</h3>
                <ul className="space-y-2">
                  {result.positiveAspects.map((aspect, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="text-primary font-bold">+</span>
                      <span className="text-foreground/80">{aspect}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Aspectos negativos</h3>
                <ul className="space-y-2">
                  {result.negativeAspects.map((aspect, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="text-destructive font-bold">-</span>
                      <span className="text-foreground/80">{aspect}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {result.keyInsights.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Puntos clave</h3>
                  <ul className="space-y-2">
                    {result.keyInsights.map((insight, idx) => (
                      <li key={idx} className="flex gap-3 p-3 bg-muted rounded-md">
                        <span className="text-accent font-bold">•</span>
                        <span className="text-foreground/80">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
