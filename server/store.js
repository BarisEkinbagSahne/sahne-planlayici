import fs from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";

const REDIS_KEY = "sahne:store:v1";

export function createDataStore({ dataFile, defaultStore }) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const redis = redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

  let writeQueue = Promise.resolve();

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
    const data = await redis.get(REDIS_KEY);
    return data || null;
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
    mode: redis ? "redis" : "file",

    async init() {
      await ensureFile();
      if (!redis) {
        console.log("Depolama: yerel dosya (gelistirme modu)");
        return;
      }
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
    },

    async read() {
      if (redis) {
        const data = await readRedisStore();
        if (data) return data;
        const migrated = await migrateFileToRedisIfNeeded();
        if (migrated) return migrated;
        await writeRedisStore(defaultStore);
        return structuredClone(defaultStore);
      }
      return readFileStore();
    },

    queueWrite(store) {
      writeQueue = writeQueue.then(async () => {
        if (redis) {
          await writeRedisStore(store);
          return;
        }
        await writeFileStore(store);
      });
      return writeQueue;
    },
  };
}
