import fs from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";

const REDIS_KEY = "sahne:store:v1";

function envTrim(key) {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

export function createDataStore({ dataFile, defaultStore }) {
  const redisUrl = envTrim("UPSTASH_REDIS_REST_URL");
  const redisToken = envTrim("UPSTASH_REDIS_REST_TOKEN");
  let redis =
    redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
  let mode = redis ? "redis" : "file";

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
    return redis.get(REDIS_KEY);
  }

  async function writeRedisStore(store) {
    await redis.set(REDIS_KEY, store);
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

    async init() {
      await ensureFile();
      if (!redis) {
        console.log("Depolama: yerel dosya (gelistirme modu)");
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
