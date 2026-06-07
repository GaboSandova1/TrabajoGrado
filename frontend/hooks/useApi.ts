import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface UseApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: any
  timeoutMs?: number
}

export function useApi() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiBase = process.env.NEXT_PUBLIC_API_URL || ''

  const request = useCallback(
    async (endpoint: string, options: UseApiOptions = {}) => {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('authToken')
        const url = `${apiBase}${endpoint}`

        const fetchOptions: RequestInit = {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }

        if (token) {
          fetchOptions.headers = {
            ...fetchOptions.headers,
            'Authorization': `Bearer ${token}`,
          }
        }

        if (options.body) {
          fetchOptions.body = JSON.stringify(options.body)
        }

        // Configuración dinámica del AbortController con el timeout que le mandes
        const controller = new AbortController()
        const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 12000
        const timeout = setTimeout(() => controller.abort(), timeoutMs)

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const detail = errorData.detail
          const detailMessage =
            typeof detail === 'string'
              ? detail
              : Array.isArray(detail)
                ? detail.map((item) => item?.msg || JSON.stringify(item)).join(', ')
                : errorData.message || errorData.error
          throw new Error(detailMessage || 'API request failed')
        }

        const data = await response.json()
        return data
      } catch (err) {
        const normalizedError = err instanceof Error ? err : new Error('Ocurrió un error inesperado.')
        const isAbort =
          normalizedError.name === 'AbortError' ||
          normalizedError.message.toLowerCase().includes('signal is aborted')
        const errorMessage = isAbort
          ? 'La solicitud tardó demasiado y fue cancelada.'
          : normalizedError.message
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { request, loading, error }
}