'use client'

import { useState } from 'react'
import { PaperDialogProvider } from '@/components/paper-ref'
import { Shell } from '@/components/shell'
import { PustekaUnduh } from '@/components/pusteka-unduh'

export default function Home() {
  const [tampilUnduh, setTampilUnduh] = useState(false)

  return (
    <>
      <PaperDialogProvider>
        <Shell />
      </PaperDialogProvider>

      {tampilUnduh ? (
        <PustekaUnduh onKembali={() => setTampilUnduh(false)} />
      ) : (
        <button
          onClick={() => setTampilUnduh(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/50 transition-colors hover:bg-emerald-500"
          aria-label="Buka halaman unduh file MICAPROFITA"
          title="Unduh semua file task (SAKTI, ZIP, laporan)"
        >
          ⬇ UNDUH FILE
        </button>
      )}
    </>
  )
}
