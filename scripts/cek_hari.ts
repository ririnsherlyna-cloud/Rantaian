import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const days = await db.battleDay.findMany({ orderBy: { day: "asc" }, include: { picks: { where: { competitor: "MICAPROFITA" } } } });
  for (const d of days.slice(-8)) {
    console.log(d.day, d.status, "picks=" + d.picks.map((p) => p.symbol.replace("USDT", "") + ":" + p.direction).join(","));
  }
}
main().catch(console.error).finally(() => db.$disconnect());
