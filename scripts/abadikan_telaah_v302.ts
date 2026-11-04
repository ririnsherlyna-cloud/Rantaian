// ============================================================
// TELAAH TRAGEDI 12–14 OKT — diabadikan ke ingatan arena (server-side,
// tahan restart; localStorage tetap 0). Idempoten via meta v302TelaahDay.
// ============================================================
import { PrismaClient } from '@prisma/client'
import { lessonFingerprint } from '../src/lib/cyborg/brain'
import { remember } from '../src/lib/cyborg/memory'

const db = new PrismaClient()

const TELAAH = [
  'TELAAH TRAGEDI 12–14 OKT (V302) — AKAR 1, JERA-HILANG: MAGIC rugi −21% (10-10) tetap dipilih ulang 10-12 (conf 78%) dan rugi lagi −13,4%; STRK menang +11,36% (10-11) dipilih ulang 10-12 lalu crash −30,9%. Pagar kini: JERA-KALAH melarang simbol rugi ≤3 hari terakhir; ANTI-KEJAR-PUMP melarang simbol yang kemarin naik ≥10% dari pick kami.',
  'TELAAH TRAGEDI 12–14 OKT (V302) — AKAR 2, EUPORIA-EVOLUSI: setelah dua hari menang (RLC +15,5%, STRK +11,4%), keyakinan melonjak ke 77–78% tepat sebelum pasar berbalik. Pagar kini: K-DARURAT — kalah ≥3 beruntun → K=1 + lantai keyakinan 62%; kalah ≥5 → lantai 68% + gerbang akhir sesudah trim vonis/kejut-pump.',
  'TELAAH TRAGEDI 12–14 OKT (V302) — AKAR 3, RENCANA CACAT: WAL lahir stop −36,69% & sasaran +0,45% (net 0,05% = sisa fee); MAGIC 10-10 stop −48,41%. Pagar kini: RENCANA-CACAT menolak stop di luar [2,5..9]%, sasaran net <0,5%, RR <0,8; rencana cacat disembuhkan dari data pra-kunci atau pick ditarik (GERBANG-RENCANA-SEHAT).',
  'TELAAH TRAGEDI 12–14 OKT (V302) — AKAR 4, BUG INGATAN CUAN: buku hanya menyimpan 60 entri terakhir dari 111 → resolusi lama dianggap baru tiap denyut → event CUAN dobel/tripel (232 dobel dihapus). Pagar kini: ingatan kunci penuh (bukuCuanKeys) + kunci sinkron anti dobel-run di ensureArena.',
  'TELAAH TRAGEDI 12–14 OKT (V302) — KEJUJURAN ANGKA: 5 pick, 5 kalah (STRK −30,9% & MAGIC −13,4% & OP −11,1% & APT −2,4% & XAUT −0,3% arah close-to-close; di buku cuan diikat stop: −9,4%/R −1 tiga kali, −0,73%, −2,81%). Runtunan K5 aktif → hari 15 Okt adalah HARI ISTIRAHAT JUJUR (WAL 61% < lantai 68% ditarik). Tidak ada profit pasti; yang ada disiplin yang dijaga.',
]

async function main() {
  const today = new Date().toISOString().slice(0, 10)
  const sudah = await db.meta.findUnique({ where: { key: 'v302TelaahDay' } })
  if (sudah?.value === today) { console.log('telaah sudah diabadikan hari ini — lewati'); return }

  for (const t of TELAAH) {
    await db.arenaEvent.create({ data: { day: today, kind: 'SISTEM', text: t } })
  }
  // PELAJARAN simbol-untuk-12..14 yang tak pernah punya pelajaran (kedaluwarsa)
  const pelajaran: { sym: string; day: string; net: number; note: string }[] = [
    { sym: 'XAUTUSDT', day: '2026-10-13', net: -0.73, note: 'XAUT (emas token) dipilih utk horizon 1 hari tanpa sasaran layak — koin rendah-volatilitas hanya menggerus fee. Pelajaran: aset tanpa ekskursi ≥1,5% tidak layak horison-1-hari.' },
    { sym: 'APTUSDT', day: '2026-10-14', net: -2.81, note: 'APT keluar close −2,81% — entri biasa di hari medan menolak (K4). Pelajaran: saat runtunan kalah panjang, standar naik, bukan frekuensi.' },
    { sym: 'STRKUSDT', day: '2026-10-12', net: -9.4, note: 'STRK dipilih ulang sehari setelah menang +11,36% → crash −30,9% arah close. Pelajaran: menang besar kemarin BUKAN alasan masuk lagi hari ini — itu kejar-top.' },
    { sym: 'MAGICUSDT', day: '2026-10-12', net: -9.4, note: 'MAGIC dipilih ulang 2 hari setelah rugi −21% dengan conf 78% → rugi lagi. Pelajaran: dendam pada koin yang melukai bukan strategi — jeda 3 hari wajib.' },
  ]
  for (const p of pelajaran) {
    await remember('PELAJARAN', lessonFingerprint(`V302|${p.sym}|${p.day}`),
      { n: 1, sumRet: 0, hitCount: 0, note: `V302 TELAAH: ${p.note}`, regime: 'SIDEWAYS' }, p.day)
  }
  await db.meta.upsert({ where: { key: 'v302TelaahDay' }, update: { value: today }, create: { key: 'v302TelaahDay', value: today } })
  console.log(`telaah abadi: ${TELAAH.length} event SISTEM + ${pelajaran.length} PELAJARAN ditulis (day ${today})`)
}
main().finally(() => db.$disconnect())
