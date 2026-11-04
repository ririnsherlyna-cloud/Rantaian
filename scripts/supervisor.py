#!/usr/bin/env python3
# SUPERVISOR v9 - lahir dari otak z.ai - 30 Oct 2026
# Tugas: (1) anti-stuck: hidupkan ulang daemon --jaga dalam 15 detik
#        tanpa menunggu siklus cron platform.
#        (2) anti-hilang: snapshot worklog + denyut ke repo Rantaian
#        tiap 20 menit (Contents API, push token) sehingga rollback
#        filesystem tidak bisa memusnahkan hasil perkembangan.
import subprocess, time, os, json, base64, urllib.request

BASE = '/home/z/my-project'
NYALA = f'{BASE}/data/penjaga_nyala'
SUP_NYALA = f'{BASE}/data/supervisor_nyala'
LOG = f'{BASE}/data/supervisor.log'
TOK = f'{BASE}/.token-rantaian'
REPO = 'ririnsherlyna-cloud/Rantaian'
SNAP_EVERY = 1200  # 20 menit


def log(msg):
    try:
        with open(LOG, 'a') as f:
            f.write(time.strftime('%Y-%m-%d %H:%M:%S') + ' ' + msg + '\n')
    except Exception:
        pass


def daemon_hidup():
    out = subprocess.run(['pgrep', '-f', 'balas_telegram.py --jaga'],
                         capture_output=True, text=True)
    return bool(out.stdout.strip())


def hidupkan():
    try:
        with open(f'{BASE}/data/bot_chat.log', 'ab') as lf:
            subprocess.Popen(
                ['python3', f'{BASE}/scripts/balas_telegram.py', '--jaga'],
                stdout=lf, stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL, start_new_session=True)
        log('AKSI: daemon --jaga dihidupkan oleh supervisor')
    except Exception as e:
        log('ERR hidupkan: ' + repr(e))


def commit_file(path_repo, konten: bytes, msg: str):
    tok = open(TOK).read().strip()
    api = f'https://api.github.com/repos/{REPO}/contents/{path_repo}'
    h = {'Authorization': 'Bearer ' + tok,
         'Accept': 'application/vnd.github+json',
         'User-Agent': 'supervisor-v9'}
    sha = None
    try:
        d = json.load(urllib.request.urlopen(
            urllib.request.Request(api, headers=h), timeout=30))
        sha = d.get('sha')
    except Exception:
        pass
    body = {'message': msg,
            'content': base64.b64encode(konten).decode()}
    if sha:
        body['sha'] = sha
    h2 = dict(h)
    h2['Content-Type'] = 'application/json'
    r = urllib.request.urlopen(urllib.request.Request(
        api, data=json.dumps(body).encode(), headers=h2, method='PUT'),
        timeout=30)
    return r.status


def gap_denyt():
    try:
        n = open(NYALA).read().strip().split()[0]
        return time.time() - float(n)
    except Exception:
        return 99999.0


def jalan():
    log('SUPERVISOR v9 MULAI (otak z.ai) - anti-stuck + anti-hilang')
    last_snap = 0.0
    while True:
        try:
            now = time.time()
            with open(SUP_NYALA, 'w') as f:
                f.write(str(now))
            if (not daemon_hidup()) or gap_denyt() > 60:
                hidupkan()
            if now - last_snap > SNAP_EVERY:
                st1 = commit_file('benteng/snapshot/worklog.md',
                                  open(f'{BASE}/worklog.md', 'rb').read(),
                                  'snapshot worklog (supervisor v9)')
                st2 = commit_file('benteng/snapshot/supervisor.py',
                                  open(f'{BASE}/scripts/supervisor.py', 'rb').read(),
                                  'snapshot supervisor (self-backup)')
                try:
                    st3 = commit_file('benteng/snapshot/last_heartbeat.txt',
                                      open(f'{BASE}/data/last_heartbeat', 'rb').read(),
                                      'snapshot denyut jantung')
                except Exception:
                    st3 = 0
                log(f'SNAPSHOT commit: {st1}/{st2}/{st3}')
                last_snap = now
        except Exception as e:
            log('ERR loop: ' + repr(e))
        time.sleep(15)


if __name__ == '__main__':
    jalan()
