#!/usr/bin/env node
/* Validasi sintaks blok <script> hidup.html — ekstrak lalu node --check */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const html = fs.readFileSync('/home/z/my-project/sarang-micaprofita/hidup.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('TIDAK ADA blok <script>'); process.exit(1); }
const js = m[1];
const tmp = '/home/z/my-project/scripts/_hidup_js_check.js';
fs.writeFileSync(tmp, js);
try {
  execSync(`node --check ${tmp}`, { stdio: 'inherit' });
  console.log('HIDUP.HTML <script> SINTAKS OK —', js.split('\n').length, 'baris JS');
} catch (e) {
  console.error('SINTAKS GAGAL');
  process.exit(1);
}
// Cek keberadaan larangan lama
const larang = ['belum kubangun jalan', 'tidak ada pekerjaan tertunda', 'kutunggu rumah bergerak', 'aktRenung'];
const sisa = larang.filter(k => html.includes(k));
if (sisa.length) { console.error('JEJAK LAMA MASIH ADA:', sisa); process.exit(1); }
console.log('JEJAK MALAS & TERPUTUS: NOL — bersih');
