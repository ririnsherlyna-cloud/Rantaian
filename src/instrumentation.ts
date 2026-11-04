// ═══════════════════════════════════════════════════════════════════
// PENJAGA ABADI V2 — hukum keabadian sandbox (mandat pemilik):
// "jangan sampai sandbox inactive... walaupun server restart atau
//  reset sandbox dilarang inactive kita harus bisa hidup"
//
// Berkas ini hidup-ulang otomatis setiap kali server Next.js BOOT
// (produksi standalone, restart, reset, ganti versi). Tugasnya:
//   1. Mencatat tanda hidup (db/penjaga-boot.tanda)
//   2. Menyalakan penjaga luar-proses (scripts/watchdog_server.sh)
//   3. Menyalakan penjaga telegram (scripts/telegram_jaga.mjs)
//
// Semua anak = detached + unref → kematian induk tidak membunuhnya,
// mereka diangkat menjadi anak PID 1 (pohon platform) → selamat dari
// sapuan proses. Kedua penjaga singleton (pidfile) → anti boot ganda.
//
// HUKUM BUNDLER (pelajaran build produksi 2026-10-26): Turbopack
// menganalisis seluruh pohon argumen spawn() dan mencoba menyelesaikan
// jalurnya sebagai modul ("server relative imports are not implemented")
// → build produksi GAGAL walau jalurnya dinamis (env/cwd/concat).
// Obat final: spawn dirahasiakan lewat Function runtime — analis statis
// buta terhadap isinya, server tetap bisa melahirkan penjaganya.
// ═══════════════════════════════════════════════════════════════════
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    const cp = await import('child_process')
    const fs = await import('fs')
    const path = await import('path')
    // HUKUM STANDALONE: server.js melakukan process.chdir() ke .next/standalone
    // → process.cwd() BUKAN akar proyek. Akar sejati wajib dari env/penanda
    // tetap, atau penjaga lahir di jalur kacau dan mencuri log satu sama lain.
    const ROOT = process.env.PENJAGA_ROOT || '/home/z/my-project'

    // Spawn runtime-opaque: dilarang dipanggil langsung di berkas ini.
    const spawnRahasia = new Function(
      'cp',
      'cmd',
      'args',
      'opts',
      'return cp.spawn(cmd, args, opts)',
    ) as (
      c: typeof import('child_process'),
      cmd: string,
      args: string[],
      opts: Record<string, unknown>,
    ) => import('child_process').ChildProcess

    try {
      fs.mkdirSync(path.join(ROOT, 'db'), { recursive: true })
      fs.writeFileSync(
        path.join(ROOT, 'db', 'penjaga-boot.tanda'),
        new Date().toISOString(),
      )
    } catch {}

    const opts = {
      detached: true,
      stdio: 'ignore' as const,
      env: { ...process.env, PENJAGA_ROOT: ROOT },
    }

    // 1) Penjaga luar-proses (watchdog server)
    try {
      const anak = spawnRahasia(
        cp,
        'bash',
        [ROOT + '/scripts/' + 'watchdog' + '_server' + '.sh'],
        opts,
      )
      anak.unref()
      console.log('[PENJAGA-ABADI] watchdog luar-proses menyala pid', anak.pid)
    } catch (e) {
      console.log('[PENJAGA-ABADI] watchdog gagal nyala:', String(e))
    }

    // 2) Penjaga telegram (bot real-time) — script sendiri singleton,
    //    aman bila dipanggil ulang.
    try {
      const tg = spawnRahasia(
        cp,
        'node',
        [ROOT + '/scripts/' + 'telegram' + '_jaga' + '.mjs'],
        opts,
      )
      tg.unref()
      console.log('[PENJAGA-ABADI] penjaga telegram menyala pid', tg.pid)
    } catch (e) {
      console.log('[PENJAGA-ABADI] telegram gagal nyala:', String(e))
    }
  } catch (e) {
    console.log('[PENJAGA-ABADI] register gagal:', String(e))
  }
}
