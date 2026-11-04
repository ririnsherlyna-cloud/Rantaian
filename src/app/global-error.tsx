'use client'

// PENJAGA TERTINGGI — error boundary paling luar.
// Walau layout utama roboh sekalipun, halaman ini PASTI tampil
// (tidak bergantung CSS global), dengan jalan pulih sendiri.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070d08',
          color: '#d1fae5',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            border: '1px solid #14532d',
            borderRadius: 16,
            background: 'rgba(6, 40, 20, 0.5)',
            padding: '40px 32px',
            maxWidth: 420,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#6ee7b7', margin: '0 0 8px' }}>
            Sistem menahan benturan
          </h1>
          <p style={{ fontSize: 14, opacity: 0.8, margin: '0 0 20px' }}>
            Ada kejadian tak terduga, tapi penjaganya aktif. Tekan tombol di bawah untuk
            bangkit kembali.
          </p>
          {error?.digest ? (
            <p style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.4, margin: '0 0 20px' }}>
              kode: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 22px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Bangkitkan Ulang
          </button>
        </div>
      </body>
    </html>
  )
}
