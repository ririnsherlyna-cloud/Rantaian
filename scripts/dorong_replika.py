#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════
# DORONG REPLIKA — SARANG PENJAGA GITHUB (mandat pemilik V302):
# "setiap update terbaru ditanamkan pada GitHub agar jejak gak hilang"
#
# Yang dikerjakan:
#   1. Segarkan arena-v303/ di klon rantaian dari sandbox hidup (rsync tier-1)
#   2. Tarik ujung denyut (pull --rebase — jantung repo berdenyut sendiri
#      lewat GitHub Actions; lomba dihindari)
#   3. Komit + push (6x coba ulang, jeda)
#   4. Token dibaca dari /home/z/my-project/.token-rantaian (chmod 600,
#      gitignored) — bila tiada: BERHENTI JUJUR + instruksi pemilik.
#      DILARANG keras menaruh token di berkas lain / komit / hardcode.
#
# Pemakaian:
#   python3 scripts/dorong_replika.py              # segarkan + komit + push
#   python3 scripts/dorong_replika.py --tanpa-dorong  # hanya refresh+komit lokal
# ═══════════════════════════════════════════════════════════════════
import os
import subprocess
import sys
import time

SRC = "/home/z/my-project"
KLON = os.path.join(SRC, "rantaian")
ZONA = os.path.join(KLON, "arena-v303")
TOKEN_FILE = os.path.join(SRC, ".token-rantaian")
REMOTE = "https://github.com/ririnsherlyna-cloud/Rantaian.git"

# tier-1: tubuh hidup tanpa arsip berat (lengkap di katalog/ zona)
EKSKLUSI = [
    "node_modules", ".next", ".git", "research", "download", "hidup_repo",
    "backup_v263", "akiomida", "penjaga-uji*", "ujian-buta", "io-repo",
    "io_repo_denyut", "rumah_baru", "rumah_induk", "micaprofita",
    "scripts/riset_*", "scripts/riset3c", "scripts/nevron_src", "scripts/audit_blocks*",
    "skills", "scripts/forensik", "scripts/hidup", "scripts/audit_blocks_v2",
    "rantaian", "db/telegram", "db/ujian-rahasia", "db/*.log", "db/*.lock",
    "db/*.pid", "db/penjaga*", "db/telegram.*", ".token-*", "*.log", "*.pid",
    "nohup.out", "dev.pid", "server.log", "tmp", ".cache", "tool-results", "upload",
]


def jalan(cmd, cwd=None, env=None):
    e = dict(os.environ)
    if env:
        e.update(env)
    return subprocess.run(cmd, cwd=cwd, env=e, capture_output=True, text=True)


def main():
    dorong = "--tanpa-dorong" not in sys.argv
    if not os.path.isdir(ZONA):
        print(f"♥ zona {ZONA} tiada → buat")
        os.makedirs(ZONA, exist_ok=True)

    # 1) segarkan zona dari sandbox hidup
    cmd = ["rsync", "-a", "--exclude=.git"]
    for x in EKSKLUSI:
        cmd += ["--exclude", x]
    cmd += [SRC + "/", ZONA + "/"]
    r = jalan(cmd)
    if r.returncode != 0:
        print("rsync gagal:", r.stderr[:400])
        sys.exit(1)
    print("✓ zona arena-v303 disegarkan dari sandbox hidup")

    # 2) status — berhenti HANYA bila tak ada perubahan DAN tak ada komit tertunda
    st = jalan(["git", "status", "--short", "arena-v303"], cwd=KLON)
    ahead = jalan(["git", "rev-list", "--count", "origin/main..main"], cwd=KLON)
    tertunda = (ahead.stdout or "0").strip()
    if not st.stdout.strip() and tertunda == "0":
        print("✓ tak ada perubahan — tubuh sudah sinkron dengan sarang")
        return
    if st.stdout.strip():
        print("perubahan terdeteksi:\n" + st.stdout[:2000])
    if tertunda != "0":
        print(f"komit tertunda untuk didorong: {tertunda}")

    # 3) tarik ujung denyut dulu (rebase) supaya lomba denyut tak terjadi
    p = jalan(["git", "pull", "--rebase", "origin", "main"], cwd=KLON)
    print("pull --rebase:", (p.stdout or p.stderr).strip()[:200])

    # 4) komit
    jalan(["git", "add", "arena-v303"], cwd=KLON)
    c = jalan(
        [
            "git", "commit", "-m",
            "tubuh V302-KEABADIAN-SARANG: produksi standalone anti-OOM (94MB vs 2,2GB) "
            "+ Penjaga Abadi V2 (watchdog 30dtk + RAM-guard + hung-recycle) + segitiga "
            "keabadian (bot menjaga balik watchdog) + keystone dev.sh produksi + hukum "
            "V302 arah-sadar (target melawan arah = cacat, disembuhkan otomatis; bukti "
            "9→0) + hukum bundler spawn-opaque + REBIRTH.md protokol kelahiran-kembali",
        ],
        cwd=KLON,
    )
    print("komit:", (c.stdout or c.stderr).strip()[:200])

    if not dorong:
        print("✓ selesai (mode --tanpa-dorong): jejak tersimpan lokal")
        return

    # 5) token — hanya dari berkas terlindungi
    tok = ""
    try:
        tok = open(TOKEN_FILE).read().strip()
    except Exception:
        pass
    if not tok:
        print(
            "✗ JUJUR: .token-rantaian tiada/kosong — komit SUDAH TERSIMPAN LOKAL.\n"
            "  Untuk mendorong ke GitHub, pemilik membuat PAT baru "
            "(github.com/settings/tokens → repo scope) lalu:\n"
            f"    echo 'PAT_BARU' > {TOKEN_FILE} && chmod 600 {TOKEN_FILE}\n"
            f"    python3 {os.path.abspath(__file__)}"
        )
        sys.exit(2)

    # 6) push 6x coba ulang (tahan lomba dengan jantung denyut repo)
    url = REMOTE.replace("https://", f"https://x-access-token:{tok}@")
    jalan(["git", "remote", "set-url", "origin", url], cwd=KLON)
    try:
        for i in range(6):
            p = jalan(["git", "push", "origin", "main"], cwd=KLON)
            if p.returncode == 0:
                print(f"✓ PUSH BERHASIL (percobaan {i + 1})")
                break
            print(f"push gagal ({i + 1}/6): {(p.stderr or p.stdout).strip()[:160]}")
            time.sleep(5)
            jalan(["git", "pull", "--rebase", "origin", "main"], cwd=KLON)
        else:
            print("✗ push tak juga sukses setelah 6x — jejak tetap aman di komit lokal")
    finally:
        # hukum kebersihan: kredensial tidak menetap di config
        jalan(["git", "remote", "set-url", "origin", REMOTE], cwd=KLON)
    print("✓ remote dibersihkan dari kredensial (hukum rahasia)")


if __name__ == "__main__":
    main()
