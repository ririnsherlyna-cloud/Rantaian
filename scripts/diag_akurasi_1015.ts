// DIAGNOSA AKURASI — kenapa makin lama makin berkurang?
// Bedah DB: hit-rate per hari, streak kalah, distribusi keyakinan vs hasil, rezim.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const days = await db.battleDay.findMany({
    orderBy: { day: "asc" },
    include: { picks: true },
  });
  console.log("TOTAL HARI:", days.length);
  const mic = days.flatMap((d) => d.picks.filter((p) => p.competitor === "MICAPROFITA"));
  console.log("TOTAL PICK MICAPROFITA:", mic.length);

  // 1. Hit-rate per hari (kronologis) + streak kalah
  console.log("\n=== KRONOLOGIS PER HARI (MICAPROFITA) ===");
  let streakKalah = 0, maxStreak = 0, streakNol = 0;
  for (const d of days) {
    const mp = d.picks.filter((p) => p.competitor === "MICAPROFITA");
    if (mp.length === 0) { console.log(`${d.day}  (tanpa pick MICAPROFITA) status=${d.status}`); streakNol++; continue; }
    const scored = mp.filter((p) => p.ret !== null);
    if (scored.length === 0) { console.log(`${d.day}  PENDING status=${d.status} n=${mp.length} simbol=${mp.map(p=>p.symbol).join(",")}`); continue; }
    const hit = scored.filter((p) => p.hit).length;
    const sumRet = scored.reduce((a, p) => a + (p.ret ?? 0), 0);
    const conf = scored.map((p) => Math.round(p.confidence));
    const semuKalah = hit === 0;
    if (semuKalah) streakKalah++; else streakKalah = 0;
    maxStreak = Math.max(maxStreak, streakKalah);
    console.log(
      `${d.day}  ${d.status}  n=${scored.length} hit=${hit} ret=${(sumRet * 100).toFixed(2)}%  simbol=${scored.map((p) => `${p.symbol}:${p.direction}:${p.ret !== null ? (p.ret * 100).toFixed(1) + "%" : "?"}`).join(" ")}  conf=${conf.join(",")}  rezim=${d.regime}`
    );
  }
  console.log(`STREAK KALAH MAKSIMUM (hari penuh tanpa hit): ${maxStreak}`);

  // 2. Akurasi bergulir (rolling 7 hari)
  console.log("\n=== AKURASI BERGULIR 7 HARI ===");
  const byDay: Record<string, { hit: number; n: number }> = {};
  for (const d of days) {
    const scored = d.picks.filter((p) => p.competitor === "MICAPROFITA" && p.ret !== null);
    if (scored.length === 0) continue;
    byDay[d.day] = { hit: scored.filter((p) => p.hit).length, n: scored.length };
  }
  const keys = Object.keys(byDay).sort();
  for (let i = 6; i < keys.length; i++) {
    const w = keys.slice(i - 6, i + 1);
    let h = 0, n = 0;
    for (const k of w) { h += byDay[k].hit; n += byDay[k].n; }
    console.log(`${keys[i]}  hitrate7d=${((h / n) * 100).toFixed(1)}%  (window ${w[0]}..${keys[i]})`);
  }

  // 3. Keyakinan vs hasil (kalibrasi)
  console.log("\n=== KALIBRASI KEYAKINAN (conf>=60 seharusnya menang lebih) ===");
  for (const band of [[0, 49], [50, 59], [60, 69], [70, 100]]) {
    const sel = mic.filter((p) => p.ret !== null && p.confidence >= band[0] && p.confidence <= band[1]);
    if (sel.length) {
      const h = sel.filter((p) => p.hit).length;
      console.log(`conf ${band[0]}-${band[1]}: n=${sel.length} hit=${h} (${((h / sel.length) * 100).toFixed(1)}%) avgRet=${((sel.reduce((a,p)=>a+(p.ret??0),0)/sel.length)*100).toFixed(2)}%`);
    }
  }

  // 4. Kompetitor pembanding (7 hari terakhir vs seluruh)
  console.log("\n=== PEMBANDING ===");
  for (const c of ["MICAPROFITA", "AI_ANALIS", "MOMENTUM", "MEANREV", "BNH_BTC", "ACAK"]) {
    const all = await db.pick.findMany({ where: { competitor: c, ret: { not: null } } });
    const h = all.filter((p) => p.hit).length;
    console.log(`${c}: n=${all.length} hit=${h} (${all.length ? ((h / all.length) * 100).toFixed(1) : "-"}%) ret=${(all.reduce((a, p) => a + (p.ret ?? 0), 0) * 100).toFixed(1)}%`);
  }

  // 5. Hari terakhir di DB
  console.log("\nHARI TERAKHIR DI DB:", keys[keys.length - 1]);
  const today = new Date().toISOString().slice(0, 10);
  console.log("HARI INI (UTC):", today);
  if (keys[keys.length - 1] !== today) {
    const bolong = [];
    const last = new Date(keys[keys.length - 1] + "T00:00:00Z");
    for (let t = last.getTime() + 86400000; t <= Date.now(); t += 86400000) {
      const dd = new Date(t).toISOString().slice(0, 10);
      if (!byDay[dd]) bolong.push(dd);
    }
    console.log("HARI BOLONG (tidak ada pick dinilai):", bolong.join(", ") || "(tidak ada)");
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
