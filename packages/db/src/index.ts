import postgres from "postgres";

export interface Db {
  sql: postgres.Sql;
  close: () => Promise<void>;
}

export function createDb(url: string): Db {
  const sql = postgres(url, { max: 5 });
  return {
    sql,
    close: () => sql.end(),
  };
}

export { runMigrations } from "./migrate.ts";