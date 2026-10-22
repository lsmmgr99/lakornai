/* ============================================================================
   LakornAI — โค้ดรันไทม์ของเว็บจริง
   สร้างโดย build/build.mjs (ต้นฉบับ: build/app.src.js) — อย่าแก้ assets/app.js ตรง ๆ

   หัวใจของไฟล์นี้คือ "ดูต่อจากรายการค้างล่าสุด" (AIO-22 AC-2)
   สัญญาข้อมูลที่เก็บใน localStorage ทั้งหมด:

     lakorn.v        1                      เลขเวอร์ชันของ schema (ไว้ย้ายข้อมูลวันหน้า)
     lakorn.cont     { slug: {ep,sec,dur,ts} }   ตอนและ "ตำแหน่งในตอน" ที่ค้างไว้
     lakorn.done     { slug: ts }           เรื่องที่ดูจบแล้ว (ออกจากรายการค้าง)
     lakorn.follows  [ slug ]               เรื่องที่ติดตาม
     lakorn.history  [ {slug,ep,ts} ]       ประวัติการดู ใหม่สุดอยู่หน้าสุด สูงสุด 60 รายการ
     lakorn.prefs    [ genreSlug ]          แนวที่เลือกตอน onboarding
     lakorn.set      { autoplay,sound,subs,notify }

   ไม่มีค่าเริ่มต้นที่เขียนมือแม้ตัวเดียว — เบราว์เซอร์ใหม่ = รายการว่าง = หน้าว่างที่ออกแบบไว้
   ============================================================================ */
(function () {
  'use strict';

  var D = window.LAKORN || { series: [], genres: [], tropes: [] };
  var BODY = document.body;
  var ROOT = BODY.dataset.root || '';
  var PAGE = BODY.dataset.page || '';
  var BY = {}; D.series.forEach(function (s) { BY[s.slug] = s; });
  var GL = {}; D.genres.forEach(function (g) { GL[g.slug] = g.label; });

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function url(p) { return ROOT + String(p).replace(/^\//, ''); }
  function cover(s) { return url(s.cover || ('assets/covers/' + s.slug + '.webp')); }
  function secs(mmss) { var p = String(mmss).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function fmt(x) { return Math.floor(x / 60) + ':' + String(Math.floor(x % 60)).padStart(2, '0'); }

  /* ======================= 1. ที่เก็บข้อมูล ======================= */
  var NS = 'lakorn.';
  var memory = {};                 /* สำรองเมื่อ localStorage ใช้ไม่ได้ (โหมดส่วนตัวบางตัว) */
  var canStore = (function () {
    try { localStorage.setItem(NS + 'probe', '1'); localStorage.removeItem(NS + 'probe'); return true; }
    catch (e) { return false; }
  })();

  function read(key, dflt) {
    try {
      var raw = canStore ? localStorage.getItem(NS + key) : memory[key];
      if (raw == null) return dflt;
      var v = JSON.parse(raw);
      return v == null ? dflt : v;
    } catch (e) { return dflt; }
  }
  function save(key, value) {
    var raw = JSON.stringify(value);
    try { if (canStore) localStorage.setItem(NS + key, raw); else memory[key] = raw; }
    catch (e) { memory[key] = raw; }
  }
  function wipe() {
    try {
      if (canStore) {
        Object.keys(localStorage).filter(function (k) { return k.indexOf(NS) === 0; })
          .forEach(function (k) { localStorage.removeItem(k); });
      }
    } catch (e) { /* ไม่มีอะไรให้ทำต่อ */ }
    memory = {};
  }
  save('v', 1);

  /* ======================= 2. ความคืบหน้าการดู (AC-2) ======================= */
  var Progress = {
    all: function () { return read('cont', {}) || {}; },
    done: function () { return read('done', {}) || {}; },

    get: function (slug) {
      var e = this.all()[slug];
      return e && BY[slug] ? e : null;
    },

    /* เขียนกลับทั้ง "เลขตอน" และ "ตำแหน่งในตอน"
       เรียกเมื่อเปลี่ยนตอน และเรียกเป็นช่วง ๆ ขณะเล่น (throttle ที่ผู้เรียก) */
    set: function (slug, ep, sec, dur) {
      var s = BY[slug]; if (!s) return;
      var cont = this.all();
      cont[slug] = {
        ep: Math.min(Math.max(ep | 0, 1), s.eps),
        sec: Math.max(0, Math.round(sec || 0)),
        dur: Math.max(1, Math.round(dur || secs(s.episodes[ep - 1] ? s.episodes[ep - 1][1] : '1:00'))),
        ts: Date.now()
      };
      save('cont', cont);
      /* กลับมาดูใหม่หลังเคยดูจบ → ออกจากชั้น "ดูจบแล้ว" */
      var dn = this.done();
      if (dn[slug]) { delete dn[slug]; save('done', dn); }
      this.pushHistory(slug, ep);
    },

    /* ดูจบตอนสุดท้ายของเรื่อง → ออกจากรายการค้าง ไปโผล่ที่ "ดูจบแล้ว" */
    finish: function (slug) {
      var cont = this.all();
      delete cont[slug];
      save('cont', cont);
      var dn = this.done();
      dn[slug] = Date.now();
      save('done', dn);
    },

    remove: function (slug) {
      var cont = this.all();
      delete cont[slug];
      save('cont', cont);
    },

    pushHistory: function (slug, ep) {
      var h = read('history', []) || [];
      h = h.filter(function (x) { return !(x.slug === slug && x.ep === ep); });
      h.unshift({ slug: slug, ep: ep, ts: Date.now() });
      save('history', h.slice(0, 60));
    },

    /* รายการค้าง เรียง "ล่าสุดอยู่บนสุด" — คำของลูกค้าเอง */
    list: function () {
      var cont = this.all(), dn = this.done(), out = [];
      for (var slug in cont) {
        if (!Object.prototype.hasOwnProperty.call(cont, slug)) continue;
        var s = BY[slug], e = cont[slug];
        if (!s || !e || dn[slug]) continue;
        var ep = Math.min(Math.max(e.ep | 0, 1), s.eps);
        var dur = e.dur > 0 ? e.dur : secs(s.episodes[ep - 1][1]);
        var pct = Math.max(0, Math.min(100, Math.round((e.sec || 0) / dur * 100)));
        out.push({ s: s, ep: ep, sec: e.sec || 0, dur: dur, pct: pct, ts: e.ts || 0 });
      }
      return out.sort(function (a, b) { return b.ts - a.ts; });
    },

    doneList: function () {
      var dn = this.done(), out = [];
      for (var slug in dn) {
        if (Object.prototype.hasOwnProperty.call(dn, slug) && BY[slug]) out.push({ s: BY[slug], ts: dn[slug] });
      }
      return out.sort(function (a, b) { return b.ts - a.ts; });
    },

    /* ลิงก์ "ดูต่อ" ของเรื่องหนึ่ง — ต่อจากตอนและตำแหน่งเดิม ไม่ใช่ต้นตอน */
    resumeHref: function (slug) {
      var e = this.get(slug);
      var ep = e ? Math.min(Math.max(e.ep | 0, 1), BY[slug].eps) : 1;
      var at = e && e.sec > 2 ? '?t=' + Math.round(e.sec) : '';
      return url('watch/' + slug + '/ep-' + ep + '/') + at;
    },
    resumeLabel: function (slug) {
      var e = this.get(slug);
      return e ? 'ดูต่อ EP.' + e.ep : 'เริ่มดู EP.1';
    }
  };

  /* ======================= 3. toast ======================= */
  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 4200);
  }

  /* ======================= 4. ติดตาม ======================= */
  var follows = read('follows', []) || [];
  function paintFollow() {
    $$('[data-follow]').forEach(function (b) {
      var on = follows.indexOf(b.dataset.follow) > -1;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      var txt = b.querySelector('em');
      if (txt) txt.textContent = on ? 'ติดตามแล้ว' : 'ติดตาม';
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-follow]');
    if (!b) return;
    e.preventDefault();
    var slug = b.dataset.follow, s = BY[slug]; if (!s) return;
    var i = follows.indexOf(slug);
    if (i > -1) { follows.splice(i, 1); toast('เลิกติดตาม ' + s.title); }
    else {
      follows.push(slug);
      var first = !read('toldLocal', false);
      toast('ติดตาม ' + s.title + ' แล้ว' + (first ? ' · บันทึกไว้ในเครื่องนี้' : ''));
      if (first) save('toldLocal', true);
    }
    save('follows', follows);
    paintFollow();
    if (PAGE === 'home') paintFollowRail();
    if (PAGE === 'library') renderLibrary();
    if (PAGE === 'notifications') renderNotifications();
  });

  /* ======================= 5. แชร์ ======================= */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-share]');
    if (!b) return;
    e.preventDefault();
    var link = location.href.split('#')[0];
    if (navigator.share) { navigator.share({ url: link }).catch(function () {}); return; }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(
        function () { toast('คัดลอกลิงก์แล้ว'); },
        function () { toast(link); });
    } else toast(link);
  });

  /* ======================= 6. การ์ด "ดูต่อ" ======================= */
  function contCardHtml(it) {
    var s = it.s;
    return '<a class="cont" href="' + Progress.resumeHref(s.slug) + '">'
      + '<span class="thumb">'
      + '<img src="' + cover(s) + '" width="1024" height="1536" alt="" loading="lazy" decoding="async" style="object-position:center 28%">'
      + '<span class="play"><i><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2 19 12 8 18.8z" fill="currentColor"/></svg></i></span>'
      + '<span class="ep num">EP.' + it.ep + '</span>'
      + '<span class="pbar"><i style="width:' + it.pct + '%"></i></span>'
      + '</span>'
      + '<span class="t">' + esc(s.title) + '</span>'
      + '<span class="m num">EP.' + it.ep + '/' + s.eps + ' · ดูไปแล้ว ' + it.pct + '%</span></a>';
  }

  function contRowHtml(it) {
    var s = it.s;
    return '<a class="controw" href="' + Progress.resumeHref(s.slug) + '">'
      + '<span class="th"><img src="' + cover(s) + '" width="1024" height="1536" alt="" loading="lazy" decoding="async">'
      + (it.ep === s.eps ? '<span class="last">ตอนสุดท้าย</span>' : '') + '</span>'
      + '<span class="bd"><b>' + esc(s.title) + '</b>'
      + '<span class="st num">EP.' + it.ep + '/' + s.eps + ' · ดูไปแล้ว ' + it.pct + '% ของตอนนี้</span>'
      + '<span class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + it.pct + '"'
      + ' aria-valuetext="EP.' + it.ep + ' จาก ' + s.eps + ' ตอน · ดูไปแล้ว ' + it.pct + '%">'
      + '<i style="width:' + it.pct + '%"></i></span></span>'
      + '<span class="go btn btn-sm btn-accent">ดูต่อ</span></a>';
  }

  function libCardHtml(it) {
    var s = it.s;
    return '<a class="card libcard" href="' + Progress.resumeHref(s.slug) + '">'
      + '<span class="poster" style="--c1:' + s.c1 + ';--c2:' + s.c2 + '">'
      + '<img src="' + cover(s) + '" width="1024" height="1536" alt="" loading="lazy" decoding="async">'
      + '<span class="scrim"></span><span class="epb num">EP.' + it.ep + '</span>'
      + '<span class="pbar"><i style="width:' + it.pct + '%"></i></span></span>'
      + '<span class="t">' + esc(s.title) + '</span>'
      + '<span class="m num">EP.' + it.ep + '/' + s.eps + ' · ' + it.pct + '%</span></a>';
  }

  function posterCardHtml(s, badge) {
    return '<a class="card" href="' + url('series/' + s.slug + '/') + '">'
      + '<span class="poster" style="--c1:' + s.c1 + ';--c2:' + s.c2 + '">'
      + '<img src="' + cover(s) + '" width="1024" height="1536" alt="" loading="lazy" decoding="async">'
      + (badge ? '<span class="tl">' + badge + '</span>' : '') + '</span>'
      + '<span class="t">' + esc(s.title) + '</span>'
      + '<span class="m">' + esc(GL[s.genres[0]] || '') + ' · ' + s.eps + ' ตอน</span></a>';
  }

  /* แถบ "ดูต่อจากที่ค้างไว้" บนหน้าแรกและหน้าออฟไลน์ — เขียนทับ HTML สถานะว่างเมื่อมีข้อมูลจริง */
  function paintContRail() {
    var box = $('#contRail'); if (!box) return;
    var list = Progress.list();
    if (!list.length) return;              /* ไม่มีอะไรค้าง → คงหน้าว่างที่ออกแบบไว้ */
    box.innerHTML = '<div class="rail-wrap">'
      + '<button class="rail-btn prev" aria-label="เลื่อนซ้าย" disabled></button>'
      + '<button class="rail-btn next" aria-label="เลื่อนขวา"></button>'
      + '<div class="rail wide">' + list.map(contCardHtml).join('') + '</div></div>';
    bindRails();
  }

  /* ปุ่มหลักที่ชี้ "ดูต่อ EP.n" — ใช้ทั้งบน hero หน้าแรกและหน้ารายละเอียดเรื่อง */
  function paintResumeButtons() {
    $$('[data-resume]').forEach(function (a) {
      var slug = a.dataset.resume;
      if (!BY[slug]) return;
      a.setAttribute('href', Progress.resumeHref(slug));
      var lb = a.querySelector('[data-resume-label]');
      if (lb) lb.textContent = Progress.resumeLabel(slug);
    });
  }

  /* สถานะช่องตอนในตาราง — "ดูแล้ว / กำลังดู" มาจากข้อมูลจริงของเครื่องนี้ */
  function paintEpGrid() {
    var grid = $('#epGrid'); if (!grid) return;
    var slug = grid.dataset.slug;
    var e = Progress.get(slug);
    var dn = Progress.done()[slug];
    var cur = e ? e.ep : 0;
    var watchedTo = dn ? (BY[slug] ? BY[slug].eps : 0) : Math.max(0, cur - 1);
    /* หน้ารับชมมี .cur มาจาก HTML อยู่แล้ว (คือตอนที่เปิดอยู่)
       หน้าเรื่องไม่มี เพราะ HTML ที่ส่งออกไม่รู้จักผู้ใช้ — ติดให้จากค่าที่บันทึกไว้ */
    var fixed = !!$('.ep.cur', grid);
    $$('.ep', grid).forEach(function (a) {
      var n = +a.dataset.n;
      a.classList.remove('done');
      if (!fixed) a.classList.toggle('cur', n === cur);
      var isCur = a.classList.contains('cur');
      if (n <= watchedTo && !isCur) a.classList.add('done');
      var base = a.getAttribute('aria-label').split(' · ')[0];
      a.setAttribute('aria-label', base + ' · ' + (isCur ? 'กำลังดู' : n <= watchedTo ? 'ดูแล้ว' : 'ยังไม่ได้ดู'));
    });
  }

  /* ======================= 7. rail + แท็บช่วงตอน ======================= */
  function bindRails() {
    $$('.rail-wrap').forEach(function (w) {
      var rail = $('.rail', w), prev = $('.rail-btn.prev', w), next = $('.rail-btn.next', w);
      if (!rail || !prev || !next || w.dataset.bound) return;
      w.dataset.bound = '1';
      function sync() {
        prev.disabled = rail.scrollLeft < 8;
        next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8;
      }
      prev.addEventListener('click', function () { rail.scrollBy({ left: -rail.clientWidth * 0.8, behavior: 'smooth' }); });
      next.addEventListener('click', function () { rail.scrollBy({ left: rail.clientWidth * 0.8, behavior: 'smooth' }); });
      rail.addEventListener('scroll', sync, { passive: true });
      sync();
    });
  }

  function bindEpTabs() {
    var tabs = $$('.ep-tabs [data-range]');
    if (!tabs.length) return;
    function show(btn) {
      tabs.forEach(function (x) { x.setAttribute('aria-selected', String(x === btn)); });
      var r = btn.dataset.range.split('-').map(Number);
      $$('#epGrid .ep').forEach(function (a) {
        var n = +a.dataset.n;
        a.hidden = n < r[0] || n > r[1];
      });
    }
    tabs.forEach(function (b) { b.addEventListener('click', function () { show(b); }); });
    var cur = $('#epGrid .ep.cur');
    var start = tabs[0];
    if (cur) {
      start = tabs.filter(function (b) {
        var r = b.dataset.range.split('-').map(Number);
        return +cur.dataset.n >= r[0] && +cur.dataset.n <= r[1];
      })[0] || tabs[0];
    }
    show(start);
  }

  /* ======================= 8. การตั้งค่า ======================= */
  var DEFAULT_SET = { autoplay: true, sound: false, subs: true, notify: true };
  function settings() {
    var s = read('set', null) || {};
    var out = {};
    for (var k in DEFAULT_SET) out[k] = (k in s) ? !!s[k] : DEFAULT_SET[k];
    return out;
  }

  /* ======================= 9. หน้ารับชม (AC-2 หัวใจ) ======================= */
  function initWatch() {
    var slug = BODY.dataset.slug, ep = +BODY.dataset.ep;
    var s = BY[slug]; if (!s) return;
    var player = $('#player'); if (!player) return;

    /* 9.1 — แมปลิงก์เก่าแบบ #ep<n> มาที่ path จริง
       ทำที่หน้าปลายทางเพราะ fragment ไม่ถูกส่งไปกับ HTTP request → 301 ฝั่งเซิร์ฟเวอร์ทำแทนไม่ได้ */
    var hash = location.hash.match(/^#ep(\d+)$/);
    if (hash) {
      var want = Math.min(Math.max(+hash[1], 1), s.eps);
      if (want !== ep) { location.replace(url('watch/' + slug + '/ep-' + want + '/')); return; }
      history.replaceState(null, '', location.pathname + location.search);
    }

    var dur = +player.dataset.dur || secs(s.episodes[ep - 1][1]);
    var nextHref = player.dataset.next || '';
    var seriesHref = player.dataset.series || '';
    var t = 0, timer = null, lastWrite = 0, lastWriteSec = -99, ended = false, epDone = false;

    /* 9.2 — กลับมาต่อจากตำแหน่งเดิม
       ?t=<วินาที> มาจากลิงก์ "ดูต่อ" · ถ้าไม่มี ใช้ค่าที่บันทึกไว้ของตอนนี้ */
    var qs = new URLSearchParams(location.search);
    var fromQuery = parseInt(qs.get('t'), 10);
    var saved = Progress.get(slug);
    /* ค่าที่ขอมาต้องอยู่ในช่วงของตอนนี้จริง ถ้าเกินความยาวตอน = ลิงก์หมดอายุ
       (วันที่มีไฟล์วิดีโอจริง ความยาวตอนจะเปลี่ยน ลิงก์ที่คนแชร์ไว้จะเกินทั้งหมด)
       ปฏิเสธทิ้งไปเลย ถอยไปใช้ค่าที่บันทึกไว้ — ถ้าหนีบเป็น dur-1 ตอนนั้นจะกลายเป็น
       "ดูไปแล้ว 99%" ทันทีที่เปิดหน้า ทั้งที่ผู้ใช้ไม่ได้ดู */
    var wanted = (!isNaN(fromQuery) && fromQuery > 0 && fromQuery < dur) ? fromQuery : 0;
    if (wanted) t = wanted;
    else if (saved && saved.ep === ep && saved.sec > 2 && saved.sec < dur - 2) t = saved.sec;
    if (t > 0) toast('ดูต่อจากนาทีที่ ' + fmt(t));

    var bar = $('#bar'), barWrap = $('#barWrap'), tNow = $('#tNow'), subLine = $('#subLine');
    var playBtn = $('#playBtn'), muteBtn = $('#muteBtn');
    var nextUp = $('#nextUp'), endCard = $('#endCard');

    function paint() {
      var pct = dur ? Math.min(100, t / dur * 100) : 0;
      if (bar) bar.style.width = pct + '%';
      if (barWrap) barWrap.setAttribute('aria-valuenow', String(Math.round(pct)));
      if (tNow) tNow.textContent = fmt(t);
      if (subLine) subLine.textContent = timer && D.subs.length
        ? D.subs[(ep + Math.floor(t / 4)) % D.subs.length] : '';
    }

    /* 9.3 — เขียนความคืบหน้ากลับ localStorage
       throttle 2 ชั้น: อย่างน้อย 5 วินาทีของเนื้อหา และอย่างน้อย 1 วินาทีจริง
       (เพลเยอร์จำลองเดิน 6 เฟรม/วินาที — เขียนทุก tick คือ 6 ครั้ง/วินาที ซึ่งมากเกินจำเป็น) */
    function persist(force) {
      /* ยามด่านเดียวของทุกเส้นทางที่เขียนความคืบหน้าของ "ตอนนี้" กลับ
         ถ้าตอนนี้ดูจบไปแล้ว จุดค้างถูกเลื่อนไปต้นตอนถัดไป (หรือเรื่องถูกย้ายไป "ดูจบแล้ว") แล้ว
         เขียนทับกลับจะดึงผู้ใช้ย้อนไปตอนที่ดูจบแล้ว และลบเรื่องออกจากชั้น "ดูจบแล้ว"
         วางยามไว้ที่นี่ที่เดียว ไม่แปะทีละตัวจัดการ — เส้นทางที่ "ตั้งใจดูตอนนี้ซ้ำ"
         ต้องปลดธง epDone ก่อนเอง (ดูตัวจัดการคลิกแถบเวลา) จึงจะเขียนได้ */
      if (epDone) return;
      var now = Date.now();
      if (!force && (now - lastWrite < 1000 || Math.abs(t - lastWriteSec) < 5)) return;
      lastWrite = now; lastWriteSec = t;
      Progress.set(slug, ep, t, dur);
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      player.classList.remove('playing');
      if (playBtn) playBtn.setAttribute('aria-label', 'เล่น');
      persist(true);
      paint();
    }

    function play() {
      if (ended) return;
      player.classList.add('playing');
      if (playBtn) playBtn.setAttribute('aria-label', 'หยุดชั่วคราว');
      persist(true);
      timer = setInterval(function () {
        t += 1;
        if (t >= dur) { t = dur; finishEpisode(); return; }
        persist(false);
        paint();
      }, 1000 / 6);    /* จำลองการเล่นที่ 6 เท่า — ยังไม่มีไฟล์วิดีโอจริงในระบบ */
      paint();
    }

    /* 9.4 — ดูจบตอน */
    function finishEpisode() {
      if (timer) { clearInterval(timer); timer = null; }
      player.classList.remove('playing');
      ended = true; epDone = true;
      paint();
      if (ep < s.eps) {
        /* จุดที่ควรดูต่อคือ "ต้นตอนถัดไป" — รายการค้างอัปเดตเองทันที */
        Progress.set(slug, ep + 1, 0, secs(s.episodes[ep][1]));
        showNextUp();
      } else {
        Progress.finish(slug);       /* ดูจบเรื่อง → ออกจากรายการค้าง ไปที่ "ดูจบแล้ว" */
        showEndCard();
      }
    }

    /* UX §6.26 — การ์ดตอนถัดไป นับถอยหลัง 5 วินาที (region + aria-live ไม่ใช่ dialog) */
    function showNextUp() {
      if (!nextUp || !nextHref) return;
      var nx = s.episodes[ep];
      var left = 5;
      var auto = settings().autoplay
        && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      /* สร้างโครงครั้งเดียว แล้วอัปเดตเฉพาะตัวเลขนับถอยหลัง
         ถ้า re-render ทั้งก้อนทุกวินาที โหนดปุ่มจะถูกทิ้งและสร้างใหม่ → โฟกัสเด้งไป <body>
         ทุกวินาที คนใช้คีย์บอร์ด Tab มาถึงปุ่ม "ยกเลิก" แล้วกด Enter ไม่ทัน
         ทั้งที่ UX §6.26 ให้ปุ่มนี้เป็นทางออกจากการเด้งอัตโนมัติ
         และ #nextUp เป็น aria-live จะประกาศการ์ดซ้ำ 5 รอบใน 5 วินาที
         ตัวเลขที่เดินอยู่ในวง aria-hidden → อัปเดตแล้วไม่ถูกประกาศซ้ำ */
      var tick = null;
      nextUp.setAttribute('aria-label', 'ตอนถัดไป EP.' + (ep + 1) + (auto ? ' เริ่มใน ' + left + ' วินาที' : ''));
      nextUp.innerHTML = '<div class="nh">'
        + (auto ? '<span class="ring" id="nuRing" style="--p:0%" aria-hidden="true"><b class="num" id="nuLeft">' + left + '</b></span>' : '')
        + '<span class="thumb"><img src="' + cover(s) + '" width="1024" height="1536" alt="" loading="lazy" decoding="async"></span>'
        + '<span class="nt"><b class="num">ตอนถัดไป · EP.' + (ep + 1) + '</b><span>' + esc(nx[0]) + ' · ' + nx[1] + ' นาที</span></span>'
        + '</div><div class="na">'
        + '<a class="btn btn-accent" href="' + nextHref + '">เล่นเลย</a>'
        + '<button class="btn btn-ghost" id="nuCancel">' + (auto ? 'ยกเลิก' : 'ปิด') + '</button></div>';

      /* ยกเลิก = หยุดนับถอยหลังและเก็บการ์ด แต่ "ตอนนี้ดูจบแล้ว" ยังเป็นจริง
         จึงไม่ปลด epDone — ไม่งั้นตอนออกจากหน้าจะเขียนทับจุดค้างกลับไปที่ตอนเดิม */
      var ring = $('#nuRing'), leftNum = $('#nuLeft');
      $('#nuCancel').addEventListener('click', function () {
        if (tick) clearInterval(tick);
        nextUp.hidden = true;
      });
      nextUp.hidden = false;

      tick = auto ? setInterval(function () {
        left -= 1;
        if (left <= 0) { clearInterval(tick); location.href = nextHref; return; }
        if (leftNum) leftNum.textContent = left;
        if (ring) ring.style.setProperty('--p', ((5 - left) / 5 * 100) + '%');
      }, 1000) : null;
    }

    /* UX §6.25 — การ์ดจบเรื่อง (dialog) · ห้ามเป็นทางตาย */
    function showEndCard() {
      if (!endCard) return;
      var pool = D.series.filter(function (x) {
        return x.slug !== slug && x.genres.some(function (g) { return s.genres.indexOf(g) > -1; });
      });
      if (!pool.length) pool = D.series.filter(function (x) { return x.slug !== slug; });
      var dn = Progress.done();
      var unseen = pool.filter(function (x) { return !dn[x.slug]; });
      var nextS = (unseen[0] || pool[0]);
      var similar = pool.filter(function (x) { return x.slug !== nextS.slug; }).slice(0, 6);

      endCard.hidden = false;
      endCard.innerHTML = '<div class="in">'
        + '<div class="ec-top"><span class="seal" aria-hidden="true">'
        + '<svg class="ico lg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8.2 12.2 2.6 2.6 5-5.4"/></svg></span>'
        + '<h3 id="ec-h">ดูจบแล้วทั้ง ' + s.eps + ' ตอน</h3>'
        + '<p>' + esc(s.title) + ' — เรื่องนี้ย้ายไปอยู่ในแท็บ “ดูจบแล้ว” ของคลังคุณแล้ว</p></div>'
        + '<a class="ec-next" href="' + url('watch/' + nextS.slug + '/ep-1/') + '">'
        + '<span class="thumb"><img src="' + cover(nextS) + '" width="1024" height="1536" alt="" loading="lazy" decoding="async"></span>'
        + '<span class="et"><span>ดูเรื่องถัดไป</span><b>' + esc(nextS.title) + '</b></span>'
        + '<svg class="ico" viewBox="0 0 24 24"><path d="M8 5.2 19 12 8 18.8z" fill="currentColor"/></svg></a>'
        + '<div class="ec-sec">'
        + '<button class="btn btn-ghost" data-follow="' + s.slug + '" aria-pressed="false"><em>ติดตาม</em></button>'
        + '<button class="btn btn-ghost" data-share>แชร์</button></div>'
        + (similar.length ? '<div class="ec-hr"></div><div class="ec-rail"><h4>เรื่องที่คล้ายกัน</h4>'
          + '<div class="rail-wrap"><div class="rail">' + similar.map(function (x) { return posterCardHtml(x); }).join('') + '</div></div></div>' : '')
        + '<a class="ec-again" href="' + url('watch/' + slug + '/ep-1/') + '">ดูตั้งแต่ EP.1 อีกครั้ง</a>'
        + '<a class="ec-again" href="' + (seriesHref || url('series/' + slug + '/')) + '">กลับไปหน้าเรื่อง</a>'
        + '</div>';
      paintFollow();
      bindRails();
      var first = $('.ec-next', endCard);
      if (first) first.focus();
      endCard.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') location.href = seriesHref || url('series/' + slug + '/');
      });
    }

    if (playBtn) playBtn.addEventListener('click', function () { timer ? stop() : play(); });
    if (muteBtn) muteBtn.addEventListener('click', function () {
      var on = muteBtn.classList.toggle('on');
      muteBtn.setAttribute('aria-label', on ? 'เปิดเสียง (ตอนนี้ปิดเสียงอยู่)' : 'ปิดเสียง (ตอนนี้เปิดเสียงอยู่)');
      var lb = muteBtn.nextElementSibling;
      if (lb && lb.classList.contains('lb')) lb.textContent = on ? 'ปิดเสียง' : 'เปิดเสียง';
    });

    /* ลากแถบเวลาได้ (UX §6.12)
       เลื่อนเวลา = "ตั้งใจดูตอนนี้ (ซ้ำ)" จึงปลดธง ended/epDone แล้วเขียนกลับได้
       ยกเว้นตอนการ์ดจบเรื่องเปิดอยู่: ตอนนั้นเรื่องถูกย้ายไป "ดูจบแล้ว" แล้ว
       และการ์ดเป็น dialog คลุมเพลเยอร์อยู่ คลิกที่ลอดมาถึงแถบเวลาไม่ใช่เจตนาของผู้ใช้ */
    if (barWrap) barWrap.addEventListener('click', function (ev) {
      if (endCard && !endCard.hidden) return;
      var r = barWrap.getBoundingClientRect();
      t = Math.max(0, Math.min(dur - 1, Math.round((ev.clientX - r.left) / r.width * dur)));
      ended = false; epDone = false;
      if (nextUp) nextUp.hidden = true;
      persist(true); paint();
    });

    /* คีย์บอร์ด (UX §7.4) */
    document.addEventListener('keydown', function (ev) {
      if (ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var tgt = ev.target || {};
      var hit = function (sel) { return tgt.closest ? !!tgt.closest(sel) : false; };
      if (/input|textarea|select/i.test(tgt.tagName || '') || hit('input, textarea, select, [contenteditable]')) return;
      var k = ev.key.toLowerCase();
      /* Space/Enter บนปุ่มหรือลิงก์ที่โฟกัสอยู่เป็นของตัวมันเอง ห้ามแย่ง
         ไม่งั้นปุ่ม "ยกเลิก" ในการ์ดตอนถัดไป (UX §6.26 = ทางออกจากการเด้งอัตโนมัติ)
         จะกดด้วยคีย์บอร์ดไม่ได้ เพราะ Space ถูก preventDefault ไปเล่น/หยุดเพลเยอร์แทน
         (ลูกศรไม่อยู่ในข้อนี้ — ปุ่ม/ลิงก์ไม่ได้ใช้ลูกศรเอง การเลื่อนเวลาด้วย ←/→
          หลังกดปุ่มเล่นจึงยังทำงานตาม UX §7.4) */
      if ((k === ' ' || k === 'k') && hit('button, a[href]')) return;
      /* ตอนนี้ดูจบแล้ว → การ์ดตอนถัดไป/การ์ดจบเรื่องเปิดอยู่ ลูกศรเป็นปุ่มสำรวจการ์ด
         ไม่ใช่ปุ่มเลื่อนเวลา · จะดูตอนนี้ซ้ำให้กดที่แถบเวลา หรือเปิดตอนนั้นใหม่ */
      if (ended && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) return;
      if (k === ' ' || k === 'k') { ev.preventDefault(); timer ? stop() : play(); }
      else if (ev.key === 'ArrowRight') { t = Math.min(dur - 1, t + 5); persist(true); paint(); }
      else if (ev.key === 'ArrowLeft') { t = Math.max(0, t - 5); persist(true); paint(); }
      else if (k === 'n' && nextHref) location.href = nextHref;
      else if (k === 'm' && muteBtn) muteBtn.click();
    });

    /* เขียนกลับเมื่อออกจากหน้า — กันกรณีปิดแท็บกลางคัน
       (ยาม epDone อยู่ใน persist() แล้ว ไม่ต้องเช็กซ้ำที่นี่) */
    function flush() { persist(true); }
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { if (timer) stop(); else flush(); }
    });

    /* บันทึกทันทีที่เปิดตอน — "เปลี่ยนตอน" คือจุดที่ต้องเขียนกลับตามโจทย์ */
    Progress.set(slug, ep, t, dur);
    paint();
    paintEpGrid();
  }

  /* ======================= 10. คลังของฉัน (4 แท็บ) ======================= */
  function currentTab() {
    var t = new URLSearchParams(location.search).get('tab');
    return ['continue', 'following', 'done', 'history'].indexOf(t) > -1 ? t : 'continue';
  }

  var EMPTIES = {
    continue: ['playf', 'ยังไม่มีเรื่องที่ดูค้าง', 'กดดูสักตอน แล้วเว็บจะจำตอนและเวลาที่ค้างไว้ให้เอง — เก็บในเครื่องนี้เท่านั้น', 'เริ่มเลื่อนดูฟีด', 'feed/'],
    following: ['heart', 'ยังไม่ได้ติดตามเรื่องไหน', 'กดหัวใจที่เรื่องไหนก็ได้ แล้วเราจะเตือนเมื่อมีตอนใหม่', 'ดู TOP 10 สัปดาห์นี้', 'popular/'],
    done: ['checkc', 'ยังไม่มีเรื่องที่ดูจบ', 'เรื่องที่ดูครบทุกตอนจะมาอยู่ตรงนี้ ไว้ย้อนดูอีกครั้ง', 'ดูเรื่องที่สั้นที่สุด', 'az/'],
    history: ['clock', 'ไม่มีประวัติการดู', 'ประวัติเก็บในเครื่องนี้เท่านั้น และลบได้ตลอดเวลา', 'เริ่มจากหน้าแรก', '']
  };
  var ICONS = {
    playf: '<path d="M8 5.2 19 12 8 18.8z" fill="currentColor"/>',
    heart: '<path d="M12 20.3S3.8 15.2 3.8 9.6A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 8.2 2.2c0 5.6-8.2 10.7-8.2 10.7z"/>',
    checkc: '<circle cx="12" cy="12" r="9"/><path d="m8.2 12.2 2.6 2.6 5-5.4"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5.2l3.2 1.9"/>',
    bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9z"/><path d="M10.4 19.5a2 2 0 0 0 3.2 0"/>'
  };
  function emptyHtml(key) {
    var e = EMPTIES[key];
    return '<div class="empty"><div class="ill"><svg class="ico lg" viewBox="0 0 24 24">' + ICONS[e[0]] + '</svg></div>'
      + '<h3>' + e[1] + '</h3><p>' + e[2] + '</p>'
      + '<a class="btn btn-ghost btn-md" href="' + url(e[4]) + '">' + e[3] + '</a></div>';
  }

  function renderLibrary() {
    var panel = $('#libPanel'); if (!panel) return;
    var tab = currentTab(), html = '', hasData = false;

    if (tab === 'continue') {
      var list = Progress.list();
      hasData = list.length > 0;
      html = hasData
        ? '<div class="lib-list">' + list.map(contRowHtml).join('') + '</div>'
          + '<div class="lib-grid">' + list.map(libCardHtml).join('') + '</div>'
        : emptyHtml('continue');
    } else if (tab === 'following') {
      var f = follows.filter(function (k) { return BY[k]; });
      hasData = f.length > 0;
      html = hasData
        ? '<div class="grid">' + f.map(function (k) { return posterCardHtml(BY[k]); }).join('') + '</div>'
        : emptyHtml('following');
    } else if (tab === 'done') {
      var dl = Progress.doneList();
      hasData = dl.length > 0;
      html = hasData
        ? '<div class="grid">' + dl.map(function (x) {
            return posterCardHtml(x.s, '<span class="tag tag-done">ดูจบแล้ว</span>');
          }).join('') + '</div>'
        : emptyHtml('done');
    } else {
      var h = (read('history', []) || []).filter(function (x) { return BY[x.slug]; });
      hasData = h.length > 0;
      html = hasData
        ? '<div class="list">' + h.map(function (x) {
            var s = BY[x.slug];
            return '<a class="ep-row" href="' + url('watch/' + s.slug + '/ep-' + x.ep + '/') + '">'
              + '<span class="th"><img src="' + cover(s) + '" width="1024" height="1536" alt="" loading="lazy" decoding="async"></span>'
              + '<span class="bd"><span class="h"><b class="num">EP.' + x.ep + '</b>'
              + '<span class="et">' + esc((s.episodes[x.ep - 1] || [''])[0]) + '</span></span>'
              + '<span class="st">' + esc(s.title) + ' · ' + timeAgo(x.ts) + '</span></span></a>';
          }).join('') + '</div>'
          + '<div class="btn-row center" style="margin-top:var(--s5)">'
          + '<button class="btn btn-ghost btn-md" id="clearHistory">ล้างประวัติ</button></div>'
        : emptyHtml('history');
    }

    panel.innerHTML = html;
    panel.setAttribute('aria-labelledby', 'tab-' + tab);
    var note = $('#libNote'); if (note) note.hidden = !hasData;
    $$('#libTabs [data-tab]').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    });
    paintFollow();
    var ch = $('#clearHistory');
    if (ch) ch.addEventListener('click', function () {
      if (!confirm('ล้างประวัติการดูในเครื่องนี้?')) return;
      save('history', []); renderLibrary(); toast('ล้างประวัติแล้ว');
    });
  }

  function timeAgo(ts) {
    var d = Math.max(0, Date.now() - (ts || 0));
    var m = Math.floor(d / 60000);
    if (m < 1) return 'เมื่อสักครู่';
    if (m < 60) return m + ' นาทีที่แล้ว';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' ชั่วโมงที่แล้ว';
    var day = Math.floor(h / 24);
    return day === 1 ? 'เมื่อวาน' : day + ' วันที่แล้ว';
  }

  function initLibrary() {
    $$('#libTabs [data-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        var u = new URL(location.href);
        u.searchParams.set('tab', b.dataset.tab);
        history.replaceState(null, '', u);
        renderLibrary();
      });
    });
    window.addEventListener('popstate', renderLibrary);
    renderLibrary();
  }

  /* ======================= 11. หน้าแรก ======================= */
  function paintFollowRail() {
    var sec = $('#followSec'), box = $('#followRail');
    if (!sec || !box) return;
    var f = follows.filter(function (k) { return BY[k]; });
    sec.hidden = f.length === 0;
    if (!f.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="rail-wrap">'
      + '<button class="rail-btn prev" aria-label="เลื่อนซ้าย" disabled></button>'
      + '<button class="rail-btn next" aria-label="เลื่อนขวา"></button>'
      + '<div class="rail">' + f.map(function (k) { return posterCardHtml(BY[k]); }).join('') + '</div></div>';
    bindRails();
  }

  function initHome() {
    paintContRail();
    paintFollowRail();

    var track = $('#heroTrack');
    if (track) {
      var dots = $$('.dots [data-hero]');
      dots.forEach(function (d, i) {
        d.addEventListener('click', function () {
          track.scrollTo({ left: track.clientWidth * i, behavior: 'smooth' });
        });
      });
      track.addEventListener('scroll', function () {
        var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        dots.forEach(function (d, j) { d.setAttribute('aria-selected', String(i === j)); });
      }, { passive: true });
    }

    var rnd = $('#randomBtn');
    if (rnd) rnd.addEventListener('click', function () {
      var dn = Progress.done(), cont = Progress.all();
      var pool = D.series.filter(function (s) { return !dn[s.slug] && !cont[s.slug]; });
      if (!pool.length) pool = D.series;
      var pick = pool[Math.floor(Math.random() * pool.length)];
      location.href = url('watch/' + pick.slug + '/ep-1/');
    });
  }

  /* ======================= 12. กรองตามแนว (หน้าแรก + ตอนใหม่) ======================= */
  function initGenreFilter() {
    var list = $('#newList'); if (!list) return;
    $$('#homeChips [data-filter]').forEach(function (c) {
      c.addEventListener('click', function () {
        $$('#homeChips [data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
        var g = c.dataset.filter, shown = 0;
        $$('.ep-row', list).forEach(function (r) {
          var ok = g === 'all' || (r.dataset.genres || '').split(' ').indexOf(g) > -1;
          r.hidden = !ok; if (ok) shown++;
        });
        var em = $('#newEmpty'); if (em) em.hidden = shown > 0;
      });
    });
  }

  /* ======================= 13. ค้นหา ======================= */
  function initSearch() {
    var q = $('#q'), res = $('#results'), count = $('#resCount'), noRes = $('#noRes');
    if (!q || !res) return;
    var genre = 'all';
    var initial = new URLSearchParams(location.search).get('q');
    if (initial) q.value = initial;

    function run() {
      var term = q.value.trim().toLowerCase();
      var list = D.series.filter(function (s) {
        var hay = (s.title + ' ' + s.hook + ' ' + s.synopsis + ' ' + s.cast.join(' ') + ' '
          + s.genres.map(function (g) { return GL[g]; }).join(' ')).toLowerCase();
        return (genre === 'all' || s.genres.indexOf(genre) > -1) && (!term || hay.indexOf(term) > -1);
      });
      res.innerHTML = list.map(function (s) { return posterCardHtml(s); }).join('');
      if (noRes) noRes.hidden = list.length > 0;
      if (count) count.innerHTML = (term || genre !== 'all')
        ? 'พบ <b class="num">' + list.length + '</b> เรื่อง'
        : 'ทุกเรื่องในคลัง ' + D.series.length + ' เรื่อง';
      var rw = $('#recentWrap'); if (rw) rw.hidden = !!term;
    }
    q.addEventListener('input', run);
    $$('#searchChips [data-filter]').forEach(function (c) {
      c.addEventListener('click', function () {
        $$('#searchChips [data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
        genre = c.dataset.filter; run();
      });
    });
    $$('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () { q.value = b.dataset.q; run(); q.focus(); });
    });
    if (initial) run();
  }

  /* ======================= 14. ฟีด ======================= */
  function initFeed() {
    var box = $('#feedPlayer'); if (!box) return;
    var i = 0, list = D.series;
    var img = box.querySelector('img');
    var bar = box.querySelector('.bar i');
    var subT = $('#feedSub');
    var tick = null, t = 0;

    function show(n) {
      i = (n + list.length) % list.length;
      var s = list[i];
      box.dataset.slug = s.slug;
      img.src = cover(s);
      $('#feedTitle').innerHTML = esc(s.title) + ' <span class="num" lang="en">EP.1</span>';
      $('#feedHook').textContent = s.hook;
      $('#feedPos').textContent = 'เรื่องที่ ' + (i + 1) + ' จาก ' + list.length;
      $('#feedAll').href = url('series/' + s.slug + '/');
      $('#feedEps').href = url('series/' + s.slug + '/') + '#epGrid';
      var fb = $('#feedFollow'); if (fb) { fb.dataset.follow = s.slug; paintFollow(); }
      $('#feedSide').innerHTML = '<h2>' + esc(s.title) + '</h2>'
        + '<div class="facts"><span class="tag tag-ai">AI</span><span>' + s.eps + ' ตอน</span>'
        + '<span>' + esc(s.status) + '</span></div><p>' + esc(s.hook) + '</p>'
        + '<div class="btn-row" style="margin-top:var(--s4)">'
        + '<a class="btn btn-accent" href="' + url('watch/' + s.slug + '/ep-1/') + '">เริ่มดู EP.1</a></div>';
      $('#feedLive').textContent = 'เรื่องที่ ' + (i + 1) + ' จาก ' + list.length + ': ' + s.title;
      t = 0;
      if (tick) clearInterval(tick);
      var dur = secs(s.episodes[0][1]);
      tick = setInterval(function () {
        t = (t + 1) % dur;
        bar.style.width = (t / dur * 100) + '%';
        if (subT && D.subs.length) subT.textContent = D.subs[Math.floor(t / 4) % D.subs.length];
      }, 1000 / 6);
    }
    $('#feedNext').addEventListener('click', function () { show(i + 1); });
    $('#feedPrev').addEventListener('click', function () { show(i - 1); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'PageDown') { ev.preventDefault(); show(i + 1); }
      if (ev.key === 'ArrowUp' || ev.key === 'PageUp') { ev.preventDefault(); show(i - 1); }
    });
    var mb = $('#feedMute');
    if (mb) mb.addEventListener('click', function () {
      var on = mb.classList.toggle('on');
      mb.setAttribute('aria-label', on ? 'เปิดเสียง (ตอนนี้ปิดเสียงอยู่)' : 'ปิดเสียง (ตอนนี้เปิดเสียงอยู่)');
      var lb = mb.nextElementSibling;
      if (lb && lb.classList.contains('lb')) lb.textContent = on ? 'ปิดเสียง' : 'เปิดเสียง';
    });
    var sb = $('#feedShare');
    if (sb) sb.setAttribute('data-share', '');
    show(0);
  }

  /* ======================= 15. ตั้งค่า ======================= */
  function initSettings() {
    var cur = settings();
    $$('[data-setting]').forEach(function (b) {
      var k = b.dataset.setting;
      b.classList.toggle('on', !!cur[k]);
      b.setAttribute('aria-checked', String(!!cur[k]));
      b.addEventListener('click', function () {
        var now = settings();
        now[k] = !now[k];
        save('set', now);
        b.classList.toggle('on', now[k]);
        b.setAttribute('aria-checked', String(now[k]));
        toast('บันทึกการตั้งค่าแล้ว');
      });
    });
    var hc = $('#histCount');
    if (hc) {
      var n = (read('history', []) || []).length;
      hc.textContent = n ? n + ' รายการ · เก็บในเครื่องนี้เท่านั้น' : 'ยังไม่มีประวัติ · เก็บในเครื่องนี้เท่านั้น';
    }
    var ch = $('#clearHistory');
    if (ch) ch.addEventListener('click', function () {
      if (!confirm('ล้างประวัติการดูในเครื่องนี้?')) return;
      save('history', []); toast('ล้างประวัติแล้ว');
      if (hc) hc.textContent = 'ยังไม่มีประวัติ · เก็บในเครื่องนี้เท่านั้น';
    });
    var ca = $('#clearAll');
    if (ca) ca.addEventListener('click', function () {
      if (!confirm('ล้างคลังทั้งหมดในเครื่องนี้? ย้อนกลับไม่ได้ และไม่มีบัญชีให้กู้คืน')) return;
      wipe(); follows = [];
      toast('ล้างข้อมูลทั้งหมดแล้ว');
      setTimeout(function () { location.reload(); }, 800);
    });
  }

  /* ======================= 16. แจ้งเตือน ======================= */
  function renderNotifications() {
    var box = $('#notifList'); if (!box) return;
    var f = follows.filter(function (k) { return BY[k]; });
    if (!f.length) { box.innerHTML = emptyHtml('following'); return; }
    box.innerHTML = '<div class="list">' + f.map(function (k) {
      var s = BY[k];
      var isNew = s.status !== 'จบแล้ว';
      return '<a class="notif' + (isNew ? ' unread' : '') + '" href="'
        + url('watch/' + s.slug + '/ep-' + s.eps + '/') + '">'
        + '<span class="th"><img src="' + cover(s) + '" width="1024" height="1536" alt="" loading="lazy" decoding="async"></span>'
        + '<span class="bd"><b>' + (isNew ? 'EP.' + s.eps + ' ออกแล้ว' : 'เรื่องนี้จบแล้ว ครบ ' + s.eps + ' ตอน') + '</b>'
        + '<p>' + esc(s.title) + ' · ' + esc(s.episodes[s.eps - 1][0]) + '</p></span>'
        + '<span class="tm">' + esc(s.status) + '</span></a>';
    }).join('') + '</div>';
  }
  function initNotifications() {
    renderNotifications();
  }

  /* ======================= 17. onboarding ======================= */
  function initWelcome() {
    var picked = read('prefs', []) || [];
    var go = $('#prefGo');
    function sync() {
      $$('#prefGrid [data-pref]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(picked.indexOf(b.dataset.pref) > -1));
      });
      if (go) {
        go.classList.toggle('is-disabled', picked.length === 0);
        go.setAttribute('aria-disabled', String(picked.length === 0));
        go.textContent = picked.length ? 'เริ่มดูเลย (เลือกแล้ว ' + picked.length + ')' : 'เริ่มดูเลย';
      }
    }
    $$('#prefGrid [data-pref]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.pref, i = picked.indexOf(k);
        if (i > -1) picked.splice(i, 1); else picked.push(k);
        save('prefs', picked); sync();
      });
    });
    if (go) go.addEventListener('click', function (ev) {
      if (!picked.length) { ev.preventDefault(); return; }
      save('onboarded', true);
    });
    sync();
  }

  /* ======================= 18. ฟอร์มติดต่อ + FAQ ======================= */
  function initContact() {
    var form = $('#contactForm'); if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = $$('[required]', form).filter(function (f) { return !f.value.trim(); });
      var email = form.querySelector('[name=email]');
      if (email && email.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) bad.push(email);
      $$('.field', form).forEach(function (f) { f.classList.remove('bad'); });
      if (bad.length) {
        bad.forEach(function (f) { f.closest('.field').classList.add('bad'); f.setAttribute('aria-invalid', 'true'); });
        bad[0].focus();
        toast('กรุณาตรวจช่องที่ยังไม่ถูกต้อง');
        return;
      }
      toast('ตรวจข้อมูลครบแล้ว — ระบบส่งอีเมลยังไม่ได้ต่อในเวอร์ชันนี้');
    });
  }
  function initAccordion() {
    $$('.acc .q').forEach(function (q) {
      q.addEventListener('click', function () {
        var acc = q.parentElement;
        var open = acc.classList.toggle('open');
        q.setAttribute('aria-expanded', String(open));
        var a = acc.querySelector('.a'); if (a) a.hidden = !open;
      });
    });
  }

  /* ======================= 19. เริ่มทำงาน ======================= */
  paintFollow();
  paintResumeButtons();
  bindRails();
  paintEpGrid();     /* ต้องติดสถานะ .cur ก่อน bindEpTabs จะเลือกแท็บช่วงที่ถูกได้ */
  bindEpTabs();
  initGenreFilter();
  initAccordion();
  initContact();

  if (PAGE === 'home') initHome();
  if (PAGE === 'watch') initWatch();
  if (PAGE === 'library') initLibrary();
  if (PAGE === 'search') initSearch();
  if (PAGE === 'feed') initFeed();
  if (PAGE === 'settings') initSettings();
  if (PAGE === 'notifications') initNotifications();
  if (PAGE === 'welcome') initWelcome();

  /* หน้าออฟไลน์ก็ใช้แถบ "ดูต่อ" ตัวเดียวกัน (อ่านจากเครื่อง จึงเห็นได้แม้เน็ตหลุด) */
  if (!PAGE && $('#contRail')) paintContRail();
  var retry = $('#retryBtn');
  if (retry) retry.addEventListener('click', function () { location.reload(); });

  /* จุดแจ้งเตือนบนกระดิ่ง — มีเรื่องที่ติดตามและยังออกตอนอยู่ */
  var bell = $('#bellBtn');
  if (bell && follows.some(function (k) { return BY[k] && BY[k].status !== 'จบแล้ว'; })) {
    bell.classList.add('dot');
  }

  /* เปิดให้ทดสอบจากคอนโซลได้ — QA ใช้ตรวจ AC-2 */
  window.LakornProgress = Progress;
})();
