const cfg = window.MOSAIC_MAGIC_CONFIG || {};
const API_URL = String(cfg.SEARCH_API_URL || '').replace(/\/$/, '');
const RESULT_COUNT = Number(cfg.RESULT_COUNT || 80);

const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
const intro = document.getElementById('intro');
const statusEl = document.getElementById('status');
const grid = document.getElementById('grid');
const dialog = document.getElementById('previewDialog');
const previewImage = document.getElementById('previewImage');
const previewTitle = document.getElementById('previewTitle');
const previewSource = document.getElementById('previewSource');
const previewDimensions = document.getElementById('previewDimensions');
const closePreview = document.getElementById('closePreview');
const confirmBtn = document.getElementById('confirmBtn');

let state = {
  query: '',
  results: [],
  selected: null,
  confirmed: null,
  searching: false,
};

function setStatus(text, mode = '') {
  statusEl.textContent = text;
  statusEl.className = `status${text ? '' : ' hidden'}${mode ? ` ${mode}` : ''}`;
}

function normalizeResult(item, index) {
  const width = Number(item.width || item.properties?.width || 0) || null;
  const height = Number(item.height || item.properties?.height || 0) || null;
  return {
    id: item.id || `${state.query}-${index}`,
    title: item.title || state.query,
    source: item.source || '',
    pageUrl: item.pageUrl || item.url || '',
    imageUrl: item.imageUrl || item.properties?.url || (typeof item.thumbnail === 'string' ? item.thumbnail : item.thumbnail?.src) || '',
    thumbUrl: item.thumbUrl || (typeof item.thumbnail === 'string' ? item.thumbnail : item.thumbnail?.src) || item.properties?.placeholder || item.properties?.url || item.imageUrl || '',
    width,
    height,
  };
}

function makeTile(item) {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'image-tile';
  tile.setAttribute('aria-label', item.title || '圖片');

  if (item.width && item.height) {
    tile.style.aspectRatio = `${item.width} / ${item.height}`;
  }

  const img = document.createElement('img');
  img.src = item.thumbUrl;
  img.alt = item.title || state.query;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';

  img.addEventListener('error', () => tile.remove());
  tile.appendChild(img);
  tile.addEventListener('click', () => openPreview(item));
  return tile;
}

function renderResults() {
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  state.results.forEach((item) => frag.appendChild(makeTile(item)));
  grid.appendChild(frag);
}

async function fetchResults(query) {
  if (!API_URL) {
    throw new Error('SEARCH_API_URL_NOT_CONFIGURED');
  }

  const url = new URL(`${API_URL}/images`);
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(RESULT_COUNT));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    let reason = '';
    try { reason = (await res.json()).error || ''; } catch (_) {}
    throw new Error(reason || `HTTP_${res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

async function runSearch() {
  const query = input.value.trim();
  if (!query || state.searching) {
    if (!query) input.focus();
    return;
  }

  state.query = query;
  state.selected = null;
  state.confirmed = null;
  state.searching = true;
  intro.classList.add('hidden');
  grid.innerHTML = '';
  setStatus(`正在搜尋「${query}」…`, 'loading');

  try {
    const raw = await fetchResults(query);
    state.results = raw.map(normalizeResult).filter(x => x.thumbUrl && x.imageUrl);
    renderResults();

    if (!state.results.length) {
      setStatus('找不到圖片，請換一個關鍵字再試一次。', 'error');
    } else {
      setStatus('');
    }
  } catch (err) {
    console.error(err);
    if (err.message === 'SEARCH_API_URL_NOT_CONFIGURED') {
      setStatus('搜尋服務尚未連線。請先完成 Worker 設定。', 'error');
    } else {
      setStatus('目前無法取得圖片，請稍後再試。', 'error');
    }
  } finally {
    state.searching = false;
  }
}

function openPreview(item) {
  state.selected = item;
  previewImage.src = item.imageUrl;
  previewTitle.textContent = item.title || state.query;
  previewSource.textContent = item.source || '圖片結果';
  previewDimensions.textContent = item.width && item.height ? `${item.width} × ${item.height}` : '';

  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog() {
  if (dialog.open && typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function confirmSelection() {
  if (!state.selected) return;

  state.confirmed = {
    query: state.query,
    selectedAt: new Date().toISOString(),
    image: state.selected,
  };

  localStorage.setItem('mosaicMagicLastSelection', JSON.stringify(state.confirmed));
  window.dispatchEvent(new CustomEvent('mosaic-magic-selection', { detail: state.confirmed }));

  closeDialog();
  setStatus('圖片已選定。請記住這張照片。', 'confirmed');
  grid.classList.add('selection-locked');

  console.log('[Mosaic Magic selection]', state.confirmed);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  grid.classList.remove('selection-locked');
  runSearch();
});
closePreview.addEventListener('click', closeDialog);
confirmBtn.addEventListener('click', confirmSelection);
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) closeDialog();
});

const params = new URLSearchParams(location.search);
if (params.get('q')) input.value = params.get('q');
