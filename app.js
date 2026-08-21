
const cfg = window.MOSAIC_MAGIC_CONFIG || {};
const API_BASE = String(cfg.SEARCH_API_URL || '').replace(/\/$/, '');
const DEMO_QUERY = String(cfg.DEMO_QUERY || '周杰倫').trim();
const DEMO_CHIPS = Array.isArray(cfg.DEMO_CHIPS) && cfg.DEMO_CHIPS.length
  ? cfg.DEMO_CHIPS
  : ['演唱會', '專輯', '電影', '近照'];

const appShell = document.getElementById('appShell');
const form = document.getElementById('handoffForm');
const input = document.getElementById('queryInput');
const clearBtn = document.getElementById('clearBtn');
const chipsEl = document.getElementById('chips');
const statusEl = document.getElementById('status');
const gridEl = document.getElementById('demoGrid');

let inputMode = false;
let demoResults = [];

function setStatus(text = '', kind = '') {
  statusEl.textContent = text;
  statusEl.className = `status ${kind}`.trim();
}

function googleImagesUrl(query) {
  const url = new URL('https://www.google.com/search');
  url.searchParams.set('q', query);
  url.searchParams.set('tbm', 'isch');
  url.searchParams.set('hl', 'zh-TW');
  return url.toString();
}

async function captureQuery(query) {
  if (!API_BASE) return;
  const payload = {
    query,
    capturedAt: new Date().toISOString(),
    source: 'spectator-demo-fullscreen-v0.3.1'
  };

  // POST with keepalive is more reliable for cross-origin JSON than sendBeacon
  // because our Worker already handles CORS.
  try {
    await fetch(`${API_BASE}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    });
  } catch (_) {}
}

async function fetchDemoResults() {
  if (!API_BASE) throw new Error('SEARCH_API_URL_NOT_CONFIGURED');
  const url = new URL(`${API_BASE}/images`);
  url.searchParams.set('q', DEMO_QUERY);
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP_${res.status}`);
  return (data.results || []).slice(0, 12);
}

function renderDemo(results) {
  demoResults = results;
  gridEl.innerHTML = '';
  results.forEach((item, i) => {
    const card = document.createElement('article');
    card.className = 'demo-card';

    const img = document.createElement('img');
    img.loading = i < 4 ? 'eager' : 'lazy';
    img.src = item.thumbnail || item.imageUrl || '';
    img.alt = '';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = item.title || DEMO_QUERY;

    const source = document.createElement('div');
    source.className = 'source';
    source.textContent = item.source || '';

    card.append(img, title, source);
    gridEl.appendChild(card);
  });

  renderChips();
}

function renderChips() {
  chipsEl.innerHTML = '';
  DEMO_CHIPS.forEach((label, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';

    const img = document.createElement('img');
    const seed = demoResults[(i * 2) % Math.max(1, demoResults.length)];
    if (seed) img.src = seed.thumbnail || seed.imageUrl || '';
    img.alt = '';

    const text = document.createElement('span');
    text.textContent = label;

    chip.append(img, text);
    chipsEl.appendChild(chip);
  });
}

function finishEnterInputMode() {
  if (inputMode) return;
  inputMode = true;
  appShell.classList.add('input-mode');
  document.body.classList.add('fullscreen-like');

  input.readOnly = false;
  input.value = '';
  input.placeholder = '搜尋圖片';
  clearBtn.classList.add('hidden');

  // Wait until the fullscreen transition has started/settled, then summon keyboard.
  setTimeout(() => {
    input.focus({ preventScroll: true });
    try { input.setSelectionRange(0, 0); } catch (_) {}
  }, 120);
}

function requestFullscreenDirectlyFromGesture() {
  const target = appShell;

  try {
    if (document.fullscreenElement) {
      finishEnterInputMode();
      return;
    }

    let promise = null;

    if (target.requestFullscreen) {
      // Critical: requestFullscreen is the FIRST privileged action in this tap.
      promise = target.requestFullscreen({ navigationUI: 'hide' });
    } else if (target.webkitRequestFullscreen) {
      // Legacy Chromium/Samsung fallback.
      target.webkitRequestFullscreen();
    }

    if (promise && typeof promise.then === 'function') {
      promise.then(
        () => finishEnterInputMode(),
        (err) => {
          console.warn('[Mosaic Magic] fullscreen rejected:', err);
          finishEnterInputMode();
        }
      );
    } else {
      // API unavailable or legacy synchronous call.
      setTimeout(() => finishEnterInputMode(), 40);
    }
  } catch (err) {
    console.warn('[Mosaic Magic] fullscreen error:', err);
    finishEnterInputMode();
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!inputMode) {
    requestFullscreenDirectlyFromGesture();
    return;
  }

  const query = input.value.trim();
  if (!query) return;

  const target = googleImagesUrl(query);

  // Capture first. We await briefly so the Worker gets the query before navigation.
  // The request is tiny and should complete quickly.
  await Promise.race([
    captureQuery(query),
    new Promise(resolve => setTimeout(resolve, 500))
  ]);

  location.replace(target);
});

// The demo field is readonly. This click is reserved entirely for the
// privileged fullscreen request, then we turn it into a real input.
input.addEventListener('click', (e) => {
  if (!inputMode) {
    e.preventDefault();
    requestFullscreenDirectlyFromGesture();
  }
});

input.addEventListener('input', () => {
  clearBtn.classList.toggle('hidden', !input.value);
});

clearBtn.addEventListener('click', (e) => {
  e.preventDefault();
  input.value = '';
  clearBtn.classList.add('hidden');
  input.focus();
});

async function init() {
  input.value = DEMO_QUERY;
  setStatus('載入中…');

  try {
    const results = await fetchDemoResults();
    renderDemo(results);
    setStatus('');
  } catch (err) {
    console.error(err);
    setStatus('');
    // Minimal fallback cards so the demo page still looks populated.
    const fallback = Array.from({length: 8}, (_, i) => ({
      title: `${DEMO_QUERY} 圖片`,
      source: '',
      thumbnail: `https://picsum.photos/seed/mosaicdemo${i}/500/${620 + (i%3)*120}`
    }));
    renderDemo(fallback);
  }
}

init();


const fsDebug = new URLSearchParams(location.search).get('fsdebug') === '1';
if (fsDebug) {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#111;color:#fff;padding:8px;border-radius:8px;font:12px monospace;white-space:pre-wrap';
  const update = (extra='') => {
    box.textContent =
      `fullscreenEnabled=${document.fullscreenEnabled}\n` +
      `requestFullscreen=${!!appShell.requestFullscreen}\n` +
      `webkitRequestFullscreen=${!!appShell.webkitRequestFullscreen}\n` +
      `fullscreenElement=${!!document.fullscreenElement}\n` +
      extra;
  };
  document.body.appendChild(box);
  update();
  document.addEventListener('fullscreenchange', () => update('fullscreenchange'));
  document.addEventListener('fullscreenerror', () => update('fullscreenerror'));
}
