const BUBILET_ARTIST_URL = "https://www.bubilet.com.tr/sanatci/candles-and-echoes-ensemble-";

const CANONICAL_CITIES = [
  "Adana", "Adiyaman", "Afyonkarahisar", "Agri", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydin",
  "Balikesir", "Bartin", "Batman", "Bayburt", "Bilecik", "Bingol", "Bitlis", "Bolu", "Burdur", "Bursa", "Canakkale", "Cankiri",
  "Corum", "Denizli", "Diyarbakir", "Duzce", "Edirne", "Elazig", "Erzincan", "Erzurum", "Eskisehir", "Gaziantep", "Giresun",
  "Gumushane", "Hakkari", "Hatay", "Igdir", "Isparta", "Istanbul", "Izmir", "Kahramanmaras", "Karabuk", "Karaman", "Kars",
  "Kastamonu", "Kayseri", "Kilis", "Kirikkale", "Kirklareli", "Kirsehir", "Kocaeli", "Konya", "Kutahya", "Malatya", "Manisa",
  "Mardin", "Mersin", "Mugla", "Mus", "Nevsehir", "Nigde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Sanliurfa", "Siirt",
  "Sinop", "Sivas", "Sirnak", "Tekirdag", "Tokat", "Trabzon", "Tunceli", "Usak", "Van", "Yalova", "Yozgat", "Zonguldak",
];

const cityLookup = new Map(
  CANONICAL_CITIES.map((city) => [stripTurkish(city).toLowerCase(), city]),
);

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; SahneLojistik/1.0)",
  Accept: "text/html,application/json",
};

function stripTurkish(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .replace(/Ş/g, "S")
    .replace(/ş/g, "s")
    .replace(/Ğ/g, "G")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "U")
    .replace(/ü/g, "u")
    .replace(/Ö/g, "O")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "C")
    .replace(/ç/g, "c")
    .trim();
}

export function mapBubiletCity(cityName) {
  const key = stripTurkish(cityName).toLowerCase();
  return cityLookup.get(key) || null;
}

function sessionDateToIso(sessionDate) {
  if (!sessionDate) return "";
  const dt = new Date(sessionDate);
  if (Number.isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(dt);
}

function extractSessions(text) {
  const sessions = [];
  const patterns = [
    /\\"sessionDate\\":\\"([^\\"]+)\\",\\"slug\\":\\"([^\\"]+)\\",\\"cityId\\":(\d+),\\"cityName\\":\\"([^\\"]+)\\",\\"citySlug\\":\\"([^\\"]+)\\",\\"venueId\\":(\d+),\\"venueName\\":\\"([^\\"]+)\\"/g,
    /"sessionDate":"([^"]+)","slug":"([^"]+)","cityId":(\d+),"cityName":"([^"]+)","citySlug":"([^"]+)","venueId":(\d+),"venueName":"([^"]+)"/g,
  ];

  for (const re of patterns) {
    let match;
    while ((match = re.exec(text)) !== null) {
      sessions.push({
        sessionDate: match[1],
        slug: match[2],
        cityId: Number(match[3]),
        cityName: match[4],
        citySlug: match[5],
        venueId: Number(match[6]),
        venueName: match[7].trim(),
      });
    }
  }
  return sessions;
}

function uniqueSessions(sessions) {
  const map = new Map();
  for (const session of sessions) {
    const date = sessionDateToIso(session.sessionDate);
    if (!date) continue;
    const key = `${date}|${session.venueName}|${session.cityName}`;
    if (!map.has(key)) map.set(key, { ...session, localDate: date });
  }
  return [...map.values()].sort((a, b) => a.localDate.localeCompare(b.localDate));
}

export async function fetchBubiletSessions(url = BUBILET_ARTIST_URL) {
  const [htmlRes, rscRes] = await Promise.all([
    fetch(url, { headers: FETCH_HEADERS }),
    fetch(`${url}?_rsc=1`, { headers: { ...FETCH_HEADERS, RSC: "1", Accept: "text/x-component" } }),
  ]);

  if (!htmlRes.ok) {
    throw new Error(`Bubilet sayfasi alinamadi: ${htmlRes.status}`);
  }

  const html = await htmlRes.text();
  const rsc = rscRes.ok ? await rscRes.text() : "";
  return uniqueSessions([...extractSessions(html), ...extractSessions(rsc)]);
}

export function bubiletSessionToEvent(session, options = {}) {
  const {
    defaultTeam = "Boş",
    defaultFuelPrice = 70,
    startCity = "Izmir",
  } = options;

  const destination = mapBubiletCity(session.cityName);
  if (!destination) {
    return { ok: false, reason: `Tanimsiz il: ${session.cityName}`, session };
  }

  const date = sessionDateToIso(session.sessionDate);
  if (!date) {
    return { ok: false, reason: "Gecersiz tarih", session };
  }
  return {
    ok: true,
    event: {
      id: `bubilet-${session.venueId}-${date}`,
      date,
      team: defaultTeam,
      venue: session.venueName,
      destination,
      returnToIzmir: false,
      fuelPricePerLiter: defaultFuelPrice,
      startCity,
      avgKm: null,
      validation: null,
      fuelLiterUsed: null,
      fuelCost: null,
      adviceText: "",
      source: "bubilet",
      bubiletSlug: session.slug,
    },
  };
}

export function compareBubiletEvents(existingEvents, sessions, options = {}) {
  const existingKeys = new Set(
    existingEvents.map((item) => eventMatchKey(item.date, item.venue, item.destination)),
  );
  const missing = [];
  const unknownCities = [];
  let skippedCount = 0;

  for (const session of sessions) {
    const mapped = bubiletSessionToEvent(session, options);
    if (!mapped.ok) {
      unknownCities.push(mapped.reason);
      continue;
    }

    const key = eventMatchKey(mapped.event.date, mapped.event.venue, mapped.event.destination);
    if (existingKeys.has(key)) {
      skippedCount += 1;
      continue;
    }

    missing.push({
      ...mapped.event,
      cityName: session.cityName,
      sessionDate: session.sessionDate,
      slug: session.slug,
    });
  }

  return {
    missing,
    totalBubilet: sessions.length,
    existingCount: existingEvents.length,
    missingCount: missing.length,
    skippedCount,
    unknownCities: [...new Set(unknownCities)],
  };
}

export function eventMatchKey(date, venue, destination) {
  return `${date}|${normalizeVenue(venue)}|${destination}`;
}

function normalizeVenue(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

export function normalizeBubiletUrl(rawUrl) {
  const fallback = BUBILET_ARTIST_URL;
  if (!rawUrl || typeof rawUrl !== "string") return fallback;
  try {
    const parsed = new URL(rawUrl.trim());
    if (!parsed.hostname.includes("bubilet.com.tr")) return fallback;
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export { BUBILET_ARTIST_URL };

export function mergeBubiletEvents(existingEvents, sessions, options = {}) {
  const compared = compareBubiletEvents(existingEvents, sessions, options);
  return {
    events: [...existingEvents, ...compared.missing],
    addedCount: compared.missingCount,
    skippedCount: compared.skippedCount,
    unknownCities: compared.unknownCities,
    totalFetched: compared.totalBubilet,
  };
}
