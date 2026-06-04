'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface User {
  id: string
  username: string
  email: string
  role: 'employee' | 'manager'
  profilePicture?: string
  firstName?: string
  lastName?: string
  cedula?: string
  phone?: string
  isActive?: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<User | null>
  logout: () => Promise<void>
  refreshUser: () => Promise<User | null>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

const fetchWithTimeout = async (input: RequestInfo, init: RequestInit = {}, timeoutMs = 8000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (token) {
          const response = await fetchWithTimeout(
            `${API_BASE}/api/auth/me`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          )
          if (response.ok) {
            const userData = await response.json()
            setUser(userData)
          } else {
            localStorage.removeItem('authToken')
            document.cookie = 'authToken=; path=/; max-age=0'
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('authToken')
        document.cookie = 'authToken=; path=/; max-age=0'
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `${API_BASE}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        }
      )

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data = await response.json()
      localStorage.setItem('authToken', data.token)
      document.cookie = `authToken=${data.token}; path=/; samesite=lax`
      if (data.user) {
        setUser(data.user)
        return data.user
      }

      const meResponse = await fetchWithTimeout(
        `${API_BASE}/api/auth/me`,
        {
          headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!meResponse.ok) {
        localStorage.removeItem('authToken')
        document.cookie = 'authToken=; path=/; max-age=0'
        throw new Error('Login failed')
      }

      const userData = await meResponse.json()
      setUser(userData)
      return userData
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async () => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      setUser(null)
      return null
    }
    const response = await fetchWithTimeout(
      `${API_BASE}/api/auth/me`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )
    if (!response.ok) {
      localStorage.removeItem('authToken')
      document.cookie = 'authToken=; path=/; max-age=0'
      setUser(null)
      return null
    }
    const userData = await response.json()
    setUser(userData)
    return userData
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        await fetch(
          `${API_BASE}/api/auth/logout`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )
      }
      localStorage.removeItem('authToken')
      document.cookie = 'authToken=; path=/; max-age=0'
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
