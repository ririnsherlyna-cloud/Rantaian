#!/usr/bin/env python3
# Bedah peluber horizontal arena.html di viewport 360px
import json
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_context(viewport={'width':360,'height':740}, device_scale_factor=2, is_mobile=True).new_page()
    pg.goto('https://ririnsherlyna-cloud.github.io/Micaprofita-/arena.html', wait_until='domcontentloaded', timeout=45000)
    pg.wait_for_timeout(8000)
    culprits = pg.evaluate("""(() => {
      const out=[]; const doc=document.documentElement;
      for(const el of document.querySelectorAll('*')){
        const r=el.getBoundingClientRect();
        if(r.width>362 || r.right>362 || r.left<-2){
          if(el.children.length>6) continue; // cari daun dulu
          out.push({tag:el.tagName, id:el.id||'', cls:(el.className+'').slice(0,60),
            w:Math.round(r.width), l:Math.round(r.left), rgt:Math.round(r.right),
            teks:(el.textContent||'').trim().slice(0,60)});
        }
        if(out.length>40) break;
      }
      // juga elemen terlebar berapa pun
      let mx=null, mw=0;
      for(const el of document.querySelectorAll('body *')){
        const r=el.getBoundingClientRect();
        if(r.width>mw){ mw=r.width; mx={tag:el.tagName,id:el.id||'',cls:(el.className+'').slice(0,60),w:Math.round(r.width),l:Math.round(r.left),rgt:Math.round(r.right)}; }
      }
      return {scrollW:document.documentElement.scrollWidth, out, terlebar:mx};
    })()""")
    print(json.dumps(culprits, ensure_ascii=False, indent=1))
    b.close()
