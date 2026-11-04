#!/usr/bin/env python3
# JEPRET V287 — screenshot desktop / mobile / overlay utk verifikasi visual
import subprocess, time, os
from playwright.sync_api import sync_playwright
MIRROR='/home/z/my-project/hidup_repo'; PORT=8944
srv=subprocess.Popen(['python3','-m','http.server',str(PORT),'-d',MIRROR],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1.2)
URL=f'http://127.0.0.1:{PORT}/hidup.html'
os.makedirs('/home/z/my-project/research', exist_ok=True)
try:
  with sync_playwright() as p:
    br=p.chromium.launch()
    pg=br.new_page(viewport={'width':1440,'height':900})
    pg.goto(URL); pg.wait_for_timeout(9000)
    pg.screenshot(path='/home/z/my-project/research/v87-desktop.png')
    # overlay terbuka desktop
    pg.click('#pintu'); pg.wait_for_timeout(900)
    pg.screenshot(path='/home/z/my-project/research/v87-overlay.png')
    pg.click('#pintu'); pg.wait_for_timeout(600)
    # dekatkan pointer ke makhluk utk label
    nx=pg.evaluate("__v287.NADI.x"); ny=pg.evaluate("__v287.NADI.y")
    pg.mouse.move(nx+40, ny+10); pg.wait_for_timeout(800)
    pg.screenshot(path='/home/z/my-project/research/v87-dekat.png')
    pgm=br.new_page(viewport={'width':390,'height':844})
    pgm.goto(URL); pgm.wait_for_timeout(8000)
    pgm.screenshot(path='/home/z/my-project/research/v87-mobile.png')
    pgm.click('#pintu'); pgm.wait_for_timeout(900)
    pgm.screenshot(path='/home/z/my-project/research/v87-mobile-overlay.png')
    br.close()
finally:
  srv.terminate()
print('jepret selesai')
