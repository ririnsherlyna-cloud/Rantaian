#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""REPLIKA PENUH V303 — menanam TUBUH hidup MICAPROFITA ARENA ke repo GitHub
ririnsherlyna-cloud/Rantaian (klon lokal: /home/z/my-project/rantaian).

Hukum user: semua implementasi disalin direplika penuh — tampilan, alur, aspek,
setiap kode — sama persis. Zona tanam: arena-v303/ (cermin root proyek) supaya
NOL tabrakan dengan jantung denyut Rantaian (denyut gen-45 okx-swap + situs
statik + workflow .github) yang hidup dan TIDAK BOLEH disentuh.

Berkas terlalu berat utk dorongan pertama (research 178M, download 187M,
klon riset pihak ketiga, arsip varian) TIDAK dibuang — dikatalogkan lengkap
(nama, byte, SHA1) di katalog/ supaya tak ada yang tertinggal dan bisa
dipulihkan/didorong di tingkat berikutnya.

Pemakaian:
  REPLIKA_DST=/home/z/my-project/rantaian python3 scripts/replika_v303.py [tier]
  tier 1 (default) = tubuh inti + katalog; tier 2 = + seluruh arsip berat
"""
import hashlib
import os
import shutil
import subprocess
import sys
import time

TIER = int(sys.argv[1]) if len(sys.argv) > 1 else 1

SRC = "/home/z/my-project"
DST = os.environ.get("REPLIKA_DST", "/home/z/my-project/rantaian")
ZONA = os.path.join(DST, "arena-v303")

COPY_DIRS = ["src", "prisma", "db", "public", "tests", "examples", ".zscripts", "upload"]
# scripts: kecualikan klon riset pihak ketiga, artefak ujian berat, backup, dan
# organ denyut milik repo (penjaga.mjs dsb — jangan pernah menginjak jantung)
SCRIPTS_EXC_DIRS = {
    "riset_autopilot", "riset_clawtrade", "riset3c", "riset_gekko", "riset_kaizen",
    "nevron_src", "audit_blocks", "audit_blocks_v2", "ujian-buta", "tmp",
}
SCRIPTS_EXC_FILES = {"penjaga.mjs", "penjaga.mjs.bak-v254"}
MAX_FILE = (200 * 1024 * 1024) if TIER >= 2 else (8 * 1024 * 1024)

COPY_FILES = [
    "package.json", "package-lock.json", "tsconfig.json", "next.config.ts",
    "tailwind.config.ts", "postcss.config.mjs", "components.json",
    "ti_backtest.html", "worklog.md",
]
ROOT_EXTRA = [".eslintrc.json", "eslint.config.mjs", "next.config.mjs", "next.config.js",
              ".editorconfig", "LICENSE", "README-ARENA.md"]

KATALOG_DIRS = ["research", "download", "akiomida", "hidup_repo",
                "backup_v263", "penjaga-uji", "penjaga-uji2", "tool-results"]

statistik = {"berkas": 0, "byte": 0, "dilewati": [], "katalog": []}


def sha1(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def salin_file(asal, tujuan):
    os.makedirs(os.path.dirname(tujuan), exist_ok=True)
    shutil.copy2(asal, tujuan)
    statistik["berkas"] += 1
    statistik["byte"] += os.path.getsize(asal)


def salin_dir(name):
    akar = os.path.join(SRC, name)
    if not os.path.isdir(akar):
        return
    for dirpath, dirnames, filenames in os.walk(akar):
        dirnames[:] = [d for d in dirnames if d not in ("node_modules", ".next", ".git", "__pycache__")]
        for fn in filenames:
            asal = os.path.join(dirpath, fn)
            rel = os.path.relpath(asal, SRC)
            if any(p in rel for p in (".env", ".token-rantaian")):
                continue
            uk = os.path.getsize(asal)
            if uk > MAX_FILE:
                statistik["dilewati"].append((rel, uk))
                continue
            salin_file(asal, os.path.join(ZONA, rel))


def salin_scripts():
    akar = os.path.join(SRC, "scripts")
    for dirpath, dirnames, filenames in os.walk(akar):
        dirnames[:] = [d for d in dirnames
                       if d not in SCRIPTS_EXC_DIRS and d not in ("node_modules", ".git", "__pycache__")]
        for fn in filenames:
            asal = os.path.join(dirpath, fn)
            rel = os.path.relpath(asal, SRC)
            base = os.path.basename(fn)
            if base in SCRIPTS_EXC_FILES or base.endswith(".bak") or ".bak-" in base:
                continue
            uk = os.path.getsize(asal)
            if uk > MAX_FILE:
                statistik["dilewati"].append((rel, uk))
                continue
            salin_file(asal, os.path.join(ZONA, rel))


def katalog_dir(name):
    akar = os.path.join(SRC, name)
    if not os.path.isdir(akar):
        return None
    baris = ["# KATALOG %s — diarsipkan dari sandbox hidup %s" % (name, time.strftime("%Y-%m-%d %H:%M WIB")),
             "",
             "Seluruh berkas di bawah ini ADA di sandbox (bukan hilang). Isi lengkap menyusul",
             "di dorongan tier-2 via `scripts/dorong_replika.py --tier 2`. SHA1 = sidik jari",
             "pemulihan: agent mana pun bisa memverifikasi keutuhan data.",
             "",
             "| berkas | byte | sha1 |", "|---|---:|---|"]
    n = 0
    for dirpath, dirnames, filenames in os.walk(akar):
        dirnames[:] = [d for d in dirnames if d not in ("node_modules", ".next", ".git", "__pycache__")]
        for fn in filenames:
            asal = os.path.join(dirpath, fn)
            rel = os.path.relpath(asal, SRC)
            try:
                baris.append("| %s | %d | %s |" % (rel, os.path.getsize(asal), sha1(asal)))
                n += 1
            except OSError:
                pass
    tujuan = os.path.join(ZONA, "katalog", "KATALOG-%s.md" % name)
    os.makedirs(os.path.dirname(tujuan), exist_ok=True)
    open(tujuan, "w", encoding="utf-8").write("\n".join(baris) + "\n")
    statistik["katalog"].append((name, n))
    return n


def ada_marker():
    try:
        out = subprocess.run(["rg", "-o", r"V3\d{2}[A-Z-]*", os.path.join(SRC, "src"),
                              "--no-filename"], capture_output=True, text=True, timeout=30)
        v = sorted(set(x for x in out.stdout.split() if x.startswith("V3")))
        return v[-6:]
    except Exception:
        return ["?"]


def ujung_repo():
    try:
        out = subprocess.run(["git", "log", "--format=%h %s", "-1"], cwd=DST,
                             capture_output=True, text=True, timeout=20)
        return out.stdout.strip()[:120]
    except Exception:
        return "?"


def main():
    t0 = time.time()
    if os.path.isdir(ZONA):
        shutil.rmtree(ZONA)
    os.makedirs(ZONA)

    for d in COPY_DIRS:
        salin_dir(d)
    if TIER >= 2:
        for d in KATALOG_DIRS:
            salin_dir(d)  # tier-2: isi penuh, bukan sekadar katalog
    salin_scripts()
    for f in COPY_FILES:
        p = os.path.join(SRC, f)
        if os.path.isfile(p):
            salin_file(p, os.path.join(ZONA, f))
    for f in ROOT_EXTRA:
        p = os.path.join(SRC, f)
        if os.path.isfile(p):
            salin_file(p, os.path.join(ZONA, f))

    # bukti PNG riset tingkat atas (ringan, penting utk jejak visual)
    rdir = os.path.join(SRC, "research")
    if os.path.isdir(rdir):
        for fn in sorted(os.listdir(rdir)):
            if fn.lower().endswith(".png"):
                p = os.path.join(rdir, fn)
                if os.path.getsize(p) <= MAX_FILE:
                    salin_file(p, os.path.join(ZONA, "research", fn))

    if TIER < 2:
        for d in KATALOG_DIRS:
            katalog_dir(d)

    # katalog berkas tubuh yang melebihi batas tier-1 (juga TIDAK hilang)
    if statistik["dilewati"]:
        baris = ["# KATALOG BERKAS BESAR — tidak ikut tier ini, ADA di sandbox",
                 "", "| berkas | byte | sha1 |", "|---|---:|---|"]
        for rel, _uk in statistik["dilewati"]:
            p = os.path.join(SRC, rel)
            try:
                baris.append("| %s | %d | %s |" % (rel, os.path.getsize(p), sha1(p)))
            except OSError:
                baris.append("| %s | ? | (tidak terbaca) |" % rel)
        os.makedirs(os.path.join(ZONA, "katalog"), exist_ok=True)
        open(os.path.join(ZONA, "katalog", "KATALOG-BERKAS-BESAR.md"), "w",
             encoding="utf-8").write("\n".join(baris) + "\n")

    uk_db = os.path.getsize(os.path.join(SRC, "db", "custom.db"))
    man = """# MANIFEST REPLIKA — MICAPROFITA ARENA AGI KRIPTO (TUBUH V303)

Ditanam: %s (WIB) oleh sesi sandbox hidup `/home/z/my-project`.

## Apa ini?

**Tubuh lengkap** otak MICAPROFITA ARENA AGI KRIPTO — replika penuh, sama persis
dengan sandbox hidup: tampilan, alur, aspek, setiap kode. Ini BUKAN snapshot
bangkai: repo ini adalah **ranah hidup** — jantung denyutnya sendiri terbukti
berdetak oleh GitHub Actions (lihat riwayat komit denyut di repo induk) tanpa
perlu mesin siapa pun, dan kini bertambah organ barunya: **tubuh penuh ARENA
V303** di `arena-v303/` ini.

## Menjalankan tubuh (agent penerus, baca dulu!)

```bash
cd arena-v303
npm install
npx prisma generate        # skema: prisma/schema.prisma
npm run dev                # port 3000 — ARENA hidup
```

Memori otak tersimpan `db/custom.db` (SQLite via Prisma, %d byte snapshot).

## Peta otak tubuh (src/lib/cyborg — 13 modul)

| modul | peran |
|---|---|
| arena.ts | orkestra denyut ARENA + V303-HEMAT (anti-ban 418) + rollover harian |
| market.ts | gerbang simbol anti-bom-CJK + failover multi-host spot/futures |
| brain.ts | inti penilaian; factors.ts 60+ faktor; verdict.ts vonis BUY/SELL |
| cuan.ts | manajemen untung/rugi posisi; evolution.ts evolusi genome |
| growth.ts pertumbuhan; memory.ts ingatan; rivals.ts saingan; koin.ts koin |
| llm.ts jembatan LLM; warisan.ts warisan keluarga trader |

Penjaga Abadi V303 (anti-mati): `scripts/watchdog_server.sh` (penjaga
luar-proses, auto-revive ±45 dtk) + `src/app/api/health/route.ts` (probe) +
`src/instrumentation.ts` L8 (server boot mem-spawn penjaganya sendiri).

## Hukum abadi yang wajib dipatuhi agent penerus

1. Balas pemilik selalu Bahasa Indonesia.
2. Jujur absolut — tidak pernah fabrikasi data; akurasi dilaporkan apa adanya.
3. Token GitHub HANYA di `.token-rantaian` (chmod 600, gitignored) — tidak pernah
   di-hardcode, tidak pernah ikut commit.
4. Perbaikan bug tanpa menggantung layar; respons cepat.
5. Jantung denyut (workflow repo induk) tidak boleh dimatikan.

## Yang tidak ikut tier-1 (lengkap di katalog/, bukan hilang!)

Berkas sangat berat tetap dikatalogkan nama+byte+SHA1 (lihat `katalog/`):
research/ujian-* (bukti ujian 178M), download/ (187M arsip deliverable),
klon riset pihak ketiga (`riset_*`, `nevron_src`, `audit_blocks*`, `ujian-buta`),
arsip varian (`akiomida/`, `hidup_repo/`, `backup_v263/`, `penjaga-uji*/`).
Pulihkan via `scripts/dorong_replika.py --tier 2` dari sandbox, atau verifikasi
SHA1 dari katalog bila sumber lain ditemukan.

## Protokol sinkronisasi (anti-bangkai — WAJIB tiap sesi berkembang)

```bash
python3 scripts/dorong_replika.py             # segarkan tubuh dari sandbox + dorong
python3 scripts/dorong_replika.py --tier 2    # + bukti research & arsip
```

Skrip: segarkan `arena-v303/` dari sandbox hidup -> tarik ujung denyut ->
komit -> push (coba ulang 6x, tahan lomba dengan denyut jantung). Token dibaca
dari `.token-rantaian`; bila kosong/mati, skrip berhenti dengan pesan jujur —
minta pemilik token baru (github.com/settings/tokens).

## Keadaan saat penanaman

- Marker versi terdeteksi: %s
- Ujung repo saat tanam: %s
- Statistik tanam: %d berkas, %.1f MB
""" % (time.strftime("%Y-%m-%d %H:%M"), uk_db, " ".join(ada_marker()),
       ujung_repo(), statistik["berkas"], statistik["byte"] / 1e6)
    open(os.path.join(ZONA, "MANIFEST-REPLIKA.md"), "w", encoding="utf-8").write(man)

    dt = time.time() - t0
    print("TANAM SELESAI %.1f dtk (tier %d, tujuan %s)" % (dt, TIER, DST))
    print("berkas tubuh : %d (%.1f MB)" % (statistik["berkas"], statistik["byte"] / 1e6))
    print("katalog      : %s" % ", ".join("%s=%d" % k for k in statistik["katalog"]))
    print("dilewati >batas: %d" % len(statistik["dilewati"]))


if __name__ == "__main__":
    main()
