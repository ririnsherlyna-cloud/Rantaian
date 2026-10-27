import { FBO_FAMILIES, forgeOnce } from '../../src/lib/exam/fbo-suite'
const fam = FBO_FAMILIES[0]
try {
  const out = forgeOnce('fbo100::fbo-weak::ATAS::0', fam, 'ATAS', 'MUDAH', 'FBO')
  console.log('OK score=', out.score.toFixed(2), 'move=', out.movePct.toFixed(2), 'mfe=', out.mfePct.toFixed(2), 'baitMfe=', out.baitMfePct.toFixed(2), 'baitNet=', out.baitNetPct.toFixed(2), 'earlyStop=', out.earlyFadeStopped)
} catch (e) { console.error('ERR', (e as Error).message, (e as Error).stack?.split('\n').slice(0, 4).join(' | ')) }
