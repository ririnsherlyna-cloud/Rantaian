// ============================================================
// MOCK GITHUB API — server pengujian SARANG (organ V243).
// Mengimitasi endpoint GitHub REST yang dipakai organ:
//   git/blobs, git/trees (+recursive), git/commits, git/refs,
//   git/ref/heads, /pages, /repos — plus Pages statis dari
//   checkout terakhir + endpoint simulasi evolusi eksternal.
// Auth: wajib 'Authorization: Bearer uji-token-rahasia' (else 401)
// State: di memori + di-materialize-kan ke <sim>/halaman/ (REPO NYATA DI DISK)
// Jalankan: node scripts/sarang/mock_github.mjs [port] [dirSim]
// ============================================================
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PORT = parseInt(process.argv[2] || '8899', 10);
const SIM = path.resolve(process.argv[3] || '/home/z/my-project/scripts/sarang/sim');
const WWW = path.resolve(process.argv[4] || '/home/z/my-project/scripts/sarang/www');
const HALAMAN = path.join(SIM, 'halaman');
const TOKEN = 'uji-token-rahasia';
const OWNER = 'micaprofita', REPO = 'sarang-uji';

fs.mkdirSync(HALAMAN, { recursive: true });
fs.mkdirSync(WWW, { recursive: true });

// ---------- state git tiruan ----------
const blobs = new Map();   // sha -> Buffer
const trees = new Map();   // sha -> Map<path, {mode,type,sha}>
const commits = new Map(); // sha -> {tree, parents, message, ts}
const refs = new Map();    // branch -> commitSha
let pagesEnabled = null;   // {branch, html_url}
const statistik = { apiHit: 0, blobsDibuat: 0, komit: 0, authDitolak: 0 };

function sha1Of(buf) { return crypto.createHash('sha1').update(buf).digest('hex'); }
function jok(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

// ---------- materialize checkout (repo jadi file di disk) ----------
function materialize() {
  const branch = refs.keys().next().value;
  const head = branch ? refs.get(branch) : null;
  fs.rmSync(HALAMAN, { recursive: true, force: true });
  fs.mkdirSync(HALAMAN, { recursive: true });
  if (!head) return;
  const tree = trees.get(commits.get(head).tree);
  if (!tree) return;
  for (const [p, ent] of tree) {
    if (ent.type !== 'blob') continue;
    const dst = path.join(HALAMAN, p);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, blobs.get(ent.sha) || Buffer.alloc(0));
  }
  // catat log commit (jejak pertumbuhan)
  const logPath = path.join(SIM, 'log-komit.json');
  const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : [];
  log.push({ sha: head, message: commits.get(head).message, ts: commits.get(head).ts, files: tree.size });
  fs.writeFileSync(logPath, JSON.stringify(log, null, 1));
}

// ---------- routing ----------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
  const p = url.pathname;
  statistik.apiHit++;

  // Pages statis: /halaman/... dari checkout terakhir
  if (p === '/halaman' || p.startsWith('/halaman/')) {
    let rel = p.replace(/^\/halaman\/?/, '') || 'index.html';
    const dst = path.normalize(path.join(HALAMAN, rel));
    if (!dst.startsWith(HALAMAN) || !fs.existsSync(dst) || !fs.statSync(dst).isFile()) {
      return jok(res, 404, { message: 'Not Found (halaman sim)' });
    }
    const ext = path.extname(dst);
    const tipe = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.md': 'text/markdown' }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': tipe, 'Access-Control-Allow-Origin': '*' });
    return res.end(fs.readFileSync(dst));
  }

  // Harness statis
  if (p === '/' || p === '/harness' || p === '/harness/') {
    const f = path.join(WWW, 'harness_v243.html');
    if (!fs.existsSync(f)) return jok(res, 404, { message: 'harness belum dibangun' });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(f));
  }

  // API GitHub tiruan
  if (!p.startsWith('/api/')) return jok(res, 404, { message: 'Not Found' });

  // auth: semua /api/repos/* wajib token
  if (p.startsWith('/api/repos/')) {
    const auth = req.headers['authorization'] || '';
    if (auth !== 'Bearer ' + TOKEN) { statistik.authDitolak++; return jok(res, 401, { message: 'Bad credentials (sim)' }); }
  }

  const seg = p.split('/').filter(Boolean); // ['api', ...]
  // sesudah 'api': ['repos', o, r, ...sisa] ATAU ['statistik'] / ['simulasi','evolusi-eksternal']
  const seg2 = seg.slice(1);
  const sisa = (seg2[0] === 'repos') ? seg2.slice(3).join('/') : seg2.join('/');

  // kumpulkan body
  let raw = [];
  req.on('data', (c) => raw.push(c));
  req.on('end', () => {
    const buf = Buffer.concat(raw);
    let body = {};
    try { body = buf.length ? JSON.parse(buf.toString('utf8')) : {}; } catch (e) { return jok(res, 400, { message: 'bad json' }); }

    // ---- repo ----
    if (sisa === '' && req.method === 'GET') {
      return jok(res, 200, { full_name: OWNER + '/' + REPO, private: false, default_branch: refs.has('utama') ? 'utama' : 'main' });
    }
    // ---- pages ----
    if (sisa === 'pages') {
      if (req.method === 'GET') return pagesEnabled ? jok(res, 200, pagesEnabled) : jok(res, 404, { message: 'Pages not enabled' });
      if (req.method === 'POST') {
        if (pagesEnabled) return jok(res, 409, { message: 'already exists' });
        pagesEnabled = { html_url: 'http://127.0.0.1:' + PORT + '/halaman/', source: body.source };
        return jok(res, 201, pagesEnabled);
      }
    }
    // ---- git blobs ----
    if (sisa === 'git/blobs' && req.method === 'POST') {
      const konten = body.encoding === 'base64' ? Buffer.from(body.content, 'base64') : Buffer.from(body.content, 'utf8');
      const sha = sha1Of(konten);
      blobs.set(sha, konten); statistik.blobsDibuat++;
      return jok(res, 201, { sha });
    }
    // ---- git refs ----
    if (sisa === 'git/refs' && req.method === 'POST') {
      const nama = String(body.ref || '').replace('refs/heads/', '');
      refs.set(nama, body.sha); materialize(); statistik.komit++;
      return jok(res, 201, { ref: body.ref, object: { sha: body.sha } });
    }
    if (sisa.startsWith('git/refs/heads/') && req.method === 'PATCH') {
      const nama = sisa.replace('git/refs/heads/', '');
      if (!refs.has(nama)) return jok(res, 404, { message: 'branch not found' });
      refs.set(nama, body.sha); materialize(); statistik.komit++;
      return jok(res, 200, { ref: 'refs/heads/' + nama, object: { sha: body.sha } });
    }
    if (sisa.startsWith('git/ref/heads/') && req.method === 'GET') {
      const nama = sisa.replace('git/ref/heads/', '');
      if (!refs.has(nama)) return jok(res, 404, { message: 'Not Found' });
      return jok(res, 200, { ref: 'refs/heads/' + nama, object: { sha: refs.get(nama), type: 'commit' } });
    }
    // ---- git trees ----
    if (sisa === 'git/trees' && req.method === 'POST') {
      const dasar = body.base_tree ? new Map(trees.get(body.base_tree) || []) : new Map();
      for (const e of (body.tree || [])) {
        if (e.sha === null) dasar.delete(e.path);
        else dasar.set(e.path, { mode: e.mode, type: e.type, sha: e.sha });
      }
      // tree sha dari isi kanonik
      const flat = [...dasar.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        .map(([p, e]) => p + ':' + e.sha).join('\n');
      const sha = sha1Of(Buffer.from('tree\0' + flat));
      trees.set(sha, dasar);
      return jok(res, 201, { sha });
    }
    if (sisa.startsWith('git/trees/') && req.method === 'GET') {
      const sha = sisa.replace('git/trees/', '').split('?')[0];
      const t = trees.get(sha);
      if (!t) return jok(res, 404, { message: 'tree not found' });
      return jok(res, 200, { sha, tree: [...t.entries()].map(([pth, e]) => ({ path: pth, mode: e.mode, type: e.type, sha: e.sha })) });
    }
    // ---- git commits ----
    if (sisa === 'git/commits' && req.method === 'POST') {
      const sha = sha1Of(Buffer.from('commit\0' + body.tree + '\0' + (body.parents || []).join(',') + '\0' + body.message + '\0' + Date.now()));
      commits.set(sha, { tree: body.tree, parents: body.parents || [], message: body.message, ts: new Date().toISOString() });
      return jok(res, 201, { sha, tree: { sha: body.tree }, parents: body.parents || [], message: body.message });
    }
    if (sisa.startsWith('git/commits/') && req.method === 'GET') {
      const sha = sisa.replace('git/commits/', '');
      const c = commits.get(sha);
      if (!c) return jok(res, 404, { message: 'commit not found' });
      return jok(res, 200, Object.assign({ sha }, c, { tree: { sha: c.tree } }));
    }
    // ---- simulasi evolusi eksternal (aktor lain men-commit versi.json) ----
    if (sisa === 'simulasi/evolusi-eksternal' && req.method === 'POST') {
      const branch = refs.keys().next().value;
      const head = branch ? refs.get(branch) : null;
      if (!head) return jok(res, 400, { message: 'repo masih kosong' });
      const lama = trees.get(commits.get(head).tree);
      const versiLama = JSON.parse(blobs.get(lama.get('versi.json').sha).toString('utf8'));
      versiLama.organ.LUAR = '9.9'; // peta organ berubah dari luar
      versiLama.kodeVersi = 'v243.9.9';
      versiLama.waktu = new Date().toISOString();
      const kb = Buffer.from(JSON.stringify(versiLama, null, 2));
      const shaV = sha1Of(kb); blobs.set(shaV, kb);
      const t2 = new Map(lama); t2.set('versi.json', { mode: '100644', type: 'blob', sha: shaV });
      const shaT = sha1Of(Buffer.from('tree\0' + [...t2.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([p, e]) => p + ':' + e.sha).join('\n')));
      trees.set(shaT, t2);
      const shaC = sha1Of(Buffer.from('commit\0' + shaT + '\0luar\0EVOLUSI EKSTERNAL (aktor lain)\0' + Date.now()));
      commits.set(shaC, { tree: shaT, parents: [head], message: 'EVOLUSI EKSTERNAL (aktor lain)', ts: new Date().toISOString() });
      refs.set(branch, shaC); materialize(); statistik.komit++;
      return jok(res, 200, { ok: true, commit: shaC });
    }
    // ---- statistik (verifikasi harness) ----
    if (sisa === 'statistik' && req.method === 'GET') {
      const branch = refs.keys().next().value;
      const head = branch ? refs.get(branch) : null;
      const files = head ? [...trees.get(commits.get(head).tree).keys()].sort() : [];
      return jok(res, 200, { statistik, head, files, pagesEnabled: !!pagesEnabled, url: 'http://127.0.0.1:' + PORT + '/halaman/' });
    }
    return jok(res, 404, { message: 'endpoint sim tak dikenal: ' + sisa });
  });
});

server.listen(PORT, () => {
  console.log('MOCK GITHUB siap: api=http://127.0.0.1:' + PORT + '/api  pages=http://127.0.0.1:' + PORT + '/halaman/  harness=http://127.0.0.1:' + PORT + '/');
  console.log('checkout dir: ' + HALAMAN);
});
