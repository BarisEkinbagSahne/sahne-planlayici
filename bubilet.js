const API_BASE = "";
const DEFAULT_BUBILET_URL = "https://www.bubilet.com.tr/sanatci/candles-and-echoes-ensemble-";
const DEFAULT_TEAM_LABEL = "Boş";

function getFetchHelpMessage() {
  if (window.location.protocol === "file:") {
    return (
      "Sayfa dosya olarak acilmis (file://). API calismaz.\n\n" +
      "Yerelde: proje klasorunde npm install && npm start, sonra http://localhost:3000/bubilet.html\n\n" +
      "Canli: https://sahne-lojistik.onrender.com/bubilet.html"
    );
  }
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "Sunucu calismiyor olabilir. Terminalde npm start calistirin.";
  }
  return "Sunucuya ulasilamadi. Render uyaniyor olabilir; birkaç saniye bekleyip tekrar deneyin.";
}

function normalizeFetchError(err) {
  const msg = err?.message || String(err);
  if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("Load failed")) {
    return getFetchHelpMessage();
  }
  return msg;
}

const els = {
  urlInput: document.getElementById("bubilet-url-input"),
  checkBtn: document.getElementById("bubilet-check-btn"),
  addBtn: document.getElementById("bubilet-add-btn"),
  summary: document.getElementById("bubilet-summary"),
  missingTbody: document.getElementById("missing-tbody"),
  missingCount: document.getElementById("missing-count"),
  syncStatus: document.getElementById("sync-status"),
  manualForm: document.getElementById("manual-event-form"),
  manualDate: document.getElementById("manual-event-date"),
  manualVenue: document.getElementById("manual-event-venue"),
  manualDestination: document.getElementById("manual-event-destination"),
  manualReturnBtn: document.getElementById("manual-event-return-btn"),
  manualValidation: document.getElementById("manual-validation-box"),
  citiesList: document.getElementById("cities-list"),
};

let missingEvents = [];
let manualReturnToIzmir = false;
let storeSnapshot = null;

const TURKIYE_SEHIRLERI = [
  "Adana", "Adiyaman", "Afyonkarahisar", "Agri", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydin",
  "Balikesir", "Bartin", "Batman", "Bayburt", "Bilecik", "Bingol", "Bitlis", "Bolu", "Burdur", "Bursa", "Canakkale", "Cankiri",
  "Corum", "Denizli", "Diyarbakir", "Duzce", "Edirne", "Elazig", "Erzincan", "Erzurum", "Eskisehir", "Gaziantep", "Giresun",
  "Gumushane", "Hakkari", "Hatay", "Igdir", "Isparta", "Istanbul", "Izmir", "Kahramanmaras", "Karabuk", "Karaman", "Kars",
  "Kastamonu", "Kayseri", "Kilis", "Kirikkale", "Kirklareli", "Kirsehir", "Kocaeli", "Konya", "Kutahya", "Malatya", "Manisa",
  "Mardin", "Mersin", "Mugla", "Mus", "Nevsehir", "Nigde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Sanliurfa", "Siirt",
  "Sinop", "Sivas", "Sirnak", "Tekirdag", "Tokat", "Trabzon", "Tunceli", "Usak", "Van", "Yalova", "Yozgat", "Zonguldak",
];
const citySet = new Set(TURKIYE_SEHIRLERI.map((x) => x.toLowerCase()));

async function apiRequest(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `API hatasi: ${res.status}`);
    return data;
  } catch (err) {
    throw new Error(normalizeFetchError(err));
  }
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
  return SahneDates.isoToDisplay(isoDate);
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
      <td>${escapeHtml(item.team || DEFAULT_TEAM_LABEL)}</td>
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
    storeSnapshot = data;
    els.urlInput.value = data.settings?.bubiletUrl || DEFAULT_BUBILET_URL;
    setSyncStatus("Sunucu ile baglandi", "ok");
  } catch (err) {
    els.urlInput.value = DEFAULT_BUBILET_URL;
    setSyncStatus(`Sunucu hatasi: ${err.message}`, "error");
  }
}

function normalizeText(v) {
  return String(v || "").trim().replace(/\s+/g, " ");
}

function normalizeCityName(v) {
  return normalizeText(v);
}

function setManualValidation(message, level = "info") {
  if (!els.manualValidation) return;
  els.manualValidation.className = `validation ${level}`;
  els.manualValidation.textContent = message;
}

function updateManualReturnButton() {
  if (!els.manualReturnBtn) return;
  els.manualReturnBtn.textContent = `Izmir Donus: ${manualReturnToIzmir ? "Evet" : "Hayir"}`;
}

function fillCitiesDatalist() {
  if (!els.citiesList) return;
  els.citiesList.innerHTML = "";
  TURKIYE_SEHIRLERI.forEach((city) => {
    const option = document.createElement("option");
    option.value = city;
    els.citiesList.appendChild(option);
  });
}

function validateManualPayload(payload) {
  if (!payload.date || !payload.venue || !payload.destination) {
    return { ok: false, message: "Tum alanlar zorunlu." };
  }
  if (!citySet.has(payload.destination.toLowerCase())) {
    return { ok: false, message: "Il listeden secilmeli." };
  }
  return { ok: true };
}

async function onSaveManualEvent(e) {
  e.preventDefault();
  const payload = {
    date: SahneDates.displayToIso(els.manualDate?.value || ""),
    venue: normalizeText(els.manualVenue?.value || ""),
    destination: normalizeCityName(els.manualDestination?.value || ""),
    returnToIzmir: manualReturnToIzmir,
  };
  const valid = validateManualPayload(payload);
  if (!valid.ok) {
    setManualValidation(valid.message, "warn");
    return;
  }

  try {
    const data = storeSnapshot || (await apiRequest("/api/data"));
    const next = {
      teams: Array.isArray(data.teams) ? data.teams : [],
      events: Array.isArray(data.events) ? data.events.slice() : [],
      geoCache: data.geoCache || {},
      roadCache: data.roadCache || {},
      settings: data.settings || {},
    };
    next.events.push({
      id: crypto.randomUUID(),
      team: DEFAULT_TEAM_LABEL,
      date: payload.date,
      destination: payload.destination,
      venue: payload.venue,
      returnToIzmir: payload.returnToIzmir,
      fuelPricePerLiter: Number(next.settings.defaultFuelPrice || 70),
      startCity: "Izmir",
      avgKm: null,
      validation: null,
      fuelLiterUsed: null,
      fuelCost: null,
      adviceText: "",
    });

    await apiRequest("/api/data", { method: "PUT", body: JSON.stringify(next) });
    storeSnapshot = next;
    setManualValidation("Etkinlik eklendi. Ana sayfada Bos alanina dusur.", "ok");
    setSyncStatus("Manuel etkinlik eklendi", "ok");
    els.manualForm?.reset();
    manualReturnToIzmir = false;
    updateManualReturnButton();
  } catch (err) {
    setManualValidation(`Kayit basarisiz: ${err.message}`, "error");
    setSyncStatus(`Hata: ${err.message}`, "error");
  }
}

function bindManualForm() {
  if (!els.manualForm) return;
  updateManualReturnButton();
  fillCitiesDatalist();
  els.manualReturnBtn?.addEventListener("click", () => {
    manualReturnToIzmir = !manualReturnToIzmir;
    updateManualReturnButton();
  });
  els.manualForm.addEventListener("submit", onSaveManualEvent);
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
    els.missingTbody.innerHTML = '<tr><td colspan="4" class="empty-cell">Kontrol yapilamadi.</td></tr>';
    els.missingCount.textContent = "0 kayit";
    els.addBtn.disabled = true;
    missingEvents = [];
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
bindManualForm();
loadSavedUrl();
