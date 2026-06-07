const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

type ApiFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  timeoutMs?: number
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
  const url = `${API_BASE}${endpoint}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeoutMs = options.timeoutMs ?? 12000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const detail = errorData.detail
      const message =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item?.msg || JSON.stringify(item)).join(', ')
            : errorData.message || errorData.error
      throw new Error(message || 'La solicitud a la API falló.')
    }

    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const data = await apiFetch<{ count: number }>('/api/notifications/unread-count')
  return Number(data?.count || 0)
}
