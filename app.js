const DAILY_KM_LIMIT = 800;
const DEFAULT_FUEL_PRICE = 70;
const FUEL_LITER_PER_100KM = 11;
const UNASSIGNED_TEAM = "Boş";
const GRID_DAYS = 7;
const GRID_SUB_ROWS = 4;

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
  gridWeekOffset: 0,
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
  gridPrevBtn: document.getElementById("grid-prev-btn"),
  gridNextBtn: document.getElementById("grid-next-btn"),
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
  els.gridPrevBtn.addEventListener("click", () => shiftGridWeek(-1));
  els.gridNextBtn.addEventListener("click", () => shiftGridWeek(1));
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
  renderTeamFilters();
  renderSettings();
  updateDraftReturnButton();
  renderEventsView();
  runLiveValidation();
}

function setEventView(view) {
  state.eventView = view === "table" ? "table" : "grid";
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

function shiftGridWeek(delta) {
  state.gridWeekOffset += delta;
  renderEventGrid();
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
  renderTeamFilters();
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
  renderTeamFilters();
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
  const filtered = state.teamFilter === "ALL" ? sorted : sorted.filter((x) => x.team === state.teamFilter);

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

async function getRoadDistanceKm(cityA, cityB) {
  const key = makePairKey(cityA, cityB);
  if (state.roadCache[key]) return state.roadCache[key];
  const a = await geocodeCity(cityA);
  const b = await geocodeCity(cityB);
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM hatasi: ${res.status}`);
  const data = await res.json();
  if (!data.routes || !data.routes.length) throw new Error(`Karayolu mesafesi bulunamadi: ${cityA}-${cityB}`);
  const km = data.routes[0].distance / 1000;
  state.roadCache[key] = km;
  return km;
}

async function geocodeCity(city) {
  const key = city.toLowerCase();
  if (state.geoCache[key]) return state.geoCache[key];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&q=${encodeURIComponent(city)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
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

function getGridWeekStart() {
  const assignedDates = state.events
    .filter((e) => isAssignedTeam(e.team) && e.date)
    .map((e) => e.date)
    .sort();
  const unassignedDates = state.events
    .filter((e) => isUnassignedTeam(e.team) && e.date)
    .map((e) => e.date)
    .sort();
  const allDates = [...assignedDates, ...unassignedDates];
  let base = allDates.length ? allDates[0] : isoFromDate(new Date());
  if (state.gridWeekOffset !== 0) {
    base = addDaysToIso(base, state.gridWeekOffset * GRID_DAYS);
  }
  return base;
}

function getGridDates() {
  const start = getGridWeekStart();
  const dates = [];
  for (let i = 0; i < GRID_DAYS; i += 1) {
    dates.push(addDaysToIso(start, i));
  }
  return dates;
}

function getFilteredTeams() {
  if (state.teamFilter === "ALL") return state.teams.slice();
  return state.teams.filter((t) => t === state.teamFilter);
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

function bindDropZone(el, team, date) {
  el.classList.add("drop-zone");
  el.dataset.dropTeam = team || UNASSIGNED_TEAM;
  el.dataset.dropDate = date || "";
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
    assignEventFromDrop(eventId, el.dataset.dropTeam, el.dataset.dropDate);
  });
}

async function assignEventFromDrop(eventId, teamRaw, dateRaw) {
  const item = state.events.find((x) => x.id === eventId);
  if (!item) return;

  const team = isUnassignedTeam(teamRaw) || !teamRaw ? UNASSIGNED_TEAM : teamRaw;
  const date = dateRaw || item.date;

  if (isAssignedTeam(team)) {
    const candidate = { ...item, team, date };
    if (hasSameDayConflict(candidate, eventId)) {
      alert("Ayni ekip ayni tarihte birden fazla is alamaz.");
      return;
    }
  }

  item.team = team;
  if (dateRaw) item.date = date;

  saveEvents();
  renderEventsView();

  if (isAssignedTeam(team)) {
    setSyncStatus("Km hesaplaniyor...", "info");
    try {
      await recalculateAllValidations();
    } catch (err) {
      setSyncStatus(`Hesaplama hatasi: ${err.message}`, "error");
    }
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
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "danger";
  delBtn.textContent = "Sil";
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteEvent(event.id);
  });
  actions.appendChild(delBtn);
  card.appendChild(actions);

  return card;
}

function renderBosPool() {
  els.bosPool.innerHTML = "";
  bindDropZone(els.bosPool, UNASSIGNED_TEAM, "");

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

  unassigned.forEach((event) => {
    els.bosPool.appendChild(createEventCard(event));
  });
}

function renderEventGrid() {
  const dates = getGridDates();
  const teams = getFilteredTeams();

  if (dates.length) {
    const first = SahneDates.isoToDisplay(dates[0]);
    const last = SahneDates.isoToDisplay(dates[dates.length - 1]);
    els.gridRangeLabel.textContent = `${first} – ${last}`;
  } else {
    els.gridRangeLabel.textContent = "";
  }

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
    dateTh.className = "col-event date-header";
    dateTh.colSpan = 2;
    dateTh.textContent = SahneDates.isoToDisplay(date);
    headRow1.appendChild(dateTh);
  });
  thead.appendChild(headRow1);

  const headRow2 = document.createElement("tr");
  dates.forEach(() => {
    const eventSub = document.createElement("th");
    eventSub.className = "col-event sub-header";
    eventSub.textContent = "Etkinlik";
    headRow2.appendChild(eventSub);
    const kmSub = document.createElement("th");
    kmSub.className = "col-km sub-header";
    kmSub.textContent = "Km / Mazot";
    headRow2.appendChild(kmSub);
  });
  thead.appendChild(headRow2);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  teams.forEach((team) => {
    const rowClass = getGridTeamRowClass(team);
    const eventsByDate = new Map();
    state.events.filter((e) => e.team === team).forEach((e) => eventsByDate.set(e.date, e));

    for (let sub = 0; sub < GRID_SUB_ROWS; sub += 1) {
      const tr = document.createElement("tr");
      tr.className = `${rowClass} sub-row`;

      if (sub === 0) {
        const teamTd = document.createElement("td");
        teamTd.className = "col-ekip team-label";
        teamTd.rowSpan = GRID_SUB_ROWS;
        teamTd.textContent = team;
        tr.appendChild(teamTd);
      }

      dates.forEach((date) => {
        const eventOnDate = eventsByDate.get(date);
        if (eventOnDate && sub > 0) return;

        const eventCell = document.createElement("td");
        eventCell.className = "col-event cell-event drop-zone";
        bindDropZone(eventCell, team, date);

        const kmCell = document.createElement("td");
        kmCell.className = "col-km cell-km drop-zone";
        bindDropZone(kmCell, team, date);

        if (eventOnDate) {
          eventCell.rowSpan = GRID_SUB_ROWS;
          kmCell.rowSpan = GRID_SUB_ROWS;

          const block = document.createElement("div");
          block.className = "grid-event-block";
          makeDraggable(block, eventOnDate.id);

          const line1 = document.createElement("div");
          line1.className = "ge-venue";
          line1.textContent = eventOnDate.venue || "-";
          block.appendChild(line1);

          const line2 = document.createElement("div");
          line2.className = "ge-route";
          line2.textContent = getEventRouteLabel(eventOnDate);
          block.appendChild(line2);

          const line3 = document.createElement("div");
          line3.textContent = `Ort. Km: ${formatEventKm(eventOnDate)}`;
          block.appendChild(line3);

          const line4 = document.createElement("div");
          line4.className = "ge-status";
          const statusText = eventOnDate.validation?.status || "-";
          line4.textContent = `Durum: ${statusText} | Mazot: ${formatEventFuel(eventOnDate)}`;
          block.appendChild(line4);

          eventCell.appendChild(block);

          const kmLine1 = document.createElement("div");
          kmLine1.textContent = formatEventKm(eventOnDate);
          kmCell.appendChild(kmLine1);
          const kmLine2 = document.createElement("div");
          kmLine2.textContent = formatEventFuel(eventOnDate);
          kmCell.appendChild(kmLine2);
          if (Number.isFinite(eventOnDate.fuelLiterUsed)) {
            const kmLine3 = document.createElement("div");
            kmLine3.textContent = `${eventOnDate.fuelLiterUsed.toFixed(1)} L`;
            kmCell.appendChild(kmLine3);
          }
        } else {
          eventCell.innerHTML = "&nbsp;";
          kmCell.innerHTML = "&nbsp;";
        }

        tr.appendChild(eventCell);
        tr.appendChild(kmCell);
      });

      tbody.appendChild(tr);
    }
  });

  table.appendChild(tbody);
  els.scheduleGrid.innerHTML = "";
  els.scheduleGrid.appendChild(table);
}

bootstrap().catch((err) => console.error(err));
