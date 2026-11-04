'use client'

// PENJAGA TAMPILAN — error boundary tingkat halaman.
// Kalau ada bagian aplikasi melempar error, pengguna TETAP melihat
// halaman yang rapi + tombol coba lagi, BUKAN layar putih mati.

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // catat ke konsol untuk forensik, jangan pernah diam-diam
    console.error('[PENJAGA] error halaman tertangkap:', error?.message)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#070d08] px-6 text-center text-emerald-50">
      <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 px-8 py-10 max-w-md shadow-2xl">
        <div className="mb-4 text-4xl">🛡️</div>
        <h1 className="mb-2 text-xl font-bold text-emerald-300">Arenanya tetap berdiri</h1>
        <p className="mb-1 text-sm text-emerald-100/80">
          Ada satu bagian yang sempat tersandung, tapi sistemnya menahannya —
          tidak ada data yang hilang.
        </p>
        {error?.digest ? (
          <p className="mb-6 font-mono text-[11px] text-emerald-200/40">kode: {error.digest}</p>
        ) : (
          <div className="mb-6" />
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
          >
            Coba Lagi
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-emerald-800 px-5 py-2.5 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-900/50"
          >
            Muat Ulang Penuh
          </button>
        </div>
      </div>
    </div>
  )
}
