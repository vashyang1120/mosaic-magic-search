const input = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const intro = document.getElementById('intro');
const statusEl = document.getElementById('status');
const grid = document.getElementById('grid');
const dialog = document.getElementById('previewDialog');
const previewImage = document.getElementById('previewImage');
const previewTitle = document.getElementById('previewTitle');
const closePreview = document.getElementById('closePreview');
const backBtn = document.getElementById('backBtn');
const confirmBtn = document.getElementById('confirmBtn');

let state = {
  query: '',
  results: [],
  selected: null,
  confirmed: null,
};

const demoPortraits = [
  ['portrait', 1011], ['actor', 1005], ['face', 1027], ['person', 64], ['celebrity', 823],
  ['portrait', 996], ['character', 342], ['face', 433], ['hero', 177], ['person', 91],
  ['portrait', 447], ['actor', 550], ['face', 660], ['character', 725], ['hero', 836],
  ['portrait', 901], ['actor', 1025], ['face', 237], ['person', 349], ['character', 669],
  ['portrait', 823], ['hero', 91], ['actor', 342], ['face', 64]
];

function buildDemoResults(query) {
  return demoPortraits.map(([, seed], i) => ({
    id: `${query}-${i}`,
    title: `${query} 圖片 ${i + 1}`,
    imageUrl: `https://picsum.photos/seed/${encodeURIComponent(query)}-${seed}-${i}/600/600`,
    thumbUrl: `https://picsum.photos/seed/${encodeURIComponent(query)}-${seed}-${i}/360/360`,
    source: 'demo'
  }));
}

function setStatus(text) {
  statusEl.textContent = text;
  statusEl.classList.toggle('hidden', !text);
}

function renderResults() {
  grid.innerHTML = '';
  state.results.forEach((item) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile';
    tile.setAttribute('aria-label', item.title);

    const img = document.createElement('img');
    img.src = item.thumbUrl;
    img.alt = item.title;
    img.loading = 'lazy';

    const label = document.createElement('div');
    label.className = 'tile-label';
    label.textContent = item.title;

    tile.append(img, label);
    tile.addEventListener('click', () => openPreview(item));
    grid.appendChild(tile);
  });
}

async function runSearch() {
  const query = input.value.trim();
  if (!query) {
    input.focus();
    return;
  }

  state.query = query;
  state.selected = null;
  state.confirmed = null;
  intro.classList.add('hidden');
  setStatus(`正在搜尋「${query}」的圖片…`);

  // Prototype v0.1: 先使用 demo data 跑完整互動。
  // 下一版只需要把這裡替換成 Google Programmable Search resultsReady 資料即可。
  await new Promise(r => setTimeout(r, 350));
  state.results = buildDemoResults(query);
  renderResults();
  setStatus(`「${query}」的圖片結果 — 請選一張最符合你心中形象的照片`);
}

function openPreview(item) {
  state.selected = item;
  previewImage.src = item.imageUrl;
  previewTitle.textContent = item.title;
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
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
  setStatus('已選定圖片。請記住這張照片。');

  // 開發測試用途：不在觀眾畫面顯示秘密資料，只寫入 console。
  console.log('[Mosaic Magic selection]', state.confirmed);
}

searchBtn.addEventListener('click', runSearch);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runSearch();
});
closePreview.addEventListener('click', closeDialog);
backBtn.addEventListener('click', closeDialog);
confirmBtn.addEventListener('click', confirmSelection);

// 開發便利：網址 ?q=Batman 可自動帶入搜尋詞。
const params = new URLSearchParams(location.search);
if (params.get('q')) {
  input.value = params.get('q');
}
