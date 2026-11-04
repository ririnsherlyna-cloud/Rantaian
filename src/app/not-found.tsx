import Link from 'next/link'

// Halaman 404 yang sopan — alamat salah tetap disambut, bukan mati total.

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#070d08] px-6 text-center text-emerald-50">
      <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/40 px-8 py-10 max-w-md shadow-2xl">
        <div className="mb-4 text-4xl">🧭</div>
        <h1 className="mb-2 text-xl font-bold text-emerald-300">Alamat tidak ditemukan</h1>
        <p className="mb-6 text-sm text-emerald-100/80">
          Halaman yang dicari tidak ada atau sudah pindah. Kembali ke arena utama.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
        >
          Kembali ke Arena
        </Link>
      </div>
    </div>
  )
}
