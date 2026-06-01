import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchBubiletSessions, mergeBubiletEvents, compareBubiletEvents, normalizeBubiletUrl, BUBILET_ARTIST_URL } from "./server/bubilet.js";
import { createDataStore } from "./server/store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = path.join(__dirname, "data", "store.json");

const DEFAULT_STORE = {
  teams: ["Barış", "Barkın", "Diğer"],
  events: [],
  geoCache: {},
  roadCache: {},
  settings: { defaultFuelPrice: 70, bubiletUrl: BUBILET_ARTIST_URL },
};

const dataStore = createDataStore({ dataFile: DATA_FILE, defaultStore: DEFAULT_STORE });

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  return JSON.parse(raw);
}

function isValidStore(payload) {
  return payload
    && Array.isArray(payload.teams)
    && Array.isArray(payload.events)
    && payload.geoCache
    && typeof payload.geoCache === "object"
    && payload.roadCache
    && typeof payload.roadCache === "object"
    && payload.settings
    && typeof payload.settings === "object";
}

async function serveStatic(req, res) {
  let pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.join(__dirname, pathname);
  if (!filePath.startsWith(__dirname)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  try {
    if (url.pathname === "/api/data" && req.method === "GET") {
      const store = await dataStore.read();
      sendJson(res, 200, { ...store, _storage: dataStore.mode });
      return;
    }

    if (url.pathname === "/api/data" && req.method === "PUT") {
      const payload = await readBody(req);
      if (!isValidStore(payload)) {
        sendJson(res, 400, { error: "Gecersiz veri yapisi" });
        return;
      }
      await dataStore.queueWrite(payload);
      sendJson(res, 200, { ok: true, storage: dataStore.mode });
      return;
    }

    if (url.pathname === "/api/bubilet/compare" && req.method === "POST") {
      const store = await dataStore.read();
      const body = (await readBody(req)) || {};
      const bubiletUrl = normalizeBubiletUrl(body.url || store.settings?.bubiletUrl);
      store.settings = { ...store.settings, bubiletUrl };
      await dataStore.queueWrite(store);

      const sessions = await fetchBubiletSessions(bubiletUrl);
      const compared = compareBubiletEvents(store.events, sessions, {
        defaultTeam: body.defaultTeam || "Boş",
        defaultFuelPrice: store.settings?.defaultFuelPrice ?? 70,
      });

      sendJson(res, 200, {
        ok: true,
        bubiletUrl,
        ...compared,
        missing: compared.missing.map((item) => ({
          id: item.id,
          date: item.date,
          venue: item.venue,
          destination: item.destination,
          cityName: item.cityName,
          team: item.team,
          slug: item.slug,
        })),
      });
      return;
    }

    if (url.pathname === "/api/bubilet/add" && req.method === "POST") {
      const store = await dataStore.read();
      const body = (await readBody(req)) || {};
      const bubiletUrl = normalizeBubiletUrl(body.url || store.settings?.bubiletUrl);
      store.settings = { ...store.settings, bubiletUrl };

      const sessions = await fetchBubiletSessions(bubiletUrl);
      const merged = mergeBubiletEvents(store.events, sessions, {
        defaultTeam: body.defaultTeam || "Boş",
        defaultFuelPrice: store.settings?.defaultFuelPrice ?? 70,
      });

      store.events = merged.events;
      await dataStore.queueWrite(store);
      sendJson(res, 200, {
        ok: true,
        bubiletUrl,
        addedCount: merged.addedCount,
        skippedCount: merged.skippedCount,
        totalFetched: merged.totalFetched,
        unknownCities: merged.unknownCities,
        events: store.events,
      });
      return;
    }

    if (url.pathname === "/api/bubilet/preview" && req.method === "GET") {
      const sessions = await fetchBubiletSessions();
      sendJson(res, 200, {
        total: sessions.length,
        firstDate: sessions[0]?.sessionDate?.slice(0, 10) || null,
        lastDate: sessions.at(-1)?.sessionDate?.slice(0, 10) || null,
        sample: sessions.slice(0, 5).map((item) => ({
          date: item.sessionDate.slice(0, 10),
          city: item.cityName,
          venue: item.venueName,
        })),
      });
      return;
    }

    if (url.pathname === "/api/bubilet/import" && req.method === "POST") {
      const store = await dataStore.read();
      const body = (await readBody(req)) || {};
      const bubiletUrl = normalizeBubiletUrl(body.url || store.settings?.bubiletUrl);
      store.settings = { ...store.settings, bubiletUrl };
      const sessions = await fetchBubiletSessions(bubiletUrl);
      const merged = mergeBubiletEvents(store.events, sessions, {
        defaultTeam: body.defaultTeam || "Boş",
        defaultFuelPrice: store.settings?.defaultFuelPrice ?? 70,
      });
      store.events = merged.events;
      await dataStore.queueWrite(store);
      sendJson(res, 200, {
        ok: true,
        addedCount: merged.addedCount,
        skippedCount: merged.skippedCount,
        totalFetched: merged.totalFetched,
        unknownCities: merged.unknownCities,
        events: store.events,
      });
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(res, 404, { error: "API bulunamadi" });
      return;
    }

    await serveStatic(req, res);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: err.message || "Sunucu hatasi" });
  }
});

await dataStore.init().catch((err) => {
  console.error("Depolama baslatilamadi:", err);
});
server.listen(PORT, () => {
  console.log(`Sahne Lojistik sunucusu http://localhost:${PORT} adresinde calisiyor`);
  if (dataStore.mode === "file" && process.env.RENDER) {
    console.warn("UYARI: Kalici depolama yok! Render ortam degiskenlerine Upstash Redis ekleyin.");
  }
});
