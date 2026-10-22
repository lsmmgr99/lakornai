/* LakornAI mockup interactions */
(function () {
  var D = window.LAKORN || { series: [], genres: [] };
  var ROOT = document.body.dataset.root || '';
  var PAGE = document.body.dataset.page;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var BY = {}; D.series.forEach(function (s) { BY[s.slug] = s; });
  var GL = {}; D.genres.forEach(function (g) { GL[g.slug] = g.label; });

  function store(k, v) {
    try {
      if (v === undefined) { var x = localStorage.getItem('lakorn.' + k); return x ? JSON.parse(x) : null; }
      localStorage.setItem('lakorn.' + k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  var tt;
  function toast(m) { var t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('show'); }, 1900); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function poster(s, cls, label) {
    return '<div class="poster has-img ' + (cls || '') + '" style="--c1:' + s.c1 + ';--c2:' + s.c2 + ';background-image:url(' + ROOT + 'assets/covers/' + s.slug + '.webp)" role="img" aria-label="ภาพปก ' + esc(s.title) + '"><span class="ai">AI</span>' + (label === false ? '' : '<span class="pt">' + esc(s.title) + '</span>') + '</div>';
  }

  /* ---------- follow ---------- */
  var follows = store('follows') || D.following.slice();
  function paintFollow() {
    $$('[data-follow]').forEach(function (b) {
      var on = follows.indexOf(b.dataset.follow) > -1;
      b.setAttribute('aria-pressed', on);
      var label = b.querySelector('span:not(:first-child), em') || b.querySelector('span');
      var txt = b.querySelector('em') || b.querySelector('span:last-child');
      if (txt && !txt.querySelector('svg')) txt.textContent = on ? 'ติดตามแล้ว' : 'ติดตาม';
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-follow]'); if (!b) return;
    e.preventDefault();
    var s = b.dataset.follow, i = follows.indexOf(s);
    if (i > -1) { follows.splice(i, 1); toast('เลิกติดตาม ' + BY[s].title); } else { follows.push(s); toast('ติดตาม ' + BY[s].title + ' แล้ว เราจะแจ้งเมื่อมีตอนใหม่'); }
    store('follows', follows); paintFollow();
  });
  paintFollow();

  /* ---------- home: filter new episodes by genre ---------- */
  var newList = $('#newList');
  if (newList) {
    $$('.chips [data-filter]').forEach(function (c) {
      c.addEventListener('click', function () {
        $$('.chips [data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x === c); });
        var g = c.dataset.filter, shown = 0;
        $$('.ep-row', newList).forEach(function (r) { var ok = g === 'all' || r.dataset.genres.split(' ').indexOf(g) > -1; r.hidden = !ok; if (ok) shown++; });
        $('#newEmpty').hidden = shown > 0;
      });
    });
  }

  /* ---------- search ---------- */
  if (PAGE === 'search') {
    var q = $('#q'), res = $('#results'), genre = 'all';
    function run() {
      var term = q.value.trim().toLowerCase();
      var list = D.series.filter(function (s) {
        var hay = (s.title + ' ' + s.hook + ' ' + s.cast.join(' ') + ' ' + s.genres.map(function (g) { return GL[g]; }).join(' ')).toLowerCase();
        return (genre === 'all' || s.genres.indexOf(genre) > -1) && (!term || hay.indexOf(term) > -1);
      });
      res.innerHTML = list.map(function (s) {
        return '<a class="card" href="series/' + s.slug + '.html">' + poster(s, 'v916') + '<div class="t">' + esc(s.title) + '</div><div class="m">' + s.eps + ' ตอน · ' + esc(s.status) + '</div></a>';
      }).join('');
      $('#noRes').hidden = list.length > 0;
      $('#recentWrap').hidden = !!term;
      $('#resCount').textContent = term || genre !== 'all' ? 'ผลการค้นหา ' + list.length + ' เรื่อง' : 'ทุกเรื่อง';
    }
    q.addEventListener('input', run);
    $$('#searchChips [data-filter]').forEach(function (c) {
      c.addEventListener('click', function () { $$('#searchChips [data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x === c); }); genre = c.dataset.filter; run(); });
    });
    $$('[data-q]').forEach(function (b) { b.addEventListener('click', function () { q.value = b.dataset.q; run(); q.focus(); }); });
    run();
  }

  /* ---------- series: episode range tabs ---------- */
  var tabs = $$('.ep-tabs [data-range]');
  if (tabs.length) {
    function showRange(btn) {
      tabs.forEach(function (x) { x.setAttribute('aria-pressed', x === btn); });
      var r = btn.dataset.range.split('-').map(Number);
      $$('#epGrid .ep').forEach(function (a) { var n = +a.dataset.n; a.hidden = n < r[0] || n > r[1]; });
    }
    tabs.forEach(function (b) { b.addEventListener('click', function () { showRange(b); }); });
    var cur = $('#epGrid .ep.cur');
    var start = cur ? tabs.filter(function (b) { var r = b.dataset.range.split('-').map(Number); return +cur.dataset.n >= r[0] && +cur.dataset.n <= r[1]; })[0] : tabs[0];
    showRange(start || tabs[0]);
  }

  /* ---------- watch ---------- */
  if (PAGE === 'watch') {
    var s = BY[document.body.dataset.slug], player = $('#player'), timer = null, t = 0, dur = 0, ep = 1;
    function secs(d) { var p = d.split(':'); return +p[0] * 60 + +p[1]; }
    function fmt(x) { return Math.floor(x / 60) + ':' + String(Math.floor(x % 60)).padStart(2, '0'); }
    function epFromHash() { var m = location.hash.match(/^#ep(\d+)$/); var n = m ? +m[1] : (D.cont[s.slug] || 1); return Math.min(Math.max(n, 1), s.eps); }
    function stop() { clearInterval(timer); timer = null; player.classList.remove('playing'); $('#playBtn').setAttribute('aria-label', 'เล่น'); }
    function paint() {
      $('#bar').style.width = (dur ? t / dur * 100 : 0) + '%';
      $('#tNow').textContent = fmt(t);
      $('#subLine').textContent = timer ? D.subs[(ep + Math.floor(t / 4)) % D.subs.length] : '';
    }
    function load(n) {
      stop(); ep = n; t = 0;
      var e = s.episodes[n - 1]; dur = secs(e[1]);
      $('#epLabel').textContent = 'EP.' + n + ' / ' + s.eps;
      $('#epTitle').textContent = 'EP.' + n + ' ' + e[0];
      $('#tDur').textContent = e[1];
      document.title = s.title + ' EP.' + n + ' · LakornAI';
      var nx = s.episodes[n];
      $('#nextWrap').innerHTML = nx ? '<a class="next-card" href="#ep' + (n + 1) + '">' + poster(s, '', false) + '<div><small>ตอนถัดไป</small><b>EP.' + (n + 1) + ' ' + esc(nx[0]) + '</b><small>' + nx[1] + ' นาที' + (nx[2] ? '' : ' · สำหรับสมาชิก') + '</small></div><svg class="chev" viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg></a>'
        : '<div class="next-card"><div><small>จบเรื่องแล้ว</small><b>ดูครบ ' + s.eps + ' ตอนแล้ว</b><small><a href="../popular.html" style="color:var(--accent)">ดูเรื่องยอดนิยมต่อ</a></small></div></div>';
      $('#watchEps').innerHTML = s.episodes.map(function (x, i) {
        var k = i + 1; return '<a class="ep' + (k === n ? ' cur' : '') + (k < n ? ' done' : '') + (x[2] ? '' : ' lock') + '" href="#ep' + k + '" aria-current="' + (k === n) + '">' + k + '<small>' + x[1] + '</small></a>';
      }).join('');
      paint();
    }
    function play() {
      if (!s.episodes[ep - 1][2]) { toast('ตอนนี้สำหรับสมาชิก (ตัวอย่าง: เล่นให้ดูได้)'); }
      player.classList.add('playing'); $('#playBtn').setAttribute('aria-label', 'หยุดชั่วคราว');
      timer = setInterval(function () {
        t += 1; if (t >= dur) { stop(); t = dur; paint(); if (ep < s.eps) { toast('กำลังเล่นตอนถัดไป'); setTimeout(function () { location.hash = 'ep' + (ep + 1); }, 900); } return; }
        paint();
      }, 1000 / 6); /* mock: plays at 6x speed */
      paint();
    }
    $('#playBtn').addEventListener('click', function () { timer ? stop() : play(); paint(); });
    $('#toEps').addEventListener('click', function () { $('#epSection').scrollIntoView({ behavior: 'smooth' }); });
    $('#shareBtn').addEventListener('click', function () {
      var url = location.href;
      try { navigator.clipboard.writeText(url).then(function () { toast('คัดลอกลิงก์ตอนนี้แล้ว'); }, function () { toast(url); }); } catch (e) { toast(url); }
    });
    window.addEventListener('hashchange', function () { load(epFromHash()); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    load(epFromHash());
  }

  /* ---------- contact ---------- */
  var form = $('#contactForm');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = $$('[required]', form).filter(function (f) { return !f.value.trim(); });
    if (bad.length) { bad[0].focus(); toast('กรุณากรอก' + bad[0].previousElementSibling.textContent); return; }
    toast('ส่งข้อความแล้ว ทีมงานจะตอบกลับทางอีเมล (ตัวอย่าง)');
  });
})();
