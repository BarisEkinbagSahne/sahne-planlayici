import fs from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";

const REDIS_KEY = "sahne:store:v1";
const REDIS_TIMEOUT_MS = 8000;

function envTrim(key) {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} (${REDIS_TIMEOUT_MS}ms)`)),
        REDIS_TIMEOUT_MS,
      );
    }),
  ]);
}

export function createDataStore({ dataFile, defaultStore }) {
  const redisUrl = envTrim("UPSTASH_REDIS_REST_URL");
  const redisToken = envTrim("UPSTASH_REDIS_REST_TOKEN");
  const redisUrlOk = redisUrl.startsWith("https://");
  let redis =
    redisUrl && redisToken && redisUrlOk
      ? new Redis({ url: redisUrl, token: redisToken })
      : null;
  let mode = redis ? "redis" : "file";

  if (redisUrl && redisToken && !redisUrlOk) {
    console.error(
      "UPSTASH_REDIS_REST_URL https:// ile baslamali (REST adresi). redis:// kullanmayin.",
    );
  }

  let writeQueue = Promise.resolve();

  function disableRedis(reason) {
    if (!redis) return;
    console.error(`Redis kullanilamiyor (${reason}). Dosya depolamasina geciliyor.`);
    redis = null;
    mode = "file";
  }

  async function ensureFile() {
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    try {
      await fs.access(dataFile);
    } catch {
      await fs.writeFile(dataFile, JSON.stringify(defaultStore, null, 2), "utf8");
    }
  }

  async function readFileStore() {
    const raw = await fs.readFile(dataFile, "utf8");
    return JSON.parse(raw);
  }

  async function writeFileStore(store) {
    await fs.writeFile(dataFile, JSON.stringify(store, null, 2), "utf8");
  }

  async function readRedisStore() {
    return withTimeout(redis.get(REDIS_KEY), "Redis okuma");
  }

  async function writeRedisStore(store) {
    await withTimeout(redis.set(REDIS_KEY, store), "Redis yazma");
  }

  async function migrateFileToRedisIfNeeded() {
    try {
      const fileStore = await readFileStore();
      if (fileStore?.events?.length || fileStore?.teams?.length > 3) {
        await writeRedisStore(fileStore);
        console.log("Dosyadaki veri Redis'e tasindi.");
        return fileStore;
      }
    } catch {
      // ignore
    }
    return null;
  }

  return {
    get mode() {
      return mode;
    },

    /** Hizli; sunucu dinlemeden once calistirilir. */
    async prepare() {
      await ensureFile();
    },

    /** Redis baglantisi; arka planda calisabilir. */
    async init() {
      if (!redis) {
        console.log("Depolama: yerel dosya");
        return;
      }
      try {
        const existing = await readRedisStore();
        if (existing) {
          console.log("Depolama: Upstash Redis (kalici)");
          return;
        }
        const migrated = await migrateFileToRedisIfNeeded();
        if (!migrated) {
          await writeRedisStore(defaultStore);
        }
        console.log("Depolama: Upstash Redis (kalici)");
      } catch (err) {
        disableRedis(err.message || "baglanti hatasi");
      }
    },

    async read() {
      if (redis) {
        try {
          const data = await readRedisStore();
          if (data) return data;
          const migrated = await migrateFileToRedisIfNeeded();
          if (migrated) return migrated;
          await writeRedisStore(defaultStore);
          return structuredClone(defaultStore);
        } catch (err) {
          disableRedis(err.message || "okuma hatasi");
        }
      }
      return readFileStore();
    },

    queueWrite(store) {
      writeQueue = writeQueue.then(async () => {
        if (redis) {
          try {
            await writeRedisStore(store);
            return;
          } catch (err) {
            disableRedis(err.message || "yazma hatasi");
          }
        }
        await writeFileStore(store);
      });
      return writeQueue;
    },
  };
}
