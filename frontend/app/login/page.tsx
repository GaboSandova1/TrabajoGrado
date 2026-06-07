'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { User, Lock, Mail } from 'lucide-react'
import { parseApiError, validateEmail, validateLogin } from '@/lib/validation'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuth()
  
  // Estados para los inputs
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [emailRecover, setEmailRecover] = useState('')
  const [error, setError] = useState('')
  const [recoverMsg, setRecoverMsg] = useState('')
  const [recoverLoading, setRecoverLoading] = useState(false)
  
  // Estado para la animación
  const [isActive, setIsActive] = useState(false)

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const loginError = validateLogin(username, password)
    if (loginError) {
      setError(loginError)
      return
    }

    try {
      const userData = await login(username.trim(), password)
      if (userData?.role === 'manager') {
        router.replace('/manager/dashboard')
      } else if (userData?.role === 'employee') {
        router.replace('/employee/profile')
      } else {
        router.replace('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Usuario o contraseña incorrectos')
    }
  }

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecoverMsg('')
    setError('')

    const email = emailRecover.trim().toLowerCase()
    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }

    setRecoverLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(parseApiError(data))
      }
      setRecoverMsg(data.message || 'Enviamos un enlace de recuperación a tu correo.')
      setEmailRecover('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.')
    } finally {
      setRecoverLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-r from-[#e2e2e2] to-[#c9d6ff] dark:from-slate-900 dark:to-slate-950 font-sans p-4 overflow-hidden transition-colors duration-500">
      
      {/* Contenedor Principal */}
      <div className="relative w-full max-w-212.5 h-[calc(100vh-40px)] md:h-137.5 bg-white dark:bg-slate-800 rounded-[30px] shadow-[0_0_30px_rgba(0,0,0,0.2)] dark:shadow-[0_0_30px_rgba(0,0,0,0.6)] overflow-hidden transition-colors duration-500">
        
        {/* --- FORMULARIOS (Z-INDEX 10) --- */}
        {/* 1. Formulario de Login */}
        <div 
          className={`absolute w-full h-[70%] md:w-1/2 md:h-full bg-white dark:bg-slate-800 flex flex-col justify-center text-center px-8 sm:px-10 z-10 transition-all duration-600 ease-in-out ${
            isActive 
              ? 'bottom-[30%] md:bottom-auto md:top-0 md:right-[50%] opacity-0 pointer-events-none delay-[600ms]' 
              : 'bottom-0 md:bottom-auto md:top-0 md:right-0 opacity-100 pointer-events-auto delay-[1200ms]'
          }`}
        >
          <form onSubmit={handleLoginSubmit} className="w-full">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-6 transition-colors">Iniciar sesión</h1>
            
            {error && !isActive && (
              <div className="text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30 p-2.5 rounded-lg text-sm mb-4 transition-colors">
                {error}
              </div>
            )}

            <div className="relative my-6">
              <input 
                type="text" 
                placeholder="Usuario" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required 
                className="w-full py-3.5 pr-12 pl-5 bg-gray-100 dark:bg-slate-700/50 rounded-lg border-none outline-none text-base text-gray-800 dark:text-white font-medium placeholder-gray-500 dark:placeholder-gray-400 transition-colors focus:ring-2 focus:ring-amber-500/50"
              />
              <User className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            
            <div className="relative my-6">
              <input 
                type="password" 
                placeholder="Contraseña" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required 
                className="w-full py-3.5 pr-12 pl-5 bg-gray-100 dark:bg-slate-700/50 rounded-lg border-none outline-none text-base text-gray-800 dark:text-white font-medium placeholder-gray-500 dark:placeholder-gray-400 transition-colors focus:ring-2 focus:ring-amber-500/50"
              />
              <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 mt-2 bg-linear-to-r from-amber-500 to-amber-500 hover:from-amber-400 hover:to-amber-400 transition-colors rounded-lg shadow-md border-none text-base text-white font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Iniciando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        {/* 2. Formulario de Recuperación (Register) */}
        <div 
          className={`absolute w-full h-[70%] md:w-1/2 md:h-full bg-white dark:bg-slate-800 flex flex-col justify-center text-center px-8 sm:px-10 z-10 transition-all duration-600 ease-in-out ${
            isActive 
              ? 'bottom-0 md:bottom-auto md:top-0 md:right-[50%] opacity-100 pointer-events-auto delay-[1200ms]' 
              : 'bottom-[30%] md:bottom-auto md:top-0 md:right-0 opacity-0 pointer-events-none delay-[600ms]'
          }`}
        >
          <form onSubmit={handleRecoverSubmit} className="w-full">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-6 transition-colors">Recuperar contraseña</h1>
            
            <div className="relative my-6">
              <input 
                type="email" 
                placeholder="Correo electrónico" 
                value={emailRecover}
                onChange={(e) => setEmailRecover(e.target.value)}
                required 
                disabled={recoverLoading}
                className="w-full py-3.5 pr-12 pl-5 bg-gray-100 dark:bg-slate-700/50 rounded-lg border-none outline-none text-base text-gray-800 dark:text-white font-medium placeholder-gray-500 dark:placeholder-gray-400 transition-colors focus:ring-2 focus:ring-amber-500/50"
              />
              <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>

            {error && isActive && (
              <div className="text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30 p-2.5 rounded-lg text-sm mb-4 transition-colors">
                {error}
              </div>
            )}
            {recoverMsg && (
              <div className="text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 p-2.5 rounded-lg text-sm mb-4 transition-colors">
                {recoverMsg}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={recoverLoading}
              className="w-full h-12 mt-2 bg-linear-to-r from-amber-500 to-amber-500 hover:from-amber-400 hover:to-amber-400 transition-colors rounded-lg shadow-md border-none text-base text-white font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {recoverLoading ? 'Enviando...' : 'Enviar correo'}
            </button>
          </form>
        </div>

        {/* --- PANELES DESLIZANTES Y FONDO ANIMADO (Z-INDEX 20) --- */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20">
          
          {/* El círculo de fondo (Blob) usando gradiente ambar-rojo */}
          <div 
            className={`absolute bg-linear-to-r from-amber-500 to-amber-500 pointer-events-auto transition-all duration-1800 ease-in-out ${
              isActive
                ? 'top-[70%] left-0 w-full h-[300%] rounded-[20vw] md:top-auto md:left-[50%] md:w-[300%] md:h-full md:rounded-[150px]'
                : 'top-[-270%] left-0 w-full h-[300%] rounded-[20vw] md:top-auto md:-left-[250%] md:w-[300%] md:h-full md:rounded-[150px]'
            }`} 
          />

          {/* Panel Izquierdo (Muestra opción de Recuperar) */}
          <div 
            className={`absolute w-full h-[30%] md:w-1/2 md:h-full text-white flex flex-col justify-center items-center px-4 text-center transition-all duration-600 ease-in-out pointer-events-auto ${
              isActive 
                ? 'top-[-30%] left-0 md:top-0 md:-left-[50%] delay-[600ms]' 
                : 'top-0 left-0 md:top-0 md:left-0 delay-[1200ms]'
            }`}
          >
            <img
              src="/areaMedic-removebg.svg"
              alt="Logo AreaMedic"
              className="w-30 h-30 mb-4 rounded-full object-contain bg-white shadow"
            />
            <h1 className="text-3xl font-bold mb-4">¡Hola, bienvenido!</h1>
            <p className="mb-6 text-sm md:text-base">¿Olvidaste tu contraseña?</p>
            <button 
              type="button" 
              onClick={() => setIsActive(true)}
              className="w-40 h-11.5 bg-transparent border-2 border-white/80 rounded-lg text-white font-semibold hover:bg-white/20 transition-colors cursor-pointer"
            >
              Recuperar
            </button>
          </div>

          {/* Panel Derecho (Muestra opción de Iniciar Sesión) */}
          <div 
            className={`absolute w-full h-[30%] md:w-1/2 md:h-full text-white flex flex-col justify-center items-center px-4 text-center transition-all duration-600 ease-in-out pointer-events-auto ${
              isActive 
                ? 'bottom-0 right-0 md:bottom-auto md:top-0 md:right-0 delay-[1200ms]' 
                : 'bottom-[-30%] right-0 md:bottom-auto md:top-0 md:-right-[50%] delay-[600ms]'
            }`}
          >
            <img
              src="/areaMedic-removebg.svg"
              alt="Logo AreaMedic"
              className="w-35 h-35 mb-4 rounded-full object-contain bg-white shadow"
            />
            <h1 className="text-3xl font-bold mb-4">¡Bienvenido de nuevo!</h1>
            <p className="mb-6 text-sm md:text-base">Ingresa a tu cuenta para continuar</p>
            <button 
              type="button" 
              onClick={() => setIsActive(false)}
              className="w-40 h-11.5 bg-transparent border-2 border-white/80 rounded-lg text-white font-semibold hover:bg-white/20 transition-colors cursor-pointer"
            >
              Iniciar sesión
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}