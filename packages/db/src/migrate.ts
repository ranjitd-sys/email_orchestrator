import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const migrationsDir = resolve(import.meta.dir, "../migrations");

export async function runMigrations(url: string, dir = migrationsDir): Promise<string[]> {
  const sql = postgres(url, { max: 1 });
  const applied: string[] = [];
  try {
    await sql`set client_min_messages to warning`;

    await sql`create table if not exists schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )`;

    await sql`select pg_advisory_lock(hashtext('email_orchestrator_migrations'))`;

    const files = (await readdir(dir))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const existing = await sql<{ version: string }[]>`select version from schema_migrations`;
    const done = new Set(existing.map((row) => row.version));

    for (const file of files) {
      if (done.has(file)) continue;
      const content = await readFile(resolve(dir, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`insert into schema_migrations (version) values (${file})`;
      });
      applied.push(file);
    }
  } finally {
    await sql`select pg_advisory_unlock(hashtext('email_orchestrator_migrations'))`.catch(
      () => {},
    );
    await sql.end();
  }
  return applied;
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const applied = await runMigrations(url);
  console.log(
    applied.length > 0 ? `applied: ${applied.join(", ")}` : "no pending migrations",
  );
}