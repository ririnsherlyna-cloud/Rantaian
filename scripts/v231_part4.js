
  /* ============================================================
     UI — KARTU "V231 SAKTI · ORGAN HIDUP" (jendela saja; inti
     berjalan sendiri). Dipasang di RUANG BELAJAR setelah kartu
     v230-agen. Auto-paint tiap 6 dtk.
     ============================================================ */
  var UI = { built: false, tries: 0, lastHtml: '', uji: null };

  function mountStyle() {
    if (byId('v231-style')) return;
    var st = newEl('style'); st.id = 'v231-style';
    st.textContent =
      '.v231-card{border:1px solid rgba(74,222,128,.25);border-radius:11px;background:rgba(74,222,128,.04);padding:10px 12px;margin:10px 0;}' +
      '.v231-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}' +
      '.v231-ttl{font:700 11px Consolas,monospace;letter-spacing:2px;color:#4ade80;}' +
      '.v231-sub{font-size:9px;color:#7a8494;letter-spacing:.6px;}' +
      '.v231-nilai{margin-left:auto;font:700 11px Consolas,monospace;letter-spacing:1px;}' +
      '.v231-organ{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:6px;margin:8px 0;}' +
      '.v231-org{border:1px solid rgba(74,222,128,.18);border-radius:8px;padding:6px 8px;background:rgba(10,14,18,.5);}' +
      '.v231-org .o{font:700 8px Consolas,monospace;letter-spacing:1.5px;color:#3f9e63;}' +
      '.v231-org .v{font-size:10px;color:#d3f4e0;margin-top:3px;line-height:1.4;}' +
      '.v231-org .v small{display:block;font-size:8.5px;color:#7a8494;}' +
      '.v231-dok{font-size:10px;line-height:1.55;color:#cfe8d8;margin:6px 0 2px;}' +
      '.v231-dok b{color:#4ade80;font:700 8.5px Consolas,monospace;letter-spacing:1.2px;}' +
      '.v231-anti{font-size:10px;line-height:1.5;color:#f0c9b8;margin:4px 0;}' +
      '.v231-anti b{color:#fb923c;font:700 8.5px Consolas,monospace;letter-spacing:1.2px;}' +
      '.v231-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:7px;}' +
      '.v231-chip{font:600 8.5px Consolas,monospace;letter-spacing:.8px;color:#9fd8b4;border:1px solid rgba(74,222,128,.28);border-radius:6px;padding:3px 7px;background:rgba(74,222,128,.06);}' +
      '.v231-btn{font:700 9px Consolas,monospace;letter-spacing:1.2px;color:#052e16;background:#4ade80;border-radius:7px;padding:5px 11px;border:none;cursor:pointer;}' +
      '.v231-btn:hover{filter:brightness(1.08);}' +
      '.v231-j{font-size:9px;color:#8fa898;line-height:1.6;margin-top:5px;max-height:64px;overflow:hidden;}' +
      '.v231-ok{color:#4ade80;} .v231-warn{color:#fbbf24;} .v231-bad{color:#f87171;}' +
      '@media(max-width:860px){.v231-organ{grid-template-columns:repeat(2,1fr);}}';
    Document.prototype.appendChild.call(document.head, st);
  }

  function organHtml(st) {
    var m = st.ingatan, e = st.evolusi, h = st.nafas, g = st.guru;
    function organ(nama, isi, kelas) {
      return '<div class="v231-org"><div class="o">' + nama + '</div><div class="v' + (kelas ? ' ' + kelas : '') + '">' + isi + '</div></div>';
    }
    var html = '';
    html += organ('NAFAS · DATA REAL', h.aktif + '/' + h.total + ' feed' + '<small>rezim ' + esc(h.regime) + ' — ' + esc(h.regimeAlasan) + '</small>', h.aktif >= 4 ? 'v231-ok' : 'v231-warn');
    html += organ('INGATAN · TERKOMPRESI', kb(m.byte) + ' / ' + kb(m.budget) + '<small>dedup ' + m.dedup + ' · lipat ' + m.lipat + ' · rasio ×' + m.rasio + '</small>', m.pct < 85 ? 'v231-ok' : 'v231-warn');
    html += organ('EVOLUSI · REVOLUSI DIRI', 'gen ' + e.gen + ' · rev ' + CORE.rev + '<small>genome teraplikasi ' + e.terapan + '× pada ' + esc(e.rezim) + '</small>');
    html += organ('GURU · DOKTRIN', g.doktrin.length + ' ajaran · ' + g.antipola.length + ' anti-pola' + '<small>' + (g.pelajaran[0] ? esc(String(g.pelajaran[0].teks).slice(0, 64)) + '…' : 'mengumpulkan bukti…') + '</small>');
    html += organ('JIWA · IRAMA', st.siklus + ' denyut · umur ' + st.umurJam + ' jam' + '<small>' + (st.denyut && st.denyut.langkah ? st.denyut.langkah.length + ' langkah/putaran' : 'menyala…') + '</small>');
    return html;
  }

  function paintCard() {
    var root = byId('v231-card-body');
    if (!root) return;
    var st = window.V231_Jiwa.status();
    var html = '';
    html += '<div class="v231-head"><span class="v231-ttl">V231 SAKTI — ORGAN HIDUP</span>' +
      '<span class="v231-sub">cyborg guru trader · fokus crypto · arah biner BUY/SELL</span>' +
      '<span class="v231-nilai ' + (st.guru.nilai >= 70 ? 'v231-ok' : st.guru.nilai >= 45 ? 'v231-warn' : 'v231-bad') + '">Kesehatan ' + st.guru.nilai + '/100</span></div>';
    html += '<div class="v231-organ">' + organHtml(st) + '</div>';
    var dok = st.guru.doktrin.slice(0, 2).map(function (d) { return '<div>▸ ' + esc(d.teks) + ' <span style="color:#5a7f68">[' + esc(d.bukti) + ']</span></div>'; }).join('');
    html += '<div class="v231-dok"><b>DOKTRIN GURU</b>' + (dok || '<div>▸ Mengumpulkan bukti vonis — doktrin lahir dari akurasi nyata, bukan opini.</div>') + '</div>';
    var anti = st.guru.antipola.slice(0, 2).map(function (d) { return '<div>✕ ' + esc(d.teks) + ' <span style="color:#8a6a58">[' + esc(d.bukti) + ']</span></div>'; }).join('');
    if (anti) html += '<div class="v231-anti"><b>ANTI-POLA</b>' + anti + '</div>';
    var ch = [
      'feed ' + st.nafas.aktif + '/' + st.nafas.total,
      'memori ' + Math.round(st.ingatan.pct) + '%',
      'dedup ' + st.ingatan.dedup,
      'gen ' + st.evolusi.gen,
      'rev ' + CORE.rev,
      'teraplikasi ' + st.evolusi.terapan + '×'
    ];
    html += '<div class="v231-row">' + ch.map(function (c) { return '<span class="v231-chip">' + esc(c) + '</span>'; }).join('') +
      '<button class="v231-btn" id="v231-uji">UJI SAKTI</button></div>';
    if (UI.uji) {
      var rows = UI.uji.langkah.map(function (l) {
        return '<div style="font-size:9px;color:' + (l.ok ? '#9fd8b4' : '#f87171') + '">' + esc(l.fase) + ': ' + esc(l.ringkas) + '</div>';
      }).join('');
      html += '<div class="v231-j">UJI SAKTI (' + UI.uji.ms + 'ms):' + rows + '</div>';
    }
    var jrn = CORE.jurnal.slice(0, 4).map(function (j) {
      return '<div>· ' + esc(j.jenis) + ' — ' + esc(j.teks) + '</div>';
    }).join('');
    if (jrn) html += '<div class="v231-j">JURNAL HIDUP:' + jrn + '</div>';
    if (html !== UI.lastHtml) {
      root.innerHTML = html;
      UI.lastHtml = html;
      var b = byId('v231-uji');
      if (b) b.addEventListener('click', function () {
        b.textContent = 'MENGUJI…'; b.disabled = true;
        siklusUji().then(function (r) {
          UI.uji = r; paintCard();
        }).catch(function (e) {
          UI.uji = { t: now(), ms: 0, langkah: [{ fase: 'UJI', ok: 0, ringkas: 'gagal: ' + (e && e.message ? e.message : e) }] };
          paintCard();
        });
      });
    }
  }

  function buildUI() {
    if (UI.built) return true;
    var root = byId('v217-root');
    if (!root) return false;
    var bel = null;
    try { bel = root.querySelector('.v217-pg[data-k="belajar"] .wrap'); } catch (e) {}
    if (!bel) return false;
    var card = byId('v231-card');
    if (!card) {
      card = newEl('div'); card.className = 'v217-card'; card.id = 'v231-card';
      var body = newEl('div'); body.id = 'v231-card-body';
      card.appendChild(body);
      var anchor = byId('v230-agen');
      if (anchor && anchor.parentNode === bel) bel.insertBefore(card, anchor.nextSibling);
      else bel.appendChild(card);
    }
    UI.built = true;
    mountStyle();
    paintCard();
    return true;
  }

  /* ---------------- BOOT ---------------- */
  var bootTries = 0;
  function boot() {
    var butuh = api('V229_Kiblat') && api('V207_Jarvis') && api('ScalpingDirectionEngine');
    if (!butuh) { if (bootTries++ < 120) setTimeout(boot, 1000); return; }
    muatCore();

    /* 1. EVOLUSI membungkus mesin arah — TUNGGU wrapper V228/V229
       terpasang dulu agar genome benar-benar lapisan TERLUAR.
       Batas tunggu 12 dtk: kalau belum juga, pasang saja (urutan
       multiplikatif — hasil tetap benar, hanya urutan log). */
    var terpasang = EVOLUSI.terapkan();
    var evoTunggu = 0;
    if (!terpasang) {
      var tungguEvo = setInterval(function () {
        evoTunggu++;
        var SE = api('ScalpingDirectionEngine');
        var siap = SE && SE.__v229ben && !SE.__v231evo;
        if (siap || evoTunggu >= 10) {
          clearInterval(tungguEvo);
          terpasang = EVOLUSI.terapkan();
          if (terpasang) catat('evolusi', 'genome terbentang di lapisan terluar computeAdaptiveWeights');
        }
      }, 1200);
    }

    /* 2. napas pertama: seluruh feed */
    NAFAS.refreshAll().then(function () {
      var h = NAFAS.health();
      catat('lahir', 'SAKTI hidup: feed ' + h.aktif + '/' + h.total + ' · rezim ' + h.regime);
      /* 3. denyut pertama: panen + evolusi + kurasi + guru */
      return denyutHidup('boot');
    }).then(function () {
      if (!CORE.lahirSay) {
        CORE.lahirSay = 1;
        simpanCore();
        bilang('V231 SAKTI hidup: 5 organ aktif — ingatan terkompresi tanpa overlap, evolusi diri per rezim, doktrin guru dari bukti vonis. Arah tetap biner: BUY atau SELL.');
      } else {
        bilang('V231 SAKTI terbangun kembali: siklus ' + CORE.siklus + ' · revolusi ' + CORE.rev + ' · gen ' + EVOLUSI.status().gen + '.');
      }
      paintCard();
    }).catch(function (e) {
      catat('galat', 'boot: ' + String(e && e.message || e));
    });

    /* 4. IRAMA — 30 dtk (terlihat) / 90 dtk (tersembunyi) */
    JIWA.timer = setInterval(function () {
      if (!document.hidden) denyutHidup('auto');
    }, 30e3);
    JIWA.timerLambat = setInterval(function () {
      if (document.hidden) denyutHidup('lambat');
    }, 90e3);
    try { document.addEventListener('visibilitychange', function () { JIWA.hidden = !!document.hidden; if (!document.hidden) setTimeout(function () { denyutHidup('bangun'); }, 2500); }, { passive: true }); } catch (e) {}

    /* 5. UI — tunggu ruang belajar siap (kartu V230 dipasang dgn retry) */
    var uiTries = 0;
    (function tungguUI() {
      if (buildUI() && uiTries < 60) { /* built */ }
      if (!UI.built && uiTries++ < 60) setTimeout(tungguUI, 500);
    })();
    setInterval(function () { if (!UI.built) buildUI(); else paintCard(); }, 6000);

    console.log('%c[V231] SAKTI aktif — 5 organ: NAFAS(data real) INGATAN(kompresi+dedup) EVOLUSI(genome×rezim) GURU(doktrin) JIWA(irama 30dtk) · evolusi terpasang: ' + (terpasang ? 'YA (wrapper terluar)' : 'menunggu engine'), 'color:#4ade80;font-weight:bold');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 2000); });
  } else { setTimeout(boot, 2000); }
})();
</script>
