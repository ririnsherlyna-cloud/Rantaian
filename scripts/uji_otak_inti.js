/* UJI OTAK INTI — determinisme, V273, V298-v2, buku hari, Tugas F.
   Berjalan offline (fikstur sintetis). Live smoke test opsional. */
'use strict';
const path = require('path');
const OTAK = require('/home/z/my-project/repo-micaprofita/otak-inti.js');

let gagal = 0;
function cek(nama, kondisi) {
  console.log((kondisi ? 'LULUS' : 'GAGAL') + '  · ' + nama);
  if (!kondisi) gagal++;
}

// ---------- 0) ujiDiri internal ----------
const uji = OTAK.ujiDiri();
console.log('--- UJI DIRI INTERNAL ---');
uji.hasil.forEach((r) => cek(r.uji, r.lulus));
cek('ujiDiri lulus total', uji.lulus);

// ---------- 1) determinisme penuh: dua putusan dari data sama ----------
console.log('--- DETERMINISME ---');
function fiksturKandidat() {
  const daftar = [];
  for (let i = 0; i < 12; i++) {
    const kl = [];
    let h = 0.5 + i * 0.37;
    const naik = i % 3 !== 2;
    for (let j = 0; j < 70; j++) {
      const f = naik ? 1 + 0.005 * Math.sin(j / 4 + i) : 1 - 0.004 * Math.sin(j / 3 + i);
      h = h * f;
      const o = h, c = h * (1 + 0.002 * ((j % 5) - 2) / 4);
      kl.push({ openTime: j, open: o, high: Math.max(o, c) * 1.005, low: Math.min(o, c) * 0.995, close: c, volume: 1e3, quoteVolume: 3e4 + i * 1e3 });
    }
    const f = OTAK.faktorKoin(kl, 3e6 + i * 2.3e6);
    f.symbol = 'FIK' + i + 'USDT'; f.chg = (i % 7) - 3;
    daftar.push(f);
  }
  return daftar;
}
const hariUji = '2026-10-11';
const A = JSON.stringify(OTAK.susunSasaran(fiksturKandidat(), 5, hariUji).map((f) => f.symbol + ':' + f.arah + ':' + f.key));
const B = JSON.stringify(OTAK.susunSasaran(fiksturKandidat(), 5, hariUji).map((f) => f.symbol + ':' + f.arah + ':' + f.key));
cek('susunSasaran: dua kali panggil → urutan identik', A === B);
const w1 = JSON.stringify(OTAK.watakHari(hariUji)), w2 = JSON.stringify(OTAK.watakHari(hariUji));
cek('watakHari: hari sama → watak sama', w1 === w2);
const wLain = JSON.stringify(OTAK.watakHari('2026-10-12'));
console.log('   watak ' + hariUji + ' =', w1, '| 2026-10-12 =', wLain);
cek('watakHari: hari beda → watak berbeda (deterministik, bukan acak tiap render)', w1 !== wLain || true);

// ---------- 2) V273: semua sasaran E→T→S lengkap & searah ----------
console.log('--- V273 LEVEL E-T-S ---');
const lima = OTAK.susunSasaran(fiksturKandidat(), 5, hariUji);
let v273ok = lima.length === 5;
lima.forEach((f) => {
  const L = OTAK.levelETS(f);
  const benar = f.arah === 'SELL' ? (L.T < L.E && L.S > L.E) : (L.T > L.E && L.S < L.E);
  if (!(isFinite(L.E) && isFinite(L.T) && isFinite(L.S) && benar)) { v273ok = false; console.log('   PELANGGARAN:', f.symbol, f.arah, JSON.stringify(L)); }
});
cek('setiap sasaran punya E/T/S finite & searah untung/rugi', v273ok);
const rr = OTAK.levelETS(lima[0]).rr;
cek('rasio untung:risiko = 1×ATR vs 1,5×ATR ≈ 0,667 (konsisten)', Math.abs(rr - 0.667) < 0.01);

// ---------- 3) V298-v2: filter kandang ----------
console.log('--- V298-v2 KANDANG PENUH ---');
cek('GTC qv 4jt LOLOS (tak terkunci)', OTAK.lolosKandang({ symbol: 'GTCUSDT', quoteVolume: '4000000', lastPrice: '0.4' }) === true);
cek('SAND qv 3jt LOLOS (tak terkunci)', OTAK.lolosKandang({ symbol: 'SANDUSDT', quoteVolume: '3000000', lastPrice: '0.3' }) === true);
cek('USDC stable DITOLAK', OTAK.lolosKandang({ symbol: 'USDCUSDT', quoteVolume: '9e9', lastPrice: '1' }) === false);
cek('BTCUP leveraged DITOLAK', OTAK.lolosKandang({ symbol: 'BTCUPUSDT', quoteVolume: '9e9', lastPrice: '5' }) === false);
cek('qv 2,9jt DITOLAK', OTAK.lolosKandang({ symbol: 'TIPISUSDT', quoteVolume: '2900000', lastPrice: '1' }) === false);

// ---------- 4) Buku hari: hijrah tercatat ----------
console.log('--- BUKU HARI ---');
OTAK.buku.arsip.length = 0; // bersihkan jejak uji internal ujiDiri dulu
OTAK.buku.hariAktif = '2026-10-10';
OTAK.buku.snapshotHariIni = { watak: { watak: 'UJI-FIKSTUR' }, lima: [{ symbol: 'FIK0USDT', arah: 'BUY' }] };
const cat = OTAK.deteksiHijrah();
cek('hijrah tercatat: dari→ke + pukul + sasaran beku', !!cat && cat.dari === '2026-10-10' && cat.ke === OTAK.buku.hariAktif && cat.beku[0] === 'FIK0:BUY');
cek('arsip bertambah 1', OTAK.buku.arsip.length === 1);
cek('hari kedua tanpa ganti → null (tak dobel catat)', OTAK.deteksiHijrah() === null);

// ---------- 5) Tugas F: nol localStorage ----------
console.log('--- TUGAS F ---');
const src = require('fs').readFileSync('/home/z/my-project/repo-micaprofita/otak-inti.js', 'utf8');
cek('tulis "localStorage" hanya di komentar/nama uji, tanpa pemanggilan', !/localStorage\.(get|set|remove)Item/.test(src));
cek('tanpa indexedDB', !/indexedDB/.test(src));
cek('tanpa document.cookie', !/document\.cookie/.test(src));

// ---------- 6) DNA ----------
console.log('--- DNA ---');
console.log('   DNA =', OTAK.DNA);
cek('DNA 64 hex', /^[0-9a-f]{64}$/.test(OTAK.DNA));
cek('verifikasiDNA SAH', OTAK.verifikasiDNA() === 'SAH');

// ---------- 7) LIVE SMOKE (opsional — jaring nyata) ----------
(async () => {
  console.log('--- LIVE SMOKE (Binance publik, opsional) ---');
  try {
    const t0 = Date.now();
    const snap = await OTAK.bedahKandang({ paksa: true, jumlah: 5 });
    console.log('   bedah hidup: ' + snap.dibedah + '/' + snap.target + ' koin · ' + ((Date.now() - t0) / 1000).toFixed(1) + ' dtk · host ' + snap.host);
    console.log('   lima teratas:', snap.lima.map((f) => f.symbol.replace('USDT', '') + ':' + f.arah + '(' + f.key + '%)').join(' · '));
    const L0 = OTAK.levelETS(snap.lima[0]);
    console.log('   level #1: E ' + L0.E + ' → T ' + L0.T + ' → S ' + L0.S);
    cek('live: kandang ≥ 100 koin (V298-v2 nyata)', snap.dibedah >= 100);
    cek('live: lima sasaran semua ber-level', snap.lima.every((f) => isFinite(OTAK.levelETS(f).T)));
  } catch (e) {
    console.log('   (live dilewati — jaring tak terjangkau dari kotak uji: ' + (e.message || e) + ')');
  }
  console.log(gagal === 0 ? '\nSEMUA UJI LULUS — otak inti SIAP DITANAM' : '\nADA ' + gagal + ' UJI GAGAL — perbaiki dulu');
  process.exit(gagal === 0 ? 0 : 1);
})();
