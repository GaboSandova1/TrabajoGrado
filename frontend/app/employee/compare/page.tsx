'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AnalyzeLoaderFancy } from '@/components/AnalyzeLoaderFancy'

interface ProductComparison {
  product1: {
    name: string
    rating: number
    price: string
    pros: string[]
    cons: string[]
    imageUrl?: string
  }
  product2: {
    name: string
    rating: number
    price: string
    pros: string[]
    cons: string[]
    imageUrl?: string
  }
  recommendation: string
  bestChoice: string
}

export default function ComparePage() {
  const [product1Url, setProduct1Url] = useState('')
  const [product2Url, setProduct2Url] = useState('')
  const [result, setResult] = useState<ProductComparison | null>(null)
  const [error, setError] = useState('')
  const { request, loading } = useApi()

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!product1Url.trim() || !product2Url.trim()) {
      setError('Por favor ingresa ambas URLs de productos')
      return
    }

    if (product1Url.trim() === product2Url.trim()) {
      setError('Por favor ingresa URLs de productos diferentes')
      return
    }

    try {
      const data = await request('/api/products/compare', {
        method: 'POST',
        body: {
          product_url_1: product1Url.trim(),
          product_url_2: product2Url.trim(),
          review_count: 10,
        },
        timeoutMs: 300000,
      })
      setResult(data)
      setProduct1Url('')
      setProduct2Url('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo comparar los productos.')
    }
  }

  return (
    <div className={`p-8 ${result ? '' : 'min-h-screen flex items-center'}`}>
      <div className="max-w-6xl mx-auto w-full">
        {loading && !result && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <AnalyzeLoaderFancy />
          </div>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Comparar Productos</CardTitle>
            <CardDescription>
              Ingresa dos URLs de productos de Amazon para analizarlos y compararlos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCompare} className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                <div className="flex-1">
                  <Input
                    type="url"
                    placeholder="URL Producto 1"
                    value={product1Url}
                    onChange={(e) => setProduct1Url(e.target.value)}
                    disabled={loading}
                    className="h-12 text-base"
                  />
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-lg text-foreground border border-border shadow">
                    VS
                  </div>
                </div>
                <div className="flex-1">
                  <Input
                    type="url"
                    placeholder="URL Producto 2"
                    value={product2Url}
                    onChange={(e) => setProduct2Url(e.target.value)}
                    disabled={loading}
                    className="h-12 text-base"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center">
                <Button
                  type="submit"
                  className="px-12 py-3 bg-linear-to-r from-amber-500 to-amber-500 text-white hover:from-amber-400 hover:to-amber-400 text-lg font-semibold rounded-md shadow"
                  disabled={loading}
                >
                  {loading ? 'Comparando...' : 'Comparar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {result && (
          <>
            <Card className="mb-8 border-primary bg-primary/5">
              <CardHeader>
                <CardTitle>Nuestra recomendación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-lg font-semibold text-foreground">
                  Recomendamos: <span className="text-primary">{result.bestChoice}</span>
                </div>
                <p className="text-foreground/80">{result.recommendation}</p>
              </CardContent>
            </Card>

            <div className="w-full bg-card/80 rounded-xl shadow flex flex-col md:flex-row gap-8 p-6">
              {[result.product1, result.product2].map((product, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-4">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-32 h-32 rounded-lg mb-2 object-cover border border-border"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-muted rounded-lg mb-2" />
                  )}
                  <div className="w-full">
                    <h3 className="text-lg font-bold text-foreground mb-2 text-center">{product.name}</h3>
                    <div className="flex flex-col gap-1 items-center mb-2">
                      <span className="text-sm text-muted-foreground">Precio</span>
                      <span className="font-semibold text-foreground">{product.price || 'N/D'}</span>
                    </div>
                    <div className="flex flex-col gap-1 items-center mb-2">
                      <span className="text-sm text-muted-foreground">Valoración</span>
                      <span className="font-semibold text-primary">
                        {typeof product.rating === 'number'
                          ? `${product.rating.toFixed(1)}/5`
                          : 'N/D'}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="text-sm text-muted-foreground">Características</span>
                      <ul className="mt-1 space-y-1 text-foreground/80">
                        {product.pros.map((pro, idx) => (
                          <li key={`pro-${idx}`} className="flex gap-2 items-center">
                            <span className="text-primary font-bold">+</span>
                            <span>{pro}</span>
                          </li>
                        ))}
                        {product.cons.map((con, idx) => (
                          <li key={`con-${idx}`} className="flex gap-2 items-center">
                            <span className="text-destructive font-bold">-</span>
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
