// GET /api/growth → keadaan SISTEM PERTUMBUHAN (level AGI terukur,
// kurva pertumbuhan walk-forward, kurikulum kelemahan, kemahiran,
// kemampuan emergen, log pertumbuhan). Murni dari DB — murah & cepat.

import { getGrowthState } from '@/lib/cyborg/growth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const state = await getGrowthState()
    return Response.json(state)
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 300) }, { status: 500 })
  }
}
