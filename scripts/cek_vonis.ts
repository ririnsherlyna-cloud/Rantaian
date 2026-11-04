import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const days = await db.battleDay.findMany({ orderBy: { day: "asc" }, include: { picks: true } });
  console.log("=== VONIS HARI 11-15 (paket V301) ===");
  for (const d of days.slice(-5)) {
    for (const p of d.picks.filter((x) => x.competitor === "MICAPROFITA")) {
      const ret = p.ret !== null ? (p.ret * 100).toFixed(1) + "%" : "pending";
      console.log(`${d.day} ${p.symbol.replace("USDT", "").padEnd(7)} ${p.direction} conf=${Math.round(p.confidence)} ret=${ret} ${p.hit === null ? "" : p.hit ? "MENANG" : "KALAH"}`);
    }
  }
  // event terbaru
  const ev = await db.arenaEvent.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
  console.log("\n=== EVENT TERBARU ===");
  for (const e of ev) console.log(`${e.day} ${e.kind}: ${e.text.slice(0, 150)}`);
}
main().catch(console.error).finally(() => db.$disconnect());