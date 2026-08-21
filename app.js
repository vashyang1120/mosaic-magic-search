
const cfg = window.MOSAIC_MAGIC_CONFIG || {};
const API_BASE = String(cfg.SEARCH_API_URL || '').replace(/\/$/, '');

const form = document.getElementById('handoffForm');
const input = document.getElementById('queryInput');
const clearBtn = document.getElementById('clearBtn');
const statusEl = document.getElementById('status');

function setStatus(text = '') {
  statusEl.textContent = text;
}

function googleImagesUrl(query) {
  // Real Google Images handoff.
  // hl=zh-TW biases the interface language to Traditional Chinese.
  const url = new URL('https://www.google.com/search');
  url.searchParams.set('q', query);
  url.searchParams.set('tbm', 'isch');
  url.searchParams.set('hl', 'zh-TW');
  return url.toString();
}

async function sendQuery(query) {
  // Fire-and-forget: do not delay the handoff longer than needed.
  if (!API_BASE) return;

  const payload = {
    query,
    capturedAt: new Date().toISOString(),
    source: 'spectator-handoff-v0.3.0'
  };

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const ok = navigator.sendBeacon(`${API_BASE}/capture`, blob);
      if (ok) return;
    }
  } catch (_) {}

  try {
    await fetch(`${API_BASE}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    });
  } catch (_) {
    // Never block the spectator handoff because of telemetry failure.
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  setStatus('');
  const target = googleImagesUrl(query);

  // Start capture and immediately hand off to real Google.
  sendQuery(query);
  location.replace(target);
});

input.addEventListener('input', () => {
  clearBtn.classList.toggle('hidden', !input.value);
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  clearBtn.classList.add('hidden');
  input.focus();
});

// Auto-focus so the magician can hand the phone over immediately.
window.addEventListener('load', () => {
  setTimeout(() => input.focus(), 150);
});
