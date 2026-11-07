import { TUNES, PAGES } from './tunes.js';

const MEDIA_W = 595.2, MEDIA_H = 419.52;   // music pages' MediaBox, in points
const RENDER_SCALE = 4;                    // about 290 dpi
const DB_NAME = 'christmas-tunes', DB_VER = 1;
const LS_KEY = 'ct.state';
const UNIT = {
  'q':  { name: 'crotchet', head: 'filled' },
  'q.': { name: 'dotted crotchet', head: 'filled', dot: true },
  'h':  { name: 'minim', head: 'open' },
  'h.': { name: 'dotted minim', head: 'open', dot: true },
  'e':  { name: 'quaver', head: 'filled', flag: true },
};

const $ = (id) => document.getElementById(id);
const el = {
  setup: $('setup'), app: $('app'), choose: $('choose-btn'), input: $('pdf-input'),
  progWrap: $('progress-wrap'), prog: $('progress'), progLabel: $('progress-label'), setupStatus: $('setup-status'),
  q: $('q'), count: $('count'), results: $('results'),
  word: $('t-word'), note: $('t-note'), num: $('t-num'), spoken: $('t-spoken'), meta: $('t-meta'), extra: $('t-extra'),
  dots: $('dots'), lightBtn: $('light-btn'), lightText: $('light-text'),
  stripBtn: $('strip-btn'), stripBtnText: $('strip-btn-text'), title: $('title'), subtitle: $('subtitle'),
  mini: $('mini'), miniText: $('mini-text'), miniDot: $('mini-dot'), miniLight: $('mini-light'),
  fitBtn: $('fit-btn'), prev: $('prev'), next: $('next'), score: $('score'), img: $('score-img'),
  announce: $('announce'), settingsBtn: $('settings-btn'), settings: $('settings'), settingsInfo: $('settings-info'),
  reimport: $('reimport-btn'), clear: $('clear-btn'), closeSettings: $('close-settings'), settingsStatus: $('settings-status'),
};

/* ---------- storage ---------- */
function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('scores')) db.createObjectStore('scores');
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function idb(store, mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => { resolve(req && req.result); db.close(); };
    tx.onerror = tx.onabort = () => { reject(tx.error); db.close(); };
  }));
}
const getMeta = () => idb('meta', 'readonly', (s) => s.get('import')).catch(() => null);
const getScore = (n) => idb('scores', 'readonly', (s) => s.get(n));
async function clearAll() {
  await idb('scores', 'readwrite', (s) => s.clear());
  await idb('meta', 'readwrite', (s) => s.clear());
}
function loadState() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } }
function saveState(patch) { try { localStorage.setItem(LS_KEY, JSON.stringify({ ...loadState(), ...patch })); } catch { /* storage unavailable */ } }

/* ---------- import ---------- */
function canvasToBlob(c) { return new Promise((res) => c.toBlob(res, 'image/png')); }

async function importPdf(file, report) {
  const pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  if (doc.numPages !== 38) throw new Error(`This PDF has ${doc.numPages} pages. The New Christmas Praise Solo & 1st Cornet book has 38, so this doesn't look like the right file.`);

  const byPage = new Map();
  for (const t of TUNES) { if (!byPage.has(t.pdf)) byPage.set(t.pdf, []); byPage.get(t.pdf).push(t); }

  let done = 0;
  await idb('scores', 'readwrite', (s) => s.clear());
  for (const [pno, tunes] of byPage) {
    const page = await doc.getPage(pno);
    const [vx0, vy0, vx1, vy1] = page.view;
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const pc = document.createElement('canvas');
    pc.width = Math.round(viewport.width); pc.height = Math.round(viewport.height);
    const pctx = pc.getContext('2d');
    pctx.fillStyle = '#fff'; pctx.fillRect(0, 0, pc.width, pc.height);
    await page.render({ canvasContext: pctx, viewport }).promise;

    const angle = (PAGES[pno] || 0) * Math.PI / 180;
    const ox = vx0, oy = MEDIA_H - vy1;           // where the rendered crop box sits, in MediaBox top-left points
    const cx = MEDIA_W / 2, cy = MEDIA_H / 2;

    for (const t of tunes) {
      const pieces = t.pc;
      const w = Math.ceil(Math.max(...pieces.map((p) => p[2] - p[0])) * RENDER_SCALE);
      const h = Math.ceil(pieces.reduce((a, p) => a + (p[3] - p[1]), 0) * RENDER_SCALE);
      const out = document.createElement('canvas');
      out.width = w; out.height = h;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      let yOff = 0;
      for (const [x0, y0, x1, y1, masks] of pieces) {
        const pw = (x1 - x0) * RENDER_SCALE, ph = (y1 - y0) * RENDER_SCALE;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, yOff, pw, ph); ctx.clip();
        ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, yOff);
        ctx.translate(-x0, -y0);
        ctx.translate(cx, cy); ctx.rotate(-angle); ctx.translate(-cx, -cy);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(pc, ox, oy, pc.width / RENDER_SCALE, pc.height / RENDER_SCALE);
        ctx.restore();
        if (masks) {
          ctx.fillStyle = '#fff';
          for (const [mx0, my0, mx1, my1] of masks) {
            ctx.fillRect((mx0 - x0) * RENDER_SCALE, yOff + (my0 - y0) * RENDER_SCALE, (mx1 - mx0) * RENDER_SCALE, (my1 - my0) * RENDER_SCALE);
          }
        }
        yOff += ph;
      }
      const blob = await canvasToBlob(out);
      await idb('scores', 'readwrite', (s) => s.put({ blob, w, h }, t.n));
      out.width = out.height = 0;
      done++; report(done);
    }
    pc.width = pc.height = 0;
    page.cleanup();
  }
  await doc.destroy();
  await idb('meta', 'readwrite', (s) => s.put({ at: Date.now(), count: done, name: file.name }, 'import'));
  try { await navigator.storage?.persist?.(); } catch { /* not supported */ }
}

async function runImport(file, statusEl, showProgress) {
  if (!file) return false;
  statusEl.classList.remove('error');
  statusEl.textContent = 'Reading your PDF…';
  if (showProgress) { el.progWrap.hidden = false; el.prog.value = 0; }
  stopLight();
  let lastSaid = 0;
  try {
    await importPdf(file, (n) => {
      if (showProgress) el.prog.value = n;
      if (showProgress) el.progLabel.textContent = `Preparing tunes: ${n} of ${TUNES.length}`;
      if (n - lastSaid >= 25 || n === TUNES.length) { statusEl.textContent = `${n} of ${TUNES.length} tunes ready…`; lastSaid = n; }
    });
    statusEl.textContent = `All ${TUNES.length} tunes are stored on this device.`;
    return true;
  } catch (err) {
    console.error(err);
    statusEl.classList.add('error');
    statusEl.textContent = err && err.message && /PDF has/.test(err.message) ? err.message : 'Sorry, that file couldn’t be read. Check it’s the New Christmas Praise PDF and try again.';
    return false;
  } finally {
    if (showProgress) el.progWrap.hidden = true;
  }
}

/* ---------- tempo light ---------- */
let light = { on: false, timer: 0, beat: 0, start: 0, interval: 500, beats: 4 };
function bpmNumber(s) { const m = String(s).match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : 60; }

function buildDots(beats) {
  el.dots.textContent = '';
  for (let i = 0; i < beats; i++) {
    const d = document.createElement('span');
    d.className = 'dot' + (i === 0 ? ' first' : '');
    el.dots.appendChild(d);
  }
}
function showBeat(i) {
  const ds = el.dots.children;
  for (let k = 0; k < ds.length; k++) ds[k].classList.toggle('on', k === i);
  el.miniDot.classList.toggle('on', i >= 0);
  if (i >= 0) {
    clearTimeout(light.offTimer);
    light.offTimer = setTimeout(() => {
      for (let k = 0; k < ds.length; k++) ds[k].classList.remove('on');
      el.miniDot.classList.remove('on');
    }, Math.min(160, light.interval * 0.4));
  }
}
function tick() {
  if (!light.on) return;
  showBeat(light.beat % light.beats);
  light.beat++;
  const nextAt = light.start + light.beat * light.interval;
  light.timer = setTimeout(tick, Math.max(0, nextAt - performance.now()));
}
function startLight() {
  const t = TUNES[current];
  light.interval = 60000 / bpmNumber(t.bpm);
  light.beats = t.b;
  light.beat = 0; light.start = performance.now(); light.on = true;
  setLightUi(true); tick();
}
function stopLight() {
  light.on = false; clearTimeout(light.timer); clearTimeout(light.offTimer); showBeat(-1);
  setLightUi(false);
}
function setLightUi(on) {
  el.lightBtn.setAttribute('aria-pressed', String(on));
  el.miniLight.setAttribute('aria-pressed', String(on));
  el.lightText.textContent = on ? 'Stop tempo light' : 'Start tempo light';
}
function toggleLight() { light.on ? stopLight() : startLight(); }

/* ---------- display ---------- */
let current = 0, imgUrl = null, query = '';

function noteSvg(u) {
  const spec = UNIT[u];
  const parts = [`<use href="#note-head-${spec.head}"/>`];
  if (spec.flag) parts.push('<use href="#note-flag"/>');
  if (spec.dot) parts.push('<use href="#note-dot"/>');
  return `<svg viewBox="0 0 24 40" aria-hidden="true" focusable="false">${parts.join('')}</svg>`;
}
const tempoText = (t) => `${UNIT[t.u].name} = ${t.bpm}`;

function renderList() {
  const q = query.trim().toLowerCase();
  let list = TUNES;
  if (q) {
    if (/^\d+$/.test(q)) list = TUNES.filter((t) => String(t.n).startsWith(q));
    else {
      const words = q.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
      list = TUNES.filter((t) => {
        const hay = t.t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ');
        return words.every((w) => hay.includes(w));
      });
    }
  }
  el.results.textContent = '';
  const frag = document.createDocumentFragment();
  for (const t of list) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'row'; b.dataset.i = String(t.n - 1);
    if (t.n - 1 === current) b.setAttribute('aria-current', 'true');
    b.innerHTML = `<span class="row-n">${t.n}</span><span class="row-t"></span>`;
    b.lastChild.textContent = t.t;
    li.appendChild(b); frag.appendChild(li);
  }
  if (!list.length) {
    const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'No tunes match. Try a number or another word.';
    frag.appendChild(li);
  }
  el.results.appendChild(frag);
  el.count.textContent = q ? (list.length === 1 ? '1 tune found' : `${list.length} tunes found`) : `${TUNES.length} tunes`;
  return list;
}

function markCurrent() {
  for (const b of el.results.querySelectorAll('.row')) {
    if (Number(b.dataset.i) === current) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  }
}

async function show(i, { announce = true, scrollList = true } = {}) {
  const wasOn = light.on;
  stopLight();
  current = (i + TUNES.length) % TUNES.length;
  const t = TUNES[current];
  saveState({ n: t.n });

  el.title.innerHTML = `<span class="n"></span><span class="tt"></span>`;
  el.title.firstChild.textContent = t.n;
  el.title.lastChild.textContent = t.t;
  el.subtitle.textContent = `Solo & 1st Cornet B♭ · book page ${t.pg}`;
  el.word.textContent = t.w;
  el.note.innerHTML = noteSvg(t.u);
  el.num.textContent = `= ${t.bpm}`;
  el.spoken.textContent = tempoText(t);
  el.meta.textContent = `${UNIT[t.u].name[0].toUpperCase()}${UNIT[t.u].name.slice(1)} beat · ${t.ts} · ${t.b} ${t.b === 1 ? 'light' : 'lights'} per bar`;
  el.extra.hidden = !t.x; el.extra.textContent = t.x || '';
  $('mini-note').innerHTML = noteSvg(t.u);
  el.miniText.innerHTML = '<span aria-hidden="true"></span><span class="visually-hidden"></span>';
  el.miniText.firstChild.textContent = `= ${t.bpm}`;
  el.miniText.lastChild.textContent = tempoText(t);
  buildDots(t.b);
  markCurrent();
  if (scrollList) el.results.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });

  const rec = await getScore(t.n).catch(() => null);
  if (current !== t.n - 1) return;   // user moved on meanwhile
  if (imgUrl) URL.revokeObjectURL(imgUrl);
  imgUrl = rec ? URL.createObjectURL(rec.blob) : null;
  if (imgUrl) { el.img.src = imgUrl; el.img.width = rec.w; el.img.height = rec.h; }
  else el.img.removeAttribute('src');
  el.img.alt = `Music for tune ${t.n}, ${t.t}. ${t.w}, ${tempoText(t)}, ${t.ts} time.`;
  el.score.scrollTop = 0;
  if (announce) el.announce.textContent = `Tune ${t.n}, ${t.t}. ${t.w}, ${tempoText(t)}.`;
  if (wasOn) startLight();
}

function setCollapsed(c) {
  el.app.classList.toggle('collapsed', c);
  el.stripBtn.setAttribute('aria-expanded', String(!c));
  el.stripBtnText.textContent = c ? 'Show search panel' : 'Hide search panel';
  el.mini.hidden = !c;
  saveState({ collapsed: c });
}
function setFitWidth(f) {
  el.app.classList.toggle('fit-width', f);
  el.fitBtn.setAttribute('aria-pressed', String(f));
  saveState({ fitWidth: f });
}

/* ---------- screen wake lock ---------- */
let wake = null;
async function keepAwake() {
  try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch { wake = null; }
}

/* ---------- start-up ---------- */
async function enterApp() {
  el.setup.hidden = true; el.app.hidden = false;
  const st = loadState();
  setCollapsed(!!st.collapsed);
  setFitWidth(!!st.fitWidth);
  renderList();
  const n = Number(st.n) || 1;
  await show(Math.min(Math.max(n, 1), TUNES.length) - 1, { announce: false });
  keepAwake();
}
function enterSetup() {
  stopLight();
  el.app.hidden = true; el.setup.hidden = false;
  el.choose.focus();
}

el.choose.addEventListener('click', () => el.input.click());
el.input.addEventListener('change', async () => {
  const f = el.input.files[0]; el.input.value = '';
  el.choose.disabled = true;
  const ok = await runImport(f, el.setupStatus, true);
  el.choose.disabled = false;
  if (ok) { await enterApp(); el.q.focus(); }
});

el.q.addEventListener('input', () => { query = el.q.value; renderList(); });
el.q.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const first = el.results.querySelector('.row');
    if (first) { show(Number(first.dataset.i)); }
  } else if (e.key === 'ArrowDown') {
    const first = el.results.querySelector('.row'); if (first) { e.preventDefault(); first.focus(); }
  }
});
el.results.addEventListener('click', (e) => {
  const b = e.target.closest('.row'); if (b) show(Number(b.dataset.i), { scrollList: false });
});
el.results.addEventListener('keydown', (e) => {
  const rows = [...el.results.querySelectorAll('.row')];
  const k = rows.indexOf(document.activeElement);
  if (k < 0) return;
  if (e.key === 'ArrowDown' && k < rows.length - 1) { e.preventDefault(); e.stopPropagation(); rows[k + 1].focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); (k > 0 ? rows[k - 1] : el.q).focus(); }
});

el.lightBtn.addEventListener('click', toggleLight);
el.miniLight.addEventListener('click', toggleLight);
el.prev.addEventListener('click', () => show(current - 1));
el.next.addEventListener('click', () => show(current + 1));
el.stripBtn.addEventListener('click', () => setCollapsed(!el.app.classList.contains('collapsed')));
el.fitBtn.addEventListener('click', () => setFitWidth(!el.app.classList.contains('fit-width')));

document.addEventListener('keydown', (e) => {
  if (el.app.hidden || el.settings.open || e.altKey || e.ctrlKey || e.metaKey) return;
  const typing = e.target.closest && e.target.closest('input, textarea');
  const inList = e.target.closest && e.target.closest('#results');
  if (e.key === '/' && !typing) { e.preventDefault(); if (el.app.classList.contains('collapsed')) setCollapsed(false); el.q.focus(); el.q.select(); return; }
  if (e.key === 'PageDown' || (!typing && !inList && (e.key === 'ArrowRight' || e.key === 'ArrowDown'))) { e.preventDefault(); show(current + 1); }
  else if (e.key === 'PageUp' || (!typing && !inList && (e.key === 'ArrowLeft' || e.key === 'ArrowUp'))) { e.preventDefault(); show(current - 1); }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { if (!el.app.hidden) keepAwake(); }
  else stopLight();
});

/* settings */
el.settingsBtn.addEventListener('click', async () => {
  const m = await getMeta();
  el.settingsInfo.textContent = m ? `${m.count} tunes stored on ${new Date(m.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.` : 'No music stored.';
  el.settingsStatus.textContent = '';
  el.settings.showModal();
});
el.closeSettings.addEventListener('click', () => el.settings.close());
const reInput = $('pdf-reimport');
el.reimport.addEventListener('click', () => reInput.click());
reInput.addEventListener('change', async () => {
  const f = reInput.files[0]; reInput.value = '';
  el.reimport.disabled = el.clear.disabled = true;
  const ok = await runImport(f, el.settingsStatus, false);
  el.reimport.disabled = el.clear.disabled = false;
  if (ok) show(current, { announce: false });
});
el.clear.addEventListener('click', async () => {
  await clearAll();
  el.settings.close();
  el.setupStatus.textContent = 'Stored music removed.';
  enterSetup();
});
el.settings.addEventListener('close', () => { if (!el.app.hidden) el.settingsBtn.focus(); });

async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  const meta = await getMeta();
  if (meta && meta.count === TUNES.length) await enterApp(); else enterSetup();
}
boot();
