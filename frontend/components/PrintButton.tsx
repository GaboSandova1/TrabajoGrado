'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrintButton() {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="no-print px-8 py-3 bg-linear-to-r from-amber-500 to-amber-500 text-white hover:from-amber-400 hover:to-amber-400 text-base font-semibold shadow"
    >
      <Printer size={18} />
      Imprimir
    </Button>
  )
}
