
const cfg = window.MOSAIC_MAGIC_CONFIG || {};
const API_BASE = String(cfg.SEARCH_API_URL || '').replace(/\/$/, '');
const RESULT_COUNT = Number(cfg.RESULT_COUNT || 50);
const debugMode = new URLSearchParams(location.search).get('debug') === '1';

const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const clearBtn = document.getElementById('clearBtn');
const statusEl = document.getElementById('status');
const chipsEl = document.getElementById('chips');
const feedEl = document.getElementById('resultsFeed');

const dialog = document.getElementById('previewDialog');
const previewImage = document.getElementById('previewImage');
const previewTitle = document.getElementById('previewTitle');
const previewSourceText = document.getElementById('previewSourceText');
const sourceName = document.getElementById('sourceName');
const sourceFavicon = document.getElementById('sourceFavicon');
const visitBtn = document.getElementById('visitBtn');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const relatedPreviewGrid = document.getElementById('relatedPreviewGrid');
const debugPanel = document.getElementById('debugPanel');
const debugText = document.getElementById('debugText');

const state = {
  query: '',
  results: [],
  currentTarget: null,
  previewOpen: false,
  previewHistoryPushed: false,
};

function setStatus(text = '', kind = '') {
  statusEl.textContent = text;
  statusEl.className = `status ${kind}`.trim();
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeResult(item, index) {
  return {
    id: item.id ?? index,
    title: item.title || '',
    pageUrl: item.pageUrl || '',
    source: item.source || hostFromUrl(item.pageUrl || ''),
    thumbnail: item.thumbnail || '',
    imageUrl: item.imageUrl || item.thumbnail || '',
    width: item.width || null,
    height: item.height || null,
  };
}

async function fetchImages(query) {
  if (!API_BASE) {
    throw new Error('SEARCH_API_URL_NOT_CONFIGURED');
  }

  const url = new URL(`${API_BASE}/images`);
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(RESULT_COUNT));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    throw new Error(`INVALID_JSON_${res.status}`);
  }

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `HTTP_${res.status}`);
  }

  return Array.isArray(data.results)
    ? data.results.map(normalizeResult).filter(x => x.thumbnail || x.imageUrl)
    : [];
}

function makeCard(item) {
  const card = document.createElement('article');
  card.className = 'result-card';

  const img = document.createElement('img');
  img.loading = 'lazy';
  img.src = item.thumbnail || item.imageUrl;
  img.alt = item.title || state.query;
  img.onerror = () => {
    if (img.src !== item.imageUrl && item.imageUrl) img.src = item.imageUrl;
  };

  const title = document.createElement('div');
  title.className = 'result-title';
  title.textContent = item.title || state.query;

  const source = document.createElement('div');
  source.className = 'result-source';
  source.textContent = item.source || hostFromUrl(item.pageUrl);

  card.append(img, title, source);
  card.addEventListener('click', () => openPreview(item));
  return card;
}

function makeRelatedSearchBlock() {
  if (!state.results.length) return null;
  const wrap = document.createElement('section');
  wrap.className = 'related-card';

  const title = document.createElement('h3');
  title.textContent = '相關搜尋';
  wrap.appendChild(title);

  const suffixes = ['桌布', '造型', '可愛', '照片'];
  suffixes.forEach((suffix, i) => {
    const row = document.createElement('div');
    row.className = 'related-item';

    const img = document.createElement('img');
    const seed = state.results[(i * 4 + 2) % state.results.length];
    img.src = seed.thumbnail || seed.imageUrl;
    img.alt = '';

    const text = document.createElement('span');
    text.textContent = `${state.query} ${suffix}`;

    row.append(img, text);
    row.addEventListener('click', () => {
      searchInput.value = text.textContent;
      runSearch(text.textContent);
    });
    wrap.appendChild(row);
  });

  return wrap;
}

function renderChips() {
  chipsEl.innerHTML = '';
  if (!state.query) return;
  const labels = ['短髮', `${state.query} 造型`, `${state.query} 照片`];
  labels.forEach(label => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      searchInput.value = label;
      runSearch(label);
    });
    chipsEl.appendChild(btn);
  });
  chipsEl.classList.remove('hidden');
}

function renderFeed() {
  feedEl.innerHTML = '';
  const relatedAt = Math.min(7, Math.max(4, Math.floor(state.results.length / 5)));

  state.results.forEach((item, index) => {
    feedEl.appendChild(makeCard(item));
    if (index === relatedAt) {
      const related = makeRelatedSearchBlock();
      if (related) feedEl.appendChild(related);
    }
  });
}

function sourceInitial(source) {
  return (source || '?').trim().charAt(0).toUpperCase();
}

function updateDebug() {
  if (!debugMode) return;
  debugPanel.classList.remove('hidden');
  debugText.textContent = JSON.stringify(state.currentTarget, null, 2);
}

function recordTarget(item) {
  state.currentTarget = {
    query: state.query,
    image: item,
    selectedAt: new Date().toISOString(),
  };
  localStorage.setItem('mosaicMagicLastSelection', JSON.stringify(state.currentTarget));
  updateDebug();
}

function renderRelatedPreview(currentItem) {
  relatedPreviewGrid.innerHTML = '';
  const others = state.results
    .filter(x => x.id !== currentItem.id)
    .slice(0, 8);

  others.forEach(item => {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = item.thumbnail || item.imageUrl;
    img.alt = item.title || state.query;
    img.addEventListener('click', () => openPreview(item));
    relatedPreviewGrid.appendChild(img);
  });
}

function openPreview(item, { pushHistory = true } = {}) {
  recordTarget(item);

  sourceName.textContent = item.source || hostFromUrl(item.pageUrl) || '來源網站';
  sourceFavicon.textContent = sourceInitial(sourceName.textContent);
  previewTitle.textContent = item.title || state.query;
  previewSourceText.textContent = item.source || hostFromUrl(item.pageUrl);
  visitBtn.href = item.pageUrl || item.imageUrl || '#';

  // Prefer the Brave thumbnail in Preview for mobile stability.
  // The exact original image URL is still preserved in currentTarget for Mosaic use.
  previewImage.onerror = () => {
    if (item.thumbnail && previewImage.src !== item.thumbnail) {
      previewImage.src = item.thumbnail;
    }
  };
  previewImage.src = item.thumbnail || item.imageUrl;

  renderRelatedPreview(item);

  if (!dialog.open) {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  state.previewOpen = true;

  // Make Android/iPhone browser Back behave like Google Images:
  // first Back closes the Preview instead of leaving the search page.
  if (pushHistory && !state.previewHistoryPushed) {
    history.pushState({ mosaicPreview: true }, '', location.href);
    state.previewHistoryPushed = true;
  }
}

function closePreview({ fromPopState = false } = {}) {
  if (!state.previewOpen) return;

  if (dialog.open && typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');

  state.previewOpen = false;
  previewImage.removeAttribute('src');

  if (!fromPopState && state.previewHistoryPushed) {
    state.previewHistoryPushed = false;
    history.back();
  }
}

async function runSearch(query) {
  query = (query || '').trim();
  if (!query) return;

  state.query = query;
  state.currentTarget = null;
  setStatus('搜尋中…');
  feedEl.innerHTML = '';
  chipsEl.classList.add('hidden');

  try {
    const results = await fetchImages(query);
    state.results = results;
    renderChips();
    renderFeed();
    setStatus(results.length ? '' : '找不到圖片，請換一個關鍵字再試一次。', results.length ? '' : 'error');
  } catch (err) {
    console.error('[Mosaic Magic search error]', err);
    if (debugMode) {
      setStatus(`搜尋失敗：${err.message}`, 'error');
    } else if (err.message === 'SEARCH_API_URL_NOT_CONFIGURED') {
      setStatus('搜尋服務尚未連線。', 'error');
    } else {
      setStatus('搜尋服務暫時無法使用，請稍後再試。', 'error');
    }
  }
}

searchForm.addEventListener('submit', e => {
  e.preventDefault();
  runSearch(searchInput.value);
});

searchInput.addEventListener('input', () => {
  clearBtn.classList.toggle('hidden', !searchInput.value);
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchInput.focus();
  clearBtn.classList.add('hidden');
});

closePreviewBtn.addEventListener('click', closePreview);

dialog.addEventListener('click', e => {
  if (e.target === dialog) closePreview();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePreview();
});

window.addEventListener('popstate', () => {
  if (state.previewOpen) {
    state.previewHistoryPushed = false;
    closePreview({ fromPopState: true });
  }
});

if (debugMode) {
  try {
    const saved = JSON.parse(localStorage.getItem('mosaicMagicLastSelection') || 'null');
    if (saved) {
      state.currentTarget = saved;
      updateDebug();
    }
  } catch {}
}


if (!debugMode) {
  debugPanel.classList.add('hidden');
  debugText.textContent = '';
}
