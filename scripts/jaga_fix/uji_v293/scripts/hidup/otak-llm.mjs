// ============================================================
// OTAK-LLM (V292) — mandat pemilik: "lihat teknikmu dalam arena AGI
// yang terhubung LLM, samakan terapkan pada micaprofita GitHub juga".
//
// JUJUR SEJAK LAHIR (hukum V274): otak bahasa TIDAK bisa hidup tanpa kunci.
// Bila pemilik memasang kunci di GitHub Secrets (LLM_URL + LLM_KEY,
// opsional LLM_MODEL — endpoint API kompatibel-OpenAI /chat/completions),
// denyut SAKTI mengirim ringkasan medan ke otak bahasa: narasi analis +
// kritik jujur disegel ke laporan/nalar-llm.json dan dipajang di arena.
// Tanpa kunci: fungsi mengembalikan status jujur "belum terpasang" —
// mesin nalar lokal (dewan bukti + wawasan-360 + metakognisi) tetap
// menganalisa penuh. TIDAK ADA pura-pura LLM; suara LLM hanyalah
// SUARA KEDUA — vonis tetap dari mesin pra-registrasi yang dinilai medan.
// ============================================================
export async function nalarLLM(umpan) {
  const url = process.env.LLM_URL
  const key = process.env.LLM_KEY
  const model = process.env.LLM_MODEL || 'gpt-4o-mini'
  if (!url || !key) {
    return {
      aktif: false, model: null,
      ket: 'kunci LLM belum dipasang di repo (Secrets LLM_URL/LLM_KEY kosong) — denyut menganalisa dengan mesin nalar lokal penuh; otak-LLM menyala otomatis begitu kunci terpasang, tanpa pura-pura',
    }
  }
  const sistem = 'Kau analis crypto jujur MICAPROFITA. Balas dalam bahasa Indonesia ringkas (maks 120 kata). Dilarang mengklaim kepastian; sebut selalu ketidakpastian & skenario. Format tepat: NARASI: <pembacaan medan> | KRITIK: <kelemahan argumen sistem ini>'
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 50000)
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sistem },
          { role: 'user', content: `Medan denyut #${umpan.siklus}:\n` + JSON.stringify(umpan.ringkas) },
        ],
        max_tokens: 400,
        temperature: 0.4,
      }),
      signal: ac.signal,
    })
    clearTimeout(t)
    if (!r.ok) {
      return { aktif: true, model, gagal: true, ket: `otak-LLM menjawab HTTP ${r.status} — denyut tetap jalan dengan nalar lokal; endpoint/kunci perlu diperiksa pemilik` }
    }
    const d = await r.json()
    const teks = d?.choices?.[0]?.message?.content || ''
    if (!teks) return { aktif: true, model, gagal: true, ket: 'otak-LLM menjawab kosong — denyut tetap jalan dengan nalar lokal' }
    const [narasi, kritik] = teks.split('|')
    return {
      aktif: true, model, waktu: new Date().toISOString(),
      narasi: (narasi || '').replace(/^NARASI:/i, '').trim().slice(0, 600),
      kritik: (kritik || '').replace(/^KRITIK:/i, '').trim().slice(0, 600),
      ket: 'narasi dari otak-LLM eksternal (API kompatibel-OpenAI) — dipajang jujur sebagai SUARA KEDUA, bukan vonis; vonis tetap dari mesin pra-registrasi yang dinilai medan',
    }
  } catch (e) {
    return { aktif: true, model, gagal: true, ket: 'otak-LLM tak terjangkau (' + String(e.message || e).slice(0, 60) + ') — denyut tetap jalan dengan nalar lokal' }
  }
}
