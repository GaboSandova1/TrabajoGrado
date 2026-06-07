import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute requiredRole="manager">
      <div className="flex h-screen">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}
