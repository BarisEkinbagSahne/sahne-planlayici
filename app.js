const STORAGE_KEYS = {
  teams: "sahne_teams_v4",
  events: "sahne_events_v4",
  geoCache: "sahne_geo_cache_v4",
  roadCache: "sahne_road_cache_v4",
  settings: "sahne_settings_v1",
  tourSeedId: "sahne_tour_seed_id_v1",
};

const DAILY_KM_LIMIT = 800;
const DEFAULT_FUEL_PRICE = 70;
const FUEL_LITER_PER_100KM = 11;

const TOUR_SEED_VERSION = "2026-turu-v1";

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

const TOUR_ROW_DATA = [
  ["24.04.2026", "Diğer", "Aziz Vukolos", "Izmir"],
  ["24.04.2026", "Barış", "BAOB Bursa", "Bursa"],
  ["25.04.2026", "Barış", "Vehbi Koç Kongre Merkezi", "Eskisehir"],
  ["26.04.2026", "Barış", "Nurol Kültür Merkezi", "Mugla"],
  ["02.05.2026", "Barış", "Leyla Dizdar Kültür Merkezi", "Karabuk"],
  ["05.05.2026", "Diğer", "Aziz Vukolos", "Izmir"],
  ["05.05.2026", "Barış", "Şahinbey Kongre ve Sanat Merkezi", "Gaziantep"],
  ["06.05.2026", "Diğer", "ÇOMÜ İçdaş Kongre Merkezi", "Canakkale"],
  ["08.05.2026", "Diğer", "Aziz Vukolos", "Izmir"],
  ["09.05.2026", "Barış", "Karadeniz Teknik Üniversitesi AKM Salonu", "Trabzon"],
  ["10.05.2026", "Barış", "Nihat Gökyiğit Kongre ve Kültür Merkezi", "Artvin"],
  ["12.05.2026", "Diğer", "Herodot Kültür Merkezi", "Mugla"],
  ["12.05.2026", "Barış", "Kültür Merkezi", "Burdur"],
  ["13.05.2026", "Barış", "Kültürpark Açıkhava Tiyatrosu", "Izmir"],
  ["14.05.2026", "Barış", "Kadir Has Kongre ve Kültür Merkezi", "Kayseri"],
  ["14.05.2026", "Diğer", "Adnan Saygun", "Izmir"],
  ["16.05.2026", "Barış", "Yahya Kemal Beyatlı Kültür Merkezi", "Tekirdag"],
  ["16.05.2026", "Diğer", "St. John Anglikan Klisesi", "Izmir"],
  ["19.05.2026", "Barış", "Necip Fazıl Kısakürek Kültür Merkezi", "Erzurum"],
  ["20.05.2026", "Barış", "Kültür Sanat Merkezi", "Ordu"],
  ["20.05.2026", "Diğer", "Hezar Dinari Kültür Merkezi", "Kutahya"],
  ["21.05.2026", "Barış", "Samsun Büyükşehir Belediyesi Sanat Merkezi", "Samsun"],
  ["22.05.2026", "Diğer", "Aziz Vukolos", "Izmir"],
  ["23.05.2026", "Barış", "Muhsin Yazıcıoğlu Kültür Merkezi", "Sivas"],
  ["24.05.2026", "Diğer", "Aziz Vukolos", "Izmir"],
  ["25.05.2026", "Diğer", "Aziz Vukolos", "Izmir"],
  ["25.05.2026", "Barış", "Necip Fazıl Kısakürek Kültür Merkezi", "Bolu"],
  ["03.06.2026", "Barış", "Mersin Yenişehir AKM Cumhuriyet Salonu", "Mersin"],
  ["05.06.2026", "Barış", "Orpheus Açıkhava", "Sanliurfa"],
  ["06.06.2026", "Barış", "Sıtkı Koçman Üniversitesi", "Mugla"],
  ["08.06.2026", "Barış", "Derince Belediyesi Gösteri Merkezi", "Kocaeli"],
  ["09.06.2026", "Barış", "Çomü İçdaş Kongre Merkezi", "Canakkale"],
  ["10.06.2026", "Barış", "Girne Koleji", "Afyonkarahisar"],
  ["12.06.2026", "Barış", "Açıkhava Adana", "Adana"],
  ["13.06.2026", "Barış", "Wyndham", "Ankara"],
  ["14.06.2026", "Barış", "Ktü Akm Salonu", "Trabzon"],
  ["15.06.2026", "Diğer", "Açıkhava", "Antalya"],
  ["15.06.2026", "Barış", "Samsun Büyükşehir Belediyesi Sanat Merkezi", "Samsun"],
  ["16.06.2026", "Diğer", "Açıkhava Tiyatrosu", "Antalya"],
  ["17.06.2026", "Barış", "01 PGM", "Adana"],
  ["18.06.2026", "Barış", "Avlu Kültür ve Kongre Merkezi", "Balikesir"],
  ["19.06.2026", "Barış", "Armutalan Kültür Merkezi", "Mugla"],
  ["20.06.2026", "Barış", "Kırkpınar Amfi Tiyatro", "Sakarya"],
  ["21.06.2026", "Barış", "Tarihi Havagazı Fabrikası", "Izmir"],
  ["22.06.2026", "Barış", "Nihat Zeybekçi Kongre Ve Kültür Merkezi Fatma Yıldız Salonu", "Denizli"],
  ["24.06.2026", "Diğer", "Adnan Saygun", "Izmir"],
  ["24.06.2026", "Barış", "Tayyare Kültür Merkezi", "Bursa"],
  ["27.06.2026", "Diğer", "Dam", "Izmir"],
  ["27.06.2026", "Barış", "Kırkpınar Amfi Tiyatro", "Sakarya"],
  ["28.06.2026", "Barış", "Giresun Belediyesi Fuar Kültür Merkezi", "Giresun"],
  ["29.06.2026", "Barış", "Amasya Belediyesi Kültür Merkezi Şehzade Salonu", "Amasya"],
  ["30.06.2026", "Barış", "Sezai Karakoç Kültür Merkezi", "Diyarbakir"],
  ["30.06.2026", "Diğer", "Neşet Ertaş Kültür Merkezi Muharrem Ertaş Salonu", "Kirsehir"],
  ["01.07.2026", "Diğer", "Aziz Vukolos Klisesi", "Izmir"],
  ["06.07.2026", "Barış", "Oran Açıkhava", "Ankara"],
  ["07.07.2026", "Barış", "Büyük Sinema Kültür Merkezi", "Yozgat"],
  ["08.07.2026", "Barış", "Akm", "Tokat"],
  ["25.09.2026", "Barış", "Ferdi Zeyrek Millet Çarşısı", "Manisa"],
];

const state = {
  teams: [],
  events: [],
  geoCache: {},
  roadCache: {},
  returnToIzmirDraft: false,
  selectedTeam: "",
  teamFilter: "ALL",
  defaultFuelPrice: DEFAULT_FUEL_PRICE,
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
  eventTeamButtons: document.getElementById("event-team-buttons"),
  eventTeamValue: document.getElementById("event-team-value"),
  eventDate: document.getElementById("event-date"),
  eventDestination: document.getElementById("event-destination"),
  eventVenue: document.getElementById("event-venue"),
  eventReturnBtn: document.getElementById("event-return-btn"),
  submitBtn: document.getElementById("submit-btn"),
  validationBox: document.getElementById("validation-box"),
  eventTbody: document.getElementById("event-tbody"),
  teamItemTemplate: document.getElementById("team-item-template"),
  revalidateBtn: document.getElementById("revalidate-btn"),
  citiesList: document.getElementById("cities-list"),
  tableTeamFilters: document.getElementById("table-team-filters"),
};

async function bootstrap() {
  loadFromStorage();
  bindEvents();
  fillCitiesDatalist();
  renderAll();
  await recalculateAllValidations();
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
}

function ddmmyyyyToIso(s) {
  const p = s.split(".");
  if (p.length !== 3) return s;
  const [dd, mm, yyyy] = p.map((x) => x.trim());
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function createTourSeedEvents() {
  return TOUR_ROW_DATA.map((row, i) => {
    const [dmy, team, venue, canonIl] = row;
    if (!citySet.has(canonIl.toLowerCase())) {
      console.warn("Tanimsiz il (seed):", canonIl, row);
    }
    return {
      id: `tur-${String(i + 1).padStart(3, "0")}`,
      date: ddmmyyyyToIso(dmy),
      team,
      venue: normalizeText(venue),
      destination: canonIl,
      returnToIzmir: false,
      fuelPricePerLiter: DEFAULT_FUEL_PRICE,
      startCity: IZMIR,
      avgKm: null,
      validation: null,
      fuelLiterUsed: null,
      fuelCost: null,
      adviceText: "",
    };
  });
}

function applyTourSeedIfNeeded() {
  try {
    if (localStorage.getItem(STORAGE_KEYS.tourSeedId) === TOUR_SEED_VERSION) return false;
    state.events = createTourSeedEvents();
    state.teams = [...DEFAULT_TEAMS];
    saveEvents();
    saveTeams();
    localStorage.setItem(STORAGE_KEYS.tourSeedId, TOUR_SEED_VERSION);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

function loadFromStorage() {
  state.teams = loadJSON(STORAGE_KEYS.teams, DEFAULT_TEAMS.slice());
  state.events = loadJSON(STORAGE_KEYS.events, []);
  state.geoCache = loadJSON(STORAGE_KEYS.geoCache, {});
  state.roadCache = loadJSON(STORAGE_KEYS.roadCache, {});
  const settings = loadJSON(STORAGE_KEYS.settings, { defaultFuelPrice: DEFAULT_FUEL_PRICE });
  state.defaultFuelPrice = toPositiveNumber(settings.defaultFuelPrice, DEFAULT_FUEL_PRICE);
  applyTourSeedIfNeeded();
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveTeams() {
  localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify(state.teams));
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(state.events));
}

function saveCaches() {
  localStorage.setItem(STORAGE_KEYS.geoCache, JSON.stringify(state.geoCache));
  localStorage.setItem(STORAGE_KEYS.roadCache, JSON.stringify(state.roadCache));
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ defaultFuelPrice: state.defaultFuelPrice }));
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
  renderTeamButtons();
  renderTeamFilters();
  renderSettings();
  updateDraftReturnButton();
  renderEvents();
  runLiveValidation();
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

function renderTeamButtons() {
  if (!state.selectedTeam || !state.teams.includes(state.selectedTeam)) {
    state.selectedTeam = state.teams.includes("Barış") ? "Barış" : state.teams[0] || "";
  }
  els.eventTeamValue.value = state.selectedTeam;
  els.eventTeamButtons.innerHTML = "";
  state.teams.forEach((team, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `team-chip ${getTeamColorClass(team)}${team === state.selectedTeam ? " active" : ""}`;
    btn.textContent = team;
    btn.addEventListener("click", () => {
      state.selectedTeam = team;
      els.eventTeamValue.value = team;
      renderTeamButtons();
      runLiveValidation();
    });
    els.eventTeamButtons.appendChild(btn);
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
    renderEvents();
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
      renderEvents();
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
  renderTeamButtons();
  renderTeamFilters();
  renderEvents();
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
  renderTeamButtons();
  renderTeamFilters();
  renderEvents();
}

function getFormPayload() {
  const team = state.selectedTeam || els.eventTeamValue.value;
  const date = els.eventDate.value;
  const destination = normalizeCityName(els.eventDestination.value);
  const venue = normalizeText(els.eventVenue.value);
  const returnToIzmir = state.returnToIzmirDraft;
  if (!team || !date || !destination || !venue) return null;
  return {
    team,
    date,
    destination,
    venue,
    returnToIzmir,
    fuelPricePerLiter: state.defaultFuelPrice,
  };
}

function validatePayload(item) {
  if (!item.team || !item.date || !item.destination || !item.venue) {
    return { ok: false, message: "Tum alanlar zorunlu." };
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
  if (hasSameDayConflict(payload, null)) {
    alert("Ayni ekip ayni tarihte birden fazla is alamaz.");
    return;
  }
  state.events.push({ id: crypto.randomUUID(), ...payload, startCity: IZMIR, avgKm: null, validation: null });
  saveEvents();
  await recalculateAllValidations();
  els.eventForm.reset();
  state.returnToIzmirDraft = false;
  updateDraftReturnButton();
  renderTeamButtons();
  runLiveValidation();
}

function createTeamSelect(value, onChange) {
  const sel = document.createElement("select");
  sel.className = "cell-select";
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
  input.className = "cell-input";
  input.type = "date";
  input.value = value;
  input.addEventListener("change", onChange);
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

async function updateEventField(eventId, field, value) {
  const item = state.events.find((x) => x.id === eventId);
  if (!item) return;
  item[field] = value;
  const req = validatePayload(item);
  if (!req.ok) {
    alert(req.message);
    await recalculateAllValidations();
    return;
  }
  await recalculateAllValidations();
}

async function deleteEvent(eventId) {
  state.events = state.events.filter((x) => x.id !== eventId);
  saveEvents();
  await recalculateAllValidations();
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

async function onDefaultFuelPriceChange() {
  state.defaultFuelPrice = toPositiveNumber(els.defaultFuelPriceInput.value, DEFAULT_FUEL_PRICE);
  saveSettings();
  state.events.forEach((item) => {
    item.fuelPricePerLiter = state.defaultFuelPrice;
  });
  saveEvents();
  await recalculateAllValidations();
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

  saveEvents();
  saveCaches();
  renderEvents();
  runLiveValidation();
}

async function validateEvent(candidate, excludeEventId, options = { skipSameDayConflict: false }) {
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
  const t = new Date(date).getTime();
  let best = null;
  items.forEach((it) => {
    const val = new Date(it.date).getTime();
    if (val < t && (!best || val > new Date(best.date).getTime())) best = it;
  });
  return best;
}

function findClosestAfter(items, date) {
  const t = new Date(date).getTime();
  let best = null;
  items.forEach((it) => {
    const val = new Date(it.date).getTime();
    if (val > t && (!best || val < new Date(best.date).getTime())) best = it;
  });
  return best;
}

function daysBetween(a, b) {
  const ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
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
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function debounce(fn, waitMs) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

bootstrap().catch((err) => console.error(err));
