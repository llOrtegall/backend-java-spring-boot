import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "./client.ts";
import { sha256Sync } from "../crypto/sha256.ts";
import { logger } from "../logging/logger.ts";

export async function migrate(migrationsDir = "migrations"): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT        NOT NULL,
      hash       TEXT        NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  let files: string[];
  try {
    files = (await readdir(migrationsDir))
      .filter(f => /^\d{4}_.+\.sql$/.test(f))
      .sort();
  } catch {
    logger.info("No migrations directory found or empty — skipping.");
    return;
  }

  if (files.length === 0) {
    logger.info("No migration files found — database is up to date.");
    return;
  }

  const applied = new Map<number, string>(
    (await sql`SELECT id, hash FROM _migrations`).map(
      (r: { id: number; hash: string }) => [r.id, r.hash] as [number, string],
    ),
  );

  for (const file of files) {
    const id = parseInt(file.slice(0, 4), 10);
    const content = await Bun.file(join(migrationsDir, file)).text();
    const hash = sha256Sync(content);

    if (applied.has(id)) {
      if (applied.get(id) !== hash) {
        throw new Error(
          `Migration ${file} hash mismatch — do not edit applied migrations.`,
        );
      }
      continue;
    }

    await sql.begin(async tx => {
      await tx.unsafe(content);
      await tx`INSERT INTO _migrations (id, name, hash) VALUES (${id}, ${file}, ${hash})`;
    });

    logger.info({ file }, "Migration applied");
  }

  logger.info("Database migrations up to date.");
}
