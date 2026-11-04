#!/usr/bin/env node
// ============================================================
// GERBANG ROLLBACK MICAPROFITA — titik pemulihan permanen server-side.
//
// Perintah pemilik (2026-10-15): "jadikan ini juga sebagai bahan rollback
// bila nanti ada rollback — ter-save fitur ini." Maka fitur ini ABADI:
//   • snapshot : menyimpan kondisi penuh (DB + otak + konfigurasi)
//   • list     : daftar semua titik pemulihan
//   • restore  : memulihkan kondisi dari titik tertentu (dengan pengaman)
//
// Penyimpanan: /home/z/my-project/data/rollback/<ts>_<label>/
//   db/custom.db, otak/ (src/lib/cyborg/*), schema.prisma, manifest.json
// Tidak menyentuh localStorage (hukum Tugas F: localStorage = 0).
// ============================================================
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/home/z/my-project';
const RB = join(ROOT, 'data', 'rollback');
const [cmd, labelArg] = process.argv.slice(2);

function manifestOf(dir) {
  try { return JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')); }
  catch { return null; }
}

function snapshot(label) {
  if (!label) { console.error('Pakai: node rollback.mjs snapshot <label>'); process.exit(1); }
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = join(RB, `${ts}_${String(label).replace(/[^a-zA-Z0-9_-]/g, '_')}`);
  mkdirSync(join(dir, 'otak'), { recursive: true });
  mkdirSync(join(dir, 'db'), { recursive: true });
  if (existsSync(join(ROOT, 'db', 'custom.db'))) cpSync(join(ROOT, 'db', 'custom.db'), join(dir, 'db', 'custom.db'));
  if (existsSync(join(ROOT, 'src', 'lib', 'cyborg'))) cpSync(join(ROOT, 'src', 'lib', 'cyborg'), join(dir, 'otak'), { recursive: true });
  if (existsSync(join(ROOT, 'prisma', 'schema.prisma'))) cpSync(join(ROOT, 'prisma', 'schema.prisma'), join(dir, 'schema.prisma'));
  let gitSha = 'unknown';
  try { gitSha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch {}
  const counts = countDb();
  const manifest = {
    id: dir.split('/').pop(), label, createdAt: new Date().toISOString(), gitSha,
    catatan: `Titik pemulihan MICAPROFITA (permintaan pemilik 2026-10-15: bahan rollback abadi).`,
    db: counts,
  };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`SNAPSHOT TERBUAT: ${dir}`);
  console.log(JSON.stringify(manifest, null, 2));
}

function countDb() {
  try {
    // sqlite3 mungkin tak terpasang — hitung via prisma terlalu berat; ukuran saja cukup
    const sz = execSync(`stat -c %s ${join(ROOT, 'db', 'custom.db')}`).toString().trim();
    return { customDbBytes: Number(sz) };
  } catch { return {}; }
}

function list() {
  if (!existsSync(RB)) { console.log('Belum ada snapshot.'); return; }
  const dirs = execSync(`ls -1 ${RB}`).toString().trim().split('\n').filter(Boolean);
  for (const d of dirs) {
    const m = manifestOf(join(RB, d));
    console.log(`- ${d}  | label=${m?.label ?? '?'} | ${m?.createdAt ?? '?'} | db=${m?.db?.customDbBytes ?? '?'} B`);
  }
}

function restore(id) {
  if (!id) { console.error('Pakai: node rollback.mjs restore <id> [--paksa]'); process.exit(1); }
  const paksa = process.argv.includes('--paksa');
  const dir = join(RB, id);
  if (!existsSync(dir) || !manifestOf(dir)) { console.error(`Snapshot ${id} tidak ditemukan/rusak.`); process.exit(1); }
  if (!paksa) {
    // pengaman: snapshot kondisi SAAT INI dulu sebelum menimpa
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    snapshot(`pra-restore-${ts}`);
    console.log('Pengaman: kondisi sekarang di-snapshot dulu (pra-restore). Ulangi dengan --paksa untuk benar-benar memulihkan.');
    return;
  }
  cpSync(join(dir, 'db', 'custom.db'), join(ROOT, 'db', 'custom.db'), { force: true });
  cpSync(join(dir, 'otak'), join(ROOT, 'src', 'lib', 'cyborg'), { recursive: true, force: true });
  if (existsSync(join(dir, 'schema.prisma'))) cpSync(join(dir, 'schema.prisma'), join(ROOT, 'prisma', 'schema.prisma'), { force: true });
  console.log(`TERPULIHKAN dari ${id}. Restart dev server agar otak baru termuat.`);
}

if (cmd === 'snapshot') snapshot(labelArg);
else if (cmd === 'list') list();
else if (cmd === 'restore') restore(labelArg);
else {
  console.log('GERBANG ROLLBACK MICAPROFITA');
  console.log('  node rollback.mjs snapshot <label>  — buat titik pemulihan');
  console.log('  node rollback.mjs list              — daftar titik pemulihan');
  console.log('  node rollback.mjs restore <id>      — pulihkan (beri --paksa untuk eksekusi)');
}
