'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { ThemeToggleFancy } from '@/components/ThemeToggleFancy'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Calendar, Folder, BarChart2, LogOut, Search, ListOrdered, Bell } from 'lucide-react'

export function Sidebar() {
  const { user, logout } = useAuth()
  const { request } = useApi()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // TRUCO: Guardar las coordenadas exactas donde el usuario hace clic
  const lastClick = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setMounted(true)
    // Escuchamos los clics en toda la pantalla
    const handleMouseDown = (e: MouseEvent) => {
      lastClick.current = { x: e.clientX, y: e.clientY }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const fetchUnread = useCallback(async () => {
    if (!user) return
    try {
      const data = await request('/api/notifications/unread-count')
      setUnreadCount(Number(data?.count || 0))
    } catch {
      setUnreadCount(0)
    }
  }, [user, request])

  useEffect(() => {
    if (!user) return
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    const handleNotificationsUpdated = () => {
      fetchUnread()
    }
    window.addEventListener('notifications-updated', handleNotificationsUpdated)
    return () => {
      clearInterval(interval)
      window.removeEventListener('notifications-updated', handleNotificationsUpdated)
    }
  }, [user, fetchUnread])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  // Interceptamos el cambio de tu ThemeToggleFancy aquí
  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? 'light' : 'dark'
    const { x, y } = lastClick.current

    // Fallback de seguridad por si es Safari/Firefox viejo
    if (!document.startViewTransition) {
      setTheme(newTheme)
      return
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const transition = document.startViewTransition(() => {
      setTheme(newTheme) // Le avisa a Next.js
      
      // Forzamos el DOM manual para que la captura sea instantánea
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
        document.documentElement.style.colorScheme = 'dark'
      } else {
        document.documentElement.classList.remove('dark')
        document.documentElement.style.colorScheme = 'light'
      }
    })

    transition.ready.then(() => {
      // 
      // LA CORRECCIÓN CLAVE ESTÁ AQUÍ:
      //
      // 1. Siempre ejecutamos una animación de expansión (de 0px a radio final)
      // 2. Siempre aplicamos la animación al pseudoElemento 'new'
      
      document.documentElement.animate(
        [
          { clipPath: `circle(0px at ${x}px ${y}px)` },
          { clipPath: `circle(${endRadius}px at ${x}px ${y}px)` }
        ],
        {
          duration: 500, // Medio segundo de suavidad
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)', // <-- SIEMPRE TARGETEAMOS EL NUEVO ELEMENTO
        }
      )
    })
  }

  if (!user) return null

  const isManager = user.role === 'manager'

  type SidebarLink = {
    href: string;
    label: string;
    icon: React.ElementType;
    disabled?: boolean;
    badge?: number;
  };

  const managerLinks: SidebarLink[] = [
    { href: '/manager/dashboard', label: 'Panel', icon: LayoutDashboard },
    { href: '/manager/users', label: 'Usuarios', icon: Users },
    { href: '/manager/history', label: 'Historial', icon: Calendar },
    { href: '/manager/tasks', label: 'Tareas', icon: Folder },
    { href: '/manager/notifications', label: 'Notificaciones', icon: Bell, badge: unreadCount },
  ];
  const employeeLinks: SidebarLink[] = [
    { href: '/employee/profile', label: 'Mi perfil', icon: Users },
    { href: '/employee/analyze', label: 'Analizar', icon: Search },
    { href: '/employee/compare', label: 'Comparar', icon: ListOrdered },
    { href: '/employee/tasks', label: 'Mis tareas', icon: Folder },
    { href: '/employee/notifications', label: 'Notificaciones', icon: Bell, badge: unreadCount },
  ];
  const links = isManager ? managerLinks : employeeLinks
  const isLightMode = mounted && theme === 'light'

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border min-h-screen flex flex-col">

      <div className="p-6 border-b border-sidebar-border flex flex-col items-center">
        <img
          src="/areaMedic-removebg.svg"
          alt="Logo AreaMedic"
          className="w-20 h-20 mb-2 rounded-full object-contain bg-white shadow"
        />
        <p className="text-base font-semibold text-sidebar-foreground mt-1">
          {user.firstName || user.username}
        </p>
        <p className="text-xs text-sidebar-foreground/60 mt-1 break-all">
          {user.email}
        </p>
      </div>

      <nav className="flex-1 p-6">
        <ul className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <li key={link.href + link.label}>
                <Link
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold'
                      : 'hover:bg-sidebar-accent',
                    link.disabled && 'opacity-50 pointer-events-none'
                  )}
                  tabIndex={link.disabled ? -1 : 0}
                  aria-disabled={link.disabled}
                >
                  {Icon && <Icon size={20} className="shrink-0" />}
                  <span className="flex-1">{link.label}</span>
                  {link.badge && link.badge > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {link.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-6 border-t border-sidebar-border">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-sidebar-foreground/60">
            Tema: {isLightMode ? 'Claro' : 'Oscuro'}
          </span>
          {mounted ? (
            <ThemeToggleFancy
              checked={isLightMode}
              onCheckedChange={handleThemeChange}
              label=""
            />
          ) : (
            <div className="h-8 w-12 rounded-md border border-sidebar-border" />
          )}
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center gap-2"
        >
          <LogOut size={18} className="shrink-0" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}