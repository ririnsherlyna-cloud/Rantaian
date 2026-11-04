import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const picks = await db.pick.findMany({ include: { battleDay: true } })
  const days = [...new Set(picks.filter(p=>p.ret!==null).map(p=>p.battleDay.day))].sort()
  let cumM=0, cumC=0
  console.log('day        MICAPROFITA  MOMENTUM  delta(cum)')
  for (const d of days) {
    const dp = picks.filter(p=>p.battleDay.day===d && p.competitor==='MICAPROFITA' && p.ret!==null)
    const mp = picks.filter(p=>p.battleDay.day===d && p.competitor==='MOMENTUM' && p.ret!==null)
    const ds = dp.length? dp.reduce((s,p)=>s+(p.ret??0),0)/dp.length : 0
    const ms = mp.length? mp.reduce((s,p)=>s+(p.ret??0),0)/mp.length : 0
    cumC+=ds; cumM+=ms
    const flag = (ms-ds)>0.02 ? ' <<' : (ds-ms)>0.02 ? ' ++' : ''
    console.log(`${d}  ${(ds*100).toFixed(1).padStart(7)}%  ${(ms*100).toFixed(1).padStart(7)}%   C=${(cumC*100).toFixed(0)} M=${(cumM*100).toFixed(0)}${flag}`)
    if (flag===' <<') for (const p of dp) console.log(`    ${p.direction} ${p.symbol} ret=${((p.ret??0)*100).toFixed(1)}%`)
  }
  await db.$disconnect()
}
main().catch((e)=>{console.error(e);process.exit(1)})
