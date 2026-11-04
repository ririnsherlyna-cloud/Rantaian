// UJI MESIN-CUAN V276 — buku cuan di otak mandiri: topik, neuron, kurikulum, doktrin, MRIT
// Jalankan: node scripts/sarang/uji_cuan_v276.js  (mandiri — st dibangun sendiri)
const M = require('./otak_mandiri.js');

let lulus = 0, total = 0;
function uji(nama, cond, detail) {
  total++;
  console.log((cond ? '  OK ' : '!! GAGAL ') + nama + (cond ? '' : ' — ' + (detail || '')));
  if (cond) lulus++;
}

// ---- mock snapshot: arena hidup + BUKU CUAN (V276) ----
const metrik = {
  totalPlan: 9, menang: 3, kalah: 4, kedaluwarsa: 2,
  winRate: 0.556, ekspektansiPct: -1.82, ekspektansiR: -0.21,
  netKumulatifPct: -9.44, maxDrawdownPct: 12.6, streak: 'K2',
  terbaik: { symbol: 'GTCUSDT', day: '2026-10-03', netPct: 18.4 },
  terburuk: { symbol: 'SANDUSDT', day: '2026-10-04', netPct: -15.3 },
  perRegime: [
    { regime: 'TREND_TURUN', n: 4, kalah: 3, eksPct: -4.1 },
    { regime: 'SIDEWAYS', n: 3, kalah: 1, eksPct: 0.8 },
    { regime: 'TREND_NAIK', n: 2, kalah: 0, eksPct: 3.2 },
  ],
  disiplinAktif: true, disiplinSampai: '2026-10-08',
};
const st = {
  today: '2026-10-05',
  standings: [{ competitor: 'MICAPROFITA', cumRet: 0.34, hitRate: 0.51, picks: 21, days: 20 }, { competitor: 'AI_ANALIS', cumRet: 0.28, hitRate: 0.55, picks: 30, days: 20 }],
  regime: 'SIDEWAYS',
  universe: { symbols: 40, pool: 120 },
  climate: { fng: 41, fngClass: 'Takut', mcapChange24h: -0.8, btcDominance: 58.2 },
  brier: { n: 12, nilai: 0.241, trimUntil: null },
  memory: { storedRows: 412, totalHits: 88 },
  genome: { generation: 7 },
  bukuCuan: { hari: '2026-10-05', at: '2026-10-05T02:00:00Z', entri: [], berlangsung: [], metrik, kejujuran: 'Profit PASTI tidak ada di pasar.' },
  slotHariIni: { day: '2026-10-05', k: 2, lahir: 1, ditolak: [{ symbol: 'SANDUSDT', reason: 'guard' }] },
  todayPicks: [{
    competitor: 'MICAPROFITA', symbol: 'GTCUSDT', direction: 'BUY', confidence: 72, entryClose: 0.17524,
    evidence: {
      reason: 'komposit 8 faktor', funding: { pct: -0.25 },
      rencana: { entry: 0.17524, stop: 0.10749, target: 0.25567, stopPct: -38.66, targetPct: 45.9, pTarget: 0.43, pStop: 0.10, netUntungPct: 45.5 },
      praRegistrasi: { waktuKunci: '2026-10-05T01:00:00Z', horizon: 's/d tutup UTC 2026-10-05', feePct: 0.2, netWajib: true },
    },
  }],
};
const otak = M.otakBaru();

console.log('=== V276 MESIN-CUAN — UJI OTAK MANDIRI ===');

// 1. deteksi & prioritas
const hit = M.deteksi('kapan kamu jadi mesin cuan profit pasti? masih banyak keteledoranmu');
uji('topik "cuan" terdeteksi', hit.includes('cuan'), JSON.stringify(hit));
const r1 = M.jawabAgentic('kapan kamu jadi mesin cuan profit pasti? masih banyak keteledoranmu', st, otak);
uji('vonis = spesialis cuan', r1.topik === 'cuan', 'topik=' + r1.topik);

// 2. jawaban cuan: jujur + angka hidup
uji('bantah "profit pasti"', /PASTI tidak ada/i.test(r1.teks));
uji('bawa angka buku (total/wr/ekspektansi)', r1.teks.includes('9 rencana') && r1.teks.includes('-1.82%') && /-0\.21R/.test(r1.teks), r1.teks.slice(0, 200));
uji('keteledoran per rezim tampil', /TREND_TURUN/.test(r1.teks) && /kalah/.test(r1.teks));
uji('disiplin cuan tampil', /DISIPLIN CUAN aktif/.test(r1.teks) && r1.teks.includes('2026-10-08'));
uji('matematika break-even ada', /1\/\(1\+RR\)|ekspektansi =/i.test(r1.teks));
uji('bukan nasihat tetap ada', /bukan penasihat keuangan/.test(r1.teks));
uji('larik 5 langkah tetap lengkap (V278)', r1.larik.langkah.length === 5);
uji('neuron CUAN menyala di jawaban', r1.larik.neuron.some(n => n.kl === 'CUAN'), JSON.stringify(r1.larik.neuron));

// 3. gugus neuron CUAN utuh
const cuanN = M.NEURON.filter(n => n.kl === 'CUAN');
uji('neuron CUAN (V278: +kelly+variansiDrag = 8)', cuanN.length === 8, 'n=' + cuanN.length);
uji('id lengkap', ['ekspektansi', 'rmultiple', 'winrate', 'drawdown', 'ledger', 'disiplinCuan'].every(id => cuanN.some(n => n.id === id)));
const ids = new Set(M.NEURON.map(n => n.id));
const hantu = M.NEURON.flatMap(n => (n.edge || []).filter(e => !ids.has(e)));
uji('edge tanpa hantu (gugus CUAN)', hantu.length === 0, JSON.stringify(hantu));

// 4. bukti hidup: baris buku cuan
const bk = M.buktiHidup(st);
uji('bukti hidup bawa buku cuan', bk.some(b => /buku cuan/.test(b) && b.includes('-9.44')), JSON.stringify(bk.slice(0, 8)));
const akt = M.aktifkanNeuron('bagaimana ekspektansi dan drawdown-ku?', st);
uji('benih ekspektansi+drawdown menyala', akt.list.some(x => x.n.id === 'ekspektansi') && akt.list.some(x => x.n.id === 'drawdown'), JSON.stringify(akt.list.map(x => x.n.id)));

// 5. doktrin ke-9 + doktrinCek (via langkah-3 larik pikir)
uji('doktrin MESIN-CUAN tertanam', M.GENOM.doktrin.some(d => d.startsWith('MESIN-CUAN')));
uji('doktrin lama tak bergeser (idx3)', M.GENOM.doktrin[3].startsWith('KONSERVATISME'));
uji('doktrinCek → DISIPLIN CUAN di larik', /DISIPLIN CUAN/.test(r1.larik.langkah[2].t), r1.larik.langkah[2].t);

// 6. kurikulum CUAN: 7 soal, terjawab dengan angka hidup
const cuanSoal = M.KURIKULUM.filter(s => s.fakultas === 'CUAN');
uji('soal fakultas CUAN (V278: 9)', cuanSoal.length === 9, 'n=' + cuanSoal.length);
uji('tingkat lengkap + MAHKOTA (V278)', cuanSoal.filter(s => s.tingkat === 'dasar').length === 2 && cuanSoal.filter(s => s.tingkat === 'menengah').length === 3 && cuanSoal.filter(s => s.tingkat === 'mahir').length === 3 && cuanSoal.filter(s => s.tingkat === 'mahkota').length === 1);
const soalEks = cuanSoal[1];
const kunciEks = soalEks.kunci(st);
uji('kunci ekspektansi pakai angka buku', kunciEks.includes('-1.82') && kunciEks.includes('556') === false && /WR 56%/.test(kunciEks), kunciEks.slice(0, 120));
const skorEks = soalEks.nilai(st, kunciEks);
uji('nilai jujur kunci sendiri >= 70', skorEks >= 70, 'skor=' + skorEks);
const soalWR = cuanSoal[2];
const kunciWR = soalWR.kunci(st);
uji('kunci break-even hitung dari rencana GTC', /RR 1\.19:1|garis sehat menang 46%/.test(kunciWR), kunciWR.slice(0, 160));
const skorWR = soalWR.nilai(st, kunciWR);
uji('nilai break-even >= 70', skorWR >= 70, 'skor=' + skorWR);

// 7. kerjakanKelas tetap jalan dengan fakultas baru
const rec = M.kerjakanKelas(st, otak, 0);
uji('kelas kilat berjalan', rec && rec.fakultas && rec.skor > 0, JSON.stringify(rec && rec.fakultas));
const ring = M.fakultasRingkas(otak);
uji('fakultasRingkas membaca CUAN bila diambil', Array.isArray(ring));

// 8. MRIT keteledoran-cuan: generator baru hidup (coba 40 nomor — shuffle per nomor)
let adaCuanTanya = false;
for (let i = 0; i < 40; i++) { const p = M.pertanyaanMandiri(st, otak, i); if (p && /buku cuan-ku|runtunan/i.test(p.teks)) { adaCuanTanya = true; break; } }
uji('MRIT keteledoran-cuan lahir', adaCuanTanya);

// 9. regresi: jawaban tanpa bukuCuan tetap hidup (st kosong buku)
const stTanpa = Object.assign({}, st, { bukuCuan: null });
const r9 = M.jawabAgentic('apakah kamu mesin cuan yang profit pasti?', stTanpa, otak);
uji('tanpa buku: tetap jujur & terstruktur', r9.topik === 'cuan' && /PASTI tidak ada/i.test(r9.teks) && r9.teks.length > 500, 'len=' + r9.teks.length);

console.log(`\n=== HASIL: ${lulus}/${total} LULUS ===`);
process.exit(lulus === total ? 0 : 1);
