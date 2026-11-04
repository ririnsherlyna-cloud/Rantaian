#!/usr/bin/env python3
# JEMBATAN OTAK (jalur git, kebal kuota API) — V299
# Otak Next.js menerbitkan keputusannya ke arena-keadaan.json (branch main)
# lewat git fetch/commit/push dari cabang sementara di atas origin/main.
# Token: env GH_TOKEN_MICAPROFITA atau berkas /home/z/my-project/.kunci_otak.
import json, os, subprocess, sys, time, urllib.request

REPO_URL = "https://github.com/ririnsherlyna-cloud/Micaprofita-.git"
REPO_NAMA = "ririnsherlyna-cloud/Micaprofita-"
HIDUP = "/home/z/my-project/hidup_repo"
BRAIN = os.environ.get("OTAK_URL", "http://localhost:3000/api/arena")

def token_ku():
    t = os.environ.get("GH_TOKEN_MICAPROFITA", "")
    if t: return t
    try:
        return open("/home/z/my-project/.kunci_otak").read().strip()
    except Exception:
        return ""

def jalan(cmd, cwd=HIDUP, env=None):
    e = dict(os.environ); e.update(env or {})
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, env=e)
    return r.returncode, (r.stdout + r.stderr)[-500:]

def http(url, timeout=30):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return json.loads(r.read().decode())

TOK = token_ku()
if not TOK:
    print("jembatan: kunci tak ada — diam jujur (V274)"); sys.exit(0)

try:
    brain = http(BRAIN)
except Exception as e:
    print("jembatan: otak tak terjangkau (" + str(e)[:60] + ") — diam jujur"); sys.exit(0)

today = brain.get("today")
picks = []
for st in brain.get("standings", []):
    if st.get("competitor") == "MICAPROFITA":
        picks = [{"symbol": p.get("symbol"), "direction": p.get("direction"),
                  "confidence": p.get("confidence"), "entryClose": p.get("entryClose")}
                 for p in (st.get("pickList") or st.get("picksDetail") or [])]
        break
hidup, lihat = [], set()
def riset(o):
    if isinstance(o, dict):
        if o.get("symbol") and o.get("verdict") and o.get("direction"):
            v = o["verdict"]
            if o["symbol"] not in lihat:
                lihat.add(o["symbol"])
                hidup.append({"symbol": o["symbol"], "direction": o.get("direction"),
                              "entryClose": o.get("entryClose"), "livePrice": o.get("livePrice"),
                              "liveRetPct": o.get("liveRetPct"), "vonis": v.get("kind"),
                              "keyakinan": o.get("confidence")})
        for v in o.values(): riset(v)
    elif isinstance(o, list):
        for v in o: riset(v)
riset(brain)

ISO = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
otak = {"sumber": "otak-nextjs-zai (V299 JEMBATAN-SATU-KEBENARAN)", "today": today,
        "diperbarui": ISO, "picks": picks, "arenaHidup": hidup[:8],
        "ket": "keputusan langsung otak AGI (Next.js + memori Prisma) — kebenaran utama arena.html; SAKTI = suara kedua"}
if not picks and hidup:
    otak["picks"] = [{"symbol": a["symbol"], "direction": a["direction"],
                      "entryClose": a.get("entryClose"), "confidence": a.get("keyakinan")} for a in hidup[:5]]

# --- git: klon sementara terpisah (JANGAN sentuh repo induk wadah) ---
TMP = "/home/z/my-project/jembatan_tmp"
URL_TOK = f"https://x-access-token:{TOK}@github.com/{REPO_NAMA}.git"
if not os.path.isdir(os.path.join(TMP, ".git")):
    rc, out = jalan(["git", "clone", "--depth", "1", "-b", "main", URL_TOK, TMP], cwd="/home/z/my-project")
    if rc != 0: print("jembatan: clone gagal:", out[-120:]); sys.exit(1)
    jalan(["git", "remote", "rename", "origin", "asal"], cwd=TMP)
else:
    rc, out = jalan(["git", "remote"], cwd=TMP)
    if "asal" not in out.split():
        jalan(["git", "remote", "rename", "origin", "asal"], cwd=TMP)
    jalan(["git", "remote", "set-url", "asal", URL_TOK], cwd=TMP)
    jalan(["git", "fetch", "asal", "main"], cwd=TMP)
    jalan(["git", "reset", "--hard", "asal/main"], cwd=TMP)

kp = os.path.join(TMP, "arena-keadaan.json")
ak = json.load(open(kp))
if ak.get("otakPicks") == otak:
    print("jembatan: keputusan tak berubah — tanpa komit")
else:
    ak["otakPicks"] = otak
    evs = ak.get("events") or []
    if not evs or evs[-1].get("day") != today:
        evs.append({"day": today, "kind": "HARI-BARU",
                    "text": f"Pergantian hari {today} tercatat — jembatan otak menyala (satu kebenaran V299).", "at": ISO})
        ak["events"] = evs[-40:]
    json.dump(ak, open(kp, "w"), ensure_ascii=False)
    # IIFE panel SASARAN-OTAK di arena.html (idempoten — sekali tanam saja)
    ah = os.path.join(TMP, "arena.html")
    if os.path.isfile(ah):
        src = open(ah, encoding="utf-8").read()
        if "V299-SASARAN-OTAK" not in src and "</body>" in src:
            iife = open("/home/z/my-project/scripts/iife_otak.html", encoding="utf-8").read()
            open(ah, "w", encoding="utf-8").write(src.replace("</body>", iife + "\n</body>"))
    jalan(["git", "add", "arena-keadaan.json", "arena.html"], cwd=TMP)
    jalan(["git", "-c", "user.email=otak@micaprofita.local", "-c", "user.name=JEMBATAN-OTAK",
           "commit", "-m", "JEMBATAN-OTAK: keputusan MICAPROFITA (otak next.js) terbit — V299 [skip ci]"], cwd=TMP)
    ok = False
    for i in range(3):
        jalan(["git", "pull", "--rebase", "asal", "main"], cwd=TMP)
        rc, out = jalan(["git", "push", "asal", "HEAD:main"], cwd=TMP)
        if rc == 0: ok = True; break
        time.sleep(5)
    print("jembatan:", "TERBIT" if ok else "push gagal 3x (jujur) — " + out[-100:],
          "| picks:", len(picks), "| hidup:", len(hidup), "| today:", today)
jalan(["git", "remote", "set-url", "asal", REPO_URL], cwd=TMP)
