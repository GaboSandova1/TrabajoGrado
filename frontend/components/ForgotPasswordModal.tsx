'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AnalyzeLoaderFancy } from '@/components/AnalyzeLoaderFancy'
import { validateEmail } from '@/lib/validation'

interface ForgotPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordModal({
  open,
  onOpenChange,
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [deliveryMode, setDeliveryMode] = useState<'smtp' | 'console'>('smtp')
  const [deliveryWarning, setDeliveryWarning] = useState('')
  const { request, loading, error } = useApi()

  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    const emailError = validateEmail(email)
    if (emailError) {
      setLocalError(emailError)
      return
    }
    try {
      const data = await request('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
      })
      setDeliveryMode(data?.delivery === 'console' ? 'console' : 'smtp')
      setDeliveryWarning(data?.warning || '')
      setSubmitted(true)
      setEmail('')
      setTimeout(() => {
        onOpenChange(false)
        setSubmitted(false)
      }, 3000)
    } catch {
      // Error is already handled by useApi state.
    }
  }

  const displayError = localError || error

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>
            Ingresa tu correo y te enviaremos un enlace para cambiar tu contraseña
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <p className="text-foreground font-medium">
              Revisa tu correo y haz clic en el botón para cambiar tu contraseña
            </p>
            {deliveryMode === 'console' && (
              <p className="mt-2 text-sm text-muted-foreground">
                Modo desarrollo activo: el correo se imprime en la terminal del backend.
              </p>
            )}
            {deliveryWarning && (
              <p className="mt-2 text-xs text-muted-foreground">{deliveryWarning}</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {displayError && (
              <p className="text-sm text-destructive">{displayError}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-linear-to-r from-amber-500 to-red-500 text-white hover:from-amber-400 hover:to-red-400"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </Button>
            {loading && (
              <div className="flex justify-center pt-2">
                <AnalyzeLoaderFancy />
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
