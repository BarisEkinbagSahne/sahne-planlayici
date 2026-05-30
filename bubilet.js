const API_BASE = "";
const DEFAULT_BUBILET_URL = "https://www.bubilet.com.tr/sanatci/candles-and-echoes-ensemble-";

const els = {
  urlInput: document.getElementById("bubilet-url-input"),
  checkBtn: document.getElementById("bubilet-check-btn"),
  addBtn: document.getElementById("bubilet-add-btn"),
  summary: document.getElementById("bubilet-summary"),
  missingTbody: document.getElementById("missing-tbody"),
  missingCount: document.getElementById("missing-count"),
  syncStatus: document.getElementById("sync-status"),
};

let missingEvents = [];

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API hatasi: ${res.status}`);
  return data;
}

function setSyncStatus(message, level = "info") {
  if (!els.syncStatus) return;
  els.syncStatus.className = `sync-status sync-${level}`;
  els.syncStatus.textContent = message;
}

function setSummary(message, level = "info") {
  els.summary.className = `validation ${level}`;
  els.summary.textContent = message;
}

function formatDate(isoDate) {
  const [yyyy, mm, dd] = isoDate.split("-");
  return `${dd}.${mm}.${yyyy}`;
}

function renderMissingRows(items) {
  missingEvents = items;
  els.missingCount.textContent = `${items.length} kayit`;
  els.addBtn.disabled = items.length === 0;

  if (!items.length) {
    els.missingTbody.innerHTML = '<tr><td colspan="4" class="empty-cell">Eksik konser yok. Tablonuz guncel.</td></tr>';
    return;
  }

  els.missingTbody.innerHTML = "";
  for (const item of items) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(item.date)}</td>
      <td>${escapeHtml(item.venue)}</td>
      <td>${escapeHtml(item.destination)}</td>
      <td>${escapeHtml(item.team || "Barış")}</td>
    `;
    els.missingTbody.appendChild(tr);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadSavedUrl() {
  try {
    const data = await apiRequest("/api/data");
    els.urlInput.value = data.settings?.bubiletUrl || DEFAULT_BUBILET_URL;
    setSyncStatus("Sunucu ile baglandi", "ok");
  } catch (err) {
    els.urlInput.value = DEFAULT_BUBILET_URL;
    setSyncStatus(`Sunucu hatasi: ${err.message}`, "error");
  }
}

async function onCheck() {
  els.checkBtn.disabled = true;
  setSyncStatus("Bubilet kontrol ediliyor...", "info");
  setSummary("Bubilet sayfasi okunuyor...", "info");

  try {
    const result = await apiRequest("/api/bubilet/compare", {
      method: "POST",
      body: JSON.stringify({ url: els.urlInput.value.trim() }),
    });

    if (result.bubiletUrl) els.urlInput.value = result.bubiletUrl;
    renderMissingRows(result.missing || []);

    const unknown = result.unknownCities?.length
      ? ` Tanimsiz il: ${result.unknownCities.join(", ")}.`
      : "";

    if (result.missingCount === 0) {
      setSummary(
        `Bubilet'te ${result.totalBubilet} konser var. Tablonuzda hepsi mevcut.${unknown}`,
        "ok",
      );
    } else {
      setSummary(
        `Bubilet'te ${result.totalBubilet} konser bulundu. ${result.missingCount} tanesi tablomuzda yok.${unknown}`,
        "warn",
      );
    }
    setSyncStatus("Kontrol tamamlandi", "ok");
  } catch (err) {
    renderMissingRows([]);
    setSummary(`Kontrol basarisiz: ${err.message}`, "error");
    setSyncStatus(`Hata: ${err.message}`, "error");
  } finally {
    els.checkBtn.disabled = false;
  }
}

async function onAddMissing() {
  if (!missingEvents.length) return;

  const ok = confirm(`${missingEvents.length} eksik konser eklenecek ve km hesaplanacak. Devam edilsin mi?`);
  if (!ok) return;

  els.addBtn.disabled = true;
  setSyncStatus("Konserler ekleniyor...", "info");

  try {
    await apiRequest("/api/bubilet/add", {
      method: "POST",
      body: JSON.stringify({ url: els.urlInput.value.trim() }),
    });
    window.location.href = "index.html?recalculate=1";
  } catch (err) {
    setSummary(`Ekleme basarisiz: ${err.message}`, "error");
    setSyncStatus(`Hata: ${err.message}`, "error");
    els.addBtn.disabled = missingEvents.length > 0;
  }
}

els.checkBtn.addEventListener("click", onCheck);
els.addBtn.addEventListener("click", onAddMissing);
loadSavedUrl();
