const DAILY_KM_LIMIT = 800;
const DEFAULT_FUEL_PRICE = 70;
const FUEL_LITER_PER_100KM = 11;
const UNASSIGNED_TEAM = "Boş";
const GRID_SUB_ROWS = 2;
const MAX_GRID_DAYS = 42;
const GRID_EXPAND_DAYS = 7;
const GRID_EDGE_THRESHOLD = 120;
const GRID_VENUE_MAX_CHARS = 20;
const TRAVEL_LABEL_MAX_CHARS = 15;
const BOS_POOL_MAX_VISIBLE = 8;
const TRAVEL_STEM_OFFSET_PX = 10;

const API_BASE = "";

const DEFAULT_TEAMS = ["Barış", "Barkın", "Diğer"];
const IZMIR = "Izmir";
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

const state = {
  teams: [],
  events: [],
  geoCache: {},
  roadCache: {},
  returnToIzmirDraft: false,
  teamFilter: "ALL",
  eventView: "grid",
  gridStartDate: null,
  gridEndDate: null,
  gridDidInitialScroll: false,
  gridEdgeExpandEnabled: false,
  defaultFuelPrice: DEFAULT_FUEL_PRICE,
  bubiletUrl: "",
};

const els = {
  settingsToggleBtn: document.getElementById("settings-toggle-btn"),
  settingsCloseBtn: document.getElementById("settings-close-btn"),
  settingsPanel: document.getElementById("settings-panel"),
  teamForm: document.getElementById("team-form"),
  teamNameInput: document.getElementById("team-name-input"),
  teamList: document.getElementById("team-list"),
  defaultFuelPriceInput: document.getElementById("default-fuel-price-input"),
  eventForm: document.getElementById("event-form"),
  eventDate: document.getElementById("event-date"),
  eventDestination: document.getElementById("event-destination"),
  eventVenue: document.getElementById("event-venue"),
  eventReturnBtn: document.getElementById("event-return-btn"),
  submitBtn: document.getElementById("submit-btn"),
  validationBox: document.getElementById("validation-box"),
  eventTbody: document.getElementById("event-tbody"),
  eventGridView: document.getElementById("event-grid-view"),
  eventTableView: document.getElementById("event-table-view"),
  viewTableBtn: document.getElementById("view-table-btn"),
  viewGridBtn: document.getElementById("view-grid-btn"),
  bosPool: document.getElementById("bos-pool"),
  scheduleGrid: document.getElementById("schedule-grid"),
  gridRangeLabel: document.getElementById("grid-range-label"),
  teamItemTemplate: document.getElementById("team-item-template"),
  revalidateBtn: document.getElementById("revalidate-btn"),
  syncStatus: document.getElementById("sync-status"),
  citiesList: document.getElementById("cities-list"),
  tableTeamFilters: document.getElementById("table-team-filters"),
};

async function bootstrap() {
  setSyncStatus("Sunucudan veri yukleniyor...", "info");
  try {
    await loadFromServer();
    bindEvents();
    fillCitiesDatalist();
    renderAll();
    setSyncStatus("Sunucu ile senkron", "ok");

    if (state.events.some((e) => isAssignedTeam(e.team))) {
      if (materializeTravelLegEstimates()) {
        renderEventsView();
        persistState().catch(() => {});
      }
      setSyncStatus("Yol km hesaplaniyor...", "info");
      try {
        await recalculateTravelLegs();
        await persistState();
        renderEventsView();
        setSyncStatus("Sunucu ile senkron", "ok");
      } catch (err) {
        console.error(err);
        if (materializeTravelLegEstimates()) {
          await persistState();
          renderEventsView();
        }
        setSyncStatus("Sunucu ile senkron (tahmini km)", "warn");
      }
    }

    if (new URLSearchParams(window.location.search).get("recalculate") === "1") {
      window.history.replaceState(null, "", "index.html");
      setSyncStatus("Km hesaplaniyor...", "info");
      await recalculateAllValidations();
      setSyncStatus("Konserler eklendi ve km hesaplandi", "ok");
    }
  } catch (err) {
    console.error(err);
    setSyncStatus(`Sunucu baglantisi yok: ${err.message}`, "error");
    alert(getServerHelpMessage());
  }
}

function getServerHelpMessage() {
  const host = window.location.hostname;
  if (host.includes("github.io") || host.includes("github.dev")) {
    return (
      "Bu adres (GitHub Pages) sadece sayfa dosyalarini gosterir; Bubilet ve ortak veri icin sunucu gerekir.\n\n" +
      "Yapmaniz gereken:\n" +
      "1) render.com adresine gidin (ucretsiz hesap acin)\n" +
      "2) GitHub reposunu baglayin: BarisEkinbagSahne/sahne-planlayici\n" +
      "3) Deploy edin - Render size bir link verir (ornek: sahne-xxxx.onrender.com)\n" +
      "4) Telefon ve bilgisayardan o linke girin\n\n" +
      "GitHub Pages linki bu uygulama icin yeterli degildir."
    );
  }
  if (host === "localhost" || host === "127.0.0.1") {
    return "Sunucu calismiyor. Proje klasorunde terminal acip su komutu calistirin:\n\nnpm start\n\nSonra tarayicida http://localhost:3000 adresine gidin.";
  }
  return "Sunucuya baglanilamadi. Site yoneticisinin sunucuyu (Render vb.) calistirdigindan emin olun.";
}

function bindEvents() {
  els.settingsToggleBtn.addEventListener("click", () => els.settingsPanel.classList.remove("hidden"));
  els.settingsCloseBtn.addEventListener("click", () => els.settingsPanel.classList.add("hidden"));
  els.teamForm.addEventListener("submit", onAddTeam);
  els.eventForm.addEventListener("submit", onSaveEvent);
  els.eventDate.addEventListener("input", runLiveValidation);
  els.eventDestination.addEventListener("input", debounce(runLiveValidation, 250));
  els.eventVenue.addEventListener("input", debounce(runLiveValidation, 250));
  els.defaultFuelPriceInput.addEventListener("change", onDefaultFuelPriceChange);
  els.revalidateBtn.addEventListener("click", revalidateAllRows);
  els.viewTableBtn.addEventListener("click", () => setEventView("table"));
  els.viewGridBtn.addEventListener("click", () => setEventView("grid"));
  setupGridPanScroll();
  setupDragDropRoot();
}

function setSyncStatus(message, level = "info") {
  if (!els.syncStatus) return;
  els.syncStatus.className = `sync-status sync-${level}`;
  els.syncStatus.textContent = message;
}

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API hatasi: ${res.status}`);
  return data;
}

async function loadFromServer() {
  const data = await apiRequest("/api/data");
  state.teams = Array.isArray(data.teams) ? data.teams : DEFAULT_TEAMS.slice();
  state.events = Array.isArray(data.events) ? data.events : [];
  state.geoCache = data.geoCache || {};
  state.roadCache = data.roadCache || {};
  state.defaultFuelPrice = toPositiveNumber(data.settings?.defaultFuelPrice, DEFAULT_FUEL_PRICE);
  state.bubiletUrl = data.settings?.bubiletUrl || "";
  if (data._storage === "file" && !window.location.hostname.includes("localhost")) {
    setSyncStatus("Veri gecici depoda - kalici kayit icin Redis kurulmali", "error");
  }
}

async function persistState() {
  await apiRequest("/api/data", {
    method: "PUT",
    body: JSON.stringify({
      teams: state.teams,
      events: state.events,
      geoCache: state.geoCache,
      roadCache: state.roadCache,
      settings: {
        defaultFuelPrice: state.defaultFuelPrice,
        bubiletUrl: state.bubiletUrl,
      },
    }),
  });
  setSyncStatus("Sunucu ile senkron", "ok");
}

function saveTeams() {
  persistState().catch((err) => setSyncStatus(`Kayit hatasi: ${err.message}`, "error"));
}

function saveEvents() {
  persistState().catch((err) => setSyncStatus(`Kayit hatasi: ${err.message}`, "error"));
}

function saveCaches() {
  persistState().catch((err) => setSyncStatus(`Kayit hatasi: ${err.message}`, "error"));
}

function saveSettings() {
  persistState().catch((err) => setSyncStatus(`Kayit hatasi: ${err.message}`, "error"));
}

function fillCitiesDatalist() {
  els.citiesList.innerHTML = "";
  TURKIYE_SEHIRLERI.forEach((city) => {
    const option = document.createElement("option");
    option.value = city;
    els.citiesList.appendChild(option);
  });
}

function renderAll() {
  renderTeams();
  renderSettings();
  updateDraftReturnButton();
  renderEventsView();
  runLiveValidation();
}

function setEventView(view) {
  state.eventView = view === "table" ? "table" : "grid";
  if (state.eventView === "grid") {
    state.gridDidInitialScroll = false;
    state.gridStartDate = null;
    state.gridEndDate = null;
    state.gridEdgeExpandEnabled = false;
  }
  renderEventsView();
}

function renderEventsView() {
  const isGrid = state.eventView === "grid";
  els.eventGridView.classList.toggle("hidden", !isGrid);
  els.eventTableView.classList.toggle("hidden", isGrid);
  els.viewTableBtn.classList.toggle("active", !isGrid);
  els.viewGridBtn.classList.toggle("active", isGrid);
  if (isGrid) {
    renderEventGrid();
  } else {
    renderEvents();
  }
}

function renderSettings() {
  els.defaultFuelPriceInput.value = String(state.defaultFuelPrice);
}

function renderTeams() {
  els.teamList.innerHTML = "";
  state.teams.forEach((team) => {
    const node = els.teamItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".team-name").textContent = team;
    node.querySelector(".delete-team-btn").addEventListener("click", () => deleteTeam(team));
    els.teamList.appendChild(node);
  });
}

function renderTeamFilters() {
  if (!state.teamFilter) state.teamFilter = "ALL";
  if (state.teamFilter !== "ALL" && !state.teams.includes(state.teamFilter)) state.teamFilter = "ALL";
  els.tableTeamFilters.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = `team-chip${state.teamFilter === "ALL" ? " active" : ""}`;
  allBtn.textContent = "Tum Ekipler";
  allBtn.addEventListener("click", () => {
    state.teamFilter = "ALL";
    renderTeamFilters();
    renderEventsView();
  });
  els.tableTeamFilters.appendChild(allBtn);

  state.teams.forEach((team) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `team-chip ${getTeamColorClass(team)}${state.teamFilter === team ? " active" : ""}`;
    btn.textContent = team;
    btn.addEventListener("click", () => {
      state.teamFilter = team;
      renderTeamFilters();
      renderEventsView();
    });
    els.tableTeamFilters.appendChild(btn);
  });
}

function toggleDraftReturnIzmir() {
  state.returnToIzmirDraft = !state.returnToIzmirDraft;
  updateDraftReturnButton();
  runLiveValidation();
}

function updateDraftReturnButton() {
  if (els.eventReturnBtn) {
    els.eventReturnBtn.textContent = `Izmir Donus: ${state.returnToIzmirDraft ? "Evet" : "Hayir"}`;
  }
}

function onAddTeam(e) {
  e.preventDefault();
  const name = normalizeText(els.teamNameInput.value);
  if (!name) return;
  if (state.teams.some((t) => t.toLowerCase() === name.toLowerCase())) {
    alert("Bu ekip zaten var.");
    return;
  }
  state.teams.push(name);
  saveTeams();
  renderTeams();
  renderEventsView();
  els.teamNameInput.value = "";
}

function deleteTeam(team) {
  if (state.events.some((e) => e.team === team)) {
    alert("Bu ekip kayitlarda kullaniliyor.");
    return;
  }
  state.teams = state.teams.filter((t) => t !== team);
  saveTeams();
  renderTeams();
  renderEventsView();
}

function getFormPayload() {
  const date = SahneDates.displayToIso(els.eventDate.value);
  const destination = normalizeCityName(els.eventDestination.value);
  const venue = normalizeText(els.eventVenue.value);
  const returnToIzmir = state.returnToIzmirDraft;
  if (!date || !destination || !venue) return null;
  return {
    team: UNASSIGNED_TEAM,
    date,
    destination,
    venue,
    returnToIzmir,
    fuelPricePerLiter: state.defaultFuelPrice,
  };
}

function validatePayload(item) {
  if (!item.date || !item.destination || !item.venue) {
    return { ok: false, message: "Tum alanlar zorunlu." };
  }
  if (isAssignedTeam(item.team) && !state.teams.includes(item.team)) {
    return { ok: false, message: "Ekip listede bulunamadi." };
  }
  if (!isKnownCity(item.destination)) {
    return { ok: false, message: "Il listeden secilmeli." };
  }
  if (item.fuelPricePerLiter != null && toPositiveNumber(item.fuelPricePerLiter, -1) < 0) {
    return { ok: false, message: "Mazot fiyat 0 veya pozitif olmali." };
  }
  return { ok: true };
}

async function onSaveEvent(e) {
  e.preventDefault();
  const payload = getFormPayload();
  if (!payload) {
    alert("Tum alanlar zorunlu.");
    return;
  }
  const req = validatePayload(payload);
  if (!req.ok) {
    alert(req.message);
    return;
  }
  state.events.push({
    id: crypto.randomUUID(),
    ...payload,
    startCity: IZMIR,
    avgKm: null,
    validation: null,
    fuelLiterUsed: null,
    fuelCost: null,
    adviceText: "",
  });
  saveEvents();
  renderEventsView();
  els.eventForm.reset();
  state.returnToIzmirDraft = false;
  updateDraftReturnButton();
  runLiveValidation();
}

function createTeamSelect(value, onChange) {
  const sel = document.createElement("select");
  sel.className = "cell-select";
  const bosOpt = document.createElement("option");
  bosOpt.value = UNASSIGNED_TEAM;
  bosOpt.textContent = UNASSIGNED_TEAM;
  sel.appendChild(bosOpt);
  state.teams.forEach((team) => {
    const opt = document.createElement("option");
    opt.value = team;
    opt.textContent = team;
    sel.appendChild(opt);
  });
  sel.value = value;
  sel.addEventListener("change", onChange);
  return sel;
}

function createDateInput(value, onChange) {
  const input = document.createElement("input");
  input.className = "cell-input date-input";
  input.type = "text";
  input.inputMode = "numeric";
  input.placeholder = "GG.AA.YYYY";
  input.value = SahneDates.isoToDisplay(value);
  input.addEventListener("change", (e) => {
    const iso = SahneDates.displayToIso(e.target.value);
    if (!iso) {
      alert("Tarih formati GG.AA.YYYY olmali. Ornek: 01.06.2026");
      e.target.value = SahneDates.isoToDisplay(value);
      return;
    }
    e.target.value = SahneDates.isoToDisplay(iso);
    onChange({ target: { value: iso } });
  });
  return input;
}

function createCityInput(value, onChange) {
  const input = document.createElement("input");
  input.className = "cell-input";
  input.type = "text";
  input.value = value;
  input.setAttribute("list", "cities-list");
  input.addEventListener("change", onChange);
  return input;
}

function createTextInput(value, onChange) {
  const input = document.createElement("input");
  input.className = "cell-input";
  input.type = "text";
  input.value = value || "";
  input.addEventListener("change", onChange);
  return input;
}

function createNumberInput(value, onChange, step = "0.01") {
  const input = document.createElement("input");
  input.className = "cell-input";
  input.type = "number";
  input.min = "0";
  input.step = step;
  input.value = Number.isFinite(Number(value)) ? String(value) : "0";
  input.addEventListener("change", onChange);
  return input;
}

function createReturnButton(value, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = value ? "return-btn return-yes" : "ghost return-btn return-no";
  btn.textContent = value ? "Evet" : "Hayir";
  btn.addEventListener("click", onClick);
  return btn;
}

function renderStatusPill(status) {
  if (status === "UYGUN") return '<span class="status-pill status-ok">UYGUN</span>';
  return '<span class="status-pill status-error">HATALI</span>';
}

function renderEvents() {
  els.eventTbody.innerHTML = "";
  const sorted = state.events.slice().sort(sortByDateThenId);
  const filtered = sorted;

  for (const event of filtered) {
    const tr = document.createElement("tr");

    const dateTd = document.createElement("td");
    dateTd.appendChild(createDateInput(event.date, (e) => updateEventField(event.id, "date", e.target.value)));
    tr.appendChild(dateTd);

    const teamTd = document.createElement("td");
    teamTd.appendChild(createTeamSelect(event.team, (e) => updateEventField(event.id, "team", e.target.value)));
    tr.appendChild(teamTd);

    const venueTd = document.createElement("td");
    venueTd.appendChild(createTextInput(event.venue, (e) => updateEventField(event.id, "venue", normalizeText(e.target.value))));
    tr.appendChild(venueTd);

    const ilTd = document.createElement("td");
    ilTd.appendChild(createCityInput(event.destination, (e) => updateEventField(event.id, "destination", normalizeCityName(e.target.value))));
    tr.appendChild(ilTd);

    const startTd = document.createElement("td");
    startTd.textContent = event.startCity || IZMIR;
    tr.appendChild(startTd);

    const returnTd = document.createElement("td");
    returnTd.appendChild(createReturnButton(!!event.returnToIzmir, () => updateEventField(event.id, "returnToIzmir", !event.returnToIzmir)));
    if (event.adviceText) {
      const advice = document.createElement("span");
      advice.textContent = ` ${event.adviceText}`;
      returnTd.appendChild(advice);
    }
    tr.appendChild(returnTd);

    const kmTd = document.createElement("td");
    kmTd.textContent = Number.isFinite(event.avgKm) ? `${event.avgKm.toFixed(0)} km` : "-";
    tr.appendChild(kmTd);

    const fuelLiterTd = document.createElement("td");
    fuelLiterTd.textContent = Number.isFinite(event.fuelLiterUsed) ? `${event.fuelLiterUsed.toFixed(2)} L` : "-";
    tr.appendChild(fuelLiterTd);

    const fuelPriceTd = document.createElement("td");
    fuelPriceTd.appendChild(
      createNumberInput(event.fuelPricePerLiter, (e) => updateEventField(event.id, "fuelPricePerLiter", toPositiveNumber(e.target.value, 0)), "0.01"),
    );
    tr.appendChild(fuelPriceTd);

    const fuelCostTd = document.createElement("td");
    fuelCostTd.textContent = Number.isFinite(event.fuelCost) ? `${event.fuelCost.toFixed(2)} TL` : "-";
    tr.appendChild(fuelCostTd);

    const statusTd = document.createElement("td");
    statusTd.innerHTML = renderStatusPill(event.validation?.status || "HATALI");
    tr.appendChild(statusTd);

    const detailTd = document.createElement("td");
    detailTd.textContent = event.validation?.message || "-";
    tr.appendChild(detailTd);

    const actionTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.type = "button";
    delBtn.textContent = "Sil";
    delBtn.addEventListener("click", () => deleteEvent(event.id));
    actionTd.appendChild(delBtn);
    tr.appendChild(actionTd);

    els.eventTbody.appendChild(tr);
  }
}

function updateEventField(eventId, field, value) {
  const item = state.events.find((x) => x.id === eventId);
  if (!item) return;
  item[field] = value;
  const req = validatePayload(item);
  if (!req.ok) {
    alert(req.message);
    renderEventsView();
    return;
  }
  if (field === "fuelPricePerLiter" && Number.isFinite(item.avgKm)) {
    item.fuelLiterUsed = (item.avgKm / 100) * FUEL_LITER_PER_100KM;
    item.fuelCost = item.fuelLiterUsed * toPositiveNumber(item.fuelPricePerLiter, state.defaultFuelPrice);
  }
  saveEvents();
  renderEventsView();
}

function deleteEvent(eventId) {
  state.events = state.events.filter((x) => x.id !== eventId);
  saveEvents();
  renderEventsView();
}

async function runLiveValidation() {
  const payload = getFormPayload();
  if (!payload) {
    setValidationBox("Canli kontrol icin tum alanlari doldurun.", "info");
    return;
  }
  const req = validatePayload(payload);
  if (!req.ok) {
    setValidationBox(req.message, "warn");
    return;
  }
  try {
    setValidationBox("Karayolu mesafesi hesaplanıyor...", "info");
    const virtualStart = getStartCityForCandidate(payload, null);
    const km = await getRoadDistanceKm(virtualStart, payload.destination);
    const result = await validateEvent(payload, null, { skipSameDayConflict: true });
    const previewLiters = (km / 100) * FUEL_LITER_PER_100KM;
    const previewCost = previewLiters * state.defaultFuelPrice;
    const level = result.status === "UYGUN" ? "ok" : "error";
    setValidationBox(
      `${result.message} | satir km: ${km.toFixed(0)} km | yakit: ${previewLiters.toFixed(2)} L | yaklasik mazot: ${previewCost.toFixed(2)} TL`,
      level,
    );
  } catch (err) {
    setValidationBox(`Hata: ${err.message}`, "error");
  }
}

function onDefaultFuelPriceChange() {
  state.defaultFuelPrice = toPositiveNumber(els.defaultFuelPriceInput.value, DEFAULT_FUEL_PRICE);
  saveSettings();
  state.events.forEach((item) => {
    item.fuelPricePerLiter = state.defaultFuelPrice;
    if (Number.isFinite(item.avgKm)) {
      item.fuelLiterUsed = (item.avgKm / 100) * FUEL_LITER_PER_100KM;
      item.fuelCost = item.fuelLiterUsed * item.fuelPricePerLiter;
    }
  });
  saveEvents();
  renderEventsView();
}

function setValidationBox(message, level) {
  els.validationBox.className = `validation ${level}`;
  els.validationBox.textContent = message;
}

async function revalidateAllRows() {
  els.revalidateBtn.disabled = true;
  try {
    await recalculateAllValidations();
  } finally {
    els.revalidateBtn.disabled = false;
  }
}

async function recalculateAllValidations() {
  const sorted = state.events.slice().sort(sortByDateThenId);

  for (const item of sorted) {
    const req = validatePayload(item);
    if (!req.ok) {
      item.validation = { status: "HATALI", message: req.message };
      item.avgKm = null;
      item.startCity = IZMIR;
      continue;
    }

    const start = getStartCityForCandidate(item, item.id);
    item.startCity = start;
    item.avgKm = await getRoadDistanceKm(start, item.destination);
    item.fuelPricePerLiter = toPositiveNumber(item.fuelPricePerLiter, state.defaultFuelPrice);
    item.fuelLiterUsed = (item.avgKm / 100) * FUEL_LITER_PER_100KM;
    item.fuelCost = item.fuelLiterUsed * item.fuelPricePerLiter;
    item.validation = await validateEvent(item, item.id, { skipSameDayConflict: false });
    item.adviceText = await getReturnAdviceText(item);
  }

  try {
    await recalculateTravelLegs();
  } catch (err) {
    console.error("Gidis km hesabi:", err);
    setSyncStatus(`Gidis km kismen hesaplanamadi: ${err.message}`, "warn");
  }

  await persistState();
  renderEventsView();
  runLiveValidation();
}

async function validateEvent(candidate, excludeEventId, options = { skipSameDayConflict: false }) {
  if (isUnassignedTeam(candidate.team)) {
    return { status: "UYGUN", message: "Atama bekliyor (Bos alani)." };
  }

  const sameDayConflict = hasSameDayConflict(candidate, excludeEventId);
  if (sameDayConflict && !options.skipSameDayConflict) {
    return { status: "HATALI", message: "Ayni ekip ayni tarihte birden fazla is alamaz." };
  }

  const sameTeam = state.events
    .filter((ev) => ev.id !== excludeEventId && ev.team === candidate.team)
    .sort(sortByDateThenId);
  const before = findClosestBefore(sameTeam, candidate.date);
  const after = findClosestAfter(sameTeam, candidate.date);

  const currentStart = getStartCityForCandidate(candidate, excludeEventId);
  const currentEnd = getEventEndCity(candidate);
  const checks = [];

  if (before) {
    checks.push(checkLeg(before.date, getEventEndCity(before), candidate.date, currentStart, "Onceki->Bu"));
  }
  if (after) {
    checks.push(checkLeg(candidate.date, currentEnd, after.date, getStartCityForCandidate(after, after.id), "Bu->Sonraki"));
  }

  if (!checks.length) {
    return { status: "UYGUN", message: "Ilk gorev, zincir kontrolu yok." };
  }

  const results = await Promise.all(checks);
  const hasError = results.some((r) => r.status === "HATALI");
  return {
    status: hasError ? "HATALI" : "UYGUN",
    message: results.map((r) => r.message).join(" | "),
  };
}

function hasSameDayConflict(candidate, excludeEventId) {
  if (isUnassignedTeam(candidate.team)) return false;
  return state.events.some((ev) => {
    if (ev.id === excludeEventId) return false;
    if (normalizeTeamName(ev.team) !== normalizeTeamName(candidate.team)) return false;
    return isSameDay(ev.date, candidate.date);
  });
}

async function getReturnAdviceText(item) {
  if (item.returnToIzmir) return "";
  const next = getNextTeamEvent(item.team, item.date, item.id);
  if (!next) return "";
  const daysToNext = daysBetween(item.date, next.date);
  if (daysToNext <= 2) return "";

  const currentToIzmir = await getRoadDistanceKm(item.destination, IZMIR);
  const nextToIzmir = await getRoadDistanceKm(next.destination, IZMIR);
  const noAdviceCase = daysToNext < 3 && currentToIzmir > 500 && nextToIzmir < 500;
  if (noAdviceCase) return "";
  return "(Tavsiye-Ekip Izmire)";
}

async function checkLeg(dateA, cityA, dateB, cityB, label) {
  const days = daysBetween(dateA, dateB);
  if (days <= 0) {
    return { status: "HATALI", message: `${label}: tarih sirasi gecersiz.` };
  }
  const km = await getRoadDistanceKm(cityA, cityB);
  const maxKm = days * DAILY_KM_LIMIT;
  if (km > maxKm) {
    return { status: "HATALI", message: `${label}: ${cityA} -> ${cityB} ${km.toFixed(0)} km (izin ${maxKm.toFixed(0)} km)` };
  }
  return { status: "UYGUN", message: `${label}: ${cityA} -> ${cityB} ${km.toFixed(0)} km (izin ${maxKm.toFixed(0)} km)` };
}

function getStartCityForCandidate(candidate, excludeEventId) {
  if (isUnassignedTeam(candidate.team)) return IZMIR;
  const prev = getPreviousTeamEvent(candidate.team, candidate.date, excludeEventId);
  if (!prev) return IZMIR;
  return getEventEndCity(prev);
}

function getEventEndCity(event) {
  return event.returnToIzmir ? IZMIR : event.destination;
}

function getPreviousTeamEvent(team, date, excludeEventId) {
  const sameTeam = state.events
    .filter((ev) => ev.id !== excludeEventId && ev.team === team)
    .sort(sortByDateThenId);
  return findClosestBefore(sameTeam, date);
}

function getNextTeamEvent(team, date, excludeEventId) {
  const sameTeam = state.events
    .filter((ev) => ev.id !== excludeEventId && ev.team === team)
    .sort(sortByDateThenId);
  return findClosestAfter(sameTeam, date);
}

function resolveCityDisplayName(city) {
  const norm = normalizeCityName(city);
  const lower = norm.toLowerCase();
  const hit = TURKIYE_SEHIRLERI.find((c) => c.toLowerCase() === lower);
  return hit || norm;
}

function getCachedCityCoords(city) {
  const key = resolveCityDisplayName(city).toLowerCase();
  return state.geoCache[key] || window.CITY_COORDS?.[key] || null;
}

function haversineKmBetweenCoords(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function estimateRoadKmSync(cityA, cityB) {
  const aName = resolveCityDisplayName(cityA);
  const bName = resolveCityDisplayName(cityB);
  const key = makePairKey(aName, bName);
  const cached = state.roadCache[key];
  if (Number.isFinite(cached) && cached >= 0) return cached;
  if (aName.toLowerCase() === bName.toLowerCase()) {
    state.roadCache[key] = 0;
    return 0;
  }
  const ca = getCachedCityCoords(aName);
  const cb = getCachedCityCoords(bName);
  if (!ca || !cb) return null;
  const km = Math.round(haversineKmBetweenCoords(ca, cb) * 1.28);
  state.roadCache[key] = km;
  return km;
}

async function estimateRoadKmAsync(cityA, cityB) {
  const sync = estimateRoadKmSync(cityA, cityB);
  if (Number.isFinite(sync)) return sync;
  const aName = resolveCityDisplayName(cityA);
  const bName = resolveCityDisplayName(cityB);
  if (aName.toLowerCase() === bName.toLowerCase()) return 0;
  const a = await geocodeCity(aName);
  const b = await geocodeCity(bName);
  const km = Math.round(haversineKmBetweenCoords(a, b) * 1.28);
  state.roadCache[makePairKey(aName, bName)] = km;
  return km;
}

function applyTravelLegFields(curr, prev, km) {
  const liters = (km / 100) * FUEL_LITER_PER_100KM;
  const price = toPositiveNumber(curr.fuelPricePerLiter, state.defaultFuelPrice);
  curr.travelKmFromPrev = km;
  curr.travelFuelLiterFromPrev = liters;
  curr.travelFuelCostFromPrev = liters * price;
  const days = daysBetween(prev.date, curr.date);
  curr.travelDaysFromPrev = days;
  curr.travelLegOverLimit = days > 0 && km > days * DAILY_KM_LIMIT;
  curr.travelLegWarning = curr.travelLegOverLimit
    ? `${days} gunde izin ${days * DAILY_KM_LIMIT} km, gidilen ${Math.round(km)} km`
    : "";
}

async function getRoadDistanceKm(cityA, cityB) {
  const aName = resolveCityDisplayName(cityA);
  const bName = resolveCityDisplayName(cityB);
  const key = makePairKey(aName, bName);
  if (state.roadCache[key] != null) return state.roadCache[key];
  if (aName.toLowerCase() === bName.toLowerCase()) {
    state.roadCache[key] = 0;
    return 0;
  }
  const a = await geocodeCity(aName);
  const b = await geocodeCity(bName);
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM hatasi: ${res.status}`);
    const data = await res.json();
    if (!data.routes || !data.routes.length) {
      throw new Error(`Karayolu mesafesi bulunamadi: ${aName}-${bName}`);
    }
    const km = data.routes[0].distance / 1000;
    state.roadCache[key] = km;
    return km;
  } catch (err) {
    const est = estimateRoadKmSync(aName, bName);
    if (Number.isFinite(est)) return est;
    throw err;
  }
}

async function geocodeCity(city) {
  const name = resolveCityDisplayName(city);
  const key = name.toLowerCase();
  if (state.geoCache[key]) return state.geoCache[key];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&q=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "SahneLojistikPlanlayici/1.0 (sahne-lojistik)",
    },
  });
  if (!res.ok) throw new Error(`Koordinat alinamadi: ${city}`);
  const list = await res.json();
  if (!list.length) throw new Error(`Sehir bulunamadi: ${city}`);
  const hit = { lat: Number(list[0].lat), lon: Number(list[0].lon) };
  state.geoCache[key] = hit;
  return hit;
}

function findClosestBefore(items, date) {
  const t = SahneDates.parseIsoLocal(date).getTime();
  let best = null;
  items.forEach((it) => {
    const val = SahneDates.parseIsoLocal(it.date).getTime();
    if (val < t && (!best || val > SahneDates.parseIsoLocal(best.date).getTime())) best = it;
  });
  return best;
}

function findClosestAfter(items, date) {
  const t = SahneDates.parseIsoLocal(date).getTime();
  let best = null;
  items.forEach((it) => {
    const val = SahneDates.parseIsoLocal(it.date).getTime();
    if (val > t && (!best || val < SahneDates.parseIsoLocal(best.date).getTime())) best = it;
  });
  return best;
}

function daysBetween(a, b) {
  const da = SahneDates.parseIsoLocal(a);
  const db = SahneDates.parseIsoLocal(b);
  da.setHours(0, 0, 0, 0);
  db.setHours(0, 0, 0, 0);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function sortByDateThenId(a, b) {
  if (a.date === b.date) return a.id.localeCompare(b.id);
  return a.date.localeCompare(b.date);
}

function makePairKey(a, b) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? `${x}|${y}` : `${y}|${x}`;
}

function normalizeText(v) {
  return (v || "").trim().replace(/\s+/g, " ");
}

function normalizeCityName(v) {
  return normalizeText(v);
}

function normalizeTeamName(v) {
  return normalizeText(v);
}

function toPositiveNumber(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function getTeamColorClass(team) {
  const normalized = normalizeTeamName(team).toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return `chip-c${(hash % 5) + 1}`;
}

function isKnownCity(city) {
  return citySet.has(normalizeCityName(city).toLowerCase());
}

function isSameDay(a, b) {
  return a === b;
}

function debounce(fn, waitMs) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

function isUnassignedTeam(team) {
  if (!team) return true;
  const n = normalizeTeamName(team).toLowerCase();
  return n === "bos" || n === "boş";
}

function isAssignedTeam(team) {
  return !isUnassignedTeam(team);
}

function getGridTeamRowClass(team) {
  const n = normalizeTeamName(team).toLowerCase();
  if (n === "bcs") return "grid-row-bcs";
  if (n.includes("baris") || n.includes("barış")) return "grid-row-baris";
  if (n.includes("barkin") || n.includes("barkın")) return "grid-row-barkin";
  if (n === "diger2" || n === "diğer2") return "grid-row-diger2";
  if (n === "diger" || n === "diğer") return "grid-row-diger";
  return "grid-row-default";
}

function isoFromDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysToIso(iso, days) {
  const d = SahneDates.parseIsoLocal(iso);
  d.setDate(d.getDate() + days);
  return isoFromDate(d);
}

function getTodayIso() {
  return isoFromDate(new Date());
}

function centerGridOnDate(isoDate) {
  const anchor = isoDate || getTodayIso();
  const half = Math.floor(MAX_GRID_DAYS / 2);
  state.gridStartDate = addDaysToIso(anchor, -half);
  state.gridEndDate = addDaysToIso(anchor, MAX_GRID_DAYS - half - 1);
}

function dateInGridRange(isoDate) {
  return isoDate && state.gridStartDate && state.gridEndDate && isoDate >= state.gridStartDate && isoDate <= state.gridEndDate;
}

function initGridRange() {
  if (state.gridStartDate && state.gridEndDate) return;
  centerGridOnDate(getTodayIso());
}

function shiftGridWindow(dayDelta) {
  initGridRange();
  state.gridStartDate = addDaysToIso(state.gridStartDate, dayDelta);
  state.gridEndDate = addDaysToIso(state.gridEndDate, dayDelta);
}

function ensureDateInGridRange(isoDate) {
  if (!isoDate) return;
  if (!dateInGridRange(isoDate)) {
    centerGridOnDate(isoDate);
  }
}

function getGridDates() {
  initGridRange();
  const dates = [];
  let cur = state.gridStartDate;
  while (cur <= state.gridEndDate) {
    dates.push(cur);
    cur = addDaysToIso(cur, 1);
  }
  return dates;
}

function measureGridDayWidth() {
  const cell = els.scheduleGrid.querySelector(".cell-event[data-grid-date]");
  return cell?.offsetWidth || 200;
}

function updateGridRangeLabel() {
  const wrapper = els.scheduleGrid;
  const headers = [...wrapper.querySelectorAll(".date-header")];
  if (!headers.length) return;
  const viewLeft = wrapper.scrollLeft;
  const viewRight = viewLeft + wrapper.clientWidth;
  let first = null;
  let last = null;
  headers.forEach((h) => {
    const left = h.offsetLeft;
    const right = left + h.offsetWidth;
    if (right > viewLeft && left < viewRight) {
      if (!first) first = h.dataset.gridDate;
      last = h.dataset.gridDate;
    }
  });
  if (first && last) {
    els.gridRangeLabel.textContent = `${SahneDates.isoToDisplay(first)} – ${SahneDates.isoToDisplay(last)}`;
  }
}

function scrollGridToDate(isoDate) {
  if (!isoDate) return;
  const needsRecenter = !dateInGridRange(isoDate);
  if (needsRecenter) {
    centerGridOnDate(isoDate);
    renderEventGrid({ skipInitialScroll: true });
    return;
  }
  requestAnimationFrame(() => {
    const inner = els.scheduleGrid.querySelector(".grid-scroll-inner");
    const target = inner?.querySelector(`.cell-event[data-grid-date="${isoDate}"]`);
    if (!target) return;
    const wrapper = els.scheduleGrid;
    const dayWidth = measureGridDayWidth();
    wrapper.scrollLeft = target.offsetLeft - (wrapper.clientWidth - dayWidth) / 2;
    updateGridRangeLabel();
  });
}

function enableGridEdgeExpandSoon() {
  state.gridEdgeExpandEnabled = false;
  setTimeout(() => {
    state.gridEdgeExpandEnabled = true;
  }, 400);
}

let gridExpanding = false;

function onGridScrollEdge() {
  if (!state.gridEdgeExpandEnabled || gridExpanding) return;
  const wrapper = els.scheduleGrid;
  const edge = GRID_EDGE_THRESHOLD;
  const dayWidth = measureGridDayWidth();

  if (wrapper.scrollLeft < edge) {
    gridExpanding = true;
    const prevScroll = wrapper.scrollLeft;
    shiftGridWindow(-GRID_EXPAND_DAYS);
    renderEventGrid({ preserveScroll: true, scrollAdjust: GRID_EXPAND_DAYS * dayWidth, prevScroll });
    gridExpanding = false;
    return;
  }

  if (wrapper.scrollLeft + wrapper.clientWidth > wrapper.scrollWidth - edge) {
    gridExpanding = true;
    const prevScroll = wrapper.scrollLeft;
    shiftGridWindow(GRID_EXPAND_DAYS);
    renderEventGrid({ preserveScroll: true, scrollAdjust: -GRID_EXPAND_DAYS * dayWidth, prevScroll });
    gridExpanding = false;
  }
}

let gridPanBound = false;

function setupGridPanScroll() {
  if (gridPanBound) return;
  gridPanBound = true;
  const el = els.scheduleGrid;
  let panning = false;
  let startX = 0;
  let startScroll = 0;

  el.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest(".grid-event-block, .event-card, button, select, input, .grid-block-actions, .card-actions")) return;
    panning = true;
    startX = e.pageX;
    startScroll = el.scrollLeft;
    el.classList.add("is-panning");
  });

  window.addEventListener("mousemove", (e) => {
    if (!panning) return;
    el.scrollLeft = startScroll - (e.pageX - startX);
  });

  window.addEventListener("mouseup", () => {
    if (!panning) return;
    panning = false;
    el.classList.remove("is-panning");
  });

  el.addEventListener("touchstart", (e) => {
    if (e.target.closest(".grid-event-block, .event-card, button")) return;
    if (e.touches.length !== 1) return;
    panning = true;
    startX = e.touches[0].pageX;
    startScroll = el.scrollLeft;
  }, { passive: true });

  el.addEventListener("touchmove", (e) => {
    if (!panning || e.touches.length !== 1) return;
    el.scrollLeft = startScroll - (e.touches[0].pageX - startX);
  }, { passive: true });

  el.addEventListener("touchend", () => {
    panning = false;
  });

  el.addEventListener("scroll", debounce(() => {
    updateGridRangeLabel();
    renderTravelConnectors();
    onGridScrollEdge();
  }, 80));
}

async function recalculateTravelLegs() {
  state.events.forEach((item) => {
    item.travelKmFromPrev = null;
    item.travelFuelLiterFromPrev = null;
    item.travelFuelCostFromPrev = null;
    item.travelDaysFromPrev = null;
    item.travelLegOverLimit = false;
    item.travelLegWarning = "";
  });

  for (const team of state.teams) {
    const teamEvents = state.events
      .filter((ev) => ev.team === team && isAssignedTeam(ev.team))
      .sort(sortByDateThenId);

    for (let i = 1; i < teamEvents.length; i += 1) {
      const prev = teamEvents[i - 1];
      const curr = teamEvents[i];
      try {
        const from = getEventEndCity(prev);
        const to = curr.destination;
        let km;
        try {
          km = await getRoadDistanceKm(from, to);
        } catch {
          km = await estimateRoadKmAsync(from, to);
        }
        if (!Number.isFinite(km) || km < 0) throw new Error("Km hesaplanamadi");
        applyTravelLegFields(curr, prev, km);
      } catch (err) {
        console.warn("Yol km:", prev.date, "->", curr.date, err.message || err);
        curr.travelKmFromPrev = null;
        curr.travelFuelLiterFromPrev = null;
        curr.travelFuelCostFromPrev = null;
        curr.travelDaysFromPrev = null;
        curr.travelLegOverLimit = false;
        curr.travelLegWarning = "";
      }
    }
  }
}

function getTravelKmBetween(prev, curr) {
  if (Number.isFinite(curr.travelKmFromPrev) && curr.travelKmFromPrev > 0) {
    return curr.travelKmFromPrev;
  }
  const from = getEventEndCity(prev);
  const to = curr.destination;
  const cached = estimateRoadKmSync(from, to);
  if (Number.isFinite(cached) && cached > 0) return cached;
  if (Number.isFinite(curr.avgKm) && curr.avgKm > 0) {
    const start = getStartCityForCandidate(curr, curr.id);
    if (resolveCityDisplayName(start) === resolveCityDisplayName(from)) return curr.avgKm;
  }
  return null;
}

function resolveTravelKmForDisplay(prev, curr) {
  const km = getTravelKmBetween(prev, curr);
  if (Number.isFinite(km) && km > 0) return km;
  const est = estimateRoadKmSync(getEventEndCity(prev), curr.destination);
  return Number.isFinite(est) && est > 0 ? est : null;
}

function materializeTravelLegEstimates() {
  let changed = false;
  for (const team of state.teams) {
    const sorted = getTeamEventsSorted(team);
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (Number.isFinite(curr.travelKmFromPrev) && curr.travelKmFromPrev > 0) continue;
      const km = resolveTravelKmForDisplay(prev, curr);
      if (!km) continue;
      applyTravelLegFields(curr, prev, km);
      changed = true;
    }
  }
  return changed;
}

let travelLegRefreshTimer = null;

function teamEventsMissingTravelKm() {
  for (const team of state.teams) {
    const sorted = getTeamEventsSorted(team);
    for (let i = 1; i < sorted.length; i += 1) {
      const km = resolveTravelKmForDisplay(sorted[i - 1], sorted[i]);
      if (!Number.isFinite(km) || km <= 0) return true;
    }
  }
  return false;
}

function scheduleTravelLegRefresh() {
  if (!state.events.some((e) => isAssignedTeam(e.team))) return;
  clearTimeout(travelLegRefreshTimer);
  travelLegRefreshTimer = setTimeout(async () => {
    if (!teamEventsMissingTravelKm()) return;
    const prevScroll = els.scheduleGrid.scrollLeft;
    try {
      if (materializeTravelLegEstimates()) {
        if (state.eventView === "grid") {
          renderEventGrid({ preserveScroll: true, prevScroll, skipInitialScroll: true });
        }
        await persistState();
      }
      if (!teamEventsMissingTravelKm()) return;
      await recalculateTravelLegs();
      await persistState();
      if (state.eventView === "grid") {
        renderEventGrid({ preserveScroll: true, prevScroll, skipInitialScroll: true });
      }
    } catch (err) {
      console.error("Yol km yenileme:", err);
      if (materializeTravelLegEstimates()) {
        await persistState();
        if (state.eventView === "grid") {
          renderEventGrid({ preserveScroll: true, prevScroll, skipInitialScroll: true });
        }
      }
    }
  }, 400);
}

function getTravelFuelBetween(prev, curr, km) {
  if (Number.isFinite(curr.travelFuelCostFromPrev) && curr.travelFuelCostFromPrev > 0) {
    return {
      cost: curr.travelFuelCostFromPrev,
      liters: curr.travelFuelLiterFromPrev,
    };
  }
  const liters = (km / 100) * FUEL_LITER_PER_100KM;
  const price = toPositiveNumber(curr.fuelPricePerLiter, state.defaultFuelPrice);
  return { cost: liters * price, liters };
}

function getTravelLegWarning(prev, curr, km) {
  const days = daysBetween(prev.date, curr.date);
  if (days <= 0) {
    return { overLimit: true, text: "Tarih sirasi gecersiz" };
  }
  const maxKm = days * DAILY_KM_LIMIT;
  if (km > maxKm) {
    return {
      overLimit: true,
      text: `${days} gunde max ${maxKm} km — gidilen ${Math.round(km)} km`,
    };
  }
  return { overLimit: false, text: "" };
}

function formatTravelArrowLabel(prev, curr) {
  const km = resolveTravelKmForDisplay(prev, curr);
  if (!Number.isFinite(km) || km <= 0) {
    return { line: "", title: "" };
  }
  const warn = getTravelLegWarning(prev, curr, km);
  let line = `${Math.round(km)} KM`;
  if (warn.overLimit) line = `!${line}`;
  line = truncateChars(line, TRAVEL_LABEL_MAX_CHARS);
  let title = `Gidilen: ${Math.round(km)} km`;
  if (warn.overLimit) title += ` | UYARI: ${warn.text}`;
  return { line, title };
}

function ensureTravelConnectorSvg(overlay, inner) {
  const w = inner.scrollWidth;
  const h = inner.scrollHeight;
  let svg = overlay.querySelector("svg.travel-connectors-svg");
  if (!svg) {
    const NS = "http://www.w3.org/2000/svg";
    svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "travel-connectors-svg");
    const defs = document.createElementNS(NS, "defs");
    const marker = document.createElementNS(NS, "marker");
    marker.setAttribute("id", "travel-arrow-head");
    marker.setAttribute("markerWidth", "8");
    marker.setAttribute("markerHeight", "8");
    marker.setAttribute("refX", "6");
    marker.setAttribute("refY", "4");
    marker.setAttribute("orient", "auto");
    const head = document.createElementNS(NS, "path");
    head.setAttribute("d", "M0,0 L8,4 L0,8 z");
    head.setAttribute("fill", "#2e7d32");
    marker.appendChild(head);
    defs.appendChild(marker);
    const markerWarn = document.createElementNS(NS, "marker");
    markerWarn.setAttribute("id", "travel-arrow-head-warn");
    markerWarn.setAttribute("markerWidth", "8");
    markerWarn.setAttribute("markerHeight", "8");
    markerWarn.setAttribute("refX", "6");
    markerWarn.setAttribute("refY", "4");
    markerWarn.setAttribute("orient", "auto");
    const headWarn = document.createElementNS(NS, "path");
    headWarn.setAttribute("d", "M0,0 L8,4 L0,8 z");
    headWarn.setAttribute("fill", "#e65100");
    markerWarn.appendChild(headWarn);
    defs.appendChild(markerWarn);
    svg.appendChild(defs);
    overlay.appendChild(svg);
  }
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.querySelectorAll("path.travel-elbow-path").forEach((n) => n.remove());
  return svg;
}

function renderTravelConnectors() {
  const inner = els.scheduleGrid.querySelector(".grid-scroll-inner");
  if (!inner) return;

  let overlay = inner.querySelector(".grid-connectors");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "grid-connectors";
    inner.insertBefore(overlay, inner.firstChild);
  }
  overlay.querySelectorAll(".travel-arrow-label").forEach((n) => n.remove());
  const innerRect = inner.getBoundingClientRect();
  const svg = ensureTravelConnectorSvg(overlay, inner);
  const NS = "http://www.w3.org/2000/svg";

  getFilteredTeams().forEach((team) => {
    const travelRow = inner.querySelector(`tr.travel-row[data-grid-team="${cssEscapeAttr(team)}"]`);
    if (!travelRow) return;
    const travelRect = travelRow.getBoundingClientRect();
    const yRail = (travelRect.top + travelRect.bottom) / 2 - innerRect.top;

    const sorted = getTeamEventsSorted(team);
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const km = resolveTravelKmForDisplay(prev, curr);
      if (!Number.isFinite(km) || km <= 0) continue;

      const prevBlock = inner.querySelector(
        `tr.event-row[data-grid-team="${cssEscapeAttr(team)}"] .cell-event[data-grid-date="${prev.date}"] .grid-event-block`,
      );
      const currBlock = inner.querySelector(
        `tr.event-row[data-grid-team="${cssEscapeAttr(team)}"] .cell-event[data-grid-date="${curr.date}"] .grid-event-block`,
      );
      if (!prevBlock || !currBlock) continue;

      const pr = prevBlock.getBoundingClientRect();
      const cr = currBlock.getBoundingClientRect();
      const x1 = (pr.left + pr.right) / 2 - innerRect.left;
      const x2 = (cr.left + cr.right) / 2 - innerRect.left;
      const yPrevTop = pr.top - innerRect.top + 2;
      const yCurrTop = cr.top - innerRect.top + 2;
      if (x2 - x1 < 8) continue;

      const span = x2 - x1;
      const stem = Math.min(TRAVEL_STEM_OFFSET_PX, Math.max(5, span * 0.04));
      const prevHasIncoming = i >= 2;
      const currHasOutgoing = i < sorted.length - 1;
      let xOut = x1;
      let xIn = x2;
      if (prevHasIncoming) xOut = x1 + stem;
      if (currHasOutgoing) xIn = x2 - stem;

      const warn = getTravelLegWarning(prev, curr, km);
      const { line, title } = formatTravelArrowLabel(prev, curr);
      const color = warn.overLimit ? "#e65100" : "#2e7d32";
      const markerId = warn.overLimit ? "travel-arrow-head-warn" : "travel-arrow-head";

      const path = document.createElementNS(NS, "path");
      path.setAttribute("class", "travel-elbow-path");
      path.setAttribute(
        "d",
        `M ${xOut} ${yPrevTop} L ${xOut} ${yRail} L ${xIn} ${yRail} L ${xIn} ${yCurrTop}`,
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", "2");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("marker-end", `url(#${markerId})`);
      svg.appendChild(path);

      const label = document.createElement("span");
      label.className = `travel-arrow-label${warn.overLimit ? " travel-label-warn" : ""}`;
      label.textContent = line;
      label.title = title;
      label.style.left = `${(xOut + xIn) / 2}px`;
      label.style.top = `${yRail}px`;
      overlay.appendChild(label);
    }
  });
}

function cssEscapeAttr(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function truncateChars(text, maxLen) {
  const s = String(text || "").trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 1))}…`;
}

function getTeamEventsSorted(team) {
  return state.events
    .filter((ev) => ev.team === team && isAssignedTeam(ev.team))
    .sort(sortByDateThenId);
}

function getPreviousTeamEventOnGrid(team, date) {
  const sorted = getTeamEventsSorted(team);
  const t = SahneDates.parseIsoLocal(date).getTime();
  let best = null;
  sorted.forEach((ev) => {
    const val = SahneDates.parseIsoLocal(ev.date).getTime();
    if (val < t && (!best || val > SahneDates.parseIsoLocal(best.date).getTime())) best = ev;
  });
  return best;
}

function getFilteredTeams() {
  return state.teams.slice();
}

function getTeamEventStats(team) {
  const events = state.events.filter((e) => e.team === team && isAssignedTeam(e.team));
  const today = getTodayIso();
  return {
    total: events.length,
    remaining: events.filter((e) => e.date > today).length,
  };
}

function appendEventActionButtons(actions, event) {
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "danger";
  delBtn.textContent = "Sil";
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteEvent(event.id);
  });
  actions.appendChild(delBtn);

  state.teams.forEach((team) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `ghost team-assign-btn ${getTeamColorClass(team)}`;
    btn.textContent = team;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      assignEventToTeamQuick(event.id, team);
    });
    actions.appendChild(btn);
  });
}

async function assignEventToTeamQuick(eventId, team) {
  await assignEventFromDrop(eventId, team);
}

function getEventRouteLabel(event) {
  const dest = (event.destination || "").toUpperCase();
  if (event.returnToIzmir) return `${dest} (IZMIRE DON)`;
  return dest;
}

function formatEventKm(event) {
  return Number.isFinite(event.avgKm) ? `${event.avgKm.toFixed(0)} km` : "-";
}

function formatEventFuel(event) {
  if (Number.isFinite(event.fuelCost)) return `${event.fuelCost.toFixed(0)} TL`;
  return "-";
}

let dragEventId = null;

function setupDragDropRoot() {
  document.addEventListener("dragend", () => {
    dragEventId = null;
    document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
    document.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
  });
}

function makeDraggable(el, eventId) {
  el.draggable = true;
  el.addEventListener("dragstart", (e) => {
    dragEventId = eventId;
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
    el.classList.add("dragging");
  });
}

function bindDropZone(el, team) {
  el.classList.add("drop-zone");
  el.dataset.dropTeam = team || UNASSIGNED_TEAM;
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    el.classList.add("drag-over");
  });
  el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("drag-over");
    const eventId = e.dataTransfer.getData("text/plain") || dragEventId;
    if (!eventId) return;
    assignEventFromDrop(eventId, el.dataset.dropTeam);
  });
}

function getGridAnchorDate() {
  return getTodayIso();
}

function focusGridOnDate(isoDate) {
  scrollGridToDate(isoDate);
}

async function assignEventFromDrop(eventId, teamRaw) {
  const item = state.events.find((x) => x.id === eventId);
  if (!item) return;

  const team = isUnassignedTeam(teamRaw) || !teamRaw ? UNASSIGNED_TEAM : teamRaw;

  if (isAssignedTeam(team)) {
    const candidate = { ...item, team };
    if (hasSameDayConflict(candidate, eventId)) {
      alert("Ayni ekip ayni tarihte birden fazla is alamaz.");
      return;
    }
  }

  item.team = team;

  if (isAssignedTeam(team)) {
    if (!dateInGridRange(item.date)) {
      centerGridOnDate(item.date);
    }
  }

  saveEvents();
  renderEventsView();

  if (isAssignedTeam(team)) {
    materializeTravelLegEstimates();
    renderEventsView();
    scrollGridToDate(item.date);
    persistState().catch(() => {});
    setSyncStatus("Ekip atandi", "ok");
    scheduleTravelLegRefresh();
    recalculateTravelLegs()
      .then(() => persistState())
      .then(() => {
        renderEventsView();
        setSyncStatus("Sunucu ile senkron", "ok");
      })
      .catch(() => {});
  }
}

function createEventCard(event) {
  const card = document.createElement("div");
  card.className = "event-card";
  card.dataset.eventId = event.id;
  makeDraggable(card, event.id);

  const venue = document.createElement("div");
  venue.className = "card-venue";
  venue.textContent = event.venue || "-";
  card.appendChild(venue);

  const route = document.createElement("div");
  route.className = "card-route";
  route.textContent = `${SahneDates.isoToDisplay(event.date)} · ${getEventRouteLabel(event)}`;
  card.appendChild(route);

  const meta = document.createElement("div");
  meta.className = "card-meta";
  meta.textContent = `Ort. Km: ${formatEventKm(event)} | Mazot: ${formatEventFuel(event)}`;
  card.appendChild(meta);

  if (event.validation) {
    const status = document.createElement("div");
    status.className = "card-status";
    status.innerHTML = `${renderStatusPill(event.validation.status)} ${event.validation.message || ""}`;
    card.appendChild(status);
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";
  appendEventActionButtons(actions, event);
  card.appendChild(actions);

  return card;
}

function renderBosPool() {
  els.bosPool.innerHTML = "";
  bindDropZone(els.bosPool, UNASSIGNED_TEAM);

  const unassigned = state.events
    .filter((e) => isUnassignedTeam(e.team))
    .sort(sortByDateThenId);

  if (!unassigned.length) {
    const empty = document.createElement("p");
    empty.className = "bos-hint";
    empty.textContent = "Bos is yok.";
    els.bosPool.appendChild(empty);
    return;
  }

  const shown = unassigned.slice(0, BOS_POOL_MAX_VISIBLE);
  const hiddenCount = unassigned.length - shown.length;

  shown.forEach((event) => {
    els.bosPool.appendChild(createEventCard(event));
  });

  if (hiddenCount > 0) {
    const more = document.createElement("p");
    more.className = "bos-more-hint";
    more.textContent = `+${hiddenCount} is daha (Gorunum 1 tablosunda tumunu gorebilirsiniz)`;
    els.bosPool.appendChild(more);
  }
}

function renderEventGrid(options = {}) {
  materializeTravelLegEstimates();
  initGridRange();
  const dates = getGridDates();
  const teams = getFilteredTeams();
  const today = getTodayIso();
  const prevScroll = options.preserveScroll ? (options.prevScroll ?? els.scheduleGrid.scrollLeft) : null;

  renderBosPool();

  const table = document.createElement("table");
  table.className = "schedule-grid";

  const thead = document.createElement("thead");
  const headRow1 = document.createElement("tr");
  const ekipTh = document.createElement("th");
  ekipTh.className = "col-ekip";
  ekipTh.rowSpan = 2;
  ekipTh.textContent = "Ekip";
  headRow1.appendChild(ekipTh);

  dates.forEach((date) => {
    const dateTh = document.createElement("th");
    dateTh.className = `col-event date-header${date === today ? " is-today" : ""}`;
    dateTh.dataset.gridDate = date;
    dateTh.textContent = SahneDates.isoToDisplay(date);
    headRow1.appendChild(dateTh);
  });
  thead.appendChild(headRow1);

  const headRow2 = document.createElement("tr");
  dates.forEach((date) => {
    const eventSub = document.createElement("th");
    eventSub.className = `col-event sub-header${date === today ? " is-today" : ""}`;
    eventSub.textContent = "Etkinlik";
    headRow2.appendChild(eventSub);
  });
  thead.appendChild(headRow2);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  teams.forEach((team) => {
    const rowClass = getGridTeamRowClass(team);
    const eventsByDate = new Map();
    state.events.filter((e) => e.team === team).forEach((e) => eventsByDate.set(e.date, e));

    const trTravel = document.createElement("tr");
    trTravel.className = `${rowClass} sub-row travel-row`;
    trTravel.dataset.gridTeam = team;

    const teamTd = document.createElement("td");
    teamTd.className = "col-ekip team-label drop-zone";
    teamTd.rowSpan = GRID_SUB_ROWS;
    const stats = getTeamEventStats(team);
    teamTd.innerHTML = `
      <div class="team-name-text">${escapeHtml(team)}</div>
      <div class="team-stats">
        <div>Toplam Etkinlik: <strong>${stats.total}</strong></div>
        <div>Kalan Etkinlik: <strong>${stats.remaining}</strong></div>
      </div>`;
    bindDropZone(teamTd, team);
    trTravel.appendChild(teamTd);

    dates.forEach((date) => {
      const isToday = date === today;
      const travelCell = document.createElement("td");
      travelCell.className = `col-event cell-travel${isToday ? " is-today" : ""}`;
      travelCell.dataset.gridDate = date;
      travelCell.dataset.gridTeam = team;
      travelCell.innerHTML = "&nbsp;";
      trTravel.appendChild(travelCell);
    });
    tbody.appendChild(trTravel);

    const trEvent = document.createElement("tr");
    trEvent.className = `${rowClass} sub-row event-row`;
    trEvent.dataset.gridTeam = team;

    dates.forEach((date) => {
      const eventOnDate = eventsByDate.get(date);
      const isToday = date === today;
      const eventCell = document.createElement("td");
      eventCell.className = `col-event cell-event drop-zone${isToday ? " is-today" : ""}`;
      eventCell.dataset.gridDate = date;
      eventCell.dataset.gridTeam = team;
      bindDropZone(eventCell, team);

      if (eventOnDate) {
        const block = document.createElement("div");
        block.className = "grid-event-block";
        makeDraggable(block, eventOnDate.id);

        const fullVenue = eventOnDate.venue || "-";
        const line1 = document.createElement("div");
        line1.className = "ge-venue";
        line1.textContent = truncateChars(fullVenue, GRID_VENUE_MAX_CHARS);
        line1.title = fullVenue;
        block.appendChild(line1);

        const fullCity = getEventRouteLabel(eventOnDate);
        const line2 = document.createElement("div");
        line2.className = "ge-route";
        line2.textContent = fullCity;
        line2.title = fullCity;
        block.appendChild(line2);

        const blockActions = document.createElement("div");
        blockActions.className = "grid-block-actions";
        appendEventActionButtons(blockActions, eventOnDate);
        block.appendChild(blockActions);

        eventCell.appendChild(block);
      } else {
        eventCell.innerHTML = "&nbsp;";
      }

      trEvent.appendChild(eventCell);
    });
    tbody.appendChild(trEvent);
  });

  table.appendChild(tbody);

  const inner = document.createElement("div");
  inner.className = "grid-scroll-inner";
  const connectors = document.createElement("div");
  connectors.className = "grid-connectors";
  inner.appendChild(connectors);
  inner.appendChild(table);

  els.scheduleGrid.innerHTML = "";
  els.scheduleGrid.appendChild(inner);

  if (options.preserveScroll && prevScroll != null) {
    els.scheduleGrid.scrollLeft = prevScroll + (options.scrollAdjust || 0);
    updateGridRangeLabel();
    requestAnimationFrame(() => renderTravelConnectors());
  } else if (!state.gridDidInitialScroll && !options.skipInitialScroll) {
    state.gridDidInitialScroll = true;
    enableGridEdgeExpandSoon();
    requestAnimationFrame(() => {
      const today = getTodayIso();
      const inner = els.scheduleGrid.querySelector(".grid-scroll-inner");
      const target = inner?.querySelector(`.cell-event[data-grid-date="${today}"]`);
      if (target) {
        const wrapper = els.scheduleGrid;
        const dayWidth = measureGridDayWidth();
        wrapper.scrollLeft = Math.max(0, target.offsetLeft - (wrapper.clientWidth - dayWidth) / 2);
      }
      updateGridRangeLabel();
      requestAnimationFrame(() => renderTravelConnectors());
    });
  } else {
    updateGridRangeLabel();
    requestAnimationFrame(() => renderTravelConnectors());
  }

  scheduleTravelLegRefresh();
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

bootstrap().catch((err) => console.error(err));
