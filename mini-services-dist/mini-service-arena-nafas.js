// ============================================================
// MICAPROFITA ARENA AGI — JANTUNG HIDUP (mini-service platform)
// Tugas: membuat arena AGI terus HIDUP dan BERKEMBANG di wadah:
//   - Setiap 15 menit: GET /api/arena  → hari baru teradili,
//     pick hari berjalan lahir otomatis, genome berevolusi,
//     memori tumbuh — tanpa perlu pemilik membuka link dulu.
//   - Ringan: 1 request HTTP lokal per denyut; gagal = coba lagi
//     denyut berikutnya (tanpa crash, tanpa spam).
// Otomatis jalan saat wadah menyala (mini-services-start.sh).
// ============================================================
const http = require("http");
const fs = require("fs");

const PORT = 3000;
const LOG = "/home/z/my-project/scripts/arena-nafas.log";
const MENIT = 15;

function log(pesan) {
  const baris = `[${new Date().toISOString()}] ${pesan}`;
  try {
    fs.appendFileSync(LOG, baris + "\n");
  } catch (e) {
    /* log tidak boleh membunuh jantung */
  }
  console.log(baris);
}

function denyut() {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port: PORT, path: "/api/arena", timeout: 120000 },
      (res) => {
        let n = 0;
        res.on("data", () => {
          n++;
          if (n > 50) req.destroy(); // cukup: tidak perlu seluruh body
        });
        res.on("end", () => resolve(`HTTP ${res.statusCode} (arena berdenyut, body ${n} blok)`));
        res.on("error", () => resolve(`HTTP ${res.statusCode} (aliran terputus)`));
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve("timeout (arena sibuk — coba denyut berikutnya)");
    });
    req.on("error", (e) => resolve(`gagal: ${e.message}`));
  });
}

async function detak(ke) {
  const t0 = Date.now();
  const hasil = await denyut();
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  log(`denyut #${ke}: ${hasil} dalam ${dt}s`);
}

let ke = 0;
log("jantung arena AGI menyala — denyut pertama sekarang, lalu tiap " + MENIT + " menit");

(async function napas() {
  ke++;
  await detak(ke);
  setInterval(async () => {
    ke++;
    await detak(ke);
  }, MENIT * 60 * 1000);
})();
